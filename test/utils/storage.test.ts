import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assetUrl, deleteScript, getScripts, getStockVideos, saveScript, saveStockVideo, uploadStockVideoFile } from '../../src/utils/storage';
import { script, stockVideo } from '../fixtures';

describe('storage API', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('lee guiones y vídeos de la API, no de IndexedDB', async () => {
    fetchMock.mockResolvedValueOnce(Response.json([script])).mockResolvedValueOnce(Response.json([stockVideo]));
    expect(await getScripts()).toEqual([script]);
    expect(await getStockVideos()).toEqual([stockVideo]);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      'http://127.0.0.1:3001/api/scripts', 'http://127.0.0.1:3001/api/stock-videos',
    ]);
  });

  it('guarda y borra un guión mediante peticiones HTTP', async () => {
    fetchMock.mockResolvedValueOnce(Response.json(script)).mockResolvedValueOnce(new Response(null, { status: 204 }));
    await saveScript(script);
    await deleteScript(script.id);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(script);
    expect(fetchMock.mock.calls[1][1].method).toBe('DELETE');
  });

  it('sube un vídeo real después de crear la ficha', async () => {
    const uploaded = { ...stockVideo, localPath: '/assets/videos/stock-100.mp4' };
    const file = new File(['mp4'], 'clip.mp4', { type: 'video/mp4' });
    fetchMock.mockResolvedValueOnce(Response.json(stockVideo)).mockResolvedValueOnce(Response.json(uploaded));
    expect(await saveStockVideo(stockVideo, file)).toEqual(uploaded);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'PUT', body: file });
    expect(assetUrl(uploaded.localPath)).toBe('http://127.0.0.1:3001/api/videos/stock-100.mp4');
  });
  it('elimina la ficha si falla la subida del archivo y conserva el error original', async () => {
    const file = new File(['video'], 'clip.webm', { type: 'video/webm' });
    fetchMock.mockResolvedValueOnce(Response.json(stockVideo))
      .mockResolvedValueOnce(Response.json({ error: 'Disco lleno' }, { status: 507 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(saveStockVideo(stockVideo, file)).rejects.toThrow('Disco lleno');
    expect(fetchMock.mock.calls[2][0]).toContain(`/stock-videos/${stockVideo.id}`);
    expect(fetchMock.mock.calls[2][1].method).toBe('DELETE');
  });

  it('conserva el error de subida aunque falle la limpieza de la ficha', async () => {
    const file = new File(['video'], 'clip.mp4', { type: 'video/mp4' });
    fetchMock.mockResolvedValueOnce(Response.json(stockVideo))
      .mockResolvedValueOnce(new Response('fallo', { status: 500 }))
      .mockRejectedValueOnce(new Error('sin conexión'));
    await expect(saveStockVideo(stockVideo, file)).rejects.toThrow('Error del servidor (500)');
  });

  it('evita la subida cuando solo se guarda una ficha y deduce MIME por extensión si falta', async () => {
    fetchMock.mockResolvedValueOnce(Response.json(stockVideo));
    expect(await saveStockVideo(stockVideo)).toEqual(stockVideo);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValueOnce(Response.json(stockVideo));
    const file = new File(['video'], 'clip.MOV');
    await uploadStockVideoFile('id/1', file);
    expect(fetchMock.mock.calls[1][0]).toContain('/stock-videos/id%2F1/file');
    expect(fetchMock.mock.calls[1][1].headers['Content-Type']).toBe('video/quicktime');
  });

  it('transforma rutas de imágenes y deja intactas las URL externas', () => {
    expect(assetUrl('/assets/images/portada con espacio.png')).toBe('http://127.0.0.1:3001/api/images/portada%20con%20espacio.png');
    expect(assetUrl('https://example.com/video.mp4')).toBe('https://example.com/video.mp4');
    expect(assetUrl()).toBeUndefined();
  });
});
