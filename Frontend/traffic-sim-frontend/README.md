# Traffic Simulation Frontend

A Next.js web application for visualizing and interacting with the Traffic Simulation backend API. Features real-time pathfinding, traffic visualization, and step-by-step simulation.

## Features

- 🗺️ **Interactive Network Map** - Visual representation of nodes and edges
- 🚗 **Multi-Mode Transportation** - Support for car, bicycle, and pedestrian routes
- 🔍 **A* Pathfinding** - Find optimal routes with current traffic conditions
- 🚦 **Dynamic Traffic** - Real-time traffic updates affecting route calculations
- 🎬 **Step-by-Step Simulation** - Watch agents navigate and reroute based on traffic
- 📊 **Traffic Statistics** - View current traffic levels for all edges
- 🎨 **Color-Coded Visualization** - Easy identification of traffic levels and path status

## Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:8000`

## Installation

Dependencies are already installed. If needed, run:
```bash
npm install
```

## Running the Application

### Development Mode
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Build
```bash
npm run build
npm start
```

## Usage

### Finding a Path

1. Select a **Start Node** from the dropdown
2. Select a **Goal Node** from the dropdown
3. Choose a **Transportation Mode** (car, bicycle, or pedestrian)
4. Click **Find Path** to calculate the optimal route

The calculated path will be displayed on the map in blue, and the total cost will be shown in the Path Information panel.

### Updating Traffic

Click **Update Traffic** to apply random traffic changes to the network. The edges will change color based on traffic levels:
- 🟢 Green: Low traffic (0.5-1.0x)
- 🟡 Yellow: Medium traffic (1.0-2.0x)
- 🔴 Red: High traffic (2.0-3.0x)

### Running a Simulation

1. First, find a path using the **Find Path** button
2. Click **Start Simulation** to begin the step-by-step simulation
3. Watch as the agent (orange node) moves through the network
4. Traffic updates occur at each step, potentially causing rerouting
5. Click **Stop Simulation** to pause or **Reset** to start over

## Map Legend

- 🟢 **Green Node**: Start position
- 🔴 **Red Node**: Goal position
- 🟠 **Orange Node**: Current agent position (during simulation)
- 🔵 **Blue Node**: Node on the calculated path
- ⚪ **Gray Node**: Standard node
- **Solid Lines**: Bidirectional edges
- **Dashed Lines**: One-way edges

## Project Structure

```
traffic-sim-frontend/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Home page
│   └── globals.css         # Global styles
├── components/
│   ├── TrafficSimulator.tsx    # Main application component
│   └── GraphVisualization.tsx  # SVG-based graph renderer
├── lib/
│   ├── api.ts              # API client functions
│   ├── types.ts            # TypeScript types and utilities
│   └── graphData.ts        # Static graph structure
└── public/                 # Static assets
```

## API Endpoints Used

- `GET /` - Health check
- `GET /nodes` - Fetch available nodes
- `GET /path` - Calculate shortest path
- `POST /update_traffic` - Update traffic conditions
- `POST /simulate_step` - Simulate one step with traffic updates

## Configuration

### Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL (default: `http://localhost:8000`)

Edit `.env.local` to change the backend URL if needed.

### Graph Data

The graph structure is defined in `lib/graphData.ts` and mirrors the backend's `map.json`. If you modify the backend map, update this file accordingly.

## Technologies

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **SVG** - Graph visualization
- **Fetch API** - Backend communication

## Troubleshooting

### Backend Connection Failed

If you see "Backend Disconnected":
1. Ensure the backend server is running: `uvicorn api:app --reload` (from Backend directory)
2. Check the backend is accessible at `http://localhost:8000`
3. Verify CORS is enabled in the backend (add CORS middleware if needed)

### No Path Found

This can occur when:
- The selected transportation mode is not allowed on any connecting route
- Start and goal nodes are the same
- There's a one-way restriction preventing access

## Quick Start Guide

1. **Start the Backend** (in a separate terminal):
   ```bash
   cd Backend
   uvicorn api:app --reload
   ```

2. **Start the Frontend**:
   ```bash
   cd Frontend/traffic-sim-frontend
   npm run dev
   ```

3. **Open your browser** to `http://localhost:3000`

4. **Try it out**:
   - Select Start: A, Goal: I, Mode: car
   - Click "Find Path"
   - Click "Update Traffic" a few times
   - Click "Start Simulation" to watch the agent navigate

## License

This project is part of a DSA demonstration project.
