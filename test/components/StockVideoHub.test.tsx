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
  it('muestra el error de subida y permite reintentar adjuntar el archivo', async () => {
    const onUploadVideoFile = vi.fn().mockRejectedValueOnce(new Error('Sin espacio')).mockResolvedValueOnce(undefined);
    const file = new File(['video'], 'clip.mp4', { type: 'video/mp4' });
    const { container } = render(<StockVideoHub videos={[{ ...stockVideo, localPath: undefined }]}
      onSaveVideo={vi.fn()} onUploadVideoFile={onUploadVideoFile} onDeleteVideo={vi.fn()} />);
    const input = container.querySelector('label input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin espacio');
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(onUploadVideoFile).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('conserva el archivo y los campos cuando falla el guardado', async () => {
    const onSaveVideo = vi.fn().mockRejectedValue(new Error('Servidor no disponible'));
    const file = new File(['mp4'], 'nuevo.mp4', { type: 'video/mp4' });
    URL.createObjectURL = vi.fn(() => 'blob:video-error');
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
    fireEvent.change(screen.getByPlaceholderText('Notas'), { target: { value: 'Uso previsto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar vídeo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Servidor no disponible');
    expect(screen.getByPlaceholderText('Título')).toHaveValue('nuevo');
    expect(screen.getByPlaceholderText('Notas')).toHaveValue('Uso previsto');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:video-error');
  });

  it('filtra las fichas y comunica el error de borrado', async () => {
    const onDeleteVideo = vi.fn().mockRejectedValue(new Error('No se pudo borrar'));
    render(<StockVideoHub videos={[stockVideo, { ...stockVideo, id: 'other', title: 'Otro', category: 'parkour' }]}
      onSaveVideo={vi.fn()} onUploadVideoFile={vi.fn()} onDeleteVideo={onDeleteVideo} />);
    fireEvent.click(screen.getByRole('button', { name: 'parkour' }));
    expect(screen.getByText('Otro')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: stockVideo.title })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Eliminar/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo borrar');
    expect(screen.getByText('Otro')).toBeInTheDocument();
  });
});
