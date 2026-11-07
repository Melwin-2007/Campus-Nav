import React, { useState, useEffect } from 'react';
import { X, Check, MapPin, Layers } from 'lucide-react';
import { useAdminGraph } from '../../../context/AdminGraphContext';
import { NodeType, PathNodeCreate, PathNodeUpdate } from '../../../types';

export const NodeEditModal: React.FC = () => {
  const {
    isNodeModalOpen,
    nodeModalMode,
    pendingNodeCoords,
    selectedNode,
    closeNodeModal,
    createNode,
    updateNode,
  } = useAdminGraph();

  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState<number>(0);
  const [longitude, setLongitude] = useState<number>(0);
  const [floor, setFloor] = useState<number>(0);
  const [nodeType, setNodeType] = useState<NodeType>('junction');
  const [isAccessible, setIsAccessible] = useState<boolean>(true);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (nodeModalMode === 'create' && pendingNodeCoords) {
      setName('');
      setLatitude(pendingNodeCoords.lat);
      setLongitude(pendingNodeCoords.lng);
      setFloor(0);
      setNodeType('junction');
      setIsAccessible(true);
      setIsActive(true);
      setError(null);
    } else if (nodeModalMode === 'edit' && selectedNode) {
      setName(selectedNode.name || '');
      setLatitude(selectedNode.latitude);
      setLongitude(selectedNode.longitude);
      setFloor(selectedNode.floor);
      setNodeType(selectedNode.node_type as NodeType);
      setIsAccessible(selectedNode.is_accessible);
      setIsActive(selectedNode.is_active);
      setError(null);
    }
  }, [nodeModalMode, pendingNodeCoords, selectedNode, isNodeModalOpen]);

  if (!isNodeModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (nodeModalMode === 'create') {
        const payload: PathNodeCreate = {
          name: name.trim() || null,
          latitude: Number(latitude),
          longitude: Number(longitude),
          floor: Number(floor),
          node_type: nodeType,
          is_accessible: isAccessible,
          is_active: isActive,
        };
        await createNode(payload);
      } else if (selectedNode) {
        const payload: PathNodeUpdate = {
          name: name.trim() || null,
          latitude: Number(latitude),
          longitude: Number(longitude),
          floor: Number(floor),
          node_type: nodeType,
          is_accessible: isAccessible,
          is_active: isActive,
        };
        await updateNode(selectedNode.id, payload);
      }
      closeNodeModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save node.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-3xl glass-panel border border-slate-200/80 dark:border-slate-800/80 shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-indigo/15 text-brand-indigo dark:text-indigo-400 flex items-center justify-center">
              <MapPin size={18} />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-sm text-slate-900 dark:text-slate-100">
                {nodeModalMode === 'create' ? 'Add Campus Path Node' : `Edit Node #${selectedNode?.id}`}
              </h3>
              <p className="text-[11px] text-slate-500">Navigation graph vertex</p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeNodeModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="py-4 flex flex-col gap-3">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Node Name (Optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Science Complex North Entry"
              className="w-full text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-indigo"
            />
          </div>

          {/* Node Type & Floor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Node Type
              </label>
              <select
                value={nodeType}
                onChange={(e) => setNodeType(e.target.value as NodeType)}
                className="w-full text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-indigo"
              >
                <option value="junction">Junction (Walkway Crossing)</option>
                <option value="entrance">Building Entrance</option>
                <option value="gate">Perimeter Gate</option>
                <option value="landmark">Outdoor Landmark</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Floor
              </label>
              <input
                type="number"
                value={floor}
                onChange={(e) => setFloor(parseInt(e.target.value, 10) || 0)}
                className="w-full text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-indigo"
              />
            </div>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Latitude
              </label>
              <input
                type="number"
                step="0.000001"
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                required
                className="w-full text-xs font-mono py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-indigo"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Longitude
              </label>
              <input
                type="number"
                step="0.000001"
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                required
                className="w-full text-xs font-mono py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-indigo"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isAccessible}
                onChange={(e) => setIsAccessible(e.target.checked)}
                className="rounded text-brand-indigo"
              />
              <span>Wheelchair Accessible (Step-free)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded text-brand-indigo"
              />
              <span>Active</span>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={closeNodeModal}
              className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2 px-4 rounded-xl bg-brand-indigo hover:bg-brand-indigo-hover text-white text-xs font-bold shadow-md shadow-brand-indigo/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check size={14} />
              <span>{isSubmitting ? 'Saving...' : 'Save Node'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NodeEditModal;
