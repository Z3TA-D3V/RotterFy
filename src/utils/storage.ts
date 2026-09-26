/**
 * IndexedDB storage for scripts and stock video metadata.
 */
import { ScriptBeat, StockVideoAsset } from '../types';

const DB_NAME = 'rotvault_creator_db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('scripts')) {
        db.createObjectStore('scripts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('stock_videos')) {
        db.createObjectStore('stock_videos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// Scripts store for content creator hub
export async function getScripts(): Promise<ScriptBeat[]> {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction('scripts', 'readonly');
    const req = tx.objectStore('scripts').getAll();
    req.onsuccess = () => {
      const list: ScriptBeat[] = req.result || [];
      if (list.length === 0) {
        // Initial sample scripts
        const defaults: ScriptBeat[] = [
          {
            id: 'script-1',
            title: 'POV: Eres programador Angular y ves un proyecto en React',
            category: 'hook',
            content: 'Â«El momento exacto en el que te dicen que en este proyecto no usamos RxJS ni Signals...Â» [Vine Boom] Â«Sino 24 useState anidados.Â»',
            associatedSoundId: 'vine-boom',
            status: 'recording',
            updatedAt: Date.now() - 3600000,
          },
          {
            id: 'script-2',
            title: 'TÃ­pico bug que solo pasa en producciÃ³n a las 5:00 PM',
            category: 'development',
            content: 'Â«Todo compilaba en local. Haces push a main un viernes...Â» [Metal Pipe Falling] Â«El servidor de Cloud se incendia.Â»',
            associatedSoundId: 'metal-pipe',
            status: 'idea',
            updatedAt: Date.now() - 7200000,
          },
          {
            id: 'script-3',
            title: 'Cuando el cliente dice "Es solo cambiar un colorcito"',
            category: 'punchline',
            content: 'Â«El cliente: solo es mover ese botÃ³n 2 pÃ­xeles. La arquitectura de CSS monolÃ­tica de hace 10 aÃ±os:Â» [Bruh Effect] [Sad Violin]',
            associatedSoundId: 'bruh',
            status: 'editing',
            updatedAt: Date.now() - 14400000,
          },
        ];
        defaults.forEach((d) => saveScript(d));
        resolve(defaults);
      } else {
        resolve(list.sort((a, b) => b.updatedAt - a.updatedAt));
      }
    };
    req.onerror = () => resolve([]);
  });
}

export async function saveScript(script: ScriptBeat): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('scripts', 'readwrite');
    tx.objectStore('scripts').put(script);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteScript(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction('scripts', 'readwrite');
    tx.objectStore('scripts').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

// B-Roll / Stock Video assets store
export async function getStockVideos(): Promise<StockVideoAsset[]> {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction('stock_videos', 'readonly');
    const req = tx.objectStore('stock_videos').getAll();
    req.onsuccess = () => {
      const list: StockVideoAsset[] = req.result || [];
      if (list.length === 0) {
        const defaults: StockVideoAsset[] = [
          {
            id: 'stock-1',
            title: 'Minecraft Parkour Espacio Profundo 4K',
            category: 'parkour',
            format: '9:16 Vertical',
            durationText: '03:45',
            localPath: 'C:/Creators/Stock/Minecraft_Parkour_Deep_01.mp4',
            notes: 'Ideal para fondos de historias largas y anÃ©cdotas de programaciÃ³n.',
            favorite: true,
          },
          {
            id: 'stock-2',
            title: 'Subway Surfers Miami Gameplay Sin Fin',
            category: 'gameplay',
            format: '9:16 Vertical',
            durationText: '05:12',
            localPath: 'C:/Creators/Stock/Subway_Miami_Loop.mp4',
            notes: 'Excelente para gags cortos y clips rÃ¡pidos.',
            favorite: true,
          },
          {
            id: 'stock-3',
            title: 'Corte de JabÃ³n Ultra Satisfactorio ASMR',
            category: 'satisfying',
            format: '9:16 Vertical',
            durationText: '02:30',
            localPath: 'C:/Creators/Stock/Soap_Cutting_ASMR_Cube.mp4',
            notes: 'RetenciÃ³n pura para los primeros 3 segundos.',
            favorite: false,
          },
          {
            id: 'stock-4',
            title: 'Arena KinÃ©tica Colores NeÃ³n Cuchillo Caliente',
            category: 'satisfying',
            format: '9:16 Vertical',
            durationText: '04:15',
            localPath: 'C:/Creators/Stock/Kinetic_Sand_Rainbow.mp4',
            notes: 'Fondo hipnÃ³tico para tutoriales o explicaciones de cÃ³digo.',
            favorite: false,
          },
        ];
        defaults.forEach((item) => saveStockVideo(item));
        resolve(defaults);
      } else {
        resolve(list);
      }
    };
    req.onerror = () => resolve([]);
  });
}

export async function saveStockVideo(item: StockVideoAsset): Promise<void> {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction('stock_videos', 'readwrite');
    tx.objectStore('stock_videos').put(item);
    tx.oncomplete = () => resolve();
  });
}
