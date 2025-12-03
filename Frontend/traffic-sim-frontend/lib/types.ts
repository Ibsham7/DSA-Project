// API configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Graph data types
export interface Node {
  id: string;
  x: number;
  y: number;
}

export interface Edge {
  from: string;
  to: string;
  distance: number;
  allowed_modes: string[];
  one_way: boolean;
}

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

// Vehicle types
export type VehicleType = 'car' | 'bicycle' | 'pedestrian';
export type VehicleStatus = 'waiting' | 'moving' | 'stuck' | 'arrived' | 'rerouting';

export interface Vehicle {
  id: string;
  type: VehicleType;
  start_node: string;
  goal_node: string;
  current_node: string;
  next_node: string | null;
  path: string[];
  path_index: number;
  status: VehicleStatus;
  speed_multiplier: number;
  capacity_usage: number;
  total_distance: number;
  wait_time: number;
  reroute_count: number;
  travel_time: number | null;
  position_on_edge: number;  // 0.0 to 1.0 position along current edge
  current_speed: number;      // Current speed in pixels/second
}

// Traffic analysis types
export interface EdgeTrafficData {
  from: string;
  to: string;
  density: number;
  congestion_level: 'free_flow' | 'light' | 'moderate' | 'heavy' | 'congested';
  congestion_probability: number;
  vehicle_count: number;
  capacity: number;
}

export interface Bottleneck {
  from: string;
  to: string;
  density: number;
  probability: number;
}

export interface CongestedNode {
  node: string;
  congestion: number;
}

export interface Accident {
  id: string;
  from_node: string;
  to_node: string;
  severity: 'minor' | 'moderate' | 'severe';
  created_at: number;
  duration: number;
}

export interface BlockedRoad {
  from_node: string;
  to_node: string;
  reason: string;
  blocked_at: number;
}

export interface SimulationInfo {
  elapsed_time: number;
  simulation_step: number;
  total_spawned: number;
  accidents_count: number;
  blocked_roads_count: number;
  congestion_hotspots: number;
}

export interface VehicleStatistics {
  total_vehicles: number;
  active_vehicles: number;
  arrived_vehicles: number;
  average_travel_time: number;
  average_wait_time: number;
  total_reroutes: number;
  vehicles_by_type: {
    car: number;
    bicycle: number;
    pedestrian: number;
  };
}

export interface TrafficStatistics {
  average_density: number;
  average_congestion_probability: number;
  total_edges: number;
  congestion_distribution: {
    free_flow: number;
    light: number;
    moderate: number;
    heavy: number;
    congested: number;
  };
  bottleneck_count: number;
  top_bottlenecks: Array<{
    from: string;
    to: string;
    density: number;
  }>;
}

export interface SpeedDistributionStats {
  car: {
    count: number;
    min: number;
    max: number;
    avg: number;
    samples: number[];
  };
  bicycle: {
    count: number;
    min: number;
    max: number;
    avg: number;
    samples: number[];
  };
  pedestrian: {
    count: number;
    min: number;
    max: number;
    avg: number;
    samples: number[];
  };
}

export interface SimulationState {
  step: number;
  is_running: boolean;
  vehicles: Vehicle[];
  vehicle_statistics: VehicleStatistics;
  traffic_statistics: TrafficStatistics;
  speed_distribution?: SpeedDistributionStats;
  edge_traffic: EdgeTrafficData[];
  traffic_multipliers: Record<string, number>;
  total_spawned: number;
}

// API response types
export interface PathResponse {
  path: string[] | null;
  cost: number;
}

export interface TrafficResponse {
  traffic: Record<string, number>;
}

export interface SimulateStepResponse {
  new_path: string[] | null;
  cost: number;
  traffic: Record<string, number>;
}

export interface SpawnVehicleResponse {
  success: boolean;
  vehicle: Vehicle;
}

export interface SpawnMultipleResponse {
  success: boolean;
  spawned_count: number;
  vehicles: Vehicle[];
}

export interface SimulationTickResponse {
  step: number;
  active_vehicles: number;
  moved: number;
  arrived: number;
  total_vehicles: number;
  traffic_multipliers: Record<string, number>;
}

// Transportation modes
export const MODES = ['car', 'bicycle', 'pedestrian'] as const;
export type Mode = typeof MODES[number];

// Mode emojis
export const MODE_EMOJI: Record<Mode, string> = {
  car: '🚗',
  bicycle: '🚴',
  pedestrian: '🚶',
};

export const MODE_LABEL: Record<Mode, string> = {
  car: 'Car',
  bicycle: 'Bicycle',
  pedestrian: 'Walk',
};

// Vehicle type emojis (for display)
export const VEHICLE_EMOJI: Record<VehicleType, string> = {
  car: '🚗',
  bicycle: '🚴',
  pedestrian: '🚶',
};

// Traffic color thresholds
export const getTrafficColor = (multiplier: number): string => {
  if (multiplier <= 1.0) return '#22c55e'; // green
  if (multiplier <= 2.0) return '#eab308'; // yellow
  return '#ef4444'; // red
};

export const getCongestionColor = (level: string): string => {
  switch (level) {
    case 'free_flow': return '#22c55e'; // green
    case 'light': return '#84cc16'; // lime
    case 'moderate': return '#eab308'; // yellow
    case 'heavy': return '#f97316'; // orange
    case 'congested': return '#ef4444'; // red
    default: return '#9ca3af'; // gray
  }
};

export const getTrafficLevel = (multiplier: number): string => {
  if (multiplier <= 1.0) return 'Low';
  if (multiplier <= 2.0) return 'Medium';
  return 'High';
};

export const getStatusColor = (status: VehicleStatus): string => {
  switch (status) {
    case 'waiting': return '#9ca3af'; // gray
    case 'moving': return '#22c55e'; // green
    case 'stuck': return '#ef4444'; // red
    case 'arrived': return '#3b82f6'; // blue
    case 'rerouting': return '#eab308'; // yellow
    default: return '#9ca3af';
  }
};
