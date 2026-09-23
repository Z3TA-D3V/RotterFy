import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  Scissors, 
  Music, 
  Sparkles, 
  Download, 
  Check, 
  Sliders, 
  FolderPlus, 
  Layers, 
  Image as ImageIcon,
  Volume2,
  FileAudio,
  Radio
} from 'lucide-react';
import { WaveformTrimmer } from './WaveformTrimmer';
import { SoundItem, SoundCategory } from '../types';
import { 
  getAudioContext,
  decodeAudioBlob, 
  sliceAndProcessAudioBuffer, 
  bufferToWaveBlob, 
  extractWaveformPeaks,
  synthesizeBrainrotSound
} from '../utils/audioEngine';
import { saveSoundToDB } from '../utils/storage';

interface AudioTrimmerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSoundSaved: (newSound: SoundItem) => void;
  initialAudioBlob?: Blob | null;
  initialSound?: SoundItem | null;
}

const PRESET_COVERS = [
  { id: 'sigma', label: 'Sigma 🗿', url: '/assets/images/sigma_gigachad.jpg' },
  { id: 'pipe', label: 'Metal Pipe 🪈', url: '/assets/images/metal_pipe.jpg' },
  { id: 'boom', label: 'Explosión 💥', url: '/assets/images/vine_boom.jpg' },
  { id: 'skull', label: 'Calavera 💀', emoji: '💀' },
  { id: 'doge', label: 'Huh Doge 🐕', emoji: '🐕' },
  { id: 'toilet', label: 'Skibidi 🚽', emoji: '🚽' },
  { id: 'bell', label: 'Taco Bell 🔔', emoji: '🔔' },
  { id: 'money', label: 'Cha-Ching 💰', emoji: '💰' },
];

export const AudioTrimmerModal: React.FC<AudioTrimmerModalProps> = ({
  isOpen,
  onClose,
  onSoundSaved,
  initialAudioBlob,
  initialSound,
}) => {
  const [loadedBuffer, setLoadedBuffer] = useState<AudioBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Range in seconds
  const [startSec, setStartSec] = useState<number>(0);
  const [endSec, setEndSec] = useState<number>(1.5);

  // Audio Processing Options
  const [fadeInSec, setFadeInSec] = useState<number>(0.02);
  const [fadeOutSec, setFadeOutSec] = useState<number>(0.04);
  const [gainMultiplier, setGainMultiplier] = useState<number>(1.0);
  const [normalize, setNormalize] = useState<boolean>(true);

  // Sound Metadata
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<SoundCategory>('brainrot');
  const [tagsString, setTagsString] = useState<string>('corte, brainrot, sfx');
  const [folder, setFolder] = useState<string>('Recortes');
  const [hotkey, setHotkey] = useState<string>('');
  const [coverImage, setCoverImage] = useState<string>('/assets/images/sigma_gigachad.jpg');

  // Success message & cut count
  const [savedCount, setSavedCount] = useState<number>(0);
  const [lastSavedName, setLastSavedName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const coverImageInputRef = useRef<HTMLInputElement | null>(null);

  // Load initial audio if passed
  useEffect(() => {
    if (initialAudioBlob) {
      loadBlob(initialAudioBlob, initialSound?.title || 'audio_source.mp3');
      if (initialSound) {
        setTitle(initialSound.title + ' (Corte)');
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
      const initialDuration = Math.min(buffer.duration, 2.5);
      setEndSec(initialDuration);
      setLoadError(null);
      if (!title) {
        setTitle(name.replace(/\.[^/.]+$/, '') + ' Cut');
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

  // Generate Demo 1-minute compilation for immediate testing
  const handleLoadDemoCompilation = async () => {
    setIsLoadingFile(true);
    try {
      const sampleRate = 44100;
      const compDuration = 60.0; // 60 seconds compilation!
      const offlineCtx = new OfflineAudioContext(2, sampleRate * compDuration, sampleRate);

      // Synthesize 4 sound bursts along the timeline
      // 1. Vine Boom at 2.0s
      const vb = await synthesizeBrainrotSound('vine-boom');
      const src1 = offlineCtx.createBufferSource();
      src1.buffer = vb.buffer;
      src1.connect(offlineCtx.destination);
      src1.start(2.0);

      // 2. Metal Pipe at 14.5s
      const mp = await synthesizeBrainrotSound('metal-pipe');
      const src2 = offlineCtx.createBufferSource();
      src2.buffer = mp.buffer;
      src2.connect(offlineCtx.destination);
      src2.start(14.5);

      // 3. Bruh at 28.0s
      const br = await synthesizeBrainrotSound('bruh');
      const src3 = offlineCtx.createBufferSource();
      src3.buffer = br.buffer;
      src3.connect(offlineCtx.destination);
      src3.start(28.0);

      // 4. Taco bell at 42.0s
      const tb = await synthesizeBrainrotSound('taco-bell');
      const src4 = offlineCtx.createBufferSource();
      src4.buffer = tb.buffer;
      src4.connect(offlineCtx.destination);
      src4.start(42.0);

      const rendered = await offlineCtx.startRendering();
      setLoadedBuffer(rendered);
      setFileName('recopilacion_brainrot_1min_demo.mp3');
      setTitle('Vine Boom Extraído');
      setStartSec(1.8);
      setEndSec(3.8);
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

  // Perform Slice & Save
  const handleSaveCut = async (shouldDownload = false) => {
    if (!loadedBuffer) return;

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    // Process sliced audio buffer with gain, normalization, fades
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
    };

    await saveSoundToDB(soundRecord, wavBlob, slicedBuffer);
    onSoundSaved(soundRecord);

    setSavedCount((prev) => prev + 1);
    setLastSavedName(soundRecord.title);

    // If requested, trigger instant file download
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
      const match = prev.match(/(.*?)(\d+)$/);
      if (match) {
        return `${match[1]}${parseInt(match[2], 10) + 1}`;
      }
      return `${prev} #2`;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#12141e] border border-white/12 shadow-2xl p-6 space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/8 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                Estudio de Recorte & Onda
                <span className="text-[11px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
                  Corte No-Destructivo
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Corta y extrae múltiples sonidos individuales de compilaciones largas en segundos.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Source File Selection / Drag & Drop */}
        {!loadedBuffer ? (
          <div className="border-2 border-dashed border-white/15 hover:border-indigo-500/50 rounded-2xl p-8 text-center transition-all bg-white/2 hover:bg-white/4 space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*"
              className="hidden"
            />

            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
              <Upload className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-sm font-medium text-white mb-1">
                Arrastra tu archivo o compilación de audio aquí
              </h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Soporta MP3, WAV, M4A, OGG y WebM de cualquier duración (1 min, 5 min, etc.).
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoadingFile}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                <FolderPlus className="w-4 h-4" />
                Examinar Archivo Local
              </button>

              <button
                onClick={handleLoadDemoCompilation}
                disabled={isLoadingFile}
                className="px-4 py-2.5 rounded-xl bg-white/6 hover:bg-white/12 border border-white/10 text-neutral-300 hover:text-white text-xs font-medium transition-all flex items-center gap-2"
                title="Genera una recopilación de 60 segundos con 4 sonidos para probar"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                Probar con Recopilación Demo (1 min)
              </button>
            </div>

            {isLoadingFile && (
              <div className="text-xs font-mono text-indigo-400 animate-pulse pt-2">
                Decodificando ondas de audio en alta fidelidad...
              </div>
            )}

            {loadError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs mt-2">
                {loadError}
              </div>
            )}
          </div>
        ) : (
          /* File Loaded: Full Trimmer Workspace */
          <div className="space-y-6">
            {/* File info bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white/4 border border-white/8 text-xs">
              <div className="flex items-center gap-2.5 truncate">
                <FileAudio className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-neutral-200 font-medium truncate">{fileName}</span>
                <span className="text-[11px] font-mono text-neutral-500">
                  ({Math.round(loadedBuffer.duration)}s)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-white/6 hover:bg-white/12 text-[11px] text-neutral-300 transition-colors"
                >
                  Cargar otro archivo
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="audio/*"
                  className="hidden"
                />
              </div>
            </div>

            {/* Interactive Waveform Canvas */}
            <WaveformTrimmer
              audioBuffer={loadedBuffer}
              startSec={startSec}
              endSec={endSec}
              onRangeChange={(start, end) => {
                setStartSec(start);
                setEndSec(end);
              }}
            />

            {/* Metadata & Audio Processing Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Left Column: Metadata & Cover */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-neutral-300 tracking-wider">
                  DATOS DEL SONIDO EXTRAÍDO
                </h3>

                {/* Title */}
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">
                    Nombre del sonido
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Vine Boom Reverb #2"
                    className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Category & Folder */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">
                      Categoría
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as SoundCategory)}
                      className="w-full h-9 px-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="brainrot">Brainrot</option>
                      <option value="meme">Meme Clásico</option>
                      <option value="impact">Impacto / Bass</option>
                      <option value="vocal">Voz / Gritos</option>
                      <option value="sfx">SFX / Transición</option>
                      <option value="game">Gaming</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">
                      Carpeta
                    </label>
                    <input
                      type="text"
                      value={folder}
                      onChange={(e) => setFolder(e.target.value)}
                      placeholder="Recortes"
                      className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Tags & Hotkey */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[11px] text-neutral-400 mb-1">
                      Etiquetas (separadas por coma)
                    </label>
                    <input
                      type="text"
                      value={tagsString}
                      onChange={(e) => setTagsString(e.target.value)}
                      placeholder="bass, meme, viral"
                      className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">
                      Tecla Rápida
                    </label>
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

                {/* Cover Image Picker */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] text-neutral-400">
                      Portada / Imagen Personalizada
                    </label>
                    <button
                      onClick={() => coverImageInputRef.current?.click()}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <ImageIcon className="w-3 h-3" />
                      Subir foto propia
                    </button>
                    <input
                      type="file"
                      ref={coverImageInputRef}
                      onChange={handleCoverUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  {/* Preset Covers Grid */}
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

              {/* Right Column: Audio Processing Controls */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-neutral-300 tracking-wider">
                  AJUSTES DE AUDIO DEL CORTE
                </h3>

                <div className="p-4 rounded-2xl bg-white/4 border border-white/8 space-y-4">
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
                  <label className="flex items-center justify-between pt-1 cursor-pointer">
                    <div>
                      <span className="text-xs text-white font-medium block">
                        Normalizar Picos de Volumen
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        Ajusta al máximo volumen sin saturar ni distorsionar
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

                {/* Status Callout when cuts are made */}
                {lastSavedName && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5 animate-fade-in">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-white">¡Sonido "{lastSavedName}" guardado en la librería!</span>
                      <p className="text-[11px] text-emerald-400/80 mt-0.5">
                        El archivo sigue cargado. Puedes mover los marcadores IN/OUT en la forma de onda para cortar el siguiente sonido de esta misma recopilación.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/8">
              <div className="text-xs text-neutral-400">
                {savedCount > 0 ? (
                  <span className="text-indigo-400 font-mono">
                    ✓ {savedCount} sonido{savedCount > 1 ? 's' : ''} extraído{savedCount > 1 ? 's' : ''} de este archivo
                  </span>
                ) : (
                  <span>Listo para cortar y catalogar</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSaveCut(true)}
                  className="px-4 py-2.5 rounded-xl bg-white/6 hover:bg-white/12 border border-white/10 text-neutral-200 text-xs font-medium transition-all flex items-center gap-2"
                  title="Guarda en la librería y descarga el archivo .wav a tu disco local"
                >
                  <Download className="w-4 h-4" />
                  Guardar & Descargar WAV
                </button>

                <button
                  onClick={() => handleSaveCut(false)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 active:scale-[0.98]"
                >
                  <Scissors className="w-4 h-4" />
                  Guardar en Librería
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
