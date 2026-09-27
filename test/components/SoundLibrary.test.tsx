import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SoundLibrary } from '../../src/components/SoundLibrary';
import { sound } from '../fixtures';

describe('SoundLibrary', () => {
  it('filtra sonidos y envía las acciones del elemento seleccionado', () => {
    const onPlaySound = vi.fn();
    const onToggleFavorite = vi.fn();
    const onDeleteSound = vi.fn();
    render(<SoundLibrary sounds={[sound, { ...sound, id: 'sound-2', title: 'Otro sonido', tags: [] }]}
      currentPlayingId={null} playbackProgress={0} onPlaySound={onPlaySound}
      onStopSound={vi.fn()} onOpenTrimmerForSound={vi.fn()} onOpenFileLocation={vi.fn()}
      onToggleFavorite={onToggleFavorite} onDeleteSound={onDeleteSound} searchQuery="boom" />);
    expect(screen.getAllByText('Vine Boom').length).toBeGreaterThan(0);
    expect(screen.queryByText('Otro sonido')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Marcar favorito'));
    fireEvent.click(screen.getByTitle('Eliminar sonido y su archivo local'));
    expect(onToggleFavorite).toHaveBeenCalledWith(sound.id);
    expect(onDeleteSound).toHaveBeenCalledWith(sound.id);
  });

  it('reproduce el sonido elegido de la cuadrícula', () => {
    const onPlaySound = vi.fn();
    render(<SoundLibrary sounds={[sound]} currentPlayingId={null} playbackProgress={0}
      onPlaySound={onPlaySound} onStopSound={vi.fn()} onOpenTrimmerForSound={vi.fn()}
      onOpenFileLocation={vi.fn()} onToggleFavorite={vi.fn()} onDeleteSound={vi.fn()} searchQuery="" />);
    fireEvent.click(screen.getByTitle(sound.title));
    expect(onPlaySound).toHaveBeenCalledWith(sound);
  });
});
