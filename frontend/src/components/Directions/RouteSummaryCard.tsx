import React, { useState } from 'react';
import {
  Footprints,
  Accessibility,
  Share2,
  RefreshCw,
  X,
  Check,
  Zap,
  Compass,
} from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';

export const RouteSummaryCard: React.FC = () => {
  const {
    activeRoute,
    clearRoute,
    calculateCurrentRoute,
    shareRouteLink,
    isLoadingRoute,
  } = useNavigation();

  const [copiedLink, setCopiedLink] = useState(false);

  if (!activeRoute) return null;

  const handleShare = async () => {
    const success = await shareRouteLink();
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const isAStar = activeRoute.algorithm_used.toLowerCase().includes('astar');

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-white to-teal-50/70 dark:from-indigo-950/40 dark:via-slate-900/90 dark:to-teal-950/30 border border-brand-indigo/20 dark:border-indigo-800/40 shadow-sm flex flex-col gap-3">
      {/* Top row: Metrics and Badges */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-heading font-extrabold text-brand-indigo dark:text-indigo-300 tracking-tight">
              {Math.round(activeRoute.distance_meters)}m
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              total distance
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">
            <Footprints size={14} className="text-brand-teal shrink-0" />
            <span>
              ~{activeRoute.duration_minutes} min walk ({activeRoute.duration_seconds}s)
            </span>
          </div>
        </div>

        {/* Algorithm & Accessibility Badges */}
        <div className="flex flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-indigo/10 dark:bg-brand-indigo/20 text-brand-indigo dark:text-indigo-300 border border-brand-indigo/20 uppercase tracking-wider">
            {isAStar ? <Zap size={10} /> : <Compass size={10} />}
            <span>{activeRoute.algorithm_used}</span>
          </span>

          {activeRoute.accessible_only && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              <Accessibility size={11} />
              <span>Accessible</span>
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
        {/* Recalculate */}
        <button
          type="button"
          onClick={() => calculateCurrentRoute()}
          disabled={isLoadingRoute}
          className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          title="Recalculate route"
        >
          <RefreshCw size={13} className={isLoadingRoute ? 'animate-spin' : ''} />
          <span>Recalculate</span>
        </button>

        {/* Share Route */}
        <button
          type="button"
          onClick={handleShare}
          className="flex-1 py-1.5 px-3 rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50/50 dark:bg-teal-950/30 hover:bg-teal-100/50 text-teal-800 dark:text-teal-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          title="Share route link"
        >
          {copiedLink ? (
            <>
              <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Share2 size={13} />
              <span>Share</span>
            </>
          )}
        </button>

        {/* Clear Route */}
        <button
          type="button"
          onClick={clearRoute}
          className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-200 text-slate-500 hover:text-rose-600 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
          title="Clear route"
        >
          <X size={14} />
          <span>Clear</span>
        </button>
      </div>
    </div>
  );
};

export default RouteSummaryCard;
