import { SoundItem } from '../types';
import { decodeAudioBlob } from './audioEngine';

export interface PublishedSound extends Omit<SoundItem, 'audioBlob' | 'audioBlobUrl' | 'sourceType'> {
  file: string;
}

const audioFiles = new Map<string, string>();
const audioBlobs = new Map<string, Blob>();
const audioBuffers = new Map<string, AudioBuffer>();
const apiBase = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api').replace(/\/$/, '');

async function api(path: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(`${apiBase}/sounds${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Error del servidor (${response.status})`);
  }
  return response;
}

export async function getAllSounds(): Promise<SoundItem[]> {
  let manifest: PublishedSound[];
  let useApiAudio = true;
  try {
    const response = await api('');
    manifest = await response.json();
  } catch {
    useApiAudio = false;
    // Static deployments can read the bundled catalog without the local write server.
    const response = await fetch(`${import.meta.env.BASE_URL}assets/audio/manifest.json`, { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo cargar el catálogo de audio');
    manifest = await response.json();
  }
  audioFiles.clear();
  return manifest.map(({ file, ...sound }) => {
    audioFiles.set(sound.id, useApiAudio
      ? `${apiBase}/audio/${encodeURIComponent(file)}`
      : `${import.meta.env.BASE_URL}assets/audio/${encodeURIComponent(file)}`);
    return { ...sound, sourceType: 'published' as const };
  }).sort((a, b) => b.addedAt - a.addedAt);
}

export const initSoundLibrary = getAllSounds;

export async function getSoundBlob(id: string): Promise<Blob | null> {
  const cached = audioBlobs.get(id);
  if (cached) return cached;
  const file = audioFiles.get(id);
  if (!file) return null;
  const response = await fetch(file);
  if (!response.ok) throw new Error(`No se pudo cargar el audio (${response.status})`);
  const blob = await response.blob();
  audioBlobs.set(id, blob);
  return blob;
}

export async function getSoundAudioBuffer(id: string): Promise<AudioBuffer | null> {
  const cached = audioBuffers.get(id);
  if (cached) return cached;
  const blob = await getSoundBlob(id);
  if (!blob) return null;
  const buffer = await decodeAudioBlob(blob);
  audioBuffers.set(id, buffer);
  return buffer;
}

export async function saveSoundToLibrary(sound: SoundItem, blob: Blob, buffer?: AudioBuffer): Promise<void> {
  const audioBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  const response = await api('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sound, audioBase64 }),
  });
  const saved: PublishedSound = await response.json();
  audioFiles.set(sound.id, `${apiBase}/audio/${encodeURIComponent(saved.file)}`);
  audioBlobs.set(sound.id, blob);
  if (buffer) audioBuffers.set(sound.id, buffer);
  sound.sourceType = 'published';
}

export async function updateSoundMetadata(sound: SoundItem): Promise<void> {
  await api(`/${encodeURIComponent(sound.id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sound),
  });
}

export async function deleteSoundFromLibrary(id: string): Promise<void> {
  await api(`/${encodeURIComponent(id)}`, { method: 'DELETE' });
  audioFiles.delete(id);
  audioBlobs.delete(id);
  audioBuffers.delete(id);
}

export async function incrementPlayCount(id: string): Promise<number> {
  const response = await api(`/${encodeURIComponent(id)}/play`, { method: 'POST' });
  const result = await response.json();
  return result.playCount;
}
