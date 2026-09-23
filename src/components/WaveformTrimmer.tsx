import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Scissors, 
  ArrowLeftRight,
  MoveHorizontal,
  StepForward
} from 'lucide-react';
import { 
  getAudioContext, 
  playAudioBuffer, 
  stopCurrentPlayback, 
  extractWaveformPeaks 
} from '../utils/audioEngine';

interface WaveformTrimmerProps {
  audioBuffer: AudioBuffer;
  startSec: number;
  endSec: number;
  onRangeChange: (start: number, end: number) => void;
  playbackSpeed?: number;
}

export const WaveformTrimmer: React.FC<WaveformTrimmerProps> = ({
  audioBuffer,
  startSec,
  endSec,
  onRangeChange,
  playbackSpeed = 1.0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const miniMapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const miniMapContainerRef = useRef<HTMLDivElement | null>(null);

  // Canvas display dimensions (logical CSS pixels)
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 800, height: 144 });
  const [miniMapSize, setMiniMapSize] = useState<{ width: number; height: number }>({ width: 800, height: 28 });

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(startSec);
  const [isLooping, setIsLooping] = useState(false);

  // Zoom & Viewport Navigation (1x to 16x)
  const [zoom, setZoom] = useState<number>(1.0);
  const [viewStartSec, setViewStartSec] = useState<number>(0);

  // Dragging State
  const [dragMode, setDragMode] = useState<'none' | 'start' | 'end' | 'middle' | 'pan'>('none');
  const [dragStartX, setDragStartX] = useState(0);
  const [initialRange, setInitialRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [initialViewStart, setInitialViewStart] = useState<number>(0);

  const duration = audioBuffer.duration;
  const visibleDuration = useMemo(() => duration / zoom, [duration, zoom]);

  // Clamp viewport start inside valid bounds
  const clampedViewStart = Math.max(0, Math.min(viewStartSec, Math.max(0, duration - visibleDuration)));

  // Listen to container resizing for high-DPI scaling
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setContainerSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
        }
      }
      if (miniMapContainerRef.current) {
        const rect = miniMapContainerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setMiniMapSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
        }
      }
    };

    updateSize();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateSize());
      if (containerRef.current) ro.observe(containerRef.current);
      if (miniMapContainerRef.current) ro.observe(miniMapContainerRef.current);
    }

    window.addEventListener('resize', updateSize);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Pre-calculate full overview peaks for the mini-map
  const overviewPeaks = useMemo(() => {
    return extractWaveformPeaks(audioBuffer, 180);
  }, [audioBuffer]);

  // Dynamic high-resolution peaks for visible viewport (proportional to canvas width)
  const visiblePeaks = useMemo(() => {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    // 1 bar every 4px for sleek retina density
    const numBars = Math.max(80, Math.floor(containerSize.width / 4));

    const startSample = Math.max(0, Math.floor(clampedViewStart * sampleRate));
    const endSample = Math.min(channelData.length, Math.floor((clampedViewStart + visibleDuration) * sampleRate));
    const totalVisibleSamples = Math.max(1, endSample - startSample);
    const blockSize = Math.max(1, Math.floor(totalVisibleSamples / numBars));

    const peaks: number[] = [];
    let maxVal = 0;

    for (let i = 0; i < numBars; i++) {
      const bStart = startSample + i * blockSize;
      const bEnd = Math.min(bStart + blockSize, endSample);
      let peak = 0;
      let sum = 0;

      for (let j = bStart; j < bEnd; j++) {
        const absVal = Math.abs(channelData[j]);
        if (absVal > peak) peak = absVal;
        sum += absVal;
      }

      const barVal = peak * 0.75 + (sum / (bEnd - bStart || 1)) * 0.25;
      peaks.push(barVal);
      if (barVal > maxVal) maxVal = barVal;
    }

    return peaks.map((p) => (maxVal > 0 ? Math.max(0.06, p / maxVal) : 0.15));
  }, [audioBuffer, clampedViewStart, visibleDuration, containerSize.width]);

  // Sync currentTime if start changes when not playing
  useEffect(() => {
    if (!isPlaying) {
      setCurrentTime(startSec);
    }
  }, [startSec, isPlaying]);

  // Audio Playback handling via audioEngine
  const playbackRef = useRef<{ stop: () => void } | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const playStartTimeRef = useRef<number>(0);

  const stopAudio = useCallback(() => {
    if (playbackRef.current) {
      playbackRef.current.stop();
      playbackRef.current = null;
    }
    stopCurrentPlayback();
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(startSec);
  }, [startSec]);

  // Stable ref for latest stopAudio to break circular deps
  const stopAudioRef = useRef(stopAudio);
  stopAudioRef.current = stopAudio;

  // Robust playSelection with resume on user gesture
  const playSelection = useCallback(async () => {
    stopAudioRef.current();

    const currentStart = Math.max(0, startSec);
    const currentEnd = Math.min(duration, endSec);
    const rangeDuration = currentEnd - currentStart;

    if (rangeDuration <= 0.02) return;

    // Ensure AudioContext is active — MUST await before creating source nodes
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (err) {
        console.error('AudioContext resume error:', err);
        return;
      }
    }

    // Double-check context is running
    if (ctx.state !== 'running') {
      console.warn('AudioContext not running after resume, state:', ctx.state);
      return;
    }

    playStartTimeRef.current = performance.now();

    const controller = playAudioBuffer(audioBuffer, {
      offset: currentStart,
      duration: rangeDuration,
      playbackRate: playbackSpeed,
      volume: 1.0,
      loop: isLooping,
      loopStart: currentStart,
      loopEnd: currentEnd,
      onEnded: () => {
        if (!isLooping) {
          setIsPlaying(false);
          setCurrentTime(currentStart);
          if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
          }
        }
      },
    });

    playbackRef.current = controller;
    setIsPlaying(true);

    // Smooth playhead progress animation
    const updatePlayhead = () => {
      const elapsed = ((performance.now() - playStartTimeRef.current) / 1000) * playbackSpeed;
      if (isLooping) {
        const loopTime = currentStart + (elapsed % rangeDuration);
        setCurrentTime(loopTime);
        animFrameRef.current = requestAnimationFrame(updatePlayhead);
      } else {
        const nextTime = currentStart + elapsed;
        if (nextTime < currentEnd) {
          setCurrentTime(nextTime);
          animFrameRef.current = requestAnimationFrame(updatePlayhead);
        } else {
          setCurrentTime(currentStart);
          setIsPlaying(false);
        }
      }
    };
    animFrameRef.current = requestAnimationFrame(updatePlayhead);
  }, [audioBuffer, startSec, endSec, duration, isLooping, playbackSpeed]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stopAudioRef.current();
    } else {
      playSelection();
    }
  }, [isPlaying, playSelection]);

  // Pause & snap OUT marker to current playhead position
  const pauseAndSetOut = useCallback(() => {
    if (!isPlaying) return;
    const snappedTime = Math.round(currentTime * 1000) / 1000;
    const newEnd = Math.max(startSec + 0.03, Math.min(duration, snappedTime));
    stopAudioRef.current();
    onRangeChange(startSec, newEnd);
  }, [isPlaying, currentTime, startSec, duration, onRangeChange]);

  const pauseAndSetOutRef = useRef(pauseAndSetOut);
  pauseAndSetOutRef.current = pauseAndSetOut;

  // Stable ref for togglePlay to use in keyboard handlers without re-attaching
  const togglePlayRef = useRef(togglePlay);
  togglePlayRef.current = togglePlay;

  // Keyboard shortcut: Space to play/pause selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayRef.current();
      }
      if (e.code === 'KeyP') {
        e.preventDefault();
        pauseAndSetOutRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      stopAudioRef.current();
    };
  }, []);

  // Convert timeline seconds to canvas X coordinate
  const timeToX = useCallback(
    (timeSec: number, width: number) => {
      return ((timeSec - clampedViewStart) / visibleDuration) * width;
    },
    [clampedViewStart, visibleDuration]
  );

  // Convert canvas X coordinate to timeline seconds
  const xToTime = useCallback(
    (x: number, width: number) => {
      return clampedViewStart + (x / width) * visibleDuration;
    },
    [clampedViewStart, visibleDuration]
  );

  // Render Mini-Map Overview Canvas (with Retina DPR scaling)
  useEffect(() => {
    const canvas = miniMapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const width = miniMapSize.width;
    const height = miniMapSize.height;

    // Scale canvas buffer to physical pixels
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Draw background bars
    const barCount = overviewPeaks.length;
    const barWidth = Math.max(1.5, width / barCount - 1);

    for (let i = 0; i < barCount; i++) {
      const x = (i / barCount) * width;
      const peak = overviewPeaks[i];
      const barH = Math.max(2, peak * (height - 6));
      const y = (height - barH) / 2;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(x, y, barWidth, barH);
    }

    // Draw In/Out range on mini map
    const miniStartX = (startSec / duration) * width;
    const miniEndX = (endSec / duration) * width;
    ctx.fillStyle = 'rgba(99, 102, 241, 0.35)';
    ctx.fillRect(miniStartX, 0, Math.max(2, miniEndX - miniStartX), height);

    // Draw current visible viewport box on mini map
    const viewX = (clampedViewStart / duration) * width;
    const viewW = Math.max(6, (visibleDuration / duration) * width);

    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(129, 140, 248, 0.15)';
    ctx.fillRect(viewX, 0, viewW, height);
    ctx.strokeRect(viewX, 0, viewW, height);

    ctx.restore();
  }, [overviewPeaks, startSec, endSec, duration, clampedViewStart, visibleDuration, miniMapSize]);

  // Render Main Interactive Waveform Canvas (with Retina DPR scaling)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const width = containerSize.width;
    const height = containerSize.height;

    // Scale canvas buffer to physical pixels for crystal clarity
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Dynamic grid based on visible duration
    const step =
      visibleDuration < 2
        ? 0.1
        : visibleDuration < 5
        ? 0.5
        : visibleDuration < 15
        ? 1.0
        : visibleDuration < 30
        ? 2.0
        : 5.0;

    const firstTick = Math.floor(clampedViewStart / step) * step;
    const lastTick = clampedViewStart + visibleDuration;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '10px "JetBrains Mono", monospace';

    for (let s = firstTick; s <= lastTick; s += step) {
      if (s < 0) continue;
      const x = timeToX(s, width);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      if (x >= 0 && x <= width - 38) {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        const ms = Math.floor((s % 1) * 10);
        const label = step < 1 ? `${m}:${sec < 10 ? '0' : ''}${sec}.${ms}s` : `${m}:${sec < 10 ? '0' : ''}${sec}s`;
        ctx.fillText(label, x + 4, 12);
      }
    }

    const startX = timeToX(startSec, width);
    const endX = timeToX(endSec, width);
    const currentX = timeToX(currentTime, width);

    // Draw Waveform Bars
    const barCount = visiblePeaks.length;
    const barWidth = Math.max(1.8, (width / barCount) - 1.2);

    for (let i = 0; i < barCount; i++) {
      const x = (i / barCount) * width;
      const barTime = clampedViewStart + (i / barCount) * visibleDuration;
      const peak = visiblePeaks[i];
      const barHeight = Math.max(3, peak * (height - 28));
      const y = (height - barHeight) / 2 + 7;

      const isInside = barTime >= startSec && barTime <= endSec;

      if (isInside) {
        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, '#818cf8');
        grad.addColorStop(1, '#c084fc');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      }

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 1.5);
      ctx.fill();
    }

    // Darkened Dim outside selection
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    if (startX > 0) {
      ctx.fillRect(0, 0, Math.min(width, Math.max(0, startX)), height);
    }
    if (endX < width) {
      ctx.fillRect(Math.max(0, endX), 0, Math.max(0, width - endX), height);
    }

    // Selected Zone Border Highlight
    const activeStart = Math.max(0, startX);
    const activeEnd = Math.min(width, endX);
    if (activeEnd > activeStart) {
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(activeStart, 0, activeEnd - activeStart, height);
    }

    // IN Marker line & handle
    if (startX >= -14 && startX <= width + 14) {
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(startX - 2, 0, 4, height);

      // Handle flag
      ctx.beginPath();
      ctx.roundRect(startX - 14, 0, 28, 16, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('IN', startX - 6, 11);
    }

    // OUT Marker line & handle
    if (endX >= -14 && endX <= width + 14) {
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(endX - 2, 0, 4, height);

      // Handle flag
      ctx.beginPath();
      ctx.roundRect(endX - 14, 0, 28, 16, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('OUT', endX - 10, 11);
    }

    // Playhead line
    if ((isPlaying || currentTime !== startSec) && currentX >= 0 && currentX <= width) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(currentX - 1.5, 0, 3, height);
      ctx.beginPath();
      ctx.arc(currentX, height - 7, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }, [
    clampedViewStart,
    visibleDuration,
    visiblePeaks,
    startSec,
    endSec,
    currentTime,
    isPlaying,
    timeToX,
    containerSize,
  ]);

  // Main Canvas Mouse Drag Interaction
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const clickTime = xToTime(mouseX, rect.width);

    const startX = timeToX(startSec, rect.width);
    const endX = timeToX(endSec, rect.width);
    const threshold = 18;

    setDragStartX(mouseX);
    setInitialRange({ start: startSec, end: endSec });
    setInitialViewStart(clampedViewStart);

    if (Math.abs(mouseX - startX) <= threshold) {
      setDragMode('start');
    } else if (Math.abs(mouseX - endX) <= threshold) {
      setDragMode('end');
    } else if (mouseX > startX && mouseX < endX) {
      setDragMode('middle');
    } else {
      if (e.shiftKey) {
        setDragMode('pan');
      } else if (clickTime < startSec) {
        onRangeChange(Math.max(0, clickTime), endSec);
        setDragMode('start');
      } else {
        onRangeChange(startSec, Math.min(duration, clickTime));
        setDragMode('end');
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragMode === 'none' || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const targetTime = xToTime(mouseX, rect.width);

    if (dragMode === 'start') {
      const newStart = Math.max(0, Math.min(targetTime, endSec - 0.03));
      onRangeChange(Math.round(newStart * 1000) / 1000, endSec);
    } else if (dragMode === 'end') {
      const newEnd = Math.min(duration, Math.max(targetTime, startSec + 0.03));
      onRangeChange(startSec, Math.round(newEnd * 1000) / 1000);
    } else if (dragMode === 'middle') {
      const deltaX = mouseX - dragStartX;
      const deltaTime = (deltaX / rect.width) * visibleDuration;
      const rangeLen = initialRange.end - initialRange.start;

      let newStart = initialRange.start + deltaTime;
      let newEnd = initialRange.end + deltaTime;

      if (newStart < 0) {
        newStart = 0;
        newEnd = rangeLen;
      }
      if (newEnd > duration) {
        newEnd = duration;
        newStart = duration - rangeLen;
      }
      onRangeChange(Math.round(newStart * 1000) / 1000, Math.round(newEnd * 1000) / 1000);
    } else if (dragMode === 'pan') {
      const deltaX = mouseX - dragStartX;
      const deltaTime = (deltaX / rect.width) * visibleDuration;
      const newViewStart = Math.max(0, Math.min(duration - visibleDuration, initialViewStart - deltaTime));
      setViewStartSec(newViewStart);
    }
  };

  const handleMouseUp = () => {
    setDragMode('none');
  };

  // Mini-map interaction
  const handleMiniMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!miniMapContainerRef.current) return;
    const rect = miniMapContainerRef.current.getBoundingClientRect();
    const mouseX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const targetCenterTime = (mouseX / rect.width) * duration;
    const newViewStart = Math.max(0, Math.min(duration - visibleDuration, targetCenterTime - visibleDuration / 2));
    setViewStartSec(newViewStart);
  };

  // Zoom helpers
  const handleZoomIn = () => {
    const nextZoom = Math.min(16.0, zoom * 1.5);
    setZoom(nextZoom);
    const selCenter = (startSec + endSec) / 2;
    const nextVisibleDur = duration / nextZoom;
    setViewStartSec(Math.max(0, Math.min(duration - nextVisibleDur, selCenter - nextVisibleDur / 2)));
  };

  const handleZoomOut = () => {
    const nextZoom = Math.max(1.0, zoom / 1.5);
    setZoom(nextZoom);
    const nextVisibleDur = duration / nextZoom;
    setViewStartSec(Math.max(0, Math.min(duration - nextVisibleDur, clampedViewStart)));
  };

  const handleFitSelection = () => {
    const selDuration = Math.max(0.1, endSec - startSec);
    const idealZoom = Math.max(1.0, Math.min(16.0, duration / (selDuration * 1.5)));
    setZoom(idealZoom);
    const idealVisibleDur = duration / idealZoom;
    const selCenter = (startSec + endSec) / 2;
    setViewStartSec(Math.max(0, Math.min(duration - idealVisibleDur, selCenter - idealVisibleDur / 2)));
  };

  const handleResetZoom = () => {
    setZoom(1.0);
    setViewStartSec(0);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}.${ms < 100 ? (ms < 10 ? '00' : '0') : ''}${ms}`;
  };

  // Steppers for fine millisecond adjustment
  const stepStart = (deltaSec: number) => {
    const newStart = Math.max(0, Math.min(startSec + deltaSec, endSec - 0.03));
    onRangeChange(Math.round(newStart * 1000) / 1000, endSec);
  };

  const stepEnd = (deltaSec: number) => {
    const newEnd = Math.min(duration, Math.max(endSec + deltaSec, startSec + 0.03));
    onRangeChange(startSec, Math.round(newEnd * 1000) / 1000);
  };

  return (
    <div className="space-y-3 select-none">
      {/* Mini-Map Overview Timeline */}
      <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1 px-1">
        <span className="flex items-center gap-1.5 font-mono text-neutral-400">
          <MoveHorizontal className="w-3.5 h-3.5 text-indigo-400" />
          Vista General (Haz clic para saltar en la pista)
        </span>
        <span className="font-mono text-neutral-500">
          {formatTime(clampedViewStart)} — {formatTime(Math.min(duration, clampedViewStart + visibleDuration))}
        </span>
      </div>

      <div
        ref={miniMapContainerRef}
        onClick={handleMiniMapClick}
        className="relative rounded-xl bg-black/50 border border-white/8 overflow-hidden cursor-pointer shadow-inner"
        style={{ height: '28px' }}
        title="Haz clic para centrar la vista en cualquier punto de la recopilación"
      >
        <canvas
          ref={miniMapCanvasRef}
          className="block"
          style={{ width: `${miniMapSize.width}px`, height: `${miniMapSize.height}px` }}
        />
      </div>

      {/* Main Waveform Canvas Container (Full container width with DPR canvas scaling) */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative rounded-2xl bg-black/45 border border-white/10 overflow-hidden cursor-crosshair group shadow-2xl"
        style={{ height: '144px' }}
      >
        <canvas
          ref={canvasRef}
          className="block"
          style={{ width: `${containerSize.width}px`, height: `${containerSize.height}px` }}
        />

        {/* Floating Range Duration Tag */}
        <div className="absolute top-2.5 right-3 pointer-events-none flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-xs font-mono text-indigo-300">
          <Scissors className="w-3.5 h-3.5 text-indigo-400" />
          <span>Corte: {((endSec - startSec) || 0).toFixed(3)}s</span>
        </div>

        {/* Zoom Indicator Tag */}
        {zoom > 1.05 && (
          <div className="absolute top-2.5 left-3 pointer-events-none px-2 py-0.5 rounded-lg bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30 text-[10px] font-mono text-indigo-300">
            Zoom {zoom.toFixed(1)}x
          </div>
        )}
      </div>

      {/* Transport, Zoom & Fine-Tuning Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/4 border border-white/8 backdrop-blur-md">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-medium transition-all ${
              isPlaying
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25'
            }`}
            title="Reproducir selección (Espacio)"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`h-10 px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              isLooping
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                : 'bg-white/5 border-white/8 text-neutral-400 hover:text-white'
            }`}
            title="Activar reproducción en bucle continuo"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLooping ? 'animate-spin-slow' : ''}`} />
            <span>Bucle</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/6">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 1.0}
            className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Alejar zoom (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="px-2 text-[11px] font-mono text-neutral-300 min-w-[3rem] text-center">
            {zoom.toFixed(1)}x
          </span>

          <button
            onClick={handleZoomIn}
            disabled={zoom >= 16.0}
            className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Acercar zoom (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          <button
            onClick={handleFitSelection}
            className="px-2 py-1 rounded-lg hover:bg-white/10 text-[10px] font-mono text-indigo-300 transition-colors flex items-center gap-1"
            title="Ajustar zoom al corte seleccionado"
          >
            <Maximize2 className="w-3 h-3" />
            <span className="hidden sm:inline">Ajustar</span>
          </button>

          {zoom > 1.0 && (
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 rounded-lg hover:bg-white/10 text-[10px] font-mono text-neutral-400 hover:text-white transition-colors"
              title="Restablecer vista a 1x"
            >
              1x
            </button>
          )}
        </div>

        {/* Millisecond In/Out Inputs with Precision Buttons */}
        <div className="flex items-center gap-3 text-xs font-mono">
          {/* Start / In Point */}
          <div className="flex items-center gap-1.5 bg-black/30 px-2.5 py-1.5 rounded-xl border border-white/6">
            <span className="text-[10px] text-indigo-400 font-bold uppercase">IN:</span>
            <span className="text-white text-xs">{formatTime(startSec)}</span>
            <div className="flex items-center gap-0.5 ml-1">
              <button
                onClick={() => stepStart(-0.05)}
                className="w-5 h-5 rounded bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white text-[10px] flex items-center justify-center"
                title="-50ms"
              >
                -
              </button>
              <button
                onClick={() => stepStart(0.05)}
                className="w-5 h-5 rounded bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white text-[10px] flex items-center justify-center"
                title="+50ms"
              >
                +
              </button>
            </div>
          </div>

          <ArrowLeftRight className="w-3.5 h-3.5 text-neutral-600" />

          {/* End / Out Point */}
          <div className="flex items-center gap-1.5 bg-black/30 px-2.5 py-1.5 rounded-xl border border-white/6">
            <span className="text-[10px] text-purple-400 font-bold uppercase">OUT:</span>
            <span className="text-white text-xs">{formatTime(endSec)}</span>
            <div className="flex items-center gap-0.5 ml-1">
              <button
                onClick={() => stepEnd(-0.05)}
                className="w-5 h-5 rounded bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white text-[10px] flex items-center justify-center"
                title="-50ms"
              >
                -
              </button>
              <button
                onClick={() => stepEnd(0.05)}
                className="w-5 h-5 rounded bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white text-[10px] flex items-center justify-center"
                title="+50ms"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
