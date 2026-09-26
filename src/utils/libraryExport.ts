import JSZip from 'jszip';
import { getAllSounds, getSoundBlob, PublishedSound } from './audioStorage';

export async function exportLocalLibrary(): Promise<number> {
  const sounds = await getAllSounds();
  if (sounds.length === 0) throw new Error('No hay audios para exportar.');

  const zip = new JSZip();
  const manifest: PublishedSound[] = [];

  for (const [index, sound] of sounds.entries()) {
    const blob = await getSoundBlob(sound.id);
    if (!blob) throw new Error(`Falta el audio de "${sound.title}". No se creó un ZIP incompleto.`);

    const extension = blob.type.includes('mpeg') ? 'mp3'
      : blob.type.includes('ogg') ? 'ogg'
      : blob.type.includes('webm') ? 'webm' : 'wav';
    const safeId = sound.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const file = `${String(index + 1).padStart(3, '0')}-${safeId}.${extension}`;
    const { audioBlob: _audioBlob, audioBlobUrl: _audioBlobUrl, sourceType: _sourceType, ...metadata } = sound;

    zip.file(file, blob);
    manifest.push({ ...metadata, file });
  }

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  const archive = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const url = URL.createObjectURL(archive);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'rotvault-biblioteca.zip';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return sounds.length;
}
