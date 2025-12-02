# multi_vehicle_simulator.py
# Multi-vehicle traffic simulation engine
# Implements realistic traffic flow with multiple vehicles, dynamic routing, and congestion

import random
import time
from typing import List, Dict, Tuple, Optional
from collections import deque
import pathfinder
from vehicle import Vehicle, VehicleType, VehicleStatus, VehicleManager
from traffic_analyzer import TrafficAnalyzer
import config


class MultiVehicleSimulator:
    """
    Main simulation engine for multi-vehicle traffic simulation.
    Manages vehicle spawning, movement, routing, and traffic dynamics.
    """
    
    def __init__(self, graph, heuristic_coords):
        """
        Initialize the multi-vehicle simulator.
        
        Args:
            graph: Road network graph
            heuristic_coords: Coordinates for A* heuristic
        """
        self.graph = graph
        self.heuristic_coords = heuristic_coords
        self.vehicle_manager = VehicleManager()
        self.traffic_analyzer = TrafficAnalyzer(graph, self.vehicle_manager)
        self.traffic_multipliers: Dict[Tuple[str, str], float] = {}
        self.simulation_step = 0
        self.is_running = False
        self.total_spawned = 0
        self.last_update_time = time.time()
        self.edge_lengths = {}  # Cache edge lengths
        self.start_time = time.time()
        
        # Realistic traffic features
        self.blocked_roads: Dict[Tuple[str, str], dict] = {}  # Blocked roads with metadata
        self.accidents: Dict[str, dict] = {}  # Active accidents by ID
        self.accident_counter = 0
        self.congestion_points: List[Tuple[str, str]] = []  # Natural congestion hotspots
        
        # Initialize traffic multipliers and calculate edge lengths
        self._initialize_traffic_multipliers()
        self._calculate_edge_lengths()
        self._identify_congestion_hotspots()
        
    def _calculate_edge_lengths(self):
        """Calculate and cache edge lengths in pixels"""
        for node in self.graph:
            if node not in self.heuristic_coords:
                continue
            x1, y1 = self.heuristic_coords[node]
            for edge in self.graph[node]:
                to_node = edge["to"]
                if to_node not in self.heuristic_coords:
                    continue
                x2, y2 = self.heuristic_coords[to_node]
                # Calculate Euclidean distance (scaled to pixels)
                distance = ((x2 - x1)**2 + (y2 - y1)**2) ** 0.5 * 110  # SCALE factor
                self.edge_lengths[(node, to_node)] = max(distance, 50.0)  # Minimum 50 pixels
    
    def _identify_congestion_hotspots(self):
        """Identify potential congestion hotspots based on network topology"""
        # Find nodes with high connectivity (intersections)
        node_degrees = {}
        for node in self.graph:
            node_degrees[node] = len(self.graph[node])
        
        # Select top 20% as potential hotspots
        sorted_nodes = sorted(node_degrees.items(), key=lambda x: x[1], reverse=True)
        hotspot_count = max(1, len(sorted_nodes) // 5)
        
        for node, _ in sorted_nodes[:hotspot_count]:
            for edge in self.graph[node]:
                to_node = edge["to"]
                if random.random() < 0.3:  # 30% chance each edge is a hotspot
                    self.congestion_points.append((node, to_node))
        
    def _initialize_traffic_multipliers(self):
        """Initialize traffic multipliers for all edges"""
        for node in self.graph:
            for edge in self.graph[node]:
                to_node = edge["to"]
                self.traffic_multipliers[(node, to_node)] = config.DEFAULT_TRAFFIC_MULTIPLIER
    
    def create_accident(self, from_node: Optional[str] = None, to_node: Optional[str] = None) -> Optional[dict]:
        """
        Create an accident on a road, blocking it partially.
        
        Args:
            from_node: Start node of road (random if None)
            to_node: End node of road (random if None)
            
        Returns:
            Accident data or None
        """
        if from_node is None or to_node is None:
            # Pick random edge
            nodes = list(self.graph.keys())
            if not nodes:
                return None
            from_node = random.choice(nodes)
            edges = self.graph.get(from_node, [])
            if not edges:
                return None
            to_node = random.choice(edges)["to"]
        
        self.accident_counter += 1
        accident_id = f"accident_{self.accident_counter}"
        
        accident = {
            "id": accident_id,
            "from_node": from_node,
            "to_node": to_node,
            "severity": random.choice(["minor", "moderate", "severe"]),
            "created_at": time.time(),
            "duration": random.randint(30, 120)  # 30-120 seconds
        }
        
        self.accidents[accident_id] = accident
        
        # Partially block the road
        severity_multipliers = {"minor": 2.0, "moderate": 4.0, "severe": 10.0}
        self.traffic_multipliers[(from_node, to_node)] *= severity_multipliers[accident["severity"]]
        
        return accident
    
    def resolve_accident(self, accident_id: str) -> bool:
        """Resolve an accident and unblock the road"""
        if accident_id not in self.accidents:
            return False
        
        accident = self.accidents[accident_id]
        from_node = accident["from_node"]
        to_node = accident["to_node"]
        
        # Restore normal traffic
        severity_multipliers = {"minor": 2.0, "moderate": 4.0, "severe": 10.0}
        self.traffic_multipliers[(from_node, to_node)] /= severity_multipliers[accident["severity"]]
        
        del self.accidents[accident_id]
        return True
    
    def block_road(self, from_node: str, to_node: str, reason: str = "construction") -> bool:
        """
        Completely block a road.
        
        Args:
            from_node: Start node
            to_node: End node
            reason: Reason for blocking
            
        Returns:
            True if successful
        """
        edge = (from_node, to_node)
        if edge not in self.traffic_multipliers:
            return False
        
        self.blocked_roads[edge] = {
            "from_node": from_node,
            "to_node": to_node,
            "reason": reason,
            "blocked_at": time.time()
        }
        
        # Make road extremely slow (effectively blocked)
        self.traffic_multipliers[edge] = 100.0
        return True
    
    def unblock_road(self, from_node: str, to_node: str) -> bool:
        """Unblock a previously blocked road"""
        edge = (from_node, to_node)
        if edge not in self.blocked_roads:
            return False
        
        del self.blocked_roads[edge]
        self.traffic_multipliers[edge] = config.DEFAULT_TRAFFIC_MULTIPLIER
        return True
    
    def get_elapsed_time(self) -> float:
        """Get simulation elapsed time in seconds"""
        return time.time() - self.start_time
                
    def spawn_vehicle(
        self,
        vehicle_type: VehicleType,
        start_node: Optional[str] = None,
        goal_node: Optional[str] = None
    ) -> Optional[Vehicle]:
        """
        Spawn a new vehicle in the simulation.
        
        Args:
            vehicle_type: Type of vehicle to spawn
            start_node: Starting node (random if None)
            goal_node: Goal node (random if None)
            
        Returns:
            Spawned vehicle or None if failed
        """
        # Get random nodes if not specified
        nodes = list(self.graph.keys())
        if not nodes:
            return None
            
        if start_node is None:
            start_node = random.choice(nodes)
            
        if goal_node is None:
            # Pick a different node as goal
            available_goals = [n for n in nodes if n != start_node]
            if not available_goals:
                return None
            goal_node = random.choice(available_goals)
            
        # Create vehicle
        vehicle = Vehicle(vehicle_type, start_node, goal_node)
        
        # Calculate initial path
        mode = vehicle_type.value
        path, cost = pathfinder.a_star(
            self.graph,
            self.heuristic_coords,
            self.traffic_multipliers,
            start_node,
            goal_node,
            mode
        )
        
        if path:
            vehicle.set_path(path, cost)
            self.vehicle_manager.add_vehicle(vehicle)
            self.total_spawned += 1
            return vehicle
        else:
            return None
            
    def spawn_random_vehicles(self, count: int, distribution: Optional[Dict[str, float]] = None):
        """
        Spawn multiple random vehicles with specified distribution.
        
        Args:
            count: Number of vehicles to spawn
            distribution: Distribution of vehicle types (e.g., {"car": 0.6, "bicycle": 0.3, "pedestrian": 0.1})
        """
        if distribution is None:
            # Default distribution: 60% cars, 25% bikes, 15% pedestrians
            distribution = {"car": 0.6, "bicycle": 0.25, "pedestrian": 0.15}
            
        spawned = []
        
        for _ in range(count):
            # Select vehicle type based on distribution
            rand = random.random()
            cumulative = 0
            vehicle_type = VehicleType.CAR
            
            for v_type, prob in distribution.items():
                cumulative += prob
                if rand <= cumulative:
                    vehicle_type = VehicleType(v_type)
                    break
                    
            vehicle = self.spawn_vehicle(vehicle_type)
            if vehicle:
                spawned.append(vehicle)
                
        return spawned
        
    def move_vehicle(self, vehicle: Vehicle) -> bool:
        """
        Move a single vehicle to its next node.
        Handles rerouting if necessary.
        
        Args:
            vehicle: Vehicle to move
            
        Returns:
            True if moved successfully, False if arrived or stuck
        """
        if vehicle.status == VehicleStatus.ARRIVED:
            return False
            
        # Check if rerouting is needed
        if self._should_reroute(vehicle):
            self._reroute_vehicle(vehicle)
            
        # Move to next node
        success = vehicle.move_to_next_node()
        
        if vehicle.status == VehicleStatus.ARRIVED:
            self.vehicle_manager.mark_vehicle_arrived(vehicle.id)
            
        return success
        
    def _should_reroute(self, vehicle: Vehicle) -> bool:
        """
        Determine if a vehicle should recalculate its route.
        Based on traffic conditions ahead and blocked roads.
        
        Args:
            vehicle: Vehicle to check
            
        Returns:
            True if rerouting recommended
        """
        if not vehicle.path or len(vehicle.path) < 2:
            return False
            
        # Check congestion probability on upcoming edges
        upcoming_edges = []
        for i in range(vehicle.path_index, min(vehicle.path_index + 3, len(vehicle.path) - 1)):
            from_node = vehicle.path[i]
            to_node = vehicle.path[i + 1]
            upcoming_edges.append((from_node, to_node))
            
        # Reroute immediately if any upcoming edge is blocked
        for edge in upcoming_edges:
            if edge in self.blocked_roads:
                return True
            
        # Reroute if any upcoming edge has moderate congestion (lowered from 0.7 to 0.5)
        for edge in upcoming_edges:
            prob = self.traffic_analyzer.get_congestion_probability(edge[0], edge[1])
            if prob > 0.5:  # Moderate congestion probability - more aggressive rerouting
                return True
                
        return False
        
    def _reroute_vehicle(self, vehicle: Vehicle):
        """
        Recalculate route for a vehicle.
        
        Args:
            vehicle: Vehicle to reroute
        """
        mode = vehicle.type.value
        new_path, new_cost = pathfinder.a_star(
            self.graph,
            self.heuristic_coords,
            self.traffic_multipliers,
            vehicle.current_node,
            vehicle.goal_node,
            mode
        )
        
        if new_path and new_path != vehicle.path[vehicle.path_index:]:
            vehicle.set_path(new_path, new_cost)
            vehicle.increment_reroute()
            vehicle.path_index = 0  # Reset since we have a new path from current position
            
            # Reset vehicle speed to normal after reroute
            vehicle.target_speed = vehicle.speed_multiplier
            vehicle.status = VehicleStatus.MOVING
            
    def simulation_tick(self) -> dict:
        """
        Execute one simulation tick with smooth physics-based movement.
        Implements realistic traffic buildup over time.
        
        Returns:
            Dictionary with tick results
        """
        # Calculate delta time
        current_time = time.time()
        delta_time = current_time - self.last_update_time
        self.last_update_time = current_time
        
        # Cap delta time to prevent huge jumps
        delta_time = min(delta_time, 0.2)  # Max 200ms
        
        self.simulation_step += 1
        elapsed_time = self.get_elapsed_time()
        
        # Gradual congestion buildup (realistic traffic patterns)
        # First 30 seconds: Normal traffic
        # 30-60 seconds: Start seeing slowdowns on hotspots
        # 60+ seconds: Full congestion can develop
        congestion_factor = min(elapsed_time / 60.0, 1.0)
        
        # Random accident generation (very rare events - 0.05% chance per minute)
        # Reduced from 0.0005 to 0.00005 (10x less frequent)
        if random.random() < 0.00005 * (elapsed_time / 60.0):
            self.create_accident()
        
        # Auto-resolve old accidents
        for accident_id in list(self.accidents.keys()):
            accident = self.accidents[accident_id]
            if current_time - accident["created_at"] > accident["duration"]:
                self.resolve_accident(accident_id)
        
        # Update traffic based on current vehicle positions and time
        self.traffic_analyzer.update_traffic_multipliers(self.traffic_multipliers)
        
        # Apply time-based congestion on hotspots - INFREQUENTLY to avoid jitter
        # Only update hotspot congestion every 30th step for stability
        if self.simulation_step % 30 == 0:
            for edge in self.congestion_points:
                if edge in self.traffic_multipliers and congestion_factor > 0.3:
                    # Gradually increase congestion on hotspots
                    base_multiplier = self.traffic_multipliers[edge]
                    time_penalty = 1.0 + (congestion_factor * random.uniform(0.5, 2.0))
                    new_multiplier = min(base_multiplier * time_penalty, 5.0)
                    
                    # Smooth the change - exponential moving average (alpha = 0.3)
                    self.traffic_multipliers[edge] = base_multiplier * 0.7 + new_multiplier * 0.3
        
        # Get all active vehicles
        active_vehicles = self.vehicle_manager.get_active_vehicles()
        moved = 0
        arrived = 0
        
        # First pass: Check for vehicles ahead and adjust speeds
        for vehicle in active_vehicles:
            if vehicle.status == VehicleStatus.ARRIVED or not vehicle.next_node:
                continue
            
            edge = (vehicle.current_node, vehicle.next_node)
            
            # Check if road is blocked - trigger reroute
            if edge in self.blocked_roads:
                # Don't just stop - trigger reroute check
                if self._should_reroute(vehicle):
                    self._reroute_vehicle(vehicle)
                else:
                    # No alternative route available
                    vehicle.target_speed = 0.0
                    vehicle.status = VehicleStatus.STUCK
                continue
                
            vehicles_on_edge = self.vehicle_manager.get_vehicles_on_edge(
                vehicle.current_node, vehicle.next_node
            )
            
            # Find vehicle directly ahead on same edge
            ahead_vehicle = None
            min_distance = float('inf')
            
            for other_id in vehicles_on_edge:
                if other_id == vehicle.id:
                    continue
                other = self.vehicle_manager.get_vehicle(other_id)
                if not other:
                    continue
                    
                # Check if other vehicle is ahead
                if other.position_on_edge > vehicle.position_on_edge:
                    distance = other.position_on_edge - vehicle.position_on_edge
                    edge_length = self.edge_lengths.get(edge, 100.0)
                    pixel_distance = distance * edge_length
                    
                    if pixel_distance < min_distance:
                        min_distance = pixel_distance
                        ahead_vehicle = other
            
            # Adjust speed based on vehicle ahead
            if ahead_vehicle:
                vehicle.slow_down_for_vehicle_ahead(min_distance)
            else:
                # No vehicle ahead - apply traffic congestion effects
                # Get traffic multiplier for this edge
                traffic_multiplier = self.traffic_multipliers.get(edge, 1.0)
                
                # Calculate ideal speed based on traffic conditions
                if traffic_multiplier > 1.0:
                    # Congested - reduce speed proportionally
                    speed_factor = 1.0 / traffic_multiplier
                    ideal_speed = vehicle.speed_multiplier * max(speed_factor, 0.2)
                else:
                    # Clear - use full speed
                    ideal_speed = vehicle.speed_multiplier
                
                # CRITICAL FIX FOR JUMPING AT LOW SPEEDS:
                # DO NOT adjust target_speed if current_speed < 10 px/s (updated for new speed scale)
                # This prevents interference during acceleration phase
                
                if vehicle.current_speed < 10.0:
                    # Low speed - don't interfere, let vehicle accelerate naturally
                    # Only set initial target if it's not already set correctly
                    if vehicle.target_speed < vehicle.speed_multiplier * 0.9:
                        vehicle.target_speed = vehicle.speed_multiplier
                else:
                    # High speed (>= 10 px/s) - safe to apply traffic control
                    speed_diff = ideal_speed - vehicle.target_speed
                    
                    # Large deadband (2.0 px/s) to prevent oscillation (scaled for new speeds)
                    if abs(speed_diff) > 2.0:
                        # Significant change - adjust very slowly
                        if speed_diff > 0:
                            vehicle.target_speed = min(vehicle.target_speed + 0.1, ideal_speed)
                        else:
                            vehicle.target_speed = max(ideal_speed, vehicle.target_speed - 0.1)
                    elif abs(speed_diff) > 0.5:
                        # Medium change - adjust a bit faster
                        if speed_diff > 0:
                            vehicle.target_speed = min(vehicle.target_speed + 0.2, ideal_speed)
                        else:
                            vehicle.target_speed = max(ideal_speed, vehicle.target_speed - 0.2)
                    # else: small difference, don't adjust
                
                # Update stuck status conservatively (scaled thresholds)
                if traffic_multiplier > 3.0 and vehicle.current_speed < 1.0:
                    vehicle.status = VehicleStatus.STUCK
                elif vehicle.status == VehicleStatus.STUCK and vehicle.current_speed > 3.0:
                    vehicle.status = VehicleStatus.MOVING
        
        # Second pass: Update positions
        for vehicle in active_vehicles:
            if vehicle.status == VehicleStatus.ARRIVED or not vehicle.next_node:
                continue
                
            edge = (vehicle.current_node, vehicle.next_node)
            edge_length = self.edge_lengths.get(edge, 100.0)
            
            # Update physics-based position
            reached_end = vehicle.update_position(delta_time, edge_length)
            
            if reached_end:
                # Move to next node on path
                success = vehicle.move_to_next_node()
                if success:
                    moved += 1
                if vehicle.status == VehicleStatus.ARRIVED:
                    arrived += 1
                    
        # Update edge occupancy
        self.vehicle_manager.update_edge_occupancy()
        
        return {
            "step": self.simulation_step,
            "active_vehicles": len(active_vehicles) - arrived,
            "moved": moved,
            "arrived": arrived,
            "total_vehicles": len(self.vehicle_manager.get_all_vehicles()),
            "delta_time": delta_time,
            "elapsed_time": elapsed_time,
            "accidents": list(self.accidents.values()),
            "blocked_roads": list(self.blocked_roads.values())
        }
        
    def run_continuous_simulation(self, duration_steps: int, spawn_rate: int = 2):
        """
        Run simulation for a specified duration with continuous spawning.
        
        Args:
            duration_steps: Number of simulation steps
            spawn_rate: Vehicles to spawn per step
        """
        self.is_running = True
        
        for step in range(duration_steps):
            if not self.is_running:
                break
                
            # Spawn new vehicles periodically
            if step % 3 == 0:  # Every 3 steps
                self.spawn_random_vehicles(spawn_rate)
                
            # Run simulation tick
            result = self.simulation_tick()
            
            # Optional: Clean up very old arrived vehicles
            if step % 10 == 0:
                self.vehicle_manager.clear_arrived_vehicles()
                
        self.is_running = False
        
    def get_simulation_state(self) -> dict:
        """
        Get complete current state of the simulation.
        
        Returns:
            Dictionary with all simulation data
        """
        vehicles = [v.to_dict() for v in self.vehicle_manager.get_all_vehicles()]
        vehicle_stats = self.vehicle_manager.get_statistics()
        traffic_stats = self.traffic_analyzer.get_global_statistics()
        edge_data = self.traffic_analyzer.get_edge_traffic_data()
        
        # Convert traffic multipliers to serializable format
        traffic_dict = {f"{k[0]},{k[1]}": v for k, v in self.traffic_multipliers.items()}
        
        return {
            "step": self.simulation_step,
            "is_running": self.is_running,
            "vehicles": vehicles,
            "vehicle_statistics": vehicle_stats,
            "traffic_statistics": traffic_stats,
            "edge_traffic": edge_data,
            "traffic_multipliers": traffic_dict,
            "total_spawned": self.total_spawned
        }
        
    def get_vehicles_json(self) -> List[dict]:
        """Get all vehicles as JSON-serializable list"""
        return [v.to_dict() for v in self.vehicle_manager.get_all_vehicles()]
        
    def get_traffic_multipliers_json(self) -> dict:
        """Get traffic multipliers in JSON-serializable format"""
        return {f"{k[0]},{k[1]}": v for k, v in self.traffic_multipliers.items()}
        
    def reset_simulation(self):
        """Reset the entire simulation to initial state"""
        self.vehicle_manager.reset()
        self._initialize_traffic_multipliers()
        self.simulation_step = 0
        self.is_running = False
        self.total_spawned = 0
        
    def stop_simulation(self):
        """Stop continuous simulation"""
        self.is_running = False
        
    def get_vehicle_by_id(self, vehicle_id: str) -> Optional[Vehicle]:
        """Get specific vehicle by ID"""
        return self.vehicle_manager.get_vehicle(vehicle_id)
        
    def remove_vehicle(self, vehicle_id: str) -> bool:
        """Remove a specific vehicle"""
        return self.vehicle_manager.remove_vehicle(vehicle_id)
        
    def get_congestion_report(self) -> dict:
        """
        Get detailed congestion report for analysis.
        
        Returns:
            Comprehensive congestion analysis
        """
        bottlenecks = self.traffic_analyzer.find_bottlenecks(threshold=0.5)
        congested_nodes = []
        
        for node in self.graph.keys():
            node_congestion = self.traffic_analyzer.get_node_congestion(node)
            if node_congestion > 0.5:
                congested_nodes.append({
                    "node": node,
                    "congestion": node_congestion
                })
                
        congested_nodes.sort(key=lambda x: x["congestion"], reverse=True)
        
        return {
            "bottlenecks": [
                {
                    "from": f,
                    "to": t,
                    "density": d,
                    "probability": self.traffic_analyzer.get_congestion_probability(f, t)
                }
                for f, t, d in bottlenecks
            ],
            "congested_intersections": congested_nodes[:10],
            "global_stats": self.traffic_analyzer.get_global_statistics()
        }
