import { ScriptBeat, StockVideoAsset } from '../types';

const apiBase = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api').replace(/\/$/, '');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Error del servidor (${response.status})`);
  }
  return response.status === 204 ? undefined as T : response.json();
}

function jsonBody(value: unknown): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) };
}

export const getScripts = () => request<ScriptBeat[]>('/scripts');
export const saveScript = (script: ScriptBeat) => request<ScriptBeat>('/scripts', jsonBody(script));
export const deleteScript = (id: string) => request<void>(`/scripts/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const getStockVideos = () => request<StockVideoAsset[]>('/stock-videos');
export const deleteStockVideo = (id: string) => request<void>(`/stock-videos/${encodeURIComponent(id)}`, { method: 'DELETE' });

export async function saveStockVideo(video: StockVideoAsset, file?: File): Promise<StockVideoAsset> {
  const saved = await request<StockVideoAsset>('/stock-videos', jsonBody(video));
  if (!file) return saved;
  try {
    return await uploadStockVideoFile(video.id, file);
  } catch (error) {
    await deleteStockVideo(video.id).catch(() => {});
    throw error;
  }
}

export function uploadStockVideoFile(id: string, file: File): Promise<StockVideoAsset> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const contentType = file.type || ({ mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' } as Record<string, string>)[extension || ''];
  return request<StockVideoAsset>(`/stock-videos/${encodeURIComponent(id)}/file`, {
    method: 'PUT', headers: { 'Content-Type': contentType || 'application/octet-stream' }, body: file,
  });
}

export function assetUrl(path?: string): string | undefined {
  if (path?.startsWith('/assets/videos/')) return `${apiBase}/videos/${encodeURIComponent(path.split('/').pop() || '')}`;
  if (path?.startsWith('/assets/images/')) return `${apiBase}/images/${encodeURIComponent(path.split('/').pop() || '')}`;
  return path;
}

export const assetDownloadUrl = (id: string): string => `${apiBase}/downloads/${encodeURIComponent(id)}/file`;
