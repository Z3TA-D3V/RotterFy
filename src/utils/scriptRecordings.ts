export interface ScriptRecording {
  id: string;
  scriptId: string;
  createdAt: number;
  updatedAt?: number;
  originalFile: string;
  editedFile: string | null;
  bytes: number;
  edit?: RecordingEdit;
}

export interface RecordingEdit {
  startSec: number;
  endSec: number;
  gain: number;
  normalize: boolean;
  fadeIn: number;
  fadeOut: number;
}

const apiBase = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api').replace(/\/$/, '');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Error del servidor (${response.status})`);
  }
  return response.status === 204 ? undefined as T : response.json();
}

const base = (scriptId: string) => `/scripts/${encodeURIComponent(scriptId)}/recordings`;

export const listScriptRecordings = (scriptId: string) => request<ScriptRecording[]>(base(scriptId));

export const saveScriptRecording = (scriptId: string, audio: Blob) => request<ScriptRecording>(base(scriptId), {
  method: 'POST', headers: { 'Content-Type': audio.type.split(';')[0] || 'audio/webm' }, body: audio,
});

export const saveEditedRecording = (scriptId: string, takeId: string, audio: Blob, edit: RecordingEdit) => request<ScriptRecording>(
  `${base(scriptId)}/${encodeURIComponent(takeId)}/edited`,
  { method: 'PUT', headers: { 'Content-Type': 'audio/wav', 'X-Edit-Settings': JSON.stringify(edit) }, body: audio },
);

export const deleteScriptRecording = (scriptId: string, takeId: string) => request<void>(
  `${base(scriptId)}/${encodeURIComponent(takeId)}`, { method: 'DELETE' },
);

export async function getScriptRecordingAudio(scriptId: string, takeId: string, variant: 'original' | 'edited' = 'original'): Promise<Blob> {
  const response = await fetch(`${apiBase}${base(scriptId)}/${encodeURIComponent(takeId)}/file?variant=${variant}`);
  if (!response.ok) throw new Error(`No se pudo cargar la toma (${response.status})`);
  return response.blob();
}
