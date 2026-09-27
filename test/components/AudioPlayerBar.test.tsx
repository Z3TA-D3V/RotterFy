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
});
