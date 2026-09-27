import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScriptPreview } from '../../src/components/ScriptPreview';

describe('ScriptPreview', () => {
  it('muestra Markdown del guión con títulos, acotaciones y énfasis', () => {
    render(<ScriptPreview content={'# Gancho\n\n[CORTE A NEGRO]\n\n**NARRADOR:** Hola\n\n## Final'} />);
    expect(screen.getByRole('heading', { name: 'Gancho' })).toBeInTheDocument();
    expect(screen.getByText('[CORTE A NEGRO]')).toHaveClass('italic');
    expect(screen.getByText('NARRADOR:')).toHaveClass('font-semibold');
    expect(screen.getByRole('heading', { name: 'Final' })).toBeInTheDocument();
  });

  it('no ejecuta HTML recibido de la IA', () => {
    const { container } = render(<ScriptPreview content={'<script>alert(1)</script>\n\n**Texto**'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('Texto')).toBeInTheDocument();
  });
});
