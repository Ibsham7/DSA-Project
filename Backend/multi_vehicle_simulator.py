
import random
import time
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from collections import deque
import pathfinder
from vehicle import Vehicle, VehicleType, VehicleStatus, VehicleManager, TrafficConfig
from traffic_analyzer import TrafficAnalyzer
import config


class MultiVehicleSimulator:
    """
    Main simulation engine for multi-vehicle traffic simulation.
    Manages vehicle spawning, movement, routing, and traffic dynamics.
    """
    
    # Time scale: 1 real minute = 1 simulation hour (60x speed)
    TIME_SCALE = 60.0  # 60x faster than real time
    
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
        self.last_spawn_time = time.time()  # For auto-spawning
        self.last_stuck_check_time = time.time()  # For periodic stuck vehicle checks
        
        # Simulation time tracking (accelerated time)
        self.simulation_start_time = time.time()
        self.simulation_start_hour = 7  # Start simulation at 7 AM
        
        # Realistic traffic features
        self.blocked_roads: Dict[Tuple[str, str], dict] = {}  # Blocked roads with metadata
        self.accidents: Dict[str, dict] = {}  # Active accidents by ID
        self.accident_counter = 0
        self.congestion_points: List[Tuple[str, str]] = []  # Natural congestion hotspots
        
        # Initialize traffic multipliers and calculate edge lengths
        self._initialize_traffic_multipliers()
        self._calculate_edge_lengths()
        self._identify_congestion_hotspots()
    
    def get_simulation_time(self) -> dict:
        """
        Get current simulation time (accelerated).
        1 real minute = 1 simulation hour (60x speed)
        
        Returns:
            Dict with simulation hour, minute, time_period, and elapsed info
        """
        elapsed_real_seconds = time.time() - self.simulation_start_time
        elapsed_sim_hours = (elapsed_real_seconds / 60.0) * self.TIME_SCALE / 60.0  # Convert to hours
        
        # Calculate current simulation hour (wraps at 24)
        current_sim_hour = (self.simulation_start_hour + elapsed_sim_hours) % 24
        hour = int(current_sim_hour)
        minute = int((current_sim_hour % 1) * 60)
        
        # Determine time period
        if hour in [7, 8, 9]:
            time_period = "Morning Rush"
        elif hour in [10, 11, 12, 13, 14, 15, 16]:
            time_period = "Midday"
        elif hour in [17, 18, 19]:
            time_period = "Evening Rush"
        else:
            time_period = "Night"
        
        return {
            "hour": hour,
            "minute": minute,
            "time_string": f"{hour:02d}:{minute:02d}",
            "time_period": time_period,
            "elapsed_real_seconds": elapsed_real_seconds,
            "elapsed_sim_hours": elapsed_sim_hours,
            "time_scale": self.TIME_SCALE
        }
    
    def get_simulation_hour(self) -> int:
        """Get current simulation hour (0-23)"""
        return self.get_simulation_time()["hour"]
        
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
    
    def _create_statistical_accident(self, from_node: Optional[str] = None, to_node: Optional[str] = None) -> Optional[dict]:
        """
        Create an accident using statistical distributions from real dataset.
        Severity and duration are sampled from real-world data.
        
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
        
        # Get accident params from real dataset
        accident_params = TrafficConfig.get_accident_params()
        severity_dist = accident_params.get("severity_distribution", {"minor": 0.70, "moderate": 0.25, "severe": 0.05})
        duration_params = accident_params.get("duration_minutes", {"mean": 45, "std_dev": 20, "min": 10, "max": 120})
        
        # Sample severity based on distribution (70% minor, 25% moderate, 5% severe)
        rand = random.random()
        if rand < severity_dist.get("minor", 0.70):
            severity = "minor"
        elif rand < severity_dist.get("minor", 0.70) + severity_dist.get("moderate", 0.25):
            severity = "moderate"
        else:
            severity = "severe"
        
        # Sample duration from normal distribution (mean: 45 min, std: 20 min)
        duration_minutes = random.gauss(duration_params.get("mean", 45), duration_params.get("std_dev", 20))
        duration_minutes = max(duration_params.get("min", 10), min(duration_params.get("max", 120), duration_minutes))
        duration_seconds = duration_minutes * 60  # Convert to seconds
        
        accident = {
            "id": accident_id,
            "from_node": from_node,
            "to_node": to_node,
            "severity": severity,
            "created_at": time.time(),
            "duration": duration_seconds
        }
        
        self.accidents[accident_id] = accident
        
        # Partially block the road based on severity
        severity_multipliers = {"minor": 2.0, "moderate": 4.0, "severe": 10.0}
        self.traffic_multipliers[(from_node, to_node)] *= severity_multipliers[severity]
        
        return accident
    
    def create_accident(self, from_node: Optional[str] = None, to_node: Optional[str] = None) -> Optional[dict]:
        """
        Create an accident on a road, blocking it partially.
        Uses statistical distributions from real dataset.
        
        Args:
            from_node: Start node of road (random if None)
            to_node: End node of road (random if None)
            
        Returns:
            Accident data or None
        """
        return self._create_statistical_accident(from_node, to_node)
    
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
    
    def _create_statistical_blockage(self) -> Optional[dict]:
        """
        Create a blockage using statistical distributions from real dataset.
        Duration is sampled from real-world data (mean: 30 min, std: 15 min).
        
        Returns:
            Blockage data or None
        """
        # Pick random edge
        nodes = list(self.graph.keys())
        if not nodes:
            return None
        from_node = random.choice(nodes)
        edges = self.graph.get(from_node, [])
        if not edges:
            return None
        to_node = random.choice(edges)["to"]
        
        edge = (from_node, to_node)
        if edge in self.blocked_roads:
            return None  # Already blocked
        
        # Get blockage params from real dataset
        blockage_params = TrafficConfig.get_blockage_params()
        duration_params = blockage_params.get("duration_minutes", {"mean": 30, "std_dev": 15, "min": 5, "max": 90})
        
        # Sample duration from normal distribution
        duration_minutes = random.gauss(duration_params.get("mean", 30), duration_params.get("std_dev", 15))
        duration_minutes = max(duration_params.get("min", 5), min(duration_params.get("max", 90), duration_minutes))
        duration_seconds = duration_minutes * 60
        
        reasons = ["construction", "maintenance", "event", "emergency"]
        
        self.blocked_roads[edge] = {
            "from_node": from_node,
            "to_node": to_node,
            "reason": random.choice(reasons),
            "created_at": time.time(),
            "duration": duration_seconds,
            "blocked_at": time.time()
        }
        
        # Make road extremely slow (effectively blocked)
        self.traffic_multipliers[edge] = 100.0
        return self.blocked_roads[edge]
    
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
        
        # Calculate initial path (avoiding blocked roads)
        mode = vehicle_type.value
        path, cost = pathfinder.a_star(
            self.graph,
            self.heuristic_coords,
            self.traffic_multipliers,
            start_node,
            goal_node,
            mode,
            blocked_roads=set(self.blocked_roads.keys())
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
            distribution: Distribution of vehicle types (from real dataset config)
        """
        if distribution is None:
            # Use distribution from real dataset config
            distribution = TrafficConfig.get_vehicle_distribution()
            
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
    
    def _auto_spawn_vehicles(self, current_time: float, is_peak_hour: bool):
        """
        Automatically spawn vehicles based on statistical spawn rate from real dataset.
        Spawns vehicles at rate of 25/min (mean) with std 5.6, using vehicle distribution.
        Uses simulation time (accelerated) for time-based vehicle distribution.
        
        Args:
            current_time: Current simulation time
            is_peak_hour: Whether current hour is peak hour
        """
        spawn_params = TrafficConfig.get_spawn_rate()
        vehicles_per_minute_mean = spawn_params.get("vehicles_per_minute_mean", 25)
        vehicles_per_minute_std = spawn_params.get("vehicles_per_minute_std_dev", 5.6)
        off_peak_multiplier = spawn_params.get("off_peak_multiplier", 0.4)
        
        # Apply peak/off-peak multiplier
        rate_multiplier = 1.0 if is_peak_hour else off_peak_multiplier
        
        # Sample spawn rate from normal distribution
        current_rate = random.gauss(vehicles_per_minute_mean, vehicles_per_minute_std)
        current_rate = max(1, current_rate) * rate_multiplier  # At least 1 vehicle/min
        
        # Convert to spawn interval (seconds between spawns)
        spawn_interval = 60.0 / current_rate
        
        # Check if enough time has passed to spawn
        time_since_last_spawn = current_time - self.last_spawn_time
        
        if time_since_last_spawn >= spawn_interval:
            # Get vehicle distribution using SIMULATION hour (accelerated time)
            sim_hour = self.get_simulation_hour()
            distribution = TrafficConfig.get_vehicle_distribution(sim_hour)
            
            # Select vehicle type based on distribution
            rand = random.random()
            cumulative = 0
            vehicle_type = VehicleType.CAR
            
            for v_type, prob in distribution.items():
                cumulative += prob
                if rand <= cumulative:
                    vehicle_type = VehicleType(v_type)
                    break
            
            # Spawn the vehicle
            vehicle = self.spawn_vehicle(vehicle_type)
            if vehicle:
                self.last_spawn_time = current_time
        
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
        
        # CRITICAL: Check if current edge (the one vehicle is on) is blocked
        if vehicle.next_node:
            current_edge = (vehicle.current_node, vehicle.next_node)
            if current_edge in self.blocked_roads:
                return True
            
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
            mode,
            blocked_roads=set(self.blocked_roads.keys())
        )
        
        if new_path and new_path != vehicle.path[vehicle.path_index:]:
            vehicle.set_path(new_path, new_cost)
            vehicle.increment_reroute()
            vehicle.path_index = 0  # Reset since we have a new path from current position
            
            # Reset vehicle speed to normal after reroute
            vehicle.target_speed = vehicle.speed_multiplier
            vehicle.status = VehicleStatus.MOVING
        elif not new_path:
            # No alternative path exists - vehicle is stuck permanently
            # Freeze vehicle completely to prevent jumping
            vehicle.target_speed = 0.0
            vehicle.current_speed = 0.0
            vehicle.status = VehicleStatus.STUCK
            # Don't clear next_node - keep it so we know vehicle is stuck on this edge
    
    def _check_stuck_vehicles(self):
        """
        Periodically check if stuck vehicles can move again.
        Called every 10 seconds to see if blockages have been removed.
        """
        stuck_vehicles = [v for v in self.vehicle_manager.get_active_vehicles() 
                         if v.status == VehicleStatus.STUCK and v.current_speed == 0.0]
        
        for vehicle in stuck_vehicles:
            # Try to find a new path
            mode = vehicle.type.value
            new_path, new_cost = pathfinder.a_star(
                self.graph,
                self.heuristic_coords,
                self.traffic_multipliers,
                vehicle.current_node,
                vehicle.goal_node,
                mode,
                blocked_roads=set(self.blocked_roads.keys())
            )
            
            if new_path:
                # Path found! Unfreeze vehicle
                vehicle.set_path(new_path, new_cost)
                vehicle.increment_reroute()
                vehicle.path_index = 0
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
        
        # Get congestion params from real dataset
        congestion_params = TrafficConfig.get_congestion_params()
        
        # Check if current SIMULATION hour is peak hour (using accelerated time)
        sim_hour = self.get_simulation_hour()
        is_peak_hour = sim_hour in congestion_params.get("peak_hours", [9, 10, 17, 18])
        peak_multiplier = congestion_params.get("peak_multiplier", 2.0) if is_peak_hour else 1.0
        
        # Sample congestion from statistical distribution
        base_congestion = random.gauss(
            congestion_params.get("mean", 0.425),
            congestion_params.get("std_dev", 0.2)
        )
        base_congestion = max(0.0, min(1.0, base_congestion))  # Clamp 0-1
        congestion_factor = min(base_congestion * peak_multiplier * (elapsed_time / 60.0 + 0.5), 1.0)
        
        # Auto-spawn vehicles based on real dataset (25 vehicles/min mean, 5.6 std)
        self._auto_spawn_vehicles(current_time, is_peak_hour)
        
        # Accident generation based on real dataset (5 accidents per hour)
        accident_params = TrafficConfig.get_accident_params()
        accidents_per_hour = accident_params.get("rate_per_hour", 5)
        # Convert to per-tick probability (assuming ~20 ticks per second)
        accident_prob_per_tick = accidents_per_hour / 3600.0 / 20.0
        if random.random() < accident_prob_per_tick:
            self._create_statistical_accident()
        
        # Blockage generation based on real dataset (3 blockages per hour)
        blockage_params = TrafficConfig.get_blockage_params()
        blockages_per_hour = blockage_params.get("rate_per_hour", 3)
        blockage_prob_per_tick = blockages_per_hour / 3600.0 / 20.0
        if random.random() < blockage_prob_per_tick:
            self._create_statistical_blockage()
        
        # Auto-resolve old accidents
        for accident_id in list(self.accidents.keys()):
            accident = self.accidents[accident_id]
            if current_time - accident["created_at"] > accident["duration"]:
                self.resolve_accident(accident_id)
        
        # Auto-resolve old blockages (based on duration)
        for edge in list(self.blocked_roads.keys()):
            blockage = self.blocked_roads[edge]
            if "created_at" in blockage and "duration" in blockage:
                if current_time - blockage["created_at"] > blockage["duration"]:
                    self.unblock_road(edge[0], edge[1])
        
        # Periodically check stuck vehicles every 10 seconds
        if current_time - self.last_stuck_check_time >= 10.0:
            self._check_stuck_vehicles()
            self.last_stuck_check_time = current_time
        
        # Update traffic based on current vehicle positions and time
        self.traffic_analyzer.update_traffic_multipliers(self.traffic_multipliers)
        
        # Apply time-based congestion on hotspots
        for edge in self.congestion_points:
            if edge in self.traffic_multipliers and congestion_factor > 0.3:
                # Gradually increase congestion on hotspots
                base_multiplier = self.traffic_multipliers[edge]
                time_penalty = 1.0 + (congestion_factor * random.uniform(0.5, 2.0))
                self.traffic_multipliers[edge] = min(base_multiplier * time_penalty, 5.0)
        
        # Get all active vehicles
        active_vehicles = self.vehicle_manager.get_active_vehicles()
        moved = 0
        arrived = 0
        
        # First pass: Check for vehicles ahead and adjust speeds
        for vehicle in active_vehicles:
            if vehicle.status == VehicleStatus.ARRIVED or not vehicle.next_node:
                continue
            
            edge = (vehicle.current_node, vehicle.next_node)
            
            # Check if road is blocked - MUST reroute immediately
            if edge in self.blocked_roads:
                # Force immediate reroute
                self._reroute_vehicle(vehicle)
                # If reroute failed, vehicle is now frozen - skip further processing
                continue
            
            # If vehicle was frozen due to blocked road but road is now clear, unfreeze
            if vehicle.status == VehicleStatus.STUCK and vehicle.current_speed == 0.0 and vehicle.target_speed == 0.0:
                # Road is not blocked, so this was a traffic stop - unfreeze and recalculate
                vehicle.target_speed = vehicle.speed_multiplier
                vehicle.status = VehicleStatus.MOVING
                
            vehicles_on_edge = self.vehicle_manager.get_vehicles_on_edge(
                vehicle.current_node, vehicle.next_node
            )
            
            # Find vehicle directly ahead on same edge
            ahead_vehicle = None
            min_distance = float('inf')
            
            for other in vehicles_on_edge:
                if other.id == vehicle.id:
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
                # No vehicle ahead, resume normal speed
                vehicle.target_speed = vehicle.speed_multiplier
                if vehicle.status == VehicleStatus.STUCK:
                    vehicle.status = VehicleStatus.MOVING
        
        # Second pass: Update positions
        for vehicle in active_vehicles:
            if vehicle.status == VehicleStatus.ARRIVED or not vehicle.next_node:
                continue
            
            edge = (vehicle.current_node, vehicle.next_node)
            
            # Skip vehicles frozen due to blocked roads (checked via periodic recheck)
            if edge in self.blocked_roads and vehicle.current_speed == 0.0:
                continue
            
            # Double-check: Don't allow movement on blocked edges
            if edge in self.blocked_roads:
                vehicle.target_speed = 0.0
                vehicle.status = VehicleStatus.STUCK
                continue
                
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
        # Reset simulation time to start at 7 AM again
        self.simulation_start_time = time.time()
        self.simulation_start_hour = 7
        self.last_spawn_time = time.time()
        self.last_stuck_check_time = time.time()
        
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
