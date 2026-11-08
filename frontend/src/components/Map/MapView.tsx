import React, { useEffect, useMemo, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '../../context/NavigationContext';
import { CategoryMarker } from './CategoryMarker';
import { UserMarker } from './UserMarker';
import { Location } from '../../types';
import { CAMPUS_CENTER, CAMPUS_BOUNDS } from '../../utils/geoUtils';
import { RoutePolyline } from './RoutePolyline';
import { GraphEditor } from '../Admin/GraphEditor';
import api from '../../services/api';
import {
  Plus,
  Minus,
  Navigation,
  Compass,
  Sun,
  Moon,
  Layers,
  ShieldAlert,
} from 'lucide-react';

// Tile URL templates - standard OpenStreetMap (100% free, zero API keys required)
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

// Map controller sub-component for dynamic camera movements and resize invalidation
interface MapControllerProps {
  flyToTarget: { lat: number; lon: number; zoom?: number } | null;
  onTargetHandled: () => void;
  activeRouteCoordinates?: [number, number][];
}

const MapController: React.FC<MapControllerProps> = ({
  flyToTarget,
  onTargetHandled,
  activeRouteCoordinates,
}) => {
  const map = useMap();

  // Invalidate size on mount and window resize to prevent gray tile anomalies
  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    };
  }, [map]);

  // Handle flyTo when target coordinate changes
  useEffect(() => {
    if (!flyToTarget) return;

    const zoom = flyToTarget.zoom || 17;
    const isMobile = window.innerWidth < 768;

    if (!isMobile) {
      map.flyTo([flyToTarget.lat, flyToTarget.lon], zoom, {
        duration: 0.8,
        easeLinearity: 0.25,
      });
    } else {
      // Mobile compensation: Offset map center so marker sits above the bottom sheet
      const targetPoint = map.project([flyToTarget.lat, flyToTarget.lon], zoom);
      const offsetPoint = L.point(targetPoint.x, targetPoint.y + 110);
      const offsetLatLng = map.unproject(offsetPoint, zoom);
      map.flyTo(offsetLatLng, zoom, {
        duration: 0.8,
        easeLinearity: 0.25,
      });
    }

    onTargetHandled();
  }, [flyToTarget, map, onTargetHandled]);

  // Auto-fit route bounds if active route is drawn
  useEffect(() => {
    if (activeRouteCoordinates && activeRouteCoordinates.length > 1) {
      const bounds = L.latLngBounds(activeRouteCoordinates);
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 18,
      });
    }
  }, [activeRouteCoordinates, map]);

  return null;
};

export const MapView: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const {
    locations,
    selectedLocation,
    selectedCategoryId,
    userLocation,
    activeRoute,
    activeStepIndex,
    isAdminMode,
    setIsAdminMode,
    setIsAdminLoginOpen,
    flyToTarget,
    setSelectedLocation,
    setFlyToTarget,
    setUserLocation,
    refreshData,
  } = useNavigation();

  // Filter locations by selected category
  const filteredLocations = useMemo(() => {
    if (!selectedCategoryId) return locations;
    return locations.filter((loc) => loc.category_id === selectedCategoryId);
  }, [locations, selectedCategoryId]);

  // Handle marker selection
  const handleSelectLocation = useCallback(
    (location: Location) => {
      setSelectedLocation(location);
    },
    [setSelectedLocation]
  );

  // Handle location marker drag in admin mode
  const handleLocationDragEnd = useCallback(
    async (loc: Location, newLat: number, newLon: number) => {
      try {
        await api.locations.update(loc.id, {
          latitude: newLat,
          longitude: newLon,
        });
        await refreshData();
      } catch (err) {
        console.error('Failed to update location coordinates:', err);
      }
    },
    [refreshData]
  );

  // Trigger GPS Geolocation
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uLoc = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        setUserLocation(uLoc);
        setFlyToTarget({ lat: uLoc.latitude, lon: uLoc.longitude, zoom: 17 });
      },
      (err) => {
        console.warn('Geolocation error:', err);
        // Fallback demo location within campus perimeter
        const fallbackLoc = {
          latitude: CAMPUS_CENTER.lat,
          longitude: CAMPUS_CENTER.lon,
          accuracy: 15,
          timestamp: Date.now(),
        };
        setUserLocation(fallbackLoc);
        setFlyToTarget({ lat: fallbackLoc.latitude, lon: fallbackLoc.longitude, zoom: 17 });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [setUserLocation, setFlyToTarget]);

  // Reset to campus center
  const handleResetCampusView = useCallback(() => {
    setFlyToTarget({ lat: CAMPUS_CENTER.lat, lon: CAMPUS_CENTER.lon, zoom: CAMPUS_CENTER.zoom });
  }, [setFlyToTarget]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <MapContainer
        center={[CAMPUS_CENTER.lat, CAMPUS_CENTER.lon]}
        zoom={CAMPUS_CENTER.zoom}
        minZoom={14}
        maxZoom={19}
        maxBounds={[CAMPUS_BOUNDS.southWest, CAMPUS_BOUNDS.northEast]}
        maxBoundsViscosity={0.8}
        zoomControl={false}
        className="w-full h-full z-0"
      >
        {/* OpenStreetMap Tile Layer (100% free, zero API key) */}
        <TileLayer
          key={isDark ? 'osm-dark' : 'osm-light'}
          url={OSM_TILE_URL}
          subdomains={['a', 'b', 'c']}
          attribution={TILE_ATTRIBUTION}
          maxZoom={19}
        />

        {/* Map Controller for Camera and Resize Handling */}
        <MapController
          flyToTarget={flyToTarget}
          onTargetHandled={() => setFlyToTarget(null)}
          activeRouteCoordinates={activeRoute?.coordinates}
        />

        {/* User GPS location dot and accuracy circle */}
        <UserMarker location={userLocation} />

        {/* POI Category Markers */}
        {filteredLocations.map((loc) => (
          <CategoryMarker
            key={loc.id}
            location={loc}
            isSelected={selectedLocation?.id === loc.id}
            onSelect={handleSelectLocation}
            isDraggable={isAdminMode}
            onDragEnd={handleLocationDragEnd}
          />
        ))}

        {/* Active Route Polyline Visualizer */}
        {activeRoute && activeRoute.coordinates.length > 1 && (
          <RoutePolyline route={activeRoute} />
        )}

        {/* Visual Map Graph Editor (Admin Mode Layer) */}
        {isAdminMode && <GraphEditor />}
      </MapContainer>

      {/* Floating Glassmorphic Map Control Buttons (Ergonomic bottom-right above peek sheet on mobile, top-right on desktop) */}
      <div className="absolute bottom-36 md:bottom-auto md:top-4 right-3 md:right-4 z-[900] flex flex-col gap-2">
        {/* Admin Graph Editor Toggle */}
        <button
          onClick={() => {
            if (api.auth.isAuthenticated()) {
              setIsAdminMode(!isAdminMode);
            } else {
              setIsAdminLoginOpen(true);
            }
          }}
          className={`touch-target p-2.5 rounded-xl glass-panel transition-all active:scale-95 ${
            isAdminMode
              ? 'bg-amber-500 text-white shadow-md'
              : 'text-slate-700 dark:text-slate-200 hover:text-brand-indigo dark:hover:text-brand-teal'
          }`}
          title={isAdminMode ? 'Exit Graph Editor' : 'Admin Graph Editor'}
          aria-label="Admin Graph Editor"
        >
          <Layers size={20} />
        </button>

        {/* Reset View */}
        <button
          onClick={handleResetCampusView}
          className="touch-target p-2.5 rounded-xl glass-panel text-slate-700 dark:text-slate-200 hover:text-brand-indigo dark:hover:text-brand-teal transition-all active:scale-95"
          title="Reset Campus View"
          aria-label="Reset Campus View"
        >
          <Compass size={20} />
        </button>

        {/* My Location */}
        <button
          onClick={handleLocateMe}
          className="touch-target p-2.5 rounded-xl glass-panel text-slate-700 dark:text-slate-200 hover:text-brand-teal transition-all active:scale-95"
          title="My Location"
          aria-label="Find My Location"
        >
          <Navigation size={20} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="touch-target p-2.5 rounded-xl glass-panel text-slate-700 dark:text-slate-200 hover:text-brand-amber transition-all active:scale-95"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          {isDark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-indigo-600" />}
        </button>
      </div>
    </div>
  );
};

export default MapView;
