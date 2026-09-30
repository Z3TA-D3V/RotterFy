import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DownloadHub } from '../../src/components/DownloadHub';
import { cancelDownload, downloadSavedFile, listDownloads, startDownload } from '../../src/utils/downloads';

vi.mock('../../src/utils/downloads', () => ({
  listDownloads: vi.fn(), startDownload: vi.fn(), cancelDownload: vi.fn(), downloadSavedFile: vi.fn(),
}));

const job = { id: 'yt-test', url: 'https://www.youtube.com/watch?v=abcdefghijk', mode: 'audio' as const, category: null,
  state: 'downloading' as const, progress: 50, title: 'Vídeo', duration: 90, logs: [],
  startedAt: 1, finishedAt: null, error: null };

describe('DownloadHub', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(listDownloads).mockReset().mockResolvedValue([]);
    vi.mocked(startDownload).mockReset().mockResolvedValue(job);
    vi.mocked(cancelDownload).mockReset().mockResolvedValue(job);
    vi.mocked(downloadSavedFile).mockReset();
  });

  it('envía la URL en modo audio y muestra la tarea iniciada', async () => {
    render(<DownloadHub onCompleted={vi.fn()} categories={['b-roll']} />);
    fireEvent.change(screen.getByPlaceholderText('https://www.youtube.com/watch?v=...'), { target: { value: job.url } });
    fireEvent.click(screen.getByRole('button', { name: 'Solo audio WAV' }));
    fireEvent.click(screen.getByRole('button', { name: 'Descargar' }));
    await waitFor(() => expect(startDownload).toHaveBeenCalledWith(job.url, 'audio', undefined));
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
    const videoJob = { ...job, mode: 'video' as const, category: 'Montajes' };
    vi.mocked(startDownload).mockResolvedValue(videoJob);
    const onCompleted = vi.fn().mockResolvedValue(undefined);
    render(<DownloadHub onCompleted={onCompleted} categories={['b-roll']} />);
    fireEvent.change(screen.getByPlaceholderText('https://www.youtube.com/watch?v=...'), { target: { value: job.url } });
    fireEvent.change(screen.getByLabelText('Categoría del vídeo'), { target: { value: 'Montajes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Descargar' }));
    await waitFor(() => expect(startDownload).toHaveBeenCalledWith(job.url, 'video', 'Montajes'));
    expect(sessionStorage.getItem('rotvault_browser_downloads_v1')).toContain('yt-test');
    vi.mocked(listDownloads).mockResolvedValue([{ ...videoJob, state: 'done', progress: 100 }]);
    await waitFor(() => expect(downloadSavedFile).toHaveBeenCalledWith('yt-test'), { timeout: 2500 });
    expect(sessionStorage.getItem('rotvault_browser_downloads_v1')).not.toContain('yt-test');
  });
});
