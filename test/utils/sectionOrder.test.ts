import { afterEach, describe, expect, it } from 'vitest';
import { loadSectionOrder, moveSection, saveSectionOrder } from '../../src/utils/sectionOrder';
import { sectionIds } from '../../src/utils/sectionVisibility';

afterEach(() => localStorage.removeItem('rotvault_section_order_v1'));

describe('sectionOrder', () => {
  it('persiste el orden elegido y conserva secciones nuevas al volver', () => {
    const moved = moveSection([...sectionIds], 'scripts', 'library');
    expect(moved[0]).toBe('scripts');
    saveSectionOrder(moved);
    expect(loadSectionOrder()).toEqual(moved);
    localStorage.setItem('rotvault_section_order_v1', JSON.stringify(['stock', 'library', 'stock', 'obsolete']));
    expect(loadSectionOrder()).toEqual(['stock', 'library', ...sectionIds.filter((id) => id !== 'stock' && id !== 'library')]);
  });
});
