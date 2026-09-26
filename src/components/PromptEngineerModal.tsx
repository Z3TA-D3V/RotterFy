import React, { useState } from 'react';
import { Sparkles, Copy, Check, Terminal, Code2, BookOpen, Layers, X } from 'lucide-react';
import { REVERSE_ENGINEERED_PROMPT_ES } from '../utils/promptGenerator';

interface PromptEngineerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PromptEngineerModal: React.FC<PromptEngineerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'prompt' | 'angular' | 'workflow'>('prompt');

  if (!isOpen) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(REVERSE_ENGINEERED_PROMPT_ES);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const angularArchitectureSnippet = `// Arquitectura sugerida en Angular 18/19 con Signals & Standalone:
// 1. AudioEngineService (Web Audio API singleton + OfflineAudioContext)
@Injectable({ providedIn: 'root' })
export class AudioEngineService {
  private ctx = new AudioContext();
  
  // Sintetizador nativo para presets
  async synthesizeSound(type: string): Promise<{ buffer: AudioBuffer; blob: Blob }> { ... }
  
  // Slicer no destructivo con fades y ganancia
  sliceBuffer(source: AudioBuffer, startSec: number, endSec: number, options: SliceOptions): AudioBuffer { ... }
  
  // Encoder WAV PCM 16-bit
  bufferToWavBlob(buffer: AudioBuffer): Blob { ... }
}

// 2. SoundStorageService (archivos WAV con servidor local y Signals)
@Injectable({ providedIn: 'root' })
export class SoundStorageService {
  sounds = signal<SoundItem[]>([]);
  activePlayingId = signal<string | null>(null);

  // Computado para sonidos favoritos y categorías
  favorites = computed(() => this.sounds().filter(s => s.favorite));
  
  async saveSound(sound: SoundItem, blob: Blob) { ... }
  async deleteSound(id: string) { ... }
}

// 3. WaveformTrimmerComponent (Canvas interactivo)
@Component({
  selector: 'app-waveform-trimmer',
  standalone: true,
  template: \`<canvas #waveformCanvas (mousedown)="onDragStart($event)"></canvas>\`
})
export class WaveformTrimmerComponent { ... }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-[#12141e] border border-white/12 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                Ingeniería Inversa: Prompt Maestro de Producción
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                  Optimizado para Angular & React
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                El prompt estructurado exacto para generar o extender esta aplicación en cualquier LLM o proyecto Angular.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subtabs */}
        <div className="px-6 pt-3 flex items-center justify-between border-b border-white/8 shrink-0 bg-white/2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('prompt')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeSubTab === 'prompt'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              Prompt Maestro (Markdown)
            </button>
            <button
              onClick={() => setActiveSubTab('angular')}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeSubTab === 'angular'
                  ? 'border-indigo-400 text-indigo-300'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              Estructura Angular 18/19
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '¡Copiado al Portapapeles!' : 'Copiar Prompt'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-neutral-300 leading-relaxed space-y-4">
          {activeSubTab === 'prompt' ? (
            <div className="bg-black/50 p-5 rounded-2xl border border-white/6 whitespace-pre-wrap select-all font-mono text-[11px] text-neutral-300">
              {REVERSE_ENGINEERED_PROMPT_ES}
            </div>
          ) : (
            <div className="bg-black/50 p-5 rounded-2xl border border-white/6 whitespace-pre-wrap font-mono text-[11px] text-indigo-300">
              {angularArchitectureSnippet}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/8 bg-[#0e1017] flex items-center justify-between text-xs text-neutral-400 shrink-0">
          <span>Diseñado específicamente para el perfil de programador Angular + Creador de contenido</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
