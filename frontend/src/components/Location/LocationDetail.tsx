import React, { useState, useMemo, useEffect } from 'react';
import {
  Navigation,
  MapPin,
  Clock,
  X,
  Share2,
  Copy,
  Check,
  Building,
  DoorOpen,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Location } from '../../types';
import { useNavigation } from '../../context/NavigationContext';
import { getCategoryIconComponent, getFacilityIconComponent } from '../../utils/iconMapping';
import { evaluateOperatingHours } from '../../utils/hoursUtils';

interface LocationDetailProps {
  location: Location;
  onClose?: () => void;
}

export const LocationDetail: React.FC<LocationDetailProps> = ({ location, onClose }) => {
  const { setSelectedLocation, startDirectionsTo, startDirectionsFrom, locations } = useNavigation();
  const [imageError, setImageError] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [location.id, location.photo_url]);

  const operatingStatus = useMemo(() => {
    return evaluateOperatingHours(location.opening_hours);
  }, [location.opening_hours]);

  // Find all departments / facilities in the same building (sharing entrance_node_id)
  const buildingLocations = useMemo(() => {
    if (!location.entrance_node_id) return [];
    return locations.filter((loc) => loc.entrance_node_id === location.entrance_node_id);
  }, [location.entrance_node_id, locations]);

  const buildingName = useMemo(() => {
    if (location.entrance_node_id === 4) return 'Department Section Building';
    if (location.entrance_node_id === 3) return 'Administrative Block';
    return location.entrance_node?.name || 'Building';
  }, [location.entrance_node_id, location.entrance_node]);

  const CategoryIcon = getCategoryIconComponent(location.category?.icon || 'MapPin');
  const categoryColor = location.category?.color || '#4F46E5';

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/?location=${location.id}`;
    if (navigator.share) {
      navigator.share({
        title: location.name,
        text: `Check out ${location.name} on Campus Navigator`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="w-full flex flex-col overflow-y-auto no-scrollbar">
      {/* Hero Media Container with Image or Category Fallback */}
      <div className="relative w-full h-40 sm:h-52 rounded-2xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800">
        {location.photo_url && !imageError ? (
          <img
            src={location.photo_url}
            alt={location.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center p-6 text-white relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${categoryColor} 0%, #1E293B 100%)`,
            }}
          >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-15 pointer-events-none">
              <svg width="100%" height="100%">
                <pattern id="dot-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.5" fill="#FFFFFF" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#dot-pattern)" />
              </svg>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg mb-2 z-10">
              <CategoryIcon size={34} color="#FFFFFF" strokeWidth={2.2} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-white/80 z-10">
              {location.category?.name || 'Campus POI'}
            </span>
          </div>
        )}

        {/* Category Pill Overlay */}
        <div className="absolute top-3 left-3 z-10">
          <span
            className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-md flex items-center gap-1.5 backdrop-blur-md"
            style={{ backgroundColor: `${categoryColor}E6` }}
          >
            <CategoryIcon size={13} />
            {location.category?.name || 'General'}
          </span>
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            if (onClose) onClose();
            else setSelectedLocation(null);
          }}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors"
          title="Close details"
          aria-label="Close location details"
        >
          <X size={16} />
        </button>
      </div>

      {/* Main Content Body */}
      <div className="p-4 sm:p-5 flex flex-col gap-4">
        {/* Title & Department */}
        <div>
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-slate-900 dark:text-slate-100 leading-tight">
            {location.name}
          </h2>
          {location.department && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <Building size={14} className="text-slate-400 shrink-0" />
              <span>{location.department}</span>
            </p>
          )}
        </div>

        {/* Operating Hours Status Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
              operatingStatus.badgeVariant === 'emerald'
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                : operatingStatus.badgeVariant === 'rose'
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                : operatingStatus.badgeVariant === 'amber'
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {operatingStatus.badgeVariant === 'emerald' ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            ) : operatingStatus.badgeVariant === 'rose' ? (
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            ) : (
              <Clock size={12} />
            )}
            <span>{operatingStatus.statusLabel}</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {operatingStatus.detailText}
          </span>
        </div>

        {/* Description */}
        {location.description && (
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {location.description}
          </p>
        )}

        {/* Multi-floor Building Directory (Rendered when this building has other floors/departments) */}
        {buildingLocations.length > 1 && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50/70 to-indigo-50/50 dark:from-purple-950/30 dark:to-indigo-950/20 border border-purple-200/80 dark:border-purple-800/60 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                <Layers size={14} className="text-purple-600 dark:text-purple-400" />
                <span>{buildingName} Directory</span>
              </span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                {buildingLocations.length} Floors
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              {buildingLocations.map((bLoc) => {
                const isCurrent = bLoc.id === location.id;
                const floorTag = bLoc.facilities.find((f) => f.includes('Floor')) || 'Floor';

                return (
                  <button
                    key={bLoc.id}
                    onClick={() => {
                      if (!isCurrent) setSelectedLocation(bLoc);
                    }}
                    className={`w-full text-left p-2 rounded-xl transition-all flex items-center justify-between ${
                      isCurrent
                        ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-500'
                        : 'bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 hover:bg-purple-100/70 dark:hover:bg-purple-900/50 border border-purple-100 dark:border-purple-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                          isCurrent
                            ? 'bg-white/20 text-white'
                            : 'bg-purple-100 dark:bg-purple-900/80 text-purple-800 dark:text-purple-200'
                        }`}
                      >
                        {floorTag}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate leading-tight">
                          {bLoc.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {isCurrent ? (
                        <span className="text-[10px] font-bold bg-white/25 px-2 py-0.5 rounded-full text-white">
                          Here
                        </span>
                      ) : (
                        <ChevronRight size={13} className="text-purple-400 opacity-80" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Facilities Chips */}
        {location.facilities && location.facilities.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Available Facilities & Features
            </h3>
            <div className="flex flex-wrap gap-2">
              {location.facilities.map((fac, idx) => {
                const FacIcon = getFacilityIconComponent(fac);
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60"
                  >
                    <FacIcon size={13} className="text-brand-indigo dark:text-brand-teal" />
                    <span>{fac}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Geolocation & Entrance Info */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <MapPin size={15} className="text-brand-teal shrink-0" />
            <span>
              {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyCoords}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
              title="Copy Coordinates"
            >
              {copiedCoords ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
            <button
              onClick={handleShare}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
              title="Share Location"
            >
              {copiedLink ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
            </button>
          </div>
        </div>

        {/* Entrance Node Notice if assigned */}
        {location.entrance_node_id && (
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <DoorOpen size={13} className="text-brand-amber" />
            <span>Campus Gateway: Connected to Entrance Node #{location.entrance_node_id}</span>
          </div>
        )}

        {/* Action CTAs: Directions and Directions From Here */}
        <div className="flex flex-row gap-2 mt-1 pb-2 sm:pb-0">
          {/* Primary Action: Directions To */}
          <button
            onClick={() => startDirectionsTo(location)}
            className="flex-1 touch-target min-h-[46px] py-2.5 px-3 rounded-xl font-heading font-semibold text-xs sm:text-sm bg-brand-indigo hover:bg-brand-indigo-hover text-white shadow-lg shadow-brand-indigo/25 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
          >
            <Navigation size={17} />
            <span>Directions</span>
          </button>

          {/* Secondary Action: Directions From Here */}
          <button
            onClick={() => startDirectionsFrom(location)}
            className="flex-1 touch-target min-h-[46px] py-2.5 px-3 rounded-xl font-heading font-semibold text-xs sm:text-sm bg-brand-teal hover:bg-brand-teal-hover text-white shadow-md shadow-brand-teal/20 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
          >
            <MapPin size={17} />
            <span>From Here</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationDetail;
