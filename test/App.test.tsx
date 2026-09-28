import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { sound } from './fixtures';

describe('App', () => {
  it('abre System Prompts como subvista de Guiones y oculta el enlace al salir', async () => {
    localStorage.setItem('rotvault_legacy_import_done', '1');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json([])));
    render(<App />);
    expect(screen.queryByRole('button', { name: 'System Prompts' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Guiones & Hooks/ }));
    fireEvent.click(screen.getByRole('button', { name: 'System Prompts' }));
    expect(await screen.findByRole('heading', { name: 'System Prompts' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Librería de Sonidos/ }));
    expect(screen.queryByRole('button', { name: 'System Prompts' })).not.toBeInTheDocument();
  });

  it('restaura el orden guardado de los enlaces del centro de mando', () => {
    localStorage.setItem('rotvault_section_order_v1', JSON.stringify(['scripts', 'library']));
    localStorage.setItem('rotvault_legacy_import_done', '1');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json([])));
    render(<App />);
    expect([...document.querySelectorAll('[data-nav-id]')].slice(0, 2).map((item) => item.getAttribute('data-nav-id'))).toEqual(['scripts', 'library']);
    localStorage.removeItem('rotvault_section_order_v1');
  });

  it('oculta Prompt Maestro por defecto y recuerda las secciones elegidas', async () => {
    localStorage.removeItem('rotvault_visible_sections_v1');
    localStorage.setItem('rotvault_legacy_import_done', '1');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json([])));
    const view = render(<App />);
    expect(screen.queryByRole('button', { name: /Prompt Maestro/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Opciones/ }));
    fireEvent.click(screen.getByLabelText('Mostrar Ingeniería Inversa'));
    expect(screen.getAllByRole('button', { name: /Prompt Maestro/ })).toHaveLength(2);
    view.unmount();
    render(<App />);
    expect(screen.getAllByRole('button', { name: /Prompt Maestro/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /Opciones/ }));
    fireEvent.click(screen.getByLabelText('Mostrar Ingeniería Inversa'));
    expect(screen.queryByRole('button', { name: /Prompt Maestro/ })).not.toBeInTheDocument();
    localStorage.removeItem('rotvault_visible_sections_v1');
  });

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
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo Guión' }));
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Idea guardada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Idea guardada/ })).toBeInTheDocument());
    expect(fetchMock.mock.calls.some(([url, options]) => String(url).endsWith('/scripts') && options?.method === 'POST')).toBe(true);
  });
  it('mantiene el favorito anterior cuando la API rechaza el cambio', async () => {
    localStorage.setItem('rotvault_legacy_import_done', '1');
    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      if (options?.method === 'PATCH') return Response.json({ error: 'No se pudo guardar' }, { status: 500 });
      if (String(input).endsWith('/sounds')) return Response.json([{ ...sound, file: 'sound-1.wav' }]);
      return Response.json([]);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await screen.findByText(sound.title);
    fireEvent.click(screen.getByTitle('Marcar favorito'));
    expect(await screen.findByRole('status')).toHaveTextContent('No se pudo guardar');
    expect(screen.getByTitle('Marcar favorito')).toBeInTheDocument();
  });

  it('solo quita un sonido de la biblioteca cuando la API confirma su borrado', async () => {
    localStorage.setItem('rotvault_legacy_import_done', '1');
    let rejectDelete = true;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      if (options?.method === 'DELETE') return rejectDelete
        ? Response.json({ error: 'Archivo bloqueado' }, { status: 500 })
        : new Response(null, { status: 204 });
      if (String(input).endsWith('/sounds')) return Response.json([{ ...sound, file: 'sound-1.wav' }]);
      return Response.json([]);
    });
    vi.stubGlobal('fetch', fetchMock);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    await screen.findByText(sound.title);
    fireEvent.click(screen.getByTitle('Eliminar sonido y su archivo local'));
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'DELETE')).toHaveLength(0);

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByTitle('Eliminar sonido y su archivo local'));
    expect(await screen.findByRole('status')).toHaveTextContent('Archivo bloqueado');
    expect(screen.getByText(sound.title)).toBeInTheDocument();

    rejectDelete = false;
    fireEvent.click(screen.getByTitle('Eliminar sonido y su archivo local'));
    await waitFor(() => expect(screen.queryByText(sound.title)).not.toBeInTheDocument());
  });
});
