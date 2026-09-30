import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VideoPlayerBar, type VideoPlayerHandle } from '../../src/components/VideoPlayerBar';
import { stockVideo } from '../fixtures';

describe('VideoPlayerBar', () => {
  it('abre grande y mantiene el mismo vídeo al minimizar y ampliar desde la miniatura', () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const onClose = vi.fn();
    const ref = createRef<VideoPlayerHandle>();
    const { container } = render(<VideoPlayerBar ref={ref} video={{ ...stockVideo, localPath: `/assets/videos/${stockVideo.id}.mp4` }} onClose={onClose} />);
    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    ref.current?.play();
    expect(play).toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: `Visualizador de ${stockVideo.title}` })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Minimizar vídeo' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(container.querySelector('video')).toBe(video);
    fireEvent.click(screen.getByRole('button', { name: `Ampliar vídeo ${stockVideo.title}` }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(container.querySelector('video')).toBe(video);
    expect(play).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Minimizar vídeo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar reproductor de vídeo' }));
    expect(container.querySelector('video')).toBe(video);
    expect(screen.getByRole('button', { name: 'Mostrar reproductor de vídeo' })).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar reproductor de vídeo' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('permite detener, buscar y cambiar el volumen', () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const { container } = render(<VideoPlayerBar video={{ ...stockVideo, localPath: `/assets/videos/${stockVideo.id}.mp4` }} onClose={vi.fn()} />);
    const video = container.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'duration', { configurable: true, value: 60 });
    fireEvent.loadedMetadata(video);
    fireEvent.change(screen.getByRole('slider', { name: 'Posición del vídeo' }), { target: { value: '20' } });
    expect(video.currentTime).toBe(20);
    fireEvent.change(screen.getByRole('slider', { name: 'Volumen del vídeo' }), { target: { value: '0.5' } });
    expect(video.volume).toBe(0.5);
    fireEvent.click(screen.getByRole('button', { name: 'Detener vídeo' }));
    expect(pause).toHaveBeenCalled();
    expect(video.currentTime).toBe(0);
  });
});
