/**
 * RotVault - Brainrot Sound Studio & Creator Command Center
 * Designed for content creators & Angular/React developers.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { SoundLibrary } from './components/SoundLibrary';
import { WaveformTrimmer } from './components/WaveformTrimmer';
import { AudioTrimmerModal } from './components/AudioTrimmerModal';
import { OpenFileModal } from './components/OpenFileModal';
import { SoundboardMode } from './components/SoundboardMode';
import { ScriptsHub } from './components/ScriptsHub';
import { StockVideoHub } from './components/StockVideoHub';
import { PromptEngineerModal } from './components/PromptEngineerModal';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { SoundItem, ScriptBeat, StockVideoAsset } from './types';
import { 
  initAndSeedDatabase, 
  getAllSounds, 
  getSoundAudioBuffer, 
  deleteSoundFromDB, 
  updateSoundMetadata,
  incrementPlayCount,
  getScripts,
  saveScript,
  deleteScript,
  getStockVideos,
  saveStockVideo
} from './utils/storage';
import { playAudioBuffer, stopCurrentPlayback } from './utils/audioEngine';

export default function App() {
  // Navigation & Layout
  const [activeTab, setActiveTab] = useState<ActiveTab>('library');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Data Stores
  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [scripts, setScripts] = useState<ScriptBeat[]>([]);
  const [stockVideos, setStockVideos] = useState<StockVideoAsset[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Modals
  const [isTrimmerOpen, setIsTrimmerOpen] = useState(false);
  const [trimmerAudioBlob, setTrimmerAudioBlob] = useState<Blob | null>(null);
  const [trimmerSourceSound, setTrimmerSourceSound] = useState<SoundItem | null>(null);

  const [isOpenFileModalOpen, setIsOpenFileModalOpen] = useState(false);
  const [selectedFileSound, setSelectedFileSound] = useState<SoundItem | null>(null);

  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  // Playback State
  const [currentPlayingSound, setCurrentPlayingSound] = useState<SoundItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [volume, setVolume] = useState(1.0);

  const playbackControllerRef = useRef<{ stop: () => void } | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const playStartTimeRef = useRef<number>(0);

  // Initial load: Seed IndexedDB with initial brainrot audio presets
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const loadedSounds = await initAndSeedDatabase();
        const loadedScripts = await getScripts();
        const loadedStocks = await getStockVideos();
        if (isMounted) {
          setSounds(loadedSounds);
          setScripts(loadedScripts);
          setStockVideos(loadedStocks);
          setIsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to initialize local creator database:', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Stop playback safely
  const stopAudio = useCallback(() => {
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
    async (sound: SoundItem) => {
      stopAudio();

      const buffer = await getSoundAudioBuffer(sound.id);
      if (!buffer) {
        console.error('Could not load AudioBuffer for', sound.id);
        return;
      }

      setCurrentPlayingSound(sound);
      setDuration(buffer.duration);
      setIsPlaying(true);
      playStartTimeRef.current = performance.now();

      // Increment play count asynchronously
      incrementPlayCount(sound.id).then((newCount) => {
        setSounds((prev) =>
          prev.map((s) => (s.id === sound.id ? { ...s, playCount: newCount } : s))
        );
      });

      const controller = playAudioBuffer(buffer, {
        playbackRate: playbackSpeed,
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
          ((performance.now() - playStartTimeRef.current) / 1000) * playbackSpeed;
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
      playSound(currentPlayingSound);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (id: string) => {
    const updated = sounds.map((s) =>
      s.id === id ? { ...s, favorite: !s.favorite } : s
    );
    setSounds(updated);
    const target = updated.find((s) => s.id === id);
    if (target) {
      await updateSoundMetadata(target);
    }
  };

  // Delete sound
  const handleDeleteSound = async (id: string) => {
    if (currentPlayingSound?.id === id) {
      stopAudio();
    }
    await deleteSoundFromDB(id);
    setSounds((prev) => prev.filter((s) => s.id !== id));
  };

  // Open Trimmer for existing sound
  const handleOpenTrimmerForSound = async (sound: SoundItem) => {
    stopAudio();
    let blob = sound.audioBlob;
    if (!blob) {
      const buffer = await getSoundAudioBuffer(sound.id);
      if (buffer) {
        // Blob will be extracted
      }
    }
    setTrimmerSourceSound(sound);
    setTrimmerAudioBlob(sound.audioBlob || null);
    setIsTrimmerOpen(true);
  };

  // Open Trimmer for new file
  const handleOpenTrimmerNew = () => {
    stopAudio();
    setTrimmerSourceSound(null);
    setTrimmerAudioBlob(null);
    setIsTrimmerOpen(true);
  };

  // Callback when a new sound is saved in trimmer
  const handleSoundSaved = (newSound: SoundItem) => {
    setSounds((prev) => [newSound, ...prev.filter((s) => s.id !== newSound.id)]);
  };

  // Open "Abrir en Carpeta" modal
  const handleOpenFileLocation = (sound: SoundItem) => {
    setSelectedFileSound(sound);
    setIsOpenFileModalOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0c0d12] text-neutral-100 font-sans selection:bg-indigo-500/20 selection:text-indigo-300">
      {/* Google AI Studio Style Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'trimmer') {
            handleOpenTrimmerNew();
          } else if (tab === 'prompt') {
            setIsPromptModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        soundCount={sounds.length}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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
          totalSoundsCount={sounds.length}
        />

        {/* Scrollable Workspace Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 pb-32">
          <div className="max-w-7xl mx-auto space-y-6">
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
                onSaveScript={(s) => {
                  saveScript(s);
                  setScripts((prev) => [s, ...prev.filter((item) => item.id !== s.id)]);
                }}
                onDeleteScript={(id) => {
                  deleteScript(id);
                  setScripts((prev) => prev.filter((item) => item.id !== id));
                }}
                onPlaySoundById={(soundId) => {
                  const target = sounds.find((s) => s.id === soundId);
                  if (target) playSound(target);
                }}
              />
            )}

            {/* Tab: Stock & B-Roll Hub */}
            {activeTab === 'stock' && (
              <StockVideoHub
                videos={stockVideos}
                onSaveVideo={(v) => {
                  saveStockVideo(v);
                  setStockVideos((prev) => [v, ...prev.filter((i) => i.id !== v.id)]);
                }}
              />
            )}
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
          onToggleLoop={() => setIsLooping(!isLooping)}
          onChangeSpeed={handleSpeedChange}
          onChangeVolume={setVolume}
          onOpenTrimmer={handleOpenTrimmerForSound}
          onOpenFileLocation={handleOpenFileLocation}
        />
      )}

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
