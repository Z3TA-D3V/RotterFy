import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioTrimmerModal } from '../../src/components/AudioTrimmerModal';
import { sound } from '../fixtures';
import { replaceSoundInLibrary, saveSoundToLibrary } from '../../src/utils/audioStorage';

vi.mock('../../src/components/WaveformTrimmer', () => ({ WaveformTrimmer: () => <div>Gráfica</div> }));
vi.mock('../../src/utils/audioEngine', () => ({
  getAudioContext: () => ({ state: 'running' }),
  decodeAudioBlob: vi.fn().mockResolvedValue({ duration: 2, sampleRate: 44100, numberOfChannels: 1 }),
  sliceAndProcessAudioBuffer: () => ({ duration: 2, sampleRate: 44100, numberOfChannels: 1 }),
  bufferToWaveBlob: () => new Blob(['WAV'], { type: 'audio/wav' }),
  extractWaveformPeaks: () => [0.5],
  synthesizeBrainrotSound: vi.fn(),
}));
vi.mock('../../src/utils/audioStorage', () => ({
  saveSoundToLibrary: vi.fn().mockResolvedValue(undefined),
  replaceSoundInLibrary: vi.fn().mockResolvedValue(undefined),
}));

describe('AudioTrimmerModal', () => {
  beforeEach(() => {
    vi.mocked(saveSoundToLibrary).mockClear();
    vi.mocked(replaceSoundInLibrary).mockClear();
  });

  it('reemplaza el sonido existente y avisa al contenedor con el mismo ID', async () => {
    const onSoundSaved = vi.fn();
    render(<AudioTrimmerModal isOpen onClose={vi.fn()} onSoundSaved={onSoundSaved}
      initialAudioBlob={new Blob(['audio'])} initialSound={sound} />);
    await screen.findByText('Gráfica');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios en Librería' }));
    await waitFor(() => expect(replaceSoundInLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ id: sound.id, title: sound.title }), expect.any(Blob), expect.anything(), null,
    ));
    expect(saveSoundToLibrary).not.toHaveBeenCalled();
    expect(onSoundSaved).toHaveBeenCalledWith(expect.objectContaining({ id: sound.id }));
  });

  it('crea un sonido nuevo cuando no hay uno para editar', async () => {
    render(<AudioTrimmerModal isOpen onClose={vi.fn()} onSoundSaved={vi.fn()}
      initialAudioBlob={new Blob(['audio'])} initialSound={null} />);
    await screen.findByText('Gráfica');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar en Librería' }));
    await waitFor(() => expect(saveSoundToLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.stringMatching(/^cut-/) }), expect.any(Blob), expect.anything(), null,
    ));
  });
});
