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
  Volume2,
  FolderCheck,
  RefreshCw
} from 'lucide-react';
import { SoundItem } from '../types';
import { getSoundBlob } from '../utils/audioStorage';

interface OpenFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  sound: SoundItem | null;
}

// Module-level persistent Directory Handle in memory across modal opens
let globalLinkedDirectoryHandle: FileSystemDirectoryHandle | null = null;
let globalLinkedDirectoryName: string | null = null;

export const OpenFileModal: React.FC<OpenFileModalProps> = ({
  isOpen,
  onClose,
  sound,
}) => {
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedClipboardAudio, setCopiedClipboardAudio] = useState(false);
  const [isSavingDirect, setIsSavingDirect] = useState(false);
  const [saveDirectStatus, setSaveDirectStatus] = useState<string | null>(null);
  const [linkedDirName, setLinkedDirName] = useState<string | null>(globalLinkedDirectoryName);

  if (!isOpen || !sound) return null;

  const sanitizedFileName = `${sound.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.wav`;
  const defaultFolderPath = linkedDirName ? `C:\\...\\${linkedDirName}` : 'C:\\Usuarios\\Creador\\Descargas\\Sonidos';
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
    setSaveDirectStatus('¡Archivo descargado a tu carpeta local de descargas!');
    setTimeout(() => setSaveDirectStatus(null), 3500);
  };

  // Link Directory via showDirectoryPicker (File System Access API)
  const handleLinkDirectory = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        // @ts-expect-error File System Access API
        const dirHandle = await window.showDirectoryPicker({
          mode: 'readwrite',
        });
        globalLinkedDirectoryHandle = dirHandle;
        globalLinkedDirectoryName = dirHandle.name;
        setLinkedDirName(dirHandle.name);
        setSaveDirectStatus(`¡Carpeta "${dirHandle.name}" vinculada con éxito!`);
        setTimeout(() => setSaveDirectStatus(null), 3500);
      } else {
        setSaveDirectStatus('Tu navegador actual no soporta showDirectoryPicker. Usa la opción Guardar Como o Descarga.');
        setTimeout(() => setSaveDirectStatus(null), 4000);
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Error linking directory:', err);
      }
    }
  };

  // Save directly to the linked directory (0-click picker!)
  const handleSaveToLinkedDirectory = async () => {
    if (!globalLinkedDirectoryHandle) {
      await handleLinkDirectory();
      if (!globalLinkedDirectoryHandle) return;
    }

    try {
      setIsSavingDirect(true);
      let blob = sound.audioBlob;
      if (!blob) {
        blob = (await getSoundBlob(sound.id)) || undefined;
      }
      if (!blob) throw new Error('Audio no disponible');

      const fileHandle = await globalLinkedDirectoryHandle.getFileHandle(sanitizedFileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      setSaveDirectStatus(`¡Guardado directamente en "${globalLinkedDirectoryName}/${sanitizedFileName}"!`);
      setTimeout(() => setSaveDirectStatus(null), 4000);
    } catch (err: unknown) {
      console.error('Error saving to linked directory:', err);
      // Fallback
      handleDownload();
    } finally {
      setIsSavingDirect(false);
    }
  };

  // Save via showSaveFilePicker
  const handleSaveWithPicker = async () => {
    try {
      setIsSavingDirect(true);
      let blob = sound.audioBlob;
      if (!blob) {
        blob = (await getSoundBlob(sound.id)) || undefined;
      }
      if (!blob) throw new Error('Audio no disponible');

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
        setTimeout(() => setSaveDirectStatus(null), 4000);
      } else {
        handleDownload();
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
          // If browser clipboard restricts binary audio mime, copy clean filename as fallback
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
                Acceso Rápido a Archivos Locales
              </h2>
              <p className="text-xs text-neutral-400">
                Exporta y sincroniza con tu carpeta de edición de Premiere o CapCut.
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
          <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-white/10 overflow-hidden flex items-center justify-center text-xl shrink-0">
            {sound.coverImage && (sound.coverImage.startsWith('/') || sound.coverImage.startsWith('data:image/')) ? (
              <img
                src={sound.coverImage}
                alt={sound.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback if image fails to render
                  (e.target as HTMLElement).style.display = 'none';
                }}
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
          {/* Action 1: Linked Directory 1-Click Save */}
          {linkedDirName ? (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-indigo-950/40 to-black/40 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <FolderCheck className="w-4 h-4 text-emerald-400" />
                  Carpeta Vinculada: <span className="font-mono text-white">{linkedDirName}</span>
                </span>
                <button
                  onClick={handleLinkDirectory}
                  className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Cambiar
                </button>
              </div>

              <button
                onClick={handleSaveToLinkedDirectory}
                disabled={isSavingDirect}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
              >
                <HardDrive className="w-4 h-4" />
                <span>Guardar Directo en "{linkedDirName}" (1 Clic)</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleLinkDirectory}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-left transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold block">
                    Vincular Carpeta de Edición Local
                  </span>
                  <span className="text-[11px] text-indigo-200">
                    File System Access API: guarda con 1 solo clic en tu carpeta de Premiere/CapCut
                  </span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-indigo-200 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

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
                  Descarga directa a la carpeta de descargas de tu sistema
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
