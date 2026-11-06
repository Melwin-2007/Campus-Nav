import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { MapView } from './components/Map/MapView';
import { FloatingLeftPanel } from './components/Layout/FloatingLeftPanel';
import { DraggableBottomSheet } from './components/Layout/DraggableBottomSheet';
import { SearchBar } from './components/Search/SearchBar';
import { CategoryChips } from './components/Categories/CategoryChips';
import { LocationDetail } from './components/Location/LocationDetail';
import { QRScannerModal } from './components/Scanner/QRScannerModal';
import { OffCampusBanner } from './components/Common/OffCampusBanner';
import {
  MapPin,
  Compass,
  QrCode,
  Footprints,
  X,
  Navigation as NavIcon,
} from 'lucide-react';
import { CAMPUS_CENTER } from './utils/geoUtils';

const MainLayout: React.FC = () => {
  const {
    selectedLocation,
    setSelectedLocation,
    activeRoute,
    clearRoute,
    isScannerOpen,
    setIsScannerOpen,
    setBottomSheetSnap,
    setFlyToTarget,
    locations,
  } = useNavigation();

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-50 dark:bg-midnight select-none">
      {/* 1. Full-Screen Interactive Leaflet Map Engine */}
      <MapView />

      {/* 2. Desktop Floating Glass Panel (>=768px) */}
      <FloatingLeftPanel />

      {/* 3. Mobile Top Floating Header (<768px) */}
      <div className="md:hidden fixed top-3 inset-x-3 z-30 flex flex-col gap-1.5 pointer-events-none">
        <div className="pointer-events-auto">
          <SearchBar onOpenScanner={() => setIsScannerOpen(true)} />
        </div>
        <div className="pointer-events-auto">
          <CategoryChips />
        </div>
        <div className="pointer-events-auto">
          <OffCampusBanner />
        </div>
      </div>

      {/* 4. Mobile Draggable Bottom Sheet (<768px) */}
      <DraggableBottomSheet>
        {selectedLocation ? (
          <LocationDetail
            location={selectedLocation}
            onClose={() => {
              setSelectedLocation(null);
              setBottomSheetSnap('peek');
            }}
          />
        ) : activeRoute ? (
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-teal/20 text-brand-teal flex items-center justify-center">
                  <NavIcon size={18} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-slate-800 dark:text-slate-100">
                    Active Route
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeRoute.algorithm_used.toUpperCase()} Path
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  clearRoute();
                  setBottomSheetSnap('peek');
                }}
                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                title="Exit navigation"
              >
                <X size={18} />
              </button>
            </div>

            {/* Distance & Time Highlight Card */}
            <div className="p-3.5 rounded-2xl bg-brand-indigo/10 dark:bg-brand-indigo/20 border border-brand-indigo/20 flex items-center justify-between">
              <div>
                <div className="text-2xl font-heading font-extrabold text-brand-indigo dark:text-indigo-300">
                  {Math.round(activeRoute.distance_meters)}m
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                  <Footprints size={13} />
                  <span>~{activeRoute.duration_minutes} min walking time</span>
                </div>
              </div>

              {activeRoute.accessible_only && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  Accessible
                </span>
              )}
            </div>

            {/* Turn by Turn Steps List */}
            <div className="mt-2 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Directions ({activeRoute.steps.length} steps)
              </h4>
              <ol className="relative border-l border-slate-200 dark:border-slate-700 ml-3 space-y-3 py-1">
                {activeRoute.steps.map((step, idx) => (
                  <li key={idx} className="mb-3 ml-5">
                    <span className="absolute flex items-center justify-center w-5 h-5 rounded-full -left-2.5 ring-4 ring-white dark:ring-slate-900 bg-brand-teal text-white text-[10px] font-bold">
                      {step.step_number}
                    </span>
                    <h5 className="font-medium text-xs text-slate-800 dark:text-slate-200 leading-snug">
                      {step.instruction}
                    </h5>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {Math.round(step.distance_meters)}m • {step.duration_seconds}s
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : (
          /* Default Peek Content: Campus Glance */
          <div className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-sm text-slate-800 dark:text-slate-100">
                  Campus Overview
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {locations.length} campus buildings & facilities mapped
                </p>
              </div>
              <button
                onClick={() => setBottomSheetSnap('half')}
                className="text-xs font-semibold text-brand-indigo dark:text-brand-teal px-3 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Browse All
              </button>
            </div>

            {/* Quick horizontal preview list */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
              {locations.slice(0, 6).map((loc) => (
                <div
                  key={loc.id}
                  onClick={() => {
                    setSelectedLocation(loc);
                    setBottomSheetSnap('half');
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shrink-0 w-36 cursor-pointer hover:border-brand-indigo transition-all"
                >
                  <p className="font-heading font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">
                    {loc.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {loc.category?.name || 'Building'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DraggableBottomSheet>

      {/* 5. Mobile Fixed Bottom Navigation Bar (<768px, 56px height) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 z-30 flex items-center justify-around px-4">
        <button
          onClick={() => {
            setFlyToTarget({ lat: CAMPUS_CENTER.lat, lon: CAMPUS_CENTER.lon, zoom: 16 });
            setSelectedLocation(null);
            clearRoute();
            setBottomSheetSnap('peek');
          }}
          className="flex flex-col items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-brand-indigo dark:hover:text-brand-teal transition-colors"
        >
          <MapPin size={18} />
          <span className="text-[10px] font-medium">Map</span>
        </button>

        <button
          onClick={() => {
            setBottomSheetSnap('half');
          }}
          className="flex flex-col items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-brand-indigo dark:hover:text-brand-teal transition-colors"
        >
          <Compass size={18} />
          <span className="text-[10px] font-medium">Explore</span>
        </button>

        <button
          onClick={() => setIsScannerOpen(true)}
          className="flex flex-col items-center gap-1 text-brand-indigo dark:text-brand-teal hover:opacity-80 transition-opacity"
        >
          <QrCode size={18} />
          <span className="text-[10px] font-bold">Scan QR</span>
        </button>
      </nav>

      {/* 6. In-Browser Native QR Code Scanner Modal */}
      <QRScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <NavigationProvider>
        <MainLayout />
      </NavigationProvider>
    </ThemeProvider>
  );
};

export default App;
