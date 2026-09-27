import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScriptsHub } from '../../src/components/ScriptsHub';
import { sound, script } from '../fixtures';
import * as scriptChat from '../../src/utils/scriptChat';

describe('ScriptsHub', () => {
  it('crea, guarda y duplica un guión con el preset inicial', async () => {
    const onSaveScript = vi.fn().mockResolvedValue(undefined);
    render(<ScriptsHub scripts={[]} sounds={[sound]} onSaveScript={onSaveScript} onDeleteScript={vi.fn()} onPlaySoundById={vi.fn()} />);
    expect(screen.queryByText('Asistente de IA')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Crear guión' }));
    expect(screen.getByText('Asistente de IA')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Video de prueba' } });
    fireEvent.change(screen.getByLabelText('Guión (Markdown)'), { target: { value: '# Inicio' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(onSaveScript).toHaveBeenCalledWith(expect.objectContaining({ title: 'Video de prueba', content: '# Inicio', model: 'gpt-6-luna', systemPromptUsed: expect.stringContaining('Running Gags') })));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Duplicar' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Duplicar' }));
    await waitFor(() => expect(onSaveScript).toHaveBeenCalledWith(expect.objectContaining({ title: 'Video de prueba (copia)', chatHistory: [] })));
  });

  it('carga un guión previo y lo elimina tras confirmación', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onDeleteScript = vi.fn().mockResolvedValue(undefined);
    render(<ScriptsHub scripts={[script]} sounds={[sound]} onSaveScript={vi.fn().mockResolvedValue(undefined)} onDeleteScript={onDeleteScript} onPlaySoundById={vi.fn()} />);
    fireEvent.click(screen.getByText(script.title));
    fireEvent.click(screen.getByRole('tab', { name: 'Editar Markdown' }));
    expect(screen.getByLabelText('Guión (Markdown)')).toHaveValue(script.content);
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(onDeleteScript).toHaveBeenCalledWith(script.id));
  });

  it('muestra una propuesta en el editor mientras llega y la guarda solo al aplicarla', async () => {
    const onSaveScript = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(scriptChat, 'streamScriptChat').mockImplementation(async (current, _message, onDelta) => {
      onDelta('<chat>He rehecho el inicio</chat><script># Nuevo gancho</script>');
      return { user: { role: 'user', content: 'Cambia', timestamp: 1 },
        assistant: { role: 'assistant', content: '<chat>He rehecho el inicio</chat><script># Nuevo gancho</script>', timestamp: 2, usage: { input_tokens: 1, output_tokens: 2, total_tokens: 3 }, cost: 0.001 },
        totalCost: 0.001, script: current };
    });
    render(<ScriptsHub scripts={[script]} sounds={[]} onSaveScript={onSaveScript} onDeleteScript={vi.fn()} onPlaySoundById={vi.fn()} />);
    fireEvent.click(screen.getByText(script.title));
    fireEvent.change(screen.getByLabelText('Mensaje para IA'), { target: { value: 'Cambia' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }));
    expect(await screen.findByRole('heading', { name: 'Nuevo gancho' }, { timeout: 5000 })).toBeInTheDocument();
    expect(onSaveScript).not.toHaveBeenCalledWith(expect.objectContaining({ content: '# Nuevo gancho' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar cambios de IA' }));
    await waitFor(() => expect(onSaveScript).toHaveBeenCalledWith(expect.objectContaining({ content: '# Nuevo gancho' })));
    vi.restoreAllMocks();
  });

  it('recupera un guión del historial y Guardar persiste el texto visible', async () => {
    const recovered = { ...script, content: '', chatHistory: [
      { role: 'user' as const, content: 'Escribe un guión', timestamp: 1 },
      { role: 'assistant' as const, content: '<chat>Hecho</chat><script># Guión recuperado\nTexto completo</script>', timestamp: 2 },
    ] };
    const onSaveScript = vi.fn().mockResolvedValue(undefined);
    render(<ScriptsHub scripts={[recovered]} sounds={[]} onSaveScript={onSaveScript} onDeleteScript={vi.fn()} onPlaySoundById={vi.fn()} />);
    fireEvent.click(screen.getByText(script.title));
    expect(await screen.findByRole('heading', { name: 'Guión recuperado' }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText(/pendiente de guardar/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(onSaveScript).toHaveBeenCalledWith(expect.objectContaining({ content: '# Guión recuperado\nTexto completo' })));
    expect(screen.queryByText(/pendiente de guardar/)).not.toBeInTheDocument();
  });

  it('permite ocupar todo el espacio y alternar entre lectura y edición', async () => {
    render(<ScriptsHub scripts={[{ ...script, content: '# Título\n\n**Narrador**' }]} sounds={[]} onSaveScript={vi.fn()} onDeleteScript={vi.fn()} onPlaySoundById={vi.fn()} />);
    fireEvent.click(screen.getByText(script.title));
    expect(await screen.findByRole('heading', { name: 'Título' }, { timeout: 5000 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar guión' }));
    expect(screen.queryByText('Asistente de IA')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Lista de guiones')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Editar Markdown' }));
    expect(screen.getByLabelText('Guión (Markdown)')).toHaveValue('# Título\n\n**Narrador**');
    fireEvent.click(screen.getByRole('button', { name: 'Salir de lectura' }));
    expect(screen.getByText('Asistente de IA')).toBeInTheDocument();
  });

  it('ajusta el tamaño del guión en ambos modos y recuerda la preferencia', async () => {
    localStorage.removeItem('rotvault_script_zoom_v1');
    const props = { scripts: [{ ...script, content: '# Título\n\nPrimer párrafo' }], sounds: [],
      onSaveScript: vi.fn(), onDeleteScript: vi.fn(), onPlaySoundById: vi.fn() };
    const view = render(<ScriptsHub {...props} />);
    fireEvent.click(screen.getByText(script.title));
    const preview = await screen.findByLabelText('Vista previa del guión', {}, { timeout: 5000 });
    expect(screen.getByLabelText('Zoom actual')).toHaveTextContent('90%');
    expect(preview).toHaveStyle({ fontSize: '14.4px' });
    fireEvent.click(screen.getByRole('button', { name: 'Alejar guión' }));
    expect(screen.getByLabelText('Zoom actual')).toHaveTextContent('80%');
    expect(preview).toHaveStyle({ fontSize: '12.8px' });
    fireEvent.click(screen.getByRole('tab', { name: 'Editar Markdown' }));
    expect(screen.getByLabelText('Guión (Markdown)')).toHaveStyle({ fontSize: '12.8px' });
    view.unmount();
    render(<ScriptsHub {...props} />);
    fireEvent.click(screen.getByText(script.title));
    expect(screen.getByLabelText('Zoom actual')).toHaveTextContent('80%');
    localStorage.removeItem('rotvault_script_zoom_v1');
  });
});
