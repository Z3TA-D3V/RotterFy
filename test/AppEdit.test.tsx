import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { sound } from './fixtures';

vi.mock('../src/components/WaveformTrimmer', () => ({ WaveformTrimmer: () => <div>Gráfica</div> }));
vi.mock('../src/utils/audioEngine', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/utils/audioEngine')>(),
  getAudioContext: () => ({ state: 'running' }),
  decodeAudioBlob: vi.fn().mockResolvedValue({ duration: 2, sampleRate: 44100, numberOfChannels: 1 }),
  sliceAndProcessAudioBuffer: () => ({ duration: 1, sampleRate: 44100, numberOfChannels: 1 }),
  bufferToWaveBlob: () => new Blob(['RIFF'], { type: 'audio/wav' }),
  extractWaveformPeaks: () => [0.5],
}));

describe('edición desde la biblioteca', () => {
  it('actualiza el sonido existente sin crear una segunda ficha', async () => {
    localStorage.setItem('rotvault_legacy_import_done', '1');
    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);
      if (options?.method === 'PUT' && url.endsWith(`/sounds/${sound.id}`)) {
        const body = JSON.parse(String(options.body));
        return Response.json({ ...body.sound, file: 'sound-1.wav' });
      }
      if (url.endsWith('/sounds')) return Response.json([{ ...sound, file: 'sound-1.wav' }]);
      if (url.endsWith('/audio/sound-1.wav')) return new Response('audio');
      return Response.json([]);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await screen.findByText(sound.title);
    fireEvent.click(screen.getByTitle('Editar o volver a recortar este sonido'));
    await screen.findByText('Gráfica');
    fireEvent.change(screen.getByPlaceholderText('Ej. Vine Boom Reverb #1'), { target: { value: 'Boom actualizado' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios en Librer/ }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url, options]) =>
      String(url).endsWith(`/sounds/${sound.id}`) && options?.method === 'PUT')).toBe(true));
    fireEvent.click(screen.getByText('Librería de Sonidos'));
    expect(await screen.findByText('Boom actualizado')).toBeInTheDocument();
    expect(screen.queryByText(sound.title)).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url, options]) => String(url).endsWith('/sounds') && options?.method === 'POST')).toHaveLength(0);
  });
});
