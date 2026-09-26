import React from 'react';
import { Search, Plus, Sparkles, Download } from 'lucide-react';
import { ActiveTab } from './Sidebar';

interface TopHeaderProps {
  activeTab: ActiveTab;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenTrimmer: () => void;
  onOpenPrompt: () => void;
  totalSoundsCount: number;
  onExportLibrary: () => void;
  isExporting: boolean;
  exportStatus: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  searchQuery,
  onSearchChange,
  onOpenTrimmer,
  onOpenPrompt,
  totalSoundsCount,
  onExportLibrary,
  isExporting,
  exportStatus,
}) => {
  const getTabBreadcrumb = () => {
    switch (activeTab) {
      case 'library':
        return 'Librería de Sonidos';
      case 'trimmer':
        return 'Estudio de Recorte & Onda';
      case 'soundboard':
        return 'Soundboard Rápido (Teclas 1-9)';
      case 'scripts':
        return 'Guiones Virales (TikTok / Reels)';
      case 'stock':
        return 'Vídeos Stock Brainrot (Minecraft / Subway Surfers)';
      case 'prompt':
        return 'Ingeniería Inversa / Prompt Maestro';
      default:
        return 'Librería';
    }
  };

  return (
    <header className="h-16 border-b border-white/8 bg-[#0c0d12]/80 backdrop-blur-md px-6 flex items-center justify-between gap-4 z-20 shrink-0">
      {/* Zone 1: Breadcrumb & Title */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-neutral-400 font-medium">RotVault</span>
        <span className="text-neutral-600 text-xs">/</span>
        <h1 className="text-sm font-semibold text-white tracking-tight truncate">
          {getTabBreadcrumb()}
        </h1>
        {activeTab === 'library' && (
          <span className="text-[11px] font-mono text-neutral-400 ml-1">
            ({totalSoundsCount})
          </span>
        )}
      </div>

      {/* Zone 2: Global Search */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre, tag ('boom', 'pipe', 'skibidi') o carpeta..."
            className="w-full h-9 pl-9 pr-12 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500/50 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-neutral-300 bg-white/10 px-1.5 py-0.5 rounded border border-white/10 pointer-events-none">
            /
          </kbd>
        </div>
      </div>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        {activeTab === 'library' && (
          <button
            onClick={onExportLibrary}
            disabled={isExporting}
            className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-neutral-300 hover:text-white flex items-center gap-2 transition-all disabled:opacity-50"
            title="Descargar los audios guardados en este navegador y su catálogo en un ZIP"
            aria-label="Exportar biblioteca"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{isExporting ? 'Exportando...' : 'Exportar biblioteca'}</span>
          </button>
        )}
        <button
          onClick={onOpenPrompt}
          className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-neutral-300 hover:text-white flex items-center gap-2 transition-all"
          title="Ver prompt optimizado para replicar esto en Angular"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Prompt Maestro</span>
        </button>

        <button
          onClick={onOpenTrimmer}
          className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Subir & Recortar</span>
        </button>
      </div>
      {exportStatus && <div role="status" className="absolute top-16 right-6 z-30 rounded-xl border border-white/10 bg-[#181a27] px-4 py-2 text-xs text-white shadow-lg">{exportStatus}</div>}
    </header>
  );
};
