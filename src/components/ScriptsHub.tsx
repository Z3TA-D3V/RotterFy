import React, { useState } from 'react';
import { FileText, Plus, Play, Sparkles, Check, Trash2, Clock, Volume2 } from 'lucide-react';
import { ScriptBeat, SoundItem } from '../types';

interface ScriptsHubProps {
  scripts: ScriptBeat[];
  sounds: SoundItem[];
  onSaveScript: (script: ScriptBeat) => void;
  onDeleteScript: (id: string) => void;
  onPlaySoundById: (soundId: string) => void;
}

export const ScriptsHub: React.FC<ScriptsHubProps> = ({
  scripts,
  sounds,
  onSaveScript,
  onDeleteScript,
  onPlaySoundById,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<'hook' | 'development' | 'punchline' | 'cta'>('hook');
  const [selectedSoundId, setSelectedSoundId] = useState<string>('vine-boom');

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    const item: ScriptBeat = {
      id: `script-${Date.now()}`,
      title: newTitle,
      category: newCategory,
      content: newContent,
      associatedSoundId: selectedSoundId,
      status: 'idea',
      updatedAt: Date.now(),
    };
    onSaveScript(item);
    setNewTitle('');
    setNewContent('');
    setIsCreating(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-white/4 border border-white/8 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              Guiones, Hooks de Retención & Gags
              <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                Centro de Mando Extensible
              </span>
            </h2>
            <p className="text-xs text-neutral-400">
              Escribe tus ideas de videos y vincula los efectos de sonido brainrot exactamente en el segundo donde ocurre el gag.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nuevo Guión / Hook
        </button>
      </div>

      {/* Creation Form */}
      {isCreating && (
        <div className="p-5 rounded-3xl bg-[#141624] border border-white/12 shadow-2xl space-y-4 animate-fade-in">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Crear Nueva Idea de Video / Hook
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] text-neutral-400 mb-1">Título del Video o Concepto</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ej. Cuando usas un framework de JS que salió ayer"
                className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Efecto de Sonido Clave</label>
              <select
                value={selectedSoundId}
                onChange={(e) => setSelectedSoundId(e.target.value)}
                className="w-full h-9 px-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {sounds.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#12141e]">
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">
              Guión / Diálogo (escribe las acotaciones sonoras entre corchetes)
            </label>
            <textarea
              rows={3}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="«El senior cuando ve que borraste la base de datos...» [Vine Boom] «Pero recuerda que era el entorno de staging.»"
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setIsCreating(false)}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-neutral-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
            >
              Guardar Guión
            </button>
          </div>
        </div>
      )}

      {/* Scripts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scripts.map((script) => {
          const matchedSound = sounds.find((s) => s.id === script.associatedSoundId);
          return (
            <div
              key={script.id}
              className="rounded-3xl p-5 bg-[#13151f]/80 border border-white/8 hover:border-white/15 transition-all space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs font-bold text-white">{script.title}</h3>
                  <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md shrink-0">
                    {script.status}
                  </span>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed font-sans mt-2.5 bg-black/25 p-3 rounded-2xl border border-white/4">
                  {script.content}
                </p>
              </div>

              {/* Sound Cue Trigger Bar */}
              <div className="pt-2 border-t border-white/6 flex items-center justify-between">
                {matchedSound ? (
                  <button
                    onClick={() => onPlaySoundById(matchedSound.id)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 text-xs transition-colors group"
                  >
                    <Play className="w-3.5 h-3.5 fill-current group-hover:scale-110 transition-transform" />
                    <span>Sonar: {matchedSound.title}</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-neutral-500">Sin sonido asignado</span>
                )}

                <button
                  onClick={() => onDeleteScript(script.id)}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Eliminar guión"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
