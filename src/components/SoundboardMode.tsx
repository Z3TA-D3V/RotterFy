import React, { useEffect, useState } from 'react';
import { Play, Square, Zap, Flame, Volume2, Sparkles, AlertCircle } from 'lucide-react';
import { SoundItem } from '../types';

interface SoundboardModeProps {
  sounds: SoundItem[];
  onPlaySound: (sound: SoundItem) => void;
  onStopAll: () => void;
  currentPlayingId: string | null;
}

const DEFAULT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Q', 'W', 'E', 'R', 'T', 'Y'];

export const SoundboardMode: React.FC<SoundboardModeProps> = ({
  sounds,
  onPlaySound,
  onStopAll,
  currentPlayingId,
}) => {
  const [activeTriggerId, setActiveTriggerId] = useState<string | null>(null);

  // Assign keys to top sounds
  const soundboardPads = sounds.slice(0, 16).map((sound, idx) => ({
    ...sound,
    assignedKey: sound.hotkey || DEFAULT_KEYS[idx] || `${idx + 1}`,
  }));

  // Keyboard listeners for rapid fire soundboard triggers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Escape') {
        onStopAll();
        return;
      }

      const pressedKey = e.key.toUpperCase();
      const matched = soundboardPads.find(
        (pad) => pad.assignedKey.toUpperCase() === pressedKey
      );

      if (matched) {
        e.preventDefault();
        setActiveTriggerId(matched.id);
        onPlaySound(matched);
        setTimeout(() => setActiveTriggerId(null), 300);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [soundboardPads, onPlaySound, onStopAll]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Panic Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-white/4 border border-white/8 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              Modo Soundboard en Vivo
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                Latencia Ultrabaja
              </span>
            </h2>
            <p className="text-xs text-neutral-400">
              Presiona las teclas de tu teclado físico para disparar los sonidos mientras grabas tus videos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[11px] font-mono text-neutral-400 hidden sm:block">
            Detener todo: <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white">ESC</kbd>
          </div>

          <button
            onClick={onStopAll}
            className="px-4 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Parar Todos
          </button>
        </div>
      </div>

      {/* Grid of Large Pads */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {soundboardPads.map((pad) => {
          const isPlaying = currentPlayingId === pad.id;
          const isTriggered = activeTriggerId === pad.id;

          return (
            <button
              key={pad.id}
              onClick={() => {
                setActiveTriggerId(pad.id);
                onPlaySound(pad);
                setTimeout(() => setActiveTriggerId(null), 300);
              }}
              className={`relative group rounded-3xl p-5 border text-left transition-all duration-150 flex flex-col justify-between h-40 select-none overflow-hidden ${
                isTriggered
                  ? 'scale-95 ring-4 ring-amber-400 border-amber-400 bg-amber-950/40'
                  : isPlaying
                  ? 'border-indigo-500 bg-indigo-950/40 shadow-xl shadow-indigo-500/20 ring-1 ring-indigo-500/40'
                  : 'bg-[#141622]/90 hover:bg-[#1a1d2e] border-white/8 hover:border-white/15'
              }`}
            >
              {/* Hotkey Tag in Top Right */}
              <div className="flex items-start justify-between w-full">
                <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                  {pad.coverImage && pad.coverImage.startsWith('/') ? (
                    <img src={pad.coverImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{pad.coverImage || '🔊'}</span>
                  )}
                </div>

                <kbd
                  className={`text-xs font-mono font-bold px-2.5 py-1 rounded-xl border transition-all ${
                    isTriggered || isPlaying
                      ? 'bg-indigo-500 text-white border-indigo-400'
                      : 'bg-white/10 text-neutral-300 border-white/10 group-hover:bg-white/15'
                  }`}
                >
                  {pad.assignedKey}
                </kbd>
              </div>

              {/* Title & Category Info */}
              <div className="mt-4">
                <span className="text-xs font-bold text-white block truncate group-hover:text-indigo-300 transition-colors">
                  {pad.title}
                </span>
                <span className="text-[11px] text-neutral-400 font-mono mt-0.5 block truncate">
                  {pad.folder || pad.category} · {pad.duration}s
                </span>
              </div>

              {/* Animated active wave glow */}
              {isPlaying && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-400 via-indigo-500 to-purple-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
