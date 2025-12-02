# Traffic Simulator UI Guide

## Understanding the Visual Elements

### Red Dots with Numbers 🔴
**What they represent:** The red dots with numbers show **how many vehicles are currently on each road segment (edge)**.

- **Location:** Positioned at the midpoint of each curved road path
- **Number:** Displays the count of vehicles currently traveling on that specific road
- **Purpose:** Helps visualize traffic density at a glance
- **Traffic indicator:** Higher numbers indicate busier roads and potential congestion

### Vehicle Colors & Status
Each vehicle (car 🚗, bike 🚴, pedestrian 🚶) has a colored ring around it showing its status:

- **🟢 Green:** Moving normally along its path
- **🟡 Yellow:** Waiting (stuck in traffic or at intersection)
- **🟣 Purple:** Rerouting to avoid congestion
- **🔵 Blue:** Arrived at destination

### Road Colors (Congestion Levels)
Roads change color based on traffic congestion:

- **Gray:** Free flowing traffic (fast)
- **Green:** Light traffic
- **Yellow:** Moderate traffic
- **Orange:** Heavy traffic (slower)
- **Red:** Severe congestion (very slow)

### Blue Dots with Numbers 🔵
**Location:** On the nodes (intersections/places)
**Meaning:** Number of vehicles currently at that intersection

## Top Statistics Bar

The horizontal bar at the top shows real-time traffic metrics:

- **Step:** Current simulation tick/step number
- **Total Vehicles:** All vehicles ever spawned
- **Active:** Currently moving/waiting vehicles
- **Arrived:** Vehicles that reached their destination
- **Congestion:** Overall network congestion percentage
- **Bottlenecks:** Number of severely congested roads

## How Rerouting Works

1. Vehicles continuously monitor traffic ahead (next 3 road segments)
2. If congestion probability exceeds 50% on upcoming roads, they reroute
3. The purple status ring indicates a vehicle is calculating a new path
4. **Reroute count** in the vehicle tooltip shows how many times it changed route
5. This creates realistic traffic behavior where vehicles avoid jams

## Smooth Animations

Vehicles now animate smoothly between positions using:
- **0.8s transition** with easing curve for natural movement
- **Pulse effect** on moving vehicles (green ring)
- **Bounce effect** on stuck vehicles (yellow ring)
- Updates every 800ms for fluid motion

## Making Traffic More Chaotic

The simulator is configured for realistic, busy traffic:
- **25 initial vehicles** spawn automatically on load
- **Auto-spawn** maintains 75 total active vehicles (25 × 3)
- **Lower congestion thresholds** create traffic jams faster
- **More aggressive rerouting** at 50% congestion (down from 70%)
- **Higher traffic penalties** make congested roads much slower (4-6× normal time)
- **Smaller road capacity** (3 vehicles per segment) creates bottlenecks easily

## Tips for Observing Traffic Patterns

1. **Watch the red dots grow:** As vehicles cluster, numbers increase on busy roads
2. **Follow purple vehicles:** See them actively avoiding congested areas
3. **Identify bottlenecks:** Roads stay red/orange with high vehicle counts
4. **Monitor reroutes:** Vehicles with high reroute counts struggled with congestion
5. **Observe cascading jams:** One bottleneck causes upstream congestion

Enjoy watching the chaotic, realistic traffic simulation! 🚦
