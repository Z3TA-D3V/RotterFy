import React, { useState } from 'react';
import { Film, Plus, ExternalLink, HardDrive, Star, FolderOpen, Video, Check } from 'lucide-react';
import { StockVideoAsset } from '../types';

interface StockVideoHubProps {
  videos: StockVideoAsset[];
  onSaveVideo: (video: StockVideoAsset) => void;
}

export const StockVideoHub: React.FC<StockVideoHubProps> = ({ videos, onSaveVideo }) => {
  const [filter, setFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = videos.filter((v) => filter === 'all' || v.category === filter);

  const handleCopyPath = async (video: StockVideoAsset) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(video.localPath || video.title);
      }
    } catch {}
    setCopiedId(video.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-white/4 border border-white/8 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              Videos de Stock & B-Roll Hipnótico
              <span className="text-[10px] font-mono bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">
                Extensión Futura
              </span>
            </h2>
            <p className="text-xs text-neutral-400">
              Organizador de clips de fondo para retención (Minecraft Parkour, Subway Surfers, jabón ASMR, arena kinética).
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/8">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'parkour', label: 'Parkour' },
            { id: 'gameplay', label: 'Subway Surfers' },
            { id: 'satisfying', label: 'ASMR / Jabón' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filter === item.id
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Videos Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map((video) => (
          <div
            key={video.id}
            className="rounded-3xl p-5 bg-[#13151f]/80 border border-white/8 hover:border-white/15 transition-all space-y-4 flex flex-col justify-between"
          >
            <div>
              <div className="w-full h-32 rounded-2xl bg-gradient-to-tr from-neutral-900 via-indigo-950/40 to-neutral-800 border border-white/8 flex flex-col items-center justify-center gap-2 text-neutral-400 mb-3 relative overflow-hidden group">
                <Video className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-mono text-neutral-400">
                  {video.format} · {video.durationText}
                </span>
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] font-mono uppercase bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-indigo-300 border border-white/10">
                    {video.category}
                  </span>
                </div>
              </div>

              <h3 className="text-xs font-bold text-white mb-1">{video.title}</h3>
              <p className="text-[11px] text-neutral-400 line-clamp-2">{video.notes}</p>
            </div>

            <div className="pt-3 border-t border-white/6 flex items-center justify-between">
              <span className="text-[10px] font-mono text-neutral-500 truncate max-w-[180px]">
                {video.localPath}
              </span>

              <button
                onClick={() => handleCopyPath(video)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-indigo-300 hover:text-white transition-colors"
              >
                {copiedId === video.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Copiar Ruta</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
