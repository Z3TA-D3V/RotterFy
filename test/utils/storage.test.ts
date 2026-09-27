import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assetUrl, deleteScript, getScripts, getStockVideos, saveScript, saveStockVideo } from '../../src/utils/storage';
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
});
