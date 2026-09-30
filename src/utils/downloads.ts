export interface DownloadJob {
  id: string;
  url: string;
  mode: 'audio' | 'video';
  category: string | null;
  state: 'checking' | 'downloading' | 'saving' | 'done' | 'error' | 'cancelled';
  progress: number;
  title: string;
  duration: number;
  logs: string[];
  startedAt: number;
  finishedAt: number | null;
  error: string | null;
}

const apiBase = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api').replace(/\/$/, '');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}/downloads${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Error del servidor (${response.status})`);
  }
  return response.json();
}

export const listDownloads = () => request<DownloadJob[]>('');
export const startDownload = (url: string, mode: 'audio' | 'video', category?: string) => request<DownloadJob>('', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, mode, category }),
});
export const cancelDownload = (id: string) => request<DownloadJob>(`/${encodeURIComponent(id)}`, { method: 'DELETE' });

export function downloadSavedFile(id: string): void {
  const link = document.createElement('a');
  link.href = `${apiBase}/downloads/${encodeURIComponent(id)}/file`;
  link.download = '';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
