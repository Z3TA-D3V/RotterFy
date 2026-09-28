import { sectionIds, type SectionId } from './sectionVisibility';

const storageKey = 'rotvault_section_order_v1';

export function loadSectionOrder(): SectionId[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(saved)) return [...sectionIds];
    const known = saved.filter((id): id is SectionId => sectionIds.some((section) => section === id));
    return [...new Set([...known, ...sectionIds])];
  } catch { return [...sectionIds]; }
}

export function saveSectionOrder(order: SectionId[]): void {
  localStorage.setItem(storageKey, JSON.stringify(order));
}

export function moveSection(order: SectionId[], source: SectionId, target: SectionId): SectionId[] {
  const from = order.indexOf(source);
  const to = order.indexOf(target);
  if (from < 0 || to < 0 || from === to) return order;
  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, source);
  return next;
}
