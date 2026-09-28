import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SettingsHub } from '../../src/components/SettingsHub';
import { defaultSectionVisibility } from '../../src/utils/sectionVisibility';

afterEach(() => { vi.unstubAllGlobals(); localStorage.removeItem('rotvault_microphone_id_v1'); });

describe('SettingsHub', () => {
  it('permite alternar secciones y deja Opciones siempre accesible', () => {
    const onToggleSection = vi.fn();
    const onReset = vi.fn();
    render(<SettingsHub visibleSections={defaultSectionVisibility} onToggleSection={onToggleSection} onReset={onReset} />);
    expect(screen.getByLabelText('Mostrar Ingeniería Inversa')).not.toBeChecked();
    fireEvent.click(screen.getByLabelText('Mostrar Ingeniería Inversa'));
    expect(onToggleSection).toHaveBeenCalledWith('prompt');
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer secciones' }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('recuerda el micrófono elegido al volver a Opciones', async () => {
    vi.stubGlobal('navigator', { mediaDevices: {
      enumerateDevices: vi.fn(async () => [{ kind: 'audioinput', deviceId: 'usb-mic', label: 'Micrófono USB' }]),
    } });
    const props = { visibleSections: defaultSectionVisibility, onToggleSection: vi.fn(), onReset: vi.fn() };
    const view = render(<SettingsHub {...props} />);
    await waitFor(() => expect(screen.getByRole('option', { name: 'Micrófono USB' })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Micrófono'), { target: { value: 'usb-mic' } });
    expect(localStorage.getItem('rotvault_microphone_id_v1')).toBe('usb-mic');
    view.unmount();
    render(<SettingsHub {...props} />);
    expect(screen.getByLabelText('Micrófono')).toHaveValue('usb-mic');
  });
});
