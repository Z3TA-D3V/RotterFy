export const sectionIds = ['library', 'trimmer', 'soundboard', 'scripts', 'recording', 'stock', 'prompt'] as const;
export type SectionId = typeof sectionIds[number];
export type SectionVisibility = Record<SectionId, boolean>;

const storageKey = 'rotvault_visible_sections_v1';

export const defaultSectionVisibility: SectionVisibility = {
  library: true,
  trimmer: true,
  soundboard: true,
  scripts: true,
  recording: true,
  stock: true,
  prompt: false,
};

export function loadSectionVisibility(): SectionVisibility {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}') as Record<string, unknown>;
    return Object.fromEntries(sectionIds.map((id) => [id, typeof saved[id] === 'boolean' ? saved[id] : defaultSectionVisibility[id]])) as SectionVisibility;
  } catch { return { ...defaultSectionVisibility }; }
}

export function saveSectionVisibility(value: SectionVisibility): void {
  localStorage.setItem(storageKey, JSON.stringify(value));
}
