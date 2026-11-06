import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  PathNode,
  PathNodeCreate,
  PathNodeUpdate,
  PathEdge,
  PathEdgeCreate,
  PathEdgeUpdate,
  EditorTool,
  Location,
} from '../types';
import api from '../services/api';
import { haversineDistance } from '../utils/geoUtils';

export interface DraggedNodePosition {
  lat: number;
  lng: number;
}

export interface LayerVisibility {
  showNodes: boolean;
  showEdges: boolean;
  showPOIs: boolean;
  showNodeLabels: boolean;
  filterEdgeType: string | null;
}

interface AdminGraphContextValue {
  // Collections
  nodes: PathNode[];
  edges: PathEdge[];
  isLoadingGraph: boolean;
  graphError: string | null;

  // Active Tool & Selection
  activeTool: EditorTool;
  setActiveTool: (tool: EditorTool) => void;
  selectedNode: PathNode | null;
  setSelectedNode: (node: PathNode | null) => void;
  selectedEdge: PathEdge | null;
  setSelectedEdge: (edge: PathEdge | null) => void;

  // Two-Click Linking FSM
  linkingSourceNode: PathNode | null;
  setLinkingSourceNode: (node: PathNode | null) => void;
  cursorLatLng: { lat: number; lng: number } | null;
  setCursorLatLng: (coords: { lat: number; lng: number } | null) => void;
  handleNodeClickForLinking: (node: PathNode) => void;
  cancelLinking: () => void;

  // Real-time Node Dragging (Node ID -> coords)
  draggedPositions: Record<number, DraggedNodePosition>;
  setDraggedPosition: (nodeId: number, pos: DraggedNodePosition) => void;
  clearDraggedPosition: (nodeId: number) => void;
  commitNodePosition: (nodeId: number, lat: number, lng: number) => Promise<void>;

  // Modals State
  isNodeModalOpen: boolean;
  nodeModalMode: 'create' | 'edit';
  pendingNodeCoords: { lat: number; lng: number } | null;
  openCreateNodeModal: (coords: { lat: number; lng: number }) => void;
  openEditNodeModal: (node: PathNode) => void;
  closeNodeModal: () => void;

  isEdgeModalOpen: boolean;
  edgeModalMode: 'create' | 'edit';
  pendingEdgeEndpoints: { fromNode: PathNode; toNode: PathNode; distance: number } | null;
  openCreateEdgeModal: (fromNode: PathNode, toNode: PathNode) => void;
  openEditEdgeModal: (edge: PathEdge) => void;
  closeEdgeModal: () => void;

  isDeleteModalOpen: boolean;
  deleteTarget: { type: 'node' | 'edge'; item: PathNode | PathEdge } | null;
  openDeleteModal: (type: 'node' | 'edge', item: PathNode | PathEdge) => void;
  closeDeleteModal: () => void;

  // Layer Visibility
  layerVisibility: LayerVisibility;
  setLayerVisibility: React.Dispatch<React.SetStateAction<LayerVisibility>>;
  toggleLayer: (layerKey: keyof Omit<LayerVisibility, 'filterEdgeType'>) => void;

  // CRUD Operations
  createNode: (data: PathNodeCreate) => Promise<PathNode>;
  updateNode: (id: number, data: PathNodeUpdate) => Promise<PathNode>;
  deleteNode: (id: number) => Promise<void>;
  createEdge: (data: PathEdgeCreate) => Promise<PathEdge>;
  updateEdge: (id: number, data: PathEdgeUpdate) => Promise<PathEdge>;
  deleteEdge: (id: number) => Promise<void>;
  refreshGraph: () => Promise<void>;
}

const AdminGraphContext = createContext<AdminGraphContextValue | undefined>(undefined);

export const AdminGraphProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [nodes, setNodes] = useState<PathNode[]>([]);
  const [edges, setEdges] = useState<PathEdge[]>([]);
  const [isLoadingGraph, setIsLoadingGraph] = useState<boolean>(true);
  const [graphError, setGraphError] = useState<string | null>(null);

  // Active Tool
  const [activeTool, setActiveTool] = useState<EditorTool>('navigate');
  const [selectedNode, setSelectedNode] = useState<PathNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<PathEdge | null>(null);

  // Linking FSM
  const [linkingSourceNode, setLinkingSourceNode] = useState<PathNode | null>(null);
  const [cursorLatLng, setCursorLatLng] = useState<{ lat: number; lng: number } | null>(null);

  // Dragging cache
  const [draggedPositions, setDraggedPositions] = useState<Record<number, DraggedNodePosition>>({});

  // Modals
  const [isNodeModalOpen, setIsNodeModalOpen] = useState<boolean>(false);
  const [nodeModalMode, setNodeModalMode] = useState<'create' | 'edit'>('create');
  const [pendingNodeCoords, setPendingNodeCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [isEdgeModalOpen, setIsEdgeModalOpen] = useState<boolean>(false);
  const [edgeModalMode, setEdgeModalMode] = useState<'create' | 'edit'>('create');
  const [pendingEdgeEndpoints, setPendingEdgeEndpoints] = useState<{
    fromNode: PathNode;
    toNode: PathNode;
    distance: number;
  } | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'node' | 'edge'; item: PathNode | PathEdge } | null>(null);

  // Layer Visibility
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    showNodes: true,
    showEdges: true,
    showPOIs: true,
    showNodeLabels: true,
    filterEdgeType: null,
  });

  const toggleLayer = useCallback((layerKey: keyof Omit<LayerVisibility, 'filterEdgeType'>) => {
    setLayerVisibility((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }));
  }, []);

  // Fetch all nodes and edges
  const refreshGraph = useCallback(async () => {
    setIsLoadingGraph(true);
    setGraphError(null);
    try {
      const [fetchedNodes, fetchedEdges] = await Promise.all([
        api.nodes.getAll(),
        api.edges.getAll(),
      ]);
      setNodes(fetchedNodes);
      setEdges(fetchedEdges);
    } catch (err) {
      console.error('Failed to load campus graph data:', err);
      setGraphError('Failed to load navigation graph. Verify admin authentication.');
    } finally {
      setIsLoadingGraph(false);
    }
  }, []);

  useEffect(() => {
    refreshGraph();
  }, [refreshGraph]);

  // Handle Drag Position Tracking
  const setDraggedPosition = useCallback((nodeId: number, pos: DraggedNodePosition) => {
    setDraggedPositions((prev) => ({ ...prev, [nodeId]: pos }));
  }, []);

  const clearDraggedPosition = useCallback((nodeId: number) => {
    setDraggedPositions((prev) => {
      const copy = { ...prev };
      delete copy[nodeId];
      return copy;
    });
  }, []);

  const commitNodePosition = useCallback(
    async (nodeId: number, lat: number, lng: number) => {
      try {
        const updated = await api.nodes.update(nodeId, {
          latitude: parseFloat(lat.toFixed(6)),
          longitude: parseFloat(lng.toFixed(6)),
        });
        setNodes((prev) => prev.map((n) => (n.id === nodeId ? updated : n)));
      } catch (err) {
        console.error('Failed to persist node position:', err);
        refreshGraph();
      } finally {
        clearDraggedPosition(nodeId);
      }
    },
    [clearDraggedPosition, refreshGraph]
  );

  // Linking FSM handler
  const handleNodeClickForLinking = useCallback(
    (node: PathNode) => {
      if (!linkingSourceNode) {
        // Step 1: Set origin
        setLinkingSourceNode(node);
      } else if (linkingSourceNode.id === node.id) {
        // Guard: self-loop
        setLinkingSourceNode(null);
      } else {
        // Step 2: Destination clicked -> open Edge Modal
        const dist = Math.round(
          haversineDistance(
            linkingSourceNode.latitude,
            linkingSourceNode.longitude,
            node.latitude,
            node.longitude
          ) * 10
        ) / 10;

        setPendingEdgeEndpoints({
          fromNode: linkingSourceNode,
          toNode: node,
          distance: dist,
        });
        setEdgeModalMode('create');
        setIsEdgeModalOpen(true);
        setLinkingSourceNode(null);
      }
    },
    [linkingSourceNode]
  );

  const cancelLinking = useCallback(() => {
    setLinkingSourceNode(null);
    setCursorLatLng(null);
  }, []);

  // Modal open/close helpers
  const openCreateNodeModal = useCallback((coords: { lat: number; lng: number }) => {
    setPendingNodeCoords(coords);
    setNodeModalMode('create');
    setIsNodeModalOpen(true);
  }, []);

  const openEditNodeModal = useCallback((node: PathNode) => {
    setSelectedNode(node);
    setNodeModalMode('edit');
    setIsNodeModalOpen(true);
  }, []);

  const closeNodeModal = useCallback(() => {
    setIsNodeModalOpen(false);
    setPendingNodeCoords(null);
  }, []);

  const openCreateEdgeModal = useCallback((fromNode: PathNode, toNode: PathNode) => {
    const dist = Math.round(
      haversineDistance(fromNode.latitude, fromNode.longitude, toNode.latitude, toNode.longitude) * 10
    ) / 10;
    setPendingEdgeEndpoints({ fromNode, toNode, distance: dist });
    setEdgeModalMode('create');
    setIsEdgeModalOpen(true);
  }, []);

  const openEditEdgeModal = useCallback((edge: PathEdge) => {
    setSelectedEdge(edge);
    const from = nodes.find((n) => n.id === edge.from_node_id);
    const to = nodes.find((n) => n.id === edge.to_node_id);
    if (from && to) {
      setPendingEdgeEndpoints({ fromNode: from, toNode: to, distance: edge.distance });
    }
    setEdgeModalMode('edit');
    setIsEdgeModalOpen(true);
  }, [nodes]);

  const closeEdgeModal = useCallback(() => {
    setIsEdgeModalOpen(false);
    setPendingEdgeEndpoints(null);
  }, []);

  const openDeleteModal = useCallback((type: 'node' | 'edge', item: PathNode | PathEdge) => {
    setDeleteTarget({ type, item });
    setIsDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
  }, []);

  // CRUD Implementations
  const createNode = useCallback(async (data: PathNodeCreate): Promise<PathNode> => {
    const created = await api.nodes.create(data);
    setNodes((prev) => [...prev, created]);
    return created;
  }, []);

  const updateNode = useCallback(async (id: number, data: PathNodeUpdate): Promise<PathNode> => {
    const updated = await api.nodes.update(id, data);
    setNodes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    if (selectedNode?.id === id) setSelectedNode(updated);
    return updated;
  }, [selectedNode]);

  const deleteNode = useCallback(async (id: number): Promise<void> => {
    await api.nodes.delete(id);
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.from_node_id !== id && e.to_node_id !== id));
    if (selectedNode?.id === id) setSelectedNode(null);
  }, [selectedNode]);

  const createEdge = useCallback(async (data: PathEdgeCreate): Promise<PathEdge> => {
    const created = await api.edges.create(data);
    setEdges((prev) => [...prev, created]);
    return created;
  }, []);

  const updateEdge = useCallback(async (id: number, data: PathEdgeUpdate): Promise<PathEdge> => {
    const updated = await api.edges.update(id, data);
    setEdges((prev) => prev.map((e) => (e.id === id ? updated : e)));
    if (selectedEdge?.id === id) setSelectedEdge(updated);
    return updated;
  }, [selectedEdge]);

  const deleteEdge = useCallback(async (id: number): Promise<void> => {
    await api.edges.delete(id);
    setEdges((prev) => prev.filter((e) => e.id !== id));
    if (selectedEdge?.id === id) setSelectedEdge(null);
  }, [selectedEdge]);

  // Keyboard shortcut listeners (V, N, L, E, Escape, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      switch (e.key) {
        case 'v':
        case 'V':
          setActiveTool('navigate');
          cancelLinking();
          break;
        case 'n':
        case 'N':
          setActiveTool('add_node');
          cancelLinking();
          break;
        case 'l':
        case 'L':
          setActiveTool('link_nodes');
          break;
        case 'e':
        case 'E':
          setActiveTool('inspect');
          cancelLinking();
          break;
        case 'Escape':
          cancelLinking();
          setSelectedNode(null);
          setSelectedEdge(null);
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedNode) {
            openDeleteModal('node', selectedNode);
          } else if (selectedEdge) {
            openDeleteModal('edge', selectedEdge);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelLinking, selectedNode, selectedEdge, openDeleteModal]);

  return (
    <AdminGraphContext.Provider
      value={{
        nodes,
        edges,
        isLoadingGraph,
        graphError,
        activeTool,
        setActiveTool,
        selectedNode,
        setSelectedNode,
        selectedEdge,
        setSelectedEdge,
        linkingSourceNode,
        setLinkingSourceNode,
        cursorLatLng,
        setCursorLatLng,
        handleNodeClickForLinking,
        cancelLinking,
        draggedPositions,
        setDraggedPosition,
        clearDraggedPosition,
        commitNodePosition,
        isNodeModalOpen,
        nodeModalMode,
        pendingNodeCoords,
        openCreateNodeModal,
        openEditNodeModal,
        closeNodeModal,
        isEdgeModalOpen,
        edgeModalMode,
        pendingEdgeEndpoints,
        openCreateEdgeModal,
        openEditEdgeModal,
        closeEdgeModal,
        isDeleteModalOpen,
        deleteTarget,
        openDeleteModal,
        closeDeleteModal,
        layerVisibility,
        setLayerVisibility,
        toggleLayer,
        createNode,
        updateNode,
        deleteNode,
        createEdge,
        updateEdge,
        deleteEdge,
        refreshGraph,
      }}
    >
      {children}
    </AdminGraphContext.Provider>
  );
};

export const useAdminGraph = (): AdminGraphContextValue => {
  const context = useContext(AdminGraphContext);
  if (!context) {
    throw new Error('useAdminGraph must be used within an AdminGraphProvider');
  }
  return context;
};
