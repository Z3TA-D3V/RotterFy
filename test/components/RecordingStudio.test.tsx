import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecordingStudio } from '../../src/components/RecordingStudio';
import { script } from '../fixtures';
import * as recordings from '../../src/utils/scriptRecordings';
import * as audioEngine from '../../src/utils/audioEngine';

vi.mock('../../src/components/WaveformTrimmer', () => ({
  WaveformTrimmer: ({ onRangeChange }: { onRangeChange: (start: number, end: number) => void }) =>
    <button onClick={() => onRangeChange(1, 3)}>Cortar audio</button>,
}));
vi.mock('../../src/utils/scriptRecordings', () => ({
  listScriptRecordings: vi.fn(), saveScriptRecording: vi.fn(), getScriptRecordingAudio: vi.fn(),
  saveEditedRecording: vi.fn(), deleteScriptRecording: vi.fn(),
}));
vi.mock('../../src/utils/audioEngine', () => ({
  decodeAudioBlob: vi.fn(), getAudioContext: vi.fn(), sliceAndProcessAudioBuffer: vi.fn(), bufferToWaveBlob: vi.fn(),
}));

const take = { id: 'take-12345678', scriptId: script.id, createdAt: 123, originalFile: 'take-12345678.webm', editedFile: null, bytes: 10 };

class FakeRecorder {
  static isTypeSupported() { return true; }
  mimeType = 'audio/webm';
  state = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(_stream: MediaStream, _options?: MediaRecorderOptions) {}
  start() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['voice'], { type: 'audio/webm' }) }); this.onstop?.(); }
}

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('RecordingStudio', () => {
  it('muestra en el teleprónter solo el texto de los bloques de narrador', async () => {
    vi.mocked(recordings.listScriptRecordings).mockResolvedValue([]);
    const content = '# Título oculto\n[PLANO DEL JUEGO]\n[NARRADOR]Primera frase.[/NARRADOR]\n## Otro título\n[NARRADOR]\nSegunda frase.\n[/NARRADOR]';
    render(<RecordingStudio scripts={[{ ...script, content }]} />);
    const prompter = await screen.findByLabelText('Texto del teleprónter');
    expect(prompter).toHaveTextContent('Primera frase.');
    expect(prompter).toHaveTextContent('Segunda frase.');
    expect(prompter).not.toHaveTextContent('Título oculto');
    expect(prompter).not.toHaveTextContent('PLANO DEL JUEGO');
    expect(prompter).not.toHaveTextContent('[NARRADOR]');
  });

  it('avisa cuando un guión no tiene narración etiquetada', async () => {
    vi.mocked(recordings.listScriptRecordings).mockResolvedValue([]);
    render(<RecordingStudio scripts={[script]} />);
    expect(await screen.findByLabelText('Texto del teleprónter')).toHaveTextContent('no tiene bloques [NARRADOR]');
    expect(screen.getByRole('button', { name: 'Iniciar teleprónter' })).toBeDisabled();
  });

  it('carga los guiones existentes y guarda una toma con su ID', async () => {
    vi.mocked(recordings.listScriptRecordings).mockResolvedValue([]);
    vi.mocked(recordings.saveScriptRecording).mockResolvedValue(take);
    vi.mocked(recordings.getScriptRecordingAudio).mockResolvedValue(new Blob(['voice']));
    vi.mocked(audioEngine.decodeAudioBlob).mockResolvedValue({ duration: 5 } as AudioBuffer);
    const stopTrack = vi.fn();
    localStorage.setItem('rotvault_microphone_id_v1', 'usb-mic');
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] });
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    render(<RecordingStudio scripts={[script]} />);
    fireEvent.click(screen.getByText('Grabar voz'));
    await waitFor(() => expect(screen.getByText(/Detener/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Detener/));
    await waitFor(() => expect(recordings.saveScriptRecording).toHaveBeenCalledWith(script.id, expect.any(Blob)));
    expect(getUserMedia).toHaveBeenCalledWith({ audio: expect.objectContaining({ deviceId: { exact: 'usb-mic' } }) });
    expect(await screen.findByText(/Toma 1/)).toBeInTheDocument();
    expect(stopTrack).toHaveBeenCalled();
    localStorage.removeItem('rotvault_microphone_id_v1');
  });

  it('recupera una toma, aplica el corte y guarda una versión editada', async () => {
    vi.mocked(recordings.listScriptRecordings).mockResolvedValue([take]);
    vi.mocked(recordings.getScriptRecordingAudio).mockResolvedValue(new Blob(['voice']));
    vi.mocked(audioEngine.decodeAudioBlob).mockResolvedValue({ duration: 5 } as AudioBuffer);
    vi.mocked(audioEngine.sliceAndProcessAudioBuffer).mockReturnValue({ duration: 2 } as AudioBuffer);
    vi.mocked(audioEngine.bufferToWaveBlob).mockReturnValue(new Blob(['RIFF'], { type: 'audio/wav' }));
    vi.mocked(recordings.saveEditedRecording).mockResolvedValue({ ...take, editedFile: 'take-12345678-edited.wav' });
    render(<RecordingStudio scripts={[script]} />);
    fireEvent.click(await screen.findByText(/Toma 1/));
    fireEvent.click(await screen.findByText('Cortar audio'));
    fireEvent.change(screen.getByLabelText('Nivel de voz'), { target: { value: '1.5' } });
    fireEvent.click(screen.getByText('Guardar edición'));
    await waitFor(() => expect(recordings.saveEditedRecording).toHaveBeenCalledWith(script.id, take.id, expect.any(Blob), expect.objectContaining({ startSec: 1, endSec: 3, gain: 1.5 })));
    expect(audioEngine.sliceAndProcessAudioBuffer).toHaveBeenCalledWith(undefined, expect.anything(), expect.objectContaining({ startSec: 1, endSec: 3, gainMultiplier: 1.5 }));
    expect(await screen.findByText(/Toma 1.*Editada/)).toBeInTheDocument();
  });

  it('recupera los ajustes guardados al volver a abrir una toma', async () => {
    const editedTake = { ...take, editedFile: 'take-12345678-edited.wav', edit: {
      startSec: 1, endSec: 3, gain: 1.4, normalize: false, fadeIn: 0.2, fadeOut: 0.3,
    } };
    vi.mocked(recordings.listScriptRecordings).mockResolvedValue([editedTake]);
    vi.mocked(recordings.getScriptRecordingAudio).mockResolvedValue(new Blob(['voice']));
    vi.mocked(audioEngine.decodeAudioBlob).mockResolvedValue({ duration: 5 } as AudioBuffer);
    render(<RecordingStudio scripts={[script]} />);
    fireEvent.click(await screen.findByText(/Toma 1.*Editada/));
    await waitFor(() => expect(screen.getByLabelText('Nivel de voz')).toHaveValue('1.4'));
    expect(screen.getByLabelText('Normalizar voz')).not.toBeChecked();
    expect(screen.getByLabelText('Fundido de entrada')).toHaveValue(0.2);
  });

  it('desplaza a velocidad continua incluso cuando el navegador redondea scrollTop', () => {
    vi.mocked(recordings.listScriptRecordings).mockResolvedValue([]);
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrame = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    render(<RecordingStudio scripts={[{ ...script, content: '[NARRADOR]Texto para desplazarse[/NARRADOR]' }]} />);
    const prompter = screen.getByLabelText('Texto del teleprónter');
    let scroll = 0;
    Object.defineProperties(prompter, {
      scrollTop: { configurable: true, get: () => scroll, set: (value: number) => { scroll = Math.floor(value); } },
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 10_000 },
    });
    const advance = () => act(() => {
      for (let index = 0; index < 120; index++) {
        const callbacks = [...frames.values()];
        frames.clear();
        callbacks.forEach((callback) => callback(1000 + index * 16));
      }
    });
    fireEvent.change(screen.getByLabelText('Velocidad del teleprónter'), { target: { value: '64' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar teleprónter' }));
    advance();
    const at64 = scroll;
    expect(at64).toBeGreaterThan(100);
    fireEvent.click(screen.getByRole('button', { name: 'Pausar teleprónter' }));
    scroll = 0;
    fireEvent.change(screen.getByLabelText('Velocidad del teleprónter'), { target: { value: '65' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar teleprónter' }));
    advance();
    expect(scroll).toBeGreaterThan(at64);
    expect(scroll - at64).toBeLessThan(5);
  });
});
