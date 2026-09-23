import React, { useState } from 'react';
import { 
  X, 
  FolderOpen, 
  Download, 
  Copy, 
  Check, 
  Terminal, 
  HardDrive, 
  ExternalLink,
  Sparkles,
  Volume2
} from 'lucide-react';
import { SoundItem } from '../types';
import { getSoundBlob } from '../utils/storage';

interface OpenFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  sound: SoundItem | null;
}

export const OpenFileModal: React.FC<OpenFileModalProps> = ({
  isOpen,
  onClose,
  sound,
}) => {
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedClipboardAudio, setCopiedClipboardAudio] = useState(false);
  const [isSavingDirect, setIsSavingDirect] = useState(false);
  const [saveDirectStatus, setSaveDirectStatus] = useState<string | null>(null);

  if (!isOpen || !sound) return null;

  const sanitizedFileName = `${sound.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.wav`;
  const defaultFolderPath = 'C:\\Usuarios\\Creador\\Descargas\\Sonidos';
  const fullFilePath = `${defaultFolderPath}\\${sanitizedFileName}`;
  const windowsCommand = `explorer.exe /select,"${fullFilePath}"`;

  // 1-Click Direct Download to local machine
  const handleDownload = async () => {
    let blob = sound.audioBlob;
    if (!blob) {
      blob = (await getSoundBlob(sound.id)) || undefined;
    }
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitizedFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Direct Save via File System Access API
  const handleSaveToDirectory = async () => {
    try {
      setIsSavingDirect(true);
      let blob = sound.audioBlob;
      if (!blob) {
        blob = (await getSoundBlob(sound.id)) || undefined;
      }
      if (!blob) throw new Error('Audio no disponible');

      // Check if showSaveFilePicker is available
      if ('showSaveFilePicker' in window) {
        // @ts-expect-error File System Access API
        const handle = await window.showSaveFilePicker({
          suggestedName: sanitizedFileName,
          types: [
            {
              description: 'Archivo de Audio WAV',
              accept: { 'audio/wav': ['.wav'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        setSaveDirectStatus('¡Guardado directamente en tu carpeta seleccionada!');
      } else {
        // Fallback to instant download
        handleDownload();
        setSaveDirectStatus('¡Descargado a tu carpeta local de descargas!');
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Error saving file:', err);
      }
    } finally {
      setIsSavingDirect(false);
    }
  };

  // Copy audio to clipboard
  const handleCopyAudioBlob = async () => {
    try {
      let blob = sound.audioBlob;
      if (!blob) {
        blob = (await getSoundBlob(sound.id)) || undefined;
      }
      if (!blob) return;

      if (navigator.clipboard && 'write' in navigator.clipboard) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              [blob.type || 'audio/wav']: blob,
            }),
          ]);
          setCopiedClipboardAudio(true);
          setTimeout(() => setCopiedClipboardAudio(false), 2500);
          return;
        } catch {
          // If browser clipboard restricts audio mime, copy file path as fallback
        }
      }
      await navigator.clipboard.writeText(sanitizedFileName);
      setCopiedClipboardAudio(true);
      setTimeout(() => setCopiedClipboardAudio(false), 2500);
    } catch {
      await navigator.clipboard.writeText(sanitizedFileName);
      setCopiedClipboardAudio(true);
      setTimeout(() => setCopiedClipboardAudio(false), 2500);
    }
  };

  const handleCopyCommand = async () => {
    await navigator.clipboard.writeText(windowsCommand);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#12141e] border border-white/12 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Abrir en Carpeta Local
              </h2>
              <p className="text-xs text-neutral-400">
                Acceso directo al archivo de sonido para tus proyectos de edición.
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

        {/* Selected Sound Card */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/4 border border-white/8">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-white/10 overflow-hidden flex items-center justify-center text-xl shrink-0">
            {sound.coverImage && sound.coverImage.startsWith('/') ? (
              <img
                src={sound.coverImage}
                alt={sound.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{sound.coverImage || '🔊'}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-white truncate">{sound.title}</h3>
              <span className="text-[10px] font-mono text-neutral-400">
                {sound.duration}s
              </span>
            </div>
            <p className="text-[11px] font-mono text-indigo-300 truncate mt-0.5">
              {sanitizedFileName}
            </p>
          </div>
        </div>

        {/* Action Options */}
        <div className="space-y-3">
          {/* Action 1: File System Access Picker */}
          <button
            onClick={handleSaveToDirectory}
            disabled={isSavingDirect}
            className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-left transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold block">
                  Guardar en Mi Carpeta de Edición
                </span>
                <span className="text-[11px] text-indigo-200">
                  Usa File System API para ubicarlo directo en tu carpeta de Premiere/CapCut
                </span>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-indigo-200 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Action 2: Instant Clean Download */}
          <button
            onClick={handleDownload}
            className="w-full p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 text-left transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/6 flex items-center justify-center text-neutral-300 shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold block text-white">
                  Descarga Inmediata (.WAV)
                </span>
                <span className="text-[11px] text-neutral-400">
                  Descarga directa a la carpeta de descargas de tu sistema operativo
                </span>
              </div>
            </div>
          </button>

          {/* Action 3: Copy audio file / filename to clipboard */}
          <button
            onClick={handleCopyAudioBlob}
            className="w-full p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 text-left transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/6 flex items-center justify-center text-neutral-300 shrink-0">
                {copiedClipboardAudio ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </div>
              <div>
                <span className="text-xs font-semibold block text-white">
                  {copiedClipboardAudio ? '¡Copiado al Portapapeles!' : 'Copiar Archivo al Portapapeles'}
                </span>
                <span className="text-[11px] text-neutral-400">
                  Pega directamente el archivo en tu editor de video o explorador
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Direct Explorer Command Helper for Power Users */}
        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/6 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-400 flex items-center gap-1.5 font-medium">
              <Terminal className="w-3.5 h-3.5 text-neutral-500" />
              Comando para Explorador de Windows (Revelar)
            </span>
            <button
              onClick={handleCopyCommand}
              className="text-indigo-400 hover:text-indigo-300 text-[10px] font-mono flex items-center gap-1"
            >
              {copiedPath ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedPath ? 'Copiado' : 'Copiar comando'}
            </button>
          </div>

          <div className="p-2 rounded-lg bg-black/50 text-[10px] font-mono text-neutral-300 select-all overflow-x-auto border border-white/4">
            {windowsCommand}
          </div>
          <p className="text-[10px] text-neutral-500 leading-normal">
            Presiona <kbd className="bg-white/10 px-1 rounded text-neutral-300">Win + R</kbd>, pega el comando y Windows abrirá la carpeta seleccionando el sonido automáticamente.
          </p>
        </div>

        {/* Feedback Alert */}
        {saveDirectStatus && (
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{saveDirectStatus}</span>
          </div>
        )}
      </div>
    </div>
  );
};
