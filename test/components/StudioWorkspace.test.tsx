import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudioWorkspace } from '../../src/components/StudioWorkspace';
import { sound } from '../fixtures';
import { replaceSoundInLibrary, saveSoundToLibrary } from '../../src/utils/audioStorage';

vi.mock('../../src/components/WaveformTrimmer', () => ({ WaveformTrimmer: () => <div>Gráfica</div> }));
vi.mock('../../src/components/CoverCropper', () => ({
  CoverCropper: ({ onApply }: { onApply: (blob: Blob, preview: string) => void }) =>
    <button onClick={() => onApply(new Blob(['foto'], { type: 'image/jpeg' }), 'blob:portada')}>Aplicar portada</button>,
}));
vi.mock('../../src/utils/audioEngine', () => ({
  getAudioContext: () => ({ state: 'running' }),
  decodeAudioBlob: vi.fn().mockResolvedValue({ duration: 2, sampleRate: 44100, numberOfChannels: 1 }),
  sliceAndProcessAudioBuffer: () => ({ duration: 2, sampleRate: 44100, numberOfChannels: 1 }),
  bufferToWaveBlob: () => new Blob(['WAV'], { type: 'audio/wav' }),
  extractWaveformPeaks: () => [0.5],
  synthesizeBrainrotSound: vi.fn(),
  stopCurrentPlayback: vi.fn(),
}));
vi.mock('../../src/utils/audioStorage', () => ({
  saveSoundToLibrary: vi.fn().mockResolvedValue(undefined),
  replaceSoundInLibrary: vi.fn().mockResolvedValue(undefined),
}));

describe('StudioWorkspace', () => {
  beforeEach(() => {
    vi.mocked(saveSoundToLibrary).mockClear();
    vi.mocked(replaceSoundInLibrary).mockReset().mockResolvedValue(undefined);
  });

  it('actualiza el sonido existente conservando su ID, fecha y estadísticas', async () => {
    const onSoundSaved = vi.fn();
    const existing = { ...sound, favorite: true, playCount: 17, originalFileName: 'original.wav', hotkey: 'Q' };
    render(<StudioWorkspace initialAudioBlob={new Blob(['audio'])} initialSound={existing}
      onSoundSaved={onSoundSaved} onOpenFileLocation={vi.fn()} />);
    await screen.findByText('Gráfica');
    expect(screen.getByPlaceholderText('Ej. Vine Boom Reverb #1')).toHaveValue(sound.title);
    expect(screen.getByPlaceholderText('1, Q...')).toHaveValue('Q');
    fireEvent.change(screen.getByPlaceholderText('Ej. Vine Boom Reverb #1'), { target: { value: 'Boom editado' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios en Librer/ }));
    await waitFor(() => expect(replaceSoundInLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ id: sound.id, title: 'Boom editado', addedAt: sound.addedAt, favorite: true, playCount: 17,
        originalFileName: 'original.wav', sourceType: 'trimmed-clip' }), expect.any(Blob), expect.anything(), null,
    ));
    expect(saveSoundToLibrary).not.toHaveBeenCalled();
    expect(onSoundSaved).toHaveBeenCalledWith(expect.objectContaining({ id: sound.id, title: 'Boom editado' }));
  });

  it('sigue creando un ID nuevo cuando se recorta un archivo nuevo', async () => {
    const onSoundSaved = vi.fn();
    render(<StudioWorkspace initialAudioBlob={new Blob(['audio'])} initialSound={null}
      onSoundSaved={onSoundSaved} onOpenFileLocation={vi.fn()} />);
    await screen.findByText('Gráfica');
    fireEvent.click(screen.getByRole('button', { name: /Cortar y Guardar en Librer/ }));
    await waitFor(() => expect(saveSoundToLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.stringMatching(/^cut-/) }), expect.any(Blob), expect.anything(), null,
    ));
    expect(onSoundSaved).toHaveBeenCalledOnce();
  });

  it('conserva la edición en pantalla cuando la API rechaza el reemplazo', async () => {
    vi.mocked(replaceSoundInLibrary).mockRejectedValueOnce(new Error('No se pudo escribir el WAV'));
    const onSoundSaved = vi.fn();
    render(<StudioWorkspace initialAudioBlob={new Blob(['audio'])} initialSound={sound}
      onSoundSaved={onSoundSaved} onOpenFileLocation={vi.fn()} />);
    await screen.findByText('Gráfica');
    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios en Librer/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo escribir el WAV');
    expect(onSoundSaved).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Ej. Vine Boom Reverb #1')).toHaveValue(sound.title);
  });

  it('envía la nueva portada recortada junto con el WAV al actualizar', async () => {
    const { container } = render(<StudioWorkspace initialAudioBlob={new Blob(['audio'])} initialSound={sound}
      onSoundSaved={vi.fn()} onOpenFileLocation={vi.fn()} />);
    await screen.findByText('Gráfica');
    fireEvent.change(container.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement,
      { target: { files: [new File(['foto'], 'portada.jpg', { type: 'image/jpeg' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar portada' }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios en Librer/ }));
    await waitFor(() => expect(replaceSoundInLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ id: sound.id }), expect.any(Blob), expect.anything(), expect.any(Blob),
    ));
  });
});
