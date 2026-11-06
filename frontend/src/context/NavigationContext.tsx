import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Category,
  Location,
  RouteResponse,
  RouteRequest,
  UserLocation,
  BottomSheetSnap,
  EndpointSelection,
  RoutingAlgorithm,
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
  originSelection: EndpointSelection | null;
  destinationSelection: EndpointSelection | null;
  activeRoute: RouteResponse | null;
  isLoadingRoute: boolean;
  routeError: string | null;
  accessibleOnly: boolean;
  routingAlgorithm: RoutingAlgorithm;
  isDirectionsMode: boolean;
  activeStepIndex: number | null;
  shareToastMessage: string | null;
  isAdminMode: boolean;
  isAdminLoginOpen: boolean;
  bottomSheetSnap: BottomSheetSnap;
  isScannerOpen: boolean;
  flyToTarget: { lat: number; lon: number; zoom?: number } | null;

  // Actions
  setSelectedLocation: (location: Location | null) => void;
  setSelectedCategoryId: (categoryId: number | null) => void;
  setUserLocation: (location: UserLocation | null) => void;
  setOriginLocation: (location: Location | null) => void;
  setDestinationLocation: (location: Location | null) => void;
  setOriginSelection: (selection: EndpointSelection | null) => void;
  setDestinationSelection: (selection: EndpointSelection | null) => void;
  swapEndpoints: () => void;
  setAccessibleOnly: (accessibleOnly: boolean) => void;
  setRoutingAlgorithm: (algo: RoutingAlgorithm) => void;
  setIsDirectionsMode: (isDirections: boolean) => void;
  openDirections: (options?: { origin?: Location | 'my_location'; destination?: Location }) => void;
  closeDirections: () => void;
  setActiveStepIndex: (stepIndex: number | null) => void;
  focusStep: (stepIndex: number) => void;
  setIsAdminMode: (isAdmin: boolean) => void;
  setIsAdminLoginOpen: (isOpen: boolean) => void;
  setBottomSheetSnap: (snap: BottomSheetSnap) => void;
  setIsScannerOpen: (isOpen: boolean) => void;
  setFlyToTarget: (target: { lat: number; lon: number; zoom?: number } | null) => void;
  calculateRoute: (overrideReq?: Partial<RouteRequest>) => Promise<void>;
  calculateCurrentRoute: () => Promise<void>;
  clearRoute: () => void;
  startDirectionsTo: (dest: Location) => void;
  startDirectionsFrom: (origin: Location) => void;
  shareRouteLink: () => Promise<boolean>;
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

  // Directions state
  const [originSelection, setOriginSelectionState] = useState<EndpointSelection | null>(null);
  const [destinationSelection, setDestinationSelectionState] = useState<EndpointSelection | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteResponse | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [accessibleOnly, setAccessibleOnly] = useState<boolean>(false);
  const [routingAlgorithm, setRoutingAlgorithm] = useState<RoutingAlgorithm>('astar');
  const [isDirectionsMode, setIsDirectionsMode] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [shareToastMessage, setShareToastMessage] = useState<string | null>(null);

  // Admin and modal state
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);
  const [bottomSheetSnap, setBottomSheetSnap] = useState<BottomSheetSnap>('peek');
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lon: number; zoom?: number } | null>(null);

  // Derived legacy location references for backward compatibility
  const originLocation = originSelection?.type === 'location' ? originSelection.location || null : null;
  const destinationLocation = destinationSelection?.type === 'location' ? destinationSelection.location || null : null;

  // Set origin selection helper
  const setOriginSelection = useCallback((sel: EndpointSelection | null) => {
    setOriginSelectionState(sel);
    setRouteError(null);
  }, []);

  // Set destination selection helper
  const setDestinationSelection = useCallback((sel: EndpointSelection | null) => {
    setDestinationSelectionState(sel);
    setRouteError(null);
  }, []);

  // Backward compatibility setters
  const setOriginLocation = useCallback((loc: Location | null) => {
    if (loc) {
      setOriginSelectionState({
        type: 'location',
        location: loc,
        latitude: loc.latitude,
        longitude: loc.longitude,
        label: loc.name,
      });
    } else {
      setOriginSelectionState(null);
    }
  }, []);

  const setDestinationLocation = useCallback((loc: Location | null) => {
    if (loc) {
      setDestinationSelectionState({
        type: 'location',
        location: loc,
        latitude: loc.latitude,
        longitude: loc.longitude,
        label: loc.name,
      });
    } else {
      setDestinationSelectionState(null);
    }
  }, []);

  // Swap endpoints
  const swapEndpoints = useCallback(() => {
    setOriginSelectionState((prevOrigin) => {
      setDestinationSelectionState(prevOrigin);
      return destinationSelection;
    });
    setRouteError(null);
    setActiveRoute(null);
    setActiveStepIndex(null);
  }, [destinationSelection]);

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

  // Focus a specific step
  const focusStep = useCallback((stepIndex: number) => {
    setActiveStepIndex(stepIndex);
    if (activeRoute && activeRoute.steps[stepIndex]) {
      const step = activeRoute.steps[stepIndex];
      setFlyToTarget({ lat: step.lat, lon: step.lon, zoom: 18 });
    }
  }, [activeRoute]);

  // Calculate route with flexible request
  const calculateRoute = useCallback(async (overrideReq?: Partial<RouteRequest>) => {
    setIsLoadingRoute(true);
    setRouteError(null);

    try {
      const payload: RouteRequest = {
        accessible_only: accessibleOnly,
        algorithm: routingAlgorithm,
        ...overrideReq,
      };

      // Populate start endpoint
      if (!payload.start_node_id && !payload.start_lat && !payload.start_coords && !payload.start_location_id) {
        if (originSelection) {
          if (originSelection.type === 'location' && originSelection.location) {
            payload.start_location_id = originSelection.location.id;
            if (originSelection.location.entrance_node_id) {
              payload.start_node_id = originSelection.location.entrance_node_id;
            } else {
              payload.start_lat = originSelection.location.latitude;
              payload.start_lon = originSelection.location.longitude;
            }
          } else if (originSelection.type === 'my_location' && userLocation) {
            payload.start_lat = userLocation.latitude;
            payload.start_lon = userLocation.longitude;
          } else if (originSelection.latitude !== undefined && originSelection.longitude !== undefined) {
            payload.start_lat = originSelection.latitude;
            payload.start_lon = originSelection.longitude;
          }
        } else if (userLocation && !isOffCampus) {
          payload.start_lat = userLocation.latitude;
          payload.start_lon = userLocation.longitude;
        }
      }

      // Populate destination endpoint
      if (!payload.destination_node_id && !payload.dest_lat && !payload.destination_coords && !payload.destination_location_id) {
        if (destinationSelection) {
          if (destinationSelection.type === 'location' && destinationSelection.location) {
            payload.destination_location_id = destinationSelection.location.id;
            if (destinationSelection.location.entrance_node_id) {
              payload.destination_node_id = destinationSelection.location.entrance_node_id;
            } else {
              payload.dest_lat = destinationSelection.location.latitude;
              payload.dest_lon = destinationSelection.location.longitude;
            }
          } else if (destinationSelection.latitude !== undefined && destinationSelection.longitude !== undefined) {
            payload.dest_lat = destinationSelection.latitude;
            payload.dest_lon = destinationSelection.longitude;
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
      setActiveStepIndex(null);
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
  }, [accessibleOnly, routingAlgorithm, originSelection, destinationSelection, userLocation, isOffCampus]);

  // Current route calculation shortcut
  const calculateCurrentRoute = useCallback(async () => {
    return calculateRoute();
  }, [calculateRoute]);

  // Open directions planning view
  const openDirections = useCallback((options?: { origin?: Location | 'my_location'; destination?: Location }) => {
    setIsDirectionsMode(true);
    setSelectedLocationState(null);

    if (options?.origin) {
      if (options.origin === 'my_location') {
        if (userLocation) {
          setOriginSelectionState({
            type: 'my_location',
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            label: 'My Current Location',
          });
        }
      } else {
        setOriginSelectionState({
          type: 'location',
          location: options.origin,
          latitude: options.origin.latitude,
          longitude: options.origin.longitude,
          label: options.origin.name,
        });
      }
    }

    if (options?.destination) {
      setDestinationSelectionState({
        type: 'location',
        location: options.destination,
        latitude: options.destination.latitude,
        longitude: options.destination.longitude,
        label: options.destination.name,
      });
    }

    setBottomSheetSnap('half');
  }, [userLocation]);

  const closeDirections = useCallback(() => {
    setIsDirectionsMode(false);
    setActiveRoute(null);
    setRouteError(null);
    setActiveStepIndex(null);
  }, []);

  // Start directions to a destination
  const startDirectionsTo = useCallback((dest: Location) => {
    openDirections({
      origin: userLocation && !isOffCampus ? 'my_location' : undefined,
      destination: dest,
    });
  }, [openDirections, userLocation, isOffCampus]);

  // Start directions from an origin
  const startDirectionsFrom = useCallback((orig: Location) => {
    openDirections({
      origin: orig,
    });
  }, [openDirections]);

  // Clear route
  const clearRoute = useCallback(() => {
    setActiveRoute(null);
    setRouteError(null);
    setActiveStepIndex(null);
    setOriginSelectionState(null);
    setDestinationSelectionState(null);
    setIsDirectionsMode(false);
  }, []);

  // Share route link
  const shareRouteLink = useCallback(async (): Promise<boolean> => {
    if (!originSelection || !destinationSelection) return false;

    const params = new URLSearchParams();
    if (originSelection.type === 'location' && originSelection.location) {
      params.set('origin', String(originSelection.location.id));
    } else if (originSelection.latitude && originSelection.longitude) {
      params.set('origin_lat', String(originSelection.latitude));
      params.set('origin_lon', String(originSelection.longitude));
    }

    if (destinationSelection.type === 'location' && destinationSelection.location) {
      params.set('dest', String(destinationSelection.location.id));
    } else if (destinationSelection.latitude && destinationSelection.longitude) {
      params.set('dest_lat', String(destinationSelection.latitude));
      params.set('dest_lon', String(destinationSelection.longitude));
    }

    params.set('accessible', String(accessibleOnly));
    params.set('algo', routingAlgorithm);

    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShareToastMessage('Route link copied to clipboard!');
        setTimeout(() => setShareToastMessage(null), 3000);
        return true;
      }
    } catch {
      // Fallback
    }
    return false;
  }, [originSelection, destinationSelection, accessibleOnly, routingAlgorithm]);

  // Deep-linking URL handler on initial load
  useEffect(() => {
    if (locations.length === 0) return;

    const urlParams = new URLSearchParams(window.location.search);
    const originParam = urlParams.get('origin') || urlParams.get('start');
    const destParam = urlParams.get('dest') || urlParams.get('destination');
    const accessibleParam = urlParams.get('accessible');
    const algoParam = urlParams.get('algo');

    if (originParam || destParam) {
      setIsDirectionsMode(true);

      if (accessibleParam === 'true') {
        setAccessibleOnly(true);
      }
      if (algoParam === 'dijkstra' || algoParam === 'astar') {
        setRoutingAlgorithm(algoParam);
      }

      let originLoc: Location | undefined;
      let destLoc: Location | undefined;

      if (originParam) {
        const id = parseInt(originParam, 10);
        originLoc = locations.find((l) => l.id === id);
        if (originLoc) {
          setOriginSelectionState({
            type: 'location',
            location: originLoc,
            latitude: originLoc.latitude,
            longitude: originLoc.longitude,
            label: originLoc.name,
          });
        }
      }

      if (destParam) {
        const id = parseInt(destParam, 10);
        destLoc = locations.find((l) => l.id === id);
        if (destLoc) {
          setDestinationSelectionState({
            type: 'location',
            location: destLoc,
            latitude: destLoc.latitude,
            longitude: destLoc.longitude,
            label: destLoc.name,
          });
        }
      }

      // If both resolved, auto-calculate
      if (originLoc && destLoc) {
        const req: RouteRequest = {
          start_location_id: originLoc.id,
          destination_location_id: destLoc.id,
          accessible_only: accessibleParam === 'true',
          algorithm: algoParam === 'dijkstra' ? 'dijkstra' : 'astar',
        };
        api.routes.calculate(req).then((res) => {
          setActiveRoute(res);
          setBottomSheetSnap('half');
        }).catch((err) => {
          console.warn('Auto route calculation from deep link failed:', err);
        });
      }
    }
  }, [locations]);

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
        originSelection,
        destinationSelection,
        activeRoute,
        isLoadingRoute,
        routeError,
        accessibleOnly,
        routingAlgorithm,
        isDirectionsMode,
        activeStepIndex,
        shareToastMessage,
        isAdminMode,
        isAdminLoginOpen,
        bottomSheetSnap,
        isScannerOpen,
        flyToTarget,
        setSelectedLocation,
        setSelectedCategoryId,
        setUserLocation,
        setOriginLocation,
        setDestinationLocation,
        setOriginSelection,
        setDestinationSelection,
        swapEndpoints,
        setAccessibleOnly,
        setRoutingAlgorithm,
        setIsDirectionsMode,
        openDirections,
        closeDirections,
        setActiveStepIndex,
        focusStep,
        setIsAdminMode,
        setIsAdminLoginOpen,
        setBottomSheetSnap,
        setIsScannerOpen,
        setFlyToTarget,
        calculateRoute,
        calculateCurrentRoute,
        clearRoute,
        startDirectionsTo,
        startDirectionsFrom,
        shareRouteLink,
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
