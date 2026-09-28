import type { ScriptBeat, ScriptChatMessage } from '../types';
import { loadMandatoryFormat } from './scriptPrompts';

const apiBase = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api').replace(/\/$/, '');

export function parseAssistantOutput(raw: string): { chat: string; script: string | null } {
  const chat = raw.match(/<chat>([\s\S]*?)(?:<\/chat>|$)/i)?.[1]?.trim();
  const script = raw.match(/<script>([\s\S]*?)(?:<\/script>|$)/i)?.[1] ?? null;
  return { chat: chat ?? raw.replace(/<script>[\s\S]*?(?:<\/script>|$)/gi, '').replace(/<\/?chat>/gi, '').trim(), script };
}

export function recoverScriptProposal(script: ScriptBeat): string | null {
  if (script.content.trim()) return null;
  for (const entry of [...(script.chatHistory || [])].reverse()) {
    if (entry.role !== 'assistant') continue;
    const proposal = parseAssistantOutput(entry.content).script;
    if (proposal?.trim()) return proposal;
  }
  return null;
}

export async function streamScriptChat(
  script: ScriptBeat,
  message: string,
  onDelta: (raw: string) => void,
  signal?: AbortSignal,
): Promise<{ user: ScriptChatMessage; assistant: ScriptChatMessage; totalCost: number; script: ScriptBeat }> {
  const response = await fetch(`${apiBase}/scripts/${encodeURIComponent(script.id)}/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, model: script.model || 'gpt-6-luna', reasoningEffort: script.reasoningEffort || 'low', mandatoryFormat: loadMandatoryFormat() }), signal,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Error del servidor (${response.status})`);
  }
  if (!response.body) throw new Error('La respuesta de IA no admite streaming');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let raw = '';
  let done: { user: ScriptChatMessage; assistant: ScriptChatMessage; totalCost: number; script: ScriptBeat } | null = null;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.type === 'delta') { raw += event.delta; onDelta(raw); }
      if (event.type === 'done') done = event;
      if (event.type === 'error') throw new Error(event.error);
    }
  }
  if (!done) throw new Error('La respuesta de IA se interrumpió');
  return done;
}
