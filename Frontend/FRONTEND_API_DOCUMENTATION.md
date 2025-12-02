# Traffic Simulation API - Frontend Documentation

## Overview
This is a FastAPI-based traffic simulation backend that implements A* pathfinding with dynamic traffic conditions. The system supports multiple transportation modes (car, bicycle, pedestrian) and simulates real-time traffic changes.

---

## Base URL
```
http://localhost:8000
```

---

## API Endpoints

### 1. **GET /** - Health Check
**Description:** Check if the API is running

**Request:**
```
GET /
```

**Response:**
```json
{
  "message": "Traffic Simulation API running"
}
```

---

### 2. **GET /path** - Get Shortest Path
**Description:** Calculate the shortest path between two nodes using A* algorithm with current traffic conditions

**Request:**
```
GET /path?start={start_node}&goal={goal_node}&mode={mode}
```

**Query Parameters:**
| Parameter | Type   | Required | Description                           | Valid Values          |
|-----------|--------|----------|---------------------------------------|-----------------------|
| start     | string | Yes      | Starting node ID                      | Any valid node ID     |
| goal      | string | Yes      | Destination node ID                   | Any valid node ID     |
| mode      | string | Yes      | Transportation mode                   | "car", "bicycle", "pedestrian" |

**Success Response:**
```json
{
  "path": ["A", "B", "C", "F"],
  "cost": 6.0
}
```

**Error Response:**
```json
{
  "error": "Invalid mode"
}
```

**Notes:**
- Path is an array of node IDs representing the route
- Cost is the total weighted distance considering traffic multipliers
- Returns `null` path and `Infinity` cost if no path exists

---

### 3. **GET /nodes** - Get All Nodes
**Description:** Retrieve a list of all available nodes in the graph

**Request:**
```
GET /nodes
```

**Response:**
```json
["A", "B", "C", "D", "E", "F", "G", "H", "I"]
```

**Notes:**
- Use this endpoint to populate dropdown menus or validate user input
- These are the only valid node IDs for start/goal parameters

---

### 4. **POST /update_traffic** - Update Traffic Conditions
**Description:** Apply random traffic changes to edges and receive updated traffic multipliers

**Request:**
```
POST /update_traffic
```

**Response:**
```json
{
  "traffic": {
    "A,B": 1.2,
    "B,A": 1.2,
    "B,C": 2.5,
    "C,B": 2.5,
    "B,E": 0.8,
    ...
  }
}
```

**Notes:**
- Traffic multipliers range from 0.5 (low traffic) to 3.0 (high traffic)
- Default multiplier is 1.0 (normal traffic)
- Keys are formatted as "fromNode,toNode"
- Random traffic is applied to one edge per call

---

### 5. **POST /simulate_step** - Simulate One Step
**Description:** Calculate path, apply traffic changes, and return updated information in a single step

**Request:**
```
POST /simulate_step?start={start_node}&goal={goal_node}&mode={mode}
```

**Query Parameters:**
| Parameter | Type   | Required | Description                           | Valid Values          |
|-----------|--------|----------|---------------------------------------|-----------------------|
| start     | string | Yes      | Starting node ID                      | Any valid node ID     |
| goal      | string | Yes      | Destination node ID                   | Any valid node ID     |
| mode      | string | Yes      | Transportation mode                   | "car", "bicycle", "pedestrian" |

**Response:**
```json
{
  "new_path": ["A", "E", "D", "G"],
  "cost": 9.5,
  "traffic": {
    "A,B": 1.0,
    "B,A": 1.0,
    ...
  }
}
```

**Notes:**
- This endpoint combines pathfinding with traffic updates
- Useful for step-by-step simulation visualization
- Traffic is updated AFTER calculating the path

---

## Data Models

### Graph Structure
The map is loaded from `map.json` with the following structure:

#### Nodes
```json
{
  "id": "A",
  "x": 0,
  "y": 0
}
```

| Field | Type   | Description                    |
|-------|--------|--------------------------------|
| id    | string | Unique node identifier         |
| x     | number | X coordinate for visualization |
| y     | number | Y coordinate for visualization |

#### Edges
```json
{
  "from": "A",
  "to": "B",
  "distance": 2,
  "allowed_modes": ["car", "bicycle"],
  "one_way": false
}
```

| Field         | Type     | Description                              |
|---------------|----------|------------------------------------------|
| from          | string   | Source node ID                           |
| to            | string   | Destination node ID                      |
| distance      | number   | Base distance (before traffic modifier)  |
| allowed_modes | string[] | Transportation modes allowed on this edge|
| one_way       | boolean  | If true, only from→to is allowed         |

---

## Configuration Constants

### Transportation Modes
```python
SIM_MODES = ["car", "bicycle", "pedestrian"]
```

### Traffic Multipliers
```python
DEFAULT_TRAFFIC_MULTIPLIER = 1.0
MIN_TRAFFIC_MULTIPLIER = 0.5     # 50% of normal traffic
MAX_TRAFFIC_MULTIPLIER = 3.0     # 300% of normal traffic
```

### Simulation Settings
```python
REROUTE_THRESHOLD = 0.2  # 20% cost increase triggers rerouting
```

---

## Current Map Layout

### Available Nodes
| Node ID | Coordinates (x, y) |
|---------|-------------------|
| A       | (0, 0)            |
| B       | (2, 1)            |
| C       | (4, 0)            |
| D       | (5, 3)            |
| E       | (3, 4)            |
| F       | (6, 1)            |
| G       | (7, 4)            |
| H       | (2, 6)            |
| I       | (5, 6)            |

### Connections (Edges)
| From | To | Distance | Modes                      | One-Way |
|------|----|----------|----------------------------|---------|
| A    | B  | 2.0      | car, bicycle               | No      |
| B    | C  | 2.5      | car                        | No      |
| B    | E  | 3.0      | bicycle, pedestrian        | No      |
| C    | D  | 3.0      | car, bicycle               | **Yes** |
| E    | D  | 2.0      | pedestrian                 | No      |
| A    | E  | 5.0      | car, bicycle, pedestrian   | No      |
| C    | F  | 1.5      | car                        | No      |
| F    | G  | 3.0      | car, bicycle               | No      |
| E    | H  | 2.5      | bicycle, pedestrian        | No      |
| H    | I  | 2.0      | bicycle, pedestrian        | No      |
| G    | I  | 2.5      | car, bicycle               | No      |
| D    | G  | 2.0      | car, bicycle               | No      |

---

## Algorithm Details

### A* Pathfinding
- Uses Euclidean distance as heuristic function
- Considers traffic multipliers for actual cost calculation
- Respects transportation mode restrictions
- Handles one-way edges

### Cost Calculation
```
actual_cost = base_distance × traffic_multiplier
```

Where:
- `base_distance` is from the edge definition
- `traffic_multiplier` ranges from 0.5 to 3.0

---

## Frontend Implementation Guide

### Recommended Features

#### 1. **Interactive Map Visualization**
- Display nodes at their (x, y) coordinates
- Show edges as lines between nodes
- Color-code edges based on traffic levels:
  - Green: 0.5 - 1.0 (low traffic)
  - Yellow: 1.0 - 2.0 (medium traffic)
  - Red: 2.0 - 3.0 (high traffic)
- Highlight the current path

#### 2. **Control Panel**
- Dropdown for start node selection
- Dropdown for goal node selection
- Radio buttons for mode selection (car/bicycle/pedestrian)
- Button to calculate path
- Button to update traffic
- Button to run simulation step

#### 3. **Information Display**
- Current path as a list
- Total cost
- Traffic conditions
- Step counter (for simulation)

#### 4. **Real-time Simulation**
- Auto-advance simulation steps with delay
- Show agent moving along the path
- Highlight rerouting events
- Display cost comparisons

---

## Example Usage Flows

### Flow 1: Simple Path Calculation
```
1. GET /nodes → Display available nodes
2. User selects start="A", goal="G", mode="car"
3. GET /path?start=A&goal=G&mode=car → Display path and cost
4. Visualize the path on the map
```

### Flow 2: Traffic Update
```
1. Calculate initial path
2. POST /update_traffic → Get new traffic conditions
3. Re-calculate path with GET /path → Show if route changed
4. Update edge colors based on new traffic
```

### Flow 3: Step-by-Step Simulation
```
1. User sets start="A", goal="I", mode="bicycle"
2. Loop:
   a. POST /simulate_step?start=current&goal=I&mode=bicycle
   b. Display new path and cost
   c. Update traffic visualization
   d. Animate agent movement
   e. Check if goal reached
```

---

## Error Handling

### Common Error Scenarios

1. **Invalid Mode**
   - Response: `{"error": "Invalid mode"}`
   - Check: mode must be "car", "bicycle", or "pedestrian"

2. **No Path Found**
   - Response: `{"path": null, "cost": Infinity}`
   - Reason: No valid route exists for the chosen mode

3. **Invalid Node IDs**
   - Will cause server error
   - Always validate against `/nodes` endpoint first

---

## CORS Configuration
If your frontend runs on a different port, you may need to enable CORS in the backend:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Running the Backend

```bash
cd Backend
uvicorn api:app --reload
```

The API will be available at `http://localhost:8000`

---

## Testing the API

### Using cURL
```bash
# Health check
curl http://localhost:8000/

# Get nodes
curl http://localhost:8000/nodes

# Get path
curl "http://localhost:8000/path?start=A&goal=G&mode=car"

# Update traffic
curl -X POST http://localhost:8000/update_traffic

# Simulate step
curl -X POST "http://localhost:8000/simulate_step?start=A&goal=I&mode=bicycle"
```

### Using JavaScript (fetch)
```javascript
// Get path
const response = await fetch('http://localhost:8000/path?start=A&goal=G&mode=car');
const data = await response.json();
console.log(data.path, data.cost);

// Update traffic
const trafficResponse = await fetch('http://localhost:8000/update_traffic', {
  method: 'POST'
});
const trafficData = await trafficResponse.json();
console.log(trafficData.traffic);
```

---

## Additional Notes

- The backend maintains traffic state in memory
- Restarting the server resets all traffic to default (1.0)
- Graph structure is loaded once at startup from `map.json`
- All coordinates are provided for 2D visualization
- The A* algorithm guarantees the shortest path given current traffic conditions

---

## Version Information
- **FastAPI**: Web framework
- **Python**: 3.x required
- **Dependencies**: heapq (built-in), math (built-in), random (built-in), json (built-in)

---

## Support
For issues or questions about the backend implementation, refer to the source files:
- `api.py` - API endpoints
- `pathfinder.py` - A* algorithm
- `traffic_updater.py` - Traffic simulation
- `config.py` - Configuration constants
- `json_to_graph.py` - Graph loader
- `simulator.py` - Simulation logic (CLI version)
python -m uvicorn api:app --reload