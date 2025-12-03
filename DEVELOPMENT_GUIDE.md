# Development Guide

## 🛠️ For Developers: Modifying and Extending the System

This guide covers how to make changes to the traffic simulation system, add new features, and understand the development workflow.

---

## 📋 Table of Contents

1. [Development Setup](#development-setup)
2. [Project Structure Deep Dive](#project-structure-deep-dive)
3. [Backend Development](#backend-development)
4. [Frontend Development](#frontend-development)
5. [Adding New Features](#adding-new-features)
6. [Testing](#testing)
7. [Common Modifications](#common-modifications)
8. [Best Practices](#best-practices)

---

## Development Setup

### Recommended Tools

**Code Editors**:
- VS Code (recommended) with extensions:
  - Python
  - Pylance
  - ESLint
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript

**Browser**:
- Chrome or Edge with DevTools
- React Developer Tools extension

**Terminal**:
- Windows: PowerShell or Git Bash
- Mac/Linux: Terminal or iTerm2

### Environment Setup

**Backend Virtual Environment** (recommended):
```bash
cd Backend
python -m venv venv

# Activate
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn
```

**Frontend with Hot Reload**:
```bash
cd Frontend/traffic-sim-frontend
npm install
npm run dev
```

---

## Project Structure Deep Dive

### Backend Architecture

```
Backend/
├── Core Engine
│   ├── multi_vehicle_simulator.py   # Main simulation controller
│   ├── vehicle.py                   # Vehicle entities & manager
│   ├── pathfinder.py                # A* algorithm
│   └── traffic_analyzer.py          # Congestion analysis
│
├── API Layer
│   ├── api.py                       # FastAPI endpoints
│   └── config.py                    # Configuration constants
│
├── Data Loading
│   └── json_to_graph.py             # Graph construction
│
├── Legacy (CLI)
│   ├── main.py                      # CLI entry point
│   ├── simulator.py                 # Single-vehicle sim
│   └── traffic_updater.py           # Legacy traffic
│
└── Map Data
    ├── city_map.json                # City network
    ├── nust_campus.json             # Campus network
    └── map.json                     # Simple network
```

### Frontend Architecture

```
Frontend/traffic-sim-frontend/
├── app/                             # Next.js App Router
│   ├── page.tsx                     # Root page
│   ├── layout.tsx                   # Root layout
│   └── globals.css                  # Global styles
│
├── components/                      # React components
│   ├── MultiVehicleTrafficSimulator.tsx    # Main controller
│   ├── MultiVehicleMapVisualization.tsx    # SVG renderer
│   ├── TrafficStatsDashboard.tsx           # Statistics
│   ├── TrafficControlPanel.tsx             # Controls
│   ├── VehicleMarker.tsx                   # Vehicle icons
│   └── VehicleDetailsTooltip.tsx           # Tooltips
│
├── lib/                             # Utilities
│   ├── api.ts                       # API client
│   ├── types.ts                     # TypeScript types
│   └── graphData.ts                 # Static map data
│
└── Configuration
    ├── package.json                 # Dependencies
    ├── tsconfig.json                # TypeScript config
    ├── next.config.ts               # Next.js config
    └── tailwind.config.ts           # Tailwind config
```

---

## Backend Development

### Adding a New API Endpoint

**1. Define the endpoint in `api.py`**:

```python
# In api.py

from pydantic import BaseModel

# Request model (if needed)
class MyRequest(BaseModel):
    parameter1: str
    parameter2: int

@app.get("/my_endpoint")
def my_endpoint(param1: str, param2: int):
    """
    Description of what this endpoint does.
    """
    # Process request
    result = do_something(param1, param2)
    
    # Return response
    return {
        "success": True,
        "data": result
    }

@app.post("/my_post_endpoint")
def my_post_endpoint(request: MyRequest):
    """
    POST endpoint with request body.
    """
    return {"result": request.parameter1}
```

**2. Test the endpoint**:

```bash
# GET request
curl "http://localhost:8000/my_endpoint?param1=test&param2=42"

# POST request
curl -X POST http://localhost:8000/my_post_endpoint \
  -H "Content-Type: application/json" \
  -d '{"parameter1": "test", "parameter2": 42}'
```

### Modifying the Simulation Engine

**Example: Change vehicle speed**

```python
# In vehicle.py

class Vehicle:
    SPEED_MULTIPLIERS = {
        VehicleType.CAR: 80.0,        # Changed from 60.0
        VehicleType.BIKE: 50.0,       # Changed from 40.0
        VehicleType.PEDESTRIAN: 25.0  # Changed from 20.0
    }
```

**Example: Modify A* heuristic**

```python
# In pathfinder.py

def euclidean_distance(a, b):
    # Original heuristic
    return math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2)

# Alternative: Manhattan distance
def manhattan_distance(a, b):
    return abs(a[0]-b[0]) + abs(a[1]-b[1])

# Change in a_star function:
f_score[start] = manhattan_distance(heuristic_coords[start], heuristic_coords[goal])
```

**Example: Adjust congestion thresholds**

```python
# In traffic_analyzer.py

class TrafficAnalyzer:
    # Make congestion trigger earlier
    LOW_CONGESTION = 0.15      # Changed from 0.2
    MEDIUM_CONGESTION = 0.3    # Changed from 0.4
    HIGH_CONGESTION = 0.6      # Changed from 0.7
    
    # More aggressive traffic multipliers
    TRAFFIC_RANGES = {
        "free_flow": (0.5, 0.8),
        "light": (1.0, 2.0),       # Increased max
        "moderate": (2.0, 3.5),    # Increased max
        "heavy": (3.5, 5.0),       # Increased max
        "congested": (5.0, 8.0)    # Increased max
    }
```

### Creating a Custom Map

**1. Create JSON file** (`Backend/my_custom_map.json`):

```json
{
  "nodes": [
    {"id": "Node_A", "x": 0, "y": 0},
    {"id": "Node_B", "x": 2, "y": 0},
    {"id": "Node_C", "x": 1, "y": 2},
    {"id": "Node_D", "x": 3, "y": 2}
  ],
  "edges": [
    {
      "from": "Node_A",
      "to": "Node_B",
      "distance": 2,
      "allowed_modes": ["car", "bicycle", "pedestrian"],
      "one_way": false
    },
    {
      "from": "Node_B",
      "to": "Node_D",
      "distance": 2.5,
      "allowed_modes": ["car"],
      "one_way": true
    },
    {
      "from": "Node_A",
      "to": "Node_C",
      "distance": 2.2,
      "allowed_modes": ["bicycle", "pedestrian"],
      "one_way": false
    },
    {
      "from": "Node_C",
      "to": "Node_D",
      "distance": 2.2,
      "allowed_modes": ["car", "bicycle"],
      "one_way": false
    }
  ]
}
```

**2. Register map in `api.py`**:

```python
AVAILABLE_MAPS = {
    "simple": "map.json",
    "city": "city_map.json",
    "nust": "nust_campus.json",
    "custom": "my_custom_map.json"  # Add your map
}
```

**3. Use it**:
```bash
curl -X POST "http://localhost:8000/switch_map?map_name=custom"
```

---

## Frontend Development

### Adding a New Component

**1. Create component file** (`components/MyNewComponent.tsx`):

```tsx
'use client';

import React from 'react';

interface MyNewComponentProps {
  title: string;
  data: any;
  onAction: () => void;
}

const MyNewComponent: React.FC<MyNewComponentProps> = ({ 
  title, 
  data, 
  onAction 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div className="space-y-2">
        {/* Component content */}
        <p>{data}</p>
        <button 
          onClick={onAction}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Action
        </button>
      </div>
    </div>
  );
};

export default MyNewComponent;
```

**2. Import and use in parent**:

```tsx
// In MultiVehicleTrafficSimulator.tsx

import MyNewComponent from './MyNewComponent';

// In the component:
const [myData, setMyData] = useState('');

const handleAction = () => {
  console.log('Action triggered');
};

// In JSX:
<MyNewComponent 
  title="My Feature"
  data={myData}
  onAction={handleAction}
/>
```

### Modifying the API Client

**Add new API function** in `lib/api.ts`:

```typescript
export const api = {
  // Existing functions...
  
  async myNewEndpoint(param: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/my_endpoint?param=${param}`);
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  },
  
  async myPostEndpoint(data: {field1: string, field2: number}): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/my_post_endpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  }
};
```

**Use in component**:

```typescript
const fetchData = async () => {
  try {
    const result = await api.myNewEndpoint('test');
    console.log(result);
  } catch (err) {
    console.error('Error:', err);
  }
};
```

### Adding TypeScript Types

**In `lib/types.ts`**:

```typescript
export interface MyNewType {
  id: string;
  name: string;
  value: number;
  timestamp: Date;
}

export interface MyResponse {
  success: boolean;
  data: MyNewType[];
  message?: string;
}
```

**Use in components**:

```typescript
import { MyNewType, MyResponse } from '@/lib/types';

const [items, setItems] = useState<MyNewType[]>([]);

const fetchItems = async () => {
  const response: MyResponse = await api.getItems();
  setItems(response.data);
};
```

### Customizing Map Visualization

**Change road colors**:

```typescript
// In MultiVehicleMapVisualization.tsx

const getCustomCongestionColor = (level: string): string => {
  switch (level) {
    case 'free_flow': return '#10b981';  // Different green
    case 'light': return '#fbbf24';      // Different yellow
    case 'moderate': return '#f59e0b';   // Different orange
    case 'heavy': return '#dc2626';      // Different red
    case 'congested': return '#7f1d1d';  // Dark red
    default: return '#6b7280';
  }
};

// Use in road rendering:
stroke={getCustomCongestionColor(congestion.congestion_level)}
```

**Modify vehicle icons**:

```typescript
// In VehicleMarker.tsx or types.ts

export const VEHICLE_EMOJI: Record<VehicleType, string> = {
  car: '🚙',          // Changed from 🚗
  bicycle: '🚲',     // Changed from 🚴
  pedestrian: '🚶‍♂️'  // Changed from 🚶
};

// Or use custom SVG:
const CarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20">
    <path d="M10 2L2 8v10h16V8L10 2z" fill="currentColor"/>
  </svg>
);
```

---

## Adding New Features

### Feature: Traffic Lights

**Backend Implementation**:

```python
# In multi_vehicle_simulator.py

class TrafficLight:
    def __init__(self, edge: Tuple[str, str], cycle_time: int = 30):
        self.edge = edge
        self.cycle_time = cycle_time
        self.current_time = 0
        self.is_green = True
    
    def update(self, delta_time: float):
        self.current_time += delta_time
        if self.current_time >= self.cycle_time:
            self.is_green = not self.is_green
            self.current_time = 0
    
    def get_multiplier(self) -> float:
        return 1.0 if self.is_green else 100.0  # Red = blocked

class MultiVehicleSimulator:
    def __init__(self, graph, heuristic_coords):
        # ... existing code ...
        self.traffic_lights: Dict[Tuple[str, str], TrafficLight] = {}
    
    def add_traffic_light(self, from_node: str, to_node: str):
        edge = (from_node, to_node)
        self.traffic_lights[edge] = TrafficLight(edge)
    
    def simulation_tick(self):
        # ... existing code ...
        
        # Update traffic lights
        for light in self.traffic_lights.values():
            light.update(delta_time)
            if not light.is_green:
                self.traffic_multipliers[light.edge] = 100.0
            else:
                # Use normal traffic calculation
                pass
```

**API Endpoint**:

```python
# In api.py

@app.post("/add_traffic_light")
def add_traffic_light(from_node: str, to_node: str):
    simulator.add_traffic_light(from_node, to_node)
    return {"success": True}

@app.get("/traffic_lights")
def get_traffic_lights():
    lights_data = []
    for edge, light in simulator.traffic_lights.items():
        lights_data.append({
            "from": edge[0],
            "to": edge[1],
            "is_green": light.is_green,
            "time_remaining": light.cycle_time - light.current_time
        })
    return {"lights": lights_data}
```

**Frontend Integration**:

```typescript
// In lib/api.ts
async addTrafficLight(from: string, to: string) {
  const response = await fetch(
    `${API_BASE_URL}/add_traffic_light?from_node=${from}&to_node=${to}`,
    { method: 'POST' }
  );
  return response.json();
}

// In component:
const handleAddLight = async () => {
  await api.addTrafficLight('City_Hall', 'Stadium');
  // Refresh state
};
```

**Visualization**:

```tsx
// In MultiVehicleMapVisualization.tsx

{trafficLights.map(light => {
  const edge = mapData.edges.find(e => 
    e.from === light.from && e.to === light.to
  );
  if (!edge) return null;
  
  const fromNode = mapData.nodes.find(n => n.id === light.from);
  const toNode = mapData.nodes.find(n => n.id === light.to);
  const midX = (scaleX(fromNode.x) + scaleX(toNode.x)) / 2;
  const midY = (scaleY(fromNode.y) + scaleY(toNode.y)) / 2;
  
  return (
    <g key={`light-${light.from}-${light.to}`}>
      <circle
        cx={midX}
        cy={midY}
        r={8}
        fill={light.is_green ? '#22c55e' : '#ef4444'}
        stroke="black"
        strokeWidth={2}
      />
    </g>
  );
})}
```

### Feature: Vehicle Priority Levels

**Backend**:

```python
# In vehicle.py

class VehiclePriority(Enum):
    NORMAL = "normal"
    EMERGENCY = "emergency"  # Ambulance, fire truck
    PUBLIC = "public"        # Bus

class Vehicle:
    def __init__(self, vehicle_type, start_node, goal_node, priority=VehiclePriority.NORMAL):
        # ... existing code ...
        self.priority = priority
        
    def get_priority_multiplier(self) -> float:
        if self.priority == VehiclePriority.EMERGENCY:
            return 0.3  # 70% faster pathfinding
        elif self.priority == VehiclePriority.PUBLIC:
            return 0.8  # 20% faster
        return 1.0

# In pathfinder.py - modify cost calculation:
def a_star(graph, heuristic_coords, traffic_multipliers, start, goal, mode, 
           blocked_roads=None, priority_multiplier=1.0):
    # ... existing code ...
    
    # Apply priority to cost:
    tentative_g = g_score[current] + (base_cost * multiplier * priority_multiplier)
```

---

## Testing

### Backend Testing

**Manual Testing with curl**:

```bash
# Test spawn
curl -X POST http://localhost:8000/spawn_vehicle \
  -H "Content-Type: application/json" \
  -d '{"vehicle_type": "car"}'

# Test tick
curl -X POST http://localhost:8000/simulation_tick

# Test state
curl http://localhost:8000/simulation_state | jq
```

**Python Unit Tests** (create `test_pathfinder.py`):

```python
import unittest
from pathfinder import a_star
from json_to_graph import load_graph

class TestPathfinder(unittest.TestCase):
    def setUp(self):
        self.graph, self.coords = load_graph("map.json")
        self.traffic = {(u, v["to"]): 1.0 for u in self.graph for v in self.graph[u]}
    
    def test_basic_path(self):
        path, cost = a_star(
            self.graph, self.coords, self.traffic,
            "A", "B", "car"
        )
        self.assertIsNotNone(path)
        self.assertEqual(path[0], "A")
        self.assertEqual(path[-1], "B")
    
    def test_no_path(self):
        # Block all roads
        blocked = set(self.traffic.keys())
        path, cost = a_star(
            self.graph, self.coords, self.traffic,
            "A", "B", "car", blocked_roads=blocked
        )
        self.assertIsNone(path)
        self.assertEqual(cost, float('inf'))

if __name__ == '__main__':
    unittest.main()
```

**Run tests**:
```bash
python test_pathfinder.py
```

### Frontend Testing

**Component Testing**:

```typescript
// Install testing library
npm install --save-dev @testing-library/react @testing-library/jest-dom

// Create __tests__/VehicleMarker.test.tsx
import { render, screen } from '@testing-library/react';
import VehicleMarker from '../components/VehicleMarker';

describe('VehicleMarker', () => {
  it('renders vehicle emoji', () => {
    const mockVehicle = {
      id: 'car_1',
      type: 'car',
      status: 'moving',
      // ... other fields
    };
    
    render(
      <svg>
        <VehicleMarker 
          vehicle={mockVehicle}
          x={100}
          y={100}
          isHighlighted={false}
          onMouseEnter={() => {}}
          onMouseLeave={() => {}}
        />
      </svg>
    );
    
    expect(screen.getByText('🚗')).toBeInTheDocument();
  });
});
```

**Run tests**:
```bash
npm test
```

---

## Common Modifications

### Change Default Values

**Backend**:
```python
# In config.py
DEFAULT_TRAFFIC_MULTIPLIER = 1.0    # Change to 0.8 for lighter traffic
MIN_TRAFFIC_MULTIPLIER = 0.3        # Change range
MAX_TRAFFIC_MULTIPLIER = 5.0

# In vehicle.py
SPEED_MULTIPLIERS = {
    VehicleType.CAR: 100.0,  # Make cars faster
}

# In multi_vehicle_simulator.py
BASE_EDGE_CAPACITY = 5.0    # Increase capacity (less congestion)
```

**Frontend**:
```typescript
// In MultiVehicleTrafficSimulator.tsx
const [vehicleCount, setVehicleCount] = useState(50);  // More vehicles
const [simulationSpeed, setSimulationSpeed] = useState(50);  // Faster (20 FPS)

// In MultiVehicleMapVisualization.tsx
const SCALE = 150;  // Larger map
const WIDTH = 2000;
const HEIGHT = 1400;
```

### Add Logging

**Backend**:
```python
# In multi_vehicle_simulator.py
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def simulation_tick(self):
    logger.info(f"Tick {self.simulation_step}: {len(self.vehicle_manager.get_active_vehicles())} active vehicles")
    # ... rest of code ...
```

**Frontend**:
```typescript
// In MultiVehicleTrafficSimulator.tsx
useEffect(() => {
  if (!isRunning) return;
  
  const interval = setInterval(async () => {
    console.log(`Step ${simulationState?.step}: Running tick`);
    const result = await api.simulationTick();
    console.log(`Tick result:`, result);
    // ...
  }, simulationSpeed);
  
  return () => clearInterval(interval);
}, [isRunning]);
```

### Performance Profiling

**Backend**:
```python
import time

def simulation_tick(self):
    start_time = time.time()
    
    # ... simulation code ...
    
    elapsed = time.time() - start_time
    print(f"Tick took {elapsed*1000:.2f}ms")
    
    return result
```

**Frontend**:
```typescript
// In browser console
console.time('render');
// ... render happens ...
console.timeEnd('render');

// React DevTools Profiler
// Enable in React DevTools extension
```

---

## Best Practices

### Code Style

**Python (Backend)**:
- Use type hints: `def func(param: str) -> int:`
- Follow PEP 8: 4-space indentation
- Docstrings for functions
- Descriptive variable names

**TypeScript (Frontend)**:
- Use interfaces for types
- Functional components with hooks
- Descriptive prop names
- Avoid `any` type

### State Management

**Backend**:
- Keep simulation state in classes
- Use dictionaries for O(1) lookups
- Minimize global state

**Frontend**:
- Use `useState` for component state
- Use `useEffect` for side effects
- Use `useCallback` for stable callbacks
- Consider context for deeply nested props

### Error Handling

**Backend**:
```python
from fastapi import HTTPException

@app.get("/vehicle/{vehicle_id}")
def get_vehicle(vehicle_id: str):
    vehicle = simulator.get_vehicle_by_id(vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle.to_dict()
```

**Frontend**:
```typescript
const handleAction = async () => {
  try {
    setLoading(true);
    const result = await api.someEndpoint();
    setData(result);
  } catch (err) {
    console.error('Error:', err);
    setError('Failed to perform action');
  } finally {
    setLoading(false);
  }
};
```

### Documentation

- Add comments for complex logic
- Update markdown docs when adding features
- Keep API documentation in sync
- Document assumptions and limitations

---

## Debugging Tips

### Backend Debugging

**Print Debugging**:
```python
print(f"DEBUG: Vehicle {vehicle.id} at position {vehicle.position_on_edge}")
print(f"DEBUG: Path: {vehicle.path}")
```

**FastAPI Interactive Docs**:
- Visit http://localhost:8000/docs
- Test endpoints interactively
- See request/response schemas

**Python Debugger**:
```python
import pdb

def simulation_tick(self):
    pdb.set_trace()  # Breakpoint
    # ... code ...
```

### Frontend Debugging

**Console Logging**:
```typescript
console.log('State:', simulationState);
console.table(vehicles);
console.dir(mapData);
```

**React DevTools**:
- Inspect component tree
- View props and state
- Profile render performance

**Network Tab**:
- Monitor API calls
- Check request/response
- Identify slow requests

---

**Last Updated**: December 2, 2025
