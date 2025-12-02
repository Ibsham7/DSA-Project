'use client';

import React, { useState, useEffect } from 'react';
import GoogleMapsStyleVisualization from './GoogleMapsStyleVisualization';
import { api } from '@/lib/api';
import { MODES, Mode, getTrafficLevel, GraphData, MODE_EMOJI, MODE_LABEL } from '@/lib/types';
import { MAPS } from '@/lib/graphData';

const TrafficSimulator: React.FC = () => {
  const [nodes, setNodes] = useState<string[]>([]);
  const [startNode, setStartNode] = useState<string>('');
  const [goalNode, setGoalNode] = useState<string>('');
  const [mode, setMode] = useState<Mode>('car');
  const [path, setPath] = useState<string[] | null>(null);
  const [cost, setCost] = useState<number>(0);
  const [traffic, setTraffic] = useState<Record<string, number>>({});
  const [currentNode, setCurrentNode] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [currentMap, setCurrentMap] = useState<string>('city');
  const [availableMaps, setAvailableMaps] = useState<string[]>(['simple', 'city', 'nust']);
  const [mapData, setMapData] = useState<GraphData>(MAPS.city);

  // Check API health and load nodes on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await api.healthCheck();
        setApiStatus('connected');
        
        // Get available maps
        const mapsInfo = await api.getMaps();
        setAvailableMaps(mapsInfo.maps);
        setCurrentMap(mapsInfo.current);
        
        // Get nodes and map data
        const fetchedNodes = await api.getNodes();
        setNodes(fetchedNodes);
        
        const fetchedMapData = await api.getMapData();
        setMapData(fetchedMapData);
        
        if (fetchedNodes.length > 0) {
          setStartNode(fetchedNodes[0]);
          setGoalNode(fetchedNodes[fetchedNodes.length > 1 ? 1 : 0]);
        }
      } catch (err) {
        setApiStatus('disconnected');
        setError('Failed to connect to backend API. Make sure the server is running on http://localhost:8000');
      }
    };

    initializeApp();
  }, []);

  const handleSwitchMap = async (mapName: string) => {
    setLoading(true);
    setError('');
    
    try {
      const result = await api.switchMap(mapName);
      setCurrentMap(mapName);
      setNodes(result.nodes);
      
      // Get updated map data
      const fetchedMapData = await api.getMapData();
      setMapData(fetchedMapData);
      
      // Reset selections
      if (result.nodes.length > 0) {
        setStartNode(result.nodes[0]);
        setGoalNode(result.nodes[result.nodes.length > 1 ? 1 : 0]);
      }
      
      // Reset simulation state
      setPath(null);
      setCost(0);
      setTraffic({});
      setCurrentNode('');
      setIsSimulating(false);
      setSimulationStep(0);
    } catch (err) {
      setError('Failed to switch map. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFindPath = async () => {
    if (!startNode || !goalNode) {
      setError('Please select both start and goal nodes');
      return;
    }

    if (startNode === goalNode) {
      setError('Start and goal nodes must be different');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await api.getPath(startNode, goalNode, mode);
      setPath(result.path);
      setCost(result.cost);
      
      if (!result.path) {
        setError('No path found for the selected mode');
      }
    } catch (err) {
      setError('Failed to find path. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTraffic = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await api.updateTraffic();
      setTraffic(result.traffic);
    } catch (err) {
      setError('Failed to update traffic. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateStep = async () => {
    if (!startNode || !goalNode) {
      setError('Please select both start and goal nodes');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const current = currentNode || startNode;
      const result = await api.simulateStep(current, goalNode, mode);
      
      setPath(result.new_path);
      setCost(result.cost);
      setTraffic(result.traffic);
      setSimulationStep((prev) => prev + 1);

      // Move to next node in path
      if (result.new_path && result.new_path.length > 1) {
        setCurrentNode(result.new_path[1]);
      }

      if (!result.new_path) {
        setError('No path found in simulation step');
        setIsSimulating(false);
      }
    } catch (err) {
      setError('Simulation step failed. Please try again.');
      setIsSimulating(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSimulation = () => {
    setIsSimulating(true);
    setSimulationStep(0);
    setCurrentNode(startNode);
  };

  const handleStopSimulation = () => {
    setIsSimulating(false);
    setCurrentNode('');
  };

  const handleResetSimulation = () => {
    setIsSimulating(false);
    setSimulationStep(0);
    setCurrentNode('');
    setPath(null);
    setCost(0);
    setTraffic({});
    setError('');
  };

  // Auto-advance simulation
  useEffect(() => {
    if (isSimulating && currentNode !== goalNode) {
      const timer = setTimeout(() => {
        handleSimulateStep();
      }, 1500);
      return () => clearTimeout(timer);
    } else if (isSimulating && currentNode === goalNode) {
      setIsSimulating(false);
    }
  }, [isSimulating, currentNode, goalNode]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Traffic Navigation</h1>
            <div className={`flex items-center gap-2 text-xs ${
              apiStatus === 'connected' ? 'text-green-600' : 
              apiStatus === 'disconnected' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                apiStatus === 'connected' ? 'bg-green-500' : 
                apiStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              {apiStatus === 'connected' ? 'Connected' : apiStatus === 'disconnected' ? 'Disconnected' : 'Connecting'}
            </div>
          </div>
          
          {/* Map Selector */}
          <select
            value={currentMap}
            onChange={(e) => handleSwitchMap(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-semibold text-gray-900"
            disabled={isSimulating || loading}
          >
            {availableMaps.map((map) => (
              <option key={map} value={map} className="font-semibold text-gray-900">
                {map === 'city' ? '🏙️ City Map' : map === 'nust' ? '🎓 NUST Campus' : '📍 Simple Network'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="container mx-auto px-6 pt-4">
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Main Map Area */}
      <div className="flex-1 container mx-auto px-6 py-6">
        <GoogleMapsStyleVisualization
          path={path}
          traffic={traffic}
          currentNode={currentNode}
          mode={mode}
          mapData={mapData}
        />
      </div>

      {/* Bottom Control Panel */}
      <div className="bg-white border-t border-gray-200 shadow-lg">
        <div className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Route Configuration */}
            <div className="md:col-span-1">
              <h3 className="text-sm font-bold text-gray-700 mb-3">📍 Route</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                  <select
                    value={startNode}
                    onChange={(e) => setStartNode(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-semibold text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSimulating}
                  >
                    {nodes.map((node) => (
                      <option key={node} value={node} className="font-semibold text-gray-900">
                        {node.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                  <select
                    value={goalNode}
                    onChange={(e) => setGoalNode(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-semibold text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSimulating}
                  >
                    {nodes.map((node) => (
                      <option key={node} value={node} className="font-semibold text-gray-900">
                        {node.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Mode</label>
                  <div className="flex gap-2">
                    {MODES.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`flex-1 px-3 py-2 rounded-lg text-xl transition ${
                          mode === m
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                        disabled={isSimulating}
                        title={MODE_LABEL[m]}
                      >
                        {MODE_EMOJI[m]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="md:col-span-1">
              <h3 className="text-sm font-bold text-gray-700 mb-3">⚡ Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={handleFindPath}
                  disabled={loading || isSimulating || apiStatus !== 'connected'}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition text-sm font-medium"
                >
                  {loading ? 'Loading...' : 'Find Path'}
                </button>

                <button
                  onClick={handleUpdateTraffic}
                  disabled={loading || isSimulating || apiStatus !== 'connected'}
                  className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition text-sm font-medium"
                >
                  Update Traffic
                </button>

                {!isSimulating ? (
                  <button
                    onClick={handleStartSimulation}
                    disabled={loading || !path || apiStatus !== 'connected'}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition text-sm font-medium"
                  >
                    Start Simulation
                  </button>
                ) : (
                  <button
                    onClick={handleStopSimulation}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                  >
                    Stop Simulation
                  </button>
                )}

                <button
                  onClick={handleResetSimulation}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition text-sm font-medium"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Path Information */}
            <div className="md:col-span-1">
              <h3 className="text-sm font-bold text-gray-700 mb-3">🗺️ Path Info</h3>
              {path ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {path.map((node, idx) => (
                      <React.Fragment key={idx}>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            node === currentNode
                              ? 'bg-amber-500 text-white font-bold'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {node.replace(/_/g, ' ')}
                        </span>
                        {idx < path.length - 1 && (
                          <span className="text-gray-400 text-xs">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Cost:</span>
                    <span className="ml-2 text-lg font-bold text-blue-600">
                      {cost === null || cost === Infinity ? '∞' : cost.toFixed(2)}
                    </span>
                  </div>
                  {isSimulating && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Step:</span>
                      <span className="ml-2 text-lg font-bold text-green-600">
                        {simulationStep}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 italic text-sm">No path calculated</p>
              )}
            </div>

            {/* Traffic Overview */}
            <div className="md:col-span-1">
              <h3 className="text-sm font-bold text-gray-700 mb-3">🚦 Traffic</h3>
              {Object.keys(traffic).length > 0 ? (
                <div className="space-y-1 max-h-32 overflow-y-auto text-xs">
                  {Object.entries(traffic).slice(0, 10).map(([edge, multiplier]) => (
                    <div key={edge} className="flex justify-between items-center">
                      <span className="text-gray-600 truncate">{edge.replace(',', ' → ')}</span>
                      <span
                        className={`font-medium ml-2 ${
                          multiplier <= 1.0
                            ? 'text-green-600'
                            : multiplier <= 2.0
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {multiplier.toFixed(1)}x
                      </span>
                    </div>
                  ))}
                  {Object.keys(traffic).length > 10 && (
                    <p className="text-gray-400 text-xs italic">+{Object.keys(traffic).length - 10} more</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 italic text-sm">No traffic data</p>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficSimulator;
