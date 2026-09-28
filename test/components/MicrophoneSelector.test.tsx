import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MicrophoneSelector } from '../../src/components/MicrophoneSelector';

afterEach(() => vi.unstubAllGlobals());

describe('MicrophoneSelector', () => {
  it('solicita acceso, detecta los dispositivos y permite elegir uno', async () => {
    let allowed = false;
    const stop = vi.fn();
    const enumerateDevices = vi.fn(async () => allowed ? [
      { kind: 'audioinput', deviceId: 'usb-mic', label: 'Micrófono USB' },
      { kind: 'audiooutput', deviceId: 'speaker', label: 'Altavoz' },
    ] : []);
    const getUserMedia = vi.fn(async () => { allowed = true; return { getTracks: () => [{ stop }] }; });
    vi.stubGlobal('navigator', { mediaDevices: { enumerateDevices, getUserMedia, addEventListener: vi.fn(), removeEventListener: vi.fn() } });
    const onChange = vi.fn();
    render(<MicrophoneSelector value="" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Detectar micrófonos' }));
    await waitFor(() => expect(screen.getByRole('option', { name: 'Micrófono USB' })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Micrófono'), { target: { value: 'usb-mic' } });
    expect(onChange).toHaveBeenCalledWith('usb-mic');
    expect(stop).toHaveBeenCalledOnce();
  });
});
