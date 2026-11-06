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
import {
  Plus,
  Minus,
  Navigation,
  Compass,
  Sun,
  Moon,
} from 'lucide-react';

// Tile URL templates
const CARTO_LIGHT_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const CARTO_DARK_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

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

// Route Termini Icons
const startIcon = L.divIcon({
  html: `
    <div style="background-color: #10B981; width: 22px; height: 22px; border-radius: 50%; border: 3px solid #FFFFFF; box-shadow: 0 2px 8px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
      <div style="background-color: #FFFFFF; width: 6px; height: 6px; border-radius: 50%;"></div>
    </div>
  `,
  className: 'route-start-pin',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const endIcon = L.divIcon({
  html: `
    <div style="background-color: #EF4444; width: 22px; height: 22px; border-radius: 50%; border: 3px solid #FFFFFF; box-shadow: 0 2px 8px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
      <div style="background-color: #FFFFFF; width: 6px; height: 6px; border-radius: 50%;"></div>
    </div>
  `,
  className: 'route-dest-pin',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export const MapView: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const {
    locations,
    selectedLocation,
    selectedCategoryId,
    userLocation,
    activeRoute,
    flyToTarget,
    setSelectedLocation,
    setFlyToTarget,
    setUserLocation,
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
          latitude: 17.6595,
          longitude: 75.9062,
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
        {/* Dynamic Tile Layer according to dark/light theme */}
        <TileLayer
          key={isDark ? 'carto-dark' : 'carto-light'}
          url={isDark ? CARTO_DARK_URL : CARTO_LIGHT_URL}
          subdomains={['a', 'b', 'c', 'd']}
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
          />
        ))}

        {/* Active Route Polyline Visualizer */}
        {activeRoute && activeRoute.coordinates.length > 1 && (
          <>
            {/* Outer polyline shadow/border */}
            <Polyline
              positions={activeRoute.coordinates}
              pathOptions={{
                color: isDark ? '#0F172A' : '#FFFFFF',
                weight: 9,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Inner vibrant teal active path line */}
            <Polyline
              positions={activeRoute.coordinates}
              pathOptions={{
                color: '#14B8A6',
                weight: 5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />

            {/* Start Pin */}
            <Marker position={activeRoute.coordinates[0]} icon={startIcon}>
              <Tooltip direction="top" offset={[0, -12]}>
                <span className="font-semibold text-xs text-emerald-700">Start</span>
              </Tooltip>
            </Marker>

            {/* Destination Pin */}
            <Marker
              position={activeRoute.coordinates[activeRoute.coordinates.length - 1]}
              icon={endIcon}
            >
              <Tooltip direction="top" offset={[0, -12]}>
                <span className="font-semibold text-xs text-rose-700">Destination</span>
              </Tooltip>
            </Marker>
          </>
        )}
      </MapContainer>

      {/* Floating Glassmorphic Map Control Buttons (Top-Right) */}
      <div className="absolute top-4 right-4 z-[900] flex flex-col gap-2">
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
