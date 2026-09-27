import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudioWorkspace } from '../../src/components/StudioWorkspace';
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
  stopCurrentPlayback: vi.fn(),
}));
vi.mock('../../src/utils/audioStorage', () => ({ saveSoundToLibrary: vi.fn().mockResolvedValue(undefined) }));

describe('StudioWorkspace', () => {
  it('guarda el recorte mediante la API y lo entrega a la biblioteca', async () => {
    const onSoundSaved = vi.fn();
    render(<StudioWorkspace initialAudioBlob={new Blob(['audio'])} initialSound={sound}
      onSoundSaved={onSoundSaved} onOpenFileLocation={vi.fn()} />);
    await screen.findByText('Gráfica');
    fireEvent.click(screen.getByRole('button', { name: /Cortar y Guardar en Librer/ }));
    await waitFor(() => expect(saveSoundToLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ sourceType: 'trimmed-clip' }), expect.any(Blob), expect.anything(), null,
    ));
    expect(onSoundSaved).toHaveBeenCalledWith(expect.objectContaining({ title: expect.any(String) }));
  });
});
