# Backend Documentation

## 🎯 Overview

The backend is a **FastAPI-based Python application** that handles all simulation logic, pathfinding, vehicle management, and traffic analysis. It exposes a RESTful API for the frontend to interact with.

## 📂 File Structure & Responsibilities

### Core Files

#### 1. `api.py` (395 lines)
**Purpose**: FastAPI application with REST endpoints

**Key Components**:
- FastAPI app initialization with CORS middleware
- 25+ REST API endpoints for simulation control
- Request/response models using Pydantic
- Global state management (graph, simulator, traffic data)

**Main Endpoints**:
```python
# Basic endpoints
GET  /                          # Health check
GET  /nodes                     # Get all nodes
GET  /maps                      # Available maps
POST /switch_map                # Change map
GET  /map_data                  # Full map structure

# Pathfinding
GET  /path                      # Calculate A* path

# Multi-vehicle simulation
POST /spawn_vehicle             # Spawn single vehicle
POST /spawn_multiple_vehicles   # Spawn batch of vehicles
POST /simulation_tick           # Execute one simulation step
GET  /simulation_state          # Get complete state
GET  /vehicles                  # All vehicles
GET  /vehicle/{id}              # Specific vehicle
DELETE /vehicle/{id}            # Remove vehicle

# Traffic control
POST /create_accident           # Create accident on road
POST /resolve_accident/{id}     # Clear accident
POST /block_road                # Block road completely
POST /unblock_road              # Unblock road
GET  /accidents                 # All active accidents
GET  /blocked_roads             # All blocked roads

# Analytics
GET  /traffic_statistics        # Global traffic stats
GET  /congestion_report         # Detailed congestion analysis
GET  /edge_traffic              # Traffic data per edge
GET  /simulation_info           # Simulation metadata

# Control
POST /reset_simulation          # Reset everything
POST /start_continuous_simulation
POST /stop_simulation
```

**Data Flow**:
```
Request → CORS Middleware → Endpoint → Simulator → Response
```

---

#### 2. `multi_vehicle_simulator.py` (616 lines)
**Purpose**: Main simulation engine coordinating all components

**Class**: `MultiVehicleSimulator`

**Key Attributes**:
```python
self.graph                    # Road network (adjacency list)
self.heuristic_coords         # Node coordinates for A*
self.vehicle_manager          # VehicleManager instance
self.traffic_analyzer         # TrafficAnalyzer instance
self.traffic_multipliers      # Dict[Tuple[str,str], float] - edge congestion
self.simulation_step          # Current tick number
self.blocked_roads            # Dict of blocked edges
self.accidents                # Dict of active accidents
self.congestion_points        # List of natural hotspots
self.edge_lengths             # Cache of pixel distances
```

**Key Methods**:

1. **Initialization**
```python
def __init__(self, graph, heuristic_coords):
    # Initialize all components
    # Calculate edge lengths in pixels
    # Identify congestion hotspots (high-degree nodes)
    # Initialize traffic multipliers
```

2. **Vehicle Spawning**
```python
def spawn_vehicle(vehicle_type, start_node, goal_node) -> Vehicle:
    # Create vehicle entity
    # Calculate initial A* path
    # Add to vehicle manager
    # Return vehicle or None if no path
    
def spawn_random_vehicles(count, distribution) -> List[Vehicle]:
    # Spawn multiple vehicles with type distribution
    # Default: 60% cars, 25% bikes, 15% pedestrians
```

3. **Simulation Tick** (Core Update Loop)
```python
def simulation_tick() -> dict:
    # 1. Calculate delta time (capped at 200ms)
    # 2. Apply time-based congestion buildup
    # 3. Randomly create accidents (0.00005% chance)
    # 4. Auto-resolve old accidents
    # 5. Update traffic multipliers based on vehicle density
    # 6. First pass: Check vehicles ahead & adjust speeds
    # 7. Second pass: Update physics-based positions
    # 8. Handle node transitions
    # 9. Update edge occupancy
    # Return tick statistics
```

**Physics-Based Movement**:
```python
# For each vehicle:
- Check if vehicle ahead → adjust target speed
- Update current speed (acceleration/deceleration)
- Move along edge: position += (speed * delta_time) / edge_length
- If position >= 1.0 → reached next node
```

4. **Rerouting Logic**
```python
def _should_reroute(vehicle) -> bool:
    # Reroute if:
    # - Upcoming edge is blocked
    # - Congestion probability > 0.5 on upcoming edges
    # - Check 3 edges ahead
    
def _reroute_vehicle(vehicle):
    # Calculate new A* path from current position
    # Update vehicle path
    # Reset speed to normal
    # Increment reroute counter
```

5. **Traffic Incidents**
```python
def create_accident(from_node, to_node) -> dict:
    # Create accident entity
    # Apply traffic multiplier penalty (2x-10x based on severity)
    # Schedule auto-resolution
    
def block_road(from_node, to_node, reason) -> bool:
    # Mark road as blocked
    # Set traffic multiplier to 100.0 (effectively infinite)
```

**Congestion Buildup Algorithm**:
```python
# Gradual realistic traffic pattern:
congestion_factor = min(elapsed_time / 60.0, 1.0)

# First 30 seconds: Normal traffic
# 30-60 seconds: Slowdowns on hotspots start
# 60+ seconds: Full congestion can develop

# Apply to hotspot edges:
time_penalty = 1.0 + (congestion_factor * random(0.5, 2.0))
traffic_multiplier *= time_penalty
```

---

#### 3. `vehicle.py` (400 lines)
**Purpose**: Vehicle entity and vehicle management system

**Enum Classes**:
```python
class VehicleType(Enum):
    CAR = "car"
    BIKE = "bicycle"
    PEDESTRIAN = "pedestrian"

class VehicleStatus(Enum):
    WAITING = "waiting"
    MOVING = "moving"
    STUCK = "stuck"
    ARRIVED = "arrived"
    REROUTING = "rerouting"
```

**Class**: `Vehicle`

**Speed Characteristics**:
```python
SPEED_MULTIPLIERS = {
    VehicleType.CAR: 60.0,        # pixels/second
    VehicleType.BIKE: 40.0,
    VehicleType.PEDESTRIAN: 20.0
}

CAPACITY_USAGE = {
    VehicleType.CAR: 1.0,         # Road space occupied
    VehicleType.BIKE: 0.5,
    VehicleType.PEDESTRIAN: 0.2
}
```

**Key Attributes**:
```python
self.id                    # Unique ID (e.g., "car_42")
self.type                  # VehicleType enum
self.start_node            # Origin
self.goal_node             # Destination
self.current_node          # Current position
self.next_node             # Next node in path
self.path                  # List[str] - full path
self.path_index            # Current position in path
self.status                # VehicleStatus enum
self.position_on_edge      # 0.0-1.0 position along current edge
self.current_speed         # Current velocity (pixels/sec)
self.target_speed          # Desired velocity
self.acceleration          # Speed change rate (0.2)
self.wait_time             # Time spent stuck
self.reroute_count         # Number of reroutes
```

**Key Methods**:

1. **Physics Update**
```python
def update_position(delta_time, edge_length) -> bool:
    # Accelerate/decelerate toward target speed
    speed_diff = target_speed - current_speed
    if abs(speed_diff) < acceleration * delta_time:
        current_speed = target_speed
    else:
        current_speed += sign(speed_diff) * acceleration * delta_time
    
    # Update position
    distance_moved = current_speed * delta_time
    position_on_edge += distance_moved / edge_length
    
    # Return True if reached end of edge
    return position_on_edge >= 1.0
```

2. **Following Distance**
```python
def slow_down_for_vehicle_ahead(distance_to_vehicle, min_distance=30.0):
    if distance < min_distance:
        # STOP - too close
        target_speed = 0.0
        status = STUCK
    elif distance < min_distance * 2:
        # SLOW DOWN - proportional to distance
        target_speed = speed_multiplier * (distance / (min_distance * 2))
        status = STUCK
    else:
        # CLEAR - resume normal speed
        target_speed = speed_multiplier
        status = MOVING
```

**Class**: `VehicleManager`

**Purpose**: Efficient vehicle tracking and queries

**Data Structures**:
```python
self.vehicles: Dict[str, Vehicle]              # All vehicles by ID
self.active_vehicles: Set[str]                 # Active vehicle IDs
self.edge_occupancy: Dict[Tuple[str,str], List[str]]  # Vehicles per edge
```

**Key Methods**:
```python
def add_vehicle(vehicle) -> str
def remove_vehicle(vehicle_id) -> bool
def get_vehicle(vehicle_id) -> Vehicle
def get_active_vehicles() -> List[Vehicle]
def get_vehicles_on_edge(from_node, to_node) -> List[Vehicle]
def update_edge_occupancy()  # Rebuild edge→vehicle mapping
def get_edge_capacity_usage(from_node, to_node) -> float
def get_statistics() -> dict  # Comprehensive stats
```

**Statistics Calculated**:
- Total/active/arrived vehicle counts
- Average travel time (for arrived vehicles)
- Average wait time (time stuck in traffic)
- Total reroutes across all vehicles
- Vehicle counts by type

---

#### 4. `pathfinder.py` (60 lines)
**Purpose**: A* pathfinding algorithm implementation

**Function**: `a_star(graph, heuristic_coords, traffic_multipliers, start, goal, mode, blocked_roads)`

**Algorithm Details**:

1. **Data Structures**:
```python
open_set = []              # Priority queue (heap) of (f_score, node)
came_from = {}             # Parent tracking for path reconstruction
g_score = {node: ∞}        # Actual cost from start
f_score = {node: ∞}        # Estimated total cost (g + h)
```

2. **Heuristic Function**:
```python
def euclidean_distance(a, b):
    return sqrt((a[0]-b[0])² + (a[1]-b[1])²)
```

3. **Main Loop**:
```python
while open_set not empty:
    current = pop_min_f_score(open_set)
    
    if current == goal:
        return reconstruct_path(came_from, goal)
    
    for neighbor in graph[current]:
        # Skip if mode not allowed on this edge
        if mode not in neighbor["allowed"]:
            continue
        
        # Skip if road is blocked
        if (current, neighbor) in blocked_roads:
            continue
        
        # Calculate tentative g_score
        base_cost = neighbor["distance"]
        multiplier = traffic_multipliers[(current, neighbor)]
        tentative_g = g_score[current] + base_cost * multiplier
        
        if tentative_g < g_score[neighbor]:
            # This path is better
            came_from[neighbor] = current
            g_score[neighbor] = tentative_g
            f_score[neighbor] = tentative_g + heuristic(neighbor, goal)
            push(open_set, (f_score[neighbor], neighbor))

return None, infinity  # No path found
```

4. **Cost Calculation**:
```
Cost = Distance × Traffic_Multiplier

Examples:
- Free road: 10 × 0.8 = 8
- Light traffic: 10 × 1.2 = 12
- Heavy traffic: 10 × 3.5 = 35
- Blocked road: skipped completely
```

5. **Mode Restrictions**:
```python
# Edge example:
{
    "from": "A",
    "to": "B",
    "distance": 10,
    "allowed_modes": ["car", "bicycle"],  # Pedestrians can't use
    "one_way": false
}
```

**Complexity**: O(E log V)
- E = number of edges explored
- V = number of vertices
- Log V from heap operations

---

#### 5. `traffic_analyzer.py` (320 lines)
**Purpose**: Congestion analysis and traffic statistics

**Class**: `TrafficAnalyzer`

**Constants**:
```python
BASE_EDGE_CAPACITY = 3.0      # Vehicles per unit distance

# Congestion thresholds (density ratios):
LOW_CONGESTION = 0.2          # < 20% capacity
MEDIUM_CONGESTION = 0.4       # 20-40%
HIGH_CONGESTION = 0.7         # 40-70%
CRITICAL_CONGESTION = 1.0     # > 70%

# Traffic multiplier ranges by level:
TRAFFIC_RANGES = {
    "free_flow": (0.5, 0.8),
    "light": (1.0, 1.5),
    "moderate": (1.5, 2.5),
    "heavy": (2.5, 4.0),
    "congested": (4.0, 6.0)
}
```

**Key Methods**:

1. **Edge Density Calculation**
```python
def get_edge_density(from_node, to_node) -> float:
    capacity = edge_capacities[(from_node, to_node)]
    # Sum of all vehicle capacity usage on edge
    usage = sum(v.capacity_usage for v in vehicles_on_edge)
    density = usage / capacity  # 0.0 to 1.0+
    return density
```

2. **Congestion Level**
```python
def get_congestion_level(from_node, to_node) -> str:
    density = get_edge_density(from_node, to_node)
    
    if density < 0.2: return "free_flow"
    if density < 0.4: return "light"
    if density < 0.7: return "moderate"
    if density < 1.0: return "heavy"
    return "congested"
```

3. **Traffic Multiplier Calculation**
```python
def calculate_traffic_multiplier(from_node, to_node) -> float:
    level = get_congestion_level(from_node, to_node)
    min_mult, max_mult = TRAFFIC_RANGES[level]
    
    # Random value in range for realism
    multiplier = random.uniform(min_mult, max_mult)
    
    # Store in history (last 100 samples)
    congestion_history[(from_node, to_node)].append(multiplier)
    
    return multiplier
```

4. **Congestion Probability**
```python
def get_congestion_probability(from_node, to_node) -> float:
    density = get_edge_density(from_node, to_node)
    
    # Base probability from current density
    base_prob = min(density / CRITICAL_CONGESTION, 1.0)
    
    # Adjust using historical data
    history = congestion_history[(from_node, to_node)]
    if history:
        avg_multiplier = sum(history) / len(history)
        historical_factor = (avg_multiplier - 1.0) / 4.0
        base_prob = min(base_prob + historical_factor, 1.0)
    
    return base_prob  # 0.0 to 1.0
```

5. **Bottleneck Detection**
```python
def find_bottlenecks(threshold=0.7) -> List[Tuple]:
    bottlenecks = []
    
    for (from_node, to_node), capacity in edge_capacities.items():
        density = get_edge_density(from_node, to_node)
        if density >= threshold:
            bottlenecks.append((from_node, to_node, density))
    
    # Sort by density descending
    bottlenecks.sort(key=lambda x: x[2], reverse=True)
    return bottlenecks
```

6. **Global Statistics**
```python
def get_global_statistics() -> dict:
    # Calculate for all edges:
    - Average density
    - Average congestion probability
    - Congestion level distribution (percentages)
    - Bottleneck count
    - Top 5 bottlenecks
    
    return {
        "average_density": 0.35,
        "average_congestion_probability": 0.42,
        "total_edges": 48,
        "congestion_distribution": {
            "free_flow": 15%,
            "light": 30%,
            "moderate": 35%,
            "heavy": 15%,
            "congested": 5%
        },
        "bottleneck_count": 8,
        "top_bottlenecks": [...]
    }
```

---

#### 6. `json_to_graph.py` (40 lines)
**Purpose**: Load map data from JSON into graph structure

**Function**: `load_graph(file_path)`

**Input Format** (JSON):
```json
{
  "nodes": [
    {"id": "A", "x": 1, "y": 2},
    {"id": "B", "x": 3, "y": 4}
  ],
  "edges": [
    {
      "from": "A",
      "to": "B",
      "distance": 2.5,
      "allowed_modes": ["car", "bicycle", "pedestrian"],
      "one_way": false
    }
  ]
}
```

**Output Structures**:
```python
graph = {
    "A": [
        {"to": "B", "distance": 2.5, "allowed": ["car","bicycle","pedestrian"], "one_way": False}
    ],
    "B": [
        {"to": "A", "distance": 2.5, "allowed": ["car","bicycle","pedestrian"], "one_way": False}
    ]
}

heuristic_coords = {
    "A": (1, 2),
    "B": (3, 4)
}
```

**One-Way Handling**:
```python
if not edge["one_way"]:
    # Add reverse edge automatically
    graph[to_node].append(reverse_edge)
```

---

#### 7. `config.py` (10 lines)
**Purpose**: Global configuration constants

```python
SIM_MODES = ["car", "bicycle", "pedestrian"]

DEFAULT_TRAFFIC_MULTIPLIER = 1.0
MIN_TRAFFIC_MULTIPLIER = 0.5
MAX_TRAFFIC_MULTIPLIER = 3.0

REROUTE_THRESHOLD = 0.2  # 20% cost increase triggers reroute
```

---

#### 8. `traffic_updater.py` (20 lines)
**Purpose**: Legacy random traffic generation (deprecated in favor of TrafficAnalyzer)

```python
def initialize_traffic_multipliers(graph):
    # Set all edges to 1.0
    
def apply_random_traffic(traffic_multipliers, graph):
    # Pick random edge
    # Set random multiplier between 0.5-3.0
```

---

#### 9. `simulator.py` (60 lines)
**Purpose**: Single-vehicle CLI simulation (legacy)

**Function**: `run_simulation(graph, heuristic_coords, traffic_multipliers, start, goal, mode, max_steps=20)`

**Flow**:
```
1. Calculate initial A* path
2. For each step (max 20):
   - Move to next node
   - Apply random traffic changes
   - Recalculate path
   - Compare with previous path
   - Decide if rerouting needed
   - Print status
```

---

#### 10. `main.py` (40 lines)
**Purpose**: CLI entry point for single-vehicle simulation

**Flow**:
```python
def main():
    # Load graph
    # Display available nodes
    # Get user input: start, goal, mode
    # Run simulation
    # Display results
```

---

## 🔄 Data Flow Diagrams

### Vehicle Spawn Flow
```
API Request
    ↓
api.spawn_vehicle()
    ↓
simulator.spawn_vehicle()
    ↓
Create Vehicle object
    ↓
pathfinder.a_star() → Calculate path
    ↓
vehicle.set_path()
    ↓
vehicle_manager.add_vehicle()
    ↓
Return vehicle data
```

### Simulation Tick Flow
```
API Request: /simulation_tick
    ↓
simulator.simulation_tick()
    ↓
┌─────────────────────────────────────┐
│ 1. Calculate delta time             │
│ 2. Check/create/resolve accidents   │
│ 3. Update traffic multipliers       │
│    (TrafficAnalyzer)                │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ For each active vehicle:            │
│   - Check vehicles ahead            │
│   - Adjust target speed             │
│   - Update position (physics)       │
│   - Check if reached node           │
│   - Trigger reroute if needed       │
└─────────────────────────────────────┘
    ↓
vehicle_manager.update_edge_occupancy()
    ↓
Return tick statistics
```

### Reroute Flow
```
Vehicle moving
    ↓
Check upcoming edges (3 ahead)
    ↓
Congestion > 50% OR Road blocked?
    ↓ YES
_should_reroute() returns True
    ↓
_reroute_vehicle()
    ↓
pathfinder.a_star(current_node, goal)
    ↓
vehicle.set_path(new_path)
    ↓
vehicle.increment_reroute()
    ↓
Reset vehicle speed
```

---

## 🚀 Performance Optimizations

### 1. Edge Length Caching
```python
# Calculated once on initialization
self.edge_lengths[(from, to)] = distance_in_pixels
```

### 2. Hash-based Lookups
```python
# O(1) vehicle access
vehicle = self.vehicles[vehicle_id]

# O(1) traffic multiplier
multiplier = self.traffic_multipliers[(from, to)]
```

### 3. Set-based Active Tracking
```python
# O(1) active check
if vehicle_id in self.active_vehicles:
    # Process
```

### 4. Batched Updates
```python
# Update all vehicles in one loop
for vehicle in active_vehicles:
    vehicle.update_position(delta_time, edge_length)
```

### 5. Congestion History Limits
```python
# Keep only last 100 samples
if len(history) > 100:
    history.pop(0)
```

---

## 🧪 Testing the Backend

### Manual Testing via API

**1. Start Server**
```bash
cd Backend
uvicorn api:app --reload
```

**2. Test Endpoints**
```bash
# Health check
curl http://localhost:8000/

# Get nodes
curl http://localhost:8000/nodes

# Spawn vehicle
curl -X POST http://localhost:8000/spawn_vehicle \
  -H "Content-Type: application/json" \
  -d '{"vehicle_type": "car"}'

# Simulation tick
curl -X POST http://localhost:8000/simulation_tick

# Get state
curl http://localhost:8000/simulation_state
```

**3. Test CLI Simulator**
```bash
python main.py
# Enter: start=Downtown_Plaza, goal=Airport, mode=car
```

---

## 📊 Key Metrics

- **Lines of Code**: ~1,900
- **API Endpoints**: 25+
- **Classes**: 5 (Vehicle, VehicleManager, MultiVehicleSimulator, TrafficAnalyzer, Enums)
- **Algorithms**: A*, Physics simulation, Congestion modeling
- **Data Structures**: Graph (adjacency list), Priority queue, Hash tables, Sets
- **Max Vehicles Tested**: 100+
- **Tick Processing Time**: 5-20ms for 50 vehicles

---

**Last Updated**: December 2, 2025
