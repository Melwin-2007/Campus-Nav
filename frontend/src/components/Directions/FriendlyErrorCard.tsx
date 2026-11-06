import React from 'react';
import {
  AlertTriangle,
  Accessibility,
  MapPin,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';

interface FriendlyErrorCardProps {
  error: string;
}

export const FriendlyErrorCard: React.FC<FriendlyErrorCardProps> = ({ error }) => {
  const {
    accessibleOnly,
    setAccessibleOnly,
    calculateCurrentRoute,
    setOriginLocation,
    locations,
    isLoadingRoute,
  } = useNavigation();

  const isWheelchairIssue =
    accessibleOnly &&
    (error.toLowerCase().includes('accessible') ||
      error.toLowerCase().includes('stair') ||
      error.toLowerCase().includes('no path'));

  const isSameLocation =
    error.toLowerCase().includes('same') ||
    error.toLowerCase().includes('identical');

  const isOffCampus =
    error.toLowerCase().includes('campus') ||
    error.toLowerCase().includes('perimeter') ||
    error.toLowerCase().includes('outside');

  // Find Main Gate location as fallback
  const mainGate = locations.find(
    (loc) =>
      loc.name.toLowerCase().includes('main gate') ||
      loc.name.toLowerCase().includes('gate') ||
      loc.id === 1
  );

  return (
    <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 text-slate-800 dark:text-slate-100 flex flex-col gap-3 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
          <AlertTriangle size={18} />
        </div>
        <div className="flex-1">
          <h4 className="font-heading font-bold text-xs text-rose-800 dark:text-rose-300">
            Route Calculation Notice
          </h4>
          <p className="text-xs text-rose-700/90 dark:text-rose-300/80 mt-0.5 leading-relaxed">
            {error}
          </p>
        </div>
      </div>

      {/* Contextual Action CTAs */}
      {isWheelchairIssue && (
        <button
          type="button"
          onClick={() => {
            setAccessibleOnly(false);
            calculateCurrentRoute();
          }}
          disabled={isLoadingRoute}
          className="touch-target py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-sm"
        >
          <Accessibility size={15} />
          <span>Disable Wheelchair Filter & Retry</span>
        </button>
      )}

      {isOffCampus && mainGate && (
        <button
          type="button"
          onClick={() => {
            setOriginLocation(mainGate);
            calculateCurrentRoute();
          }}
          className="touch-target py-2 px-3 rounded-xl bg-brand-indigo hover:bg-brand-indigo-hover text-white font-heading font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-sm"
        >
          <MapPin size={15} />
          <span>Set Main Gate as Start</span>
        </button>
      )}

      {!isWheelchairIssue && !isSameLocation && !isOffCampus && (
        <button
          type="button"
          onClick={() => calculateCurrentRoute()}
          disabled={isLoadingRoute}
          className="touch-target py-2 px-3 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-heading font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
        >
          <RefreshCw size={14} className={isLoadingRoute ? 'animate-spin' : ''} />
          <span>Retry Route Calculation</span>
        </button>
      )}
    </div>
  );
};

export default FriendlyErrorCard;
