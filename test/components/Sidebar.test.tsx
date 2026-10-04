import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from '../../src/components/Sidebar';
import { defaultSectionVisibility, sectionIds } from '../../src/utils/sectionVisibility';

afterEach(() => vi.useRealTimers());

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

  it('activa el arrastre tras 250 ms, indica el estado y evita navegar al soltar', () => {
    vi.useFakeTimers();
    const onTabChange = vi.fn();
    const onReorderSection = vi.fn();
    render(<Sidebar activeTab="library" onTabChange={onTabChange} soundCount={0} isCollapsed={false}
      onToggleCollapse={vi.fn()} sectionOrder={[...sectionIds]} onReorderSection={onReorderSection} />);
    const scripts = screen.getByRole('button', { name: /Guiones & Hooks/ });
    const library = screen.getByRole('button', { name: /Librería de Sonidos/ });
    fireEvent.pointerDown(scripts, { pointerId: 1, button: 0, clientX: 20, clientY: 160 });
    act(() => vi.advanceTimersByTime(249));
    expect(scripts).toHaveAttribute('aria-grabbed', 'false');
    act(() => vi.advanceTimersByTime(1));
    expect(scripts).toHaveAttribute('aria-grabbed', 'true');
    expect(screen.getByText(/MOVIENDO/)).toBeInTheDocument();
    const original = document.elementFromPoint;
    document.elementFromPoint = vi.fn(() => library);
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 25, clientY: 100 });
    expect(onReorderSection).toHaveBeenCalledWith('scripts', 'library');
    fireEvent.pointerUp(window, { pointerId: 1 });
    fireEvent.click(scripts);
    expect(onTabChange).not.toHaveBeenCalled();
    expect(scripts).toHaveAttribute('aria-grabbed', 'false');
    document.elementFromPoint = original;
  });

  it('muestra Teleprónter y System Prompts solo dentro del área de Guiones', () => {
    const onTabChange = vi.fn();
    const props = { onTabChange, soundCount: 0, isCollapsed: false, onToggleCollapse: vi.fn() };
    const view = render(<Sidebar {...props} activeTab="library" />);
    expect(screen.queryByRole('button', { name: 'System Prompts' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Teleprónter & Voz' })).not.toBeInTheDocument();
    view.rerender(<Sidebar {...props} activeTab="scripts" />);
    fireEvent.click(screen.getByRole('button', { name: 'Teleprónter & Voz' }));
    expect(onTabChange).toHaveBeenCalledWith('recording');
    fireEvent.click(screen.getByRole('button', { name: 'System Prompts' }));
    expect(onTabChange).toHaveBeenCalledWith('system-prompts');
    view.rerender(<Sidebar {...props} activeTab="recording" />);
    expect(screen.getByRole('button', { name: 'Teleprónter & Voz' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /Guiones & Hooks/ })).toHaveClass('bg-white/12');
    view.rerender(<Sidebar {...props} activeTab="system-prompts" />);
    expect(screen.getByRole('button', { name: 'System Prompts' })).toHaveAttribute('aria-current', 'page');
    view.rerender(<Sidebar {...props} activeTab="stock" />);
    expect(screen.queryByRole('button', { name: 'System Prompts' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Teleprónter & Voz' })).not.toBeInTheDocument();
  });

  it('respeta la visibilidad del Teleprónter dentro de Guiones', () => {
    render(<Sidebar activeTab="scripts" onTabChange={vi.fn()} soundCount={0} isCollapsed={false}
      onToggleCollapse={vi.fn()} visibleSections={{ ...defaultSectionVisibility, recording: false }} />);
    expect(screen.queryByRole('button', { name: 'Teleprónter & Voz' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'System Prompts' })).toBeInTheDocument();
  });
});
