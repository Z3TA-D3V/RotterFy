import { useEffect, useRef, useState } from 'react';
import { Download, Music2, Video, X } from 'lucide-react';
import { cancelDownload, downloadSavedFile, listDownloads, startDownload, type DownloadJob } from '../utils/downloads';

interface Props { onCompleted: () => Promise<void>; categories: string[] }

const pendingKey = 'rotvault_browser_downloads_v1';
function loadPending(): Set<string> {
  try { return new Set(JSON.parse(sessionStorage.getItem(pendingKey) || '[]')); }
  catch { return new Set(); }
}

const labels: Record<DownloadJob['state'], string> = {
  checking: 'Consultando el vídeo', downloading: 'Descargando', saving: 'Guardando en la biblioteca',
  done: 'Guardado', error: 'Error', cancelled: 'Cancelado',
};

export function DownloadHub({ onCompleted, categories }: Props) {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<'video' | 'audio'>('video');
  const [category, setCategory] = useState('b-roll');
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const completed = useRef(new Set<string>());
  const pendingBrowser = useRef(loadPending());

  const savePending = () => {
    try { sessionStorage.setItem(pendingKey, JSON.stringify([...pendingBrowser.current])); }
    catch { /* The active tab still keeps its pending IDs in memory. */ }
  };

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const next = await listDownloads();
        if (!active) return;
        setJobs(next);
        for (const job of next) {
          if (job.state === 'done' && !completed.current.has(job.id)) {
            completed.current.add(job.id);
            void onCompleted().catch((cause) => setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la biblioteca'));
          }
          if (job.state === 'done' && pendingBrowser.current.has(job.id)) {
            pendingBrowser.current.delete(job.id);
            savePending();
            downloadSavedFile(job.id);
          }
          if (['error', 'cancelled'].includes(job.state) && pendingBrowser.current.delete(job.id)) savePending();
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron consultar las descargas');
      }
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [onCompleted]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !url.trim()) return;
    setBusy(true); setError('');
    try {
      const job = await startDownload(url.trim(), mode, mode === 'video' ? category.trim() : undefined);
      pendingBrowser.current.add(job.id);
      savePending();
      setJobs((previous) => [job, ...previous]);
      setUrl('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo iniciar la descarga'); }
    finally { setBusy(false); }
  };

  const activeJob = jobs.some((job) => ['checking', 'downloading', 'saving'].includes(job.state));

  return <section className="mx-auto max-w-4xl space-y-5">
    <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-white"><Download size={21} className="text-indigo-400" /> Descargar de YouTube</h1>
      <p className="mt-2 text-sm text-neutral-400">Pega la URL de un vídeo. La API ejecuta yt-dlp en la máquina donde está instalada y guarda el resultado en RotVault.</p>
    </div>

    <form onSubmit={submit} className="space-y-4 rounded-3xl border border-white/10 bg-[#141624] p-5">
      <label className="block text-sm text-neutral-200">URL del vídeo
        <input type="url" required value={url} onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=..." className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500" />
      </label>
      <div role="group" aria-label="Tipo de descarga" className="flex gap-2">
        <button type="button" onClick={() => setMode('video')} aria-pressed={mode === 'video'} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm ${mode === 'video' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-neutral-300'}`}><Video size={16} /> Vídeo MP4</button>
        <button type="button" onClick={() => setMode('audio')} aria-pressed={mode === 'audio'} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm ${mode === 'audio' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-neutral-300'}`}><Music2 size={16} /> Solo audio WAV</button>
      </div>
      {mode === 'video' && <label className="block text-sm text-neutral-200">Categoría del vídeo
        <input list="download-video-categories" maxLength={40} value={category} onChange={(event) => setCategory(event.target.value)}
          placeholder="Elige o escribe una categoría" className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2 text-sm text-white" />
        <datalist id="download-video-categories">{categories.map((item) => <option key={item} value={item} />)}</datalist>
      </label>}
      <p className="text-xs text-neutral-400">El vídeo aparecerá en B-Roll y el audio en la Librería de Sonidos. Se procesa una descarga cada vez.</p>
      <button type="submit" disabled={busy || activeJob || !url.trim() || (mode === 'video' && !category.trim())} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Iniciando…' : 'Descargar'}</button>
    </form>

    {error && <p role="alert" className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
    <div className="space-y-3" aria-label="Descargas">
      {jobs.map((job) => <article key={job.id} className="rounded-2xl border border-white/10 bg-[#141624] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><h2 className="truncate text-sm font-medium text-white">{job.title || job.url}</h2>
            <p className="mt-1 text-xs text-neutral-400">{job.mode === 'video' ? 'Vídeo MP4' : 'Audio WAV'} · {labels[job.state]}</p></div>
          {['checking', 'downloading'].includes(job.state) && <button type="button" aria-label="Cancelar descarga" title="Cancelar descarga" onClick={async () => {
            try { await cancelDownload(job.id); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cancelar'); }
          }} className="rounded-lg p-1 text-neutral-400 hover:text-rose-300"><X size={18} /></button>}
        </div>
        {['checking', 'downloading', 'saving'].includes(job.state) && <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={job.progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-indigo-500 transition-all" style={{ width: `${job.progress}%` }} /></div>}
        {job.error && <p className="mt-2 text-xs text-rose-300">{job.error}</p>}
        {job.state === 'done' && <button type="button" onClick={() => downloadSavedFile(job.id)} className="mt-3 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-indigo-200 hover:bg-white/15">Descargar en Chrome</button>}
        {job.logs.length > 0 && <details className="mt-2 text-xs text-neutral-400"><summary className="cursor-pointer">Actividad de yt-dlp</summary><pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3">{job.logs.join('\n')}</pre></details>}
      </article>)}
    </div>
  </section>;
}
