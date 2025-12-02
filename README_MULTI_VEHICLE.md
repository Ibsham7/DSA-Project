# Multi-Vehicle Traffic Simulation System

## Overview
A comprehensive DSA (Data Structures & Algorithms) project implementing a realistic multi-vehicle traffic simulation with congestion analysis, probability calculations, and real-time visualization.

## Key Features

### 🚗 Multi-Vehicle Support
- **Three Vehicle Types**: Cars (🚗), Bicycles (🚴), and Pedestrians (🚶)
- **Dynamic Spawning**: Configure vehicle distribution and spawn multiple vehicles
- **Individual Tracking**: Each vehicle has unique properties, paths, and status
- **Smart Movement**: Vehicles navigate using A* pathfinding with real-time traffic awareness

### 🚦 Traffic Analysis & Congestion
- **Real-Time Density Calculation**: Tracks vehicle capacity usage on each road segment
- **Congestion Probability**: Statistical models predict traffic likelihood (0-100%)
- **5 Traffic Levels**: Free Flow, Light, Moderate, Heavy, Congested
- **Bottleneck Detection**: Automatically identifies congested intersections and roads
- **Dynamic Traffic Multipliers**: Road speeds adjust based on congestion (0.5x - 5.0x)

### 🎯 DSA Implementations
1. **A* Pathfinding Algorithm**: Optimal route calculation with heuristic (Euclidean distance)
2. **Priority Queues**: Efficient pathfinding and vehicle movement scheduling
3. **Graph Data Structure**: Road network representation with weighted edges
4. **Hash Maps**: O(1) vehicle lookup and edge traffic tracking
5. **Statistical Analysis**: Traffic probability models and historical pattern analysis

### 📊 Real-Time Statistics
- **Vehicle Statistics**:
  - Total, active, and arrived vehicles
  - Average travel time and wait time
  - Reroute counts per vehicle
  - Distribution by vehicle type

- **Traffic Statistics**:
  - Average network density
  - Congestion probability across network
  - Traffic distribution (% of roads at each level)
  - Top bottleneck locations

### 🎨 Advanced Visualization
- **Multi-Vehicle Map**: Shows all vehicles simultaneously with smooth animations
- **Congestion Heatmap**: Roads color-coded by traffic level
- **Vehicle Markers**: Animated icons with status indicators (moving, stuck, rerouting)
- **Real-Time Updates**: Live traffic flow visualization
- **Interactive Controls**: Zoom, pan, highlight vehicles
- **Edge Analytics**: Vehicle count badges and congestion percentages on roads

## Architecture

### Backend (Python)
```
Backend/
├── vehicle.py                    # Vehicle entity system with OOP design
├── traffic_analyzer.py           # Traffic density & congestion probability
├── multi_vehicle_simulator.py    # Core simulation engine
├── pathfinder.py                 # A* algorithm implementation
├── traffic_updater.py            # Dynamic traffic multiplier updates
├── api.py                        # FastAPI REST endpoints
├── config.py                     # Configuration constants
└── json_to_graph.py              # Graph loading utilities
```

### Frontend (Next.js + TypeScript)
```
Frontend/traffic-sim-frontend/
├── components/
│   ├── MultiVehicleTrafficSimulator.tsx    # Main simulation UI
│   ├── MultiVehicleMapVisualization.tsx    # Map with vehicles
│   ├── VehicleMarker.tsx                   # Individual vehicle rendering
│   ├── TrafficStatsDashboard.tsx           # Statistics panel
│   └── GoogleMapsStyleVisualization.tsx    # Original single-vehicle UI
├── lib/
│   ├── types.ts                            # TypeScript type definitions
│   ├── api.ts                              # API client
│   └── graphData.ts                        # Static map data
└── app/
    └── page.tsx                            # Main page
```

## DSA Concepts Demonstrated

### 1. Graph Algorithms
- **Weighted Directed Graph**: Road network with distances and restrictions
- **A* Search**: Optimal pathfinding with admissible heuristic
- **Dynamic Edge Weights**: Real-time traffic multiplier adjustments
- **Graph Traversal**: BFS/DFS for network analysis

### 2. Data Structures
- **Priority Queue (Heap)**: A* open set for efficient node selection
- **Hash Tables**: O(1) vehicle and edge lookups
- **Lists/Arrays**: Path storage and vehicle collections
- **Sets**: Active vehicle tracking
- **Tuples**: Immutable edge keys

### 3. Object-Oriented Design
- **Encapsulation**: Vehicle, VehicleManager, TrafficAnalyzer classes
- **Inheritance**: VehicleType enum for polymorphic behavior
- **Composition**: Simulator composed of Manager and Analyzer

### 4. Statistical Analysis
- **Probability Models**: Congestion likelihood based on density
- **Moving Averages**: Historical traffic pattern analysis
- **Trend Prediction**: Future congestion forecasting
- **Distribution Analysis**: Vehicle type and traffic level distributions

### 5. Algorithm Optimization
- **Memoization**: Edge capacity calculations
- **Lazy Evaluation**: On-demand state updates
- **Batch Operations**: Efficient multi-vehicle spawning
- **Time Complexity**: O(E log V) for A*, O(1) for lookups

## How It Works

### Vehicle Lifecycle
1. **Spawn**: Vehicle created with random/specified start and goal nodes
2. **Pathfinding**: A* calculates optimal route considering current traffic
3. **Movement**: Vehicle moves along path, node by node
4. **Traffic Updates**: Each movement updates edge occupancy
5. **Rerouting**: If congestion detected ahead, recalculate route
6. **Arrival**: Vehicle reaches destination, statistics recorded

### Congestion Calculation
```python
density = vehicles_on_edge / edge_capacity
probability = min(density / critical_threshold, 1.0) + historical_factor
traffic_multiplier = random.uniform(range_for_congestion_level)
```

### Traffic Levels
- **Free Flow** (< 30% capacity): 0.5x - 0.8x multiplier
- **Light** (30-60%): 0.8x - 1.2x multiplier
- **Moderate** (60-85%): 1.2x - 2.0x multiplier
- **Heavy** (85-100%): 2.0x - 3.5x multiplier
- **Congested** (> 100%): 3.5x - 5.0x multiplier

## API Endpoints

### Multi-Vehicle Operations
- `POST /spawn_vehicle` - Spawn single vehicle
- `POST /spawn_multiple_vehicles` - Spawn multiple with distribution
- `POST /simulation_tick` - Execute one simulation step
- `GET /simulation_state` - Get complete simulation state
- `GET /vehicles` - Get all vehicles
- `GET /vehicle/{id}` - Get specific vehicle
- `DELETE /vehicle/{id}` - Remove vehicle

### Traffic Analysis
- `GET /traffic_statistics` - Vehicle and traffic statistics
- `GET /congestion_report` - Detailed congestion analysis
- `GET /edge_traffic` - Per-edge traffic data

### Simulation Control
- `POST /reset_simulation` - Reset to initial state
- `POST /start_continuous_simulation` - Auto-run simulation
- `POST /stop_simulation` - Stop auto-simulation

## Usage

### Start Backend
```bash
cd Backend
python -m uvicorn api:app --reload
```

### Start Frontend
```bash
cd Frontend/traffic-sim-frontend
npm install
npm run dev
```

### Access Application
Open http://localhost:3000

## Controls

### Spawn Vehicles
1. Adjust vehicle count (1-50)
2. Set distribution percentages (Cars, Bikes, Pedestrians)
3. Click "Spawn Vehicles"

### Run Simulation
1. Configure simulation speed (500-3000ms per tick)
2. Enable/disable auto-spawn
3. Click "Start Simulation"
4. Watch vehicles navigate with real-time rerouting

### View Statistics
- **Dashboard**: Shows all metrics in real-time
- **Vehicle List**: Click to highlight specific vehicles
- **Map**: Toggle congestion view and vehicle visibility

## Performance Metrics

### Scalability
- Handles 50+ simultaneous vehicles
- O(1) vehicle lookups
- O(E log V) pathfinding per vehicle
- Efficient edge occupancy updates

### Real-Time Updates
- Simulation tick: ~10-50ms (depends on vehicle count)
- Frontend update: 60 FPS
- API response: < 100ms

## Educational Value

### DSA Concepts Covered
✅ Graph algorithms (A*, BFS, DFS)
✅ Priority queues and heaps
✅ Hash tables and dictionaries
✅ Object-oriented programming
✅ Algorithm optimization
✅ Statistical modeling
✅ Real-time systems
✅ API design (REST)
✅ State management
✅ Data visualization

### Real-World Applications
- GPS navigation systems
- Traffic management
- Route optimization
- Urban planning
- Autonomous vehicles
- Delivery logistics

## Future Enhancements

- [ ] Traffic lights and intersections
- [ ] Vehicle collisions and accidents
- [ ] Weather effects on traffic
- [ ] Multiple maps simultaneously
- [ ] Historical traffic analysis
- [ ] Machine learning predictions
- [ ] 3D visualization
- [ ] Mobile app

## Technologies Used

### Backend
- Python 3.8+
- FastAPI
- Pydantic
- Heapq (priority queues)

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- SVG animations

## License
MIT License - Educational Project

## Authors
DSA End Semester Project 2024
