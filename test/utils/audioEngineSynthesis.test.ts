import { beforeEach, describe, expect, it, vi } from 'vitest';
import { synthesizeBrainrotSound } from '../../src/utils/audioEngine';

class Parameter {
  values: number[] = [];
  setValueAtTime(value: number) { this.values.push(value); }
  linearRampToValueAtTime(value: number) { this.values.push(value); }
  exponentialRampToValueAtTime(value: number) { this.values.push(value); }
}

class Node {
  kind: string;
  frequency = new Parameter();
  gain = new Parameter();
  Q = new Parameter();
  connections: unknown[] = [];
  start = vi.fn();
  stop = vi.fn();
  constructor(kind: string) { this.kind = kind; }
  connect(target: unknown) { this.connections.push(target); }
}

class FakeBuffer {
  duration: number;
  sampleRate: number;
  length: number;
  numberOfChannels: number;
  channels: Float32Array[];
  constructor(channels: number, length: number, sampleRate: number) {
    this.duration = length / sampleRate;
    this.sampleRate = sampleRate;
    this.length = length;
    this.numberOfChannels = channels;
    this.channels = Array.from({ length: channels }, () => new Float32Array(length));
  }
  getChannelData(channel: number) { return this.channels[channel]; }
}

const contexts: FakeOfflineAudioContext[] = [];
class FakeOfflineAudioContext {
  destination = new Node('destination');
  nodes: Node[] = [];
  channels: number;
  length: number;
  sampleRate: number;
  constructor(channels: number, length: number, sampleRate: number) {
    this.channels = channels; this.length = length; this.sampleRate = sampleRate;
    contexts.push(this);
  }
  node(kind: string) { const result = new Node(kind); this.nodes.push(result); return result; }
  createOscillator() { return this.node('oscillator'); }
  createGain() { return this.node('gain'); }
  createWaveShaper() { return this.node('waveshaper'); }
  createBiquadFilter() { return this.node('filter'); }
  createBufferSource() { return this.node('buffer-source'); }
  createBuffer(channels: number, length: number, rate: number) { return new FakeBuffer(channels, length, rate); }
  async startRendering() { return new FakeBuffer(this.channels, this.length, this.sampleRate); }
}

describe('synthesizeBrainrotSound', () => {
  beforeEach(() => { contexts.length = 0; vi.stubGlobal('OfflineAudioContext', FakeOfflineAudioContext); });

  it.each([
    ['vine-boom', 1.8], ['metal-pipe', 2.4], ['bruh', 0.9], ['taco-bell', 2.2],
    ['roblox-oof', 0.45], ['airhorn', 1.4], ['skibidi', 1.5], ['doge-huh', 0.7],
    ['boing', 0.8], ['sad-violin', 2.5], ['cha-ching', 1.2], ['whoosh', 0.9],
  ] as const)('%s programa una voz y exporta un WAV de %ss', async (name, seconds) => {
    const result = await synthesizeBrainrotSound(name);
    expect(result.duration).toBeCloseTo(seconds, 3);
    expect(result.blob.type).toBe('audio/wav');
    expect(result.blob.size).toBeGreaterThan(44);
    expect(contexts[0].nodes.some((node) => node.start.mock.calls.length > 0)).toBe(true);
    expect(contexts[0].nodes.every((node) => node.start.mock.calls.length === node.stop.mock.calls.length || node.start.mock.calls.length === 0)).toBe(true);
  });

  it.each(['skibidi', 'boing', 'sad-violin'] as const)('%s conecta la modulación a través de una ganancia', async (name) => {
    await synthesizeBrainrotSound(name);
    const ctx = contexts[0];
    const modulators = ctx.nodes.filter((node) => node.kind === 'oscillator' && node.connections.some((target) => target instanceof Node && target.kind === 'gain'));
    expect(modulators.length).toBeGreaterThan(0);
    expect(modulators.some((node) => node.connections.some((target) => {
      const gain = target as Node;
      return gain.connections.some((destination) => destination instanceof Parameter);
    }))).toBe(true);
  });
});
