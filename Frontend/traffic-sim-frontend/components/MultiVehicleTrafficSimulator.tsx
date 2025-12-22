'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MultiVehicleMapVisualization from './MultiVehicleMapVisualization';
import TrafficControlPanel from './TrafficControlPanel';
import SpeedDistributionChart from './SpeedDistributionChart';
import { api } from '@/lib/api';
import { 
  Vehicle, 
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
  const [trafficConfig, setTrafficConfig] = useState<{
    current_hour: number;
    current_minute: number;
    time_string: string;
    time_period: string;
    time_scale: number;
    speed_distribution: {
      car: { mean: number; std_dev: number; min: number; max: number };
      bicycle: { mean: number; std_dev: number; min: number; max: number };
      pedestrian: { mean: number; std_dev: number; min: number; max: number };
    };
    vehicle_distribution: Record<string, number>;
    spawn_rate: { vehicles_per_minute_mean: number; vehicles_per_minute_std_dev: number };
    congestion: { mean: number; std_dev: number; peak_hours: number[] };
  } | null>(null);
  
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
  const [activeTab, setActiveTab] = useState<'map' | 'distribution'>('map');
  
  // Auto-simulation - Much faster updates for smooth CCTV-like movement
  // Backend now handles auto-spawning based on real dataset config
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
        await refreshTrafficControlData();
        
        // No manual spawn needed - backend auto-spawns based on real dataset config
      } catch {
        setApiStatus('disconnected');
        setError('Failed to connect to backend API. Make sure the server is running on http://localhost:8000');
      }
    };

    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-simulation loop
  useEffect(() => {
    if (!isRunning || apiStatus !== 'connected') return;

    const interval = setInterval(async () => {
      try {
        // Execute simulation tick - backend handles auto-spawning based on config
        await api.simulationTick();
        
        // Refresh state and traffic control data
        await refreshSimulationState();
        await refreshTrafficControlData();
        
        // Backend now auto-spawns vehicles at 25/min (mean) based on real dataset
        // No manual spawning needed here
      } catch (err) {
        console.error('Simulation tick failed:', err);
        setError('Simulation error occurred');
      }
    }, simulationSpeed);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, apiStatus, simulationSpeed]);

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
      const [accidentsData, blockedRoadsData, simInfoData, configData] = await Promise.all([
        api.getAccidents(),
        api.getBlockedRoads(),
        api.getSimulationInfo(),
        api.getTrafficConfig(),
      ]);
      setAccidents(accidentsData.accidents);
      setBlockedRoads(blockedRoadsData.blocked_roads);
      setSimulationInfo(simInfoData);
      setTrafficConfig(configData);
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
    } catch {
      setError('Failed to switch map');
    } finally {
      setLoading(false);
    }
  };

  // Removed manual spawn - backend now auto-spawns based on real dataset config

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
    } catch {
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
    } catch {
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
    } catch {
      setError('Failed to create accident');
    }
  };

  const handleResolveAccident = async (accidentId: string) => {
    try {
      await api.resolveAccident(accidentId);
      await refreshTrafficControlData();
    } catch {
      setError('Failed to resolve accident');
    }
  };

  const handleBlockRoad = async (fromNode: string, toNode: string, reason: string) => {
    try {
      await api.blockRoad(fromNode, toNode, reason);
      await refreshTrafficControlData();
    } catch {
      setError('Failed to block road');
    }
  };

  const handleUnblockRoad = async (fromNode: string, toNode: string) => {
    try {
      await api.unblockRoad(fromNode, toNode);
      await refreshTrafficControlData();
    } catch {
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
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header with Statistics */}
      <div className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="container mx-auto px-6 py-3">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white">Multi-Vehicle Traffic Simulator</h1>
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
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-white"
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
            <div className="grid grid-cols-6 gap-4 py-2 border-t border-gray-700">
              <div className="text-center">
                <div className="text-xs text-gray-400">Step</div>
                <div className="text-lg font-bold text-blue-400">{simulationState?.step || 0}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400">Total Vehicles</div>
                <div className="text-lg font-bold text-white">{vehicleStats.total_vehicles}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400">Active</div>
                <div className="text-lg font-bold text-green-400">{vehicleStats.active_vehicles}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400">Arrived</div>
                <div className="text-lg font-bold text-purple-400">{vehicleStats.arrived_vehicles}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400">Congestion</div>
                <div className="text-lg font-bold text-orange-400">{(trafficStats.average_congestion_probability * 100).toFixed(0)}%</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400">Bottlenecks</div>
                <div className="text-lg font-bold text-red-400">{trafficStats.bottleneck_count}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="container mx-auto px-6 pt-4">
          <div className="p-3 bg-red-900/50 border border-red-600 text-red-300 rounded-lg flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Main Content - Map + Control Panel */}
      <div className="flex-1 container mx-auto px-6 py-6 flex gap-6">
        {/* Map / Distribution View */}
        <div className="flex-1 relative flex flex-col">
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('map')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'map' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🗺️ Map View
            </button>
            <button
              onClick={() => setActiveTab('distribution')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'distribution' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              📊 Speed Distribution
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1">
            {activeTab === 'map' ? (
              <>
                {/* Fullscreen button */}
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="absolute top-16 right-4 z-10 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 shadow-md text-sm font-medium text-gray-200 flex items-center gap-2"
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
              </>
            ) : (
              trafficConfig && (
                <div className="h-full overflow-auto">
                  <SpeedDistributionChart
                    speedConfig={trafficConfig.speed_distribution}
                    liveSpeedStats={simulationState?.speed_distribution ? {
                      car: simulationState.speed_distribution.car.count > 0 ? {
                        count: simulationState.speed_distribution.car.count,
                        avg_speed: simulationState.speed_distribution.car.avg,
                        min_speed: simulationState.speed_distribution.car.min,
                        max_speed: simulationState.speed_distribution.car.max
                      } : undefined,
                      bicycle: simulationState.speed_distribution.bicycle.count > 0 ? {
                        count: simulationState.speed_distribution.bicycle.count,
                        avg_speed: simulationState.speed_distribution.bicycle.avg,
                        min_speed: simulationState.speed_distribution.bicycle.min,
                        max_speed: simulationState.speed_distribution.bicycle.max
                      } : undefined,
                      pedestrian: simulationState.speed_distribution.pedestrian.count > 0 ? {
                        count: simulationState.speed_distribution.pedestrian.count,
                        avg_speed: simulationState.speed_distribution.pedestrian.avg,
                        min_speed: simulationState.speed_distribution.pedestrian.min,
                        max_speed: simulationState.speed_distribution.pedestrian.max
                      } : undefined
                    } : undefined}
                  />
                </div>
              )
            )}
          </div>
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
      <div className="bg-gray-800 border-t-2 border-gray-700 shadow-2xl">
        <div className="container mx-auto px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            
            {/* Simulation Controls - Spawning now automatic based on real dataset */}
            <div>
              <h3 className="text-sm font-bold text-gray-200 mb-3">⚙️ Simulation</h3>
              <div className="space-y-2">
                <div className="p-2 bg-blue-900/50 rounded-lg mb-2">
                  <p className="text-xs text-blue-300">
                    🚗 Auto-spawning: 25 vehicles/min<br/>
                    📊 Based on real traffic dataset
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
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
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>40 FPS</span>
                    <span>10 FPS</span>
                    <span>2 FPS</span>
                  </div>
                </div>
                
                {!isRunning ? (
                  <button
                    onClick={handleStartSimulation}
                    disabled={loading || apiStatus !== 'connected'}
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

            {/* Speed Distribution Table */}
            <div>
              <h3 className="text-sm font-bold text-gray-200 mb-3">📊 Speed Config & Live Stats</h3>
              {trafficConfig ? (
                <div className="space-y-3">
                  {/* Configured Speeds */}
                  <div className="overflow-x-auto">
                    <div className="text-xs text-gray-400 mb-1 font-semibold">Dataset Configuration:</div>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-700">
                          <th className="px-2 py-1 text-left font-semibold border border-gray-600 text-gray-200">Type</th>
                          <th className="px-2 py-1 text-center font-semibold border border-gray-600 text-gray-200">Mean</th>
                          <th className="px-2 py-1 text-center font-semibold border border-gray-600 text-gray-200">Std</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-blue-900/30">
                          <td className="px-2 py-1 border border-gray-600 text-gray-300">🚗 Car</td>
                          <td className="px-2 py-1 text-center border border-gray-600 text-gray-300">{trafficConfig.speed_distribution.car.mean}</td>
                          <td className="px-2 py-1 text-center border border-gray-600 text-gray-300">{trafficConfig.speed_distribution.car.std_dev}</td>
                        </tr>
                        <tr className="hover:bg-green-900/30">
                          <td className="px-2 py-1 border border-gray-600 text-gray-300">🚴 Bicycle</td>
                          <td className="px-2 py-1 text-center border border-gray-600 text-gray-300">{trafficConfig.speed_distribution.bicycle.mean}</td>
                          <td className="px-2 py-1 text-center border border-gray-600 text-gray-300">{trafficConfig.speed_distribution.bicycle.std_dev}</td>
                        </tr>
                        <tr className="hover:bg-yellow-900/30">
                          <td className="px-2 py-1 border border-gray-600 text-gray-300">🚶 Pedestrian</td>
                          <td className="px-2 py-1 text-center border border-gray-600 text-gray-300">{trafficConfig.speed_distribution.pedestrian.mean}</td>
                          <td className="px-2 py-1 text-center border border-gray-600 text-gray-300">{trafficConfig.speed_distribution.pedestrian.std_dev}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Live Speed Stats */}
                  {simulationState?.speed_distribution && (
                    <div className="overflow-x-auto">
                      <div className="text-xs text-gray-400 mb-1 font-semibold">Live Vehicle Speeds:</div>
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-700">
                            <th className="px-2 py-1 text-left font-semibold border border-gray-600 text-gray-200">Type</th>
                            <th className="px-2 py-1 text-center font-semibold border border-gray-600 text-gray-200">Count</th>
                            <th className="px-2 py-1 text-center font-semibold border border-gray-600 text-gray-200">Avg</th>
                            <th className="px-2 py-1 text-center font-semibold border border-gray-600 text-gray-200">Min</th>
                            <th className="px-2 py-1 text-center font-semibold border border-gray-600 text-gray-200">Max</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="hover:bg-blue-900/30">
                            <td className="px-2 py-1 border border-gray-600 text-gray-300">🚗 Car</td>
                            <td className="px-2 py-1 text-center border border-gray-600 text-blue-400 font-bold">{simulationState.speed_distribution.car.count}</td>
                            <td className="px-2 py-1 text-center border border-gray-600 text-gray-300">{simulationState.speed_distribution.car.avg}</td>
                            <td className="px-2 py-1 text-center border border-gray-600 text-gray-300">{simulationState.speed_distribution.car.min}</td>
                            <td className="px-2 py-1 text-center border border-gray-600 text-gray-300">{simulationState.speed_distribution.car.max}</td>
                          </tr>
                          <tr className="hover:bg-green-900/30">
                            <td className="px-2 py-1 border border-gray-600 text-gray-300">🚴 Bicycle</td>
                            <td className="px-2 py-1 text-center border border-gray-600 text-green-400 font-bold">{simulationState.speed_distribution.bicycle.count}</td>
                            <td className="px-2 py-1 text-center border border-gray-600 text-gray-300">{simulationState.speed_distribution.bicycle.avg}</td>
                            <td className="px-2 py-1 text-center border border-gray-600 text-gray-300">{simulationState.speed_distribution.bicycle.min}</td>
                            <td className="px-2 py-1 text-center border border-gray-600 text-gray-300">{simulationState.speed_distribution.bicycle.max}</td>
                          </tr>
                          <tr className="hover:bg-yellow-900/30">
                            <td className="px-2 py-1 border border-gray-600 text-gray-300">🚶 Pedestrian</td>
                            <td className="px-2 py-1 text-center border border-gray-600 text-yellow-400 font-bold">{simulationState.speed_distribution.pedestrian.count}</td>
                            <td className="px-2 py-1 text-center border border-gray-600 text-gray-300">{simulationState.speed_distribution.pedestrian.avg}</td>
                            <td className="px-2 py-1 text-center border border-gray-600 text-gray-300">{simulationState.speed_distribution.pedestrian.min}</td>
                            <td className="px-2 py-1 text-center border border-gray-600 text-gray-300">{simulationState.speed_distribution.pedestrian.max}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {/* Current Time-Based Distribution */}
                  <div className="mt-3 p-2 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg border border-purple-700">
                    <div className="text-xs font-semibold text-purple-300 mb-1">
                      🕐 {trafficConfig.time_string} - {trafficConfig.time_period}
                      <span className="text-purple-400 font-normal ml-1">(1 min = 1 hr)</span>
                    </div>
                    <div className="flex gap-2 text-xs flex-wrap">
                      {Object.entries(trafficConfig.vehicle_distribution).map(([type, ratio]) => (
                        <span key={type} className="px-2 py-1 bg-gray-700 rounded border border-gray-600 text-gray-300">
                          {type === 'car' ? '🚗' : type === 'bicycle' ? '🚴' : '🚶'} {(Number(ratio) * 100).toFixed(0)}%
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-400 italic">Loading config...</div>
              )}
            </div>

            {/* Vehicle List */}
            <div className="md:col-span-2">
              <h3 className="text-sm font-bold text-gray-200 mb-3">
                🚦 Active Vehicles ({vehicles.filter(v => v.status !== 'arrived').length})
              </h3>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {vehicles.filter(v => v.status !== 'arrived').slice(0, 20).map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer transition ${
                      highlightedVehicle === vehicle.id ? 'bg-blue-900/50 border border-blue-500' : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                    onClick={() => setHighlightedVehicle(highlightedVehicle === vehicle.id ? null : vehicle.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{VEHICLE_EMOJI[vehicle.type]}</span>
                      <div>
                        <div className="font-medium text-gray-200">{vehicle.id}</div>
                        <div className="text-gray-400 text-xs">
                          {vehicle.current_node} → {vehicle.goal_node}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        vehicle.status === 'moving' ? 'bg-green-900/50 text-green-400' :
                        vehicle.status === 'stuck' ? 'bg-red-900/50 text-red-400' :
                        vehicle.status === 'rerouting' ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-gray-600 text-gray-300'
                      }`}>
                        {vehicle.status}
                      </div>
                      {vehicle.reroute_count > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          Reroutes: {vehicle.reroute_count}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {vehicles.filter(v => v.status !== 'arrived').length > 20 && (
                  <p className="text-gray-500 text-xs italic text-center">
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
