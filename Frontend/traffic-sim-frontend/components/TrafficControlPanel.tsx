'use client';

import React, { useState } from 'react';
import { Accident, BlockedRoad, SimulationInfo, Edge } from '@/lib/types';

interface TrafficControlPanelProps {
  accidents: Accident[];
  blockedRoads: BlockedRoad[];
  simulationInfo: SimulationInfo | null;
  availableEdges: Edge[];
  onCreateAccident: (fromNode?: string, toNode?: string) => void;
  onResolveAccident: (accidentId: string) => void;
  onBlockRoad: (fromNode: string, toNode: string, reason: string) => void;
  onUnblockRoad: (fromNode: string, toNode: string) => void;
}

const TrafficControlPanel: React.FC<TrafficControlPanelProps> = ({
  accidents,
  blockedRoads,
  simulationInfo,
  availableEdges,
  onCreateAccident,
  onResolveAccident,
  onBlockRoad,
  onUnblockRoad,
}) => {
  const [showAccidentForm, setShowAccidentForm] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [accidentFrom, setAccidentFrom] = useState('');
  const [accidentTo, setAccidentTo] = useState('');
  const [blockFrom, setBlockFrom] = useState('');
  const [blockTo, setBlockTo] = useState('');
  const [blockReason, setBlockReason] = useState('construction');

  // Get unique nodes from edges
  const getUniqueNodes = () => {
    const nodesSet = new Set<string>();
    availableEdges.forEach(edge => {
      nodesSet.add(edge.from);
      nodesSet.add(edge.to);
    });
    return Array.from(nodesSet).sort();
  };

  // Get available "to" nodes based on selected "from" node
  const getAvailableToNodes = (fromNode: string) => {
    return availableEdges
      .filter(edge => edge.from === fromNode)
      .map(edge => edge.to)
      .sort();
  };

  const uniqueNodes = getUniqueNodes();
  const availableToNodesForAccident = accidentFrom ? getAvailableToNodes(accidentFrom) : [];
  const availableToNodesForBlock = blockFrom ? getAvailableToNodes(blockFrom) : [];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'minor': return 'bg-yellow-500';
      case 'moderate': return 'bg-orange-500';
      case 'severe': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const handleCreateAccident = () => {
    if (accidentFrom && accidentTo) {
      onCreateAccident(accidentFrom, accidentTo);
      setAccidentFrom('');
      setAccidentTo('');
      setShowAccidentForm(false);
    }
  };

  const handleCreateRandomAccident = () => {
    onCreateAccident();
    setShowAccidentForm(false);
  };

  const handleBlockRoad = () => {
    if (blockFrom && blockTo) {
      onBlockRoad(blockFrom, blockTo, blockReason);
      setBlockFrom('');
      setBlockTo('');
      setBlockReason('construction');
      setShowBlockForm(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-4 space-y-4">
      <div className="border-b border-gray-700 pb-2">
        <h3 className="text-lg font-bold text-white">Traffic Control Panel</h3>
        {simulationInfo && (
          <div className="text-xs text-gray-400 mt-1 space-y-1">
            <div>Elapsed: {formatTime(simulationInfo.elapsed_time)}</div>
            <div className="flex gap-4">
              <span>Accidents: {simulationInfo.accidents_count}</span>
              <span>Blocked: {simulationInfo.blocked_roads_count}</span>
              <span>Hotspots: {simulationInfo.congestion_hotspots}</span>
            </div>
          </div>
        )}
      </div>

      {/* Accident Controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm text-gray-200">🚨 Accidents ({accidents.length})</h4>
          <button
            onClick={() => setShowAccidentForm(!showAccidentForm)}
            className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
          >
            {showAccidentForm ? 'Cancel' : '+ Create'}
          </button>
        </div>

        {showAccidentForm && (
          <div className="bg-gray-700 p-3 rounded space-y-2">
            <div className="text-xs text-gray-400 mb-2">Select road for accident or create random</div>
            
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">From Node</label>
              <select
                value={accidentFrom}
                onChange={(e) => {
                  setAccidentFrom(e.target.value);
                  setAccidentTo(''); // Reset to node when from node changes
                }}
                className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 text-white rounded focus:ring-2 focus:ring-red-500"
              >
                <option value="">-- Select Start Node --</option>
                {uniqueNodes.map((node) => (
                  <option key={node} value={node}>
                    {node.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">To Node</label>
              <select
                value={accidentTo}
                onChange={(e) => setAccidentTo(e.target.value)}
                disabled={!accidentFrom}
                className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 text-white rounded focus:ring-2 focus:ring-red-500 disabled:bg-gray-700 disabled:text-gray-500"
              >
                <option value="">-- Select End Node --</option>
                {availableToNodesForAccident.map((node) => (
                  <option key={node} value={node}>
                    {node.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreateAccident}
                disabled={!accidentFrom || !accidentTo}
                className="flex-1 px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded font-medium disabled:bg-gray-400"
              >
                Create at Location
              </button>
              <button
                onClick={handleCreateRandomAccident}
                className="flex-1 px-3 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded font-medium"
              >
                Random Location
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-40 overflow-y-auto">
          {accidents.length === 0 ? (
            <div className="text-xs text-gray-400 italic p-2 bg-gray-700 rounded">No active accidents</div>
          ) : (
            accidents.map((accident) => (
              <div key={accident.id} className="bg-gray-700 p-2 rounded text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`${getSeverityColor(accident.severity)} text-white px-2 py-0.5 rounded font-bold uppercase text-[10px]`}>
                      {accident.severity}
                    </span>
                    <span className="font-mono text-gray-300">
                      {accident.from_node} → {accident.to_node}
                    </span>
                  </div>
                  <button
                    onClick={() => onResolveAccident(accident.id)}
                    className="px-2 py-0.5 bg-green-500 hover:bg-green-600 text-white rounded text-[10px]"
                  >
                    Resolve
                  </button>
                </div>
                <div className="text-gray-400">Duration: {accident.duration}s</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Road Blockage Controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm text-gray-200">🚧 Blocked Roads ({blockedRoads.length})</h4>
          <button
            onClick={() => setShowBlockForm(!showBlockForm)}
            className="px-3 py-1 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors"
          >
            {showBlockForm ? 'Cancel' : '+ Block'}
          </button>
        </div>

        {showBlockForm && (
          <div className="bg-gray-700 p-3 rounded space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">From Node</label>
              <select
                value={blockFrom}
                onChange={(e) => {
                  setBlockFrom(e.target.value);
                  setBlockTo(''); // Reset to node when from node changes
                }}
                className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 text-white rounded focus:ring-2 focus:ring-orange-500"
              >
                <option value="">-- Select Start Node --</option>
                {uniqueNodes.map((node) => (
                  <option key={node} value={node}>
                    {node.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">To Node</label>
              <select
                value={blockTo}
                onChange={(e) => setBlockTo(e.target.value)}
                disabled={!blockFrom}
                className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 text-white rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-700 disabled:text-gray-500"
              >
                <option value="">-- Select End Node --</option>
                {availableToNodesForBlock.map((node) => (
                  <option key={node} value={node}>
                    {node.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Reason</label>
              <select
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 text-white rounded focus:ring-2 focus:ring-orange-500"
              >
                <option value="construction">Construction</option>
                <option value="maintenance">Maintenance</option>
                <option value="emergency">Emergency</option>
                <option value="event">Special Event</option>
              </select>
            </div>

            <button
              onClick={handleBlockRoad}
              disabled={!blockFrom || !blockTo}
              className="w-full px-3 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded font-medium disabled:bg-gray-400"
            >
              Block Road
            </button>
          </div>
        )}

        <div className="space-y-2 max-h-40 overflow-y-auto">
          {blockedRoads.length === 0 ? (
            <div className="text-xs text-gray-400 italic p-2 bg-gray-700 rounded">No blocked roads</div>
          ) : (
            blockedRoads.map((road, idx) => (
              <div key={idx} className="bg-gray-700 p-2 rounded text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-gray-300">
                    {road.from_node} → {road.to_node}
                  </span>
                  <button
                    onClick={() => onUnblockRoad(road.from_node, road.to_node)}
                    className="px-2 py-0.5 bg-green-500 hover:bg-green-600 text-white rounded text-[10px]"
                  >
                    Unblock
                  </button>
                </div>
                <div className="text-gray-400 capitalize">Reason: {road.reason}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TrafficControlPanel;
