/**
 * RotVault - Brainrot Sound Studio & Creator Command Center
 * Designed for content creators & Angular/React developers.
 */
import { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { SoundLibrary } from './components/SoundLibrary';
import { StudioWorkspace } from './components/StudioWorkspace';
import { AudioTrimmerModal } from './components/AudioTrimmerModal';
import { OpenFileModal } from './components/OpenFileModal';
import { SoundboardMode } from './components/SoundboardMode';
import { ScriptsHub } from './components/ScriptsHub';
import { RecordingStudio } from './components/RecordingStudio';
import { SettingsHub } from './components/SettingsHub';
import { StockVideoHub } from './components/StockVideoHub';
import { DownloadHub } from './components/DownloadHub';
import { VideoPlayerBar, type VideoPlayerHandle } from './components/VideoPlayerBar';
import { videoCategories } from './utils/videoCategories';
import { PromptEngineerModal } from './components/PromptEngineerModal';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { SoundItem, ScriptBeat, StockVideoAsset } from './types';
import { 
  initSoundLibrary,
  getSoundAudioBuffer, 
  getSoundBlob,
  deleteSoundFromLibrary,
  updateSoundMetadata,
  incrementPlayCount,
} from './utils/audioStorage';
import {
  saveScript,
  deleteScript,
  saveStockVideo,
  deleteStockVideo,
  uploadStockVideoFile,
  getStockVideos,
} from './utils/storage';
import { loadCreatorLists } from './utils/legacyMigration';
import { exportLocalLibrary } from './utils/libraryExport';
import { playAudioBuffer, stopCurrentPlayback } from './utils/audioEngine';
import { defaultSectionVisibility, loadSectionVisibility, saveSectionVisibility, type SectionId } from './utils/sectionVisibility';
import { loadSectionOrder, moveSection, saveSectionOrder } from './utils/sectionOrder';

const SystemPromptsHub = lazy(() => import('./components/SystemPromptsHub').then((module) => ({ default: module.SystemPromptsHub })));

let initialDataPromise: Promise<{ sounds: SoundItem[]; scripts: ScriptBeat[]; videos: StockVideoAsset[] }> | null = null;

function loadInitialData() {
  if (!initialDataPromise) {
    const pending = Promise.all([
      initSoundLibrary(),
      loadCreatorLists().catch((error) => {
        console.error('No se pudieron cargar los guiones y vídeos:', error);
        return { scripts: [] as ScriptBeat[], videos: [] as StockVideoAsset[] };
      }),
    ])
      .then(([sounds, { scripts, videos }]) => ({ sounds, scripts, videos }));
    initialDataPromise = pending;
    void pending.then(
      () => { if (initialDataPromise === pending) initialDataPromise = null; },
      () => { if (initialDataPromise === pending) initialDataPromise = null; },
    );
  }
  return initialDataPromise;
}

export default function App() {
  // Navigation & Layout
  const [visibleSections, setVisibleSections] = useState(loadSectionVisibility);
  const [sectionOrder, setSectionOrder] = useState(loadSectionOrder);
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => loadSectionVisibility().library ? 'library' : 'settings');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hasOpenedDownloads, setHasOpenedDownloads] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Data Stores
  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [scripts, setScripts] = useState<ScriptBeat[]>([]);
  const [stockVideos, setStockVideos] = useState<StockVideoAsset[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');

  // Modals
  const [isTrimmerOpen, setIsTrimmerOpen] = useState(false);
  const [trimmerAudioBlob, setTrimmerAudioBlob] = useState<Blob | null>(null);
  const [trimmerSourceSound, setTrimmerSourceSound] = useState<SoundItem | null>(null);

  const [isOpenFileModalOpen, setIsOpenFileModalOpen] = useState(false);
  const [selectedFileSound, setSelectedFileSound] = useState<SoundItem | null>(null);

  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  // Playback State
  const [currentPlayingSound, setCurrentPlayingSound] = useState<SoundItem | null>(null);
  const [currentPlayingVideo, setCurrentPlayingVideo] = useState<StockVideoAsset | null>(null);
  const [videoPlayerSession, setVideoPlayerSession] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [volume, setVolume] = useState(1.0);

  const playbackControllerRef = useRef<{ stop: () => void } | null>(null);
  const videoPlayerRef = useRef<VideoPlayerHandle>(null);
  const playbackRequestRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const playStartTimeRef = useRef<number>(0);

  // Load the sound catalog from the local server.
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const { sounds: loadedSounds, scripts: loadedScripts, videos: loadedStocks } = await loadInitialData();
        if (isMounted) {
          setSounds(loadedSounds);
          setScripts(loadedScripts);
          setStockVideos(loadedStocks);
        }
      } catch (err) {
        console.error('No se pudo cargar el catálogo local:', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Stop playback safely
  const stopAudio = useCallback(() => {
    playbackRequestRef.current += 1;
    if (playbackControllerRef.current) {
      playbackControllerRef.current.stop();
      playbackControllerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    stopCurrentPlayback();
    setIsPlaying(false);
    setPlaybackProgress(0);
    setCurrentTime(0);
  }, []);

  // Play a sound from library or soundboard
  const playSound = useCallback(
    async (sound: SoundItem, speed = playbackSpeed) => {
      setCurrentPlayingVideo(null);
      stopAudio();
      const request = playbackRequestRef.current;
      let buffer: AudioBuffer | null;
      try {
        buffer = await getSoundAudioBuffer(sound.id);
      } catch (error) {
        if (request === playbackRequestRef.current) {
          setExportStatus(error instanceof Error ? error.message : 'No se pudo cargar el audio');
        }
        return;
      }
      if (request !== playbackRequestRef.current) return;
      if (!buffer) {
        setExportStatus(`No se pudo cargar el audio: ${sound.title}`);
        return;
      }

      setCurrentPlayingSound(sound);
      setDuration(buffer.duration);
      setIsPlaying(true);
      playStartTimeRef.current = performance.now();

      // Increment play count asynchronously
      void incrementPlayCount(sound.id).then((newCount) => {
        setSounds((prev) =>
          prev.map((s) => (s.id === sound.id ? { ...s, playCount: newCount } : s))
        );
      }).catch((error) => console.error('No se pudo actualizar el contador:', error));

      const controller = playAudioBuffer(buffer, {
        playbackRate: speed,
        volume,
        loop: isLooping,
        onEnded: () => {
          if (!isLooping) {
            setIsPlaying(false);
            setPlaybackProgress(1);
            setCurrentTime(buffer.duration);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
          }
        },
      });

      playbackControllerRef.current = controller;

      // Animate progress
      const updateProg = () => {
        const elapsed =
          ((performance.now() - playStartTimeRef.current) / 1000) * speed;
        const totalDur = buffer.duration;

        if (isLooping) {
          const modTime = elapsed % totalDur;
          setCurrentTime(modTime);
          setPlaybackProgress(modTime / totalDur);
          animFrameRef.current = requestAnimationFrame(updateProg);
        } else {
          if (elapsed <= totalDur) {
            setCurrentTime(elapsed);
            setPlaybackProgress(elapsed / totalDur);
            animFrameRef.current = requestAnimationFrame(updateProg);
          } else {
            setCurrentTime(totalDur);
            setPlaybackProgress(1);
            setIsPlaying(false);
          }
        }
      };
      animFrameRef.current = requestAnimationFrame(updateProg);
    },
    [stopAudio, playbackSpeed, volume, isLooping]
  );

  // Speed change effect
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (isPlaying && currentPlayingSound) {
      void playSound(currentPlayingSound, speed);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (id: string) => {
    const current = sounds.find((s) => s.id === id);
    if (!current) return;
    const target = { ...current, favorite: !current.favorite };
    try {
      await updateSoundMetadata(target);
      setSounds((prev) => prev.map((s) => s.id === id ? target : s));
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : 'No se pudo actualizar el favorito');
    }
  };

  // Delete sound
  const handleDeleteSound = async (id: string) => {
    const sound = sounds.find((item) => item.id === id);
    if (!window.confirm(`¿Eliminar "${sound?.title || 'este sonido'}" y su archivo WAV local?`)) return;
    try {
      await deleteSoundFromLibrary(id);
      if (currentPlayingSound?.id === id) stopAudio();
      setSounds((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : 'No se pudo borrar el audio');
    }
  };

  // Open Trimmer for existing sound
  const handleOpenTrimmerForSound = async (sound: SoundItem) => {
    stopAudio();
    let blob = sound.audioBlob;
    if (!blob) {
      blob = (await getSoundBlob(sound.id)) || undefined;
    }
    setTrimmerSourceSound(sound);
    setTrimmerAudioBlob(blob || null);
    setActiveTab('trimmer');
  };

  // Open Trimmer for new file
  const handleOpenTrimmerNew = () => {
    if (!visibleSections.trimmer) return;
    stopAudio();
    setTrimmerSourceSound(null);
    setTrimmerAudioBlob(null);
    setActiveTab('trimmer');
  };

  // Callback when a new sound is saved in trimmer
  const handleSoundSaved = (newSound: SoundItem) => {
    setSounds((prev) => [newSound, ...prev.filter((s) => s.id !== newSound.id)]);
    setCurrentPlayingSound((prev) => prev?.id === newSound.id ? newSound : prev);
  };

  const handleExportLibrary = async () => {
    setIsExporting(true);
    setExportStatus('');
    try {
      const count = await exportLocalLibrary();
      setExportStatus(`ZIP descargado con ${count} audios locales`);
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : 'No se pudo exportar la biblioteca');
    } finally {
      setIsExporting(false);
    }
  };

  // Open "Abrir en Carpeta" modal
  const handleOpenFileLocation = (sound: SoundItem) => {
    setSelectedFileSound(sound);
    setIsOpenFileModalOpen(true);
  };

  const refreshDownloadedMedia = useCallback(async () => {
    const [loadedSounds, loadedVideos] = await Promise.all([initSoundLibrary(), getStockVideos()]);
    setSounds(loadedSounds);
    setStockVideos(loadedVideos);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0c0d12] text-neutral-100 font-sans selection:bg-indigo-500/20 selection:text-indigo-300">
      {/* Google AI Studio Style Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab !== 'settings' && !visibleSections[tab === 'system-prompts' ? 'scripts' : tab]) return;
          if (tab === 'prompt') {
            setIsPromptModalOpen(true);
          } else {
            stopAudio();
            if (tab === 'downloads') setHasOpenedDownloads(true);
            setActiveTab(tab);
          }
        }}
        soundCount={sounds.length}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        visibleSections={visibleSections}
        sectionOrder={sectionOrder}
        onReorderSection={(source, target) => {
          setSectionOrder((current) => {
            const next = moveSection(current, source, target);
            if (next !== current) saveSectionOrder(next);
            return next;
          });
        }}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top 3-Zone Header */}
        <TopHeader
          activeTab={activeTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenTrimmer={handleOpenTrimmerNew}
          onOpenPrompt={() => setIsPromptModalOpen(true)}
          showPrompt={visibleSections.prompt}
          showTrimmer={visibleSections.trimmer}
          totalSoundsCount={sounds.length}
          onExportLibrary={handleExportLibrary}
          isExporting={isExporting}
          exportStatus={exportStatus}
        />

        {/* Scrollable Workspace Body */}
        <main className={activeTab === 'scripts' || activeTab === 'recording'
          ? 'flex-1 min-h-0 overflow-y-auto xl:overflow-hidden p-3 md:p-5'
          : 'flex-1 overflow-y-auto p-6 md:p-8 pb-32'}>
          <div className={activeTab === 'scripts' || activeTab === 'recording' ? 'h-full min-h-0 w-full' : 'max-w-7xl mx-auto space-y-6'}>
            {/* Tab: Sound Library */}
            {activeTab === 'library' && (
              <SoundLibrary
                sounds={sounds}
                currentPlayingId={isPlaying ? currentPlayingSound?.id || null : null}
                playbackProgress={playbackProgress}
                onPlaySound={playSound}
                onStopSound={stopAudio}
                onOpenTrimmerForSound={handleOpenTrimmerForSound}
                onOpenFileLocation={handleOpenFileLocation}
                onToggleFavorite={handleToggleFavorite}
                onDeleteSound={handleDeleteSound}
                searchQuery={searchQuery}
              />
            )}

            {/* Tab: Trimmer Studio Workspace */}
            {activeTab === 'trimmer' && (
              <StudioWorkspace
                onSoundSaved={handleSoundSaved}
                onOpenFileLocation={handleOpenFileLocation}
                initialAudioBlob={trimmerAudioBlob}
                initialSound={trimmerSourceSound}
              />
            )}

            {/* Tab: Live Soundboard */}
            {activeTab === 'soundboard' && (
              <SoundboardMode
                sounds={sounds}
                onPlaySound={playSound}
                onStopAll={stopAudio}
                currentPlayingId={isPlaying ? currentPlayingSound?.id || null : null}
              />
            )}

            {/* Tab: Scripts & Hooks Hub */}
            {activeTab === 'scripts' && (
              <ScriptsHub
                scripts={scripts}
                sounds={sounds}
                onSaveScript={async (s) => {
                  const saved = await saveScript(s);
                  setScripts((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
                }}
                onSyncScript={(saved) => setScripts((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)])}
                onDeleteScript={async (id) => {
                  await deleteScript(id);
                  setScripts((prev) => prev.filter((item) => item.id !== id));
                }}
                onPlaySoundById={(soundId) => {
                  const target = sounds.find((s) => s.id === soundId);
                  if (target) playSound(target);
                }}
              />
            )}

            {activeTab === 'system-prompts' && <Suspense fallback={<p className="text-sm text-neutral-400">Preparando estilos…</p>}><SystemPromptsHub /></Suspense>}

            {activeTab === 'recording' && <RecordingStudio scripts={scripts} />}

            {activeTab === 'settings' && <SettingsHub visibleSections={visibleSections}
              onToggleSection={(section: SectionId) => {
                setVisibleSections((current) => {
                  const next = { ...current, [section]: !current[section] };
                  saveSectionVisibility(next);
                  if (section === 'prompt' && !next.prompt) setIsPromptModalOpen(false);
                  return next;
                });
              }}
              onReset={() => { saveSectionVisibility(defaultSectionVisibility); setVisibleSections({ ...defaultSectionVisibility }); setIsPromptModalOpen(false); }} />}

            {/* Tab: Stock & B-Roll Hub */}
            {activeTab === 'stock' && (
              <StockVideoHub
                videos={stockVideos}
                onPlayVideo={(video) => {
                  stopAudio();
                  setCurrentPlayingSound(null);
                  // Mount the player during the card click so play() keeps the browser's user gesture.
                  flushSync(() => {
                    setCurrentPlayingVideo(video);
                    setVideoPlayerSession((current) => current + 1);
                  });
                  videoPlayerRef.current?.play();
                }}
                onUpdateVideo={async (video) => {
                  const saved = await saveStockVideo(video);
                  setStockVideos((prev) => prev.map((item) => item.id === saved.id ? saved : item));
                }}
                onSaveVideo={async (v, file) => {
                  const saved = await saveStockVideo(v, file);
                  setStockVideos((prev) => [saved, ...prev.filter((i) => i.id !== saved.id)]);
                }}
                onUploadVideoFile={async (id, file) => {
                  const saved = await uploadStockVideoFile(id, file);
                  setStockVideos((prev) => prev.map((item) => item.id === id ? saved : item));
                }}
                onDeleteVideo={async (id) => {
                  await deleteStockVideo(id);
                  setCurrentPlayingVideo((current) => current?.id === id ? null : current);
                  setStockVideos((prev) => prev.filter((item) => item.id !== id));
                }}
              />
            )}
            {hasOpenedDownloads && <div className={activeTab === 'downloads' ? '' : 'hidden'}><DownloadHub onCompleted={refreshDownloadedMedia} categories={videoCategories(stockVideos)} isVisible={activeTab === 'downloads'} /></div>}
          </div>
        </main>
      </div>

      {/* Floating Apple-Inspired Bottom Audio Player */}
      {currentPlayingSound && (
        <AudioPlayerBar
          sound={currentPlayingSound}
          isPlaying={isPlaying}
          progress={playbackProgress}
          currentTime={currentTime}
          duration={duration}
          isLooping={isLooping}
          playbackSpeed={playbackSpeed}
          volume={volume}
          onTogglePlay={() => {
            if (isPlaying) {
              stopAudio();
            } else if (currentPlayingSound) {
              playSound(currentPlayingSound);
            }
          }}
          onStop={stopAudio}
          onDismiss={() => { stopAudio(); setCurrentPlayingSound(null); }}
          onToggleLoop={() => setIsLooping(!isLooping)}
          onChangeSpeed={handleSpeedChange}
          onChangeVolume={setVolume}
          onOpenTrimmer={handleOpenTrimmerForSound}
          onOpenFileLocation={handleOpenFileLocation}
        />
      )}
      {currentPlayingVideo && <VideoPlayerBar ref={videoPlayerRef} key={`${currentPlayingVideo.id}-${videoPlayerSession}`} video={currentPlayingVideo}
        onClose={() => setCurrentPlayingVideo(null)} />}

      {/* Trimmer Studio Modal */}
      <AudioTrimmerModal
        isOpen={isTrimmerOpen}
        onClose={() => setIsTrimmerOpen(false)}
        onSoundSaved={handleSoundSaved}
        initialAudioBlob={trimmerAudioBlob}
        initialSound={trimmerSourceSound}
      />

      {/* "Abrir Carpeta con el Sonido Preseleccionado" Modal */}
      <OpenFileModal
        isOpen={isOpenFileModalOpen}
        onClose={() => setIsOpenFileModalOpen(false)}
        sound={selectedFileSound}
      />

      {/* Prompt Engineer Master Prompt Modal */}
      <PromptEngineerModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
      />
    </div>
  );
}
