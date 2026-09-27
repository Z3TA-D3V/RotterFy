import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from '../../src/components/Sidebar';

describe('Sidebar', () => {
  it('navega al estudio y permite contraer el menú', () => {
    const onTabChange = vi.fn();
    const onToggleCollapse = vi.fn();
    render(<Sidebar activeTab="library" onTabChange={onTabChange} soundCount={35}
      isCollapsed={false} onToggleCollapse={onToggleCollapse} />);
    fireEvent.click(screen.getByText('Estudio de Recorte'));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }));
    expect(onTabChange).toHaveBeenCalledWith('trimmer');
    expect(onToggleCollapse).toHaveBeenCalledOnce();
  });
});
