import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PromptEngineerModal } from '../../src/components/PromptEngineerModal';

describe('PromptEngineerModal', () => {
  it('cambia a la vista Angular y permite cerrar', () => {
    const onClose = vi.fn();
    render(<PromptEngineerModal isOpen onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Estructura Angular 18/19' }));
    expect(screen.getByText(/AudioEngineService/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
