import { describe, expect, it, vi } from 'vitest';

const { renderRoot, createRoot } = vi.hoisted(() => ({
  renderRoot: vi.fn(),
  createRoot: vi.fn(),
}));
vi.mock('react-dom/client', () => ({ createRoot: createRoot.mockReturnValue({ render: renderRoot }) }));
vi.mock('../src/App', () => ({ default: () => <div>Aplicación</div> }));

describe('main', () => {
  it('monta la aplicación en el elemento root', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await import('../src/main');
    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(renderRoot).toHaveBeenCalledOnce();
  });
});
