import { describe, expect, it, vi } from 'vitest';
import { exportLocalLibrary } from '../../src/utils/libraryExport';
import { getAllSounds, getSoundBlob } from '../../src/utils/audioStorage';
import { sound } from '../fixtures';

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
});
