import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AudioTrimmerModal } from '../../src/components/AudioTrimmerModal';
import { sound } from '../fixtures';
import { saveSoundToLibrary } from '../../src/utils/audioStorage';

vi.mock('../../src/components/WaveformTrimmer', () => ({ WaveformTrimmer: () => <div>Gráfica</div> }));
vi.mock('../../src/utils/audioEngine', () => ({
  getAudioContext: () => ({ state: 'running' }),
  decodeAudioBlob: vi.fn().mockResolvedValue({ duration: 2, sampleRate: 44100, numberOfChannels: 1 }),
  sliceAndProcessAudioBuffer: () => ({ duration: 2, sampleRate: 44100, numberOfChannels: 1 }),
  bufferToWaveBlob: () => new Blob(['WAV'], { type: 'audio/wav' }),
  extractWaveformPeaks: () => [0.5],
  synthesizeBrainrotSound: vi.fn(),
}));
vi.mock('../../src/utils/audioStorage', () => ({ saveSoundToLibrary: vi.fn().mockResolvedValue(undefined) }));

describe('AudioTrimmerModal', () => {
  it('guarda el sonido extraído y avisa al contenedor', async () => {
    const onSoundSaved = vi.fn();
    render(<AudioTrimmerModal isOpen onClose={vi.fn()} onSoundSaved={onSoundSaved}
      initialAudioBlob={new Blob(['audio'])} initialSound={sound} />);
    await screen.findByText('Gráfica');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar en Librería' }));
    await waitFor(() => expect(saveSoundToLibrary).toHaveBeenCalledOnce());
    expect(onSoundSaved).toHaveBeenCalledWith(expect.objectContaining({ category: sound.category }));
  });
});
