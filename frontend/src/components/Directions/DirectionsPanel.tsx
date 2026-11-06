import React, { useState } from 'react';
import {
  ArrowLeft,
  Navigation,
  Compass,
  Edit2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { LocationSelector } from './LocationSelector';
import { RouteOptionsBar } from './RouteOptionsBar';
import { RouteSummaryCard } from './RouteSummaryCard';
import { TurnStepCard } from './TurnStepCard';
import { FriendlyErrorCard } from './FriendlyErrorCard';

export const DirectionsPanel: React.FC = () => {
  const {
    activeRoute,
    closeDirections,
    originSelection,
    destinationSelection,
    calculateCurrentRoute,
    isLoadingRoute,
    routeError,
    activeStepIndex,
    shareToastMessage,
  } = useNavigation();

  // If activeRoute exists, allow toggling back to planning mode to adjust endpoints
  const [isEditingEndpoints, setIsEditingEndpoints] = useState<boolean>(false);

  // Check if endpoints are ready to calculate
  const isReady =
    originSelection &&
    destinationSelection &&
    (originSelection.label !== destinationSelection.label ||
      originSelection.type !== destinationSelection.type);

  const isNavigating = Boolean(activeRoute) && !isEditingEndpoints;

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Toast Notification Banner */}
      {shareToastMessage && (
        <div className="mb-2 p-2 rounded-xl bg-brand-teal text-white text-xs font-semibold flex items-center gap-1.5 shadow-md animate-fade-in">
          <CheckCircle2 size={15} />
          <span>{shareToastMessage}</span>
        </div>
      )}

      {/* Navigation Top Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={closeDirections}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Exit directions"
            aria-label="Back to overview"
          >
            <ArrowLeft size={17} />
          </button>
          <div>
            <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>{isNavigating ? 'Active Guidance' : 'Plan Directions'}</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {isNavigating
                ? `${activeRoute?.steps.length} turns calculated`
                : 'Campus pedestrian pathfinder'}
            </p>
          </div>
        </div>

        {/* If navigating, provide Edit button to return to planning */}
        {activeRoute && (
          <button
            type="button"
            onClick={() => setIsEditingEndpoints(!isEditingEndpoints)}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <Edit2 size={12} />
            <span>{isEditingEndpoints ? 'View Steps' : 'Edit Endpoints'}</span>
          </button>
        )}
      </div>

      {/* Mode A: Planning / Editing Form */}
      {!isNavigating ? (
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto no-scrollbar">
          {/* Location Selector Inputs */}
          <LocationSelector />

          {/* Options Bar */}
          <RouteOptionsBar />

          {/* Error Message Card */}
          {routeError && <FriendlyErrorCard error={routeError} />}

          {/* Primary Action Button */}
          <div className="mt-2 pt-2">
            <button
              type="button"
              onClick={async () => {
                await calculateCurrentRoute();
                setIsEditingEndpoints(false);
              }}
              disabled={!isReady || isLoadingRoute}
              className={`w-full touch-target py-3 px-4 rounded-xl font-heading font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 ${
                isReady && !isLoadingRoute
                  ? 'bg-brand-indigo hover:bg-brand-indigo-hover text-white shadow-brand-indigo/25'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Navigation size={18} className={isLoadingRoute ? 'animate-spin' : ''} />
              <span>{isLoadingRoute ? 'Calculating Optimal Route...' : 'Get Directions'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Mode B: Active Guidance View */
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto no-scrollbar">
          {/* Summary Card */}
          <RouteSummaryCard />

          {/* Turn-by-Turn Instruction List */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Turn-by-turn ({activeRoute?.steps.length} steps)
              </span>
              <span className="text-[10px] text-slate-400">Click step to locate</span>
            </div>

            <div className="flex flex-col gap-2 pb-4">
              {activeRoute?.steps.map((step, idx) => (
                <TurnStepCard
                  key={idx}
                  step={step}
                  index={idx}
                  isActive={activeStepIndex === idx}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectionsPanel;
