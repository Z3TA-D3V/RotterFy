import { SoundItem, ScriptBeat, StockVideoAsset } from '../src/types';

export const sound: SoundItem = {
  id: 'sound-1',
  title: 'Vine Boom',
  category: 'brainrot',
  tags: ['boom'],
  duration: 2,
  coverImage: '/assets/images/vine_boom.jpg',
  addedAt: 100,
  favorite: false,
  playCount: 2,
  sourceType: 'published',
};

export const script: ScriptBeat = {
  id: 'script-100',
  title: 'Idea viral',
  category: 'hook',
  content: 'Un guión de ejemplo',
  status: 'idea',
  updatedAt: 100,
};

export const stockVideo: StockVideoAsset = {
  id: 'stock-100',
  title: 'Gameplay',
  category: 'gameplay',
  format: '9:16 Vertical',
  durationText: '00:10',
  localPath: '/assets/videos/stock-100.mp4',
  notes: 'Para fondo',
  favorite: false,
};
