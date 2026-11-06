import React from 'react';
import { Accessibility, Zap, Compass } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';

export const RouteOptionsBar: React.FC = () => {
  const {
    accessibleOnly,
    setAccessibleOnly,
    routingAlgorithm,
    setRoutingAlgorithm,
  } = useNavigation();

  return (
    <div className="flex flex-col gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
      {/* Accessible Route Toggle */}
      <div className="flex items-center justify-between py-1">
        <label
          htmlFor="accessible-toggle"
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
              accessibleOnly
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}
          >
            <Accessibility size={15} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Wheelchair Accessible
            </span>
            <p className="text-[10px] text-slate-400">Avoids stairs; uses ramps and elevators</p>
          </div>
        </label>

        <button
          id="accessible-toggle"
          type="button"
          role="switch"
          aria-checked={accessibleOnly}
          onClick={() => setAccessibleOnly(!accessibleOnly)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
            accessibleOnly ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              accessibleOnly ? 'translate-x-4' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Algorithm Selector: A* vs Dijkstra */}
      <div className="flex items-center justify-between py-1">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          Search Engine
        </span>

        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setRoutingAlgorithm('astar')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              routingAlgorithm === 'astar'
                ? 'bg-white dark:bg-slate-700 text-brand-indigo dark:text-brand-teal shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="A* heuristic algorithm (Fastest)"
          >
            <Zap size={12} />
            <span>A* (Fastest)</span>
          </button>

          <button
            type="button"
            onClick={() => setRoutingAlgorithm('dijkstra')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              routingAlgorithm === 'dijkstra'
                ? 'bg-white dark:bg-slate-700 text-brand-indigo dark:text-brand-teal shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Dijkstra shortest path algorithm"
          >
            <Compass size={12} />
            <span>Dijkstra</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteOptionsBar;
