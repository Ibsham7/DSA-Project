# Frontend Documentation

## 🎯 Overview

The frontend is a **Next.js 16 application** built with **React 19**, **TypeScript 5**, and **Tailwind CSS 4**. It provides a real-time interactive visualization of the traffic simulation with comprehensive controls and analytics.

## 📂 File Structure

```
Frontend/traffic-sim-frontend/
├── app/
│   ├── page.tsx              # Main entry point (11 lines)
│   ├── layout.tsx            # Root layout with metadata
│   └── globals.css           # Global styles
├── components/
│   ├── MultiVehicleTrafficSimulator.tsx     # Main UI controller (659 lines)
│   ├── MultiVehicleMapVisualization.tsx     # SVG map renderer (789 lines)
│   ├── TrafficStatsDashboard.tsx            # Analytics dashboard
│   ├── TrafficControlPanel.tsx              # Traffic control UI
│   ├── VehicleMarker.tsx                    # Vehicle icon component
│   └── VehicleDetailsTooltip.tsx            # Hover tooltip
├── lib/
│   ├── api.ts                # API client (253 lines)
│   ├── types.ts              # TypeScript interfaces (234 lines)
│   └── graphData.ts          # Static map data
├── package.json              # Dependencies
├── next.config.ts            # Next.js configuration
├── tsconfig.json             # TypeScript configuration
└── tailwind.config.ts        # Tailwind CSS configuration
```

---

## 🧩 Component Architecture

### Component Hierarchy

```
page.tsx (App Root)
    ↓
MultiVehicleTrafficSimulator (Main Controller)
    ├── Header (Statistics Bar)
    ├── Error Alert
    ├── MultiVehicleMapVisualization (Map Display)
    │   ├── SVG Canvas
    │   ├── Roads (with congestion coloring)
    │   ├── Nodes (location markers)
    │   ├── VehicleMarker × N (for each vehicle)
    │   └── VehicleDetailsTooltip (on hover)
    ├── TrafficControlPanel (Right Sidebar)
    │   ├── Accidents List
    │   ├── Blocked Roads List
    │   └── Control Buttons
    └── Bottom Control Panel
        ├── Spawn Controls
        ├── Simulation Controls
        └── Active Vehicles List
```

---

## 📄 Component Details

### 1. `page.tsx` (11 lines)
**Purpose**: Root page component

```tsx
'use client';

import MultiVehicleTrafficSimulator from '@/components/MultiVehicleTrafficSimulator';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <MultiVehicleTrafficSimulator />
    </main>
  );
}
```

**Characteristics**:
- Client-side rendering (`'use client'` directive)
- Single component mounting
- Full-screen layout

---

### 2. `MultiVehicleTrafficSimulator.tsx` (659 lines)
**Purpose**: Main UI controller and state manager

#### State Management

**Core Simulation State**:
```typescript
const [simulationState, setSimulationState] = useState<SimulationState | null>(null);
const [vehicles, setVehicles] = useState<Vehicle[]>([]);
const [vehicleStats, setVehicleStats] = useState<VehicleStatistics | null>(null);
const [trafficStats, setTrafficStatistics] = useState<TrafficStatistics | null>(null);
const [edgeTraffic, setEdgeTraffic] = useState<EdgeTrafficData[]>([]);
```

**Traffic Control State**:
```typescript
const [accidents, setAccidents] = useState<Accident[]>([]);
const [blockedRoads, setBlockedRoads] = useState<BlockedRoad[]>([]);
const [simulationInfo, setSimulationInfo] = useState<SimulationInfo | null>(null);
```

**UI State**:
```typescript
const [isRunning, setIsRunning] = useState(false);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string>('');
const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
const [currentMap, setCurrentMap] = useState<string>('city');
const [highlightedVehicle, setHighlightedVehicle] = useState<string | null>(null);
const [isFullscreen, setIsFullscreen] = useState(false);
```

**Spawn Configuration**:
```typescript
const [vehicleCount, setVehicleCount] = useState(25);
const [carProbability, setCarProbability] = useState(60);      // 60%
const [bikeProbability, setBikeProbability] = useState(25);    // 25%
const [pedestrianProbability, setPedestrianProbability] = useState(15); // 15%
```

**Simulation Settings**:
```typescript
const [autoSpawn, setAutoSpawn] = useState(true);
const [simulationSpeed, setSimulationSpeed] = useState(100);   // 100ms = 10 FPS
```

#### Key Effects

**1. Initialization Effect**:
```typescript
useEffect(() => {
  const initializeApp = async () => {
    // 1. Health check backend
    await api.healthCheck();
    setApiStatus('connected');
    
    // 2. Get available maps
    const mapsInfo = await api.getMaps();
    setAvailableMaps(mapsInfo.maps);
    
    // 3. Load current map data
    const mapData = await api.getMapData();
    setMapData(mapData);
    
    // 4. Get initial simulation state
    await refreshSimulationState();
    
    // 5. Auto-spawn initial vehicles (after 1 second)
    setTimeout(() => {
      api.spawnMultipleVehicles(25, distribution);
    }, 1000);
  };
  
  initializeApp();
}, []);
```

**2. Auto-Simulation Loop**:
```typescript
useEffect(() => {
  if (!isRunning || apiStatus !== 'connected') return;
  
  const interval = setInterval(async () => {
    // Execute simulation tick
    await api.simulationTick();
    
    // Refresh state
    await refreshSimulationState();
    await refreshTrafficControlData();
    
    // Auto-spawn more vehicles if needed
    if (autoSpawn && vehicles.length < vehicleCount * 3) {
      await api.spawnMultipleVehicles(3, distribution);
    }
  }, simulationSpeed);  // 25-500ms interval
  
  return () => clearInterval(interval);
}, [isRunning, apiStatus, simulationSpeed, autoSpawn, vehicles.length]);
```

**Update Frequency Calculation**:
```
FPS = 1000 / simulationSpeed

Examples:
- 25ms → 40 FPS (very smooth)
- 100ms → 10 FPS (smooth, default)
- 500ms → 2 FPS (slow)
```

#### Key Handlers

**Map Control**:
```typescript
const handleSwitchMap = async (mapName: string) => {
  await api.switchMap(mapName);
  setCurrentMap(mapName);
  const mapData = await api.getMapData();
  setMapData(mapData);
  await handleResetSimulation();
};
```

**Vehicle Spawning**:
```typescript
const handleSpawnVehicles = async () => {
  const distribution = {
    car: carProbability / 100,
    bicycle: bikeProbability / 100,
    pedestrian: pedestrianProbability / 100,
  };
  
  await api.spawnMultipleVehicles(vehicleCount, distribution);
  await refreshSimulationState();
};
```

**Simulation Control**:
```typescript
const handleStartSimulation = () => {
  setIsRunning(true);
};

const handleStopSimulation = () => {
  setIsRunning(false);
};

const handleResetSimulation = async () => {
  setIsRunning(false);
  await api.resetSimulation();
  await refreshSimulationState();
};

const handleManualTick = async () => {
  await api.simulationTick();
  await refreshSimulationState();
};
```

**Traffic Control**:
```typescript
const handleCreateAccident = async (fromNode?: string, toNode?: string) => {
  await api.createAccident(fromNode, toNode);
  await refreshTrafficControlData();
};

const handleBlockRoad = async (fromNode: string, toNode: string, reason: string) => {
  await api.blockRoad(fromNode, toNode, reason);
  await refreshTrafficControlData();
};
```

#### Layout Structure

**Normal View**:
```
┌─────────────────────────────────────────────────────────┐
│ Header: Title + API Status + Map Selector               │
│ Statistics Bar: Step | Total | Active | Arrived | etc.  │
├─────────────────────────────────────────────────────────┤
│ Main Content:                                            │
│ ┌─────────────────────────────┬─────────────────────┐   │
│ │ Map Visualization           │ Traffic Control     │   │
│ │ (SVG Canvas)                │ Panel               │   │
│ │                             │ - Accidents         │   │
│ │                             │ - Blocked Roads     │   │
│ │                             │ - Create Controls   │   │
│ └─────────────────────────────┴─────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│ Bottom Control Panel:                                    │
│ ┌──────────┬──────────┬──────────────────────────────┐  │
│ │ Spawn    │ Sim      │ Active Vehicles List         │  │
│ │ Controls │ Controls │ (scrollable)                 │  │
│ └──────────┴──────────┴──────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Fullscreen View**:
```
┌─────────────────────────────────────────────────────────┐
│ Compact Header (overlay) + Exit Button                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│                                                          │
│              Full Map Visualization                      │
│                   (maximized)                            │
│                                                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

### 3. `MultiVehicleMapVisualization.tsx` (789 lines)
**Purpose**: SVG-based map rendering with vehicles

#### Component Props:
```typescript
interface Props {
  vehicles: Vehicle[];
  edgeTraffic: EdgeTrafficData[];
  mapData: GraphData;
  highlightedVehicle?: string | null;
  accidents?: Accident[];
  blockedRoads?: BlockedRoad[];
}
```

#### Local State:
```typescript
const [zoomLevel, setZoomLevel] = useState(1);              // 0.5 - 3.0
const [showCongestion, setShowCongestion] = useState(true);
const [showVehicles, setShowVehicles] = useState(true);
const [hoveredVehicle, setHoveredVehicle] = useState<Vehicle | null>(null);
const [tooltipPosition, setTooltipPosition] = useState<{x: number, y: number} | null>(null);
const [panPosition, setPanPosition] = useState({x: 0, y: 0});
const [isDragging, setIsDragging] = useState(false);
```

#### Rendering Constants:
```typescript
const SCALE = 110;           // Coordinate scaling factor
const OFFSET_X = 180;        // X offset for centering
const OFFSET_Y = 150;        // Y offset for centering
const WIDTH = 1600;          // Canvas width
const HEIGHT = 1100;         // Canvas height
```

#### Coordinate Transformations:
```typescript
const scaleX = (x: number) => x * SCALE + OFFSET_X;
const scaleY = (y: number) => HEIGHT - (y * SCALE + OFFSET_Y);

// Example:
// Node at (3, 5) → SVG position (510, 550)
```

#### Road Rendering with Curves

**Bidirectional Road Separation**:
```typescript
const getCurveOffset = (from, to, x1, y1, x2, y2, edgeIndex) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = sqrt(dx² + dy²);
  
  // Perpendicular direction for offset
  const perpX = -dy / length;
  const perpY = dx / length;
  
  const hasReverseEdge = mapData.edges.some(e => e.from === to && e.to === from);
  
  if (hasReverseEdge) {
    // Offset parallel roads
    const offset = min(length * 0.15, 25);
    const direction = edgeKey < reverseKey ? 1 : -1;
    
    return {
      cx: (x1 + x2) / 2 + perpX * offset * direction,
      cy: (y1 + y2) / 2 + perpY * offset * direction
    };
  } else {
    // Single road with slight curve
    const offsetAmount = min(length * 0.12, 40);
    return {
      cx: (x1 + x2) / 2 + perpX * offsetAmount,
      cy: (y1 + y2) / 2 + perpY * offsetAmount
    };
  }
};
```

**Quadratic Bezier Curve Path**:
```typescript
const pathD = `M ${x1} ${y1} Q ${curve.cx} ${curve.cy} ${x2} ${y2}`;

// M = Move to start point
// Q = Quadratic curve with control point
```

**Road Layers**:
```tsx
<g key={edgeIndex}>
  {/* 1. Shadow layer */}
  <path d={pathD} stroke="#1f2937" strokeWidth={12} strokeOpacity={0.2} />
  
  {/* 2. Main road with congestion color */}
  <path 
    d={pathD} 
    stroke={getCongestionColor(congestionLevel)} 
    strokeWidth={8}
  />
  
  {/* 3. Center line (yellow dashes) */}
  <path d={pathD} stroke="#fbbf24" strokeWidth={1} strokeDasharray="10,6" />
  
  {/* 4. Accident/blockage icons */}
  {accident && <text x={curve.cx} y={curve.cy}>⚠️</text>}
  {blocked && <text x={curve.cx} y={curve.cy}>🚧</text>}
  
  {/* 5. Vehicle count badge */}
  {vehicleCount > 0 && (
    <circle cx={curve.cx} cy={curve.cy} r={12} fill="white" />
    <text x={curve.cx} y={curve.cy}>{vehicleCount}</text>
  )}
</g>
```

**Congestion Color Mapping**:
```typescript
const getCongestionColor = (level: string): string => {
  switch (level) {
    case 'free_flow': return '#22c55e';  // Green
    case 'light': return '#84cc16';      // Lime
    case 'moderate': return '#eab308';   // Yellow
    case 'heavy': return '#f97316';      // Orange
    case 'congested': return '#ef4444';  // Red
    default: return '#9ca3af';           // Gray
  }
};
```

#### Vehicle Positioning

**Physics-Based Position Calculation**:
```typescript
const calculateVehiclePosition = (vehicle: Vehicle) => {
  const currentNode = mapData.nodes.find(n => n.id === vehicle.current_node);
  const nextNode = mapData.nodes.find(n => n.id === vehicle.next_node);
  
  if (!nextNode) {
    // Vehicle at node
    return { x: scaleX(currentNode.x), y: scaleY(currentNode.y) };
  }
  
  // Vehicle on edge
  const x1 = scaleX(currentNode.x);
  const y1 = scaleY(currentNode.y);
  const x2 = scaleX(nextNode.x);
  const y2 = scaleY(nextNode.y);
  
  // Get curve matching the road's curve
  const curve = getCurveOffset(vehicle.current_node, nextNode.id, x1, y1, x2, y2, edgeIndex);
  
  // Use exact position from backend (0.0 to 1.0)
  const progress = vehicle.position_on_edge || 0.0;
  
  // Calculate point on quadratic Bezier curve
  const point = getPointOnCurve(x1, y1, curve.cx, curve.cy, x2, y2, progress);
  
  return { x: point.x, y: point.y };
};
```

**Quadratic Bezier Formula**:
```typescript
const getPointOnCurve = (x1, y1, cx, cy, x2, y2, t) => {
  // B(t) = (1-t)² * P0 + 2(1-t)t * P1 + t² * P2
  const oneMinusT = 1 - t;
  const x = oneMinusT² * x1 + 2 * oneMinusT * t * cx + t² * x2;
  const y = oneMinusT² * y1 + 2 * oneMinusT * t * cy + t² * y2;
  return { x, y };
};
```

#### Node Rendering:
```tsx
{mapData.nodes.map(node => (
  <g key={node.id}>
    {/* Node circle */}
    <circle
      cx={scaleX(node.x)}
      cy={scaleY(node.y)}
      r={20}
      fill="white"
      stroke="#3b82f6"
      strokeWidth={3}
    />
    
    {/* Location icon */}
    <text fontSize="18" textAnchor="middle">
      {getPlaceIcon(node.id)}
    </text>
    
    {/* Node label */}
    <text fontSize="10" fontWeight="bold">
      {node.id}
    </text>
  </g>
))}
```

**Location Icon Mapping**:
```typescript
const getPlaceIcon = (nodeName: string): string => {
  const name = nodeName.toLowerCase();
  if (name.includes('seecs')) return '💻';
  if (name.includes('library')) return '📚';
  if (name.includes('cafeteria')) return '🍽️';
  if (name.includes('hospital')) return '🏥';
  if (name.includes('university')) return '🎓';
  if (name.includes('mall')) return '🛍️';
  if (name.includes('park')) return '🌳';
  if (name.includes('airport')) return '✈️';
  return '📍';
};
```

#### Vehicle Rendering:
```tsx
{showVehicles && vehicles.map(vehicle => {
  const position = calculateVehiclePosition(vehicle);
  if (!position) return null;
  
  return (
    <VehicleMarker
      key={vehicle.id}
      vehicle={vehicle}
      x={position.x}
      y={position.y}
      isHighlighted={highlightedVehicle === vehicle.id}
      onMouseEnter={(e) => {
        setHoveredVehicle(vehicle);
        setTooltipPosition({ x: e.clientX, y: e.clientY });
      }}
      onMouseLeave={() => {
        setHoveredVehicle(null);
        setTooltipPosition(null);
      }}
    />
  );
})}
```

#### Interaction Features:

**Zoom Control**:
```typescript
const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.2, 3));
const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
const handleWheel = (e: WheelEvent) => {
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  setZoomLevel(prev => Math.max(0.5, Math.min(3, prev + delta)));
};
```

**Pan Control**:
```typescript
const handleMouseDown = (e: MouseEvent) => {
  setIsDragging(true);
  setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
};

const handleMouseMove = (e: MouseEvent) => {
  if (isDragging) {
    setPanPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }
};
```

**SVG Transform**:
```tsx
<div style={{
  transform: `translate(${panPosition.x}px, ${panPosition.y}px)`,
  transition: isDragging ? 'none' : 'transform 0.1s ease-out'
}}>
  <svg width={WIDTH * zoomLevel} height={HEIGHT * zoomLevel}>
    <g transform={`scale(${zoomLevel})`}>
      {/* Map content */}
    </g>
  </svg>
</div>
```

---

### 4. `VehicleMarker.tsx`
**Purpose**: Individual vehicle icon component

```typescript
interface Props {
  vehicle: Vehicle;
  x: number;
  y: number;
  isHighlighted: boolean;
  onMouseEnter: (e: MouseEvent) => void;
  onMouseLeave: () => void;
}

const VehicleMarker: React.FC<Props> = ({ vehicle, x, y, isHighlighted, ... }) => {
  const emoji = VEHICLE_EMOJI[vehicle.type];  // 🚗 🚴 🚶
  const statusColor = getStatusColor(vehicle.status);
  
  return (
    <g
      transform={`translate(${x}, ${y})`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: 'pointer' }}
    >
      {/* Glow effect if highlighted */}
      {isHighlighted && (
        <circle r={25} fill="yellow" opacity={0.3} />
      )}
      
      {/* Status indicator circle */}
      <circle r={15} fill={statusColor} opacity={0.8} />
      
      {/* Vehicle emoji */}
      <text fontSize="16" textAnchor="middle" dominantBaseline="middle">
        {emoji}
      </text>
      
      {/* Status badge */}
      {vehicle.status === 'stuck' && (
        <text y={20} fontSize="12">⚠️</text>
      )}
    </g>
  );
};
```

---

### 5. `VehicleDetailsTooltip.tsx`
**Purpose**: Hover tooltip showing vehicle details

```typescript
interface Props {
  vehicle: Vehicle;
  x: number;
  y: number;
}

const VehicleDetailsTooltip: React.FC<Props> = ({ vehicle, x, y }) => {
  return (
    <div
      className="absolute z-50 bg-white border-2 border-gray-300 rounded-lg shadow-2xl p-3"
      style={{ left: x + 15, top: y + 15 }}
    >
      <div className="text-sm">
        <div className="font-bold">{vehicle.id}</div>
        <div className="text-gray-600">
          Type: {vehicle.type} {VEHICLE_EMOJI[vehicle.type]}
        </div>
        <div className="text-gray-600">
          Route: {vehicle.current_node} → {vehicle.goal_node}
        </div>
        <div className="text-gray-600">
          Status: <span className={statusColorClass}>{vehicle.status}</span>
        </div>
        <div className="text-gray-600">
          Speed: {vehicle.current_speed.toFixed(1)} px/s
        </div>
        <div className="text-gray-600">
          Position: {(vehicle.position_on_edge * 100).toFixed(0)}% along edge
        </div>
        {vehicle.reroute_count > 0 && (
          <div className="text-orange-600">
            Reroutes: {vehicle.reroute_count}
          </div>
        )}
        {vehicle.wait_time > 0 && (
          <div className="text-red-600">
            Wait time: {vehicle.wait_time.toFixed(1)}s
          </div>
        )}
      </div>
    </div>
  );
};
```

---

### 6. `TrafficStatsDashboard.tsx`
**Purpose**: Display analytics and statistics

```typescript
interface Props {
  vehicleStats: VehicleStatistics;
  trafficStats: TrafficStatistics;
}

const TrafficStatsDashboard: React.FC<Props> = ({ vehicleStats, trafficStats }) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Vehicle Stats */}
      <StatCard
        title="Total Vehicles"
        value={vehicleStats.total_vehicles}
        icon="🚗"
      />
      <StatCard
        title="Active"
        value={vehicleStats.active_vehicles}
        icon="🟢"
        color="green"
      />
      <StatCard
        title="Arrived"
        value={vehicleStats.arrived_vehicles}
        icon="🏁"
        color="blue"
      />
      
      {/* Traffic Stats */}
      <StatCard
        title="Avg Congestion"
        value={`${(trafficStats.average_congestion_probability * 100).toFixed(0)}%`}
        icon="📊"
        color="orange"
      />
      <StatCard
        title="Bottlenecks"
        value={trafficStats.bottleneck_count}
        icon="🚧"
        color="red"
      />
      
      {/* Congestion Distribution */}
      <div className="col-span-3">
        <h3>Traffic Distribution</h3>
        <BarChart data={trafficStats.congestion_distribution} />
      </div>
    </div>
  );
};
```

---

### 7. `TrafficControlPanel.tsx`
**Purpose**: Traffic incident controls

```typescript
interface Props {
  accidents: Accident[];
  blockedRoads: BlockedRoad[];
  simulationInfo: SimulationInfo;
  availableEdges: Edge[];
  onCreateAccident: (from?: string, to?: string) => void;
  onResolveAccident: (id: string) => void;
  onBlockRoad: (from: string, to: string, reason: string) => void;
  onUnblockRoad: (from: string, to: string) => void;
}

const TrafficControlPanel: React.FC<Props> = ({ ... }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h2 className="font-bold">Traffic Control</h2>
      
      {/* Simulation Info */}
      <div className="mb-4">
        <div>Elapsed Time: {simulationInfo.elapsed_time.toFixed(0)}s</div>
        <div>Total Spawned: {simulationInfo.total_spawned}</div>
      </div>
      
      {/* Create Accident */}
      <button onClick={() => onCreateAccident()}>
        Create Random Accident
      </button>
      
      {/* Active Accidents */}
      <div className="mt-4">
        <h3>Active Accidents ({accidents.length})</h3>
        {accidents.map(accident => (
          <div key={accident.id} className="border p-2">
            <div>⚠️ {accident.from_node} → {accident.to_node}</div>
            <div>Severity: {accident.severity}</div>
            <button onClick={() => onResolveAccident(accident.id)}>
              Resolve
            </button>
          </div>
        ))}
      </div>
      
      {/* Blocked Roads */}
      <div className="mt-4">
        <h3>Blocked Roads ({blockedRoads.length})</h3>
        {blockedRoads.map(blocked => (
          <div key={`${blocked.from_node}-${blocked.to_node}`}>
            <div>🚧 {blocked.from_node} → {blocked.to_node}</div>
            <div>Reason: {blocked.reason}</div>
            <button onClick={() => onUnblockRoad(blocked.from_node, blocked.to_node)}>
              Unblock
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 🌐 API Client (`lib/api.ts`)

### API Structure:
```typescript
export const api = {
  // Health & Map
  healthCheck(): Promise<{message: string}>,
  getNodes(): Promise<string[]>,
  getMaps(): Promise<{maps: string[], current: string}>,
  switchMap(mapName: string): Promise<any>,
  getMapData(): Promise<GraphData>,
  
  // Pathfinding
  getPath(start: string, goal: string, mode: string): Promise<PathResponse>,
  
  // Vehicle Management
  spawnVehicle(type: VehicleType, start?: string, goal?: string): Promise<SpawnVehicleResponse>,
  spawnMultipleVehicles(count: number, distribution?: Record<string, number>): Promise<SpawnMultipleResponse>,
  getAllVehicles(): Promise<{vehicles: Vehicle[], count: number}>,
  getVehicle(id: string): Promise<Vehicle>,
  deleteVehicle(id: string): Promise<any>,
  
  // Simulation Control
  simulationTick(): Promise<SimulationTickResponse>,
  getSimulationState(): Promise<SimulationState>,
  resetSimulation(): Promise<any>,
  startContinuousSimulation(duration: number, spawnRate: number): Promise<any>,
  stopSimulation(): Promise<any>,
  
  // Traffic Control
  createAccident(from?: string, to?: string): Promise<any>,
  resolveAccident(id: string): Promise<any>,
  getAccidents(): Promise<any>,
  blockRoad(from: string, to: string, reason: string): Promise<any>,
  unblockRoad(from: string, to: string): Promise<any>,
  getBlockedRoads(): Promise<any>,
  
  // Analytics
  getTrafficStatistics(): Promise<any>,
  getCongestionReport(): Promise<any>,
  getEdgeTraffic(): Promise<{edges: EdgeTrafficData[]}>,
  getSimulationInfo(): Promise<SimulationInfo>
};
```

### Example API Call:
```typescript
async spawnVehicle(vehicleType: VehicleType, startNode?: string, goalNode?: string) {
  const response = await fetch(`${API_BASE_URL}/spawn_vehicle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vehicle_type: vehicleType,
      start_node: startNode,
      goal_node: goalNode,
    }),
  });
  
  if (!response.ok) throw new Error('Failed to spawn vehicle');
  return response.json();
}
```

---

## 📊 TypeScript Types (`lib/types.ts`)

### Core Interfaces:

```typescript
// Vehicle
export interface Vehicle {
  id: string;
  type: VehicleType;
  start_node: string;
  goal_node: string;
  current_node: string;
  next_node: string | null;
  path: string[];
  path_index: number;
  status: VehicleStatus;
  speed_multiplier: number;
  capacity_usage: number;
  total_distance: number;
  wait_time: number;
  reroute_count: number;
  travel_time: number | null;
  position_on_edge: number;  // 0.0-1.0
  current_speed: number;      // pixels/second
}

// Map Data
export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export interface Node {
  id: string;
  x: number;
  y: number;
}

export interface Edge {
  from: string;
  to: string;
  distance: number;
  allowed_modes: string[];
  one_way: boolean;
}

// Traffic Analysis
export interface EdgeTrafficData {
  from: string;
  to: string;
  density: number;
  congestion_level: 'free_flow' | 'light' | 'moderate' | 'heavy' | 'congested';
  congestion_probability: number;
  vehicle_count: number;
  capacity: number;
}

// Statistics
export interface VehicleStatistics {
  total_vehicles: number;
  active_vehicles: number;
  arrived_vehicles: number;
  average_travel_time: number;
  average_wait_time: number;
  total_reroutes: number;
  vehicles_by_type: {
    car: number;
    bicycle: number;
    pedestrian: number;
  };
}

export interface TrafficStatistics {
  average_density: number;
  average_congestion_probability: number;
  total_edges: number;
  congestion_distribution: {
    free_flow: number;
    light: number;
    moderate: number;
    heavy: number;
    congested: number;
  };
  bottleneck_count: number;
  top_bottlenecks: Array<{from: string, to: string, density: number}>;
}
```

---

## 🎨 Styling Strategy

### Tailwind CSS Classes Used:

**Layout**:
- `min-h-screen`, `flex`, `flex-col`, `container`, `mx-auto`
- `grid`, `grid-cols-{n}`, `gap-{n}`
- `px-{n}`, `py-{n}`, `p-{n}`, `m-{n}`

**Components**:
- `bg-white`, `border`, `rounded-lg`, `shadow-lg`
- `text-{size}`, `font-{weight}`, `text-{color}`

**Interactive**:
- `hover:bg-{color}`, `transition`, `cursor-pointer`
- `disabled:bg-gray-400`, `disabled:cursor-not-allowed`

**Responsive**:
- `md:grid-cols-4`, `sm:text-sm`

### Color System:
```
Status Colors:
- Green (#22c55e): Free flow, moving
- Yellow (#eab308): Moderate, rerouting
- Orange (#f97316): Heavy traffic, accidents
- Red (#ef4444): Congested, stuck, blocked
- Blue (#3b82f6): Arrived
- Gray (#6b7280): Waiting, neutral
```

---

## 🔄 Data Flow

### Initialization Flow:
```
1. User loads page
2. page.tsx renders
3. MultiVehicleTrafficSimulator mounts
4. useEffect runs:
   - api.healthCheck()
   - api.getMaps()
   - api.getMapData()
   - api.getSimulationState()
5. Auto-spawn initial vehicles
6. Update UI state
```

### Simulation Loop:
```
Every {simulationSpeed}ms while isRunning=true:
1. api.simulationTick()
2. Backend:
   - Updates all vehicle positions
   - Recalculates traffic
   - Handles rerouting
3. api.getSimulationState()
4. Backend returns updated state
5. Frontend updates:
   - setVehicles()
   - setVehicleStats()
   - setTrafficStats()
   - setEdgeTraffic()
6. React re-renders components
7. SVG updates vehicle positions
```

### User Interaction Flow:
```
User clicks "Spawn Vehicles"
    ↓
handleSpawnVehicles()
    ↓
api.spawnMultipleVehicles(count, distribution)
    ↓
Backend creates vehicles with A* paths
    ↓
refreshSimulationState()
    ↓
UI updates with new vehicles
```

---

## 🚀 Performance Optimizations

1. **Memoization**: Use React.memo for expensive components
2. **Callback Stability**: useCallback for event handlers
3. **Lazy Rendering**: Only render visible vehicles (viewport culling could be added)
4. **SVG Optimization**: Use transforms instead of re-calculating coordinates
5. **Debouncing**: Limit API calls during rapid interactions
6. **State Batching**: React 19 automatic batching

---

## 📱 Responsive Design

- Desktop: Full layout with sidebar
- Tablet: Stacked layout
- Mobile: Simplified controls, fullscreen map priority
- Fullscreen mode: Dedicated large-screen view

---

**Last Updated**: December 2, 2025
