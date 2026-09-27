import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OpenFileModal } from '../../src/components/OpenFileModal';
import { sound } from '../fixtures';

vi.mock('../../src/utils/audioStorage', () => ({ getSoundBlob: vi.fn().mockResolvedValue(new Blob(['RIFF'])) }));

describe('OpenFileModal', () => {
  it('descarga el WAV del sonido publicado', async () => {
    const objectUrl = vi.fn(() => 'blob:test');
    URL.createObjectURL = objectUrl;
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<OpenFileModal isOpen sound={sound} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Descarga Inmediata/ }));
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(objectUrl).toHaveBeenCalledWith(expect.any(Blob));
  });
});
