import React from 'react';
import { Polyline, useMapEvents } from 'react-leaflet';
import { useAdminGraph } from '../../../context/AdminGraphContext';

export const PendingEdgeOverlay: React.FC = () => {
  const { linkingSourceNode, cursorLatLng, setCursorLatLng } = useAdminGraph();

  useMapEvents({
    mousemove(e) {
      if (linkingSourceNode) {
        setCursorLatLng({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });

  if (!linkingSourceNode || !cursorLatLng) return null;

  const positions: [number, number][] = [
    [linkingSourceNode.latitude, linkingSourceNode.longitude],
    [cursorLatLng.lat, cursorLatLng.lng],
  ];

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: '#10B981',
        weight: 3.5,
        dashArray: '6, 8',
        opacity: 0.9,
        lineCap: 'round',
      }}
    />
  );
};

export default PendingEdgeOverlay;
