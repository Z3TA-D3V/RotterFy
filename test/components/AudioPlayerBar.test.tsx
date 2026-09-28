import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AudioPlayerBar } from '../../src/components/AudioPlayerBar';
import { sound } from '../fixtures';

describe('AudioPlayerBar', () => {
  it('controla reproducción, velocidad y acceso al recorte', () => {
    const onTogglePlay = vi.fn();
    const onChangeSpeed = vi.fn();
    const onOpenTrimmer = vi.fn();
    render(<AudioPlayerBar sound={sound} isPlaying={false} progress={0.5} currentTime={1}
      duration={2} isLooping={false} playbackSpeed={1} volume={1} onTogglePlay={onTogglePlay}
      onStop={vi.fn()} onToggleLoop={vi.fn()} onChangeSpeed={onChangeSpeed}
      onChangeVolume={vi.fn()} onOpenTrimmer={onOpenTrimmer} onOpenFileLocation={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '1.5x' }));
    fireEvent.click(screen.getByTitle('Recortar en Estudio'));
    fireEvent.click(screen.getByTitle('Detener').previousElementSibling as HTMLElement);
    expect(onChangeSpeed).toHaveBeenCalledWith(1.5);
    expect(onOpenTrimmer).toHaveBeenCalledWith(sound);
    expect(onTogglePlay).toHaveBeenCalledOnce();
  });
  it('se pliega y vuelve a abrir sin detener el sonido ni perder su estado', () => {
    const onStop = vi.fn();
    const onTogglePlay = vi.fn();
    const props = {
      sound, isPlaying: true, progress: 0.5, currentTime: 1, duration: 2,
      isLooping: false, playbackSpeed: 1, volume: 1, onTogglePlay, onStop,
      onToggleLoop: vi.fn(), onChangeSpeed: vi.fn(), onChangeVolume: vi.fn(),
      onOpenTrimmer: vi.fn(), onOpenFileLocation: vi.fn(),
    };
    const { rerender } = render(<AudioPlayerBar {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar reproductor' }));
    expect(screen.queryByTitle('Detener')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mostrar reproductor' })).toHaveAttribute('aria-expanded', 'false');
    expect(onStop).not.toHaveBeenCalled();
    expect(onTogglePlay).not.toHaveBeenCalled();

    rerender(<AudioPlayerBar {...props} currentTime={1.5} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar reproductor' }));
    expect(screen.getByText('1.5s / 2.0s')).toBeInTheDocument();
    expect(screen.getByTitle('Detener')).toBeInTheDocument();
  });
});
