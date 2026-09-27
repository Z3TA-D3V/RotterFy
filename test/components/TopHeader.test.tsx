import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopHeader } from '../../src/components/TopHeader';

describe('TopHeader', () => {
  it('busca, exporta y abre el estudio', () => {
    const onSearchChange = vi.fn();
    const onExportLibrary = vi.fn();
    const onOpenTrimmer = vi.fn();
    render(<TopHeader activeTab="library" searchQuery="" onSearchChange={onSearchChange}
      onOpenTrimmer={onOpenTrimmer} onOpenPrompt={vi.fn()} totalSoundsCount={35}
      onExportLibrary={onExportLibrary} isExporting={false} exportStatus="" />);
    fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre/), { target: { value: 'boom' } });
    fireEvent.click(screen.getByRole('button', { name: 'Exportar biblioteca' }));
    fireEvent.click(screen.getByRole('button', { name: /Subir.*Recortar/ }));
    expect(onSearchChange).toHaveBeenCalledWith('boom');
    expect(onExportLibrary).toHaveBeenCalledOnce();
    expect(onOpenTrimmer).toHaveBeenCalledOnce();
    expect(screen.getByText('(35)')).toBeInTheDocument();
  });
});
