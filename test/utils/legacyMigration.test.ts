import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { loadCreatorLists } from '../../src/utils/legacyMigration';
import { getScripts, getStockVideos, saveScript, saveStockVideo } from '../../src/utils/storage';
import { script, stockVideo } from '../fixtures';

vi.mock('../../src/utils/storage', () => ({
  getScripts: vi.fn(), getStockVideos: vi.fn(), saveScript: vi.fn(), saveStockVideo: vi.fn(),
}));

describe('legacyMigration', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

  it('consulta la API una vez y evita leer IndexedDB tras la importación', async () => {
    localStorage.setItem('rotvault_legacy_import_done', '1');
    vi.mocked(getScripts).mockResolvedValue([script]);
    vi.mocked(getStockVideos).mockResolvedValue([stockVideo]);
    const open = vi.fn();
    vi.stubGlobal('indexedDB', { open });
    expect(await loadCreatorLists()).toEqual({ scripts: [script], videos: [stockVideo] });
    expect(open).not.toHaveBeenCalled();
    expect(getScripts).toHaveBeenCalledOnce();
    expect(getStockVideos).toHaveBeenCalledOnce();
  });

  it('importa datos antiguos al JSON de la API una sola vez', async () => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('rotvault_creator_db', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('scripts', { keyPath: 'id' });
        request.result.createObjectStore('stock_videos', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction(['scripts', 'stock_videos'], 'readwrite');
      tx.objectStore('scripts').put(script);
      tx.objectStore('stock_videos').put(stockVideo);
      tx.oncomplete = () => resolve();
    });
    db.close();
    vi.mocked(getScripts).mockResolvedValue([]);
    vi.mocked(getStockVideos).mockResolvedValue([]);
    vi.mocked(saveScript).mockImplementation(async (item) => item);
    vi.mocked(saveStockVideo).mockImplementation(async (item) => item);
    expect(await loadCreatorLists()).toEqual({ scripts: [script], videos: [stockVideo] });
    expect(saveScript).toHaveBeenCalledWith(script);
    expect(saveStockVideo).toHaveBeenCalledWith(stockVideo);
    expect(localStorage.getItem('rotvault_legacy_import_done')).toBe('1');
  });
});
