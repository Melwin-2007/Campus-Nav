import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ArrowUpDown,
  MapPin,
  Navigation,
  Search,
  X,
  Compass,
  AlertCircle,
} from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { Location, EndpointSelection } from '../../types';
import { getCategoryIconComponent } from '../../utils/iconMapping';

interface LocationSelectorProps {
  onCalculateRoute?: () => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = () => {
  const {
    locations,
    userLocation,
    isOffCampus,
    originSelection,
    destinationSelection,
    setOriginSelection,
    setDestinationSelection,
    swapEndpoints,
    routeError,
  } = useNavigation();

  // Active dropdown state: 'origin' | 'destination' | null
  const [activeDropdown, setActiveDropdown] = useState<'origin' | 'destination' | null>(null);
  const [originSearchText, setOriginSearchText] = useState<string>('');
  const [destSearchText, setDestSearchText] = useState<string>('');
  const [isSwapping, setIsSwapping] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync inputs with selection state
  useEffect(() => {
    if (originSelection) {
      setOriginSearchText(originSelection.label);
    } else {
      setOriginSearchText('');
    }
  }, [originSelection]);

  useEffect(() => {
    if (destinationSelection) {
      setDestSearchText(destinationSelection.label);
    } else {
      setDestSearchText('');
    }
  }, [destinationSelection]);

  // Handle clicking outside to close autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter locations for origin search
  const filteredOriginLocations = useMemo(() => {
    const q = originSearchText.trim().toLowerCase();
    if (!q || originSelection?.label.toLowerCase() === q) return locations;
    return locations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        (loc.department && loc.department.toLowerCase().includes(q)) ||
        (loc.category?.name && loc.category.name.toLowerCase().includes(q))
    );
  }, [locations, originSearchText, originSelection]);

  // Filter locations for destination search
  const filteredDestLocations = useMemo(() => {
    const q = destSearchText.trim().toLowerCase();
    if (!q || destinationSelection?.label.toLowerCase() === q) return locations;
    return locations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        (loc.department && loc.department.toLowerCase().includes(q)) ||
        (loc.category?.name && loc.category.name.toLowerCase().includes(q))
    );
  }, [locations, destSearchText, destinationSelection]);

  // Handle swap with visual rotation
  const handleSwap = () => {
    setIsSwapping(true);
    swapEndpoints();
    setTimeout(() => setIsSwapping(false), 300);
  };

  // Select origin location
  const handleSelectOrigin = (loc: Location) => {
    setOriginSelection({
      type: 'location',
      location: loc,
      latitude: loc.latitude,
      longitude: loc.longitude,
      label: loc.name,
    });
    setOriginSearchText(loc.name);
    setActiveDropdown(null);
  };

  // Select "My Current Location"
  const handleSelectMyLocation = () => {
    if (!userLocation) return;
    setOriginSelection({
      type: 'my_location',
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      label: 'My Current Location',
    });
    setOriginSearchText('My Current Location');
    setActiveDropdown(null);
  };

  // Select destination location
  const handleSelectDest = (loc: Location) => {
    setDestinationSelection({
      type: 'location',
      location: loc,
      latitude: loc.latitude,
      longitude: loc.longitude,
      label: loc.name,
    });
    setDestSearchText(loc.name);
    setActiveDropdown(null);
  };

  return (
    <div ref={containerRef} className="relative flex flex-col gap-2.5">
      {/* Route Inputs with Transit Track Line */}
      <div className="relative flex items-center gap-2">
        {/* Transit Dots and Connecting Line */}
        <div className="flex flex-col items-center justify-between py-3 h-24 shrink-0 w-5">
          {/* Origin Emerald Dot */}
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shadow-sm" />
          {/* Vertical Dash Line */}
          <div className="flex-1 w-0.5 border-l-2 border-dashed border-slate-300 dark:border-slate-600 my-1" />
          {/* Destination Crimson Pin */}
          <div className="w-3.5 h-3.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20 shadow-sm" />
        </div>

        {/* Input Fields */}
        <div className="flex-1 flex flex-col gap-2">
          {/* 1. Origin Input Field */}
          <div className="relative">
            <input
              type="text"
              value={originSearchText}
              onChange={(e) => {
                setOriginSearchText(e.target.value);
                if (!e.target.value) setOriginSelection(null);
              }}
              onFocus={() => setActiveDropdown('origin')}
              placeholder="Choose starting point or 'My Location'..."
              className="w-full text-xs font-medium py-2.5 pl-3 pr-8 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent transition-all shadow-sm"
            />
            {originSelection && (
              <button
                type="button"
                onClick={() => {
                  setOriginSelection(null);
                  setOriginSearchText('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* 2. Destination Input Field */}
          <div className="relative">
            <input
              type="text"
              value={destSearchText}
              onChange={(e) => {
                setDestSearchText(e.target.value);
                if (!e.target.value) setDestinationSelection(null);
              }}
              onFocus={() => setActiveDropdown('destination')}
              placeholder="Choose destination building or POI..."
              className="w-full text-xs font-medium py-2.5 pl-3 pr-8 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent transition-all shadow-sm"
            />
            {destinationSelection && (
              <button
                type="button"
                onClick={() => {
                  setDestinationSelection(null);
                  setDestSearchText('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Swap Button (↕) */}
        <button
          type="button"
          onClick={handleSwap}
          className={`touch-target p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-brand-indigo dark:hover:text-brand-teal transition-all shadow-sm shrink-0 ${
            isSwapping ? 'rotate-180 duration-300' : 'duration-150'
          }`}
          title="Swap starting point and destination"
          aria-label="Swap starting point and destination"
        >
          <ArrowUpDown size={17} />
        </button>
      </div>

      {/* Autocomplete Dropdown List */}
      {activeDropdown && (
        <div className="absolute top-[102px] inset-x-0 z-50 max-h-64 overflow-y-auto no-scrollbar bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 flex flex-col gap-1 backdrop-blur-xl">
          {/* Quick Option for Origin: Use Current Location */}
          {activeDropdown === 'origin' && (
            <div
              onClick={handleSelectMyLocation}
              className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                isOffCampus
                  ? 'bg-amber-500/10 hover:bg-amber-500/15 text-amber-800 dark:text-amber-300'
                  : 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 dark:text-teal-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-brand-teal text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Navigation size={14} className="animate-pulse" />
                </div>
                <div>
                  <p className="font-heading font-semibold text-xs">Use My Current Location</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {userLocation
                      ? isOffCampus
                        ? 'Off-campus (snap to nearest gate)'
                        : `Accurate to ±${Math.round(userLocation.accuracy)}m`
                      : 'Detecting GPS coordinates...'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-teal/20 text-brand-teal">
                GPS
              </span>
            </div>
          )}

          {/* Location Suggestions */}
          {(activeDropdown === 'origin' ? filteredOriginLocations : filteredDestLocations).map(
            (loc) => {
              const CategoryIcon = getCategoryIconComponent(loc.category?.icon || 'MapPin');
              const catColor = loc.category?.color || '#4F46E5';

              return (
                <div
                  key={loc.id}
                  onClick={() => {
                    if (activeDropdown === 'origin') handleSelectOrigin(loc);
                    else handleSelectDest(loc);
                  }}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: catColor }}
                    >
                      <CategoryIcon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-semibold text-xs text-slate-800 dark:text-slate-100 truncate group-hover:text-brand-indigo dark:group-hover:text-brand-teal">
                        {loc.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {loc.department || loc.category?.name}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                    {loc.entrance_node_id ? `Entrance #${loc.entrance_node_id}` : 'Direct'}
                  </span>
                </div>
              );
            }
          )}

          {(activeDropdown === 'origin' ? filteredOriginLocations : filteredDestLocations)
            .length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400">
              No matching campus locations found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationSelector;
