import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, ZoomIn, ZoomOut, Scissors, ArrowLeftRight } from 'lucide-react';
import { extractWaveformPeaks, playAudioBuffer, stopCurrentPlayback } from '../utils/audioEngine';

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(startSec);
  const [isLooping, setIsLooping] = useState(false);
  const [dragMode, setDragMode] = useState<'none' | 'start' | 'end' | 'middle' | 'seek'>('none');
  const [dragStartX, setDragStartX] = useState(0);
  const [initialRange, setInitialRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

  const duration = audioBuffer.duration;
  const peaksRef = useRef<number[]>([]);

  // Pre-calculate peaks
  useEffect(() => {
    peaksRef.current = extractWaveformPeaks(audioBuffer, 240);
  }, [audioBuffer]);

  // Sync currentTime if start changes when not playing
  useEffect(() => {
    if (!isPlaying) {
      setCurrentTime(startSec);
    }
  }, [startSec, isPlaying]);

  // Audio Playback handling
  const playbackRef = useRef<{ stop: () => void } | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const playStartTimeRef = useRef<number>(0);
  const playStartAudioTimeRef = useRef<number>(0);

  const stopAudio = useCallback(() => {
    if (playbackRef.current) {
      playbackRef.current.stop();
      playbackRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(startSec);
  }, [startSec]);

  const playSelection = useCallback(() => {
    stopCurrentPlayback();
    if (playbackRef.current) {
      playbackRef.current.stop();
    }

    const currentStart = startSec;
    const currentEnd = endSec;
    const rangeDuration = currentEnd - currentStart;

    if (rangeDuration <= 0.05) return;

    // Create custom sliced buffer for exact playback
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.floor(currentStart * sampleRate);
    const endSample = Math.floor(currentEnd * sampleRate);
    const sliceLen = endSample - startSample;

    const sliceBuffer = ctx.createBuffer(audioBuffer.numberOfChannels, sliceLen, sampleRate);
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      const src = audioBuffer.getChannelData(ch);
      const dst = sliceBuffer.getChannelData(ch);
      for (let i = 0; i < sliceLen; i++) {
        dst[i] = src[startSample + i];
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = sliceBuffer;
    source.playbackRate.value = playbackSpeed;
    source.loop = isLooping;
    source.connect(ctx.destination);

    playStartTimeRef.current = performance.now();
    playStartAudioTimeRef.current = currentStart;

    source.onended = () => {
      if (!isLooping) {
        setIsPlaying(false);
        setCurrentTime(currentStart);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      }
    };

    source.start(0);
    playbackRef.current = {
      stop: () => {
        try {
          source.stop();
        } catch {
          // ignore
        }
      },
    };
    setIsPlaying(true);

    // Update playhead visual
    const updatePlayhead = () => {
      const elapsedSec = ((performance.now() - playStartTimeRef.current) / 1000) * playbackSpeed;
      if (isLooping) {
        const loopTime = currentStart + (elapsedSec % rangeDuration);
        setCurrentTime(loopTime);
        animFrameRef.current = requestAnimationFrame(updatePlayhead);
      } else {
        const nextTime = currentStart + elapsedSec;
        if (nextTime <= currentEnd) {
          setCurrentTime(nextTime);
          animFrameRef.current = requestAnimationFrame(updatePlayhead);
        } else {
          setCurrentTime(currentStart);
          setIsPlaying(false);
        }
      }
    };
    animFrameRef.current = requestAnimationFrame(updatePlayhead);
  }, [audioBuffer, startSec, endSec, isLooping, playbackSpeed]);

  const togglePlay = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      playSelection();
    }
  };

  // Keyboard shortcut: Space to play/pause selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      stopAudio();
    };
  }, [togglePlay, stopAudio]);

  // Render Waveform Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const peaks = peaksRef.current;

    ctx.clearRect(0, 0, width, height);

    // Draw background grid lines (seconds intervals)
    const totalSecs = Math.ceil(duration);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '9px "JetBrains Mono", monospace';

    const step = duration > 30 ? 5 : duration > 10 ? 2 : 1;
    for (let s = 0; s <= totalSecs; s += step) {
      const x = (s / duration) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      if (x < width - 30) {
        const min = Math.floor(s / 60);
        const sec = s % 60;
        ctx.fillText(`${min}:${sec < 10 ? '0' : ''}${sec}s`, x + 4, 12);
      }
    }

    // Positions of start and end
    const startX = (startSec / duration) * width;
    const endX = (endSec / duration) * width;
    const currentX = (currentTime / duration) * width;

    // Draw unselected dim background bars
    const barCount = peaks.length;
    const barWidth = Math.max(2, (width / barCount) - 1.5);

    for (let i = 0; i < barCount; i++) {
      const x = (i / barCount) * width;
      const peak = peaks[i];
      const barHeight = Math.max(3, peak * (height - 24));
      const y = (height - barHeight) / 2 + 6;

      const isInside = x >= startX && x <= endX;

      if (isInside) {
        // Gradient color for selected region
        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, '#818cf8');
        grad.addColorStop(1, '#a855f7');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      }

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2);
      ctx.fill();
    }

    // Draw shaded dim outside selection
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, startX, height);
    ctx.fillRect(endX, 0, width - endX, height);

    // Selected zone border highlight
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, 0, endX - startX, height);

    // Draw In-Marker line & handle
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(startX - 2, 0, 4, height);
    // Top & bottom handle
    ctx.beginPath();
    ctx.arc(startX, 12, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('IN', startX - 5, 26);

    // Draw Out-Marker line & handle
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(endX - 2, 0, 4, height);
    ctx.beginPath();
    ctx.arc(endX, 12, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('OUT', endX - 8, 26);

    // Draw Playhead line if inside range
    if (isPlaying || currentTime !== startSec) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(currentX - 1.5, 0, 3, height);
      ctx.beginPath();
      ctx.arc(currentX, height - 8, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [duration, startSec, endSec, currentTime, isPlaying]);

  // Mouse / Drag interaction for trimming
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const clickTime = (mouseX / rect.width) * duration;

    const startX = (startSec / duration) * rect.width;
    const endX = (endSec / duration) * rect.width;

    const threshold = 14;

    setDragStartX(mouseX);
    setInitialRange({ start: startSec, end: endSec });

    if (Math.abs(mouseX - startX) <= threshold) {
      setDragMode('start');
    } else if (Math.abs(mouseX - endX) <= threshold) {
      setDragMode('end');
    } else if (mouseX > startX && mouseX < endX) {
      // Middle drag (move whole window)
      setDragMode('middle');
    } else {
      // Click outside: set nearest marker or seek
      if (mouseX < startX) {
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
    const targetTime = (mouseX / rect.width) * duration;

    if (dragMode === 'start') {
      const newStart = Math.max(0, Math.min(targetTime, endSec - 0.05));
      onRangeChange(Math.round(newStart * 1000) / 1000, endSec);
    } else if (dragMode === 'end') {
      const newEnd = Math.min(duration, Math.max(targetTime, startSec + 0.05));
      onRangeChange(startSec, Math.round(newEnd * 1000) / 1000);
    } else if (dragMode === 'middle') {
      const deltaX = mouseX - dragStartX;
      const deltaTime = (deltaX / rect.width) * duration;
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
    }
  };

  const handleMouseUp = () => {
    setDragMode('none');
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}.${ms < 100 ? (ms < 10 ? '00' : '0') : ''}${ms}`;
  };

  // Stepper helpers
  const stepStart = (deltaSec: number) => {
    const newStart = Math.max(0, Math.min(startSec + deltaSec, endSec - 0.05));
    onRangeChange(Math.round(newStart * 1000) / 1000, endSec);
  };

  const stepEnd = (deltaSec: number) => {
    const newEnd = Math.min(duration, Math.max(endSec + deltaSec, startSec + 0.05));
    onRangeChange(startSec, Math.round(newEnd * 1000) / 1000);
  };

  return (
    <div className="space-y-4 select-none">
      {/* Waveform Canvas Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative h-32 rounded-2xl bg-black/40 border border-white/10 overflow-hidden cursor-crosshair group shadow-inner"
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={128}
          className="w-full h-full block"
        />

        {/* Floating Range Duration Tag */}
        <div className="absolute top-2 right-3 pointer-events-none flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-indigo-300">
          <Scissors className="w-3 h-3 text-indigo-400" />
          <span>Duración corte: {((endSec - startSec) || 0).toFixed(2)}s</span>
        </div>
      </div>

      {/* Transport & Fine-Tuning Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/4 border border-white/8">
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

        {/* Millisecond In/Out Inputs with Precision Buttons */}
        <div className="flex items-center gap-4 text-xs font-mono">
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

        {/* Total Source Duration */}
        <div className="text-[11px] text-neutral-500 font-mono hidden sm:block">
          Total: {formatTime(duration)}
        </div>
      </div>
    </div>
  );
};
