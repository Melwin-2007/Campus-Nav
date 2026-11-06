import React, { useMemo } from 'react';
import { Marker, Circle, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { UserLocation } from '../../types';

interface UserMarkerProps {
  location: UserLocation | null;
}

export const UserMarker: React.FC<UserMarkerProps> = ({ location }) => {
  const icon = useMemo(() => {
    const html = `
      <div class="user-gps-container">
        <div class="user-gps-pulse-outer"></div>
        <div class="user-gps-pulse-inner"></div>
      </div>
    `;
    return L.divIcon({
      html,
      className: 'custom-user-gps-marker',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }, []);

  if (!location) return null;

  return (
    <>
      {/* Accuracy radius circle */}
      {location.accuracy > 0 && (
        <Circle
          center={[location.latitude, location.longitude]}
          radius={location.accuracy}
          pathOptions={{
            color: '#14B8A6',
            fillColor: '#14B8A6',
            fillOpacity: 0.12,
            weight: 1.5,
          }}
        />
      )}
      {/* Center GPS dot */}
      <Marker
        position={[location.latitude, location.longitude]}
        icon={icon}
        zIndexOffset={900}
      >
        <Tooltip direction="top" offset={[0, -14]} opacity={0.95}>
          <div className="font-heading font-medium text-xs text-teal-700 dark:text-teal-300">
            You are here (±{Math.round(location.accuracy)}m)
          </div>
        </Tooltip>
      </Marker>
    </>
  );
};

export default React.memo(UserMarker);
