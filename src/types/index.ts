export type SoundCategory = 'brainrot' | 'meme' | 'sfx' | 'impact' | 'vocal' | 'game' | 'phonk';

export interface SoundItem {
  id: string;
  title: string;
  category: SoundCategory;
  tags: string[];
  duration: number; // in seconds
  coverImage?: string;
  audioBlobUrl?: string; // object URL or base64
  audioBlob?: Blob;
  waveformPeaks?: number[]; // normalized 0-1 values for visualizer
  addedAt: number;
  favorite: boolean;
  playCount: number;
  hotkey?: string;
  originalFileName?: string;
  folder?: string;
  sourceType: 'preset' | 'user-upload' | 'trimmed-clip' | 'published';
}

export interface FolderCategory {
  id: string;
  name: string;
  iconName: string;
  count?: number;
}

export interface ScriptBeat {
  id: string;
  title: string;
  category: 'hook' | 'development' | 'punchline' | 'cta';
  content: string;
  associatedSoundId?: string;
  status: 'idea' | 'recording' | 'editing' | 'published';
  updatedAt: number;
}

export interface StockVideoAsset {
  id: string;
  title: string;
  category: 'parkour' | 'gameplay' | 'satisfying' | 'b-roll';
  format: string;
  durationText: string;
  localPath?: string;
  notes: string;
  favorite: boolean;
}

export interface LibrarySettings {
  defaultExportFormat: 'wav' | 'mp3';
  autoNormalizeVolume: boolean;
  creatorDirectoryName: string;
  playbackSpeed: number;
  soundboardVolume: number;
}
