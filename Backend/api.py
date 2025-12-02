from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
from json_to_graph import load_graph
import pathfinder
import traffic_updater
from simulator import run_simulation
from multi_vehicle_simulator import MultiVehicleSimulator
from vehicle import VehicleType
import config

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request models
class SpawnVehicleRequest(BaseModel):
    vehicle_type: str
    start_node: Optional[str] = None
    goal_node: Optional[str] = None

class SpawnMultipleRequest(BaseModel):
    count: int
    distribution: Optional[Dict[str, float]] = None

# Available maps
AVAILABLE_MAPS = {
    "simple": "map.json",
    "city": "city_map.json",
    "nust": "nust_campus.json"
}

# Default map
current_map = "city"
graph, heuristic_coords = load_graph(AVAILABLE_MAPS[current_map])
traffic_multipliers = traffic_updater.initialize_traffic_multipliers(graph)

# Initialize multi-vehicle simulator
simulator = MultiVehicleSimulator(graph, heuristic_coords)


@app.get("/")
def home():
    return {"message": "Traffic Simulation API running"}


# Get the shortest path
@app.get("/path")
def get_path(start: str, goal: str, mode: str):
    if mode not in config.SIM_MODES:
        return {"error": "Invalid mode"}

    path, cost = pathfinder.a_star(
        graph,
        heuristic_coords,
        traffic_multipliers,
        start,
        goal,
        mode
    )

    # Handle infinity cost (no path found)
    if cost == float('inf'):
        return {"path": None, "cost": None}
    
    return {"path": path, "cost": cost}


# Get all nodes
@app.get("/nodes")
def get_nodes():
    return list(graph.keys())


# Get available maps
@app.get("/maps")
def get_maps():
    return {
        "maps": list(AVAILABLE_MAPS.keys()),
        "current": current_map
    }


# Switch map
@app.post("/switch_map")
def switch_map(map_name: str):
    global graph, heuristic_coords, traffic_multipliers, current_map, simulator
    
    if map_name not in AVAILABLE_MAPS:
        return {"error": "Invalid map name", "available": list(AVAILABLE_MAPS.keys())}
    
    current_map = map_name
    graph, heuristic_coords = load_graph(AVAILABLE_MAPS[map_name])
    traffic_multipliers = traffic_updater.initialize_traffic_multipliers(graph)
    
    # Reinitialize simulator with new map
    simulator = MultiVehicleSimulator(graph, heuristic_coords)
    
    return {
        "message": f"Switched to {map_name} map",
        "nodes": list(graph.keys())
    }


# Get map data (nodes and edges with coordinates)
@app.get("/map_data")
def get_map_data():
    return {
        "nodes": [{"id": node_id, "x": coords[0], "y": coords[1]} 
                  for node_id, coords in heuristic_coords.items()],
        "edges": [
            {
                "from": node_id,
                "to": edge["to"],
                "distance": edge["distance"],
                "allowed_modes": edge["allowed"],
                "one_way": edge["one_way"]
            }
            for node_id in graph
            for edge in graph[node_id]
        ]
    }


# Apply random traffic and give updated multipliers
@app.post("/update_traffic")
def update_traffic():
    traffic_updater.apply_random_traffic(traffic_multipliers, graph)
    # Convert tuple keys to strings for JSON serialization
    traffic_dict = {f"{k[0]},{k[1]}": v for k, v in traffic_multipliers.items()}
    return {"traffic": traffic_dict}


# One simulation step
@app.post("/simulate_step")
def simulate_step(start: str, goal: str, mode: str):
    path, cost = pathfinder.a_star(
        graph,
        heuristic_coords,
        traffic_multipliers,
        start,
        goal,
        mode
    )

    traffic_updater.apply_random_traffic(traffic_multipliers, graph)

    # Convert tuple keys to strings for JSON serialization
    traffic_dict = {f"{k[0]},{k[1]}": v for k, v in traffic_multipliers.items()}
    
    # Handle infinity cost (no path found)
    if cost == float('inf'):
        return {
            "new_path": None,
            "cost": None,
            "traffic": traffic_dict
        }
    
    return {
        "new_path": path,
        "cost": cost,
        "traffic": traffic_dict
    }


# ===== MULTI-VEHICLE SIMULATION ENDPOINTS =====

@app.post("/spawn_vehicle")
def spawn_vehicle(request: SpawnVehicleRequest):
    """Spawn a single vehicle in the simulation"""
    try:
        vehicle_type = VehicleType(request.vehicle_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid vehicle type. Must be one of: car, bicycle, pedestrian")
    
    vehicle = simulator.spawn_vehicle(
        vehicle_type,
        request.start_node,
        request.goal_node
    )
    
    if vehicle:
        return {
            "success": True,
            "vehicle": vehicle.to_dict()
        }
    else:
        raise HTTPException(status_code=400, detail="Failed to spawn vehicle. No valid path found.")


@app.post("/spawn_multiple_vehicles")
def spawn_multiple_vehicles(request: SpawnMultipleRequest):
    """Spawn multiple vehicles with specified distribution"""
    vehicles = simulator.spawn_random_vehicles(request.count, request.distribution)
    
    return {
        "success": True,
        "spawned_count": len(vehicles),
        "vehicles": [v.to_dict() for v in vehicles]
    }


@app.post("/simulation_tick")
def simulation_tick():
    """Execute one simulation tick (move all vehicles)"""
    result = simulator.simulation_tick()
    
    return {
        **result,
        "traffic_multipliers": simulator.get_traffic_multipliers_json()
    }


@app.get("/simulation_state")
def get_simulation_state():
    """Get complete simulation state"""
    return simulator.get_simulation_state()


@app.get("/vehicles")
def get_all_vehicles():
    """Get all vehicles in the simulation"""
    return {
        "vehicles": simulator.get_vehicles_json(),
        "count": len(simulator.vehicle_manager.get_all_vehicles())
    }


@app.get("/vehicle/{vehicle_id}")
def get_vehicle(vehicle_id: str):
    """Get specific vehicle by ID"""
    vehicle = simulator.get_vehicle_by_id(vehicle_id)
    
    if vehicle:
        return vehicle.to_dict()
    else:
        raise HTTPException(status_code=404, detail="Vehicle not found")


@app.delete("/vehicle/{vehicle_id}")
def delete_vehicle(vehicle_id: str):
    """Remove a vehicle from the simulation"""
    success = simulator.remove_vehicle(vehicle_id)
    
    if success:
        return {"success": True, "message": f"Vehicle {vehicle_id} removed"}
    else:
        raise HTTPException(status_code=404, detail="Vehicle not found")


@app.get("/traffic_statistics")
def get_traffic_statistics():
    """Get comprehensive traffic statistics"""
    vehicle_stats = simulator.vehicle_manager.get_statistics()
    traffic_stats = simulator.traffic_analyzer.get_global_statistics()
    
    return {
        "vehicle_statistics": vehicle_stats,
        "traffic_statistics": traffic_stats
    }


@app.get("/congestion_report")
def get_congestion_report():
    """Get detailed congestion analysis"""
    return simulator.get_congestion_report()


@app.get("/edge_traffic")
def get_edge_traffic():
    """Get traffic data for all edges"""
    return {
        "edges": simulator.traffic_analyzer.get_edge_traffic_data()
    }


@app.post("/reset_simulation")
def reset_simulation():
    """Reset the entire simulation"""
    simulator.reset_simulation()
    
    return {
        "success": True,
        "message": "Simulation reset successfully"
    }


@app.post("/start_continuous_simulation")
def start_continuous_simulation(duration_steps: int = 100, spawn_rate: int = 2):
    """Start continuous simulation (runs in background)"""
    # Note: This would need threading/async for true background operation
    # For now, it runs synchronously
    simulator.run_continuous_simulation(duration_steps, spawn_rate)
    
    return {
        "success": True,
        "message": f"Simulation completed {duration_steps} steps"
    }


@app.post("/stop_simulation")
def stop_simulation():
    """Stop continuous simulation"""
    simulator.stop_simulation()
    
    return {
        "success": True,
        "message": "Simulation stopped"
    }


# New realistic traffic control endpoints

@app.post("/create_accident")
def create_accident(from_node: Optional[str] = None, to_node: Optional[str] = None):
    """Create an accident on a road"""
    accident = simulator.create_accident(from_node, to_node)
    
    if accident:
        return {
            "success": True,
            "accident": accident
        }
    return {"success": False, "error": "Failed to create accident"}


@app.post("/resolve_accident/{accident_id}")
def resolve_accident(accident_id: str):
    """Resolve an accident and restore traffic"""
    success = simulator.resolve_accident(accident_id)
    
    return {
        "success": success,
        "message": "Accident resolved" if success else "Accident not found"
    }


@app.get("/accidents")
def get_accidents():
    """Get all active accidents"""
    return {
        "accidents": list(simulator.accidents.values())
    }


@app.post("/block_road")
def block_road(from_node: str, to_node: str, reason: str = "construction"):
    """Block a road completely"""
    success = simulator.block_road(from_node, to_node, reason)
    
    return {
        "success": success,
        "message": f"Road blocked: {from_node} -> {to_node}" if success else "Failed to block road"
    }


@app.post("/unblock_road")
def unblock_road(from_node: str, to_node: str):
    """Unblock a previously blocked road"""
    success = simulator.unblock_road(from_node, to_node)
    
    return {
        "success": success,
        "message": "Road unblocked" if success else "Road not found or not blocked"
    }


@app.get("/blocked_roads")
def get_blocked_roads():
    """Get all currently blocked roads"""
    return {
        "blocked_roads": list(simulator.blocked_roads.values())
    }


@app.get("/simulation_info")
def get_simulation_info():
    """Get general simulation information"""
    return {
        "elapsed_time": simulator.get_elapsed_time(),
        "simulation_step": simulator.simulation_step,
        "total_spawned": simulator.total_spawned,
        "accidents_count": len(simulator.accidents),
        "blocked_roads_count": len(simulator.blocked_roads),
        "congestion_hotspots": len(simulator.congestion_points)
    }