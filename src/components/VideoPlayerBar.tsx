import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Minimize2, Pause, Play, Square, Volume2, X } from 'lucide-react';
import type { StockVideoAsset } from '../types';
import { assetUrl } from '../utils/storage';

interface Props { video: StockVideoAsset; onClose: () => void }
export interface VideoPlayerHandle { play: () => void }

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const value = Math.floor(seconds);
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

export const VideoPlayerBar = forwardRef<VideoPlayerHandle, Props>(function VideoPlayerBar({ video, onClose }, ref) {
  const playerRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<'large' | 'compact' | 'collapsed'>('large');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);

  useImperativeHandle(ref, () => ({
    play: () => { void playerRef.current?.play().catch(() => setIsPlaying(false)); },
  }), []);

  useEffect(() => {
    const player = playerRef.current;
    return () => player?.pause();
  }, [video.id]);

  useEffect(() => {
    if (mode !== 'large') return;
    const minimizeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMode('compact');
    };
    window.addEventListener('keydown', minimizeOnEscape);
    return () => window.removeEventListener('keydown', minimizeOnEscape);
  }, [mode]);

  const togglePlay = () => {
    const player = playerRef.current;
    if (!player) return;
    if (player.paused) void player.play().catch(() => setIsPlaying(false));
    else player.pause();
  };

  const stop = () => {
    const player = playerRef.current;
    if (!player) return;
    player.pause();
    player.currentTime = 0;
    setCurrentTime(0);
  };

  const isLarge = mode === 'large';
  const isCollapsed = mode === 'collapsed';

  return <div role={isLarge ? 'dialog' : undefined} aria-modal={isLarge ? true : undefined}
    aria-label={isLarge ? `Visualizador de ${video.title}` : undefined}
    onClick={(event) => { if (isLarge && event.target === event.currentTarget) setMode('compact'); }}
    className={isLarge
      ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 md:p-6'
      : `fixed bottom-2 left-1/2 z-40 flex max-w-[95%] -translate-x-1/2 flex-col items-center animate-slide-up ${isCollapsed ? 'w-auto' : 'w-[95%] max-w-4xl'}`}>
    <div id="video-player-controls" className={`glass-panel-elevated relative flex items-center gap-3 rounded-2xl border border-white/15 shadow-2xl ${isLarge
      ? 'h-[min(88vh,900px)] w-[min(80vw,1400px)] max-md:w-[95vw] flex-col p-3 md:p-5'
      : isCollapsed ? 'max-w-full p-2' : 'w-full flex-col p-3 md:flex-row'}`}>
      <video ref={playerRef} src={assetUrl(video.localPath)} playsInline preload="auto"
        role={isLarge ? undefined : 'button'} tabIndex={isLarge ? undefined : 0}
        aria-label={isLarge ? `Previsualización de ${video.title}` : `Ampliar vídeo ${video.title}`}
        onClick={() => { if (!isLarge) setMode('large'); }}
        onKeyDown={(event) => { if (!isLarge && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setMode('large'); } }}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)}
        className={`rounded-xl bg-black object-contain ${isLarge ? 'min-h-0 w-full flex-1' : isCollapsed ? 'h-14 w-24 shrink-0 cursor-zoom-in' : 'h-24 w-40 shrink-0 cursor-zoom-in'}`} />
      <div className={`min-w-0 ${isLarge ? 'w-full pr-20' : isCollapsed ? 'max-w-36' : 'w-full md:w-44'}`}>
        <p className={`truncate font-semibold text-white ${isLarge ? 'text-base' : 'text-xs'}`}>{video.title}</p>
        {!isCollapsed && <p className="mt-1 truncate text-[11px] text-indigo-300">{video.category}</p>}
        <p className="mt-1 text-[11px] font-mono text-neutral-400">{formatTime(currentTime)} / {formatTime(duration)}</p>
      </div>
      {isCollapsed ? <button type="button" onClick={togglePlay} aria-label={isPlaying ? 'Pausar vídeo' : 'Reproducir vídeo'}
        className="rounded-xl bg-white p-2 text-black">{isPlaying ? <Pause size={17} /> : <Play size={17} />}</button>
        : <div className={`flex w-full min-w-0 flex-col gap-2 ${isLarge ? 'shrink-0' : 'flex-1'}`}>
          <div className="flex items-center justify-center gap-3">
            <button type="button" onClick={togglePlay} aria-label={isPlaying ? 'Pausar vídeo' : 'Reproducir vídeo'}
              className="rounded-xl bg-white p-2.5 text-black hover:bg-neutral-200">{isPlaying ? <Pause size={18} /> : <Play size={18} />}</button>
            <button type="button" onClick={stop} aria-label="Detener vídeo" className="rounded-xl p-2 text-neutral-400 hover:bg-white/5 hover:text-white"><Square size={16} /></button>
          </div>
          <input type="range" min={0} max={duration || 1} step="0.1" value={Math.min(currentTime, duration || 1)}
            aria-label="Posición del vídeo" onChange={(event) => { if (playerRef.current) playerRef.current.currentTime = Number(event.target.value); setCurrentTime(Number(event.target.value)); }}
            className="w-full accent-indigo-500" />
        </div>}
      {!isCollapsed && <div className={`flex shrink-0 items-center gap-2 ${isLarge ? 'absolute bottom-16 right-5' : ''}`}>
        <label className="flex items-center gap-1 text-neutral-400"><Volume2 size={15} />
          <input type="range" min={0} max={1} step="0.05" value={volume} aria-label="Volumen del vídeo"
            onChange={(event) => { const next = Number(event.target.value); setVolume(next); if (playerRef.current) playerRef.current.volume = next; }}
            className="w-16 accent-indigo-500" />
        </label>
        <select aria-label="Velocidad del vídeo" value={speed} onChange={(event) => { const next = Number(event.target.value); setSpeed(next); if (playerRef.current) playerRef.current.playbackRate = next; }}
          className="rounded-lg border border-white/10 bg-[#202336] px-2 py-1 text-xs text-white">
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((value) => <option key={value} value={value}>{value}x</option>)}
        </select>
      </div>}
      {isLarge && <div className="absolute right-3 top-3 flex items-center gap-2 md:right-5 md:top-5">
        <button type="button" onClick={() => setMode('compact')} aria-label="Minimizar vídeo" title="Minimizar vídeo"
          className="rounded-xl bg-black/70 p-2.5 text-white hover:bg-black"><Minimize2 size={18} /></button>
        <button type="button" onClick={onClose} aria-label="Cerrar reproductor de vídeo" title="Cerrar reproductor de vídeo"
          className="rounded-xl bg-rose-500/80 p-2.5 text-white hover:bg-rose-500"><X size={18} /></button>
      </div>}
    </div>
    {!isLarge && <div className="flex items-center gap-1">
      <button type="button" onClick={() => setMode(isCollapsed ? 'compact' : 'collapsed')}
        aria-label={isCollapsed ? 'Mostrar reproductor de vídeo' : 'Ocultar reproductor de vídeo'}
        aria-expanded={!isCollapsed} aria-controls="video-player-controls"
        className={`flex items-center justify-center gap-2 border border-white/15 bg-[#20212e] px-3 text-xs text-neutral-300 hover:bg-[#303249] ${isCollapsed ? 'rounded-xl py-2' : '-mt-px rounded-b-xl border-t-0 py-1'}`}>
        {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      <button type="button" onClick={onClose} aria-label="Cerrar reproductor de vídeo"
        className={`border border-rose-500/40 bg-rose-500/15 px-2 text-rose-300 hover:bg-rose-500/25 ${isCollapsed ? 'rounded-xl py-2' : '-mt-px rounded-b-xl border-t-0 py-1'}`}>
        <X size={16} />
      </button>
    </div>}
  </div>;
});
