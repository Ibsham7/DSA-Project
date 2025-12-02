# traffic_analyzer.py
# Traffic density analysis and congestion probability calculation
# Implements statistical models for realistic traffic patterns

import random
import math
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
from vehicle import VehicleManager, Vehicle, VehicleType


class TrafficAnalyzer:
    """
    Analyzes traffic patterns and calculates congestion probabilities.
    Uses statistical models and graph-based analysis for realistic traffic simulation.
    """
    
    # Edge capacity constants (vehicles per unit distance) - Reduced for more congestion
    BASE_EDGE_CAPACITY = 3.0  # Base capacity for an edge (reduced from 5.0)
    
    # Congestion thresholds - Lower thresholds for earlier congestion
    LOW_CONGESTION = 0.2      # < 20% capacity (reduced from 0.3)
    MEDIUM_CONGESTION = 0.4   # 20-40% capacity (reduced from 0.6)
    HIGH_CONGESTION = 0.7     # 40-70% capacity (reduced from 0.85)
    CRITICAL_CONGESTION = 1.0  # > 70% capacity
    
    # Traffic multiplier ranges based on congestion - More aggressive penalties
    TRAFFIC_RANGES = {
        "free_flow": (0.5, 0.8),      # Very light traffic
        "light": (1.0, 1.5),           # Light traffic (increased from 0.8-1.2)
        "moderate": (1.5, 2.5),        # Moderate traffic (increased from 1.2-2.0)
        "heavy": (2.5, 4.0),           # Heavy traffic (increased from 2.0-3.5)
        "congested": (4.0, 6.0)        # Severe congestion (increased from 3.5-5.0)
    }
    
    def __init__(self, graph, vehicle_manager: VehicleManager):
        """
        Initialize traffic analyzer.
        
        Args:
            graph: The road network graph
            vehicle_manager: Manager for all vehicles
        """
        self.graph = graph
        self.vehicle_manager = vehicle_manager
        self.edge_capacities: Dict[Tuple[str, str], float] = {}
        self.congestion_history: Dict[Tuple[str, str], List[float]] = defaultdict(list)
        self._calculate_edge_capacities()
        
    def _calculate_edge_capacities(self):
        """
        Calculate capacity for each edge based on distance.
        Longer edges can hold more vehicles.
        """
        for node in self.graph:
            for edge in self.graph[node]:
                to_node = edge["to"]
                distance = edge["distance"]
                # Capacity scales with distance
                capacity = self.BASE_EDGE_CAPACITY * (1 + distance / 100)
                self.edge_capacities[(node, to_node)] = capacity
                
    def get_edge_density(self, from_node: str, to_node: str) -> float:
        """
        Calculate current density on an edge (0.0 to 1.0+).
        
        Args:
            from_node: Start node
            to_node: End node
            
        Returns:
            Density ratio (vehicles / capacity)
        """
        edge = (from_node, to_node)
        capacity = self.edge_capacities.get(edge, self.BASE_EDGE_CAPACITY)
        usage = self.vehicle_manager.get_edge_capacity_usage(from_node, to_node)
        # Ensure non-negative result
        return max(0.0, usage / capacity)
        
    def get_congestion_level(self, from_node: str, to_node: str) -> str:
        """
        Get congestion level for an edge.
        
        Returns:
            One of: "free_flow", "light", "moderate", "heavy", "congested"
        """
        density = self.get_edge_density(from_node, to_node)
        
        if density < self.LOW_CONGESTION:
            return "free_flow"
        elif density < self.MEDIUM_CONGESTION:
            return "light"
        elif density < self.HIGH_CONGESTION:
            return "moderate"
        elif density < self.CRITICAL_CONGESTION:
            return "heavy"
        else:
            return "congested"
            
    def calculate_traffic_multiplier(self, from_node: str, to_node: str) -> float:
        """
        Calculate traffic multiplier based on current congestion.
        Uses realistic traffic flow models.
        
        Args:
            from_node: Start node
            to_node: End node
            
        Returns:
            Traffic multiplier (higher = slower)
        """
        level = self.get_congestion_level(from_node, to_node)
        min_mult, max_mult = self.TRAFFIC_RANGES[level]
        
        # Add some randomness for realism
        multiplier = random.uniform(min_mult, max_mult)
        
        # Record in history
        edge = (from_node, to_node)
        self.congestion_history[edge].append(multiplier)
        if len(self.congestion_history[edge]) > 100:  # Keep last 100 samples
            self.congestion_history[edge].pop(0)
            
        return multiplier
        
    def get_congestion_probability(self, from_node: str, to_node: str) -> float:
        """
        Calculate probability of congestion on an edge (0.0 to 1.0).
        Based on current density and historical patterns.
        
        Args:
            from_node: Start node
            to_node: End node
            
        Returns:
            Probability of congestion (0.0 = free flow, 1.0 = definitely congested)
        """
        density = self.get_edge_density(from_node, to_node)
        
        # Base probability from current density (ensure non-negative)
        base_prob = max(0.0, min(density / self.CRITICAL_CONGESTION, 1.0))
        
        # Adjust based on historical data
        edge = (from_node, to_node)
        history = self.congestion_history.get(edge, [])
        
        if history:
            # Calculate average historical congestion
            avg_multiplier = sum(history) / len(history)
            # High average multiplier increases probability
            historical_factor = max(0.0, min((avg_multiplier - 1.0) / 4.0, 0.3))  # Max 30% influence, non-negative
            base_prob = max(0.0, min(base_prob + historical_factor, 1.0))
            
        return base_prob
        
    def update_traffic_multipliers(self, traffic_multipliers: Dict[Tuple[str, str], float]):
        """
        Update all traffic multipliers based on current vehicle positions.
        This is the core of the dynamic traffic system.
        
        Args:
            traffic_multipliers: Dictionary to update with new multipliers
        """
        # Update edge occupancy first
        self.vehicle_manager.update_edge_occupancy()
        
        # Calculate multipliers for all edges
        for node in self.graph:
            for edge in self.graph[node]:
                to_node = edge["to"]
                multiplier = self.calculate_traffic_multiplier(node, to_node)
                traffic_multipliers[(node, to_node)] = multiplier
                
    def find_bottlenecks(self, threshold: float = 0.7) -> List[Tuple[str, str, float]]:
        """
        Find bottleneck edges where congestion is likely.
        
        Args:
            threshold: Density threshold to consider as bottleneck
            
        Returns:
            List of (from_node, to_node, density) tuples
        """
        bottlenecks = []
        
        for (from_node, to_node), capacity in self.edge_capacities.items():
            density = self.get_edge_density(from_node, to_node)
            if density >= threshold:
                bottlenecks.append((from_node, to_node, density))
                
        # Sort by density (highest first)
        bottlenecks.sort(key=lambda x: x[2], reverse=True)
        return bottlenecks
        
    def get_node_congestion(self, node: str) -> float:
        """
        Calculate average congestion for all edges leaving a node.
        Useful for identifying congested intersections.
        
        Args:
            node: Node ID
            
        Returns:
            Average density of outgoing edges
        """
        if node not in self.graph:
            return 0.0
            
        densities = []
        for edge in self.graph[node]:
            to_node = edge["to"]
            density = self.get_edge_density(node, to_node)
            densities.append(density)
            
        return sum(densities) / len(densities) if densities else 0.0
        
    def predict_congestion(self, from_node: str, to_node: str, time_steps: int = 5) -> float:
        """
        Predict future congestion on an edge based on current trends.
        
        Args:
            from_node: Start node
            to_node: End node
            time_steps: Number of steps ahead to predict
            
        Returns:
            Predicted congestion probability
        """
        edge = (from_node, to_node)
        history = self.congestion_history.get(edge, [])
        
        if len(history) < 3:
            # Not enough data, use current probability
            return self.get_congestion_probability(from_node, to_node)
            
        # Simple linear trend prediction
        recent = history[-10:]  # Last 10 samples
        trend = (recent[-1] - recent[0]) / len(recent) if len(recent) > 1 else 0
        
        # Project forward
        current_mult = recent[-1]
        predicted_mult = current_mult + (trend * time_steps)
        
        # Convert to probability
        predicted_prob = min((predicted_mult - 0.5) / 4.5, 1.0)
        return max(0.0, predicted_prob)
        
    def get_global_statistics(self) -> dict:
        """
        Get global traffic statistics for the entire network.
        
        Returns:
            Dictionary with comprehensive traffic statistics
        """
        all_densities = []
        all_probabilities = []
        congestion_counts = {"free_flow": 0, "light": 0, "moderate": 0, "heavy": 0, "congested": 0}
        
        for node in self.graph:
            for edge in self.graph[node]:
                to_node = edge["to"]
                density = self.get_edge_density(node, to_node)
                prob = self.get_congestion_probability(node, to_node)
                level = self.get_congestion_level(node, to_node)
                
                all_densities.append(density)
                all_probabilities.append(prob)
                congestion_counts[level] += 1
                
        total_edges = sum(congestion_counts.values())
        avg_density = sum(all_densities) / len(all_densities) if all_densities else 0
        avg_probability = sum(all_probabilities) / len(all_probabilities) if all_probabilities else 0
        
        bottlenecks = self.find_bottlenecks(threshold=0.6)
        
        return {
            "average_density": avg_density,
            "average_congestion_probability": avg_probability,
            "total_edges": total_edges,
            "congestion_distribution": {
                level: (count / total_edges * 100) if total_edges > 0 else 0
                for level, count in congestion_counts.items()
            },
            "bottleneck_count": len(bottlenecks),
            "top_bottlenecks": [
                {"from": f, "to": t, "density": d}
                for f, t, d in bottlenecks[:5]
            ]
        }
        
    def get_edge_traffic_data(self) -> List[dict]:
        """
        Get detailed traffic data for all edges.
        Useful for visualization.
        
        Returns:
            List of edge traffic information
        """
        edge_data = []
        
        for node in self.graph:
            for edge in self.graph[node]:
                to_node = edge["to"]
                density = self.get_edge_density(node, to_node)
                level = self.get_congestion_level(node, to_node)
                probability = self.get_congestion_probability(node, to_node)
                vehicle_count = self.vehicle_manager.get_edge_vehicle_count(node, to_node)
                
                edge_data.append({
                    "from": node,
                    "to": to_node,
                    "density": density,
                    "congestion_level": level,
                    "congestion_probability": probability,
                    "vehicle_count": vehicle_count,
                    "capacity": self.edge_capacities.get((node, to_node), self.BASE_EDGE_CAPACITY)
                })
                
        return edge_data
