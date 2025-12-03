import { 
  API_BASE_URL, 
  PathResponse, 
  TrafficResponse, 
  SimulateStepResponse,
  SpawnVehicleResponse,
  SpawnMultipleResponse,
  SimulationTickResponse,
  SimulationState,
  Vehicle,
  VehicleType,
  VehicleStatistics,
  TrafficStatistics,
  EdgeTrafficData
} from './types';

export const api = {
  // Health check
  async healthCheck(): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/`);
    return response.json();
  },

  // Get all available nodes
  async getNodes(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/nodes`);
    return response.json();
  },

  // Get available maps
  async getMaps(): Promise<{ maps: string[]; current: string }> {
    const response = await fetch(`${API_BASE_URL}/maps`);
    return response.json();
  },

  // Switch to a different map
  async switchMap(mapName: string): Promise<{ message: string; nodes: string[] }> {
    const response = await fetch(`${API_BASE_URL}/switch_map?map_name=${encodeURIComponent(mapName)}`, {
      method: 'POST',
    });
    return response.json();
  },

  // Get map data
  async getMapData(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/map_data`);
    return response.json();
  },

  // Get shortest path
  async getPath(start: string, goal: string, mode: string): Promise<PathResponse> {
    const response = await fetch(
      `${API_BASE_URL}/path?start=${encodeURIComponent(start)}&goal=${encodeURIComponent(goal)}&mode=${encodeURIComponent(mode)}`
    );
    return response.json();
  },

  // Update traffic conditions
  async updateTraffic(): Promise<TrafficResponse> {
    const response = await fetch(`${API_BASE_URL}/update_traffic`, {
      method: 'POST',
    });
    return response.json();
  },

  // Simulate one step
  async simulateStep(start: string, goal: string, mode: string): Promise<SimulateStepResponse> {
    const response = await fetch(
      `${API_BASE_URL}/simulate_step?start=${encodeURIComponent(start)}&goal=${encodeURIComponent(goal)}&mode=${encodeURIComponent(mode)}`,
      {
        method: 'POST',
      }
    );
    return response.json();
  },

  // ===== MULTI-VEHICLE SIMULATION APIs =====

  async spawnVehicle(
    vehicleType: VehicleType,
    startNode?: string,
    goalNode?: string
  ): Promise<SpawnVehicleResponse> {
    const response = await fetch(`${API_BASE_URL}/spawn_vehicle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicle_type: vehicleType,
        start_node: startNode,
        goal_node: goalNode,
      }),
    });
    if (!response.ok) throw new Error('Failed to spawn vehicle');
    return response.json();
  },

  async spawnMultipleVehicles(
    count: number,
    distribution?: Record<string, number>
  ): Promise<SpawnMultipleResponse> {
    const response = await fetch(`${API_BASE_URL}/spawn_multiple_vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count, distribution }),
    });
    if (!response.ok) throw new Error('Failed to spawn vehicles');
    return response.json();
  },

  async simulationTick(): Promise<SimulationTickResponse> {
    const response = await fetch(`${API_BASE_URL}/simulation_tick`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to execute simulation tick');
    return response.json();
  },

  async getSimulationState(): Promise<SimulationState> {
    const response = await fetch(`${API_BASE_URL}/simulation_state`);
    if (!response.ok) throw new Error('Failed to fetch simulation state');
    return response.json();
  },

  async getAllVehicles(): Promise<{ vehicles: Vehicle[]; count: number }> {
    const response = await fetch(`${API_BASE_URL}/vehicles`);
    if (!response.ok) throw new Error('Failed to fetch vehicles');
    return response.json();
  },

  async getVehicle(vehicleId: string): Promise<Vehicle> {
    const response = await fetch(`${API_BASE_URL}/vehicle/${vehicleId}`);
    if (!response.ok) throw new Error('Failed to fetch vehicle');
    return response.json();
  },

  async deleteVehicle(vehicleId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/vehicle/${vehicleId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete vehicle');
    return response.json();
  },

  async getTrafficStatistics(): Promise<{
    vehicle_statistics: VehicleStatistics;
    traffic_statistics: TrafficStatistics;
  }> {
    const response = await fetch(`${API_BASE_URL}/traffic_statistics`);
    if (!response.ok) throw new Error('Failed to fetch traffic statistics');
    return response.json();
  },

  async getCongestionReport(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/congestion_report`);
    if (!response.ok) throw new Error('Failed to fetch congestion report');
    return response.json();
  },

  async getEdgeTraffic(): Promise<{ edges: EdgeTrafficData[] }> {
    const response = await fetch(`${API_BASE_URL}/edge_traffic`);
    if (!response.ok) throw new Error('Failed to fetch edge traffic');
    return response.json();
  },

  async resetSimulation(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/reset_simulation`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to reset simulation');
    return response.json();
  },

  async startContinuousSimulation(
    durationSteps: number = 100,
    spawnRate: number = 2
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetch(
      `${API_BASE_URL}/start_continuous_simulation?duration_steps=${durationSteps}&spawn_rate=${spawnRate}`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error('Failed to start continuous simulation');
    return response.json();
  },

  async stopSimulation(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/stop_simulation`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to stop simulation');
    return response.json();
  },

  // ===== REALISTIC TRAFFIC CONTROL APIs =====

  async createAccident(fromNode?: string, toNode?: string): Promise<any> {
    const params = new URLSearchParams();
    if (fromNode) params.append('from_node', fromNode);
    if (toNode) params.append('to_node', toNode);
    
    const response = await fetch(`${API_BASE_URL}/create_accident?${params}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to create accident');
    return response.json();
  },

  async resolveAccident(accidentId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/resolve_accident/${accidentId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to resolve accident');
    return response.json();
  },

  async getAccidents(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/accidents`);
    if (!response.ok) throw new Error('Failed to fetch accidents');
    return response.json();
  },

  async blockRoad(fromNode: string, toNode: string, reason: string = 'construction'): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/block_road?from_node=${encodeURIComponent(fromNode)}&to_node=${encodeURIComponent(toNode)}&reason=${encodeURIComponent(reason)}`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error('Failed to block road');
    return response.json();
  },

  async unblockRoad(fromNode: string, toNode: string): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/unblock_road?from_node=${encodeURIComponent(fromNode)}&to_node=${encodeURIComponent(toNode)}`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error('Failed to unblock road');
    return response.json();
  },

  async getBlockedRoads(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/blocked_roads`);
    if (!response.ok) throw new Error('Failed to fetch blocked roads');
    return response.json();
  },

  async getSimulationInfo(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/simulation_info`);
    if (!response.ok) throw new Error('Failed to fetch simulation info');
    return response.json();
  },

  async getTrafficConfig(): Promise<{
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
  }> {
    const response = await fetch(`${API_BASE_URL}/traffic_config`);
    if (!response.ok) throw new Error('Failed to fetch traffic config');
    return response.json();
  },
};


