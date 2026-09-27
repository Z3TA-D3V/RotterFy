import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CoverCropper } from '../../src/components/CoverCropper';

describe('CoverCropper', () => {
  it('entrega una portada cuadrada tras aplicar el recorte', async () => {
    const originalImage = globalThis.Image;
    class LoadedImage {
      naturalWidth = 800;
      naturalHeight = 600;
      onload: (() => void) | null = null;
      set src(_value: string) { queueMicrotask(() => this.onload?.()); }
    }
    globalThis.Image = LoadedImage as unknown as typeof Image;
    URL.createObjectURL = vi.fn(() => 'blob:portada');
    URL.revokeObjectURL = vi.fn();
    const blob = new Blob(['jpeg'], { type: 'image/jpeg' });
    HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => callback(blob));
    const onApply = vi.fn();
    try {
      render(<CoverCropper file={new File(['image'], 'cover.jpg', { type: 'image/jpeg' })}
        onApply={onApply} onCancel={vi.fn()} />);
      await waitFor(() => expect(screen.getByRole('button', { name: 'Usar portada' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Usar portada' }));
      expect(onApply).toHaveBeenCalledWith(blob, 'blob:portada');
    } finally { globalThis.Image = originalImage; }
  });
});
