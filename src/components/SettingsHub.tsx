import type { SectionId, SectionVisibility } from '../utils/sectionVisibility';
import { useState } from 'react';
import { MicrophoneSelector } from './MicrophoneSelector';
import { loadMicrophoneId, saveMicrophoneId } from '../utils/microphonePreference';

interface Props {
  visibleSections: SectionVisibility;
  onToggleSection: (section: SectionId) => void;
  onReset: () => void;
}

const sections: { id: SectionId; label: string; detail: string }[] = [
  { id: 'library', label: 'Librería de Sonidos', detail: 'Organiza y reproduce tus audios.' },
  { id: 'trimmer', label: 'Estudio de Recorte', detail: 'Corta y prepara clips de audio.' },
  { id: 'soundboard', label: 'Soundboard en Vivo', detail: 'Lanza sonidos mientras grabas.' },
  { id: 'scripts', label: 'Guiones & Hooks', detail: 'Escribe y mejora tus guiones.' },
  { id: 'recording', label: 'Teleprónter & Voz', detail: 'Lee, graba y edita tomas de voz.' },
  { id: 'stock', label: 'B-Roll & Vídeos', detail: 'Gestiona recursos visuales.' },
  { id: 'downloads', label: 'Descargas', detail: 'Descarga vídeo o audio de YouTube en la API local.' },
  { id: 'prompt', label: 'Ingeniería Inversa', detail: 'Muestra el acceso a Prompt Maestro.' },
];

export function SettingsHub({ visibleSections, onToggleSection, onReset }: Props) {
  const [microphoneId, setMicrophoneId] = useState(loadMicrophoneId);
  return <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#141624] p-5 md:p-7">
    <h1 className="text-xl font-semibold text-white">Opciones</h1>
    <p className="mt-1 text-sm text-neutral-400">Elige las secciones que quieres ver. Puedes volver aquí aunque ocultes todas.</p>
    <div className="mt-6 divide-y divide-white/10 rounded-xl border border-white/10">
      {sections.map((section) => <label key={section.id} className="flex cursor-pointer items-center justify-between gap-4 p-4 hover:bg-white/5">
        <span><span className="block text-sm font-medium text-white">{section.label}</span><span className="mt-1 block text-xs text-neutral-400">{section.detail}</span></span>
        <input type="checkbox" aria-label={`Mostrar ${section.label}`} checked={visibleSections[section.id]} onChange={() => onToggleSection(section.id)}
          className="h-5 w-5 shrink-0 accent-indigo-500" />
      </label>)}
    </div>
    <button onClick={onReset} className="mt-5 rounded-lg bg-white/10 px-3 py-2 text-xs text-neutral-200 hover:bg-white/15">Restablecer secciones</button>
    <div className="mt-8 border-t border-white/10 pt-6">
      <h2 className="text-base font-semibold text-white">Audio de grabación</h2>
      <p className="mb-4 mt-1 text-xs text-neutral-400">Elige el micrófono para tus próximas tomas de voz.</p>
      <MicrophoneSelector value={microphoneId} onChange={(id) => { setMicrophoneId(id); saveMicrophoneId(id); }} />
    </div>
  </section>;
}
