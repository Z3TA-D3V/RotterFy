/**
 * IndexedDB storage engine for sounds, blobs, scripts, and creator assets
 */
import { SoundItem, ScriptBeat, StockVideoAsset, LibrarySettings } from '../types';
import { synthesizeBrainrotSound, extractWaveformPeaks, decodeAudioBlob } from './audioEngine';

const DB_NAME = 'rotvault_creator_db';
const DB_VERSION = 2;

// Memory cache for decoded AudioBuffers and Blob URLs to avoid re-decoding
export const audioBufferCache = new Map<string, AudioBuffer>();
export const audioUrlCache = new Map<string, string>();

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('sounds')) {
        db.createObjectStore('sounds', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('audio_blobs')) {
        db.createObjectStore('audio_blobs');
      }
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

// Preset sound definitions with pre-assigned image covers and categories
const INITIAL_PRESET_DEFS = [
  {
    id: 'vine-boom',
    title: 'Vine Boom 💥',
    category: 'impact' as const,
    tags: ['boom', 'reverb', 'bass', 'meme'],
    coverImage: '/src/assets/images/brainrot_sigma_meme_1790192229225.jpg',
    synthType: 'vine-boom' as const,
    hotkey: '1',
    folder: 'Impacts',
  },
  {
    id: 'metal-pipe',
    title: 'Metal Pipe Falling 🪈',
    category: 'brainrot' as const,
    tags: ['metal', 'pipe', 'clatter', 'earrape', 'classic'],
    coverImage: '/src/assets/images/brainrot_boom_pipe_1790192243786.jpg',
    synthType: 'metal-pipe' as const,
    hotkey: '2',
    folder: 'Brainrot',
  },
  {
    id: 'bruh',
    title: 'Bruh Effect 🗿',
    category: 'vocal' as const,
    tags: ['bruh', 'disappointment', 'reaction', 'voice'],
    synthType: 'bruh' as const,
    hotkey: '3',
    folder: 'Reactions',
  },
  {
    id: 'taco-bell',
    title: 'Taco Bell Bong 🔔',
    category: 'meme' as const,
    tags: ['bong', 'bell', 'gong', 'dramatic'],
    synthType: 'taco-bell' as const,
    hotkey: '4',
    folder: 'Impacts',
  },
  {
    id: 'roblox-oof',
    title: 'Roblox Oof 💀',
    category: 'game' as const,
    tags: ['roblox', 'oof', 'death', 'pain'],
    synthType: 'roblox-oof' as const,
    hotkey: '5',
    folder: 'Gaming',
  },
  {
    id: 'airhorn',
    title: 'MLG Airhorn 📯',
    category: 'meme' as const,
    tags: ['mlg', 'horn', 'hype', 'stadium'],
    synthType: 'airhorn' as const,
    hotkey: '6',
    folder: 'Memes',
  },
  {
    id: 'skibidi',
    title: 'Skibidi Stutter Hit 🚽',
    category: 'brainrot' as const,
    tags: ['skibidi', 'toilet', 'stutter', 'gen-alpha'],
    synthType: 'skibidi' as const,
    hotkey: '7',
    folder: 'Brainrot',
  },
  {
    id: 'doge-huh',
    title: 'Huh? Cat / Doge 🐕',
    category: 'vocal' as const,
    tags: ['huh', 'confused', 'cat', 'reaction'],
    synthType: 'doge-huh' as const,
    hotkey: '8',
    folder: 'Reactions',
  },
  {
    id: 'boing',
    title: 'Cartoon Boing 🌀',
    category: 'sfx' as const,
    tags: ['boing', 'cartoon', 'jump', 'spring'],
    synthType: 'boing' as const,
    hotkey: '9',
    folder: 'Cartoons',
  },
  {
    id: 'sad-violin',
    title: 'Sad Violin Lament 🎻',
    category: 'meme' as const,
    tags: ['sad', 'violin', 'emotional', 'drama'],
    synthType: 'sad-violin' as const,
    hotkey: '0',
    folder: 'Drama',
  },
  {
    id: 'cha-ching',
    title: 'Cha-Ching Money 💰',
    category: 'sfx' as const,
    tags: ['money', 'cash', 'register', 'win'],
    synthType: 'cha-ching' as const,
    hotkey: 'M',
    folder: 'SFX',
  },
  {
    id: 'whoosh',
    title: 'Cinematic Fast Whoosh 💨',
    category: 'sfx' as const,
    tags: ['transition', 'whoosh', 'fast', 'b-roll'],
    synthType: 'whoosh' as const,
    hotkey: 'W',
    folder: 'Transitions',
  },
];

export async function initAndSeedDatabase(): Promise<SoundItem[]> {
  const db = await getDB();

  // Check if sounds exist
  const existingSounds = await getAllSounds();
  if (existingSounds.length > 0) {
    return existingSounds;
  }

  // First run: synthesize initial brainrot collection
  const seededSounds: SoundItem[] = [];

  for (const item of INITIAL_PRESET_DEFS) {
    try {
      const { buffer, blob, duration } = await synthesizeBrainrotSound(item.synthType);
      const peaks = extractWaveformPeaks(buffer, 64);

      const soundRecord: SoundItem = {
        id: item.id,
        title: item.title,
        category: item.category,
        tags: item.tags,
        duration: Math.round(duration * 100) / 100,
        coverImage: item.coverImage,
        waveformPeaks: peaks,
        addedAt: Date.now(),
        favorite: item.id === 'vine-boom' || item.id === 'metal-pipe',
        playCount: item.id === 'vine-boom' ? 42 : 18,
        hotkey: item.hotkey,
        folder: item.folder,
        sourceType: 'preset',
      };

      await saveSoundToDB(soundRecord, blob, buffer);
      seededSounds.push(soundRecord);
    } catch (e) {
      console.error('Failed to seed sound:', item.id, e);
    }
  }

  return seededSounds;
}

export async function getAllSounds(): Promise<SoundItem[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sounds', 'audio_blobs'], 'readonly');
    const store = transaction.objectStore('sounds');
    const blobStore = transaction.objectStore('audio_blobs');
    const request = store.getAll();

    request.onsuccess = async () => {
      const list: SoundItem[] = request.result || [];
      // Attach blob URLs
      for (const item of list) {
        if (!audioUrlCache.has(item.id)) {
          const blobReq = blobStore.get(item.id);
          await new Promise<void>((res) => {
            blobReq.onsuccess = () => {
              if (blobReq.result instanceof Blob) {
                const url = URL.createObjectURL(blobReq.result);
                audioUrlCache.set(item.id, url);
                item.audioBlobUrl = url;
                item.audioBlob = blobReq.result;
              }
              res();
            };
            blobReq.onerror = () => res();
          });
        } else {
          item.audioBlobUrl = audioUrlCache.get(item.id);
        }
      }
      resolve(list.sort((a, b) => b.addedAt - a.addedAt));
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getSoundBlob(id: string): Promise<Blob | null> {
  const db = await getDB();
  return new Promise((resolve) => {
    const transaction = db.transaction('audio_blobs', 'readonly');
    const store = transaction.objectStore('audio_blobs');
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

export async function getSoundAudioBuffer(id: string): Promise<AudioBuffer | null> {
  if (audioBufferCache.has(id)) {
    return audioBufferCache.get(id)!;
  }
  const blob = await getSoundBlob(id);
  if (!blob) return null;
  try {
    const buffer = await decodeAudioBlob(blob);
    audioBufferCache.set(id, buffer);
    return buffer;
  } catch (err) {
    console.error('Failed to decode buffer for', id, err);
    return null;
  }
}

export async function saveSoundToDB(
  sound: SoundItem,
  blob: Blob,
  buffer?: AudioBuffer
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sounds', 'audio_blobs'], 'readwrite');
    const soundStore = transaction.objectStore('sounds');
    const blobStore = transaction.objectStore('audio_blobs');

    // Create / update blob URL cache
    const objectUrl = URL.createObjectURL(blob);
    audioUrlCache.set(sound.id, objectUrl);
    sound.audioBlobUrl = objectUrl;
    sound.audioBlob = blob;

    if (buffer) {
      audioBufferCache.set(sound.id, buffer);
    }

    soundStore.put(sound);
    blobStore.put(blob, sound.id);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function updateSoundMetadata(sound: SoundItem): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sounds', 'readwrite');
    const store = transaction.objectStore('sounds');
    store.put(sound);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function deleteSoundFromDB(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sounds', 'audio_blobs'], 'readwrite');
    transaction.objectStore('sounds').delete(id);
    transaction.objectStore('audio_blobs').delete(id);

    if (audioUrlCache.has(id)) {
      URL.revokeObjectURL(audioUrlCache.get(id)!);
      audioUrlCache.delete(id);
    }
    audioBufferCache.delete(id);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function incrementPlayCount(id: string): Promise<number> {
  const db = await getDB();
  return new Promise((resolve) => {
    const transaction = db.transaction('sounds', 'readwrite');
    const store = transaction.objectStore('sounds');
    const req = store.get(id);
    req.onsuccess = () => {
      const sound: SoundItem = req.result;
      if (sound) {
        sound.playCount = (sound.playCount || 0) + 1;
        store.put(sound);
        resolve(sound.playCount);
      } else {
        resolve(0);
      }
    };
    req.onerror = () => resolve(0);
  });
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
            content: '«El momento exacto en el que te dicen que en este proyecto no usamos RxJS ni Signals...» [Vine Boom] «Sino 24 useState anidados.»',
            associatedSoundId: 'vine-boom',
            status: 'recording',
            updatedAt: Date.now() - 3600000,
          },
          {
            id: 'script-2',
            title: 'Típico bug que solo pasa en producción a las 5:00 PM',
            category: 'development',
            content: '«Todo compilaba en local. Haces push a main un viernes...» [Metal Pipe Falling] «El servidor de Cloud se incendia.»',
            associatedSoundId: 'metal-pipe',
            status: 'idea',
            updatedAt: Date.now() - 7200000,
          },
          {
            id: 'script-3',
            title: 'Cuando el cliente dice "Es solo cambiar un colorcito"',
            category: 'punchline',
            content: '«El cliente: solo es mover ese botón 2 píxeles. La arquitectura de CSS monolítica de hace 10 años:» [Bruh Effect] [Sad Violin]',
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
            notes: 'Ideal para fondos de historias largas y anécdotas de programación.',
            favorite: true,
          },
          {
            id: 'stock-2',
            title: 'Subway Surfers Miami Gameplay Sin Fin',
            category: 'gameplay',
            format: '9:16 Vertical',
            durationText: '05:12',
            localPath: 'C:/Creators/Stock/Subway_Miami_Loop.mp4',
            notes: 'Excelente para gags cortos y clips rápidos.',
            favorite: true,
          },
          {
            id: 'stock-3',
            title: 'Corte de Jabón Ultra Satisfactorio ASMR',
            category: 'satisfying',
            format: '9:16 Vertical',
            durationText: '02:30',
            localPath: 'C:/Creators/Stock/Soap_Cutting_ASMR_Cube.mp4',
            notes: 'Retención pura para los primeros 3 segundos.',
            favorite: false,
          },
          {
            id: 'stock-4',
            title: 'Arena Kinética Colores Neón Cuchillo Caliente',
            category: 'satisfying',
            format: '9:16 Vertical',
            durationText: '04:15',
            localPath: 'C:/Creators/Stock/Kinetic_Sand_Rainbow.mp4',
            notes: 'Fondo hipnótico para tutoriales o explicaciones de código.',
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
