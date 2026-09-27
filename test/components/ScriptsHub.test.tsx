import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScriptsHub } from '../../src/components/ScriptsHub';
import { sound, script } from '../fixtures';

describe('ScriptsHub', () => {
  it('guarda una idea y elimina un guión existente tras confirmar la API', async () => {
    const onSaveScript = vi.fn().mockResolvedValue(undefined);
    const onDeleteScript = vi.fn().mockResolvedValue(undefined);
    render(<ScriptsHub scripts={[script]} sounds={[sound]} onSaveScript={onSaveScript}
      onDeleteScript={onDeleteScript} onPlaySoundById={vi.fn()} />);
    fireEvent.click(screen.getByText(/Nuevo Gui/));
    fireEvent.change(screen.getByPlaceholderText(/framework de JS/), { target: { value: 'Nueva idea' } });
    fireEvent.click(screen.getByText(/Guardar Gui/));
    await waitFor(() => expect(onSaveScript).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nueva idea' })));
    fireEvent.click(screen.getByTitle(/Eliminar gui/));
    await waitFor(() => expect(onDeleteScript).toHaveBeenCalledWith(script.id));
  });
});
