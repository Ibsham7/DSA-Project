'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MultiVehicleMapVisualization from './MultiVehicleMapVisualization';
import TrafficStatsDashboard from './TrafficStatsDashboard';
import TrafficControlPanel from './TrafficControlPanel';
import { api } from '@/lib/api';
import { 
  Vehicle, 
  VehicleType, 
  VehicleStatistics, 
  TrafficStatistics, 
  EdgeTrafficData,
  SimulationState,
  VEHICLE_EMOJI,
  Accident,
  BlockedRoad,
  SimulationInfo
} from '@/lib/types';
import { MAPS } from '@/lib/graphData';

const MultiVehicleTrafficSimulator: React.FC = () => {
  // Core state
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleStats, setVehicleStats] = useState<VehicleStatistics | null>(null);
  const [trafficStats, setTrafficStatistics] = useState<TrafficStatistics | null>(null);
  const [edgeTraffic, setEdgeTraffic] = useState<EdgeTrafficData[]>([]);
  
  // Traffic control state
  const [accidents, setAccidents] = useState<Accident[]>([]);
  const [blockedRoads, setBlockedRoads] = useState<BlockedRoad[]>([]);
  const [simulationInfo, setSimulationInfo] = useState<SimulationInfo | null>(null);
  
  // UI state
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [currentMap, setCurrentMap] = useState<string>('city');
  const [availableMaps, setAvailableMaps] = useState<string[]>(['simple', 'city', 'nust']);
  const [mapData, setMapData] = useState(MAPS.city);
  const [highlightedVehicle, setHighlightedVehicle] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Spawn settings - Increased for more chaotic traffic
  const [vehicleCount, setVehicleCount] = useState(25);
  const [carProbability, setCarProbability] = useState(60);
  const [bikeProbability, setBikeProbability] = useState(25);
  const [pedestrianProbability, setPedestrianProbability] = useState(15);
  
  // Auto-simulation - Much faster updates for smooth CCTV-like movement
  const [autoSpawn, setAutoSpawn] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(100); // ms between ticks - 10 FPS for smooth animation (25-500ms range = 40-2 FPS)

  // Initialize
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await api.healthCheck();
        setApiStatus('connected');
        
        const mapsInfo = await api.getMaps();
        setAvailableMaps(mapsInfo.maps);
        setCurrentMap(mapsInfo.current);
        
        const fetchedMapData = await api.getMapData();
        setMapData(fetchedMapData);
        
        // Get initial state
        await refreshSimulationState();
        
        // Auto-spawn initial vehicles for immediate traffic
        setTimeout(async () => {
          if (apiStatus === 'connected') {
            const distribution = {
              car: 0.6,
              bicycle: 0.25,
              pedestrian: 0.15,
            };
            await api.spawnMultipleVehicles(25, distribution);
            await refreshSimulationState();
          }
        }, 1000);
      } catch (err) {
        setApiStatus('disconnected');
        setError('Failed to connect to backend API. Make sure the server is running on http://localhost:8000');
      }
    };

    initializeApp();
  }, []);

  // Auto-simulation loop
  useEffect(() => {
    if (!isRunning || apiStatus !== 'connected') return;

    const interval = setInterval(async () => {
      try {
        // Execute simulation tick
        await api.simulationTick();
        
        // Refresh state and traffic control data
        await refreshSimulationState();
        await refreshTrafficControlData();
        
        // Auto-spawn new vehicles if enabled - spawn more for chaos
        if (autoSpawn && vehicles.length < vehicleCount * 3) {
          const distribution = {
            car: carProbability / 100,
            bicycle: bikeProbability / 100,
            pedestrian: pedestrianProbability / 100,
          };
          await api.spawnMultipleVehicles(3, distribution);
        }
      } catch (err) {
        console.error('Simulation tick failed:', err);
        setError('Simulation error occurred');
      }
    }, simulationSpeed);

    return () => clearInterval(interval);
  }, [isRunning, apiStatus, simulationSpeed, autoSpawn, vehicles.length, vehicleCount, carProbability, bikeProbability, pedestrianProbability]);

  // Refresh simulation state
  const refreshSimulationState = useCallback(async () => {
    try {
      const state = await api.getSimulationState();
      setSimulationState(state);
      setVehicles(state.vehicles);
      setVehicleStats(state.vehicle_statistics);
      setTrafficStatistics(state.traffic_statistics);
      setEdgeTraffic(state.edge_traffic);
    } catch (err) {
      console.error('Failed to refresh state:', err);
    }
  }, []);

  // Refresh traffic control data (accidents, blocked roads, simulation info)
  const refreshTrafficControlData = useCallback(async () => {
    try {
      const [accidentsData, blockedRoadsData, simInfoData] = await Promise.all([
        api.getAccidents(),
        api.getBlockedRoads(),
        api.getSimulationInfo(),
      ]);
      setAccidents(accidentsData.accidents);
      setBlockedRoads(blockedRoadsData.blocked_roads);
      setSimulationInfo(simInfoData);
    } catch (err) {
      console.error('Failed to refresh traffic control data:', err);
    }
  }, []);

  // Handlers
  const handleSwitchMap = async (mapName: string) => {
    setLoading(true);
    setError('');
    
    try {
      await api.switchMap(mapName);
      setCurrentMap(mapName);
      
      const fetchedMapData = await api.getMapData();
      setMapData(fetchedMapData);
      
      await handleResetSimulation();
    } catch (err) {
      setError('Failed to switch map');
    } finally {
      setLoading(false);
    }
  };

  const handleSpawnVehicles = async () => {
    setLoading(true);
    setError('');
    
    try {
      const distribution = {
        car: carProbability / 100,
        bicycle: bikeProbability / 100,
        pedestrian: pedestrianProbability / 100,
      };
      
      await api.spawnMultipleVehicles(vehicleCount, distribution);
      await refreshSimulationState();
    } catch (err) {
      setError('Failed to spawn vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSimulation = () => {
    setIsRunning(true);
    setError('');
  };

  const handleStopSimulation = () => {
    setIsRunning(false);
  };

  const handleResetSimulation = async () => {
    setLoading(true);
    setError('');
    setIsRunning(false);
    
    try {
      await api.resetSimulation();
      await refreshSimulationState();
    } catch (err) {
      setError('Failed to reset simulation');
    } finally {
      setLoading(false);
    }
  };

  const handleManualTick = async () => {
    setLoading(true);
    try {
      await api.simulationTick();
      await refreshSimulationState();
      await refreshTrafficControlData();
    } catch (err) {
      setError('Failed to execute tick');
    } finally {
      setLoading(false);
    }
  };

  // Traffic control handlers
  const handleCreateAccident = async (fromNode?: string, toNode?: string) => {
    try {
      await api.createAccident(fromNode, toNode);
      await refreshTrafficControlData();
    } catch (err) {
      setError('Failed to create accident');
    }
  };

  const handleResolveAccident = async (accidentId: string) => {
    try {
      await api.resolveAccident(accidentId);
      await refreshTrafficControlData();
    } catch (err) {
      setError('Failed to resolve accident');
    }
  };

  const handleBlockRoad = async (fromNode: string, toNode: string, reason: string) => {
    try {
      await api.blockRoad(fromNode, toNode, reason);
      await refreshTrafficControlData();
    } catch (err) {
      setError('Failed to block road');
    }
  };

  const handleUnblockRoad = async (fromNode: string, toNode: string) => {
    try {
      await api.unblockRoad(fromNode, toNode);
      await refreshTrafficControlData();
    } catch (err) {
      setError('Failed to unblock road');
    }
  };

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullscreen]);

  // Fullscreen map view
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
        {/* Fullscreen header - compact overlay */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none">
          <div className="px-4 py-2 flex justify-between items-center pointer-events-auto">
            <div className="flex items-center gap-6">
              <h1 className="text-base font-bold text-white">🚦 Traffic Monitor</h1>
              {vehicleStats && trafficStats && (
                <div className="flex gap-4 text-xs">
                  <div className="text-gray-200">
                    Step <span className="font-bold text-blue-400">{simulationState?.step || 0}</span>
                  </div>
                  <div className="text-gray-200">
                    <span className="font-bold text-green-400">{vehicleStats.active_vehicles}</span>/{vehicleStats.total_vehicles} vehicles
                  </div>
                  <div className="text-gray-200">
                    <span className="font-bold text-orange-400">{(trafficStats.average_congestion_probability * 100).toFixed(0)}%</span> congestion
                  </div>
                  <div className="text-gray-200">
                    <span className="font-bold text-red-400">{trafficStats.bottleneck_count}</span> bottlenecks
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-medium flex items-center gap-2 shadow-lg transition"
              title="Press ESC to exit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Exit (ESC)
            </button>
          </div>
        </div>
        
        {/* Fullscreen map - maximum space utilization */}
        <div className="absolute inset-0">
          <div className="w-full h-full">
            <MultiVehicleMapVisualization
              vehicles={vehicles}
              edgeTraffic={edgeTraffic}
              mapData={mapData}
              highlightedVehicle={highlightedVehicle}
              accidents={accidents}
              blockedRoads={blockedRoads}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with Statistics */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-3">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-800">Multi-Vehicle Traffic Simulator</h1>
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
            
            <select
              value={currentMap}
              onChange={(e) => handleSwitchMap(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
              disabled={isRunning || loading}
            >
              {availableMaps.map((map) => (
                <option key={map} value={map}>
                  {map === 'city' ? '🏙️ City Map' : map === 'nust' ? '🎓 NUST Campus' : '📍 Simple Network'}
                </option>
              ))}
            </select>
          </div>

          {/* Horizontal Statistics Bar */}
          {vehicleStats && trafficStats && (
            <div className="grid grid-cols-6 gap-4 py-2 border-t border-gray-200">
              <div className="text-center">
                <div className="text-xs text-gray-500">Step</div>
                <div className="text-lg font-bold text-blue-600">{simulationState?.step || 0}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Total Vehicles</div>
                <div className="text-lg font-bold text-gray-800">{vehicleStats.total_vehicles}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Active</div>
                <div className="text-lg font-bold text-green-600">{vehicleStats.active_vehicles}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Arrived</div>
                <div className="text-lg font-bold text-purple-600">{vehicleStats.arrived_vehicles}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Congestion</div>
                <div className="text-lg font-bold text-orange-600">{(trafficStats.average_congestion_probability * 100).toFixed(0)}%</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Bottlenecks</div>
                <div className="text-lg font-bold text-red-600">{trafficStats.bottleneck_count}</div>
              </div>
            </div>
          )}
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

      {/* Main Content - Map + Control Panel */}
      <div className="flex-1 container mx-auto px-6 py-6 flex gap-6">
        {/* Map */}
        <div className="flex-1 relative">
          {/* Fullscreen button */}
          <button
            onClick={() => setIsFullscreen(true)}
            className="absolute top-4 right-4 z-10 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-md text-sm font-medium text-gray-700 flex items-center gap-2"
            title="Enter fullscreen mode"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Fullscreen
          </button>
          
          <MultiVehicleMapVisualization
            vehicles={vehicles}
            edgeTraffic={edgeTraffic}
            mapData={mapData}
            highlightedVehicle={highlightedVehicle}
            accidents={accidents}
            blockedRoads={blockedRoads}
          />
        </div>

        {/* Traffic Control Panel */}
        <div className="w-96">
          <TrafficControlPanel
            accidents={accidents}
            blockedRoads={blockedRoads}
            simulationInfo={simulationInfo}
            availableEdges={mapData.edges}
            onCreateAccident={handleCreateAccident}
            onResolveAccident={handleResolveAccident}
            onBlockRoad={handleBlockRoad}
            onUnblockRoad={handleUnblockRoad}
          />
        </div>
      </div>

      {/* Bottom Control Panel */}
      <div className="bg-white border-t-2 border-gray-300 shadow-2xl">
        <div className="container mx-auto px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Spawn Controls */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3">🚗 Spawn Vehicles</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Vehicle Count: {vehicleCount}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={vehicleCount}
                    onChange={(e) => setVehicleCount(Number(e.target.value))}
                    className="w-full"
                    disabled={isRunning}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    🚗 Cars: {carProbability}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={carProbability}
                    onChange={(e) => setCarProbability(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    🚴 Bikes: {bikeProbability}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={bikeProbability}
                    onChange={(e) => setBikeProbability(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    🚶 Pedestrians: {pedestrianProbability}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={pedestrianProbability}
                    onChange={(e) => setPedestrianProbability(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <button
                  onClick={handleSpawnVehicles}
                  disabled={loading || isRunning || apiStatus !== 'connected'}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
                >
                  Spawn Vehicles
                </button>
              </div>
            </div>

            {/* Simulation Controls */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3">⚙️ Simulation</h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Update Rate: {simulationSpeed}ms ({Math.round(1000/simulationSpeed)} FPS)
                  </label>
                  <input
                    type="range"
                    min="25"
                    max="500"
                    step="25"
                    value={simulationSpeed}
                    onChange={(e) => setSimulationSpeed(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>40 FPS</span>
                    <span>10 FPS</span>
                    <span>2 FPS</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoSpawn"
                    checked={autoSpawn}
                    onChange={(e) => setAutoSpawn(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="autoSpawn" className="text-xs text-gray-600">
                    Auto-spawn vehicles
                  </label>
                </div>
                
                {!isRunning ? (
                  <button
                    onClick={handleStartSimulation}
                    disabled={loading || vehicles.length === 0 || apiStatus !== 'connected'}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
                  >
                    ▶ Start Simulation
                  </button>
                ) : (
                  <button
                    onClick={handleStopSimulation}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                  >
                    ⏸ Stop Simulation
                  </button>
                )}
                
                <button
                  onClick={handleManualTick}
                  disabled={loading || isRunning || vehicles.length === 0}
                  className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 text-sm font-medium"
                >
                  ⏭ Manual Step
                </button>
                
                <button
                  onClick={handleResetSimulation}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
                >
                  🔄 Reset
                </button>
              </div>
            </div>

            {/* Vehicle List */}
            <div className="md:col-span-2">
              <h3 className="text-sm font-bold text-gray-700 mb-3">
                🚦 Active Vehicles ({vehicles.filter(v => v.status !== 'arrived').length})
              </h3>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {vehicles.filter(v => v.status !== 'arrived').slice(0, 20).map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer transition ${
                      highlightedVehicle === vehicle.id ? 'bg-blue-100 border-blue-500' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => setHighlightedVehicle(highlightedVehicle === vehicle.id ? null : vehicle.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{VEHICLE_EMOJI[vehicle.type]}</span>
                      <div>
                        <div className="font-medium text-gray-800">{vehicle.id}</div>
                        <div className="text-gray-500 text-xs">
                          {vehicle.current_node} → {vehicle.goal_node}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        vehicle.status === 'moving' ? 'bg-green-100 text-green-700' :
                        vehicle.status === 'stuck' ? 'bg-red-100 text-red-700' :
                        vehicle.status === 'rerouting' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {vehicle.status}
                      </div>
                      {vehicle.reroute_count > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Reroutes: {vehicle.reroute_count}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {vehicles.filter(v => v.status !== 'arrived').length > 20 && (
                  <p className="text-gray-400 text-xs italic text-center">
                    +{vehicles.filter(v => v.status !== 'arrived').length - 20} more vehicles
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiVehicleTrafficSimulator;
