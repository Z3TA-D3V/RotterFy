import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SoundboardMode } from '../../src/components/SoundboardMode';
import { sound } from '../fixtures';

describe('SoundboardMode', () => {
  it('dispara el sonido con su tecla y detiene todo con Escape', () => {
    const onPlaySound = vi.fn();
    const onStopAll = vi.fn();
    render(<SoundboardMode sounds={[sound]} onPlaySound={onPlaySound} onStopAll={onStopAll} currentPlayingId={null} />);
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onPlaySound).toHaveBeenCalledWith(expect.objectContaining({ id: sound.id }));
    expect(onStopAll).toHaveBeenCalledOnce();
    expect(screen.getByText(sound.title)).toBeInTheDocument();
  });
});
