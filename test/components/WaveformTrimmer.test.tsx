import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WaveformTrimmer } from '../../src/components/WaveformTrimmer';

vi.mock('../../src/utils/audioEngine', () => ({
  getAudioContext: () => ({ state: 'running' }),
  playAudioBuffer: () => ({ stop: vi.fn() }),
  stopCurrentPlayback: vi.fn(),
  extractWaveformPeaks: () => Array(80).fill(0.5),
}));

describe('WaveformTrimmer', () => {
  it('ajusta OUT en pasos de 50 ms sin exceder la duración', () => {
    const onRangeChange = vi.fn();
    const audioBuffer = {
      duration: 2, sampleRate: 100, length: 200, numberOfChannels: 1,
      getChannelData: () => new Float32Array(200),
    } as unknown as AudioBuffer;
    render(<WaveformTrimmer audioBuffer={audioBuffer} startSec={0} endSec={1}
      onRangeChange={onRangeChange} />);
    fireEvent.click(screen.getAllByTitle('+50ms')[1]);
    expect(onRangeChange).toHaveBeenCalledWith(0, 1.05);
  });

  it('fija OUT en el punto de pausa y detiene la reproducción', async () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(1000);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const onRangeChange = vi.fn();
    const audioBuffer = {
      duration: 2, sampleRate: 100, length: 200, numberOfChannels: 1,
      getChannelData: () => new Float32Array(200),
    } as unknown as AudioBuffer;
    render(<WaveformTrimmer audioBuffer={audioBuffer} startSec={0} endSec={1}
      onRangeChange={onRangeChange} />);
    fireEvent.click(screen.getByTitle(/Reproducir selección/));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Fijar OUT en la posición actual y detener' })).toBeEnabled());
    clock.mockReturnValue(1500);
    fireEvent.click(screen.getByRole('button', { name: 'Fijar OUT en la posición actual y detener' }));
    expect(onRangeChange).toHaveBeenCalledWith(0, 0.5);
  });
});
