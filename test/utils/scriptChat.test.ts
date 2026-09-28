import { describe, expect, it, vi } from 'vitest';
import { parseAssistantOutput, recoverScriptProposal, streamScriptChat } from '../../src/utils/scriptChat';
import { script } from '../fixtures';
import { saveMandatoryFormat } from '../../src/utils/scriptPrompts';

describe('chat de guiones', () => {
  it('separa el mensaje y una propuesta parcial o completa', () => {
    expect(parseAssistantOutput('<chat>He cambiado el gancho</chat><script># Nuevo')).toEqual({ chat: 'He cambiado el gancho', script: '# Nuevo' });
    expect(parseAssistantOutput('<chat>Listo</chat><script># Nuevo</script>')).toEqual({ chat: 'Listo', script: '# Nuevo' });
  });

  it('recupera el último bloque de guión solo cuando el contenido está vacío', () => {
    const withHistory = { ...script, content: '', chatHistory: [
      { role: 'assistant' as const, content: '<chat>Primera</chat><script># Versión 1</script>', timestamp: 1 },
      { role: 'assistant' as const, content: '<chat>Segunda</chat><script># Versión 2</script>', timestamp: 2 },
    ] };
    expect(recoverScriptProposal(withHistory)).toBe('# Versión 2');
    expect(recoverScriptProposal({ ...withHistory, content: '# Editado por el usuario' })).toBeNull();
  });

  it('procesa un stream NDJSON y entrega el resultado persistido', async () => {
    saveMandatoryFormat('Frases entre [NARRADOR] y [/NARRADOR].');
    const payload = [
      { type: 'delta', delta: '<chat>Vale</chat>' },
      { type: 'delta', delta: '<script># Guión</script>' },
      { type: 'done', user: { role: 'user', content: 'Cambia', timestamp: 1 }, assistant: { role: 'assistant', content: 'Respuesta', timestamp: 2 }, totalCost: 0.01, script },
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(payload.map((item) => JSON.stringify(item)).join('\n') + '\n', { status: 200 })));
    const onDelta = vi.fn();
    const result = await streamScriptChat(script, 'Cambia', onDelta);
    expect(onDelta).toHaveBeenLastCalledWith('<chat>Vale</chat><script># Guión</script>');
    expect(result.totalCost).toBe(0.01);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`/scripts/${script.id}/chat`), expect.objectContaining({ method: 'POST' }));
    const request = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string).mandatoryFormat).toBe('Frases entre [NARRADOR] y [/NARRADOR].');
    localStorage.removeItem('rotvault_script_mandatory_format_v1');
    vi.unstubAllGlobals();
  });
});
