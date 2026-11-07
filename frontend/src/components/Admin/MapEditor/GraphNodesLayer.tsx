import React, { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { useAdminGraph } from '../../../context/AdminGraphContext';
import { PathNode, PathEdge } from '../../../types';

const NODE_COLORS: Record<string, string> = {
  entrance: '#10B981', // Emerald
  junction: '#4F46E5', // Indigo
  gate: '#F59E0B',     // Amber
  landmark: '#8B5CF6', // Violet
};

function createMarkerDivIcon(
  node: PathNode,
  isSelected: boolean,
  isLinkingSource: boolean,
  isIsolated: boolean
) {
  const baseColor = isIsolated ? '#EF4444' : NODE_COLORS[node.node_type] || '#4F46E5';
  const size = isSelected || isLinkingSource ? 28 : 22;

  let haloStyle = '';
  if (isLinkingSource) {
    haloStyle = `
      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.6), 0 0 16px rgba(16, 185, 129, 0.8);
      animation: pulse 1s infinite;
    `;
  } else if (isSelected) {
    haloStyle = `
      box-shadow: 0 0 0 4px #F59E0B, 0 0 16px rgba(245, 158, 11, 0.7);
    `;
  } else {
    haloStyle = `box-shadow: 0 2px 8px rgba(0,0,0,0.35);`;
  }

  const html = `
    <div style="
      position: relative;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background-color: ${baseColor};
      border: 2.5px solid #FFFFFF;
      ${haloStyle}
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 800;
      font-family: system-ui, -apple-system, sans-serif;
      cursor: pointer;
      user-select: none;
      transition: transform 0.15s ease-out;
    ">
      ${node.id}
      ${!node.is_accessible ? '<span style="position: absolute; top: -3px; right: -3px; width: 7px; height: 7px; border-radius: 50%; background-color: #EF4444; border: 1px solid white;"></span>' : ''}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'admin-graph-node-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export const GraphNodesLayer: React.FC = () => {
  const {
    nodes,
    edges,
    activeTool,
    selectedNode,
    setSelectedNode,
    setSelectedEdge,
    linkingSourceNode,
    handleNodeClickForLinking,
    draggedPositions,
    setDraggedPosition,
    commitNodePosition,
    layerVisibility,
  } = useAdminGraph();

  // Find set of connected node IDs to identify isolated nodes
  const connectedNodeIds = useMemo(() => {
    const set = new Set<number>();
    edges.forEach((e: PathEdge) => {
      set.add(e.from_node_id);
      set.add(e.to_node_id);
    });
    return set;
  }, [edges]);

  if (!layerVisibility.showNodes) return null;

  return (
    <>
      {nodes.map((node: PathNode) => {
        const isSelected = selectedNode?.id === node.id;
        const isLinkingSource = linkingSourceNode?.id === node.id;
        const isIsolated = !connectedNodeIds.has(node.id);

        const currentPos = draggedPositions[node.id] || {
          lat: node.latitude,
          lng: node.longitude,
        };

        return (
          <Marker
            key={`node-${node.id}`}
            position={[currentPos.lat, currentPos.lng]}
            draggable={activeTool === 'inspect'}
            icon={createMarkerDivIcon(node, isSelected, isLinkingSource, isIsolated)}
            eventHandlers={{
              click: (e: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(e);
                if (activeTool === 'link_nodes') {
                  handleNodeClickForLinking(node);
                } else {
                  setSelectedNode(node);
                  setSelectedEdge(null);
                }
              },
              drag: (e: L.LeafletEvent) => {
                const marker = e.target as L.Marker;
                const latlng = marker.getLatLng();
                setDraggedPosition(node.id, { lat: latlng.lat, lng: latlng.lng });
              },
              dragend: (e: L.LeafletEvent) => {
                const marker = e.target as L.Marker;
                const latlng = marker.getLatLng();
                commitNodePosition(node.id, latlng.lat, latlng.lng);
              },
            }}
          >
            {layerVisibility.showNodeLabels && (
              <Tooltip direction="top" offset={[0, -14]} opacity={0.95}>
                <div className="text-[11px] font-sans">
                  <strong>Node #{node.id}</strong>: {node.name || 'Unnamed Junction'}
                  <br />
                  <span className="capitalize">{node.node_type}</span> • Floor {node.floor}
                  {isIsolated && <span className="text-rose-600 font-bold"> • Isolated (Degree 0)</span>}
                </div>
              </Tooltip>
            )}
          </Marker>
        );
      })}
    </>
  );
};

export default GraphNodesLayer;
