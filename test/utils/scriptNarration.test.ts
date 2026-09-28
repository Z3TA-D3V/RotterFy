import { describe, expect, it } from 'vitest';
import { extractNarration } from '../../src/utils/scriptNarration';

describe('extractNarration', () => {
  it('une en orden solo las intervenciones habladas', () => {
    const content = '# Título\n\n[CORTE A NEGRO]\n[NARRADOR]\nPrimera frase.\nOtra frase.\n[/NARRADOR]\n\n## Escena 2\n[NARRADOR]Segunda intervención.[/NARRADOR]\n[EDITOR]No decir esto[/EDITOR]';
    expect(extractNarration(content)).toBe('Primera frase.\nOtra frase.\n\nSegunda intervención.');
  });

  it('ignora bloques vacíos y no muestra el guión completo si faltan las etiquetas', () => {
    expect(extractNarration('[NARRADOR]  [/NARRADOR]\n[narrador] Hola [/narrador]')).toBe('Hola');
    expect(extractNarration('# Título\nTexto sin bloques')).toBe('');
  });
});
