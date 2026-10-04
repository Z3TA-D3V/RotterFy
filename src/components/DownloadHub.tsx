import { useEffect, useRef, useState } from 'react';
import { Download, Music2, Video, X } from 'lucide-react';
import { cancelDownload, downloadSavedFile, DownloadRequestError, listDownloads, retryDownload, startDownload,
  type DownloadJob, type VideoQuality } from '../utils/downloads';

interface Props { onCompleted: () => Promise<void>; categories: string[] }

const pendingKey = 'rotvault_browser_downloads_v1';
const maxSizeKey = 'rotvault_download_max_size_gb_v1';
function loadMaxSizeGb(): number {
  try {
    const saved = Number(localStorage.getItem(maxSizeKey));
    return Number.isInteger(saved) && saved >= 1 && saved <= 10 ? saved : 10;
  } catch { return 10; }
}
function loadPending(): Set<string> {
  try { return new Set(JSON.parse(sessionStorage.getItem(pendingKey) || '[]')); }
  catch { return new Set(); }
}

const labels: Record<DownloadJob['state'], string> = {
  checking: 'Consultando el vídeo', downloading: 'Descargando', converting: 'Convirtiendo a MP4',
  saving: 'Guardando en la biblioteca', done: 'Guardado', error: 'Error', cancelled: 'Cancelado',
  interrupted: 'Interrumpida',
};

export function DownloadHub({ onCompleted, categories }: Props) {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<'video' | 'audio'>('video');
  const [category, setCategory] = useState('b-roll');
  const [quality, setQuality] = useState<VideoQuality>('best');
  const [maxSizeGb, setMaxSizeGb] = useState(loadMaxSizeGb);
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [existingId, setExistingId] = useState<string | null>(null);
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
          if (['error', 'cancelled', 'interrupted'].includes(job.state) && pendingBrowser.current.delete(job.id)) savePending();
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron consultar las descargas');
      }
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [onCompleted]);

  const remember = (job: DownloadJob) => {
    pendingBrowser.current.add(job.id);
    savePending();
    setJobs((previous) => [job, ...previous.filter((item) => item.id !== job.id)]);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !url.trim() || !Number.isInteger(maxSizeGb) || maxSizeGb < 1 || maxSizeGb > 10) return;
    setBusy(true); setError(''); setExistingId(null);
    try {
      const job = await startDownload(url.trim(), mode, mode === 'video' ? category.trim() : undefined,
        mode === 'video' ? quality : undefined, maxSizeGb);
      remember(job);
      setUrl('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar la descarga');
      if (cause instanceof DownloadRequestError) setExistingId(cause.existingId || null);
    }
    finally { setBusy(false); }
  };

  const activeJob = jobs.some((job) => ['checking', 'downloading', 'converting', 'saving'].includes(job.state));

  return <section className="mx-auto max-w-4xl space-y-5">
    <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-white"><Download size={21} className="text-indigo-400" /> Descargar de YouTube</h1>
      <p className="mt-2 text-sm text-neutral-400">Pega la URL de un vídeo o Short. La API ejecuta yt-dlp en la máquina donde está instalada y guarda el resultado en RotVault.</p>
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
      {mode === 'video' && <label className="block text-sm text-neutral-200">Calidad máxima
        <select aria-label="Calidad máxima" value={quality} onChange={(event) => setQuality(event.target.value as VideoQuality)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-[#202336] px-4 py-2 text-sm text-white">
          <option value="best">Mejor disponible</option>
          <option value="1080">Hasta 1080p</option>
          <option value="720">Hasta 720p</option>
          <option value="480">Hasta 480p</option>
        </select>
        <span className="mt-1 block text-xs text-neutral-400">En Shorts verticales se toma el ancho como referencia. Si no hay MP4 compatible, la API intentará convertir otro formato.</span>
      </label>}
      <label className="block text-sm text-neutral-200">Límite máximo por archivo (GB)
        <input aria-label="Límite máximo por archivo (GB)" type="number" min={1} max={10} step={1} value={Number.isNaN(maxSizeGb) ? '' : maxSizeGb}
          onChange={(event) => {
            const value = event.target.value === '' ? NaN : Number(event.target.value);
            setMaxSizeGb(value);
            if (Number.isInteger(value) && value >= 1 && value <= 10) {
              try { localStorage.setItem(maxSizeKey, String(value)); } catch { /* Se aplica a esta sesión. */ }
            }
          }} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2 text-sm text-white" />
        <span className="mt-1 block text-xs text-neutral-400">Entre 1 y 10 GB. El valor predeterminado es 10 GB.</span>
      </label>
      <p className="text-xs text-neutral-400">El vídeo aparecerá en B-Roll y el audio en la Librería de Sonidos. Se procesa una descarga cada vez.</p>
      <button type="submit" disabled={busy || activeJob || !url.trim() || !Number.isInteger(maxSizeGb) || maxSizeGb < 1 || maxSizeGb > 10 || (mode === 'video' && !category.trim())} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Iniciando…' : 'Descargar'}</button>
    </form>

    {error && <div role="alert" className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">{error}
      {existingId && <button type="button" onClick={() => downloadSavedFile(existingId)} className="ml-3 underline">Descargar archivo existente</button>}
    </div>}
    <div className="space-y-3" aria-label="Descargas">
      {jobs.map((job) => <article key={job.id} className="rounded-2xl border border-white/10 bg-[#141624] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><h2 className="truncate text-sm font-medium text-white">{job.title || job.url}</h2>
            <p className="mt-1 text-xs text-neutral-400">{job.mode === 'video' ? `Vídeo MP4 · ${job.quality === 'best' || !job.quality ? 'mejor calidad' : `hasta ${job.quality}p`}` : 'Audio WAV'}{job.isShort ? ' · Short' : ''} · límite {job.maxSizeGb || 10} GB · {labels[job.state]}</p></div>
          {['checking', 'downloading', 'converting'].includes(job.state) && <button type="button" aria-label="Cancelar descarga" title="Cancelar descarga" onClick={async () => {
            try { await cancelDownload(job.id); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cancelar'); }
          }} className="rounded-lg p-1 text-neutral-400 hover:text-rose-300"><X size={18} /></button>}
        </div>
        {['checking', 'downloading', 'converting', 'saving'].includes(job.state) && <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={job.progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-indigo-500 transition-all" style={{ width: `${job.progress}%` }} /></div>}
        {job.error && <p className="mt-2 text-xs text-rose-300">{job.error}</p>}
        {job.formatFallback && <p className="mt-2 text-xs text-amber-300">Convertido a MP4 compatible desde otro formato.</p>}
        {['error', 'cancelled', 'interrupted'].includes(job.state) && <button type="button" disabled={busy || activeJob}
          onClick={async () => {
            setBusy(true); setError(''); setExistingId(null);
            try { remember(await retryDownload(job.id)); }
            catch (cause) {
              setError(cause instanceof Error ? cause.message : 'No se pudo reintentar');
              if (cause instanceof DownloadRequestError) setExistingId(cause.existingId || null);
            } finally { setBusy(false); }
          }} className="mt-3 rounded-lg bg-indigo-500/20 px-3 py-1.5 text-xs text-indigo-200 hover:bg-indigo-500/30 disabled:opacity-50">Reintentar descarga</button>}
        {job.state === 'done' && <button type="button" onClick={() => downloadSavedFile(job.id)} className="mt-3 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-indigo-200 hover:bg-white/15">Descargar en Chrome</button>}
        {job.logs.length > 0 && <details className="mt-2 text-xs text-neutral-400"><summary className="cursor-pointer">Actividad de yt-dlp</summary><pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3">{job.logs.join('\n')}</pre></details>}
      </article>)}
    </div>
  </section>;
}
