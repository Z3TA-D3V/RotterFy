import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App';

describe('App', () => {
  it('consulta cada catálogo una sola vez al montar en StrictMode', async () => {
    localStorage.setItem('rotvault_legacy_import_done', '1');
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (/\/(sounds|scripts|stock-videos)$/.test(url)) {
        return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      throw new Error(`Petición inesperada: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<StrictMode><App /></StrictMode>);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls.map(([url]) => String(url)).sort()).toEqual([
      'http://127.0.0.1:3001/api/scripts',
      'http://127.0.0.1:3001/api/sounds',
      'http://127.0.0.1:3001/api/stock-videos',
    ]);
  });

  it('muestra un guión solo después de guardarlo en la API', async () => {
    localStorage.setItem('rotvault_legacy_import_done', '1');
    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      if (options?.method === 'POST' && String(input).endsWith('/scripts')) {
        return Response.json(JSON.parse(String(options.body)));
      }
      return Response.json([]);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    fireEvent.click(await screen.findByText('Guiones & Hooks'));
    fireEvent.click(screen.getByText(/Nuevo Gui/));
    fireEvent.change(screen.getByPlaceholderText(/framework de JS/), { target: { value: 'Idea guardada' } });
    fireEvent.click(screen.getByText(/Guardar Gui/));
    await waitFor(() => expect(screen.getByText('Idea guardada')).toBeInTheDocument());
    expect(fetchMock.mock.calls.some(([url, options]) => String(url).endsWith('/scripts') && options?.method === 'POST')).toBe(true);
  });
});
