import React from 'react';
import { 
  Volume2, 
  Scissors, 
  Grid3X3, 
  FileText, 
  Film, 
  Sparkles, 
  FolderOpen,
  HardDrive,
  Github,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export type ActiveTab = 'library' | 'trimmer' | 'soundboard' | 'scripts' | 'stock' | 'prompt';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  soundCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  soundCount,
  isCollapsed,
  onToggleCollapse,
}) => {
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
            <div className="px-3 py-1.5 text-[11px] font-semibold text-neutral-300 tracking-wider">
              CENTRO DE MANDO
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                  isActive
                    ? 'bg-white/12 text-white font-medium shadow-sm border border-white/15'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                }`}
                title={isCollapsed ? item.label : undefined}
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
              </button>
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
              <span className="text-[10px] font-mono text-emerald-400">IndexedDB Activo</span>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Tus audios cortados y portadas se guardan de forma permanente en tu navegador.
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
