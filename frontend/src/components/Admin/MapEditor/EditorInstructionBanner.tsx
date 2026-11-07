import React from 'react';
import { useAdminGraph } from '../../../context/AdminGraphContext';
import { Info, AlertCircle } from 'lucide-react';

export const EditorInstructionBanner: React.FC = () => {
  const { activeTool, linkingSourceNode } = useAdminGraph();

  let message = '';
  let isAlert = false;

  switch (activeTool) {
    case 'navigate':
      message = "Pan & Zoom Mode: Drag map to pan. Hotkeys: 'N' Add Node, 'L' Link, 'E' Move/Inspect.";
      break;
    case 'add_node':
      message = 'Add Node Mode: Click anywhere on the campus canvas to drop a new path node.';
      break;
    case 'link_nodes':
      if (!linkingSourceNode) {
        message = 'Link Nodes: Step 1 of 2 — Click an origin node on the map.';
      } else {
        message = `Link Nodes: Step 2 of 2 — Click target node to connect with Node #${linkingSourceNode.id} (Press ESC to cancel).`;
        isAlert = true;
      }
      break;
    case 'inspect':
      message = 'Inspect & Move: Click to inspect properties. Drag node markers to reposition dynamically.';
      break;
  }

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[940] pointer-events-none">
      <div
        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-md flex items-center gap-2 border transition-all ${
          isAlert
            ? 'bg-amber-500/95 text-white border-amber-400'
            : 'bg-slate-900/90 dark:bg-slate-800/90 text-white border-slate-700/80'
        }`}
      >
        {isAlert ? <AlertCircle size={14} /> : <Info size={14} className="text-brand-teal" />}
        <span>{message}</span>
      </div>
    </div>
  );
};

export default EditorInstructionBanner;
