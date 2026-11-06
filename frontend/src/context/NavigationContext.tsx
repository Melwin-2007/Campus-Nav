import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Category,
  Location,
  RouteResponse,
  RouteRequest,
  UserLocation,
  BottomSheetSnap,
} from '../types';
import api from '../services/api';
import { isUserOffCampus } from '../utils/geoUtils';

interface NavigationContextValue {
  locations: Location[];
  categories: Category[];
  isLoadingData: boolean;
  selectedLocation: Location | null;
  selectedCategoryId: number | null;
  userLocation: UserLocation | null;
  isOffCampus: boolean;
  offCampusDistance: number;
  originLocation: Location | null;
  destinationLocation: Location | null;
  activeRoute: RouteResponse | null;
  isLoadingRoute: boolean;
  routeError: string | null;
  accessibleOnly: boolean;
  bottomSheetSnap: BottomSheetSnap;
  isScannerOpen: boolean;
  flyToTarget: { lat: number; lon: number; zoom?: number } | null;
  
  // Actions
  setSelectedLocation: (location: Location | null) => void;
  setSelectedCategoryId: (categoryId: number | null) => void;
  setUserLocation: (location: UserLocation | null) => void;
  setOriginLocation: (location: Location | null) => void;
  setDestinationLocation: (location: Location | null) => void;
  setAccessibleOnly: (accessibleOnly: boolean) => void;
  setBottomSheetSnap: (snap: BottomSheetSnap) => void;
  setIsScannerOpen: (isOpen: boolean) => void;
  setFlyToTarget: (target: { lat: number; lon: number; zoom?: number } | null) => void;
  calculateRoute: (overrideReq?: Partial<RouteRequest>) => Promise<void>;
  clearRoute: () => void;
  startDirectionsTo: (dest: Location) => void;
  startDirectionsFrom: (origin: Location) => void;
  refreshData: () => Promise<void>;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocationState] = useState<Location | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [userLocation, setUserLocationState] = useState<UserLocation | null>(null);
  const [isOffCampus, setIsOffCampus] = useState<boolean>(false);
  const [offCampusDistance, setOffCampusDistance] = useState<number>(0);
  const [originLocation, setOriginLocation] = useState<Location | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<Location | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteResponse | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [accessibleOnly, setAccessibleOnly] = useState<boolean>(false);
  const [bottomSheetSnap, setBottomSheetSnap] = useState<BottomSheetSnap>('peek');
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lon: number; zoom?: number } | null>(null);

  // Fetch initial data
  const refreshData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [cats, locs] = await Promise.all([
        api.categories.getAll(),
        api.locations.getAll(),
      ]);
      setCategories(cats);
      setLocations(locs);
    } catch (err) {
      console.error('Failed to load initial campus data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Handle setting selected location
  const setSelectedLocation = useCallback((loc: Location | null) => {
    setSelectedLocationState(loc);
    if (loc) {
      setFlyToTarget({ lat: loc.latitude, lon: loc.longitude, zoom: 17 });
      setBottomSheetSnap('half');
    }
  }, []);

  // Update user location & evaluate off-campus status
  const setUserLocation = useCallback((uLoc: UserLocation | null) => {
    setUserLocationState(uLoc);
    if (uLoc) {
      const status = isUserOffCampus(uLoc.latitude, uLoc.longitude, 300);
      setIsOffCampus(status.offCampus);
      setOffCampusDistance(status.distance);
    } else {
      setIsOffCampus(false);
      setOffCampusDistance(0);
    }
  }, []);

  // Start directions to a destination
  const startDirectionsTo = useCallback((dest: Location) => {
    setDestinationLocation(dest);
    // If we have user location and user is on campus, we can default origin to user GPS
    // Or if origin is not set, we can leave it to user or set Main Gate
    setBottomSheetSnap('half');
  }, []);

  // Start directions from an origin
  const startDirectionsFrom = useCallback((orig: Location) => {
    setOriginLocation(orig);
    setBottomSheetSnap('half');
  }, []);

  // Calculate route
  const calculateRoute = useCallback(async (overrideReq?: Partial<RouteRequest>) => {
    setIsLoadingRoute(true);
    setRouteError(null);

    try {
      const payload: RouteRequest = {
        accessible_only: accessibleOnly,
        algorithm: 'astar',
        ...overrideReq,
      };

      // Populate start/destination if not in override
      if (!payload.start_node_id && !payload.start_lat && !payload.start_coords && !payload.start_location_id) {
        if (originLocation) {
          payload.start_location_id = originLocation.id;
          if (originLocation.entrance_node_id) {
            payload.start_node_id = originLocation.entrance_node_id;
          } else {
            payload.start_lat = originLocation.latitude;
            payload.start_lon = originLocation.longitude;
          }
        } else if (userLocation && !isOffCampus) {
          payload.start_lat = userLocation.latitude;
          payload.start_lon = userLocation.longitude;
        }
      }

      if (!payload.destination_node_id && !payload.dest_lat && !payload.destination_coords && !payload.destination_location_id) {
        if (destinationLocation) {
          payload.destination_location_id = destinationLocation.id;
          if (destinationLocation.entrance_node_id) {
            payload.destination_node_id = destinationLocation.entrance_node_id;
          } else {
            payload.dest_lat = destinationLocation.latitude;
            payload.dest_lon = destinationLocation.longitude;
          }
        }
      }

      if (
        (payload.start_node_id === undefined && payload.start_lat === undefined && payload.start_location_id === undefined) ||
        (payload.destination_node_id === undefined && payload.dest_lat === undefined && payload.destination_location_id === undefined)
      ) {
        throw new Error('Please select both a starting point and a destination.');
      }

      const result = await api.routes.calculate(payload);
      setActiveRoute(result);
      setBottomSheetSnap('half');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            'Failed to compute route. Please try another pair of locations.';
      setRouteError(message);
      setActiveRoute(null);
    } finally {
      setIsLoadingRoute(false);
    }
  }, [accessibleOnly, originLocation, destinationLocation, userLocation, isOffCampus]);

  const clearRoute = useCallback(() => {
    setActiveRoute(null);
    setRouteError(null);
    setOriginLocation(null);
    setDestinationLocation(null);
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        locations,
        categories,
        isLoadingData,
        selectedLocation,
        selectedCategoryId,
        userLocation,
        isOffCampus,
        offCampusDistance,
        originLocation,
        destinationLocation,
        activeRoute,
        isLoadingRoute,
        routeError,
        accessibleOnly,
        bottomSheetSnap,
        isScannerOpen,
        flyToTarget,
        setSelectedLocation,
        setSelectedCategoryId,
        setUserLocation,
        setOriginLocation,
        setDestinationLocation,
        setAccessibleOnly,
        setBottomSheetSnap,
        setIsScannerOpen,
        setFlyToTarget,
        calculateRoute,
        clearRoute,
        startDirectionsTo,
        startDirectionsFrom,
        refreshData,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextValue => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
