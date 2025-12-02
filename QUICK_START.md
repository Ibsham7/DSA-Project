# Quick Start Guide - Multi-Vehicle Traffic Simulator

## 🚀 Getting Started

### Prerequisites
- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn

### Installation & Running

#### 1. Start the Backend API
```powershell
cd Backend
pip install fastapi uvicorn pydantic
python -m uvicorn api:app --reload
```
The API will start on `http://localhost:8000`

#### 2. Start the Frontend
```powershell
cd Frontend/traffic-sim-frontend
npm install
npm run dev
```
The application will open on `http://localhost:3000`

## 📖 How to Use

### Basic Workflow
1. **Select Map**: Choose from City, NUST Campus, or Simple Network
2. **Spawn Vehicles**: 
   - Set vehicle count (1-50)
   - Adjust distribution (Cars: 60%, Bikes: 25%, Pedestrians: 15%)
   - Click "Spawn Vehicles"
3. **Configure Simulation**:
   - Set speed (500-3000ms per tick)
   - Enable auto-spawn for continuous traffic
4. **Start Simulation**: Click "▶ Start Simulation"
5. **Watch Traffic**: See vehicles navigate, reroute, and cause congestion!

### Understanding the Display

#### Map Colors (Roads)
- 🟢 **Green**: Free flow traffic
- 🟡 **Yellow**: Moderate traffic
- 🔴 **Red**: Heavy congestion

#### Vehicle Status
- **Moving** (Green): Navigating normally
- **Stuck** (Red): In traffic congestion
- **Rerouting** (Yellow): Calculating new path
- **Arrived** (Blue): Reached destination

#### Statistics Dashboard
- **Vehicle Stats**: Total, active, arrived counts
- **Traffic Analysis**: Congestion probability and density
- **Bottlenecks**: Top congested locations
- **Road Conditions**: Percentage distribution across traffic levels

### Advanced Features

#### Manual Control
- **Manual Step**: Execute one simulation tick manually
- **Highlight Vehicle**: Click on vehicle in list to highlight on map
- **Toggle Views**: Show/hide congestion overlay and vehicles

#### Congestion Analysis
- Red badges on roads show vehicle count
- Percentage values show congestion probability
- Dashboard displays top bottleneck locations
- Real-time traffic level distribution graph

## 🎯 DSA Concepts in Action

### While Using, Observe:

1. **A* Pathfinding**:
   - Vehicles take shortest routes considering traffic
   - Watch them avoid congested roads

2. **Dynamic Rerouting**:
   - When traffic builds up, vehicles recalculate paths
   - Reroute count increases in vehicle details

3. **Traffic Probability**:
   - More vehicles on a road = higher congestion probability
   - See percentage indicators on congested edges

4. **Bottleneck Detection**:
   - Dashboard shows worst congested intersections
   - Helps identify network problems

5. **Real-Time Statistics**:
   - Average travel times update live
   - Vehicle distribution changes dynamically

## 🔧 Troubleshooting

### Backend not connecting?
- Ensure API is running on port 8000
- Check console for error messages
- Verify all Python dependencies installed

### Vehicles not moving?
- Make sure simulation is started (green play button)
- Check that vehicles were spawned
- Verify backend API is responding

### Performance issues?
- Reduce vehicle count (<20 recommended for smooth animation)
- Increase simulation speed (higher ms value)
- Disable auto-spawn if too many vehicles

## 💡 Tips for Best Experience

1. **Start Small**: Begin with 5-10 vehicles to understand the system
2. **Watch Patterns**: Notice how traffic builds up at intersections
3. **Experiment**: Try different vehicle distributions
4. **Use Manual Mode**: Step through simulation for detailed observation
5. **Highlight Vehicles**: Track individual vehicle journeys

## 📊 Key Metrics to Watch

- **Congestion Probability**: >70% means likely traffic jam
- **Average Wait Time**: Indicates overall network efficiency
- **Reroute Count**: Shows adaptive routing effectiveness
- **Bottleneck Count**: Network stress indicator

## 🎓 Educational Use

### For Presentations:
1. Show different traffic scenarios
2. Demonstrate A* algorithm with path visualization
3. Explain congestion probability calculation
4. Compare different vehicle distributions

### For Analysis:
- Export statistics for reporting
- Screenshot congestion patterns
- Analyze bottleneck formation
- Study rerouting behavior

## 🌟 Cool Things to Try

1. **Traffic Jam Experiment**: Spawn 30+ vehicles and watch congestion form
2. **Rush Hour Simulation**: Use auto-spawn with high vehicle count
3. **Mode Comparison**: Run with only cars vs. mixed traffic
4. **Bottleneck Analysis**: Identify which intersections congest first
5. **Rerouting Test**: Watch vehicles adapt to changing conditions

Enjoy your traffic simulation! 🚗🚴🚶
