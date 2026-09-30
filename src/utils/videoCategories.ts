import type { StockVideoAsset } from '../types';

export const defaultVideoCategories = ['b-roll', 'parkour', 'gameplay', 'satisfying'];

export function videoCategories(videos: StockVideoAsset[]): string[] {
  return [...new Set([...defaultVideoCategories, ...videos.map((video) => video.category)])];
}
