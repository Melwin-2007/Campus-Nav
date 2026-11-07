import React, { useState, useRef, useEffect } from 'react';
import {
  Hand,
  PlusCircle,
  Link2,
  MousePointer,
  Layers,
  X,
  Check,
  Filter,
} from 'lucide-react';
import { useAdminGraph } from '../../../context/AdminGraphContext';
import { useNavigation } from '../../../context/NavigationContext';

export const EditorToolbar: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    cancelLinking,
    nodes,
    edges,
    layerVisibility,
    setLayerVisibility,
    toggleLayer,
  } = useAdminGraph();

  const { setIsAdminMode } = useNavigation();
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const layersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (layersRef.current && !layersRef.current.contains(e.target as Node)) {
        setIsLayersOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[950] flex flex-col items-center gap-2 pointer-events-none select-none">
      {/* Glassmorphic Floating Toolbar */}
      <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-1.5 flex items-center gap-1">
        {/* Tool 1: Navigate (V) */}
        <button
          type="button"
          onClick={() => {
            setActiveTool('navigate');
            cancelLinking();
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTool === 'navigate'
              ? 'bg-brand-indigo text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Navigate Mode (Pan & Zoom freely) [V]"
        >
          <Hand size={15} />
          <span>Pan</span>
          <kbd className="hidden sm:inline-block ml-0.5 px-1 py-0.2 rounded text-[9px] bg-black/10 dark:bg-white/10">
            V
          </kbd>
        </button>

        {/* Tool 2: Add Node (N) */}
        <button
          type="button"
          onClick={() => {
            setActiveTool('add_node');
            cancelLinking();
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTool === 'add_node'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Add Node Mode (Click canvas to drop node) [N]"
        >
          <PlusCircle size={15} />
          <span>Add Node</span>
          <kbd className="hidden sm:inline-block ml-0.5 px-1 py-0.2 rounded text-[9px] bg-black/10 dark:bg-white/10">
            N
          </kbd>
        </button>

        {/* Tool 3: Link Nodes (L) */}
        <button
          type="button"
          onClick={() => {
            setActiveTool('link_nodes');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTool === 'link_nodes'
              ? 'bg-amber-500 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Link Nodes Mode (Click Node A then Node B) [L]"
        >
          <Link2 size={15} />
          <span>Link Nodes</span>
          <kbd className="hidden sm:inline-block ml-0.5 px-1 py-0.2 rounded text-[9px] bg-black/10 dark:bg-white/10">
            L
          </kbd>
        </button>

        {/* Tool 4: Inspect / Move (E) */}
        <button
          type="button"
          onClick={() => {
            setActiveTool('inspect');
            cancelLinking();
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTool === 'inspect'
              ? 'bg-brand-teal text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Inspect & Drag Mode (Drag nodes to reposition) [E]"
        >
          <MousePointer size={15} />
          <span>Inspect / Move</span>
          <kbd className="hidden sm:inline-block ml-0.5 px-1 py-0.2 rounded text-[9px] bg-black/10 dark:bg-white/10">
            E
          </kbd>
        </button>

        {/* Vertical Divider */}
        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* Layers Popover Button */}
        <div className="relative" ref={layersRef}>
          <button
            type="button"
            onClick={() => setIsLayersOpen(!isLayersOpen)}
            className={`p-2 rounded-xl border text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
              isLayersOpen ? 'border-brand-indigo text-brand-indigo' : 'border-transparent'
            }`}
            title="Layer Visibility Settings"
          >
            <Layers size={16} />
          </button>

          {isLayersOpen && (
            <div className="absolute right-0 top-12 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 flex flex-col gap-2 z-50 animate-fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Layer Visibility
              </span>

              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span>Path Nodes</span>
                <input
                  type="checkbox"
                  checked={layerVisibility.showNodes}
                  onChange={() => toggleLayer('showNodes')}
                  className="rounded text-brand-indigo"
                />
              </label>

              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span>Path Edges</span>
                <input
                  type="checkbox"
                  checked={layerVisibility.showEdges}
                  onChange={() => toggleLayer('showEdges')}
                  className="rounded text-brand-indigo"
                />
              </label>

              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span>Campus POIs</span>
                <input
                  type="checkbox"
                  checked={layerVisibility.showPOIs}
                  onChange={() => toggleLayer('showPOIs')}
                  className="rounded text-brand-indigo"
                />
              </label>

              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span>Node Labels</span>
                <input
                  type="checkbox"
                  checked={layerVisibility.showNodeLabels}
                  onChange={() => toggleLayer('showNodeLabels')}
                  className="rounded text-brand-indigo"
                />
              </label>
            </div>
          )}
        </div>

        {/* Graph Metrics Chip */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[11px] font-bold text-slate-600 dark:text-slate-300">
          <span>{nodes.length} Nodes</span>
          <span>•</span>
          <span>{edges.length} Edges</span>
        </div>

        {/* Exit Admin Editor Button */}
        <button
          type="button"
          onClick={() => {
            setIsAdminMode(false);
          }}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ml-1"
          title="Exit Admin Graph Editor"
          aria-label="Exit Admin Graph Editor"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default EditorToolbar;
