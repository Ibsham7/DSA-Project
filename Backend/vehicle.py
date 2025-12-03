# vehicle.py
# Vehicle entity system for multi-vehicle traffic simulation
# Uses object-oriented design and data structures for efficient vehicle management

import random
import time
import json
import os
from enum import Enum
from typing import List, Optional, Tuple, Dict
from collections import deque


class VehicleType(Enum):
    """Types of vehicles in the simulation"""
    CAR = "car"
    BIKE = "bicycle"
    PEDESTRIAN = "pedestrian"


class VehicleStatus(Enum):
    """Status of vehicle in simulation"""
    WAITING = "waiting"          # Waiting to start
    MOVING = "moving"            # Currently moving
    STUCK = "stuck"              # In traffic/congestion
    ARRIVED = "arrived"          # Reached destination
    REROUTING = "rerouting"      # Calculating new path


class TrafficConfig:
    """
    Loads and provides access to real-world traffic statistics.
    Uses statistical distributions for realistic simulation.
    """
    _instance = None
    _config = None
    
    # Default fallback values (used if config not loaded)
    DEFAULT_SPEEDS = {
        "car": {"mean": 63.5, "std_dev": 17.02, "min": 0, "max": 100},
        "bicycle": {"mean": 25.0, "std_dev": 8.0, "min": 5, "max": 40},
        "pedestrian": {"mean": 5.0, "std_dev": 1.5, "min": 2, "max": 8}
    }
    
    @classmethod
    def load(cls, config_path: str = None):
        """Load configuration from JSON file"""
        if config_path is None:
            config_path = os.path.join(os.path.dirname(__file__), "traffic_config.json")
        
        try:
            with open(config_path, 'r') as f:
                cls._config = json.load(f)
            print(f"Loaded traffic config from {config_path}")
        except Exception as e:
            print(f"Warning: Could not load traffic config: {e}. Using defaults.")
            cls._config = None
    
    @classmethod
    def get_config(cls) -> Dict:
        """Get the loaded config, loading if necessary"""
        if cls._config is None:
            cls.load()
        return cls._config or {}
    
    @classmethod
    def sample_speed(cls, vehicle_type: str) -> float:
        """
        Sample a speed from the statistical distribution for this vehicle type.
        Returns speed in km/h.
        """
        config = cls.get_config()
        speed_config = config.get("speed_kmh", cls.DEFAULT_SPEEDS)
        
        type_config = speed_config.get(vehicle_type, cls.DEFAULT_SPEEDS.get(vehicle_type, {"mean": 50, "std_dev": 10, "min": 10, "max": 80}))
        
        # Sample from normal distribution
        speed = random.gauss(type_config["mean"], type_config["std_dev"])
        # Clamp to min/max
        speed = max(type_config["min"], min(type_config["max"], speed))
        
        return speed
    
    @classmethod
    def get_congestion_params(cls) -> Dict:
        """Get congestion parameters"""
        config = cls.get_config()
        return config.get("congestion", {
            "mean": 0.425,
            "std_dev": 0.2,
            "peak_hours": [9, 10, 17, 18],
            "peak_multiplier": 2.0
        })
    
    @classmethod
    def get_accident_params(cls) -> Dict:
        """Get accident parameters"""
        config = cls.get_config()
        return config.get("accidents", {
            "rate_per_hour": 5,
            "severity_distribution": {"minor": 0.70, "moderate": 0.25, "severe": 0.05},
            "duration_minutes": {"mean": 45, "std_dev": 20, "min": 10, "max": 120}
        })
    
    @classmethod
    def get_blockage_params(cls) -> Dict:
        """Get blockage parameters"""
        config = cls.get_config()
        return config.get("blockages", {
            "rate_per_hour": 3,
            "duration_minutes": {"mean": 30, "std_dev": 15, "min": 5, "max": 90}
        })
    
    @classmethod
    def get_vehicle_distribution(cls, hour: int = None) -> Dict:
        """
        Get vehicle type distribution based on time of day.
        
        Args:
            hour: Current hour (0-23). If None, uses current system time.
        
        Returns:
            Dict with car, bicycle, pedestrian percentages
        """
        from datetime import datetime
        if hour is None:
            hour = datetime.now().hour
        
        config = cls.get_config()
        dist_config = config.get("vehicle_distribution", {})
        
        # Check if using time-based distribution (new format)
        if "morning_rush" in dist_config:
            # Find which time period we're in
            for period_name, period_data in dist_config.items():
                if isinstance(period_data, dict) and "hours" in period_data:
                    if hour in period_data["hours"]:
                        return {
                            "car": period_data.get("car", 0.65),
                            "bicycle": period_data.get("bicycle", 0.05),
                            "pedestrian": period_data.get("pedestrian", 0.15)
                        }
            # Default fallback
            return {"car": 0.65, "bicycle": 0.05, "pedestrian": 0.15}
        else:
            # Old format - static distribution
            return {
                "car": dist_config.get("car", 0.65),
                "bicycle": dist_config.get("bicycle", 0.05),
                "pedestrian": dist_config.get("pedestrian", 0.15)
            }
    
    @classmethod
    def get_speed_distribution(cls) -> Dict:
        """Get speed distribution for all vehicle types"""
        config = cls.get_config()
        return config.get("speed_kmh", cls.DEFAULT_SPEEDS)
    
    @classmethod
    def get_spawn_rate(cls) -> Dict:
        """Get spawn rate parameters"""
        config = cls.get_config()
        return config.get("spawn_rate", {
            "vehicles_per_minute_mean": 25,
            "vehicles_per_minute_std_dev": 5.6,
            "off_peak_multiplier": 0.4
        })


# Conversion factor: km/h to pixels/sec (adjust based on your map scale)
# Assuming 1 pixel = 10 meters, so 1 km = 100 pixels
# 1 km/h = 100 pixels / 3600 sec = 0.0278 pixels/sec
# For visual purposes, we scale up: 1 km/h ≈ 1 pixel/sec
KMH_TO_PIXELS_PER_SEC = 1.0


class Vehicle:
    """
    Represents a single vehicle in the traffic simulation.
    Implements smooth, realistic movement with physics-based positioning.
    Speed is sampled from real-world statistical distributions.
    """
    
    # Vehicle capacity (how much space they occupy on an edge)
    CAPACITY_USAGE = {
        VehicleType.CAR: 1.0,
        VehicleType.BIKE: 0.5,
        VehicleType.PEDESTRIAN: 0.2
    }
    
    _id_counter = 0  # Static counter for unique IDs
    
    def __init__(
        self,
        vehicle_type: VehicleType,
        start_node: str,
        goal_node: str,
        path: Optional[List[str]] = None
    ):
        """
        Initialize a vehicle.
        
        Args:
            vehicle_type: Type of vehicle (CAR, BIKE, PEDESTRIAN)
            start_node: Starting node ID
            goal_node: Destination node ID
            path: Pre-calculated path (optional)
        """
        Vehicle._id_counter += 1
        self.id = f"{vehicle_type.value}_{Vehicle._id_counter}"
        self.type = vehicle_type
        self.start_node = start_node
        self.goal_node = goal_node
        self.current_node = start_node
        self.next_node: Optional[str] = None
        self.path: List[str] = path if path else []
        self.path_index = 0
        self.status = VehicleStatus.WAITING
        
        # Sample speed from statistical distribution (km/h -> pixels/sec)
        sampled_speed_kmh = TrafficConfig.sample_speed(vehicle_type.value)
        self.speed_multiplier = sampled_speed_kmh * KMH_TO_PIXELS_PER_SEC
        
        self.capacity_usage = self.CAPACITY_USAGE[vehicle_type]
        self.spawn_time = time.time()
        self.arrival_time: Optional[float] = None
        self.total_distance = 0.0
        
        # Physics-based movement properties
        self.position_on_edge = 0.0  # 0.0 to 1.0 along current edge
        self.current_speed = 0.0     # Current speed (can be reduced by traffic)
        self.target_speed = self.speed_multiplier  # Desired speed
        self.acceleration = 0.3      # How quickly speed changes (increased for smoother response)
        self.wait_time = 0.0  # Time spent waiting in traffic
        self.reroute_count = 0
        self._last_position = 0.0    # For smoothing to prevent jitter
        
    def set_path(self, path: List[str], cost: float = 0.0):
        """
        Set or update the vehicle's path.
        
        Args:
            path: List of node IDs representing the path
            cost: Cost of the path
        """
        self.path = path
        self.path_index = 0
        self.position_on_edge = 0.0  # Reset position when path changes
        self._last_position = 0.0    # Reset smoothing tracker
        if len(path) > 1:
            self.next_node = path[1]
            self.status = VehicleStatus.MOVING
        else:
            self.next_node = None
            
    def move_to_next_node(self) -> bool:
        """
        Move vehicle to the next node in its path.
        
        Returns:
            bool: True if moved successfully, False if at destination or no path
        """
        if not self.path or self.path_index >= len(self.path) - 1:
            # Reached destination
            self.status = VehicleStatus.ARRIVED
            self.arrival_time = time.time()
            return False
            
        self.path_index += 1
        self.current_node = self.path[self.path_index]
        
        if self.path_index < len(self.path) - 1:
            self.next_node = self.path[self.path_index + 1]
            self.status = VehicleStatus.MOVING
            self.position_on_edge = 0.0  # Reset position for new edge
            self._last_position = 0.0    # Reset smoothing tracker
        else:
            self.next_node = None
            self.status = VehicleStatus.ARRIVED
            self.arrival_time = time.time()
            
        return True
    
    def update_position(self, delta_time: float, edge_length: float) -> bool:
        """
        Update vehicle position along current edge using physics.
        
        Args:
            delta_time: Time elapsed since last update (seconds)
            edge_length: Length of current edge in pixels
            
        Returns:
            True if reached end of edge, False otherwise
        """
        if self.status != VehicleStatus.MOVING and self.status != VehicleStatus.STUCK:
            return False
        
        # If vehicle is completely stuck (frozen), don't move at all - prevents jumping
        if self.status == VehicleStatus.STUCK and self.current_speed == 0.0 and self.target_speed == 0.0:
            return False
        
        # Accelerate/decelerate toward target speed
        speed_diff = self.target_speed - self.current_speed
        if abs(speed_diff) < self.acceleration * delta_time:
            self.current_speed = self.target_speed
        elif speed_diff > 0:
            self.current_speed += self.acceleration * delta_time
        else:
            self.current_speed -= self.acceleration * delta_time
        
        # Minimum speed threshold - prevent micro-movements that cause jumping
        # Only apply when target speed is also very low (vehicle is trying to stop/crawl)
        MIN_SPEED_THRESHOLD = 0.5  # pixels/sec
        if self.target_speed < 1.0 and abs(self.current_speed) < MIN_SPEED_THRESHOLD:
            self.current_speed = 0.0
            return False
        
        # Update position based on current speed
        distance_moved = self.current_speed * delta_time
        position_change = distance_moved / edge_length
        
        # Only update if movement is significant (prevent floating point jitter)
        if abs(position_change) > 0.0001:  # 0.01% of edge length
            new_position = self.position_on_edge + position_change
            # Clamp position to valid range
            self.position_on_edge = max(0.0, min(1.0, new_position))
            self._last_position = self.position_on_edge
        
        # Check if reached end of edge
        if self.position_on_edge >= 1.0:
            self.position_on_edge = 1.0
            return True
        
        return False
    
    def slow_down_for_vehicle_ahead(self, distance_to_vehicle: float, min_distance: float = 30.0):
        """
        Slow down if there's a vehicle ahead.
        Uses hysteresis to prevent oscillation and jumping.
        
        Args:
            distance_to_vehicle: Distance to vehicle ahead in pixels
            min_distance: Minimum safe following distance
        """
        # Add hysteresis: require more distance to resume than to slow down
        resume_distance = min_distance * 2.5  # Increased buffer to prevent oscillation
        
        if distance_to_vehicle < min_distance:
            # Too close - FREEZE completely (both speeds to 0)
            self.target_speed = 0.0
            self.current_speed = 0.0
            self.status = VehicleStatus.STUCK
        elif distance_to_vehicle < min_distance * 1.5:
            # Close but not frozen - slow crawl
            speed_ratio = (distance_to_vehicle / (min_distance * 2))
            min_crawl_speed = self.speed_multiplier * 0.15
            self.target_speed = max(min_crawl_speed, self.speed_multiplier * speed_ratio)
            # Don't change status - keep MOVING so it doesn't get frozen
        elif distance_to_vehicle >= resume_distance:
            # Clear ahead with buffer, resume normal speed
            self.target_speed = self.speed_multiplier
            if self.status == VehicleStatus.STUCK:
                self.status = VehicleStatus.MOVING
        # else: maintain current target_speed in hysteresis zone
        
    def get_current_edge(self) -> Optional[Tuple[str, str]]:
        """
        Get the current edge the vehicle is on or moving towards.
        
        Returns:
            Tuple of (from_node, to_node) or None
        """
        if self.next_node:
            return (self.current_node, self.next_node)
        return None
        
    def increment_reroute(self):
        """Increment reroute counter"""
        self.reroute_count += 1
        self.status = VehicleStatus.REROUTING
        
    def add_wait_time(self, time_delta: float):
        """Add waiting time when stuck in traffic"""
        self.wait_time += time_delta
        self.status = VehicleStatus.STUCK
        
    def get_travel_time(self) -> Optional[float]:
        """Get total travel time if arrived"""
        if self.arrival_time:
            return self.arrival_time - self.spawn_time
        return None
        
    def to_dict(self):
        """Convert vehicle to dictionary for API serialization"""
        return {
            "id": self.id,
            "type": self.type.value,
            "start_node": self.start_node,
            "goal_node": self.goal_node,
            "current_node": self.current_node,
            "next_node": self.next_node,
            "path": self.path,
            "path_index": self.path_index,
            "status": self.status.value,
            "speed_multiplier": self.speed_multiplier,
            "capacity_usage": self.capacity_usage,
            "total_distance": self.total_distance,
            "wait_time": self.wait_time,
            "reroute_count": self.reroute_count,
            "travel_time": self.get_travel_time(),
            "position_on_edge": self.position_on_edge,  # For smooth rendering
            "current_speed": self.current_speed
        }
        
    def __repr__(self):
        return f"Vehicle({self.id}, {self.type.value}, {self.current_node}->{self.goal_node}, {self.status.value})"


class VehicleManager:
    """
    Manages all vehicles in the simulation.
    Uses data structures for efficient vehicle tracking and querying.
    """
    
    def __init__(self):
        """Initialize the vehicle manager"""
        self.vehicles: dict[str, Vehicle] = {}  # All vehicles by ID
        self.active_vehicles: set[str] = set()  # IDs of active (not arrived) vehicles
        self.edge_occupancy: dict[Tuple[str, str], List[str]] = {}  # Edge -> Vehicle IDs
        
    def add_vehicle(self, vehicle: Vehicle) -> str:
        """
        Add a vehicle to the simulation.
        
        Args:
            vehicle: Vehicle instance to add
            
        Returns:
            Vehicle ID
        """
        self.vehicles[vehicle.id] = vehicle
        if vehicle.status != VehicleStatus.ARRIVED:
            self.active_vehicles.add(vehicle.id)
        return vehicle.id
        
    def remove_vehicle(self, vehicle_id: str) -> bool:
        """
        Remove a vehicle from the simulation.
        
        Args:
            vehicle_id: ID of vehicle to remove
            
        Returns:
            bool: True if removed, False if not found
        """
        if vehicle_id in self.vehicles:
            del self.vehicles[vehicle_id]
            self.active_vehicles.discard(vehicle_id)
            # Clean up edge occupancy
            for edge, vehicle_list in self.edge_occupancy.items():
                if vehicle_id in vehicle_list:
                    vehicle_list.remove(vehicle_id)
            return True
        return False
        
    def get_vehicle(self, vehicle_id: str) -> Optional[Vehicle]:
        """Get vehicle by ID"""
        return self.vehicles.get(vehicle_id)
        
    def get_all_vehicles(self) -> List[Vehicle]:
        """Get all vehicles"""
        return list(self.vehicles.values())
        
    def get_active_vehicles(self) -> List[Vehicle]:
        """Get vehicles that haven't arrived yet"""
        return [self.vehicles[vid] for vid in self.active_vehicles if vid in self.vehicles]
        
    def get_vehicles_on_edge(self, from_node: str, to_node: str) -> List[Vehicle]:
        """
        Get all vehicles currently on a specific edge.
        
        Args:
            from_node: Start node of edge
            to_node: End node of edge
            
        Returns:
            List of vehicles on this edge
        """
        edge = (from_node, to_node)
        vehicle_ids = self.edge_occupancy.get(edge, [])
        return [self.vehicles[vid] for vid in vehicle_ids if vid in self.vehicles]
        
    def update_edge_occupancy(self):
        """
        Update the edge occupancy tracking.
        This should be called after vehicles move.
        """
        # Clear existing occupancy
        self.edge_occupancy.clear()
        
        # Rebuild occupancy map
        for vehicle in self.get_active_vehicles():
            edge = vehicle.get_current_edge()
            if edge:
                if edge not in self.edge_occupancy:
                    self.edge_occupancy[edge] = []
                self.edge_occupancy[edge].append(vehicle.id)
                
    def get_edge_vehicle_count(self, from_node: str, to_node: str) -> int:
        """Get number of vehicles on an edge"""
        edge = (from_node, to_node)
        return len(self.edge_occupancy.get(edge, []))
        
    def get_edge_capacity_usage(self, from_node: str, to_node: str) -> float:
        """
        Calculate total capacity usage on an edge.
        Cars use 1.0, bikes use 0.5, pedestrians use 0.2.
        
        Returns:
            Total capacity usage (sum of all vehicle capacities)
        """
        vehicles = self.get_vehicles_on_edge(from_node, to_node)
        return sum(v.capacity_usage for v in vehicles)
        
    def mark_vehicle_arrived(self, vehicle_id: str):
        """Mark a vehicle as arrived and remove from active set"""
        if vehicle_id in self.active_vehicles:
            self.active_vehicles.remove(vehicle_id)
            if vehicle_id in self.vehicles:
                self.vehicles[vehicle_id].status = VehicleStatus.ARRIVED
                
    def clear_arrived_vehicles(self):
        """Remove all arrived vehicles from the simulation"""
        arrived = [vid for vid, v in self.vehicles.items() if v.status == VehicleStatus.ARRIVED]
        for vid in arrived:
            self.remove_vehicle(vid)
            
    def get_statistics(self):
        """
        Get simulation statistics.
        
        Returns:
            Dictionary with statistics
        """
        all_vehicles = self.get_all_vehicles()
        active = self.get_active_vehicles()
        arrived = [v for v in all_vehicles if v.status == VehicleStatus.ARRIVED]
        
        total_travel_time = sum(v.get_travel_time() or 0 for v in arrived)
        avg_travel_time = total_travel_time / len(arrived) if arrived else 0
        
        total_wait_time = sum(v.wait_time for v in all_vehicles)
        avg_wait_time = total_wait_time / len(all_vehicles) if all_vehicles else 0
        
        total_reroutes = sum(v.reroute_count for v in all_vehicles)
        
        return {
            "total_vehicles": len(all_vehicles),
            "active_vehicles": len(active),
            "arrived_vehicles": len(arrived),
            "average_travel_time": avg_travel_time,
            "average_wait_time": avg_wait_time,
            "total_reroutes": total_reroutes,
            "vehicles_by_type": {
                "car": len([v for v in all_vehicles if v.type == VehicleType.CAR]),
                "bicycle": len([v for v in all_vehicles if v.type == VehicleType.BIKE]),
                "pedestrian": len([v for v in all_vehicles if v.type == VehicleType.PEDESTRIAN])
            }
        }
        
    def reset(self):
        """Clear all vehicles and reset the manager"""
        self.vehicles.clear()
        self.active_vehicles.clear()
        self.edge_occupancy.clear()
        Vehicle._id_counter = 0
