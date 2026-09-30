import React, { useRef, useState } from 'react';
import { Download, Film, Play, Plus, Trash2, Upload } from 'lucide-react';
import { StockVideoAsset } from '../types';
import { assetDownloadUrl, assetUrl } from '../utils/storage';
import { videoCategories } from '../utils/videoCategories';

interface Props {
  videos: StockVideoAsset[];
  onSaveVideo: (video: StockVideoAsset, file: File) => Promise<void>;
  onUploadVideoFile: (id: string, file: File) => Promise<void>;
  onDeleteVideo: (id: string) => Promise<void>;
  onUpdateVideo: (video: StockVideoAsset) => Promise<void>;
  onPlayVideo: (video: StockVideoAsset) => void;
}

export const StockVideoHub: React.FC<Props> = ({ videos, onSaveVideo, onUploadVideoFile, onDeleteVideo, onUpdateVideo, onPlayVideo }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('b-roll');
  const [categoryEdits, setCategoryEdits] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categories = videoCategories(videos);

  const selectFile = (selected?: File) => {
    if (!selected) return;
    setFile(selected);
    if (!title) setTitle(selected.name.replace(/\.[^.]+$/, ''));
  };

  const save = async () => {
    if (!file || !title.trim() || !category.trim() || category.trim().length > 40 || busy) return;
    setBusy(true); setError(null);
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    let durationText = '--:--';
    let format = 'Vídeo';
    try {
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          const seconds = Math.floor(video.duration || 0);
          durationText = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
          format = video.videoHeight > video.videoWidth ? '9:16 Vertical' : '16:9 Horizontal';
          resolve();
        };
        video.onerror = () => resolve();
        video.src = url;
      });
      await onSaveVideo({ id: `stock-${Date.now()}`, title: title.trim(), category: category.trim(), format, durationText, notes, favorite: false }, file);
      setFile(null); setTitle(''); setNotes('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el vídeo'); }
    finally { URL.revokeObjectURL(url); setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white/4 border border-white/10 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Film className="w-5 h-5 text-violet-400" /> Vídeos de stock</h2>
        <p className="mt-1 text-xs text-neutral-400">Los archivos se guardan en public/assets/videos mediante la API local.</p>
      </div>
      <div className="rounded-3xl bg-[#141624] border border-white/10 p-5 space-y-3">
        <h3 className="text-xs font-semibold text-white">Añadir vídeo</h3>
        <input ref={inputRef} type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => selectFile(event.target.files?.[0])} className="block w-full text-xs text-neutral-300" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título" className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-white" />
          <input aria-label="Categoría del nuevo vídeo" list="video-categories" maxLength={40} value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Categoría nueva o existente" className="rounded-xl bg-[#202336] border border-white/10 px-3 py-2 text-xs text-white" />
        </div>
        <datalist id="video-categories">{categories.map((item) => <option key={item} value={item} />)}</datalist>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notas" rows={2} className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-white" />
        <button onClick={save} disabled={!file || !title.trim() || !category.trim() || busy} className="flex items-center gap-2 rounded-xl bg-violet-600 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white"><Plus className="w-4 h-4" />{busy ? 'Guardando…' : 'Guardar vídeo'}</button>
      </div>
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
      <div className="flex gap-2 flex-wrap">{['all', ...categories].map((key) => <button key={key} onClick={() => setFilter(key)} className={`rounded-lg px-3 py-1.5 text-xs ${filter === key ? 'bg-violet-600 text-white' : 'bg-white/5 text-neutral-400'}`}>{key === 'all' ? 'Todos' : key}</button>)}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.filter((video) => filter === 'all' || video.category === filter).map((video) => {
          const available = video.localPath?.startsWith('/assets/videos/');
          return <div key={video.id} className="rounded-3xl bg-[#13151f] border border-white/10 overflow-hidden">
            {available ? <div className="relative aspect-video bg-black">
              <button type="button" onClick={() => onPlayVideo(video)} aria-label={`Reproducir ${video.title}`}
                className="group relative block h-full w-full">
                <video src={assetUrl(video.localPath)} muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1}
                  className="pointer-events-none h-full w-full object-contain" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/30 group-focus-visible:bg-black/30"><Play size={40} className="rounded-full bg-black/65 p-2.5 text-white" /></span>
              </button>
              <a href={assetDownloadUrl(video.id)} aria-label={`Descargar archivo de ${video.title}`}
                className="absolute right-3 top-3 z-10 flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-black/80 px-3 py-2 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-violet-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400">
                <Download aria-hidden="true" className="h-4 w-4" /> Descargar
              </a>
            </div> : <div className="w-full aspect-video bg-black/30 flex items-center justify-center text-xs text-neutral-500">Archivo pendiente</div>}
            <div className="p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white">{video.title}</h3>
              <p className="text-xs text-neutral-400">{video.category} · {video.format} · {video.durationText}</p>
              <div className="flex flex-wrap items-center gap-2">
                <input aria-label={`Categoría de ${video.title}`} list="video-categories" maxLength={40} value={categoryEdits[video.id] ?? video.category}
                  onChange={(event) => setCategoryEdits((current) => ({ ...current, [video.id]: event.target.value }))}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white" />
                <button disabled={busy || !(categoryEdits[video.id] ?? '').trim() || (categoryEdits[video.id] ?? video.category).trim() === video.category}
                  onClick={async () => {
                    const next = categoryEdits[video.id]?.trim();
                    if (!next || next.length > 40 || busy) return;
                    setBusy(true); setError(null);
                    try {
                      await onUpdateVideo({ ...video, category: next });
                      setCategoryEdits((current) => { const copy = { ...current }; delete copy[video.id]; return copy; });
                    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la categoría'); }
                    finally { setBusy(false); }
                  }} className="rounded-lg bg-white/10 px-2 py-1 text-xs text-indigo-200 disabled:opacity-40">Guardar categoría</button>
              </div>
              {video.notes && <p className="text-xs text-neutral-300">{video.notes}</p>}
              {video.sourceUrl && <a href={video.sourceUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-indigo-300 hover:underline">Ver vídeo de origen</a>}
              <div className="flex items-center gap-3 pt-2">
                {!available && <label className="flex items-center gap-1 cursor-pointer text-xs text-indigo-300"><Upload className="w-4 h-4" /> Adjuntar archivo<input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={async (event) => { const selected = event.target.files?.[0]; if (selected) { try { setError(null); await onUploadVideoFile(video.id, selected); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo subir el vídeo'); } } }} /></label>}
                <button className="flex items-center gap-1 text-xs text-rose-300 ml-auto" onClick={async () => { try { await onDeleteVideo(video.id); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo borrar el vídeo'); } }}><Trash2 className="w-4 h-4" /> Eliminar</button>
              </div>
            </div>
          </div>;
        })}
      </div>
    </div>
  );
};
