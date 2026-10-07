import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(() => { vi.useRealTimers(); });
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.removeItem('rotvault_download_max_size_gb_v1');
    vi.mocked(listDownloads).mockReset().mockResolvedValue([]);
    vi.mocked(startDownload).mockReset().mockResolvedValue(job);
    vi.mocked(retryDownload).mockReset().mockResolvedValue(job);
    vi.mocked(cancelDownload).mockReset().mockResolvedValue(job);
    vi.mocked(downloadSavedFile).mockReset();
  });

  it('deja de consultar sin tareas activas y actualiza al volver a la sección', async () => {
    vi.useFakeTimers();
    const view = render(<DownloadHub onCompleted={vi.fn()} categories={[]} />);
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(listDownloads).toHaveBeenCalledTimes(1);
    view.rerender(<DownloadHub onCompleted={vi.fn()} categories={[]} isVisible={false} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(listDownloads).toHaveBeenCalledTimes(1);
    view.rerender(<DownloadHub onCompleted={vi.fn()} categories={[]} />);
    await act(async () => {});
    expect(listDownloads).toHaveBeenCalledTimes(2);
  });

  it('sigue tareas ocultas y detiene las consultas al terminar', async () => {
    vi.useFakeTimers();
    vi.mocked(listDownloads).mockResolvedValue([job]);
    const onCompleted = vi.fn().mockResolvedValue(undefined);
    const view = render(<DownloadHub onCompleted={onCompleted} categories={[]} />);
    await act(async () => {});
    view.rerender(<DownloadHub onCompleted={onCompleted} categories={[]} isVisible={false} />);
    await act(async () => {});
    const callsBeforeCompletion = vi.mocked(listDownloads).mock.calls.length;
    vi.mocked(listDownloads).mockResolvedValue([{ ...job, state: 'done', progress: 100 }]);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(onCompleted).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(listDownloads).toHaveBeenCalledTimes(callsBeforeCompletion + 1);
  });

  it('espera la respuesta antes de programar otra consulta y cancela al desmontar', async () => {
    vi.useFakeTimers();
    vi.mocked(listDownloads).mockResolvedValueOnce([job]);
    let resolveRequest!: (jobs: typeof job[]) => void;
    vi.mocked(listDownloads).mockImplementationOnce(() => new Promise((resolve) => { resolveRequest = resolve; }));
    const view = render(<DownloadHub onCompleted={vi.fn()} categories={[]} />);
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
    expect(listDownloads).toHaveBeenCalledTimes(2);
    const signal = vi.mocked(listDownloads).mock.calls[1][0];
    view.unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => { resolveRequest([job]); });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(listDownloads).toHaveBeenCalledTimes(2);
  });

  it('no reinicia las consultas al cambiar el callback de la biblioteca', async () => {
    vi.useFakeTimers();
    vi.mocked(listDownloads).mockResolvedValue([job]);
    const oldCallback = vi.fn().mockResolvedValue(undefined);
    const view = render(<DownloadHub onCompleted={oldCallback} categories={[]} />);
    await act(async () => {});
    const newCallback = vi.fn().mockResolvedValue(undefined);
    view.rerender(<DownloadHub onCompleted={newCallback} categories={[]} />);
    expect(listDownloads).toHaveBeenCalledTimes(1);
    vi.mocked(listDownloads).mockResolvedValue([{ ...job, state: 'done' }]);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(newCallback).toHaveBeenCalledTimes(1);
    expect(oldCallback).not.toHaveBeenCalled();
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
