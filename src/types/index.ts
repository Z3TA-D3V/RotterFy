export type SoundCategory = 'brainrot' | 'meme' | 'sfx' | 'impact' | 'vocal' | 'game' | 'phonk';

export interface SoundItem {
  id: string;
  title: string;
  category: SoundCategory;
  tags: string[];
  duration: number; // in seconds
  coverImage?: string;
  audioBlob?: Blob;
  waveformPeaks?: number[]; // normalized 0-1 values for visualizer
  addedAt: number;
  favorite: boolean;
  playCount: number;
  hotkey?: string;
  originalFileName?: string;
  folder?: string;
  sourceType: 'trimmed-clip' | 'published';
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
