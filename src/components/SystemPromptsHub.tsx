import { useState } from 'react';
import { FilePlus2, Pencil, Save, Trash2 } from 'lucide-react';
import { CUSTOM_PRESET_NAME, loadMandatoryFormat, loadPromptPresets, saveMandatoryFormat, savePromptPresets } from '../utils/scriptPrompts';

interface EditorState {
  presets: Record<string, string>;
  selectedName: string | null;
  name: string;
  prompt: string;
}

function initialState(): EditorState {
  const presets = loadPromptPresets();
  const selectedName = Object.keys(presets)[0] || null;
  return { presets, selectedName, name: selectedName || '', prompt: selectedName ? presets[selectedName] : '' };
}

export function SystemPromptsHub() {
  const [state, setState] = useState(initialState);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mandatoryFormat, setMandatoryFormat] = useState(loadMandatoryFormat);
  const [formatDraft, setFormatDraft] = useState(mandatoryFormat);
  const [formatOpen, setFormatOpen] = useState(false);
  const [formatError, setFormatError] = useState('');
  const names = Object.keys(state.presets);
  const dirty = state.selectedName
    ? state.name !== state.selectedName || state.prompt !== state.presets[state.selectedName]
    : Boolean(state.name || state.prompt);

  function canLeaveDraft() {
    return !dirty || window.confirm('¿Descartar los cambios sin guardar?');
  }

  function choose(name: string) {
    if (!canLeaveDraft()) return;
    setState((current) => ({ ...current, selectedName: name, name, prompt: current.presets[name] }));
    setError(''); setNotice('');
  }

  function create() {
    if (!canLeaveDraft()) return;
    setState((current) => ({ ...current, selectedName: null, name: '', prompt: '' }));
    setError(''); setNotice('');
  }

  function save() {
    const name = state.name.trim();
    const prompt = state.prompt.trim();
    if (!name || !prompt) { setError('Escribe un nombre y un System Prompt antes de guardar.'); return; }
    if (name === CUSTOM_PRESET_NAME) { setError('Elige otro nombre: «Personalizado» está reservado para el editor rápido.'); return; }
    if (name !== state.selectedName && Object.hasOwn(state.presets, name)) {
      setError('Ya existe un estilo con ese nombre. Elige otro para no sobrescribirlo.');
      return;
    }
    try {
      const next = { ...state.presets };
      if (state.selectedName && name !== state.selectedName) delete next[state.selectedName];
      next[name] = prompt;
      savePromptPresets(next);
      setState({ presets: next, selectedName: name, name, prompt });
      setError(''); setNotice('Estilo guardado. Ya aparece en el asistente de Guiones.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el estilo.'); }
  }

  function remove() {
    if (!state.selectedName || !window.confirm(`¿Eliminar el estilo «${state.selectedName}»?`)) return;
    try {
      const next = { ...state.presets };
      delete next[state.selectedName];
      savePromptPresets(next);
      const selectedName = Object.keys(next)[0] || null;
      setState({ presets: next, selectedName, name: selectedName || '', prompt: selectedName ? next[selectedName] : '' });
      setError(''); setNotice('Estilo eliminado. Los guiones existentes conservan el texto que tenían guardado.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el estilo.'); }
  }

  function saveFormat() {
    try {
      const saved = saveMandatoryFormat(formatDraft);
      setMandatoryFormat(saved);
      setFormatDraft(saved);
      setFormatOpen(false);
      setFormatError('');
      setNotice('Formato obligatorio guardado para todos los estilos.');
    } catch (cause) { setFormatError(cause instanceof Error ? cause.message : 'No se pudo guardar el formato.'); }
  }

  return <div className="mx-auto grid min-h-[620px] max-w-7xl gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
    <aside className="min-w-0 rounded-2xl border border-white/10 bg-[#141624] p-4">
      <div className="flex items-center justify-between gap-2"><h1 className="text-base font-semibold text-white">System Prompts</h1>
        <button onClick={create} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-2 text-xs text-white hover:bg-indigo-500"><FilePlus2 size={14} /> Nuevo</button></div>
      <p className="mt-2 text-xs leading-5 text-neutral-400">Tus estilos de escritura para el asistente de Guiones.</p>
      <div aria-label="Estilos guardados" className="mt-4 space-y-1 overflow-y-auto lg:max-h-[70vh]">
        {names.map((name) => <button key={name} onClick={() => choose(name)} aria-current={state.selectedName === name ? 'true' : undefined}
          className={`w-full rounded-xl border p-3 text-left transition-colors ${state.selectedName === name ? 'border-indigo-500/60 bg-indigo-500/15' : 'border-transparent hover:bg-white/5'}`}>
          <span className="block truncate text-sm font-medium text-white">{name}</span>
          <span className="mt-1 block truncate text-xs text-neutral-500">{state.presets[name]}</span>
        </button>)}
        {!names.length && <p className="p-3 text-sm text-neutral-400">Todavía no hay estilos. Crea el primero.</p>}
      </div>
    </aside>
    <section className="min-w-0 rounded-2xl border border-white/10 bg-[#141624] p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-white">{state.selectedName ? 'Editar estilo' : 'Nuevo estilo'}</h2>
          <p className="mt-1 text-xs text-neutral-400">El texto se usará como System Prompt al seleccionar este estilo en un guión.</p></div>
        {dirty && <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">Cambios sin guardar</span>}
      </div>
      <div className="mt-6 space-y-4">
        <div role="note" className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-4 text-sm leading-6 text-indigo-100">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><strong className="block font-semibold">Formato obligatorio · Global</strong>
              <p className="mt-1 text-xs text-indigo-200/80">Se aplica a todos los estilos y se edita por separado. Mantén [NARRADOR] y [/NARRADOR] si quieres usar las vistas de narrador.</p></div>
            {!formatOpen && <button onClick={() => { setFormatDraft(mandatoryFormat); setFormatOpen(true); setFormatError(''); }}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-300/25 bg-indigo-400/15 px-3 py-1.5 text-xs font-medium text-indigo-100 hover:bg-indigo-400/25"><Pencil size={13} /> Editar formato obligatorio</button>}
          </div>
          {formatOpen ? <div className="mt-3 space-y-3">
            <label className="block text-xs text-indigo-100">Instrucciones globales de formato
              <textarea aria-label="Formato obligatorio" value={formatDraft} maxLength={4000} onChange={(event) => setFormatDraft(event.target.value)} rows={5}
                className="mt-1 block w-full resize-y rounded-lg border border-indigo-300/25 bg-black/30 p-3 text-sm leading-6 text-white outline-none focus:border-indigo-400" />
            </label>
            {formatError && <p role="alert" className="text-xs text-rose-300">{formatError}</p>}
            <div className="flex gap-2"><button onClick={saveFormat} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500">Guardar formato obligatorio</button>
              <button onClick={() => { setFormatDraft(mandatoryFormat); setFormatOpen(false); setFormatError(''); }} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-neutral-200">Cancelar</button></div>
          </div> : <p className="mt-3 whitespace-pre-wrap text-sm">{mandatoryFormat}</p>}
        </div>
        <label className="block text-xs text-neutral-400">Nombre del estilo
          <input aria-label="Nombre del estilo" value={state.name} onChange={(event) => setState({ ...state, name: event.target.value })}
            placeholder="Ej. Crítica de RPG" className="mt-1 block w-full rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-white outline-none focus:border-indigo-500" />
        </label>
        <label className="block text-xs text-neutral-400">System Prompt
          <textarea aria-label="Contenido del System Prompt" value={state.prompt} onChange={(event) => setState({ ...state, prompt: event.target.value })}
            placeholder="Describe el tono, la estructura y las reglas del guion…" className="mt-1 block min-h-[360px] w-full resize-y rounded-xl border border-white/10 bg-black/25 p-4 font-mono text-sm leading-6 text-white outline-none focus:border-indigo-500" />
        </label>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
      {notice && <p role="status" className="mt-4 text-sm text-emerald-300">{notice}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button onClick={save} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"><Save size={15} /> Guardar estilo</button>
        {state.selectedName && <button onClick={remove} className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-rose-300 hover:bg-white/15"><Trash2 size={15} /> Eliminar estilo</button>}
      </div>
      <p className="mt-6 border-t border-white/10 pt-4 text-xs leading-5 text-neutral-500">Los guiones existentes conservan su prompt actual. Selecciona un estilo actualizado en el asistente para aplicarlo a un guión.</p>
    </section>
  </div>;
}
