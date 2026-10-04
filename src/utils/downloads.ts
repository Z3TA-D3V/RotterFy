export type VideoQuality = 'best' | '1080' | '720' | '480';

export interface DownloadJob {
  id: string;
  url: string;
  mode: 'audio' | 'video';
  category: string | null;
  quality: VideoQuality | null;
  maxSizeGb: number;
  isShort: boolean;
  formatFallback: boolean;
  state: 'checking' | 'downloading' | 'converting' | 'saving' | 'done' | 'error' | 'cancelled' | 'interrupted';
  progress: number;
  title: string;
  duration: number;
  logs: string[];
  startedAt: number;
  finishedAt: number | null;
  error: string | null;
}

const apiBase = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api').replace(/\/$/, '');

export class DownloadRequestError extends Error {
  constructor(message: string, readonly existingId?: string) { super(message); }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}/downloads${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new DownloadRequestError(body.error || `Error del servidor (${response.status})`, body.existingId);
  }
  return response.json();
}

export const listDownloads = () => request<DownloadJob[]>('');
export const startDownload = (url: string, mode: 'audio' | 'video', category?: string, quality?: VideoQuality, maxSizeGb = 10) => request<DownloadJob>('', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, mode, category, quality, maxSizeGb }),
});
export const retryDownload = (id: string) => request<DownloadJob>(`/${encodeURIComponent(id)}/retry`, { method: 'POST' });
export const cancelDownload = (id: string) => request<DownloadJob>(`/${encodeURIComponent(id)}`, { method: 'DELETE' });

export function downloadSavedFile(id: string): void {
  const link = document.createElement('a');
  link.href = `${apiBase}/downloads/${encodeURIComponent(id)}/file`;
  link.download = '';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
