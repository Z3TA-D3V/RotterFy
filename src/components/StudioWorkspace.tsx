import React, { useState, useRef, useEffect } from 'react';
import { 
  Scissors, 
  Upload, 
  Sparkles, 
  Download, 
  Check, 
  FolderPlus, 
  FileAudio, 
  Play, 
  Pause, 
  RotateCcw, 
  Sliders, 
  Image as ImageIcon,
  FolderOpen,
  Trash2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { WaveformTrimmer } from './WaveformTrimmer';
import { SoundItem, SoundCategory } from '../types';
import { 
  getAudioContext,
  decodeAudioBlob, 
  sliceAndProcessAudioBuffer, 
  bufferToWaveBlob, 
  extractWaveformPeaks,
  synthesizeBrainrotSound,
  playAudioBuffer,
  stopCurrentPlayback
} from '../utils/audioEngine';
import { saveSoundToDB } from '../utils/storage';

interface StudioWorkspaceProps {
  onSoundSaved: (sound: SoundItem) => void;
  onOpenFileLocation: (sound: SoundItem) => void;
  initialAudioBlob?: Blob | null;
  initialSound?: SoundItem | null;
}

export const PRESET_COVERS = [
  { id: 'sigma', label: 'Sigma 🗿', url: '/assets/images/sigma_gigachad.jpg' },
  { id: 'pipe', label: 'Metal Pipe 🪈', url: '/assets/images/metal_pipe.jpg' },
  { id: 'boom', label: 'Explosión 💥', url: '/assets/images/vine_boom.jpg' },
  { id: 'skull', label: 'Calavera 💀', emoji: '💀' },
  { id: 'doge', label: 'Huh Doge 🐕', emoji: '🐕' },
  { id: 'toilet', label: 'Skibidi 🚽', emoji: '🚽' },
  { id: 'bell', label: 'Taco Bell 🔔', emoji: '🔔' },
  { id: 'money', label: 'Cha-Ching 💰', emoji: '💰' },
];

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  onSoundSaved,
  onOpenFileLocation,
  initialAudioBlob,
  initialSound,
}) => {
  const [loadedBuffer, setLoadedBuffer] = useState<AudioBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Markers
  const [startSec, setStartSec] = useState<number>(0);
  const [endSec, setEndSec] = useState<number>(1.8);

  // Audio Processing Options
  const [fadeInSec, setFadeInSec] = useState<number>(0.02);
  const [fadeOutSec, setFadeOutSec] = useState<number>(0.04);
  const [gainMultiplier, setGainMultiplier] = useState<number>(1.0);
  const [normalize, setNormalize] = useState<boolean>(true);

  // Sound Metadata
  const [title, setTitle] = useState<string>('Vine Boom Cut #1');
  const [category, setCategory] = useState<SoundCategory>('brainrot');
  const [tagsString, setTagsString] = useState<string>('corte, meme, sfx');
  const [folder, setFolder] = useState<string>('Recortes');
  const [hotkey, setHotkey] = useState<string>('1');
  const [coverImage, setCoverImage] = useState<string>('/assets/images/sigma_gigachad.jpg');

  // Multi-cut session history
  const [sessionCuts, setSessionCuts] = useState<SoundItem[]>([]);
  const [lastSavedSound, setLastSavedSound] = useState<SoundItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const coverImageInputRef = useRef<HTMLInputElement | null>(null);

  // Mini preview playback for session cuts
  const [playingCutId, setPlayingCutId] = useState<string | null>(null);
  const cutPlayerRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (initialAudioBlob) {
      loadBlob(initialAudioBlob, initialSound?.title || 'archivo_audio.mp3');
      if (initialSound) {
        setTitle(`${initialSound.title} (Corte)`);
        setCategory(initialSound.category);
        setCoverImage(initialSound.coverImage || PRESET_COVERS[0].url || '');
        setFolder(initialSound.folder || 'Recortes');
      }
    }
  }, [initialAudioBlob, initialSound]);

  const loadBlob = async (blob: Blob, name: string) => {
    setIsLoadingFile(true);
    try {
      const buffer = await decodeAudioBlob(blob);
      setLoadedBuffer(buffer);
      setFileName(name);
      setStartSec(0);
      const initialDuration = Math.min(buffer.duration, 2.2);
      setEndSec(initialDuration);
      setLoadError(null);
      if (!title || title.includes('Vine Boom Cut')) {
        setTitle(`${name.replace(/\.[^/.]+$/, '')} #1`);
      }
    } catch (e) {
      console.error('Error decoding audio:', e);
      setLoadError('No se pudo decodificar el archivo de audio. Prueba con formato MP3 o WAV.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadBlob(file, file.name);
    }
  };

  // Generate 60-second Brainrot Demo Compilation
  const handleLoadDemoCompilation = async () => {
    setIsLoadingFile(true);
    try {
      const sampleRate = 44100;
      const compDuration = 60.0;
      const offlineCtx = new OfflineAudioContext(2, Math.floor(sampleRate * compDuration), sampleRate);

      // 1. Vine Boom at 1.5s
      const vb = await synthesizeBrainrotSound('vine-boom');
      const src1 = offlineCtx.createBufferSource();
      src1.buffer = vb.buffer;
      src1.connect(offlineCtx.destination);
      src1.start(1.5);

      // 2. Metal Pipe at 15.0s
      const mp = await synthesizeBrainrotSound('metal-pipe');
      const src2 = offlineCtx.createBufferSource();
      src2.buffer = mp.buffer;
      src2.connect(offlineCtx.destination);
      src2.start(15.0);

      // 3. Bruh at 29.5s
      const br = await synthesizeBrainrotSound('bruh');
      const src3 = offlineCtx.createBufferSource();
      src3.buffer = br.buffer;
      src3.connect(offlineCtx.destination);
      src3.start(29.5);

      // 4. Taco Bell at 44.0s
      const tb = await synthesizeBrainrotSound('taco-bell');
      const src4 = offlineCtx.createBufferSource();
      src4.buffer = tb.buffer;
      src4.connect(offlineCtx.destination);
      src4.start(44.0);

      const rendered = await offlineCtx.startRendering();
      setLoadedBuffer(rendered);
      setFileName('recopilacion_brainrot_60s_demo.mp3');
      setTitle('Vine Boom Extraído #1');
      setStartSec(1.4);
      setEndSec(3.4);
      setCoverImage('/assets/images/vine_boom.jpg');
    } catch (err) {
      console.error('Error generating demo compilation:', err);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setCoverImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Perform Slice & Save (Continuous Workflow)
  const handleSaveCut = async (shouldDownload = false) => {
    if (!loadedBuffer) return;

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const slicedBuffer = sliceAndProcessAudioBuffer(ctx, loadedBuffer, {
      startSec,
      endSec,
      fadeInSec,
      fadeOutSec,
      gainMultiplier,
      normalize,
    });

    const wavBlob = bufferToWaveBlob(slicedBuffer);
    const peaks = extractWaveformPeaks(slicedBuffer, 64);
    const cleanDuration = Math.round(slicedBuffer.duration * 100) / 100;
    const soundId = `cut-${Date.now()}`;

    const tags = tagsString
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const soundRecord: SoundItem = {
      id: soundId,
      title: title || `Corte ${cleanDuration}s`,
      category,
      tags: tags.length > 0 ? tags : ['recorte', 'brainrot'],
      duration: cleanDuration,
      coverImage: coverImage || PRESET_COVERS[0].url,
      waveformPeaks: peaks,
      addedAt: Date.now(),
      favorite: false,
      playCount: 0,
      hotkey: hotkey || undefined,
      originalFileName: fileName,
      folder: folder || 'Recortes',
      sourceType: 'trimmed-clip',
      audioBlob: wavBlob,
    };

    await saveSoundToDB(soundRecord, wavBlob, slicedBuffer);
    onSoundSaved(soundRecord);

    setSessionCuts((prev) => [soundRecord, ...prev]);
    setLastSavedSound(soundRecord);

    if (shouldDownload) {
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${soundRecord.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    }

    // Auto-advance title for the next cut from the same file!
    setTitle((prev) => {
      const match = prev.match(/^(.*?)(?:#|v|corte\s*)(\d+)$/i);
      if (match) {
        return `${match[1].trim()} #${parseInt(match[2], 10) + 1}`;
      }
      return `${prev} #2`;
    });
  };

  const handlePlayCut = (cut: SoundItem) => {
    if (playingCutId === cut.id) {
      if (cutPlayerRef.current) {
        cutPlayerRef.current.stop();
        cutPlayerRef.current = null;
      }
      setPlayingCutId(null);
      return;
    }

    stopCurrentPlayback();
    if (cut.audioBlob) {
      const audio = new Audio(URL.createObjectURL(cut.audioBlob));
      audio.play();
      cutPlayerRef.current = {
        stop: () => {
          audio.pause();
          audio.currentTime = 0;
        },
      };
      setPlayingCutId(cut.id);
      audio.onended = () => setPlayingCutId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-white/4 border border-white/8 backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 border border-white/10 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              Estudio de Recorte & Onda
              <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                Flujo Continuo No-Destructivo
              </span>
            </h2>
            <p className="text-xs text-neutral-400">
              Arrastra una compilación larga, haz zoom en los picos y extrae múltiples sonidos en cadena sin recargar el archivo.
            </p>
          </div>
        </div>

        {loadedBuffer && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-white/6 hover:bg-white/12 border border-white/10 text-xs text-neutral-300 hover:text-white transition-colors flex items-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Cambiar Archivo</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*"
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Main Workspace Body */}
      {!loadedBuffer ? (
        /* Empty State / Upload Dropzone */
        <div className="border-2 border-dashed border-white/15 hover:border-indigo-500/50 rounded-3xl p-12 text-center transition-all bg-white/2 hover:bg-white/4 space-y-5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="audio/*"
            className="hidden"
          />

          <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
            <Upload className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">
              Carga tu archivo o compilación de audio para empezar a recortar
            </h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
              Soporta MP3, WAV, M4A, OGG y WebM. Ideal para recopilaciones de 1 minuto de las que quieras extraer fragmentos de 1 a 3 segundos.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoadingFile}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              <FolderPlus className="w-4 h-4" />
              Examinar Archivo Local
            </button>

            <button
              onClick={handleLoadDemoCompilation}
              disabled={isLoadingFile}
              className="px-5 py-2.5 rounded-xl bg-white/6 hover:bg-white/12 border border-white/10 text-neutral-200 hover:text-white text-xs font-semibold transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              Cargar Recopilación Demo (60s)
            </button>
          </div>

          {isLoadingFile && (
            <div className="text-xs font-mono text-indigo-400 animate-pulse pt-2">
              Decodificando ondas de audio PCM en alta fidelidad...
            </div>
          )}

          {loadError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs max-w-md mx-auto">
              {loadError}
            </div>
          )}
        </div>
      ) : (
        /* Loaded Audio Workspace */
        <div className="space-y-6">
          {/* File Meta Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-white/4 border border-white/8 text-xs font-mono">
            <div className="flex items-center gap-2 text-neutral-300">
              <FileAudio className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-white truncate">{fileName}</span>
              <span className="text-neutral-500">|</span>
              <span className="text-neutral-400">{loadedBuffer.duration.toFixed(2)}s</span>
              <span className="text-neutral-500">|</span>
              <span className="text-neutral-400">{loadedBuffer.sampleRate} Hz</span>
              <span className="text-neutral-500">|</span>
              <span className="text-neutral-400">{loadedBuffer.numberOfChannels} ch</span>
            </div>

            <div className="text-neutral-400 text-[11px]">
              Selección actual: <span className="text-indigo-300 font-bold">{((endSec - startSec) || 0).toFixed(3)}s</span>
            </div>
          </div>

          {/* Interactive Waveform Trimmer with Zoom */}
          <WaveformTrimmer
            audioBuffer={loadedBuffer}
            startSec={startSec}
            endSec={endSec}
            onRangeChange={(start, end) => {
              setStartSec(start);
              setEndSec(end);
            }}
          />

          {/* Settings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Metadata Form (7 Cols) */}
            <div className="lg:col-span-7 p-5 rounded-3xl bg-[#13151f]/90 border border-white/8 space-y-4">
              <h3 className="text-xs font-semibold text-neutral-300 tracking-wider">
                DATOS DEL NUEVO SONIDO
              </h3>

              {/* Sound Title */}
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Nombre del Sonido</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Vine Boom Reverb #1"
                  className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Category, Folder, Hotkey */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SoundCategory)}
                    className="w-full h-9 px-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="brainrot" className="bg-[#12141e]">Brainrot</option>
                    <option value="meme" className="bg-[#12141e]">Meme</option>
                    <option value="impact" className="bg-[#12141e]">Impacto</option>
                    <option value="vocal" className="bg-[#12141e]">Vocal</option>
                    <option value="sfx" className="bg-[#12141e]">SFX</option>
                    <option value="game" className="bg-[#12141e]">Gaming</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Carpeta</label>
                  <input
                    type="text"
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    placeholder="Recortes"
                    className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Tecla Rápida</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={hotkey}
                    onChange={(e) => setHotkey(e.target.value.toUpperCase())}
                    placeholder="1, Q..."
                    className="w-full h-9 px-2 text-center rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Etiquetas (separadas por coma)
                </label>
                <input
                  type="text"
                  value={tagsString}
                  onChange={(e) => setTagsString(e.target.value)}
                  placeholder="boom, meme, viral"
                  className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Meme Cover Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] text-neutral-400">
                    Portada Meme Personalizada
                  </label>
                  <button
                    onClick={() => coverImageInputRef.current?.click()}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <ImageIcon className="w-3 h-3" />
                    Subir imagen propia
                  </button>
                  <input
                    type="file"
                    ref={coverImageInputRef}
                    onChange={handleCoverUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {PRESET_COVERS.map((preset) => {
                    const isSelected = coverImage === (preset.url || preset.emoji);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setCoverImage(preset.url || preset.emoji || '')}
                        className={`h-11 rounded-xl border flex items-center justify-center gap-1.5 text-xs transition-all overflow-hidden p-1 ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500/20 text-white ring-2 ring-indigo-500/30'
                            : 'border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {preset.url ? (
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-7 h-7 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="text-base">{preset.emoji}</span>
                        )}
                        <span className="text-[10px] truncate hidden sm:inline">
                          {preset.label.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Audio Processing Controls (5 Cols) */}
            <div className="lg:col-span-5 p-5 rounded-3xl bg-[#13151f]/90 border border-white/8 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-semibold text-neutral-300 tracking-wider mb-4">
                  PROCESAMIENTO DE AUDIO
                </h3>

                <div className="space-y-4">
                  {/* Fade In */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-neutral-400">Fade In (Aparición suave)</span>
                      <span className="font-mono text-neutral-300 text-[11px]">
                        {(fadeInSec * 1000).toFixed(0)} ms
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.01"
                      value={fadeInSec}
                      onChange={(e) => setFadeInSec(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Fade Out */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-neutral-400">Fade Out (Desvanecimiento)</span>
                      <span className="font-mono text-neutral-300 text-[11px]">
                        {(fadeOutSec * 1000).toFixed(0)} ms
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.01"
                      value={fadeOutSec}
                      onChange={(e) => setFadeOutSec(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Volume Gain Boost */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-neutral-400">Ganancia de Volumen</span>
                      <span className="font-mono text-neutral-300 text-[11px]">
                        {((gainMultiplier - 1) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.05"
                      value={gainMultiplier}
                      onChange={(e) => setGainMultiplier(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Normalization switch */}
                  <label className="flex items-center justify-between pt-2 cursor-pointer border-t border-white/6">
                    <div>
                      <span className="text-xs text-white font-medium block">
                        Normalizar Picos de Volumen
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        Ajusta al máximo volumen sin distorsión
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={normalize}
                      onChange={(e) => setNormalize(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-white/10 border-white/20"
                    />
                  </label>
                </div>
              </div>

              {/* Cut Actions */}
              <div className="space-y-2 pt-4 border-t border-white/6">
                <button
                  onClick={() => handleSaveCut(false)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Scissors className="w-4 h-4" />
                  <span>Cortar y Guardar en Librería</span>
                </button>

                <button
                  onClick={() => handleSaveCut(true)}
                  className="w-full py-2.5 rounded-2xl bg-white/6 hover:bg-white/12 border border-white/10 text-neutral-300 hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Guardar y Descargar .WAV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Session Cuts Shelf (Continuous Slicing Workflow) */}
          {sessionCuts.length > 0 && (
            <div className="p-5 rounded-3xl bg-[#11131c]/90 border border-white/8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-white tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Cortes Extraídos en esta Sesión ({sessionCuts.length})
                </h3>
                <span className="text-[11px] font-mono text-emerald-400">
                  ✓ Listos en IndexedDB & Portapapeles
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {sessionCuts.map((cut) => {
                  const isPlaying = playingCutId === cut.id;
                  return (
                    <div
                      key={cut.id}
                      className="p-3 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-between gap-3 group hover:border-white/15 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          onClick={() => handlePlayCut(cut)}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 transition-colors ${
                            isPlaying
                              ? 'bg-amber-500 text-black'
                              : 'bg-white/8 hover:bg-indigo-600 text-white'
                          }`}
                        >
                          {isPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <span className="text-xs font-medium text-white truncate block">
                            {cut.title}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400">
                            {cut.duration}s · {cut.category}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => onOpenFileLocation(cut)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-300 hover:bg-white/8 transition-colors"
                          title="Abrir en Carpeta Local"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
