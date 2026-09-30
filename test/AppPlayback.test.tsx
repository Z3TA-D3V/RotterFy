import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { sound, stockVideo } from './fixtures';

const playback = vi.hoisted(() => ({
  load: vi.fn(),
  play: vi.fn((_buffer: AudioBuffer, _options?: { playbackRate?: number }) => ({ stop: vi.fn() })),
}));

vi.mock('../src/utils/audioStorage', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/utils/audioStorage')>(),
  getSoundAudioBuffer: playback.load,
}));
vi.mock('../src/utils/audioEngine', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/utils/audioEngine')>(),
  playAudioBuffer: playback.play,
}));

import App from '../src/App';

describe('App playback lifecycle', () => {
  it('descarta una carga tardía cuando el usuario abandona la biblioteca', async () => {
    localStorage.setItem('rotvault_legacy_import_done', '1');
    let resolveAudio!: (buffer: AudioBuffer) => void;
    playback.load.mockReset().mockReturnValue(new Promise<AudioBuffer>((resolve) => { resolveAudio = resolve; }));
    playback.play.mockClear();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith('/sounds') ? Response.json([{ ...sound, file: 'sound-1.wav' }]) : Response.json([])));

    render(<App />);
    fireEvent.click(await screen.findByTitle(sound.title));
    await waitFor(() => expect(playback.load).toHaveBeenCalledWith(sound.id));
    fireEvent.click(screen.getByText('Guiones & Hooks'));
    resolveAudio({ duration: 2 } as AudioBuffer);
    await waitFor(() => expect(screen.queryByText(sound.title)).not.toBeInTheDocument());
    expect(playback.play).not.toHaveBeenCalled();
  });

  it('reinicia la reproducción con la velocidad recién elegida', async () => {
    localStorage.setItem('rotvault_legacy_import_done', '1');
    playback.load.mockReset().mockResolvedValue({ duration: 2 } as AudioBuffer);
    playback.play.mockClear();
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      if (options?.method === 'POST') return Response.json({ playCount: 3 });
      return String(input).endsWith('/sounds') ? Response.json([{ ...sound, file: 'sound-1.wav' }]) : Response.json([]);
    }));

    render(<App />);
    fireEvent.click(await screen.findByTitle(sound.title));
    await waitFor(() => expect(playback.play).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: '1.5x' }));
    await waitFor(() => expect(playback.play).toHaveBeenCalledTimes(2));
    expect(playback.play.mock.calls[1][1]).toEqual(expect.objectContaining({ playbackRate: 1.5 }));
  });

  it('detiene el sonido y retira el reproductor al cerrar la previsualización', async () => {
    localStorage.setItem('rotvault_legacy_import_done', '1');
    const stop = vi.fn();
    playback.load.mockReset().mockResolvedValue({ duration: 2 } as AudioBuffer);
    playback.play.mockReset().mockReturnValue({ stop });
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      if (options?.method === 'POST') return Response.json({ playCount: 1 });
      return String(input).endsWith('/sounds') ? Response.json([{ ...sound, file: 'sound-1.wav' }]) : Response.json([]);
    }));

    render(<App />);
    fireEvent.click(await screen.findByTitle(sound.title));
    await waitFor(() => expect(playback.play).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar reproductor de audio' }));
    expect(stop).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Cerrar reproductor de audio' })).not.toBeInTheDocument();
  });

  it('inicia el vídeo flotante directamente al pulsar la tarjeta', async () => {
    localStorage.setItem('rotvault_legacy_import_done', '1');
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith('/stock-videos')
        ? Response.json([{ ...stockVideo, localPath: `/assets/videos/${stockVideo.id}.mp4` }])
        : Response.json([])));

    render(<App />);
    fireEvent.click(screen.getByText('B-Roll & Videos'));
    fireEvent.click(await screen.findByRole('button', { name: `Reproducir ${stockVideo.title}` }));

    expect(play).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog', { name: `Visualizador de ${stockVideo.title}` })).toBeInTheDocument();
    expect(screen.getByLabelText(`Previsualización de ${stockVideo.title}`)).toBeInTheDocument();
  });
});
