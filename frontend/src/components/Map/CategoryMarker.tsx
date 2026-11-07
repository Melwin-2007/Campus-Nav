import React, { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { Location } from '../../types';
import { getCategoryIconComponent } from '../../utils/iconMapping';

interface CategoryMarkerProps {
  location: Location;
  isSelected: boolean;
  onSelect: (location: Location) => void;
  isDraggable?: boolean;
  onDragEnd?: (location: Location, lat: number, lon: number) => void;
}

// Memory cache for generated divIcons to avoid recreating DOM strings
const markerIconCache = new Map<string, L.DivIcon>();

function createCategoryDivIcon(
  color: string,
  iconName: string,
  isSelected: boolean
): L.DivIcon {
  const cacheKey = `${color}_${iconName}_${isSelected ? '1' : '0'}`;
  const cached = markerIconCache.get(cacheKey);
  if (cached) return cached;

  const IconComponent = getCategoryIconComponent(iconName);
  const iconMarkup = renderToStaticMarkup(
    <IconComponent size={isSelected ? 20 : 18} color="#FFFFFF" strokeWidth={2.4} />
  );

  const markerHtml = `
    <div class="custom-marker-wrapper ${isSelected ? 'marker-selected' : ''}">
      ${isSelected ? '<div class="marker-amber-halo"></div>' : ''}
      <div class="marker-pin-body" style="background-color: ${color};">
        ${iconMarkup}
      </div>
      <div class="marker-pin-tip" style="color: ${color};"></div>
    </div>
  `;

  const icon = L.divIcon({
    html: markerHtml,
    className: 'custom-leaflet-marker',
    iconSize: isSelected ? [48, 56] : [36, 44],
    iconAnchor: isSelected ? [24, 56] : [18, 44],
    popupAnchor: [0, isSelected ? -56 : -44],
  });

  markerIconCache.set(cacheKey, icon);
  return icon;
}

export const CategoryMarker: React.FC<CategoryMarkerProps> = ({
  location,
  isSelected,
  onSelect,
  isDraggable = false,
  onDragEnd,
}) => {
  const icon = useMemo(() => {
    const color = location.category?.color || '#4F46E5';
    const iconName = location.category?.icon || 'MapPin';
    return createCategoryDivIcon(color, iconName, isSelected);
  }, [location.category?.color, location.category?.icon, isSelected]);

  return (
    <Marker
      position={[location.latitude, location.longitude]}
      icon={icon}
      draggable={isDraggable}
      zIndexOffset={isSelected ? 1000 : 100}
      eventHandlers={{
        click: () => onSelect(location),
        dragend: (e) => {
          const marker = e.target;
          const newLatLng = marker.getLatLng();
          if (onDragEnd) {
            onDragEnd(location, newLatLng.lat, newLatLng.lng);
          }
        },
      }}
    >
      <Tooltip direction="top" offset={[0, isSelected ? -56 : -44]} opacity={0.95}>
        <div className="font-heading font-semibold text-xs px-1 py-0.5 text-slate-800 dark:text-slate-100">
          {location.name}
        </div>
      </Tooltip>
    </Marker>
  );
};

export default React.memo(CategoryMarker);
