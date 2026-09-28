import { useEffect, useRef, useState } from 'react';
import { Download, Mic, Minus, Pause, Play, Plus, RotateCcw, Save, Square, Trash2 } from 'lucide-react';
import type { ScriptBeat } from '../types';
import { WaveformTrimmer } from './WaveformTrimmer';
import { MicrophoneSelector } from './MicrophoneSelector';
import { bufferToWaveBlob, decodeAudioBlob, getAudioContext, sliceAndProcessAudioBuffer } from '../utils/audioEngine';
import { deleteScriptRecording, getScriptRecordingAudio, listScriptRecordings, saveEditedRecording, saveScriptRecording, type RecordingEdit, type ScriptRecording } from '../utils/scriptRecordings';
import { loadMicrophoneId, saveMicrophoneId } from '../utils/microphonePreference';
import { extractNarration } from '../utils/scriptNarration';

interface Props { scripts: ScriptBeat[] }

const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
const fileName = (title: string, id: string) => `${title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '').slice(0, 55) || 'guion'}-${id.slice(-8)}.wav`;

export function RecordingStudio({ scripts }: Props) {
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [takes, setTakes] = useState<ScriptRecording[]>([]);
  const [takeId, setTakeId] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(0);
  const [gain, setGain] = useState(1);
  const [normalize, setNormalize] = useState(true);
  const [fadeIn, setFadeIn] = useState(0.05);
  const [fadeOut, setFadeOut] = useState(0.15);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingCapture, setPendingCapture] = useState<{ scriptId: string; audio: Blob } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [prompterZoom, setPrompterZoom] = useState(150);
  const [speed, setSpeed] = useState(25);
  const [microphoneId, setMicrophoneId] = useState(loadMicrophoneId);
  const [microphoneRefresh, setMicrophoneRefresh] = useState(0);
  const [scrolling, setScrolling] = useState(false);
  const prompterRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  const loadNumber = useRef(0);
  const startTime = useRef(0);
  const previewRef = useRef<string | null>(null);
  const selectedScript = scripts.find((script) => script.id === scriptId) || null;
  const narration = selectedScript ? extractNarration(selectedScript.content) : '';
  const selectedTake = takes.find((take) => take.id === takeId) || null;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  useEffect(() => {
    if (!scripts.some((script) => script.id === scriptId)) setScriptId(scripts[0]?.id || null);
  }, [scripts, scriptId]);

  useEffect(() => {
    if (!scriptId) { setTakes([]); return; }
    let active = true;
    setTakes([]); setTakeId(null); setAudioBuffer(null); setError(null);
    void listScriptRecordings(scriptId).then((items) => { if (active) setTakes(items); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las tomas'); });
    return () => { active = false; };
  }, [scriptId]);

  useEffect(() => {
    if (!takeId || !scriptId) return;
    const current = ++loadNumber.current;
    setAudioBuffer(null); setNotice(''); clearPreview();
    void getScriptRecordingAudio(scriptId, takeId).then(decodeAudioBlob).then((buffer) => {
      if (current !== loadNumber.current) return;
      const edit = takes.find((take) => take.id === takeId)?.edit;
      setAudioBuffer(buffer); setStartSec(edit?.startSec ?? 0); setEndSec(Math.min(edit?.endSec ?? buffer.duration, buffer.duration));
      setGain(edit?.gain ?? 1); setNormalize(edit?.normalize ?? true); setFadeIn(edit?.fadeIn ?? 0.05); setFadeOut(edit?.fadeOut ?? 0.15);
    }).catch((cause) => {
      if (current === loadNumber.current) setError(cause instanceof Error ? cause.message : 'No se pudo abrir la toma');
    });
    return () => { loadNumber.current++; };
  }, [scriptId, takeId]);

  useEffect(() => {
    if (!scrolling) return;
    let frame = 0;
    let last: number | null = null;
    let position = prompterRef.current?.scrollTop ?? 0;
    let renderedPosition = position;
    const step = (time: number) => {
      const prompter = prompterRef.current;
      if (last !== null && prompter) {
        // Keep fractional pixels between frames: scrollTop may round each write to an integer.
        if (Math.abs(prompter.scrollTop - renderedPosition) > 2) position = prompter.scrollTop;
        position += Math.min((time - last) / 1000, 0.1) * speed;
        prompter.scrollTop = position;
        renderedPosition = prompter.scrollTop;
        if (prompter.scrollHeight > prompter.clientHeight &&
            prompter.scrollTop >= prompter.scrollHeight - prompter.clientHeight - 2) {
          setScrolling(false);
          return;
        }
      }
      last = time;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [scrolling, speed]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startTime.current) / 1000)), 500);
    return () => window.clearInterval(timer);
  }, [recording]);

  function clearPreview() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreviewUrl(null);
  }

  function changeScript(id: string) {
    if (recording || preparing || saving || pendingCapture) return;
    setScrolling(false); clearPreview(); setScriptId(id);
    if (prompterRef.current) prompterRef.current.scrollTop = 0;
  }

  async function startRecording() {
    if (!scriptId || recording || preparing || saving || pendingCapture) return;
    setError(null); setNotice('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Este navegador no permite grabar con el micrófono. Usa una conexión local o segura y un navegador compatible.');
      return;
    }
    setPreparing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        echoCancellation: true, noiseSuppression: true,
        ...(microphoneId ? { deviceId: { exact: microphoneId } } : {}),
      } });
      if (!mountedRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      setMicrophoneRefresh((value) => value + 1);
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm']
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];
      const destinationScriptId = scriptId;
      streamRef.current = stream; recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => { if (mountedRef.current) setError('Se interrumpió la grabación'); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null; recorderRef.current = null;
        if (mountedRef.current) { setRecording(false); setSaving(true); }
        try {
          const audio = new Blob(chunks, { type: recorder.mimeType.split(';')[0] || 'audio/webm' });
          if (!audio.size) throw new Error('La grabación está vacía');
          if (mountedRef.current) setPendingCapture({ scriptId: destinationScriptId, audio });
          const saved = await saveScriptRecording(destinationScriptId, audio);
          if (mountedRef.current && destinationScriptId === scriptId) {
            setPendingCapture(null);
            setTakes((current) => [saved, ...current]); setTakeId(saved.id);
            setNotice('Toma guardada y vinculada al guión');
          }
        } catch (cause) {
          if (mountedRef.current) setError(cause instanceof Error ? cause.message : 'No se pudo guardar la grabación');
        } finally { if (mountedRef.current) setSaving(false); }
      };
      recorder.start(1000); startTime.current = Date.now(); setElapsed(0); setRecording(true);
    } catch (cause) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setError(cause instanceof Error ? cause.message : 'No se pudo acceder al micrófono');
    } finally { if (mountedRef.current) setPreparing(false); }
  }

  async function retryCapture() {
    if (!pendingCapture || saving) return;
    setSaving(true); setError(null);
    try {
      const saved = await saveScriptRecording(pendingCapture.scriptId, pendingCapture.audio);
      setTakes((current) => [saved, ...current]); setTakeId(saved.id);
      setPendingCapture(null); setNotice('Toma guardada y vinculada al guión');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar la grabación'); }
    finally { setSaving(false); }
  }

  function downloadPending() {
    if (!pendingCapture) return;
    const extension = pendingCapture.audio.type === 'audio/mp4' ? 'm4a' : pendingCapture.audio.type === 'audio/ogg' ? 'ogg' : 'webm';
    const url = URL.createObjectURL(pendingCapture.audio);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `grabacion-sin-guardar.${extension}`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function processedAudio(): Blob {
    if (!audioBuffer) throw new Error('Selecciona una toma');
    const result = sliceAndProcessAudioBuffer(getAudioContext(), audioBuffer, {
      startSec, endSec, gainMultiplier: gain, normalize, fadeInSec: fadeIn, fadeOutSec: fadeOut,
    });
    return bufferToWaveBlob(result);
  }

  function currentEdit(): RecordingEdit { return { startSec, endSec, gain, normalize, fadeIn, fadeOut }; }

  function preview() {
    try {
      const url = URL.createObjectURL(processedAudio());
      clearPreview(); previewRef.current = url; setPreviewUrl(url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo preparar la escucha'); }
  }

  async function saveEdit() {
    if (!scriptId || !takeId || !audioBuffer || saving) return;
    setSaving(true); setError(null);
    try {
      const saved = await saveEditedRecording(scriptId, takeId, processedAudio(), currentEdit());
      setTakes((current) => current.map((take) => take.id === saved.id ? saved : take));
      setNotice('Edición guardada. Puedes volver a esta toma cuando quieras.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar la edición'); }
    finally { setSaving(false); }
  }

  function download() {
    if (!selectedScript || !takeId || !audioBuffer) return;
    try {
      const url = URL.createObjectURL(processedAudio());
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = fileName(selectedScript.title, takeId);
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo descargar la toma'); }
  }

  async function removeTake() {
    if (!scriptId || !takeId || !window.confirm('¿Eliminar esta toma y sus archivos de audio?')) return;
    setSaving(true); setError(null);
    try {
      await deleteScriptRecording(scriptId, takeId);
      setTakes((current) => current.filter((take) => take.id !== takeId));
      setTakeId(null); setAudioBuffer(null); clearPreview(); setNotice('Toma eliminada');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo eliminar la toma'); }
    finally { setSaving(false); }
  }

  return <div className="grid h-full min-h-[650px] gap-4 xl:grid-cols-[230px_minmax(0,1fr)]">
    <aside className="min-h-48 rounded-2xl border border-white/10 bg-[#141624] p-4 xl:overflow-y-auto">
      <h2 className="mb-2 text-sm font-semibold text-white">Guiones</h2>
      <p className="mb-4 text-xs text-neutral-400">Elige el texto que vas a grabar.</p>
      {scripts.length === 0 && <p className="text-sm text-neutral-400">Crea primero un guión en «Guiones & Hooks».</p>}
      <div className="space-y-1">{[...scripts].sort((a, b) => b.updatedAt - a.updatedAt).map((script) =>
        <button key={script.id} onClick={() => changeScript(script.id)} disabled={recording || preparing || saving || Boolean(pendingCapture)} aria-current={scriptId === script.id ? 'true' : undefined}
          className={`w-full rounded-xl border p-3 text-left text-sm disabled:opacity-50 ${scriptId === script.id ? 'border-indigo-500/50 bg-indigo-500/15 text-white' : 'border-transparent text-neutral-300 hover:bg-white/5'}`}>
          <span className="block truncate font-medium">{script.title}</span><span className="mt-1 block text-xs text-neutral-500">{script.content ? 'Listo para leer' : 'Sin contenido'}</span>
        </button>)}</div>
    </aside>
    <div className="min-w-0 min-h-0 overflow-y-auto space-y-4">
      {!selectedScript ? <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-[#141624] text-neutral-400">Selecciona un guión para empezar</div> : <>
        <section className="rounded-2xl border border-white/10 bg-[#141624] p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="mr-auto"><h1 className="text-lg font-semibold text-white">Teleprónter · {selectedScript.title}</h1><p className="text-xs text-neutral-400">Desplázate a mano o activa el avance automático.</p></div>
            <button onClick={() => setScrolling(!scrolling)} disabled={!narration} aria-label={scrolling ? 'Pausar teleprónter' : 'Iniciar teleprónter'} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs text-white disabled:opacity-40">{scrolling ? <Pause size={14} /> : <Play size={14} />}{scrolling ? 'Pausar' : 'Desplazar'}</button>
            <button onClick={() => { setScrolling(false); if (prompterRef.current) prompterRef.current.scrollTop = 0; }} aria-label="Volver al inicio" className="rounded-lg bg-white/10 p-2 text-neutral-200"><RotateCcw size={15} /></button>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-neutral-300">
            <div className="flex items-center gap-1"><span>Tamaño</span><button aria-label="Reducir texto" onClick={() => setPrompterZoom((value) => Math.max(80, value - 10))} className="rounded bg-white/10 p-1"><Minus size={13} /></button><output aria-label="Tamaño del teleprónter" className="w-9 text-center">{prompterZoom}%</output><button aria-label="Ampliar texto" onClick={() => setPrompterZoom((value) => Math.min(250, value + 10))} className="rounded bg-white/10 p-1"><Plus size={13} /></button></div>
            <label className="flex items-center gap-2">Velocidad <input aria-label="Velocidad del teleprónter" type="range" min="8" max="90" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />{speed} px/s</label>
          </div>
          <div ref={prompterRef} aria-label="Texto del teleprónter" className="h-[min(48vh,540px)] min-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-[#090b13] px-7 py-9 md:px-12 md:py-12">
            {narration
              ? <div className="mx-auto max-w-[45ch] whitespace-pre-wrap break-words text-center leading-[1.8] text-white" style={{ fontSize: `${24 * prompterZoom / 100}px` }}>{narration}</div>
              : <p className="text-center text-sm text-neutral-400">Este guión no tiene bloques [NARRADOR]...[/NARRADOR]. Añádelos en Guiones &amp; Hooks para leerlo aquí.</p>}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="w-full"><MicrophoneSelector value={microphoneId} onChange={(id) => { setMicrophoneId(id); saveMicrophoneId(id); }}
              disabled={recording || preparing || saving} refreshKey={microphoneRefresh} /></div>
            {recording ? <button onClick={() => { if (recorderRef.current?.state === 'recording') recorderRef.current.stop(); }} className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white"><Square size={16} /> Detener · {formatTime(elapsed)}</button>
              : <button onClick={startRecording} disabled={preparing || saving || Boolean(pendingCapture) || !selectedScript.content.trim()} className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"><Mic size={17} /> {preparing ? 'Preparando micrófono…' : 'Grabar voz'}</button>}
            <span className="text-xs text-neutral-400">{recording ? 'Grabando desde el micrófono' : saving ? 'Guardando audio…' : 'Cada grabación se guarda como una toma de este guión.'}</span>
          </div>
        </section>
        <section className="rounded-2xl border border-white/10 bg-[#141624] p-4 md:p-6">
          <h2 className="text-base font-semibold text-white">Tomas y edición</h2>
          <p className="mt-1 text-xs text-neutral-400">Elige una toma, ajusta el corte y el sonido, y descárgala en WAV.</p>
          {error && <p role="alert" className="mt-3 rounded-lg bg-rose-500/10 p-2 text-sm text-rose-300">{error}</p>}
          {pendingCapture && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200"><span>La toma sigue en memoria, pero aún no se ha guardado.</span><button onClick={retryCapture} disabled={saving} className="rounded bg-amber-500/20 px-2 py-1">Reintentar guardado</button><button onClick={downloadPending} className="rounded bg-amber-500/20 px-2 py-1">Descargar original</button></div>}
          {notice && <p role="status" className="mt-3 text-sm text-emerald-300">{notice}</p>}
          <div aria-label="Tomas grabadas" className="my-4 flex flex-wrap gap-2">{takes.map((take, index) => <button key={take.id} onClick={() => setTakeId(take.id)} disabled={recording || saving}
            className={`rounded-xl border px-3 py-2 text-xs disabled:opacity-50 ${take.id === takeId ? 'border-indigo-500 bg-indigo-500/20 text-white' : 'border-white/10 text-neutral-300'}`}>
            Toma {takes.length - index} · {new Date(take.createdAt).toLocaleString('es')}{take.editedFile ? ' · Editada' : ''}
          </button>)}</div>
          {!takes.length && <p className="text-sm text-neutral-500">Todavía no hay tomas para este guión.</p>}
          {selectedTake && !audioBuffer && <p className="text-sm text-neutral-400">Cargando audio…</p>}
          {selectedTake && audioBuffer && <div className="space-y-4">
            <WaveformTrimmer key={selectedTake.id} audioBuffer={audioBuffer} startSec={startSec} endSec={endSec} onRangeChange={(start, end) => { setStartSec(start); setEndSec(end); clearPreview(); }} />
            <div className="flex flex-wrap gap-4 text-xs text-neutral-300">
              <label className="flex items-center gap-2">Nivel <input aria-label="Nivel de voz" type="range" min="0.25" max="2" step="0.05" value={gain} onChange={(event) => { setGain(Number(event.target.value)); clearPreview(); }} />{gain.toFixed(2)}×</label>
              <label className="flex items-center gap-2"><input aria-label="Normalizar voz" type="checkbox" checked={normalize} onChange={(event) => { setNormalize(event.target.checked); clearPreview(); }} /> Normalizar volumen</label>
              <label className="flex items-center gap-2">Fundido entrada <input aria-label="Fundido de entrada" type="number" min="0" max="3" step="0.05" value={fadeIn} onChange={(event) => { setFadeIn(Number(event.target.value)); clearPreview(); }} className="w-16 rounded bg-black/30 p-1" />s</label>
              <label className="flex items-center gap-2">Fundido salida <input aria-label="Fundido de salida" type="number" min="0" max="3" step="0.05" value={fadeOut} onChange={(event) => { setFadeOut(Number(event.target.value)); clearPreview(); }} className="w-16 rounded bg-black/30 p-1" />s</label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={preview} className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white">Escuchar edición</button>
              <button onClick={saveEdit} disabled={saving} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs text-white disabled:opacity-40"><Save size={14} /> Guardar edición</button>
              <button onClick={download} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs text-white"><Download size={14} /> Descargar WAV</button>
              <button onClick={removeTake} disabled={saving} className="ml-auto flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs text-rose-300 disabled:opacity-40"><Trash2 size={14} /> Eliminar toma</button>
            </div>
            {previewUrl && <audio aria-label="Vista previa de la edición" src={previewUrl} controls className="w-full" />}
          </div>}
        </section>
      </>}
    </div>
  </div>;
}
