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
  sourceUrl?: string;
}

export interface ScriptBeat {
  id: string;
  title: string;
  category: 'hook' | 'development' | 'punchline' | 'cta';
  content: string;
  associatedSoundId?: string;
  status: 'idea' | 'recording' | 'editing' | 'published';
  updatedAt: number;
  createdAt?: number;
  systemPromptUsed?: string;
  reasoningEffort?: 'low' | 'medium' | 'high';
  model?: 'gpt-6-luna' | 'gpt-6-sol' | 'gpt-6-astra' | 'o3-mini' | 'o1';
  totalCost?: number;
  chatHistory?: ScriptChatMessage[];
}

export interface ScriptChatMessage {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  timestamp: number;
  usage?: { input_tokens: number; output_tokens: number; total_tokens: number; input_tokens_details?: { cached_tokens?: number } };
  cost?: number | null;
}

export interface StockVideoAsset {
  id: string;
  title: string;
  category: string;
  format: string;
  durationText: string;
  localPath?: string;
  notes: string;
  favorite: boolean;
  sourceUrl?: string;
}
