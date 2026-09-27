import { beforeEach, describe, expect, it, vi } from 'vitest';

const sources: FakeSource[] = [];
const contexts: FakeAudioContext[] = [];

class FakeSource {
  buffer: unknown;
  playbackRate = { value: 1 };
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  onended: (() => void) | null = null;
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  constructor() { sources.push(this); }
}

class FakeAudioContext {
  state = 'running';
  destination = {};
  resume = vi.fn(async () => { this.state = 'running'; });
  decodeAudioData = vi.fn(async () => ({ duration: 2 }));
  createBufferSource = vi.fn(() => new FakeSource());
  createGain = vi.fn(() => ({ gain: { value: 1 }, connect: vi.fn() }));
  constructor() { contexts.push(this); }
}

describe('audio playback', () => {
  beforeEach(() => {
    vi.resetModules();
    sources.length = 0;
    contexts.length = 0;
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });

  it('decodifica el blob con el contexto compartido', async () => {
    const { decodeAudioBlob, getAudioContext } = await import('../../src/utils/audioEngine');
    const blob = new Blob(['audio']);
    expect(await decodeAudioBlob(blob)).toEqual({ duration: 2 });
    expect(contexts[0].decodeAudioData).toHaveBeenCalledWith(expect.any(ArrayBuffer));
    expect(getAudioContext()).toBe(contexts[0]);
    expect(contexts).toHaveLength(1);
  });

  it('respeta offset, duración mínima, velocidad y volumen, y avisa una sola vez al terminar', async () => {
    const { playAudioBuffer } = await import('../../src/utils/audioEngine');
    const onEnded = vi.fn();
    const audio = {} as AudioBuffer;
    const playback = playAudioBuffer(audio, { offset: -2, duration: -1, playbackRate: 1.25, volume: 0.3, onEnded });
    expect(sources[0].buffer).toBe(audio);
    expect(sources[0].start).toHaveBeenCalledWith(0, 0, 0.01);
    expect(sources[0].playbackRate.value).toBe(1.25);
    expect(contexts[0].createGain.mock.results[0].value.gain.value).toBe(0.3);
    sources[0].onended?.();
    sources[0].onended?.();
    playback.stop();
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(sources[0].stop).not.toHaveBeenCalled();
  });

  it('detiene la reproducción anterior sin disparar su callback y permite detener manualmente', async () => {
    const { playAudioBuffer, stopCurrentPlayback } = await import('../../src/utils/audioEngine');
    const oldEnded = vi.fn();
    playAudioBuffer({} as AudioBuffer, { onEnded: oldEnded });
    const current = playAudioBuffer({} as AudioBuffer, { loop: true, loopStart: 0.2, loopEnd: 0.8, offset: 0.2 });
    expect(sources[0].stop).toHaveBeenCalledTimes(1);
    expect(oldEnded).not.toHaveBeenCalled();
    expect(sources[1]).toMatchObject({ loop: true, loopStart: 0.2, loopEnd: 0.8 });
    expect(sources[1].start).toHaveBeenCalledWith(0, 0.2);
    current.stop();
    stopCurrentPlayback();
    expect(sources[1].stop).toHaveBeenCalledTimes(1);
  });

  it('reanuda un contexto suspendido antes de reproducir', async () => {
    const { getAudioContext, playAudioBuffer } = await import('../../src/utils/audioEngine');
    getAudioContext();
    contexts[0].state = 'suspended';
    playAudioBuffer({} as AudioBuffer);
    expect(contexts[0].resume).toHaveBeenCalled();
  });
});
