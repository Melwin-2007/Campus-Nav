import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { MapView } from './components/Map/MapView';
import { FloatingLeftPanel } from './components/Layout/FloatingLeftPanel';
import { DraggableBottomSheet } from './components/Layout/DraggableBottomSheet';
import { SearchBar } from './components/Search/SearchBar';
import { CategoryChips } from './components/Categories/CategoryChips';
import { LocationDetail } from './components/Location/LocationDetail';
import { DirectionsPanel } from './components/Directions/DirectionsPanel';
import { AdminLoginModal } from './components/Admin/AdminLoginModal';
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
    isDirectionsMode,
    setIsDirectionsMode,
    isAdminLoginOpen,
    setIsAdminLoginOpen,
    isScannerOpen,
    setIsScannerOpen,
    setBottomSheetSnap,
    bottomSheetSnap,
    setFlyToTarget,
    locations,
    selectedCategoryId,
  } = useNavigation();

  const displayedMobileLocations = selectedCategoryId
    ? locations.filter((loc) => loc.category_id === selectedCategoryId)
    : locations;

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
        {!selectedLocation && !isDirectionsMode && !activeRoute && (
          <div className="pointer-events-auto">
            <CategoryChips />
          </div>
        )}
        <div className="pointer-events-auto">
          <OffCampusBanner />
        </div>
      </div>

      {/* 4. Mobile Draggable Bottom Sheet (<768px) */}
      <DraggableBottomSheet>
        {isDirectionsMode || activeRoute ? (
          <div className="p-3">
            <DirectionsPanel />
          </div>
        ) : selectedLocation ? (
          <LocationDetail
            location={selectedLocation}
            onClose={() => {
              setSelectedLocation(null);
              setBottomSheetSnap('peek');
            }}
          />
        ) : (
          /* Default Sheet Content: Campus Glance & Explore */
          <div className="flex flex-col gap-2.5 px-3 pt-0.5 pb-3">
            {/* Peek Summary Header */}
            <div className="flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-2">
                <h3 className="font-heading font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                  {selectedCategoryId
                    ? `${displayedMobileLocations.length} locations filtered`
                    : 'Campus Overview'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {selectedCategoryId
                    ? 'Tap any place to navigate'
                    : `${locations.length} campus buildings & departments`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBottomSheetSnap(bottomSheetSnap === 'peek' ? 'half' : 'full')}
                className="text-xs font-semibold shrink-0 bg-brand-indigo/10 dark:bg-brand-teal/15 text-brand-indigo dark:text-brand-teal px-3 py-1.5 rounded-xl hover:bg-brand-indigo/20 transition-colors"
              >
                {bottomSheetSnap === 'peek' ? 'Browse All' : 'Expand'}
              </button>
            </div>

            {/* Horizontal preview cards (visible when expanded to half or full) */}
            {bottomSheetSnap !== 'peek' && (
              <div className="flex flex-col gap-2 mt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-0.5">
                  All Locations ({displayedMobileLocations.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {displayedMobileLocations.map((loc) => {
                    const floorTag = loc.facilities?.find((f) => f.includes('Floor'));

                    return (
                      <div
                        key={loc.id}
                        onClick={() => {
                          setSelectedLocation(loc);
                          setBottomSheetSnap('half');
                        }}
                        className="p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:border-brand-indigo transition-all flex items-center justify-between active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                            style={{ backgroundColor: loc.category?.color || '#4F46E5' }}
                          >
                            <MapPin size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-heading font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">
                              {loc.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {floorTag && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 shrink-0">
                                  {floorTag}
                                </span>
                              )}
                              <p className="text-[10px] text-slate-400 truncate">
                                {loc.department || loc.category?.name}
                              </p>
                            </div>
                          </div>
                        </div>

                        <NavIcon size={14} className="text-slate-400 shrink-0 ml-1.5" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </DraggableBottomSheet>

      {/* 5. Mobile Fixed Bottom Navigation Bar (<768px, 56px height + Safe Area) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-[calc(3.5rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 z-50 flex items-center justify-around px-2">
        {/* Tab 1: Map */}
        <button
          type="button"
          onClick={() => {
            setFlyToTarget({ lat: CAMPUS_CENTER.lat, lon: CAMPUS_CENTER.lon, zoom: 16 });
            setSelectedLocation(null);
            clearRoute();
            setBottomSheetSnap('peek');
          }}
          className={`flex-1 touch-target flex flex-col items-center justify-center gap-0.5 transition-colors ${
            !isDirectionsMode && !activeRoute && bottomSheetSnap === 'peek' && !selectedLocation
              ? 'text-brand-indigo dark:text-brand-teal font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <MapPin size={18} />
          <span className="text-[10px]">Map</span>
        </button>

        {/* Tab 2: Explore */}
        <button
          type="button"
          onClick={() => {
            setBottomSheetSnap(bottomSheetSnap === 'half' ? 'full' : 'half');
          }}
          className={`flex-1 touch-target flex flex-col items-center justify-center gap-0.5 transition-colors ${
            !isDirectionsMode && !activeRoute && bottomSheetSnap !== 'peek'
              ? 'text-brand-indigo dark:text-brand-teal font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Compass size={18} />
          <span className="text-[10px]">Explore</span>
        </button>

        {/* Tab 3: Directions */}
        <button
          type="button"
          onClick={() => {
            setIsDirectionsMode(true);
            setBottomSheetSnap('half');
          }}
          className={`flex-1 touch-target flex flex-col items-center justify-center gap-0.5 transition-colors ${
            isDirectionsMode || activeRoute
              ? 'text-brand-indigo dark:text-brand-teal font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <NavIcon size={18} />
          <span className="text-[10px]">Directions</span>
        </button>

        {/* Tab 4: QR Scanner */}
        <button
          type="button"
          onClick={() => setIsScannerOpen(true)}
          className="flex-1 touch-target flex flex-col items-center justify-center gap-0.5 text-brand-indigo dark:text-brand-teal hover:opacity-80 transition-opacity"
        >
          <QrCode size={18} />
          <span className="text-[10px] font-bold">Scan QR</span>
        </button>
      </nav>

      {/* 6. In-Browser Native QR Code Scanner Modal */}
      <QRScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />

      {/* 7. Admin Authentication & Graph Editor Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
      />
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
