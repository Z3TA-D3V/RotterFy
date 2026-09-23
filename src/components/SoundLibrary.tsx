import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Scissors, 
  FolderOpen, 
  Star, 
  Trash2, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  LayoutGrid, 
  List, 
  SlidersHorizontal,
  Flame,
  RotateCcw,
  Zap
} from 'lucide-react';
import { SoundItem, SoundCategory } from '../types';

interface SoundLibraryProps {
  sounds: SoundItem[];
  currentPlayingId: string | null;
  playbackProgress: number; // 0 to 1
  onPlaySound: (sound: SoundItem) => void;
  onStopSound: () => void;
  onOpenTrimmerForSound: (sound: SoundItem) => void;
  onOpenFileLocation: (sound: SoundItem) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteSound: (id: string) => void;
  searchQuery: string;
}

export const SoundLibrary: React.FC<SoundLibraryProps> = ({
  sounds,
  currentPlayingId,
  playbackProgress,
  onPlaySound,
  onStopSound,
  onOpenTrimmerForSound,
  onOpenFileLocation,
  onToggleFavorite,
  onDeleteSound,
  searchQuery,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'alpha'>('recent');

  const categories = [
    { id: 'all', label: 'Todos' },
    { id: 'favorites', label: 'Favoritos ⭐' },
    { id: 'brainrot', label: 'Brainrot' },
    { id: 'meme', label: 'Memes' },
    { id: 'impact', label: 'Impactos / Bass' },
    { id: 'vocal', label: 'Voces' },
    { id: 'sfx', label: 'SFX' },
    { id: 'game', label: 'Gaming' },
  ];

  // Filtering
  const filteredSounds = sounds.filter((sound) => {
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = sound.title.toLowerCase().includes(q);
      const matchTag = sound.tags.some((t) => t.toLowerCase().includes(q));
      const matchFolder = sound.folder?.toLowerCase().includes(q);
      if (!matchTitle && !matchTag && !matchFolder) return false;
    }

    // Category filter
    if (selectedCategory === 'favorites') {
      return sound.favorite;
    }
    if (selectedCategory !== 'all') {
      return sound.category === selectedCategory;
    }
    return true;
  });

  // Sorting
  const sortedSounds = [...filteredSounds].sort((a, b) => {
    if (sortBy === 'popular') {
      return (b.playCount || 0) - (a.playCount || 0);
    }
    if (sortBy === 'alpha') {
      return a.title.localeCompare(b.title);
    }
    return b.addedAt - a.addedAt;
  });

  return (
    <div className="space-y-6">
      {/* Category Pills & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-white/4 border border-white/8 backdrop-blur-md">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-white/15 text-white shadow-sm font-semibold border border-white/15'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* View Options & Sort */}
        <div className="flex items-center gap-3">
          {/* Sort By */}
          <div className="flex items-center gap-1.5 bg-white/4 px-2.5 py-1.5 rounded-xl border border-white/8 text-xs text-neutral-400">
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'recent' | 'popular' | 'alpha')}
              className="bg-transparent text-neutral-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="recent" className="bg-[#12141e]">Más recientes</option>
              <option value="popular" className="bg-[#12141e]">Más reproducidos</option>
              <option value="alpha" className="bg-[#12141e]">Alfabético</option>
            </select>
          </div>

          {/* Grid / List View Toggle */}
          <div className="flex items-center gap-1 bg-white/4 p-1 rounded-xl border border-white/8">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white/15 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Vista de cuadrícula"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'list'
                  ? 'bg-white/15 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Vista compacta de lista"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sounds Grid / List View */}
      {sortedSounds.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white/2 border border-white/6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-neutral-500">
            <VolumeX className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">
            No se encontraron sonidos con ese criterio
          </h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Prueba a buscar con otra etiqueta o usa el botón de "Subir & Recortar" para añadir nuevos clips.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedSounds.map((sound) => {
            const isPlaying = currentPlayingId === sound.id;
            return (
              <div
                key={sound.id}
                className={`group relative rounded-2xl p-3.5 transition-all duration-200 border ${
                  isPlaying
                    ? 'bg-indigo-950/30 border-indigo-500/50 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                    : 'bg-[#13151f]/80 hover:bg-[#181a27] border-white/8 hover:border-white/15'
                }`}
              >
                {/* Top Row: Cover, Info & Play button */}
                <div className="flex items-start gap-3">
                  {/* Cover Image / Meme Avatar */}
                  <div
                    onClick={() => (isPlaying ? onStopSound() : onPlaySound(sound))}
                    className="relative w-14 h-14 rounded-xl bg-neutral-900 border border-white/10 overflow-hidden shrink-0 cursor-pointer group-hover:scale-105 transition-transform flex items-center justify-center text-2xl shadow-inner"
                  >
                    {sound.coverImage && sound.coverImage.startsWith('/') ? (
                      <img
                        src={sound.coverImage}
                        alt={sound.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{sound.coverImage || '🔊'}</span>
                    )}

                    {/* Play/Pause Overlay */}
                    <div
                      className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                        isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6 text-white fill-current animate-pulse" />
                      ) : (
                        <Play className="w-6 h-6 text-white fill-current ml-0.5" />
                      )}
                    </div>
                  </div>

                  {/* Title & Metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3
                        onClick={() => (isPlaying ? onStopSound() : onPlaySound(sound))}
                        className="text-xs font-semibold text-white truncate cursor-pointer hover:text-indigo-300 transition-colors"
                        title={sound.title}
                      >
                        {sound.title}
                      </h3>
                      {sound.hotkey && (
                        <kbd className="text-[10px] font-mono text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-1.5 py-0.2 rounded shrink-0">
                          {sound.hotkey}
                        </kbd>
                      )}
                    </div>

                    {/* Metadata line without pills */}
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-1 truncate">
                      <span>{sound.folder || sound.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{sound.duration}s</span>
                      {sound.playCount > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="flex items-center gap-0.5 text-neutral-500">
                            <Flame className="w-3 h-3 text-amber-500/70" />
                            {sound.playCount}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Tags preview */}
                    <div className="text-[10px] text-neutral-500 truncate mt-1">
                      {sound.tags.slice(0, 3).map((t) => `#${t}`).join(' ')}
                    </div>
                  </div>
                </div>

                {/* Animated Mini Waveform Preview */}
                <div
                  onClick={() => (isPlaying ? onStopSound() : onPlaySound(sound))}
                  className="mt-3 h-7 rounded-lg bg-black/30 border border-white/6 flex items-center gap-0.5 px-2 cursor-pointer overflow-hidden relative"
                >
                  {(sound.waveformPeaks || [0.2, 0.5, 0.8, 0.4, 0.9, 0.3, 0.6, 0.2]).slice(0, 32).map((peak, idx) => {
                    const isPassed = isPlaying && (idx / 32) <= playbackProgress;
                    return (
                      <div
                        key={idx}
                        style={{ height: `${Math.max(15, peak * 100)}%` }}
                        className={`flex-1 rounded-full transition-colors duration-150 ${
                          isPassed
                            ? 'bg-indigo-400'
                            : isPlaying
                            ? 'bg-indigo-600/40 animate-pulse'
                            : 'bg-white/20 group-hover:bg-white/30'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Card Action Footer */}
                <div className="mt-3 pt-2.5 border-t border-white/6 flex items-center justify-between text-neutral-400 text-xs">
                  {/* Open in Folder button (Requested by user) */}
                  <button
                    onClick={() => onOpenFileLocation(sound)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] text-neutral-300 hover:text-white hover:bg-white/8 transition-colors"
                    title="Abrir carpeta local con el sonido preseleccionado"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Abrir en Carpeta</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Trimmer Shortcut */}
                    <button
                      onClick={() => onOpenTrimmerForSound(sound)}
                      className="p-1.5 rounded-lg hover:text-indigo-400 hover:bg-white/8 transition-colors"
                      title="Editar o volver a recortar este sonido"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                    </button>

                    {/* Favorite Toggle */}
                    <button
                      onClick={() => onToggleFavorite(sound.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        sound.favorite
                          ? 'text-amber-400 hover:text-amber-300'
                          : 'hover:text-amber-400 hover:bg-white/8'
                      }`}
                      title={sound.favorite ? 'Quitar de favoritos' : 'Marcar favorito'}
                    >
                      <Star className={`w-3.5 h-3.5 ${sound.favorite ? 'fill-current' : ''}`} />
                    </button>

                    {/* Delete Sound */}
                    <button
                      onClick={() => onDeleteSound(sound.id)}
                      className="p-1.5 rounded-lg hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Eliminar sonido"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* COMPACT LIST VIEW */
        <div className="rounded-2xl border border-white/8 bg-[#13151f]/80 overflow-hidden divide-y divide-white/6">
          {sortedSounds.map((sound) => {
            const isPlaying = currentPlayingId === sound.id;
            return (
              <div
                key={sound.id}
                className={`flex items-center justify-between gap-4 p-3 transition-colors ${
                  isPlaying ? 'bg-indigo-950/30' : 'hover:bg-white/4'
                }`}
              >
                {/* Left: Play button, Cover, Title */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => (isPlaying ? onStopSound() : onPlaySound(sound))}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isPlaying
                        ? 'bg-amber-500 text-black'
                        : 'bg-white/8 hover:bg-indigo-600 text-white'
                    }`}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>

                  <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center text-sm">
                    {sound.coverImage && sound.coverImage.startsWith('/') ? (
                      <img src={sound.coverImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{sound.coverImage || '🔊'}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-white truncate block">
                      {sound.title}
                    </span>
                    <span className="text-[11px] text-neutral-400 truncate">
                      {sound.folder || sound.category} · {sound.tags.slice(0, 2).join(', ')}
                    </span>
                  </div>
                </div>

                {/* Right: Duration, Abrir Carpeta, Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono text-neutral-400">
                    {sound.duration}s
                  </span>

                  <button
                    onClick={() => onOpenFileLocation(sound)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-[11px] text-neutral-300 hover:text-white transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Abrir Carpeta</span>
                  </button>

                  <button
                    onClick={() => onOpenTrimmerForSound(sound)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/8"
                    title="Recortar"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onToggleFavorite(sound.id)}
                    className={`p-1.5 rounded-lg ${
                      sound.favorite ? 'text-amber-400' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${sound.favorite ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    onClick={() => onDeleteSound(sound.id)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
