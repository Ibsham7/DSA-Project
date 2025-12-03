# Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will help you get the traffic simulation running quickly.

---

## Prerequisites

### Required Software

**Backend**:
- Python 3.10 or higher
- pip (Python package manager)

**Frontend**:
- Node.js 18 or higher
- npm or yarn

**Check Versions**:
```bash
python --version   # Should be 3.10+
node --version     # Should be 18+
npm --version      # Any recent version
```

---

## Step 1: Clone or Download

If you have the project folder, navigate to it:
```bash
cd DSA-Project
```

---

## Step 2: Start the Backend

### Install Backend Dependencies

```bash
cd Backend
pip install fastapi uvicorn
```

**Alternative** (if you have requirements.txt):
```bash
pip install -r requirements.txt
```

### Start the Backend Server

```bash
uvicorn api:app --reload
```

**Expected Output**:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345]
INFO:     Started server process [12346]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**✅ Backend is now running on http://localhost:8000**

**Test It**:
Open http://localhost:8000 in your browser. You should see:
```json
{"message": "Traffic Simulation API running"}
```

---

## Step 3: Start the Frontend

**Open a new terminal** (keep backend running)

### Install Frontend Dependencies

```bash
cd Frontend/traffic-sim-frontend
npm install
```

This will install:
- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4

**Installation takes 1-3 minutes**

### Start the Development Server

```bash
npm run dev
```

**Expected Output**:
```
  ▲ Next.js 16.0.5
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

 ✓ Ready in 2.5s
```

**✅ Frontend is now running on http://localhost:3000**

---

## Step 4: Open the Application

1. Open your browser
2. Navigate to **http://localhost:3000**
3. You should see the Traffic Simulation interface

**Connection Status**:
- Look for green dot indicating "Connected" in the top-left

---

## Step 5: Run Your First Simulation

### Basic Workflow:

**1. Spawn Vehicles**
- At the bottom panel, you'll see "Spawn Controls"
- Default is 25 vehicles (60% cars, 25% bikes, 15% pedestrians)
- Click **"Spawn Vehicles"** button

**2. Start Simulation**
- Click the green **"▶ Start Simulation"** button
- Vehicles will start moving automatically
- Watch them navigate the city map

**3. Observe Traffic**
- Roads change color based on congestion:
  - 🟢 Green = Free flow
  - 🟡 Yellow = Moderate traffic
  - 🔴 Red = Heavy congestion
- Vehicles automatically reroute around congestion
- Statistics update in real-time at the top

**4. Experiment**
- Try the **"Create Random Accident"** button
- Watch vehicles reroute around the accident
- Adjust simulation speed (2-40 FPS)
- Switch between different maps

---

## Common Controls

### Spawn Controls
```
Vehicle Count Slider:  1-50 vehicles
Car %:                 0-100%
Bicycle %:             0-100%
Pedestrian %:          0-100%
[Spawn Vehicles]       Create vehicles with distribution
```

### Simulation Controls
```
Update Rate:           25-500ms (40-2 FPS)
☑ Auto-spawn vehicles  Continuously add new vehicles
[▶ Start Simulation]   Begin simulation loop
[⏸ Stop Simulation]    Pause simulation
[⏭ Manual Step]        Execute single tick
[🔄 Reset]             Clear all vehicles
```

### Map Selection
```
Dropdown at top:
- 🏙️ City Map         (12 nodes, complex)
- 🎓 NUST Campus      (Campus layout)
- 📍 Simple Network   (Basic testing)
```

---

## Understanding the Interface

### Top Statistics Bar
```
Step:        Current simulation tick number
Total:       All vehicles spawned
Active:      Vehicles still moving
Arrived:     Vehicles reached destination
Congestion:  Average congestion percentage
Bottlenecks: Number of heavily congested roads
```

### Map Visualization
- **Nodes**: Location markers (🏢 🏥 🏫 etc.)
- **Roads**: Lines connecting locations
  - Dashed = One-way road
  - Solid = Two-way road
  - Color = Congestion level
- **Vehicles**: Moving icons (🚗 🚴 🚶)
  - Click to highlight
  - Hover for details

### Vehicle List (Bottom Right)
- Shows active vehicles
- Color-coded status:
  - 🟢 Moving
  - 🔴 Stuck (in traffic)
  - 🟡 Rerouting
- Click to highlight on map

---

## Typical Usage Scenarios

### Scenario 1: Light Traffic
```
1. Spawn 10 vehicles
2. Start simulation
3. Watch smooth flow
4. Observe occasional rerouting
```

### Scenario 2: Heavy Congestion
```
1. Spawn 40+ vehicles
2. Set auto-spawn ON
3. Start simulation
4. Watch traffic buildup
5. See extensive rerouting
6. Check congestion report
```

### Scenario 3: Traffic Incidents
```
1. Spawn 20 vehicles
2. Start simulation
3. Click "Create Random Accident"
4. Watch vehicles reroute
5. Wait for accident to auto-resolve
6. Traffic normalizes
```

### Scenario 4: Road Blockage
```
1. Spawn vehicles
2. Start simulation
3. In Traffic Control panel:
   - Select edge from dropdown
   - Click "Block Road"
4. Watch vehicles avoid blocked road
5. Click "Unblock" to restore
```

---

## Keyboard Shortcuts

- **F11**: Browser fullscreen
- **ESC**: Exit fullscreen map view
- **Click + Drag**: Pan map
- **Scroll Wheel**: Zoom in/out

---

## Tips for Best Experience

### Performance
- For smooth animation: Use 100ms update rate (10 FPS)
- For detailed observation: Use 500ms (2 FPS)
- For maximum realism: Use 25-50ms (20-40 FPS)

### Visualization
- Enable "Show Congestion" to see traffic patterns
- Use fullscreen mode for presentations
- Highlight vehicles to track individual journeys

### Experimentation
- Try different vehicle distributions (all cars vs mixed)
- Compare maps (simple vs complex networks)
- Create multiple accidents to see cascading effects
- Monitor statistics to understand traffic dynamics

---

## Troubleshooting

### Backend Won't Start

**Error**: `ModuleNotFoundError: No module named 'fastapi'`
```bash
pip install fastapi uvicorn
```

**Error**: `Address already in use`
```bash
# Kill process on port 8000
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:8000 | xargs kill -9
```

### Frontend Won't Start

**Error**: `Cannot find module`
```bash
# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Error**: `Port 3000 already in use`
```bash
# Use different port
npm run dev -- -p 3001
```

### Frontend Shows "Disconnected"

**Checklist**:
1. ✅ Backend is running (check http://localhost:8000)
2. ✅ CORS is enabled in backend
3. ✅ No firewall blocking
4. ✅ Correct API URL in `lib/types.ts`

**Fix**:
```typescript
// In Frontend/traffic-sim-frontend/lib/types.ts
export const API_BASE_URL = 'http://localhost:8000';  // Verify this
```

### Vehicles Not Moving

**Possible Causes**:
1. Simulation not started (click ▶ Start)
2. No path exists (check console for errors)
3. All roads blocked
4. All vehicles arrived

**Solution**:
- Click Reset
- Spawn new vehicles
- Check for blocked roads in Traffic Control panel

### Slow Performance

**If laggy with many vehicles**:
1. Reduce vehicle count
2. Increase update interval (slower FPS)
3. Disable congestion visualization
4. Close other browser tabs

---

## Next Steps

Once you're comfortable with basics:

1. **Read Full Documentation**:
   - `PROJECT_OVERVIEW.md` - Architecture details
   - `BACKEND_DOCUMENTATION.md` - Algorithm explanations
   - `FRONTEND_DOCUMENTATION.md` - Component details
   - `API_REFERENCE.md` - Complete API docs

2. **Explore Code**:
   - `Backend/pathfinder.py` - See A* implementation
   - `Backend/vehicle.py` - Physics simulation
   - `Frontend/components/MultiVehicleMapVisualization.tsx` - Rendering

3. **Customize**:
   - Create your own map in `Backend/*.json`
   - Modify vehicle speeds in `vehicle.py`
   - Adjust congestion thresholds in `traffic_analyzer.py`
   - Customize UI colors in frontend components

4. **Extend**:
   - Add new vehicle types
   - Implement traffic lights
   - Add public transportation
   - Create weather effects

---

## Support

**Common Resources**:
- Project documentation in root folder
- Code comments throughout files
- FastAPI docs: https://fastapi.tiangolo.com/
- Next.js docs: https://nextjs.org/docs
- React docs: https://react.dev/

**Debugging**:
- Backend logs in terminal running `uvicorn`
- Frontend logs in browser console (F12)
- Network requests in browser DevTools

---

## Summary Commands

**Backend**:
```bash
cd Backend
pip install fastapi uvicorn
uvicorn api:app --reload
```

**Frontend** (new terminal):
```bash
cd Frontend/traffic-sim-frontend
npm install
npm run dev
```

**Access**:
- Backend API: http://localhost:8000
- Frontend UI: http://localhost:3000

**Enjoy simulating traffic! 🚗🚴🚶**

---

**Last Updated**: December 2, 2025
