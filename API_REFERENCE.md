# API Reference Guide

## 🌐 Base Configuration

**API Base URL**: `http://localhost:8000`

**Content-Type**: `application/json` (for POST requests with body)

**CORS**: Enabled for all origins (development mode)

---

## 📑 Endpoint Categories

1. [Basic Endpoints](#basic-endpoints)
2. [Pathfinding Endpoints](#pathfinding-endpoints)
3. [Vehicle Management](#vehicle-management)
4. [Simulation Control](#simulation-control)
5. [Traffic Control](#traffic-control)
6. [Analytics & Statistics](#analytics--statistics)

---

## Basic Endpoints

### `GET /`
Health check endpoint.

**Response**:
```json
{
  "message": "Traffic Simulation API running"
}
```

---

### `GET /nodes`
Get all available nodes in the current map.

**Response**:
```json
["Downtown_Plaza", "City_Hall", "Central_Station", "University", "Hospital", ...]
```

---

### `GET /maps`
Get available maps and current selection.

**Response**:
```json
{
  "maps": ["simple", "city", "nust"],
  "current": "city"
}
```

---

### `POST /switch_map?map_name={name}`
Switch to a different map.

**Parameters**:
- `map_name` (query): Map name ("simple", "city", or "nust")

**Response**:
```json
{
  "message": "Switched to city map",
  "nodes": ["Downtown_Plaza", "City_Hall", ...]
}
```

**Side Effects**:
- Resets simulation
- Clears all vehicles
- Loads new graph structure

---

### `GET /map_data`
Get complete map structure with nodes and edges.

**Response**:
```json
{
  "nodes": [
    {
      "id": "Downtown_Plaza",
      "x": 3,
      "y": 5
    },
    {
      "id": "City_Hall",
      "x": 5,
      "y": 5
    }
  ],
  "edges": [
    {
      "from": "Downtown_Plaza",
      "to": "City_Hall",
      "distance": 2,
      "allowed_modes": ["car", "bicycle", "pedestrian"],
      "one_way": false
    }
  ]
}
```

---

## Pathfinding Endpoints

### `GET /path?start={start}&goal={goal}&mode={mode}`
Calculate optimal path using A* algorithm.

**Parameters**:
- `start` (query, required): Starting node ID
- `goal` (query, required): Goal node ID
- `mode` (query, required): Vehicle mode ("car", "bicycle", or "pedestrian")

**Response** (Success):
```json
{
  "path": ["Downtown_Plaza", "City_Hall", "Hospital", "Airport"],
  "cost": 12.5
}
```

**Response** (No Path):
```json
{
  "path": null,
  "cost": null
}
```

**Notes**:
- Cost considers current traffic multipliers
- Respects mode restrictions on edges
- Avoids blocked roads
- Returns `null` if no valid path exists

---

## Vehicle Management

### `POST /spawn_vehicle`
Spawn a single vehicle in the simulation.

**Request Body**:
```json
{
  "vehicle_type": "car",
  "start_node": "Downtown_Plaza",  // Optional, random if omitted
  "goal_node": "Airport"            // Optional, random if omitted
}
```

**Response** (Success):
```json
{
  "success": true,
  "vehicle": {
    "id": "car_1",
    "type": "car",
    "start_node": "Downtown_Plaza",
    "goal_node": "Airport",
    "current_node": "Downtown_Plaza",
    "next_node": "City_Hall",
    "path": ["Downtown_Plaza", "City_Hall", "Hospital", "Airport"],
    "path_index": 0,
    "status": "moving",
    "speed_multiplier": 60.0,
    "capacity_usage": 1.0,
    "total_distance": 0.0,
    "wait_time": 0.0,
    "reroute_count": 0,
    "travel_time": null,
    "position_on_edge": 0.0,
    "current_speed": 0.0
  }
}
```

**Response** (Failure):
```json
{
  "detail": "Failed to spawn vehicle. No valid path found."
}
```
**Status Code**: 400

**Vehicle Types**:
- `"car"`: Speed 60 px/s, capacity 1.0
- `"bicycle"`: Speed 40 px/s, capacity 0.5
- `"pedestrian"`: Speed 20 px/s, capacity 0.2

---

### `POST /spawn_multiple_vehicles`
Spawn multiple vehicles with distribution.

**Request Body**:
```json
{
  "count": 25,
  "distribution": {
    "car": 0.6,       // 60%
    "bicycle": 0.25,  // 25%
    "pedestrian": 0.15 // 15%
  }
}
```

**Response**:
```json
{
  "success": true,
  "spawned_count": 23,  // May be less if some fail to find paths
  "vehicles": [
    { /* Vehicle object */ },
    { /* Vehicle object */ },
    ...
  ]
}
```

**Notes**:
- Distribution is optional, defaults to 60/25/15
- Distribution values should sum to 1.0
- Each vehicle gets random start/goal

---

### `GET /vehicles`
Get all vehicles in the simulation.

**Response**:
```json
{
  "vehicles": [
    { /* Vehicle object */ },
    { /* Vehicle object */ }
  ],
  "count": 42
}
```

---

### `GET /vehicle/{vehicle_id}`
Get specific vehicle by ID.

**Path Parameters**:
- `vehicle_id`: Vehicle ID (e.g., "car_1")

**Response** (Success):
```json
{
  "id": "car_1",
  "type": "car",
  ...
}
```

**Response** (Not Found):
```json
{
  "detail": "Vehicle not found"
}
```
**Status Code**: 404

---

### `DELETE /vehicle/{vehicle_id}`
Remove a vehicle from the simulation.

**Path Parameters**:
- `vehicle_id`: Vehicle ID to remove

**Response** (Success):
```json
{
  "success": true,
  "message": "Vehicle car_1 removed"
}
```

**Response** (Not Found):
```json
{
  "detail": "Vehicle not found"
}
```
**Status Code**: 404

---

## Simulation Control

### `POST /simulation_tick`
Execute one simulation step (physics update).

**Response**:
```json
{
  "step": 142,
  "active_vehicles": 38,
  "moved": 35,
  "arrived": 3,
  "total_vehicles": 45,
  "delta_time": 0.1,
  "elapsed_time": 14.2,
  "accidents": [
    {
      "id": "accident_1",
      "from_node": "City_Hall",
      "to_node": "Stadium",
      "severity": "moderate",
      "created_at": 1701475200.0,
      "duration": 60
    }
  ],
  "blocked_roads": [
    {
      "from_node": "Beach",
      "to_node": "Harbor",
      "reason": "construction",
      "blocked_at": 1701475150.0
    }
  ],
  "traffic_multipliers": {
    "Downtown_Plaza,City_Hall": 1.2,
    "City_Hall,Hospital": 2.5,
    ...
  }
}
```

**Side Effects**:
- Updates all vehicle positions
- Recalculates traffic multipliers
- Triggers rerouting if needed
- May auto-spawn vehicles (if configured)
- Auto-resolves expired accidents

**Timing**:
- Delta time capped at 200ms
- Typical processing: 5-20ms for 50 vehicles

---

### `GET /simulation_state`
Get complete current simulation state.

**Response**:
```json
{
  "step": 142,
  "is_running": true,
  "vehicles": [ /* Array of vehicle objects */ ],
  "vehicle_statistics": {
    "total_vehicles": 45,
    "active_vehicles": 38,
    "arrived_vehicles": 7,
    "average_travel_time": 25.3,
    "average_wait_time": 3.2,
    "total_reroutes": 18,
    "vehicles_by_type": {
      "car": 27,
      "bicycle": 12,
      "pedestrian": 6
    }
  },
  "traffic_statistics": {
    "average_density": 0.35,
    "average_congestion_probability": 0.42,
    "total_edges": 48,
    "congestion_distribution": {
      "free_flow": 15.2,
      "light": 30.4,
      "moderate": 35.1,
      "heavy": 14.3,
      "congested": 5.0
    },
    "bottleneck_count": 8,
    "top_bottlenecks": [
      {
        "from": "City_Hall",
        "to": "Stadium",
        "density": 0.85
      }
    ]
  },
  "edge_traffic": [ /* Array of EdgeTrafficData */ ],
  "traffic_multipliers": { /* Edge traffic multipliers */ },
  "total_spawned": 52
}
```

**Use Case**: Get full simulation snapshot for frontend rendering

---

### `POST /reset_simulation`
Reset simulation to initial state.

**Response**:
```json
{
  "success": true,
  "message": "Simulation reset successfully"
}
```

**Side Effects**:
- Removes all vehicles
- Resets traffic multipliers to 1.0
- Clears all accidents
- Clears all road blockages
- Resets step counter to 0
- Resets vehicle ID counter

---

### `POST /start_continuous_simulation?duration_steps={steps}&spawn_rate={rate}`
Run simulation for specified duration (synchronous).

**Parameters**:
- `duration_steps` (query, default: 100): Number of ticks to run
- `spawn_rate` (query, default: 2): Vehicles to spawn every 3 ticks

**Response**:
```json
{
  "success": true,
  "message": "Simulation completed 100 steps"
}
```

**Notes**:
- Blocks until completion
- Not recommended for web use (use client-side loop instead)
- Cleans up arrived vehicles every 10 steps

---

### `POST /stop_simulation`
Stop continuous simulation.

**Response**:
```json
{
  "success": true,
  "message": "Simulation stopped"
}
```

---

## Traffic Control

### `POST /create_accident?from_node={from}&to_node={to}`
Create an accident on a road.

**Parameters** (both optional):
- `from_node` (query): Start node of road
- `to_node` (query): End node of road

**Response**:
```json
{
  "success": true,
  "accident": {
    "id": "accident_3",
    "from_node": "City_Hall",
    "to_node": "Stadium",
    "severity": "moderate",
    "created_at": 1701475200.0,
    "duration": 75
  }
}
```

**Severity Levels**:
- `"minor"`: 2x traffic multiplier, 30-60s duration
- `"moderate"`: 4x traffic multiplier, 60-90s duration
- `"severe"`: 10x traffic multiplier, 90-120s duration

**Notes**:
- If nodes not specified, random edge is selected
- Accidents auto-resolve after duration
- Triggers vehicle rerouting

---

### `POST /resolve_accident/{accident_id}`
Manually resolve an accident.

**Path Parameters**:
- `accident_id`: Accident ID to resolve

**Response**:
```json
{
  "success": true,
  "message": "Accident resolved"
}
```

**Side Effects**:
- Restores normal traffic multiplier
- Removes accident from active list

---

### `GET /accidents`
Get all active accidents.

**Response**:
```json
{
  "accidents": [
    {
      "id": "accident_1",
      "from_node": "City_Hall",
      "to_node": "Stadium",
      "severity": "moderate",
      "created_at": 1701475200.0,
      "duration": 60
    }
  ]
}
```

---

### `POST /block_road?from_node={from}&to_node={to}&reason={reason}`
Completely block a road.

**Parameters**:
- `from_node` (query, required): Start node
- `to_node` (query, required): End node
- `reason` (query, default: "construction"): Blockage reason

**Response**:
```json
{
  "success": true,
  "message": "Road blocked: City_Hall -> Stadium"
}
```

**Effect**:
- Sets traffic multiplier to 100.0 (effectively infinite)
- A* algorithm will avoid this edge
- Vehicles reroute around blockage

---

### `POST /unblock_road?from_node={from}&to_node={to}`
Unblock a previously blocked road.

**Parameters**:
- `from_node` (query, required): Start node
- `to_node` (query, required): End node

**Response**:
```json
{
  "success": true,
  "message": "Road unblocked"
}
```

**Effect**:
- Restores traffic multiplier to 1.0
- Road becomes available for routing

---

### `GET /blocked_roads`
Get all currently blocked roads.

**Response**:
```json
{
  "blocked_roads": [
    {
      "from_node": "Beach",
      "to_node": "Harbor",
      "reason": "construction",
      "blocked_at": 1701475150.0
    }
  ]
}
```

---

## Analytics & Statistics

### `GET /traffic_statistics`
Get comprehensive traffic statistics.

**Response**:
```json
{
  "vehicle_statistics": {
    "total_vehicles": 45,
    "active_vehicles": 38,
    "arrived_vehicles": 7,
    "average_travel_time": 25.3,
    "average_wait_time": 3.2,
    "total_reroutes": 18,
    "vehicles_by_type": {
      "car": 27,
      "bicycle": 12,
      "pedestrian": 6
    }
  },
  "traffic_statistics": {
    "average_density": 0.35,
    "average_congestion_probability": 0.42,
    "total_edges": 48,
    "congestion_distribution": {
      "free_flow": 15.2,
      "light": 30.4,
      "moderate": 35.1,
      "heavy": 14.3,
      "congested": 5.0
    },
    "bottleneck_count": 8,
    "top_bottlenecks": [
      {
        "from": "City_Hall",
        "to": "Stadium",
        "density": 0.85
      }
    ]
  }
}
```

---

### `GET /congestion_report`
Get detailed congestion analysis.

**Response**:
```json
{
  "bottlenecks": [
    {
      "from": "City_Hall",
      "to": "Stadium",
      "density": 0.85,
      "probability": 0.92
    },
    {
      "from": "Hospital",
      "to": "Airport",
      "density": 0.72,
      "probability": 0.78
    }
  ],
  "congested_intersections": [
    {
      "node": "City_Hall",
      "congestion": 0.68
    },
    {
      "node": "Central_Station",
      "congestion": 0.55
    }
  ],
  "global_stats": {
    "average_density": 0.35,
    "average_congestion_probability": 0.42,
    ...
  }
}
```

**Use Case**: Identify problem areas for traffic management

---

### `GET /edge_traffic`
Get traffic data for all edges.

**Response**:
```json
{
  "edges": [
    {
      "from": "Downtown_Plaza",
      "to": "City_Hall",
      "density": 0.45,
      "congestion_level": "moderate",
      "congestion_probability": 0.52,
      "vehicle_count": 3,
      "capacity": 6.5
    },
    {
      "from": "City_Hall",
      "to": "Hospital",
      "density": 0.15,
      "congestion_level": "free_flow",
      "congestion_probability": 0.18,
      "vehicle_count": 1,
      "capacity": 6.0
    }
  ]
}
```

**Congestion Levels**:
- `"free_flow"`: < 20% capacity
- `"light"`: 20-40% capacity
- `"moderate"`: 40-70% capacity
- `"heavy"`: 70-100% capacity
- `"congested"`: > 100% capacity

---

### `GET /simulation_info`
Get general simulation metadata.

**Response**:
```json
{
  "elapsed_time": 142.5,
  "simulation_step": 1425,
  "total_spawned": 68,
  "accidents_count": 2,
  "blocked_roads_count": 1,
  "congestion_hotspots": 12
}
```

---

## 🔧 Error Handling

### Standard Error Response:
```json
{
  "detail": "Error message description"
}
```

### HTTP Status Codes:
- `200 OK`: Successful request
- `400 Bad Request`: Invalid parameters or request failed
- `404 Not Found`: Resource not found (vehicle, accident, etc.)
- `500 Internal Server Error`: Server-side error

---

## 📊 Usage Examples

### Example 1: Complete Simulation Flow

```bash
# 1. Health check
curl http://localhost:8000/

# 2. Get available nodes
curl http://localhost:8000/nodes

# 3. Spawn 10 vehicles
curl -X POST http://localhost:8000/spawn_multiple_vehicles \
  -H "Content-Type: application/json" \
  -d '{"count": 10, "distribution": {"car": 0.7, "bicycle": 0.2, "pedestrian": 0.1}}'

# 4. Run 5 simulation ticks
for i in {1..5}; do
  curl -X POST http://localhost:8000/simulation_tick
  sleep 0.1
done

# 5. Get statistics
curl http://localhost:8000/traffic_statistics

# 6. Create an accident
curl -X POST "http://localhost:8000/create_accident?from_node=City_Hall&to_node=Stadium"

# 7. Run more ticks
curl -X POST http://localhost:8000/simulation_tick

# 8. Get congestion report
curl http://localhost:8000/congestion_report

# 9. Reset simulation
curl -X POST http://localhost:8000/reset_simulation
```

### Example 2: JavaScript/TypeScript Usage

```typescript
// Spawn vehicle
const response = await fetch('http://localhost:8000/spawn_vehicle', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    vehicle_type: 'car',
    start_node: 'Downtown_Plaza',
    goal_node: 'Airport'
  })
});
const data = await response.json();
console.log('Spawned:', data.vehicle.id);

// Simulation loop
const runSimulation = async () => {
  for (let i = 0; i < 100; i++) {
    await fetch('http://localhost:8000/simulation_tick', { method: 'POST' });
    const state = await fetch('http://localhost:8000/simulation_state');
    const stateData = await state.json();
    console.log(`Step ${stateData.step}: ${stateData.vehicle_statistics.active_vehicles} active`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};
```

---

## 🔐 Security Notes

**Development Mode**:
- CORS allows all origins
- No authentication required
- Suitable for local development only

**Production Considerations**:
- Add API authentication
- Restrict CORS to specific origins
- Add rate limiting
- Validate all inputs
- Add request logging

---

## ⚡ Performance Tips

1. **Batch Operations**: Use `spawn_multiple_vehicles` instead of multiple `spawn_vehicle` calls
2. **State Polling**: Don't call `simulation_state` more frequently than `simulation_tick`
3. **Selective Updates**: Use specific endpoints like `get_edge_traffic` when full state not needed
4. **Client-Side Caching**: Cache map data, only refresh when switching maps

---

**Last Updated**: December 2, 2025
