import { describe, expect, it, vi } from 'vitest';
import { exportLocalLibrary } from '../../src/utils/libraryExport';
import { getAllSounds, getSoundBlob } from '../../src/utils/audioStorage';
import { sound } from '../fixtures';
import JSZip from 'jszip';

vi.mock('../../src/utils/audioStorage', () => ({ getAllSounds: vi.fn(), getSoundBlob: vi.fn() }));

describe('libraryExport', () => {
  it('impide exportar una biblioteca vacía', async () => {
    vi.mocked(getAllSounds).mockResolvedValue([]);
    await expect(exportLocalLibrary()).rejects.toThrow('No hay audios');
  });

  it('crea un ZIP para los audios disponibles', async () => {
    vi.mocked(getAllSounds).mockResolvedValue([sound]);
    vi.mocked(getSoundBlob).mockResolvedValue(new Blob(['RIFF'], { type: 'audio/wav' }));
    const createUrl = vi.fn(() => 'blob:zip');
    URL.createObjectURL = createUrl;
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(window, 'setTimeout').mockImplementation(() => 1 as unknown as ReturnType<typeof setTimeout>);
    expect(await exportLocalLibrary()).toBe(1);
    expect(createUrl).toHaveBeenCalledWith(expect.any(Blob));
  });
  it('rechaza una exportación incompleta antes de iniciar la descarga', async () => {
    vi.mocked(getAllSounds).mockResolvedValue([sound]);
    vi.mocked(getSoundBlob).mockResolvedValue(null);
    const createUrl = vi.fn();
    URL.createObjectURL = createUrl;
    await expect(exportLocalLibrary()).rejects.toThrow(`Falta el audio de "${sound.title}"`);
    expect(createUrl).not.toHaveBeenCalled();
  });

  it('incluye metadatos y formatos correctos para audios con IDs especiales', async () => {
    const sounds = [
      { ...sound, id: 'mp3/uno', title: 'MP3' },
      { ...sound, id: 'ogg:dos', title: 'OGG' },
      { ...sound, id: 'webm tres', title: 'WEBM' },
      { ...sound, id: 'wav-cuatro', title: 'WAV' },
    ];
    vi.mocked(getAllSounds).mockResolvedValue(sounds);
    vi.mocked(getSoundBlob).mockImplementation(async (id) => new Blob(['audio'], {
      type: ({ 'mp3/uno': 'audio/mpeg', 'ogg:dos': 'audio/ogg', 'webm tres': 'audio/webm', 'wav-cuatro': 'audio/wav' } as Record<string, string>)[id],
    }));
    const createUrl = vi.fn((_blob: Blob) => 'blob:zip-formats');
    URL.createObjectURL = createUrl;
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(window, 'setTimeout').mockImplementation(() => 1 as unknown as ReturnType<typeof setTimeout>);

    expect(await exportLocalLibrary()).toBe(4);
    const zip = await JSZip.loadAsync(createUrl.mock.calls[0][0] as Blob);
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
    expect(manifest.map((item: { file: string }) => item.file)).toEqual([
      '001-mp3_uno.mp3', '002-ogg_dos.ogg', '003-webm_tres.webm', '004-wav-cuatro.wav',
    ]);
    expect(await zip.file('001-mp3_uno.mp3')!.async('string')).toBe('audio');
    expect(manifest[0]).not.toHaveProperty('sourceType');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });
});
