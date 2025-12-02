# Configuration Guide

## Customizing Your Traffic Simulator

### Backend Configuration (`Backend/config.py`)

```python
# Transportation modes
SIM_MODES = ["car", "bicycle", "pedestrian"]

# Traffic multipliers
DEFAULT_TRAFFIC_MULTIPLIER = 1.0
MIN_TRAFFIC_MULTIPLIER = 0.5
MAX_TRAFFIC_MULTIPLIER = 3.0

# Rerouting threshold
REROUTE_THRESHOLD = 0.2  # 20% cost increase triggers reroute
```

### Vehicle Configuration (`Backend/vehicle.py`)

```python
# Speed multipliers (adjust for different vehicle speeds)
SPEED_MULTIPLIERS = {
    VehicleType.CAR: 1.0,
    VehicleType.BIKE: 0.7,        # Bikes 30% slower
    VehicleType.PEDESTRIAN: 0.3   # Pedestrians 70% slower
}

# Capacity usage (how much space they take)
CAPACITY_USAGE = {
    VehicleType.CAR: 1.0,
    VehicleType.BIKE: 0.5,         # Bikes take half space
    VehicleType.PEDESTRIAN: 0.2    # Pedestrians take 20% space
}
```

### Traffic Analysis (`Backend/traffic_analyzer.py`)

```python
# Edge capacity (vehicles per unit distance)
BASE_EDGE_CAPACITY = 5.0

# Congestion thresholds
LOW_CONGESTION = 0.3      # 30%
MEDIUM_CONGESTION = 0.6   # 60%
HIGH_CONGESTION = 0.85    # 85%
CRITICAL_CONGESTION = 1.0 # 100%

# Traffic multiplier ranges by level
TRAFFIC_RANGES = {
    "free_flow": (0.5, 0.8),
    "light": (0.8, 1.2),
    "moderate": (1.2, 2.0),
    "heavy": (2.0, 3.5),
    "congested": (3.5, 5.0)
}
```

### Frontend Defaults (`Frontend/.../MultiVehicleTrafficSimulator.tsx`)

```typescript
// Initial spawn settings
const [vehicleCount, setVehicleCount] = useState(10);
const [carProbability, setCarProbability] = useState(60);      // 60%
const [bikeProbability, setBikeProbability] = useState(25);     // 25%
const [pedestrianProbability, setPedestrianProbability] = useState(15); // 15%

// Simulation settings
const [autoSpawn, setAutoSpawn] = useState(true);
const [simulationSpeed, setSimulationSpeed] = useState(1000);  // 1000ms
```

## Common Customizations

### 1. Increase Traffic Severity

Make traffic jams more severe:

```python
# In traffic_analyzer.py
TRAFFIC_RANGES = {
    "free_flow": (0.5, 0.8),
    "light": (1.0, 1.5),
    "moderate": (1.5, 3.0),
    "heavy": (3.0, 5.0),
    "congested": (5.0, 8.0)  # More severe congestion
}
```

### 2. Faster Simulation

Reduce delays between ticks:

```typescript
// In MultiVehicleTrafficSimulator.tsx
const [simulationSpeed, setSimulationSpeed] = useState(500); // Faster (500ms)
```

### 3. More Realistic Capacity

Adjust road capacities:

```python
# In traffic_analyzer.py
BASE_EDGE_CAPACITY = 10.0  # Roads can hold more vehicles
```

### 4. Different Vehicle Distributions

Change default spawn ratios:

```typescript
const [carProbability, setCarProbability] = useState(70);      // More cars
const [bikeProbability, setBikeProbability] = useState(20);
const [pedestrianProbability, setPedestrianProbability] = useState(10);
```

### 5. Aggressive Rerouting

Make vehicles reroute more frequently:

```python
# In config.py
REROUTE_THRESHOLD = 0.1  # Reroute on 10% cost increase
```

### 6. Adjust Congestion Probability Influence

```python
# In traffic_analyzer.py, get_congestion_probability method
historical_factor = min((avg_multiplier - 1.0) / 2.0, 0.5)  # Increase from 0.3 to 0.5
```

## Visual Customizations

### Change Traffic Colors

```typescript
// In types.ts
export const getCongestionColor = (level: string): string => {
  switch (level) {
    case 'free_flow': return '#10b981';  // Emerald
    case 'light': return '#84cc16';      // Lime
    case 'moderate': return '#f59e0b';   // Amber
    case 'heavy': return '#f97316';      // Orange
    case 'congested': return '#dc2626';  // Red
    default: return '#6b7280';           // Gray
  }
};
```

### Adjust Map Scaling

```typescript
// In MultiVehicleMapVisualization.tsx
const SCALE = 120;       // Increase for larger map
const OFFSET_X = 200;    // Adjust positioning
const OFFSET_Y = 160;
```

## Performance Tuning

### For Many Vehicles (50+)

```typescript
// Reduce update frequency
const [simulationSpeed, setSimulationSpeed] = useState(1500);

// Disable auto-spawn
const [autoSpawn, setAutoSpawn] = useState(false);
```

### For Smooth Animation

```python
# Limit max vehicles
MAX_VEHICLES = 30

# In spawn methods, check:
if len(self.vehicle_manager.get_all_vehicles()) >= MAX_VEHICLES:
    return None
```

## Map Customization

### Add New Map

1. Create JSON file in `Backend/`:
```json
{
  "nodes": {
    "A": [0, 0],
    "B": [1, 0]
  },
  "edges": [
    {
      "from": "A",
      "to": "B",
      "distance": 10,
      "allowed": ["car", "bicycle", "pedestrian"],
      "one_way": false
    }
  ]
}
```

2. Register in `Backend/api.py`:
```python
AVAILABLE_MAPS = {
    "simple": "map.json",
    "city": "city_map.json",
    "nust": "nust_campus.json",
    "custom": "custom_map.json"  # Add your map
}
```

## Testing Different Scenarios

### Scenario 1: Rush Hour
```typescript
vehicleCount = 40
carProbability = 80
simulationSpeed = 800
autoSpawn = true
```

### Scenario 2: Pedestrian Zone
```typescript
vehicleCount = 20
carProbability = 10
bikeProbability = 30
pedestrianProbability = 60
```

### Scenario 3: Bike-Friendly City
```typescript
vehicleCount = 25
carProbability = 40
bikeProbability = 50
pedestrianProbability = 10
```

## Debug Mode

### Enable Verbose Logging

```python
# In multi_vehicle_simulator.py
import logging
logging.basicConfig(level=logging.DEBUG)

# Add in simulation_tick method:
logging.debug(f"Step {self.simulation_step}: {len(active_vehicles)} vehicles moving")
```

### Frontend Console Logging

```typescript
// In MultiVehicleTrafficSimulator.tsx
useEffect(() => {
  console.log('Simulation State:', simulationState);
  console.log('Active Vehicles:', vehicles.filter(v => v.status !== 'arrived'));
}, [simulationState, vehicles]);
```

## Environment Variables

Create `.env.local` in frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_DEFAULT_MAP=city
NEXT_PUBLIC_MAX_VEHICLES=50
```

## Tips for Best Performance

1. **Vehicle Count**: Keep < 30 for smooth animation
2. **Simulation Speed**: 1000-1500ms for balanced performance
3. **Auto-spawn**: Disable for controlled testing
4. **Map Zoom**: Use zoom controls instead of very large maps
5. **Browser**: Chrome/Edge perform best with SVG animations

## Common Issues & Solutions

### Vehicles Not Moving
- Check simulation is started
- Verify backend connection
- Ensure vehicles have valid paths

### High CPU Usage
- Reduce vehicle count
- Increase simulation speed (more ms)
- Clear arrived vehicles more frequently

### Congestion Not Showing
- Enable congestion overlay
- Spawn more vehicles
- Reduce edge capacity

---

Happy Customizing! 🎨
