import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OpenFileModal } from '../../src/components/OpenFileModal';
import { sound } from '../fixtures';
import { getSoundBlob } from '../../src/utils/audioStorage';

vi.mock('../../src/utils/audioStorage', () => ({ getSoundBlob: vi.fn().mockResolvedValue(new Blob(['RIFF'])) }));

describe('OpenFileModal', () => {
  it('descarga el WAV del sonido publicado', async () => {
    const objectUrl = vi.fn(() => 'blob:test');
    URL.createObjectURL = objectUrl;
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<OpenFileModal isOpen sound={sound} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Descarga Inmediata/ }));
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(objectUrl).toHaveBeenCalledWith(expect.any(Blob));
  });
  it('no ofrece acciones cuando está cerrado y no descarga un audio ausente', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { rerender } = render(<OpenFileModal isOpen={false} sound={sound} onClose={vi.fn()} />);
    expect(screen.queryByText(sound.title)).not.toBeInTheDocument();
    vi.mocked(getSoundBlob).mockResolvedValueOnce(null);
    rerender(<OpenFileModal isOpen sound={sound} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Descarga Inmediata/ }));
    await waitFor(() => expect(getSoundBlob).toHaveBeenCalledWith(sound.id));
    expect(click).not.toHaveBeenCalled();
  });

  it('explica cuando el navegador no permite vincular carpetas', async () => {
    Reflect.deleteProperty(window, 'showDirectoryPicker');
    render(<OpenFileModal isOpen sound={sound} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Vincular Carpeta/ }));
    expect(await screen.findByText(/no soporta showDirectoryPicker/)).toBeInTheDocument();
  });

  it('guarda el audio en la carpeta vinculada usando File System Access', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);
    const getFileHandle = vi.fn().mockResolvedValue({ createWritable: vi.fn().mockResolvedValue({ write, close }) });
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue({ name: 'Edición', getFileHandle }));
    const blob = new Blob(['RIFF'], { type: 'audio/wav' });
    vi.mocked(getSoundBlob).mockResolvedValue(blob);
    render(<OpenFileModal isOpen sound={sound} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Vincular Carpeta/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Guardar Directo/ }));
    await waitFor(() => expect(write).toHaveBeenCalledWith(blob));
    expect(getFileHandle).toHaveBeenCalledWith('vine_boom.wav', { create: true });
    expect(close).toHaveBeenCalledOnce();
    expect(screen.getByText(/Guardado directamente/)).toBeInTheDocument();
  });
});
