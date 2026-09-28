import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SystemPromptsHub } from '../../src/components/SystemPromptsHub';
import { JOSEJU_PRESET_NAME, loadMandatoryFormat, loadPromptPresets } from '../../src/utils/scriptPrompts';
import { ScriptsHub } from '../../src/components/ScriptsHub';
import { script } from '../fixtures';

afterEach(() => { localStorage.removeItem('rotvault_script_prompt_presets_v1'); localStorage.removeItem('rotvault_script_mandatory_format_v1'); vi.restoreAllMocks(); });

describe('SystemPromptsHub', () => {
  it('crea, edita, renombra y elimina estilos persistentes', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<SystemPromptsHub />);
    expect(screen.getByRole('note')).toHaveTextContent('Formato obligatorio · Global');
    expect(screen.getByRole('note')).toHaveTextContent('[NARRADOR]');
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo' }));
    fireEvent.change(screen.getByLabelText('Nombre del estilo'), { target: { value: 'Análisis propio' } });
    fireEvent.change(screen.getByLabelText('Contenido del System Prompt'), { target: { value: 'Escribe con claridad.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar estilo' }));
    expect(loadPromptPresets()['Análisis propio']).toBe('Escribe con claridad.');

    fireEvent.change(screen.getByLabelText('Contenido del System Prompt'), { target: { value: 'Escribe con humor.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar estilo' }));
    expect(loadPromptPresets()['Análisis propio']).toBe('Escribe con humor.');

    fireEvent.change(screen.getByLabelText('Nombre del estilo'), { target: { value: 'Humor propio' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar estilo' }));
    expect(loadPromptPresets()['Análisis propio']).toBeUndefined();
    expect(loadPromptPresets()['Humor propio']).toBe('Escribe con humor.');

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar estilo' }));
    expect(loadPromptPresets()['Humor propio']).toBeUndefined();
  });

  it('edita el formato global sin modificar el estilo seleccionado', () => {
    const view = render(<SystemPromptsHub />);
    const originalStyle = screen.getByLabelText('Contenido del System Prompt') as HTMLTextAreaElement;
    const originalPrompt = originalStyle.value;
    fireEvent.click(screen.getByRole('button', { name: 'Editar formato obligatorio' }));
    fireEvent.change(screen.getByLabelText('Formato obligatorio'), { target: { value: 'Cada frase hablada va entre [NARRADOR] y [/NARRADOR].' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar formato obligatorio' }));
    expect(loadMandatoryFormat()).toBe('Cada frase hablada va entre [NARRADOR] y [/NARRADOR].');
    expect(screen.getByRole('note')).toHaveTextContent(loadMandatoryFormat());
    expect(originalStyle).toHaveValue(originalPrompt);
    expect(loadPromptPresets()[JOSEJU_PRESET_NAME]).toBe(originalPrompt);
    view.unmount();
    render(<ScriptsHub scripts={[script]} sounds={[]} onSaveScript={vi.fn()} onDeleteScript={vi.fn()} onPlaySoundById={vi.fn()} />);
    fireEvent.click(screen.getByText(script.title));
    fireEvent.click(screen.getByRole('button', { name: 'Estilo de IA / System Prompt' }));
    expect(screen.getByRole('note')).toHaveTextContent(loadMandatoryFormat());
  });

  it('no borra el formato global cuando se intenta guardar vacío', () => {
    render(<SystemPromptsHub />);
    const previous = loadMandatoryFormat();
    fireEvent.click(screen.getByRole('button', { name: 'Editar formato obligatorio' }));
    fireEvent.change(screen.getByLabelText('Formato obligatorio'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar formato obligatorio' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe un formato obligatorio');
    expect(loadMandatoryFormat()).toBe(previous);
  });

  it('permite borrar un preset inicial sin que reaparezca al volver', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const view = render(<SystemPromptsHub />);
    expect(screen.getByLabelText('Nombre del estilo')).toHaveValue(JOSEJU_PRESET_NAME);
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar estilo' }));
    expect(loadPromptPresets()[JOSEJU_PRESET_NAME]).toBeUndefined();
    view.unmount();
    render(<SystemPromptsHub />);
    expect(screen.queryByText(JOSEJU_PRESET_NAME)).not.toBeInTheDocument();
  });

  it('ofrece en el asistente un estilo creado en la vista dedicada', async () => {
    const view = render(<SystemPromptsHub />);
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo' }));
    fireEvent.change(screen.getByLabelText('Nombre del estilo'), { target: { value: 'Mi narración' } });
    fireEvent.change(screen.getByLabelText('Contenido del System Prompt'), { target: { value: 'Usa frases cortas.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar estilo' }));
    view.unmount();

    const onSaveScript = vi.fn().mockResolvedValue(undefined);
    render(<ScriptsHub scripts={[script]} sounds={[]} onSaveScript={onSaveScript} onDeleteScript={vi.fn()} onPlaySoundById={vi.fn()} />);
    fireEvent.click(screen.getByText(script.title));
    fireEvent.click(screen.getByRole('button', { name: 'Estilo de IA / System Prompt' }));
    fireEvent.change(screen.getByLabelText('Preset de estilo'), { target: { value: 'Mi narración' } });
    await waitFor(() => expect(onSaveScript).toHaveBeenCalledWith(expect.objectContaining({ systemPromptUsed: 'Usa frases cortas.' })));
  });
});
