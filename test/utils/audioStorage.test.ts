import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteSoundFromLibrary, getAllSounds, getSoundBlob, incrementPlayCount,
  saveSoundToLibrary, updateSoundMetadata } from '../../src/utils/audioStorage';
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
});
