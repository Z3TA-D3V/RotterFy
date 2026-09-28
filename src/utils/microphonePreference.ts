const storageKey = 'rotvault_microphone_id_v1';

export function loadMicrophoneId(): string {
  return localStorage.getItem(storageKey) || '';
}

export function saveMicrophoneId(id: string): void {
  if (id) localStorage.setItem(storageKey, id);
  else localStorage.removeItem(storageKey);
}
