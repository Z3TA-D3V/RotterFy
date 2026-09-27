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
  it('filtra por etiqueta, carpeta, favoritos y categoría', () => {
    const items = [sound, { ...sound, id: 'other', title: 'Otro sonido', tags: ['animal'], folder: 'Mascotas', category: 'sfx' as const, favorite: false }];
    const props = { sounds: items, currentPlayingId: null, playbackProgress: 0,
      onPlaySound: vi.fn(), onStopSound: vi.fn(), onOpenTrimmerForSound: vi.fn(),
      onOpenFileLocation: vi.fn(), onToggleFavorite: vi.fn(), onDeleteSound: vi.fn() };
    const { rerender } = render(<SoundLibrary {...props} searchQuery="animal" />);
    expect(screen.getByText('Otro sonido')).toBeInTheDocument();
    expect(screen.queryByText(sound.title)).not.toBeInTheDocument();
    rerender(<SoundLibrary {...props} searchQuery="mascotas" />);
    expect(screen.getByText('Otro sonido')).toBeInTheDocument();
    rerender(<SoundLibrary {...props} searchQuery="" />);
    fireEvent.click(screen.getByText(/Favoritos/));
    expect(screen.queryByText('Otro sonido')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('SFX'));
    expect(screen.getByText('Otro sonido')).toBeInTheDocument();
    expect(screen.queryByText(sound.title)).not.toBeInTheDocument();
  });

  it('en vista de lista ordena por popularidad y detiene el sonido activo', () => {
    const onStopSound = vi.fn();
    const onOpenFileLocation = vi.fn();
    const onOpenTrimmerForSound = vi.fn();
    const high = { ...sound, id: 'high', title: 'Más reproducido', playCount: 100, addedAt: 1 };
    const low = { ...sound, id: 'low', title: 'Menos reproducido', playCount: 1, addedAt: 2 };
    render(<SoundLibrary sounds={[low, high]} currentPlayingId="high" playbackProgress={0.5}
      onPlaySound={vi.fn()} onStopSound={onStopSound} onOpenTrimmerForSound={onOpenTrimmerForSound}
      onOpenFileLocation={onOpenFileLocation} onToggleFavorite={vi.fn()} onDeleteSound={vi.fn()} searchQuery="" />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'popular' } });
    fireEvent.click(screen.getByTitle('Vista compacta de lista'));
    const titles = screen.getAllByText(/^(Más|Menos) reproducido$/).map((node) => node.textContent);
    expect(titles).toEqual(['Más reproducido', 'Menos reproducido']);
    fireEvent.click(screen.getByRole('button', { name: 'Detener Más reproducido' }));
    expect(onStopSound).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getAllByText('Abrir Carpeta')[0]);
    expect(onOpenFileLocation).toHaveBeenCalledWith(high);
    fireEvent.click(screen.getAllByTitle('Recortar')[0]);
    expect(onOpenTrimmerForSound).toHaveBeenCalledWith(high);
  });
});
