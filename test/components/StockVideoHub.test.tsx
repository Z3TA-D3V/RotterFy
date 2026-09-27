import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StockVideoHub } from '../../src/components/StockVideoHub';
import { stockVideo } from '../fixtures';

describe('StockVideoHub', () => {
  it('permite adjuntar el archivo a una ficha antigua y borrar otra ficha', async () => {
    const onUploadVideoFile = vi.fn().mockResolvedValue(undefined);
    const onDeleteVideo = vi.fn().mockResolvedValue(undefined);
    const file = new File(['video'], 'clip.mp4', { type: 'video/mp4' });
    const { container } = render(<StockVideoHub videos={[{ ...stockVideo, localPath: 'C:/antiguo.mp4' }]}
      onSaveVideo={vi.fn()} onUploadVideoFile={onUploadVideoFile} onDeleteVideo={onDeleteVideo} />);
    const input = container.querySelector('label input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(onUploadVideoFile).toHaveBeenCalledWith(stockVideo.id, file));
    fireEvent.click(screen.getByRole('button', { name: /Eliminar/ }));
    await waitFor(() => expect(onDeleteVideo).toHaveBeenCalledWith(stockVideo.id));
  });

  it('envía archivo y metadatos al guardar un vídeo nuevo', async () => {
    const onSaveVideo = vi.fn().mockResolvedValue(undefined);
    const file = new File(['mp4'], 'nuevo.mp4', { type: 'video/mp4' });
    URL.createObjectURL = vi.fn(() => 'blob:video');
    URL.revokeObjectURL = vi.fn();
    const { container } = render(<StockVideoHub videos={[]} onSaveVideo={onSaveVideo}
      onUploadVideoFile={vi.fn()} onDeleteVideo={vi.fn()} />);
    const original = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((name, options) => {
      const element = original(name, options);
      if (name === 'video') queueMicrotask(() => element.dispatchEvent(new Event('error')));
      return element;
    });
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar vídeo' }));
    await waitFor(() => expect(onSaveVideo).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'nuevo', category: 'b-roll' }), file,
    ));
  });
});
