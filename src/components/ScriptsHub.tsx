import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AlignLeft, Copy, Eye, FileText, Maximize2, Minimize2, Minus, PanelRightClose, PanelRightOpen, Pencil, Plus, Save, Send, Sparkles, Trash2 } from 'lucide-react';
import type { ScriptBeat, SoundItem } from '../types';
import { parseAssistantOutput, recoverScriptProposal, streamScriptChat } from '../utils/scriptChat';
import { CUSTOM_PRESET_NAME, JOSEJU_PROMPT, JOSEJU_PRESET_NAME, loadMandatoryFormat, loadPromptPresets, savePromptPresets } from '../utils/scriptPrompts';
import { extractNarration } from '../utils/scriptNarration';

interface Props {
  scripts: ScriptBeat[];
  sounds: SoundItem[];
  onSaveScript: (script: ScriptBeat) => Promise<void>;
  onDeleteScript: (id: string) => Promise<void>;
  onPlaySoundById: (soundId: string) => void;
  onSyncScript?: (script: ScriptBeat) => void;
}
const models = ['gpt-6-luna', 'gpt-6-sol', 'gpt-6-astra', 'o3-mini', 'o1'] as const;
const ScriptPreview = lazy(() => import('./ScriptPreview').then((module) => ({ default: module.ScriptPreview })));
const ZOOM_STORAGE_KEY = 'rotvault_script_zoom_v1';
const MIN_ZOOM = 60;
const MAX_ZOOM = 160;
function loadZoom() {
  const saved = Number(localStorage.getItem(ZOOM_STORAGE_KEY));
  return Number.isFinite(saved) && saved >= MIN_ZOOM && saved <= MAX_ZOOM ? saved : 90;
}
const dateText = (value: number) => new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(value);
const costText = (value: number) => `$${value.toFixed(5)}`;
const GENERIC_PROMPT = 'Eres un asistente de escritura para guiones sobre videojuegos. Ayuda a crear textos claros, originales y listos para grabar.';

function normalize(script: ScriptBeat): ScriptBeat {
  return { ...script, createdAt: script.createdAt || script.updatedAt || Date.now(),
    systemPromptUsed: script.systemPromptUsed || JOSEJU_PROMPT,
    reasoningEffort: script.reasoningEffort || 'low', model: script.model || 'gpt-6-luna',
    totalCost: script.totalCost || 0, chatHistory: script.chatHistory || [] };
}
function newScript(presets: Record<string, string>): ScriptBeat {
  const now = Date.now();
  return normalize({ id: `script-${crypto.randomUUID()}`, title: 'Nuevo guión', content: '', category: 'hook', status: 'idea',
    systemPromptUsed: presets[JOSEJU_PRESET_NAME] || Object.values(presets)[0] || GENERIC_PROMPT, createdAt: now, updatedAt: now });
}

export const ScriptsHub: React.FC<Props> = ({ scripts, sounds, onSaveScript, onDeleteScript, onPlaySoundById, onSyncScript }) => {
  const [draft, setDraft] = useState<ScriptBeat | null>(null);
  const [presets, setPresets] = useState(loadPromptPresets);
  const [mandatoryFormat] = useState(loadMandatoryFormat);
  const [selectedPreset, setSelectedPreset] = useState(JOSEJU_PRESET_NAME);
  const [promptOpen, setPromptOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [message, setMessage] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [proposal, setProposal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'edit' | 'narration'>('preview');
  const [isFocus, setIsFocus] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [zoom, setZoom] = useState(loadZoom);
  const promptSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => () => { if (promptSaveTimer.current) clearTimeout(promptSaveTimer.current); abortRef.current?.abort(); }, []);
  useEffect(() => { localStorage.setItem(ZOOM_STORAGE_KEY, String(zoom)); }, [zoom]);

  function select(script: ScriptBeat) {
    if (promptSaveTimer.current) clearTimeout(promptSaveTimer.current);
    abortRef.current?.abort();
    const next = normalize(script);
    setDraft(next);
    setSelectedPreset(Object.keys(presets).find((name) => presets[name] === next.systemPromptUsed) || 'Personalizado');
    setProposal(recoverScriptProposal(next)); setStreamText(''); setError(null); setMessage(''); setViewMode('preview');
  }
  function startNew() {
    if (promptSaveTimer.current) clearTimeout(promptSaveTimer.current);
    abortRef.current?.abort();
    setDraft(newScript(presets)); setProposal(null); setStreamText(''); setMessage('');
    setSelectedPreset(presets[JOSEJU_PRESET_NAME] ? JOSEJU_PRESET_NAME : Object.keys(presets)[0] || 'Personalizado'); setError(null); setViewMode('edit');
  }
  async function persist(script: ScriptBeat) {
    const updated = { ...script, updatedAt: Date.now() };
    await onSaveScript(updated);
    setDraft((current) => current?.id === updated.id ? { ...current, updatedAt: updated.updatedAt } : current);
    return updated;
  }
  async function saveCurrent() {
    if (!draft) return;
    setBusy(true); setError(null);
    try {
      const saved = await persist({ ...draft, content: proposal ?? draft.content });
      setDraft(saved); setProposal(null);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el guión'); }
    finally { setBusy(false); }
  }
  function updatePrompt(prompt: string, preset = 'Personalizado') {
    if (!draft) return;
    const next = { ...draft, systemPromptUsed: prompt };
    setDraft(next); setSelectedPreset(preset);
    if (promptSaveTimer.current) clearTimeout(promptSaveTimer.current);
    if (preset !== CUSTOM_PRESET_NAME) {
      void persist(next).catch((cause) => setError(cause instanceof Error ? cause.message : 'No se pudo guardar el estilo'));
      return;
    }
    promptSaveTimer.current = setTimeout(() => {
      if (draftRef.current?.id === next.id) void persist(draftRef.current).catch((cause) => setError(cause instanceof Error ? cause.message : 'No se pudo guardar el estilo'));
    }, 600);
  }
  function saveCurrentPreset() {
    if (!draft) return;
    const name = presetName.trim();
    const prompt = (draft.systemPromptUsed || '').trim();
    if (!name || !prompt) { setError('Escribe un nombre y un System Prompt para crear el estilo.'); return; }
    if (name === CUSTOM_PRESET_NAME) { setError('Elige otro nombre: «Personalizado» está reservado para editar.'); return; }
    if (Object.hasOwn(presets, name)) { setError('Ya existe un estilo con ese nombre. Edítalo en System Prompts.'); return; }
    try {
      const next = { ...presets, [name]: prompt };
      savePromptPresets(next);
      setPresets(next); setSelectedPreset(name); setPresetName(''); setError(null);
      if (promptSaveTimer.current) clearTimeout(promptSaveTimer.current);
      void persist(draft).catch((cause) => setError(cause instanceof Error ? cause.message : 'No se pudo guardar el estilo en el guión'));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el estilo.'); }
  }
  async function sendMessage() {
    if (!draft || !message.trim() || streaming) return;
    const visibleDraft = { ...draft, content: proposal ?? draft.content };
    setError(null); setStreaming(true); setStreamText(''); setProposal(null); setViewMode('preview');
    const text = message.trim();
    const controller = new AbortController(); abortRef.current = controller;
    try {
      if (promptSaveTimer.current) clearTimeout(promptSaveTimer.current);
      const saved = await persist(visibleDraft);
      setDraft(saved);
      const result = await streamScriptChat(saved, text, (raw) => {
        setStreamText(raw); setProposal(parseAssistantOutput(raw).script);
      }, controller.signal);
      onSyncScript?.(result.script);
      setDraft((current) => current?.id === saved.id ? {
        ...current, chatHistory: [...(current.chatHistory || []), result.user, result.assistant],
        totalCost: result.totalCost, updatedAt: Date.now(),
      } : current);
      setMessage('');
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo generar la respuesta');
    } finally { setStreaming(false); abortRef.current = null; }
  }
  async function applyProposal() {
    if (!draft || proposal === null || streaming) return;
    setBusy(true); setError(null);
    try { const updated = await persist({ ...draft, content: proposal }); setDraft(updated); setProposal(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo aplicar el guión'); }
    finally { setBusy(false); }
  }
  async function duplicate() {
    if (!draft) return;
    setBusy(true); setError(null);
    try {
      const copy = { ...draft, content: proposal ?? draft.content, id: `script-${crypto.randomUUID()}`, title: `${draft.title} (copia)`, createdAt: Date.now(), updatedAt: Date.now(), chatHistory: [], totalCost: 0 };
      await onSaveScript(copy); setDraft(copy); setProposal(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo duplicar el guión'); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!draft || !window.confirm(`¿Eliminar "${draft.title}"?`)) return;
    setBusy(true); setError(null);
    try { await onDeleteScript(draft.id); setDraft(null); setProposal(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo borrar el guión'); }
    finally { setBusy(false); }
  }

  const narration = draft ? extractNarration(proposal ?? draft.content) : '';
  return <div className={`grid h-full min-h-[620px] gap-3 xl:min-h-0 xl:grid-rows-1 ${isFocus && draft ? 'xl:grid-cols-1' : draft && assistantOpen && viewMode !== 'narration' ? 'xl:grid-cols-[190px_minmax(0,1fr)_280px]' : draft ? 'xl:grid-cols-[190px_minmax(0,1fr)]' : 'lg:grid-cols-[220px_minmax(0,1fr)]'}`}>
    {!isFocus && <aside className="min-w-0 min-h-[180px] max-h-[300px] rounded-2xl border border-white/10 bg-[#141624] p-3 flex flex-col xl:h-full xl:min-h-0 xl:max-h-none">
      <button onClick={startNew}
        className="w-full rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2 hover:bg-indigo-500"><Plus size={16} /> Nuevo Guión</button>
      <div className="mt-3 flex-1 overflow-y-auto space-y-1" aria-label="Lista de guiones">
        {[...scripts].sort((a, b) => b.updatedAt - a.updatedAt).map((script) => <button key={script.id} onClick={() => select(script)} aria-current={draft?.id === script.id ? 'true' : undefined}
          className={`w-full text-left rounded-xl border p-3 transition-colors ${draft?.id === script.id ? 'border-indigo-500/60 bg-indigo-500/15' : 'border-transparent hover:bg-white/5'}`}>
          <span className="flex items-center gap-2 text-sm text-white font-medium truncate">{draft?.id === script.id && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />} {script.title}</span>
          <span className="block mt-1 text-[11px] text-neutral-400">{dateText(script.updatedAt)}</span>
          <span className="block mt-1 text-xs text-neutral-500 truncate">{script.content || recoverScriptProposal(script) || 'Sin contenido'}</span>
        </button>)}
      </div>
    </aside>}

    <section className="min-w-0 min-h-[620px] rounded-2xl border border-white/10 bg-[#141624] p-4 md:p-5 flex flex-col gap-4 xl:h-full xl:min-h-0 xl:overflow-hidden">
      {!draft ? <div className="flex-1 min-h-80 flex flex-col items-center justify-center text-center gap-4">
        <FileText size={34} className="text-indigo-400" />
        <div><h2 className="text-lg font-semibold">Tus guiones, en un solo lugar</h2><p className="text-sm text-neutral-400">Selecciona un guión o empieza uno nuevo.</p></div>
        <button aria-label="Crear guión" onClick={startNew} className="rounded-full bg-indigo-600 p-4 hover:bg-indigo-500"><Plus size={24} /></button>
      </div> : <>
        {viewMode !== 'narration' && <div className="flex flex-wrap gap-2 items-center">
          <button onClick={saveCurrent} disabled={busy || streaming} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs flex items-center gap-1.5 disabled:opacity-50"><Save size={14} /> Guardar</button>
          <button onClick={duplicate} disabled={busy || streaming} className="rounded-lg bg-white/10 px-3 py-2 text-xs flex items-center gap-1.5 disabled:opacity-50"><Copy size={14} /> Duplicar</button>
          <button onClick={remove} disabled={busy || streaming} className="rounded-lg bg-white/10 px-3 py-2 text-xs text-rose-300 flex items-center gap-1.5 disabled:opacity-50"><Trash2 size={14} /> Eliminar</button>
          <button onClick={applyProposal} disabled={proposal === null || streaming || busy} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs flex items-center gap-1.5 disabled:opacity-50"><Sparkles size={14} /> Aplicar cambios de IA</button>
          {proposal !== null && <button onClick={() => setProposal(null)} disabled={streaming} className="rounded-lg bg-white/10 px-3 py-2 text-xs disabled:opacity-50">Descartar propuesta</button>}
          {!isFocus && !assistantOpen && <button onClick={() => setAssistantOpen(true)} aria-expanded={false}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-200 flex items-center gap-1.5 hover:bg-white/10">
            <PanelRightOpen size={14} /> Mostrar asistente
          </button>}
          <button onClick={() => setIsFocus(!isFocus)} className="ml-auto rounded-lg bg-white/10 px-3 py-2 text-xs flex items-center gap-1.5 hover:bg-white/15">
            {isFocus ? <Minimize2 size={14} /> : <Maximize2 size={14} />}{isFocus ? 'Salir de lectura' : 'Ampliar guión'}
          </button>
        </div>}
        {error && <p role="alert" className="rounded-lg bg-rose-500/10 p-2 text-xs text-rose-300">{error}</p>}
        {viewMode !== 'narration' && <label className="text-xs text-neutral-400">Título<input aria-label="Título" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          className="mt-1 block w-full rounded-xl border border-white/10 bg-black/25 p-3 text-base font-semibold text-white outline-none focus:border-indigo-500" /></label>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Modo del guión" className="flex rounded-xl border border-white/10 bg-black/20 p-1">
            <button role="tab" aria-selected={viewMode === 'preview'} onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ${viewMode === 'preview' ? 'bg-indigo-500/25 text-white' : 'text-neutral-400 hover:text-white'}`}><Eye size={14} /> Vista previa</button>
            <button role="tab" aria-selected={viewMode === 'edit'} onClick={() => setViewMode('edit')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ${viewMode === 'edit' ? 'bg-indigo-500/25 text-white' : 'text-neutral-400 hover:text-white'}`}><Pencil size={14} /> Editar Markdown</button>
            <button role="tab" aria-selected={viewMode === 'narration'} onClick={() => setViewMode('narration')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ${viewMode === 'narration' ? 'bg-indigo-500/25 text-white' : 'text-neutral-400 hover:text-white'}`}><AlignLeft size={14} /> Vista narrador</button>
          </div>
          <div role="group" aria-label="Zoom del guión" className="flex items-center rounded-xl border border-white/10 bg-black/20 p-1 text-xs text-neutral-300">
            <button aria-label="Alejar guión" title="Alejar guión" onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - 10))} disabled={zoom <= MIN_ZOOM}
              className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-35"><Minus size={14} /></button>
            <output aria-label="Zoom actual" className="min-w-10 text-center tabular-nums">{zoom}%</output>
            <button aria-label="Acercar guión" title="Acercar guión" onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + 10))} disabled={zoom >= MAX_ZOOM}
              className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-35"><Plus size={14} /></button>
          </div>
          </div>
          {viewMode === 'narration' && isFocus && <button onClick={() => setIsFocus(false)} className="rounded-lg bg-white/10 px-3 py-2 text-xs text-neutral-200 hover:bg-white/15">Salir de lectura</button>}
          {proposal !== null && viewMode !== 'narration' && <span className="text-xs text-emerald-300">Propuesta de IA pendiente de guardar{streaming ? ' · escribiendo…' : ''}</span>}
        </div>
        {viewMode === 'preview' ? <div className={`min-h-[500px] flex-1 overflow-y-auto rounded-2xl border bg-[#0e101a] px-5 py-7 md:px-8 md:py-9 xl:min-h-0 ${proposal !== null ? 'border-emerald-500/40' : 'border-white/10'}`}>
          <Suspense fallback={<p className="text-sm text-neutral-400">Preparando vista previa…</p>}>
            <ScriptPreview content={proposal ?? draft.content} zoom={zoom} />
          </Suspense>
        </div> : viewMode === 'narration' ? <div aria-label="Vista narrador" className="min-h-[500px] flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-[#0e101a] px-6 py-8 md:px-10 md:py-10 xl:min-h-0">
          {narration
            ? <div className="max-w-[65ch] whitespace-pre-wrap break-words text-left leading-[1.8] text-neutral-100" style={{ fontSize: `${24 * zoom / 100}px` }}>{narration}</div>
            : <p className="text-sm text-neutral-400">Este guión no tiene bloques [NARRADOR]...[/NARRADOR]. Añádelos en Editar Markdown para leerlo aquí.</p>}
        </div> : <label className="flex min-h-[500px] flex-1 flex-col text-xs text-neutral-400 xl:min-h-0">Guión (Markdown)
          <textarea aria-label="Guión (Markdown)" value={proposal ?? draft.content}
            onChange={(event) => proposal !== null ? setProposal(event.target.value) : setDraft({ ...draft, content: event.target.value })}
            placeholder="Escribe tu guión aquí..." style={{ fontSize: `${16 * zoom / 100}px`, lineHeight: 1.7 }}
            className={`mt-1 min-h-0 w-full flex-1 resize-none rounded-xl border bg-black/25 p-5 font-mono text-white outline-none focus:border-indigo-500 ${proposal !== null ? 'border-emerald-500/50' : 'border-white/10'}`} /></label>}
        {viewMode !== 'narration' && <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400"><span>Coste acumulado aprox.: {costText(draft.totalCost || 0)}</span>
          {draft.associatedSoundId && sounds.some((sound) => sound.id === draft.associatedSoundId) && <button className="text-indigo-300 hover:underline" onClick={() => onPlaySoundById(draft.associatedSoundId!)}>Reproducir sonido asociado</button>}</div>
        }
      </>}
    </section>

    {draft && !isFocus && assistantOpen && viewMode !== 'narration' && <aside className="min-w-0 min-h-[480px] rounded-2xl border border-white/10 bg-[#141624] p-4 flex flex-col gap-4 xl:h-full xl:min-h-0">
      <div className="space-y-3 border-b border-white/10 pb-4"><div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Asistente de IA</h2>
        <button aria-label="Colapsar asistente" title="Colapsar asistente" onClick={() => setAssistantOpen(false)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white"><PanelRightClose size={16} /></button></div>
        <label className="block text-xs text-neutral-400">Modelo<select aria-label="Modelo" value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value as ScriptBeat['model'] })}
          className="mt-1 w-full rounded-lg bg-[#242638] p-2 text-white">{models.map((model) => <option key={model} value={model}>{model}</option>)}</select></label>
        <label className="block text-xs text-neutral-400">Esfuerzo de razonamiento<select aria-label="Esfuerzo de razonamiento" value={draft.reasoningEffort} onChange={(event) => setDraft({ ...draft, reasoningEffort: event.target.value as ScriptBeat['reasoningEffort'] })}
          className="mt-1 w-full rounded-lg bg-[#242638] p-2 text-white">{['low', 'medium', 'high'].map((effort) => <option key={effort}>{effort}</option>)}</select></label>
        <button onClick={() => setPromptOpen(!promptOpen)} aria-expanded={promptOpen} className="text-left text-xs text-indigo-300 hover:underline">Estilo de IA / System Prompt</button>
        <p className="text-[11px] text-neutral-400">Formato [NARRADOR] obligatorio para todos los estilos.</p>
        {promptOpen && <div className="space-y-2"><select aria-label="Preset de estilo" value={selectedPreset} onChange={(event) => {
          const name = event.target.value;
          if (name === 'Personalizado') { setSelectedPreset('Personalizado'); setPresetName(''); }
          else if (presets[name]) updatePrompt(presets[name], name);
        }} className="w-full rounded-lg bg-[#242638] p-2 text-xs text-white">
          <option value="Personalizado">Personalizado</option>{Object.keys(presets).map((name) => <option key={name} value={name}>{name}</option>)}</select>
          {selectedPreset === 'Personalizado' && <p className="text-[11px] leading-4 text-neutral-400">Edita el texto de abajo y guárdalo con un nombre para crear un estilo nuevo.</p>}
          <textarea aria-label="System Prompt" value={draft.systemPromptUsed || ''} onChange={(event) => updatePrompt(event.target.value)} rows={8} className="w-full rounded-lg border border-white/10 bg-black/25 p-2 text-xs leading-5 text-white" />
          <div role="note" className="rounded-lg border border-indigo-400/20 bg-indigo-500/10 p-2 text-[11px] leading-4 text-indigo-200"><strong className="block font-semibold">Formato obligatorio · Global</strong>{mandatoryFormat}<span className="mt-1 block text-indigo-200/70">Puedes editarlo en la vista System Prompts.</span></div>
          <input aria-label="Nombre del preset" placeholder="Nombre del nuevo preset" value={presetName} onChange={(event) => setPresetName(event.target.value)} className="w-full rounded-lg bg-[#242638] p-2 text-xs text-white" />
          <button onClick={saveCurrentPreset} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs">Guardar preset</button>
        </div>}
      </div>
      <div className="flex-1 min-h-32 overflow-y-auto space-y-3" aria-label="Historial de chat">
        {(draft.chatHistory || []).map((entry, index) => { const parsed = entry.role === 'assistant' ? parseAssistantOutput(entry.content) : null;
          return <div key={`${entry.timestamp}-${index}`} className={`rounded-xl p-3 text-xs leading-5 ${entry.role === 'user' ? 'bg-indigo-500/15 ml-5' : 'bg-white/5 mr-5'}`}>
            <p className="font-semibold text-neutral-300 mb-1">{entry.role === 'user' ? 'Tú' : 'IA'}</p><p className="whitespace-pre-wrap text-neutral-100">{parsed?.chat || entry.content}</p>
            {parsed?.script !== null && parsed?.script !== undefined && <span className="block mt-1 text-emerald-300">Propuso cambios al guión</span>}
            {entry.role === 'assistant' && <span className="block mt-2 text-[10px] text-neutral-400">{entry.usage?.total_tokens ?? '—'} tokens · {entry.cost == null ? 'coste no disponible' : `${costText(entry.cost)} aprox.`}</span>}
          </div>; })}
        {streaming && <div className="rounded-xl bg-white/5 p-3 text-xs whitespace-pre-wrap">{parseAssistantOutput(streamText).chat || 'Pensando…'}</div>}
      </div>
      <div className="border-t border-white/10 pt-3 flex gap-2"><textarea aria-label="Mensaje para IA" rows={2} value={message} onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Pide ideas o cambios…" className="min-w-0 flex-1 resize-none rounded-lg bg-[#242638] p-2 text-xs text-white" />
        <button aria-label="Enviar mensaje" onClick={sendMessage} disabled={!message.trim() || streaming} className="self-end rounded-lg bg-indigo-600 p-2 disabled:opacity-50"><Send size={16} /></button></div>
    </aside>}
  </div>;
};
