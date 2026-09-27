import { describe, expect, it, vi } from 'vitest';
import { bufferToWaveBlob, extractWaveformPeaks, sliceAndProcessAudioBuffer } from '../../src/utils/audioEngine';

function audioBuffer(samples: number[], sampleRate = 4): AudioBuffer {
  const data = Float32Array.from(samples);
  return { duration: data.length / sampleRate, sampleRate, length: data.length,
    numberOfChannels: 1, getChannelData: () => data } as unknown as AudioBuffer;
}

describe('audioEngine', () => {
  it('codifica una selección WAV PCM con cabecera y muestras correctas', async () => {
    const blob = bufferToWaveBlob(audioBuffer([0, 1, -1, 0.5]), 0.25, 0.75);
    const bytes = new DataView(await blob.arrayBuffer());
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(48);
    expect(String.fromCharCode(...new Uint8Array(bytes.buffer, 0, 4))).toBe('RIFF');
    expect(bytes.getInt16(44, true)).toBe(32767);
    expect(bytes.getInt16(46, true)).toBe(-32768);
  });

  it('recorta, normaliza y aplica ganancia sin superar el rango PCM', () => {
    const dest = audioBuffer([0, 0]);
    const ctx = { createBuffer: vi.fn(() => dest) } as unknown as AudioContext;
    const result = sliceAndProcessAudioBuffer(ctx, audioBuffer([0.2, 0.5, -0.5, 0.1]), {
      startSec: 0.25, endSec: 0.75, normalize: true, gainMultiplier: 2,
    });
    expect(ctx.createBuffer).toHaveBeenCalledWith(1, 2, 4);
    expect(Array.from(result.getChannelData(0))).toEqual([1, -1]);
  });

  it('da picos uniformes para silencio', () => {
    expect(extractWaveformPeaks(audioBuffer([0, 0, 0, 0]), 2)).toEqual([0.2, 0.2]);
  });
});
