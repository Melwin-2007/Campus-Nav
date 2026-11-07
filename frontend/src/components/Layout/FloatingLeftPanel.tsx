import React from 'react';
import { Compass, Navigation, MapPin, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { SearchBar } from '../Search/SearchBar';
import { CategoryChips } from '../Categories/CategoryChips';
import { LocationDetail } from '../Location/LocationDetail';
import { DirectionsPanel } from '../Directions/DirectionsPanel';

export const FloatingLeftPanel: React.FC = () => {
  const {
    selectedLocation,
    setSelectedLocation,
    activeRoute,
    isDirectionsMode,
    setIsDirectionsMode,
    locations,
    startDirectionsTo,
  } = useNavigation();

  return (
    <aside className="hidden md:flex fixed top-4 left-4 bottom-4 w-[420px] max-w-[calc(100vw-32px)] z-30 flex-col glass-panel shadow-floating border border-slate-200/80 dark:border-slate-800/80 rounded-3xl overflow-hidden backdrop-blur-xl">
      {/* Brand Header */}
      <div className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-indigo to-brand-teal flex items-center justify-center text-white shadow-md shadow-brand-indigo/20">
            <Compass size={22} className="animate-spin-slow" />
          </div>
          <div>
            <h1 className="font-heading font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight leading-none">
              Campus Navigator
            </h1>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              SGBIT, Belagavi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck size={11} />
            Live Map
          </span>
        </div>
      </div>

      {/* Persistent Search and Category Filtering Section */}
      <div className="p-4 pb-2 flex flex-col gap-2 shrink-0 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <SearchBar />
          </div>
          <button
            type="button"
            onClick={() => setIsDirectionsMode(!isDirectionsMode)}
            className={`p-2.5 rounded-2xl border transition-all shrink-0 ${
              isDirectionsMode || activeRoute
                ? 'bg-brand-indigo text-white border-brand-indigo shadow-sm'
                : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:border-brand-indigo'
            }`}
            title="Directions & Navigation"
            aria-label="Directions & Navigation"
          >
            <Navigation size={18} />
          </button>
        </div>
        <CategoryChips />
      </div>

      {/* Main Dynamic Panel Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col">
        {/* State A: Directions View */}
        {isDirectionsMode || activeRoute ? (
          <DirectionsPanel />
        ) : selectedLocation ? (
          /* State B: Location Detail View */
          <div className="flex flex-col h-full">
            <div className="mb-2">
              <button
                onClick={() => setSelectedLocation(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-indigo dark:hover:text-brand-teal transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back to Overview</span>
              </button>
            </div>
            <LocationDetail location={selectedLocation} />
          </div>
        ) : (
          /* State C: Campus Overview & Featured Locations */
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="font-heading font-bold text-sm text-slate-800 dark:text-slate-100">
                Explore Campus
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Click any building marker on the map or select from popular destinations below.
              </p>
            </div>

            {/* Featured Locations List */}
            <div className="flex flex-col gap-2">
              {locations.slice(0, 7).map((loc) => (
                <div
                  key={loc.id}
                  onClick={() => setSelectedLocation(loc)}
                  className="p-3 rounded-2xl glass-card hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: loc.category?.color || '#4F46E5' }}
                    >
                      <MapPin size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-semibold text-xs text-slate-800 dark:text-slate-100 truncate group-hover:text-brand-indigo dark:group-hover:text-brand-teal transition-colors">
                        {loc.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {loc.department || loc.category?.name}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startDirectionsTo(loc);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-indigo hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
                    title="Directions"
                  >
                    <Navigation size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default FloatingLeftPanel;
