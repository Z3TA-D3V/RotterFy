import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DownloadHub } from '../../src/components/DownloadHub';
import { cancelDownload, downloadSavedFile, DownloadRequestError, listDownloads, retryDownload, startDownload } from '../../src/utils/downloads';

vi.mock('../../src/utils/downloads', () => ({
  listDownloads: vi.fn(), startDownload: vi.fn(), retryDownload: vi.fn(), cancelDownload: vi.fn(), downloadSavedFile: vi.fn(),
  DownloadRequestError: class extends Error { constructor(message: string, readonly existingId?: string) { super(message); } },
}));

const job = { id: 'yt-test', url: 'https://www.youtube.com/watch?v=abcdefghijk', mode: 'audio' as const, category: null,
  quality: null, maxSizeGb: 10, isShort: false, formatFallback: false,
  state: 'downloading' as const, progress: 50, title: 'Vídeo', duration: 90, logs: [],
  startedAt: 1, finishedAt: null, error: null };

describe('DownloadHub', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.removeItem('rotvault_download_max_size_gb_v1');
    vi.mocked(listDownloads).mockReset().mockResolvedValue([]);
    vi.mocked(startDownload).mockReset().mockResolvedValue(job);
    vi.mocked(retryDownload).mockReset().mockResolvedValue(job);
    vi.mocked(cancelDownload).mockReset().mockResolvedValue(job);
    vi.mocked(downloadSavedFile).mockReset();
  });

  it('envía la URL en modo audio y muestra la tarea iniciada', async () => {
    render(<DownloadHub onCompleted={vi.fn()} categories={['b-roll']} />);
    fireEvent.change(screen.getByPlaceholderText('https://www.youtube.com/watch?v=...'), { target: { value: job.url } });
    fireEvent.click(screen.getByRole('button', { name: 'Solo audio WAV' }));
    fireEvent.click(screen.getByRole('button', { name: 'Descargar' }));
    await waitFor(() => expect(startDownload).toHaveBeenCalledWith(job.url, 'audio', undefined, undefined, 10));
    expect(await screen.findByText('Vídeo')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('actualiza la biblioteca al aparecer una descarga terminada', async () => {
    vi.mocked(listDownloads).mockResolvedValue([{ ...job, state: 'done', progress: 100 }]);
    const onCompleted = vi.fn().mockResolvedValue(undefined);
    render(<DownloadHub onCompleted={onCompleted} categories={['b-roll']} />);
    await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
  });

  it('permite cancelar una tarea en curso', async () => {
    vi.mocked(listDownloads).mockResolvedValue([job]);
    render(<DownloadHub onCompleted={vi.fn()} categories={['b-roll']} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar descarga' }));
    await waitFor(() => expect(cancelDownload).toHaveBeenCalledWith(job.id));
  });

  it('envía una categoría nueva y descarga en Chrome al terminar', async () => {
    const videoJob = { ...job, mode: 'video' as const, category: 'Montajes', quality: 'best' as const };
    vi.mocked(startDownload).mockResolvedValue(videoJob);
    const onCompleted = vi.fn().mockResolvedValue(undefined);
    render(<DownloadHub onCompleted={onCompleted} categories={['b-roll']} />);
    fireEvent.change(screen.getByPlaceholderText('https://www.youtube.com/watch?v=...'), { target: { value: job.url } });
    fireEvent.change(screen.getByLabelText('Categoría del vídeo'), { target: { value: 'Montajes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Descargar' }));
    await waitFor(() => expect(startDownload).toHaveBeenCalledWith(job.url, 'video', 'Montajes', 'best', 10));
    expect(sessionStorage.getItem('rotvault_browser_downloads_v1')).toContain('yt-test');
    vi.mocked(listDownloads).mockResolvedValue([{ ...videoJob, state: 'done', progress: 100 }]);
    await waitFor(() => expect(downloadSavedFile).toHaveBeenCalledWith('yt-test'), { timeout: 2500 });
    expect(sessionStorage.getItem('rotvault_browser_downloads_v1')).not.toContain('yt-test');
  });

  it('permite reintentar tareas recuperadas', async () => {
    const interrupted = { ...job, mode: 'video' as const, quality: '720' as const, isShort: true,
      state: 'interrupted' as const, error: 'La API se reinició durante la descarga' };
    vi.mocked(listDownloads).mockResolvedValue([interrupted]);
    vi.mocked(retryDownload).mockResolvedValue({ ...interrupted, id: 'yt-retry', state: 'checking', error: null });
    render(<DownloadHub onCompleted={vi.fn()} categories={['Shorts']} />);
    expect(await screen.findByText(/Short · límite 10 GB · Interrumpida/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar descarga' }));
    await waitFor(() => expect(retryDownload).toHaveBeenCalledWith(job.id));
  });

  it('envía la calidad y el límite de tamaño elegidos para vídeo', async () => {
    render(<DownloadHub onCompleted={vi.fn()} categories={['Shorts']} />);
    fireEvent.change(screen.getByPlaceholderText('https://www.youtube.com/watch?v=...'), { target: { value: job.url } });
    fireEvent.change(screen.getByLabelText('Calidad máxima'), { target: { value: '480' } });
    fireEvent.change(screen.getByLabelText('Límite máximo por archivo (GB)'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Descargar' }));
    await waitFor(() => expect(startDownload).toHaveBeenCalledWith(job.url, 'video', 'b-roll', '480', 7));
    expect(localStorage.getItem('rotvault_download_max_size_gb_v1')).toBe('7');
  });

  it('impide pedir un archivo por encima de 10 GB', () => {
    render(<DownloadHub onCompleted={vi.fn()} categories={['b-roll']} />);
    fireEvent.change(screen.getByPlaceholderText('https://www.youtube.com/watch?v=...'), { target: { value: job.url } });
    fireEvent.change(screen.getByLabelText('Límite máximo por archivo (GB)'), { target: { value: '11' } });
    expect(screen.getByRole('button', { name: 'Descargar' })).toBeDisabled();
  });

  it('ofrece el archivo existente al detectar un duplicado', async () => {
    vi.mocked(startDownload).mockRejectedValue(new DownloadRequestError('Ya está en la biblioteca', 'yt-existing'));
    render(<DownloadHub onCompleted={vi.fn()} categories={['b-roll']} />);
    fireEvent.change(screen.getByPlaceholderText('https://www.youtube.com/watch?v=...'), { target: { value: job.url } });
    fireEvent.click(screen.getByRole('button', { name: 'Descargar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Descargar archivo existente' }));
    expect(downloadSavedFile).toHaveBeenCalledWith('yt-existing');
  });
});
