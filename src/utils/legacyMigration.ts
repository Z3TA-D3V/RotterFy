import { ScriptBeat, StockVideoAsset } from '../types';
import { getScripts, getStockVideos, saveScript, saveStockVideo } from './storage';

// One-time import of data created by versions that stored these lists in IndexedDB.
async function readLegacy<T>(store: string): Promise<T[]> {
  if (!('indexedDB' in window)) return [];
  if (indexedDB.databases) {
    const databases = await indexedDB.databases();
    if (!databases.some((db) => db.name === 'rotvault_creator_db')) return [];
  }
  return new Promise((resolve) => {
    const request = indexedDB.open('rotvault_creator_db');
    request.onerror = () => resolve([]);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(store)) { db.close(); resolve([]); return; }
      const transaction = db.transaction(store, 'readonly');
      const all = transaction.objectStore(store).getAll();
      all.onsuccess = () => { resolve(all.result || []); db.close(); };
      all.onerror = () => { resolve([]); db.close(); };
    };
  });
}

export async function loadCreatorLists(): Promise<{ scripts: ScriptBeat[]; videos: StockVideoAsset[] }> {
  const [scripts, videos] = await Promise.all([getScripts(), getStockVideos()]);
  if (localStorage.getItem('rotvault_legacy_import_done') === '1') return { scripts, videos };
  let importedScripts: ScriptBeat[] = [];
  let importedVideos: StockVideoAsset[] = [];
  if (!scripts.length) {
    const old = await readLegacy<ScriptBeat>('scripts');
    importedScripts = await Promise.all(old.filter((item) => !['script-1', 'script-2', 'script-3'].includes(item.id)).map((item) => saveScript(item)));
  }
  if (!videos.length) {
    const old = await readLegacy<StockVideoAsset>('stock_videos');
    importedVideos = await Promise.all(old.filter((item) => !['stock-1', 'stock-2', 'stock-3', 'stock-4'].includes(item.id)).map((item) => saveStockVideo(item)));
  }
  localStorage.setItem('rotvault_legacy_import_done', '1');
  return {
    scripts: [...scripts, ...importedScripts].sort((a, b) => b.updatedAt - a.updatedAt),
    videos: [...videos, ...importedVideos],
  };
}
