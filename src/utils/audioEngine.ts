/**
 * Audio Engine: Web Audio API synthesis, trimming, slicing and WAV encoding.
 */

// Singleton AudioContext
let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Convert AudioBuffer to 16-bit PCM WAV Blob
export function bufferToWaveBlob(buffer: AudioBuffer, startSec = 0, endSec = buffer.duration): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const endSample = Math.min(buffer.length, Math.floor(endSec * sampleRate));
  const lengthSamples = Math.max(0, endSample - startSample);

  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = lengthSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF identifier
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write interleaved PCM samples
  let offset = 44;
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  for (let i = 0; i < lengthSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = channels[ch][startSample + i];
      // Clamp between -1 and 1
      const clamped = Math.max(-1, Math.min(1, sample));
      const intSample = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// Slice AudioBuffer with optional gain, normalization, and fades
export function sliceAndProcessAudioBuffer(
  ctx: AudioContext,
  sourceBuffer: AudioBuffer,
  options: {
    startSec: number;
    endSec: number;
    fadeInSec?: number;
    fadeOutSec?: number;
    gainMultiplier?: number;
    normalize?: boolean;
  }
): AudioBuffer {
  const {
    startSec,
    endSec,
    fadeInSec = 0,
    fadeOutSec = 0,
    gainMultiplier = 1.0,
    normalize = false,
  } = options;

  const sampleRate = sourceBuffer.sampleRate;
  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const endSample = Math.min(sourceBuffer.length, Math.floor(endSec * sampleRate));
  const sliceLength = Math.max(1, endSample - startSample);
  const numChannels = sourceBuffer.numberOfChannels;

  const newBuffer = ctx.createBuffer(numChannels, sliceLength, sampleRate);

  // Calculate peak for normalization if requested
  let peak = 0;
  for (let ch = 0; ch < numChannels; ch++) {
    const srcData = sourceBuffer.getChannelData(ch);
    for (let i = 0; i < sliceLength; i++) {
      const absVal = Math.abs(srcData[startSample + i]);
      if (absVal > peak) peak = absVal;
    }
  }

  const effectiveGain = normalize && peak > 0.001 ? (0.95 / peak) * gainMultiplier : gainMultiplier;
  const fadeInSamples = Math.floor(fadeInSec * sampleRate);
  const fadeOutSamples = Math.floor(fadeOutSec * sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const src = sourceBuffer.getChannelData(ch);
    const dest = newBuffer.getChannelData(ch);

    for (let i = 0; i < sliceLength; i++) {
      let sample = src[startSample + i] * effectiveGain;

      // Apply fade in
      if (fadeInSamples > 0 && i < fadeInSamples) {
        sample *= i / fadeInSamples;
      }

      // Apply fade out
      if (fadeOutSamples > 0 && i > sliceLength - fadeOutSamples) {
        const remaining = sliceLength - i;
        sample *= remaining / fadeOutSamples;
      }

      dest[i] = Math.max(-1, Math.min(1, sample));
    }
  }

  return newBuffer;
}

// Generate normalized waveform peaks (for drawing nice waveform bars)
export function extractWaveformPeaks(buffer: AudioBuffer, numPeaks = 80): number[] {
  const channelData = buffer.getChannelData(0);
  const totalSamples = channelData.length;
  const blockSize = Math.floor(totalSamples / numPeaks);
  const peaks: number[] = [];

  let maxVal = 0;
  for (let i = 0; i < numPeaks; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, totalSamples);
    let sum = 0;
    let blockPeak = 0;

    for (let j = start; j < end; j++) {
      const val = Math.abs(channelData[j]);
      if (val > blockPeak) blockPeak = val;
      sum += val;
    }

    const value = blockPeak * 0.7 + (sum / (end - start || 1)) * 0.3;
    peaks.push(value);
    if (value > maxVal) maxVal = value;
  }

  // Normalize between 0.1 and 1
  return peaks.map((p) => (maxVal > 0 ? Math.max(0.08, p / maxVal) : 0.2));
}

// Synthesize Iconic Brainrot Sounds Offline using Web Audio API
export async function synthesizeBrainrotSound(
  type:
    | 'vine-boom'
    | 'metal-pipe'
    | 'bruh'
    | 'taco-bell'
    | 'roblox-oof'
    | 'airhorn'
    | 'skibidi'
    | 'doge-huh'
    | 'boing'
    | 'sad-violin'
    | 'cha-ching'
    | 'whoosh'
): Promise<{ buffer: AudioBuffer; blob: Blob; duration: number }> {
  const sampleRate = 44100;
  let duration = 1.0;

  switch (type) {
    case 'vine-boom':
      duration = 1.8;
      break;
    case 'metal-pipe':
      duration = 2.4;
      break;
    case 'bruh':
      duration = 0.9;
      break;
    case 'taco-bell':
      duration = 2.2;
      break;
    case 'roblox-oof':
      duration = 0.45;
      break;
    case 'airhorn':
      duration = 1.4;
      break;
    case 'skibidi':
      duration = 1.5;
      break;
    case 'doge-huh':
      duration = 0.7;
      break;
    case 'boing':
      duration = 0.8;
      break;
    case 'sad-violin':
      duration = 2.5;
      break;
    case 'cha-ching':
      duration = 1.2;
      break;
    case 'whoosh':
      duration = 0.9;
      break;
  }

  const offlineCtx = new OfflineAudioContext(2, Math.floor(sampleRate * duration), sampleRate);

  if (type === 'vine-boom') {
    // Sub-bass pitch drop + distorted kick transient + filtered noise tail
    const osc = offlineCtx.createOscillator();
    const oscGain = offlineCtx.createGain();
    const distortion = offlineCtx.createWaveShaper();

    // Soft clip curve
    const curve = new Float32Array(512);
    for (let i = 0; i < 512; i++) {
      const x = (i * 2) / 512 - 1;
      curve[i] = Math.tanh(x * 3.5);
    }
    distortion.curve = curve;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, 0);
    osc.frequency.exponentialRampToValueAtTime(32, 0.45);
    osc.frequency.linearRampToValueAtTime(24, duration);

    oscGain.gain.setValueAtTime(0, 0);
    oscGain.gain.linearRampToValueAtTime(1.0, 0.015);
    oscGain.gain.exponentialRampToValueAtTime(0.35, 0.3);
    oscGain.gain.exponentialRampToValueAtTime(0.001, duration);

    // Boom body
    osc.connect(distortion);
    distortion.connect(oscGain);
    oscGain.connect(offlineCtx.destination);
    osc.start(0);
    osc.stop(duration);

    // Low end rumble noise
    const noiseBuffer = offlineCtx.createBuffer(1, sampleRate * duration, sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.4;
    }
    const noiseSrc = offlineCtx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, 0);
    filter.frequency.exponentialRampToValueAtTime(40, duration);

    const noiseGain = offlineCtx.createGain();
    noiseGain.gain.setValueAtTime(0.6, 0);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, duration);

    noiseSrc.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(offlineCtx.destination);
    noiseSrc.start(0);
    noiseSrc.stop(duration);
  } else if (type === 'metal-pipe') {
    // Metal pipe falling sound: dense bank of resonant high Q metallic modes + clatter bursts
    const modes = [480, 720, 1140, 1580, 2240, 3120, 4400, 5600];
    const delays = [0.0, 0.04, 0.09, 0.16, 0.25, 0.36];

    delays.forEach((del, strikeIdx) => {
      modes.forEach((freq, modeIdx) => {
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        osc.type = modeIdx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq * (1 + (Math.random() - 0.5) * 0.05), del);

        const decay = 0.4 + (1 / (modeIdx + 1)) * 1.8;
        const initialVol = (0.25 / (strikeIdx + 1)) * (0.8 / (modeIdx * 0.3 + 1));

        gain.gain.setValueAtTime(0, del);
        gain.gain.linearRampToValueAtTime(initialVol, del + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, Math.min(duration, del + decay));

        osc.connect(gain);
        gain.connect(offlineCtx.destination);
        osc.start(del);
        osc.stop(Math.min(duration, del + decay));
      });
    });
  } else if (type === 'bruh') {
    // Vocal Formant downwards slide (F1: 500-400Hz, F2: 1100-800Hz)
    const osc = offlineCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(145, 0);
    osc.frequency.exponentialRampToValueAtTime(85, 0.55);

    const f1 = offlineCtx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(580, 0);
    f1.frequency.exponentialRampToValueAtTime(420, 0.6);
    f1.Q.setValueAtTime(4.0, 0);

    const f2 = offlineCtx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(1150, 0);
    f2.frequency.exponentialRampToValueAtTime(750, 0.6);
    f2.Q.setValueAtTime(4.5, 0);

    const gain = offlineCtx.createGain();
    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(0.8, 0.04);
    gain.gain.setValueAtTime(0.7, 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, duration);

    osc.connect(f1);
    osc.connect(f2);
    f1.connect(gain);
    f2.connect(gain);
    gain.connect(offlineCtx.destination);
    osc.start(0);
    osc.stop(duration);
  } else if (type === 'taco-bell') {
    // Tubular bell strike (Bong)
    const partials = [185, 370, 520, 830, 1180, 1620, 2400];
    partials.forEach((freq, idx) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, 0);

      const decay = 2.0 / (idx * 0.4 + 1);
      const amp = 0.5 / (idx + 1);

      gain.gain.setValueAtTime(0, 0);
      gain.gain.linearRampToValueAtTime(amp, 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, decay);

      osc.connect(gain);
      gain.connect(offlineCtx.destination);
      osc.start(0);
      osc.stop(duration);
    });
  } else if (type === 'roblox-oof') {
    // Quick vocal gasp / grunt
    const osc = offlineCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, 0);
    osc.frequency.exponentialRampToValueAtTime(180, 0.3);

    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(850, 0);
    filter.Q.setValueAtTime(3.0, 0);

    const gain = offlineCtx.createGain();
    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(0.9, 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(offlineCtx.destination);
    osc.start(0);
    osc.stop(duration);
  } else if (type === 'airhorn') {
    // Stadium Airhorn chords: D5 + G5 + A5 blips with rapid brass attack
    const freqs = [587.33, 783.99, 880.0];
    const bursts = [0.0, 0.28, 0.56];

    bursts.forEach((burstTime) => {
      freqs.forEach((f) => {
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f * 0.96, burstTime);
        osc.frequency.linearRampToValueAtTime(f, burstTime + 0.04);

        gain.gain.setValueAtTime(0, burstTime);
        gain.gain.linearRampToValueAtTime(0.25, burstTime + 0.02);
        gain.gain.setValueAtTime(0.23, burstTime + 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, burstTime + 0.24);

        osc.connect(gain);
        gain.connect(offlineCtx.destination);
        osc.start(burstTime);
        osc.stop(burstTime + 0.25);
      });
    });
  } else if (type === 'skibidi') {
    // Fast rhythmic stutter synth hit
    const osc = offlineCtx.createOscillator();
    const gain = offlineCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, 0);
    osc.frequency.exponentialRampToValueAtTime(55, duration);

    // Stutter modulation
    const lfo = offlineCtx.createOscillator();
    const lfoGain = offlineCtx.createGain();
    lfo.type = 'square';
    lfo.frequency.setValueAtTime(16, 0);
    lfoGain.gain.setValueAtTime(0.5, 0);

    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, 0);
    filter.frequency.exponentialRampToValueAtTime(300, duration);

    gain.gain.setValueAtTime(0.8, 0);
    gain.gain.exponentialRampToValueAtTime(0.001, duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(offlineCtx.destination);
    osc.start(0);
    osc.stop(duration);
  } else if (type === 'doge-huh') {
    // Rising inquisitive cartoon pitch "Huh?"
    const osc = offlineCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, 0);
    osc.frequency.exponentialRampToValueAtTime(580, 0.45);

    const gain = offlineCtx.createGain();
    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(0.7, 0.05);
    gain.gain.setValueAtTime(0.65, 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, duration);

    osc.connect(gain);
    gain.connect(offlineCtx.destination);
    osc.start(0);
    osc.stop(duration);
  } else if (type === 'boing') {
    // Cartoon spring boing
    const carrier = offlineCtx.createOscillator();
    const modulator = offlineCtx.createOscillator();
    const modGain = offlineCtx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(180, 0);
    carrier.frequency.exponentialRampToValueAtTime(520, duration);

    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(28, 0);
    modulator.frequency.linearRampToValueAtTime(14, duration);
    modGain.gain.setValueAtTime(80, 0);
    modGain.gain.exponentialRampToValueAtTime(5, duration);

    modulator.connect(carrier.frequency);

    const gain = offlineCtx.createGain();
    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(0.8, 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, duration);

    carrier.connect(gain);
    gain.connect(offlineCtx.destination);
    carrier.start(0);
    modulator.start(0);
    carrier.stop(duration);
    modulator.stop(duration);
  } else if (type === 'sad-violin') {
    // Slow sorrowful minor phrase
    const freqs = [440, 392, 349.23]; // A4 -> G4 -> F4
    freqs.forEach((f, idx) => {
      const osc = offlineCtx.createOscillator();
      const vibrato = offlineCtx.createOscillator();
      const vibGain = offlineCtx.createGain();
      const gain = offlineCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, idx * 0.75);

      vibrato.frequency.setValueAtTime(5.5, idx * 0.75);
      vibGain.gain.setValueAtTime(8, idx * 0.75);
      vibrato.connect(osc.frequency);

      const filter = offlineCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, idx * 0.75);

      const startTime = idx * 0.75;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.15);
      gain.gain.setValueAtTime(0.25, startTime + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(offlineCtx.destination);
      osc.start(startTime);
      vibrato.start(startTime);
      osc.stop(startTime + 0.85);
      vibrato.stop(startTime + 0.85);
    });
  } else if (type === 'cha-ching') {
    // Mechanical click + resonant bells
    const clickOsc = offlineCtx.createOscillator();
    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(180, 0);
    const clickGain = offlineCtx.createGain();
    clickGain.gain.setValueAtTime(0.6, 0);
    clickGain.gain.exponentialRampToValueAtTime(0.001, 0.08);
    clickOsc.connect(clickGain);
    clickGain.connect(offlineCtx.destination);
    clickOsc.start(0);
    clickOsc.stop(0.1);

    // Coins bells
    const bellPitches = [1760, 2093, 2637, 3135];
    bellPitches.forEach((bp, idx) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(bp, 0.08 + idx * 0.04);

      gain.gain.setValueAtTime(0, 0.08 + idx * 0.04);
      gain.gain.linearRampToValueAtTime(0.25, 0.09 + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, duration);

      osc.connect(gain);
      gain.connect(offlineCtx.destination);
      osc.start(0.08 + idx * 0.04);
      osc.stop(duration);
    });
  } else {
    // Whoosh / Swish: White noise bandpass sweep
    const noiseBuffer = offlineCtx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noiseSrc = offlineCtx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;

    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, 0);
    filter.frequency.exponentialRampToValueAtTime(2400, 0.45);
    filter.frequency.exponentialRampToValueAtTime(150, duration);
    filter.Q.setValueAtTime(3.5, 0);

    const gain = offlineCtx.createGain();
    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(0.8, 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, duration);

    noiseSrc.connect(filter);
    filter.connect(gain);
    gain.connect(offlineCtx.destination);
    noiseSrc.start(0);
    noiseSrc.stop(duration);
  }

  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = bufferToWaveBlob(renderedBuffer);

  return {
    buffer: renderedBuffer,
    blob: wavBlob,
    duration: renderedBuffer.duration,
  };
}

// Decode user File/Blob to AudioBuffer
export async function decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  return await ctx.decodeAudioData(arrayBuffer.slice(0));
}

// Global active source for sound preview
let currentActiveSource: AudioBufferSourceNode | null = null;
let currentGainNode: GainNode | null = null;

export function playAudioBuffer(
  buffer: AudioBuffer,
  options?: {
    playbackRate?: number;
    volume?: number;
    loop?: boolean;
    onEnded?: () => void;
  }
): { stop: () => void } {
  stopCurrentPlayback();

  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = options?.playbackRate ?? 1.0;
  source.loop = options?.loop ?? false;

  const gain = ctx.createGain();
  gain.gain.value = options?.volume ?? 1.0;

  source.connect(gain);
  gain.connect(ctx.destination);

  source.onended = () => {
    if (currentActiveSource === source) {
      currentActiveSource = null;
    }
    options?.onEnded?.();
  };

  source.start(0);
  currentActiveSource = source;
  currentGainNode = gain;

  return {
    stop: () => {
      try {
        source.stop();
      } catch {
        // already stopped
      }
    },
  };
}

export function stopCurrentPlayback() {
  if (currentActiveSource) {
    try {
      currentActiveSource.stop();
    } catch {
      // ignore
    }
    currentActiveSource = null;
    currentGainNode = null;
  }
}
