import React from 'react';
import { Play, Pause, Square, RotateCcw, Volume2, VolumeX, FastForward, Scissors, FolderOpen } from 'lucide-react';
import { SoundItem } from '../types';

interface AudioPlayerBarProps {
  sound: SoundItem | null;
  isPlaying: boolean;
  progress: number; // 0 to 1
  currentTime: number;
  duration: number;
  isLooping: boolean;
  playbackSpeed: number;
  volume: number;
  onTogglePlay: () => void;
  onStop: () => void;
  onToggleLoop: () => void;
  onChangeSpeed: (speed: number) => void;
  onChangeVolume: (vol: number) => void;
  onOpenTrimmer: (sound: SoundItem) => void;
  onOpenFileLocation: (sound: SoundItem) => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  sound,
  isPlaying,
  progress,
  currentTime,
  duration,
  isLooping,
  playbackSpeed,
  volume,
  onTogglePlay,
  onStop,
  onToggleLoop,
  onChangeSpeed,
  onChangeVolume,
  onOpenTrimmer,
  onOpenFileLocation,
}) => {
  if (!sound) return null;

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  const formatSec = (sec: number) => {
    const s = Math.floor(sec);
    const ms = Math.floor((sec % 1) * 10);
    return `${s}.${ms}s`;
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-4xl animate-slide-up">
      <div className="glass-panel-elevated rounded-2xl p-3 border border-white/15 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Sound Cover & Metadata */}
        <div className="flex items-center gap-3 min-w-0 w-full md:w-auto">
          <div className="w-11 h-11 rounded-xl bg-neutral-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center text-lg">
            {sound.coverImage && (sound.coverImage.startsWith('/') || sound.coverImage.startsWith('data:image/')) ? (
              <img src={sound.coverImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{sound.coverImage || '🔊'}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white truncate">{sound.title}</span>
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/20 px-1.5 py-0.2 rounded">
                {sound.category}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400 mt-0.5">
              <span>{formatSec(currentTime)} / {formatSec(duration || sound.duration)}</span>
              {playbackSpeed !== 1.0 && (
                <span className="text-amber-400 font-semibold">{playbackSpeed}x</span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Playhead Progress Bar & Main Buttons */}
        <div className="flex-1 max-w-md w-full flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleLoop}
              className={`p-2 rounded-xl text-xs transition-colors ${
                isLooping
                  ? 'bg-indigo-500/30 text-indigo-300'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="Bucle"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onTogglePlay}
              className="w-9 h-9 rounded-xl bg-white text-black hover:bg-neutral-200 flex items-center justify-center transition-all shadow-md active:scale-95"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              onClick={onStop}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Detener"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>

          {/* Progress Bar Line */}
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-75"
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            />
          </div>
        </div>

        {/* Right: Speed Multiplier, Volume & Shortcuts */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/8 text-[11px] font-mono">
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => onChangeSpeed(s)}
                className={`px-1.5 py-0.5 rounded-lg transition-colors ${
                  playbackSpeed === s
                    ? 'bg-indigo-500 text-white font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Volume */}
          <div className="hidden sm:flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-neutral-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
              className="w-16 h-1 bg-white/15 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Quick Trimmer & Folder */}
          <button
            onClick={() => onOpenTrimmer(sound)}
            className="p-2 rounded-xl bg-white/6 hover:bg-white/12 text-neutral-300 hover:text-white text-xs transition-colors"
            title="Recortar en Estudio"
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onOpenFileLocation(sound)}
            className="p-2 rounded-xl bg-white/6 hover:bg-white/12 text-amber-400 hover:text-amber-300 text-xs transition-colors"
            title="Abrir en Carpeta"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
