import React, { useState } from 'react';
import { AlertTriangle, X, MapPin } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';

export const OffCampusBanner: React.FC = () => {
  const { isOffCampus, offCampusDistance, locations, setOriginLocation, setFlyToTarget } =
    useNavigation();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isOffCampus || isDismissed) return null;

  const handleStartFromMainGate = () => {
    // Locate Main Gate or first entrance location
    const mainGate =
      locations.find(
        (l) =>
          l.name.toLowerCase().includes('main gate') ||
          l.name.toLowerCase().includes('entrance') ||
          l.category?.slug === 'entrances-and-exits'
      ) || locations[0];

    if (mainGate) {
      setOriginLocation(mainGate);
      setFlyToTarget({ lat: mainGate.latitude, lon: mainGate.longitude, zoom: 17 });
      setIsDismissed(true);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-md px-3 my-1.5 z-30 animate-fade-in">
      <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-500/15 dark:bg-amber-950/80 border border-amber-400/50 dark:border-amber-700/60 shadow-lg backdrop-blur-md flex items-start gap-3">
        <div className="p-1.5 rounded-xl bg-amber-500/20 text-brand-amber shrink-0 mt-0.5">
          <AlertTriangle size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-heading font-bold text-xs sm:text-sm text-amber-900 dark:text-amber-200 leading-snug">
            You appear to be off-campus
          </h4>
          <p className="text-[11px] sm:text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5 leading-normal">
            Your location is approximately {Math.round(offCampusDistance)}m from campus. Campus
            pedestrian navigation works best from an entrance gate.
          </p>

          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={handleStartFromMainGate}
              className="touch-target px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-amber hover:bg-brand-amber-hover text-white shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
            >
              <MapPin size={13} />
              <span>Start from Main Gate</span>
            </button>
          </div>
        </div>

        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 text-amber-700/60 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-100 rounded-lg transition-colors shrink-0"
          title="Dismiss warning"
          aria-label="Dismiss off-campus warning"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default OffCampusBanner;
