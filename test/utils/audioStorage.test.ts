import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteSoundFromLibrary, getAllSounds, getSoundAudioBuffer, getSoundBlob, incrementPlayCount,
  replaceSoundInLibrary, saveSoundToLibrary, updateSoundMetadata } from '../../src/utils/audioStorage';
import { sound } from '../fixtures';

describe('audioStorage', () => {
  const fetchMock = vi.fn();
  beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });

  it('lee el catálogo, ordena sonidos y sirve portadas y audio desde la API', async () => {
    const manifest = [
      { ...sound, id: 'older', addedAt: 1, file: 'older.wav', coverImage: '/assets/images/older.jpg' },
      { ...sound, id: 'newer', addedAt: 2, file: 'newer.wav', coverImage: '/assets/images/newer.jpg' },
    ];
    fetchMock.mockResolvedValueOnce(Response.json(manifest))
      .mockResolvedValueOnce(new Response(new Blob(['RIFF'], { type: 'audio/wav' })));
    const sounds = await getAllSounds();
    expect(sounds.map((item) => item.id)).toEqual(['newer', 'older']);
    expect(sounds[0].coverImage).toBe('http://127.0.0.1:3001/api/images/newer.jpg');
    expect(await getSoundBlob('newer')).toBeInstanceOf(Blob);
    expect(fetchMock.mock.calls[1][0]).toBe('http://127.0.0.1:3001/api/audio/newer.wav');
  });

  it('guarda el WAV y la portada recortada, actualiza metadatos y permite borrar', async () => {
    const item = { ...sound, id: 'save-1', sourceType: 'trimmed-clip' as const,
      coverImage: 'blob:preview' };
    const wav = new Blob(['RIFF'], { type: 'audio/wav' });
    const cover = new Blob(['jpeg'], { type: 'image/jpeg' });
    fetchMock.mockResolvedValueOnce(Response.json({ ...item, file: 'save-1.wav', coverImage: '/assets/images/save-1.jpg' }))
      .mockResolvedValueOnce(Response.json({ ...item, playCount: 4 }))
      .mockResolvedValueOnce(Response.json({ playCount: 5 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await saveSoundToLibrary(item, wav, undefined, cover);
    const posted = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(posted.audioBase64).toBeTruthy();
    expect(posted.coverBase64).toMatch(/^data:image\/jpeg;base64,/);
    expect(item.coverImage).toBe('http://127.0.0.1:3001/api/images/save-1.jpg');
    await updateSoundMetadata(item);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).coverImage).toBe('/assets/images/save-1.jpg');
    expect(await incrementPlayCount(item.id)).toBe(5);
    await deleteSoundFromLibrary(item.id);
    expect(fetchMock.mock.calls[3][1].method).toBe('DELETE');
  });

  it('lee el catálogo estático si la API local no responde', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(Response.json([{ ...sound, id: 'static-1', file: 'static-1.wav' }]));
    const sounds = await getAllSounds();
    expect(sounds[0].id).toBe('static-1');
    expect(sounds[0].coverImage).toBe(sound.coverImage);
    expect(fetchMock.mock.calls[1][0]).toContain('assets/audio/manifest.json');
  });
  it('no inventa audio para un ID ausente y no vuelve a descargar un blob ya cargado', async () => {
    fetchMock.mockResolvedValueOnce(Response.json([{ ...sound, id: 'cached', file: 'cached.wav' }]))
      .mockResolvedValueOnce(new Response(new Blob(['RIFF'], { type: 'audio/wav' })));
    await getAllSounds();
    expect(await getSoundBlob('missing')).toBeNull();
    const first = await getSoundBlob('cached');
    expect(await getSoundBlob('cached')).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('propaga errores de descarga y no guarda una respuesta incompleta en caché', async () => {
    fetchMock.mockResolvedValueOnce(Response.json([{ ...sound, id: 'retry', file: 'retry.wav' }]))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(new Blob(['RIFF'], { type: 'audio/wav' })));
    await getAllSounds();
    await expect(getSoundBlob('retry')).rejects.toThrow('No se pudo cargar el audio (503)');
    expect(await getSoundBlob('retry')).toBeInstanceOf(Blob);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('informa del fallo si tampoco se puede cargar el catálogo estático', async () => {
    fetchMock.mockRejectedValueOnce(new Error('API offline'))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(getAllSounds()).rejects.toThrow('No se pudo cargar el catálogo de audio');
  });

  it('no pierde la caché de un sonido si la API rechaza su borrado', async () => {
    const id = 'pending-delete';
    const item = { ...sound, id };
    fetchMock.mockResolvedValueOnce(Response.json({ ...item, file: `${id}.wav` }))
      .mockResolvedValueOnce(Response.json({ error: 'No autorizado' }, { status: 403 }));
    const blob = new Blob(['RIFF'], { type: 'audio/wav' });
    await saveSoundToLibrary(item, blob);
    await expect(deleteSoundFromLibrary(id)).rejects.toThrow('No autorizado');
    expect(await getSoundBlob(id)).toBe(blob);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('devuelve null para el buffer si el sonido no está en el catálogo', async () => {
    expect(await getSoundAudioBuffer('id-inexistente')).toBeNull();
  });

  it('invalida audio descargado si una recarga elimina el sonido del catálogo', async () => {
    fetchMock.mockResolvedValueOnce(Response.json([{ ...sound, id: 'removed', file: 'removed.wav' }]))
      .mockResolvedValueOnce(new Response(new Blob(['RIFF'], { type: 'audio/wav' })))
      .mockResolvedValueOnce(Response.json([]));
    await getAllSounds();
    expect(await getSoundBlob('removed')).toBeInstanceOf(Blob);
    await getAllSounds();
    expect(await getSoundBlob('removed')).toBeNull();
  });

  it('decodifica una sola vez el audio descargado y reutiliza el buffer', async () => {
    const decoded = { duration: 2 } as AudioBuffer;
    const decodeAudioData = vi.fn(async () => decoded);
    vi.stubGlobal('AudioContext', class {
      state = 'running';
      decodeAudioData = decodeAudioData;
    });
    fetchMock.mockResolvedValueOnce(Response.json([{ ...sound, id: 'decode-once', file: 'decode-once.wav' }]))
      .mockResolvedValueOnce(new Response(new Blob(['RIFF'], { type: 'audio/wav' })));
    await getAllSounds();
    expect(await getSoundAudioBuffer('decode-once')).toBe(decoded);
    expect(await getSoundAudioBuffer('decode-once')).toBe(decoded);
    expect(decodeAudioData).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reemplaza el WAV y la portada de un ID existente y actualiza la caché tras confirmación', async () => {
    const item = { ...sound, id: 'replace-1', coverImage: 'blob:preview' };
    const newBlob = new Blob(['new'], { type: 'audio/wav' });
    const cover = new Blob(['jpeg'], { type: 'image/jpeg' });
    fetchMock.mockResolvedValueOnce(Response.json([{ ...item, file: 'replace-1.wav' }]))
      .mockResolvedValueOnce(new Response('old', { headers: { 'Content-Type': 'audio/wav' } }))
      .mockResolvedValueOnce(Response.json({ ...item, file: 'replace-1.wav', coverImage: '/assets/images/replace-1.jpg' }));
    await getAllSounds();
    expect((await getSoundBlob(item.id))?.size).toBe(3);
    await replaceSoundInLibrary(item, newBlob, undefined, cover);
    expect(fetchMock.mock.calls[2][1].method).toBe('PUT');
    const sent = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(sent.sound.id).toBe(item.id);
    expect(sent.audioBase64).toBeTruthy();
    expect(sent.coverBase64).toMatch(/^data:image\/jpeg;base64,/);
    expect(await getSoundBlob(item.id)).toBe(newBlob);
    expect(item.coverImage).toBe('http://127.0.0.1:3001/api/images/replace-1.jpg');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('conserva el WAV anterior en caché cuando falla el reemplazo', async () => {
    const item = { ...sound, id: 'replace-fail' };
    const oldBlob = new Blob(['old'], { type: 'audio/wav' });
    fetchMock.mockResolvedValueOnce(Response.json([{ ...item, file: 'replace-fail.wav' }]))
      .mockResolvedValueOnce(new Response(oldBlob))
      .mockResolvedValueOnce(Response.json({ error: 'Sin espacio' }, { status: 507 }));
    await getAllSounds();
    const cached = await getSoundBlob(item.id);
    await expect(replaceSoundInLibrary(item, new Blob(['new'], { type: 'audio/wav' }))).rejects.toThrow('Sin espacio');
    expect(await getSoundBlob(item.id)).toBe(cached);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
