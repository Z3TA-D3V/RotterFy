import React, { useEffect, useRef, useState } from 'react';
import { 
  Volume2, 
  Scissors, 
  Grid3X3, 
  FileText, 
  Mic,
  Film, 
  Sparkles, 
  HardDrive,
  ChevronLeft,
  ChevronRight,
  Settings,
  GripVertical,
  ChevronDown,
  Braces,
} from 'lucide-react';
import { sectionIds, type SectionId, type SectionVisibility } from '../utils/sectionVisibility';

export type ActiveTab = 'library' | 'trimmer' | 'soundboard' | 'scripts' | 'system-prompts' | 'recording' | 'stock' | 'prompt' | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  soundCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  visibleSections?: SectionVisibility;
  sectionOrder?: SectionId[];
  onReorderSection?: (source: SectionId, target: SectionId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  soundCount,
  isCollapsed,
  onToggleCollapse,
  visibleSections,
  sectionOrder = [...sectionIds],
  onReorderSection,
}) => {
  const [draggingId, setDraggingId] = useState<SectionId | null>(null);
  const [overId, setOverId] = useState<SectionId | null>(null);
  const pendingRef = useRef<{ id: SectionId; pointerId: number; x: number; y: number; timer: number } | null>(null);
  const draggingRef = useRef<SectionId | null>(null);
  const reorderRef = useRef(onReorderSection);
  const suppressClickRef = useRef(false);
  const suppressTimerRef = useRef<number | null>(null);
  reorderRef.current = onReorderSection;

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const pending = pendingRef.current;
      if (!pending || event.pointerId !== pending.pointerId) return;
      if (!draggingRef.current) {
        if (Math.hypot(event.clientX - pending.x, event.clientY - pending.y) > 8) {
          window.clearTimeout(pending.timer);
          pendingRef.current = null;
        }
        return;
      }
      event.preventDefault();
      const target = document.elementFromPoint?.(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-nav-id]')?.dataset.navId as SectionId | undefined;
      if (!target || !sectionIds.includes(target)) return;
      setOverId(target);
      if (target !== draggingRef.current) reorderRef.current?.(draggingRef.current, target);
    };
    const release = (event: PointerEvent) => {
      const pending = pendingRef.current;
      if (!pending || event.pointerId !== pending.pointerId) return;
      window.clearTimeout(pending.timer);
      pendingRef.current = null;
      if (draggingRef.current) {
        draggingRef.current = null;
        setDraggingId(null); setOverId(null);
        suppressClickRef.current = true;
        if (suppressTimerRef.current !== null) window.clearTimeout(suppressTimerRef.current);
        suppressTimerRef.current = window.setTimeout(() => { suppressClickRef.current = false; }, 400);
      }
    };
    const blur = () => {
      if (pendingRef.current) window.clearTimeout(pendingRef.current.timer);
      pendingRef.current = null;
      draggingRef.current = null;
      setDraggingId(null); setOverId(null);
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', blur);
      if (pendingRef.current) window.clearTimeout(pendingRef.current.timer);
      if (suppressTimerRef.current !== null) window.clearTimeout(suppressTimerRef.current);
    };
  }, []);

  function holdToReorder(event: React.PointerEvent<HTMLButtonElement>, id: SectionId) {
    if (event.button !== 0 || !onReorderSection) return;
    if (pendingRef.current) window.clearTimeout(pendingRef.current.timer);
    const pointerId = event.pointerId;
    const timer = window.setTimeout(() => {
      if (pendingRef.current?.pointerId !== pointerId) return;
      draggingRef.current = id;
      setDraggingId(id);
      setOverId(id);
    }, 250);
    pendingRef.current = { id, pointerId, x: event.clientX, y: event.clientY, timer };
  }

  const navItems = [
    {
      id: 'library' as ActiveTab,
      label: 'Librería de Sonidos',
      sublabel: 'Brainrot & Memes',
      icon: Volume2,
      badge: soundCount.toString(),
    },
    {
      id: 'trimmer' as ActiveTab,
      label: 'Estudio de Recorte',
      sublabel: 'Cortar compilaciones',
      icon: Scissors,
      badge: 'PRO',
    },
    {
      id: 'soundboard' as ActiveTab,
      label: 'Soundboard en Vivo',
      sublabel: 'Atajos de grabación',
      icon: Grid3X3,
    },
    {
      id: 'scripts' as ActiveTab,
      label: 'Guiones & Hooks',
      sublabel: 'Retención y gags',
      icon: FileText,
    },
    {
      id: 'recording' as ActiveTab,
      label: 'Teleprónter & Voz',
      sublabel: 'Grabar y editar tomas',
      icon: Mic,
    },
    {
      id: 'stock' as ActiveTab,
      label: 'B-Roll & Videos',
      sublabel: 'Minecraft / Subway',
      icon: Film,
    },
    {
      id: 'prompt' as ActiveTab,
      label: 'Ingeniería Inversa',
      sublabel: 'Prompt Maestro',
      icon: Sparkles,
      highlight: true,
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Opciones',
      sublabel: 'Personaliza tu espacio',
      icon: Settings,
    },
  ];
  const orderedItems = [
    ...sectionOrder.map((id) => navItems.find((item) => item.id === id)).filter((item): item is typeof navItems[number] => Boolean(item)),
    navItems.find((item) => item.id === 'settings')!,
  ];

  return (
    <aside
      className={`relative flex flex-col justify-between border-r border-white/10 bg-[#0f1118]/95 backdrop-blur-xl transition-all duration-300 z-30 select-none ${
        isCollapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Top Header / App Brand */}
      <div>
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/8">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
              <Volume2 className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
                  RotVault
                  <span className="text-[10px] font-mono uppercase bg-white/10 text-neutral-300 px-1.5 py-0.5 rounded">
                    Studio
                  </span>
                </span>
                <span className="text-[11px] text-neutral-400 truncate">
                  Creator Command Center
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="w-7 h-7 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors"
            title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            aria-label="Toggle navigation"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-2 space-y-1 mt-2">
          {!isCollapsed && (
            <div className="px-3 py-1.5">
              <p className={`text-[11px] font-semibold tracking-wider ${draggingId ? 'text-indigo-300' : 'text-neutral-300'}`}>
                {draggingId ? 'MOVIENDO · SUELTA PARA FIJAR' : 'CENTRO DE MANDO'}
              </p>
              {!draggingId && onReorderSection && <p className="mt-0.5 text-[10px] text-neutral-600">Mantén 0,25 s y arrastra para ordenar</p>}
            </div>
          )}

          {orderedItems.filter((item) => item.id === 'settings' || !visibleSections || visibleSections[item.id as keyof SectionVisibility]).map((item) => {
            const Icon = item.icon;
            const scriptsArea = activeTab === 'scripts' || activeTab === 'system-prompts';
            const isActive = activeTab === item.id || (item.id === 'scripts' && scriptsArea);
            const draggable = item.id !== 'settings';
            return (
              <React.Fragment key={item.id}>
              <button
                data-nav-id={draggable ? item.id : undefined}
                aria-grabbed={draggable ? draggingId === item.id : undefined}
                onPointerDown={draggable ? (event) => holdToReorder(event, item.id as SectionId) : undefined}
                onContextMenu={(event) => { if (draggingId === item.id) event.preventDefault(); }}
                onClick={() => {
                  if (suppressClickRef.current) { suppressClickRef.current = false; return; }
                  onTabChange(item.id);
                }}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-[background-color,border-color,box-shadow,transform] duration-150 group ${draggable ? 'cursor-grab touch-none' : 'mt-3'} ${
                  draggingId === item.id
                    ? 'z-10 scale-[1.03] cursor-grabbing border-indigo-400 bg-indigo-500/25 text-white shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-400/50'
                    : draggingId && overId === item.id
                      ? 'border-indigo-400/70 bg-indigo-500/15 text-white'
                      : isActive
                        ? 'bg-white/12 text-white font-medium shadow-sm border-white/15'
                        : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                }`}
                title={isCollapsed ? item.label : draggable ? 'Mantén pulsado 0,25 segundos para cambiar el orden' : undefined}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/30'
                      : 'bg-white/5 text-neutral-400 group-hover:text-white group-hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                            isActive
                              ? 'bg-indigo-500/30 text-indigo-300'
                              : 'bg-white/10 text-neutral-400'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate group-hover:text-neutral-400">
                      {item.sublabel}
                    </p>
                  </div>
                )}
                {item.id === 'scripts' && !isCollapsed && (scriptsArea ? <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-400" /> : <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-500" />)}
                {draggable && !isCollapsed && <GripVertical aria-hidden="true" className={`h-4 w-4 shrink-0 transition-opacity ${draggingId === item.id ? 'text-indigo-200 opacity-100' : 'text-neutral-500 opacity-35 group-hover:opacity-100'}`} />}
              </button>
              {item.id === 'scripts' && scriptsArea && <div className={`border-l border-indigo-400/30 ${isCollapsed ? 'ml-5 pl-1' : 'ml-7 pl-3'}`}>
                <button onClick={() => {
                  if (suppressClickRef.current) { suppressClickRef.current = false; return; }
                  onTabChange('system-prompts');
                }} aria-current={activeTab === 'system-prompts' ? 'page' : undefined}
                  title={isCollapsed ? 'System Prompts' : undefined}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition-colors ${activeTab === 'system-prompts' ? 'bg-indigo-500/15 text-indigo-200' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}>
                  <Braces aria-hidden="true" size={14} className="shrink-0" />{!isCollapsed && <span>System Prompts</span>}
                </button>
              </div>}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Bottom Storage & User Card */}
      <div className="p-3 border-t border-white/8 space-y-2">
        {!isCollapsed ? (
          <div className="p-2.5 rounded-xl bg-white/4 border border-white/6 text-xs text-neutral-400">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-neutral-300 text-[11px] font-medium">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                Almacenamiento Local
              </span>
              <span className="text-[10px] font-mono text-emerald-400">Audio en disco</span>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Tus audios se guardan como archivos en public/assets/audio.
            </p>
          </div>
        ) : (
          <div className="flex justify-center" title="Almacenamiento local activo">
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
        )}

        {/* Creator Info */}
        <div
          className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-neutral-400 ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            DEV
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-neutral-200 font-medium truncate">
                Creador Angular & Shorts
              </span>
              <span className="text-[10px] text-neutral-500 truncate">
                Modo Creador Activo
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
