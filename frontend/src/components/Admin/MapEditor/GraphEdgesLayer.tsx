import React, { useMemo } from 'react';
import { Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { useAdminGraph } from '../../../context/AdminGraphContext';
import { PathEdge, PathNode } from '../../../types';

interface EdgeStyle {
  color: string;
  weight: number;
  dashArray?: string;
  opacity: number;
}

const EDGE_STYLES: Record<string, EdgeStyle> = {
  footpath: { color: '#4F46E5', weight: 3.5, opacity: 0.85 },
  ramp: { color: '#10B981', weight: 4.0, opacity: 0.95 },
  stairs: { color: '#EF4444', weight: 4.0, dashArray: '6, 6', opacity: 0.95 },
  corridor: { color: '#8B5CF6', weight: 3.5, opacity: 0.85 },
  road: { color: '#64748B', weight: 3.0, dashArray: '8, 8', opacity: 0.80 },
  road_crossing: { color: '#64748B', weight: 3.0, dashArray: '8, 8', opacity: 0.80 },
};

export const GraphEdgesLayer: React.FC = () => {
  const {
    nodes,
    edges,
    selectedEdge,
    setSelectedEdge,
    setSelectedNode,
    draggedPositions,
    layerVisibility,
  } = useAdminGraph();

  // Fast node lookup
  const nodeMap = useMemo(() => {
    const map = new Map<number, { lat: number; lng: number }>();
    nodes.forEach((n: PathNode) => map.set(n.id, { lat: n.latitude, lng: n.longitude }));
    return map;
  }, [nodes]);

  if (!layerVisibility.showEdges) return null;

  return (
    <>
      {edges.map((edge: PathEdge) => {
        if (layerVisibility.filterEdgeType && edge.edge_type !== layerVisibility.filterEdgeType) {
          return null;
        }

        const fromPos = draggedPositions[edge.from_node_id] || nodeMap.get(edge.from_node_id);
        const toPos = draggedPositions[edge.to_node_id] || nodeMap.get(edge.to_node_id);

        if (!fromPos || !toPos) return null;

        const positions: [number, number][] = [
          [fromPos.lat, fromPos.lng],
          [toPos.lat, toPos.lng],
        ];

        const isSelected = selectedEdge?.id === edge.id;
        const style = EDGE_STYLES[edge.edge_type] || EDGE_STYLES.footpath;

        return (
          <React.Fragment key={`edge-group-${edge.id}`}>
            {/* 1. Amber Selection Casing (if selected) */}
            {isSelected && (
              <Polyline
                positions={positions}
                pathOptions={{
                  color: '#F59E0B',
                  weight: 9,
                  opacity: 0.75,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            )}

            {/* 2. Styled Visible Polyline */}
            <Polyline
              positions={positions}
              pathOptions={{
                color: isSelected ? '#F59E0B' : style.color,
                weight: style.weight,
                opacity: isSelected ? 1.0 : style.opacity,
                dashArray: style.dashArray,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />

            {/* 3. Invisible 16px Hit Buffer for Effortless Clicking */}
            <Polyline
              positions={positions}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  setSelectedEdge(edge);
                  setSelectedNode(null);
                },
              }}
              pathOptions={{
                color: '#000000',
                weight: 16,
                opacity: 0,
                interactive: true,
              }}
            >
              <Tooltip direction="center" offset={[0, 0]} opacity={0.9}>
                <div className="text-[11px] font-sans">
                  <strong>{edge.edge_type.toUpperCase()}</strong> ({Math.round(edge.distance * 10) / 10}m)
                  <br />
                  Node #{edge.from_node_id} ↔ Node #{edge.to_node_id}
                  {!edge.is_accessible && <span className="text-rose-600 font-bold"> • Inaccessible (Stairs)</span>}
                  {edge.is_accessible && <span className="text-emerald-600"> • Step-free</span>}
                </div>
              </Tooltip>
            </Polyline>
          </React.Fragment>
        );
      })}
    </>
  );
};

export default GraphEdgesLayer;
