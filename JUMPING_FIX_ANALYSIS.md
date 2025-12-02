# Vehicle Jumping Issue - Root Cause Analysis

## Problem Statement
Vehicles exhibit visual "jumping" or jittery movement on the map, especially:
- When first spawned (speed = 0 px/s)
- During traffic congestion (speed < 17 px/s)
- The jumping stops when vehicles reach ~17 px/s

## Root Causes Identified

### 1. **Small Position Changes at Low Speeds**
- At speed < 17 px/s with delta_time = 0.05s:
  - Speed 1 px/s → 0.05 pixels/frame → 0.0005 position change (on 100px edge)
  - Speed 5 px/s → 0.25 pixels/frame → 0.0025 position change
  - Speed 17 px/s → 0.85 pixels/frame → 0.0085 position change
- Position changes < 0.001 cause sub-pixel rendering artifacts
- Bezier curve calculation at very small `t` increments has numerical instability

### 2. **Target Speed Oscillation**
- Traffic multipliers update every frame based on vehicle density
- Hotspot congestion adds random factor (0.5-2.0) every 10 frames
- Even small traffic changes trigger target_speed adjustments
- Current logic adjusts by ±0.5 px/s per frame when diff > 1.0
- At low speeds, this creates visible oscillation

### 3. **Acceleration Too High**
- Current: 10.0 px/s² (changed from 2.0 to quickly pass low speeds)
- With delta_time = 0.05s: 0.5 px/s change per frame
- At low speeds, this is 50%+ of current speed, causing jerky acceleration
- High acceleration amplifies any target_speed changes

### 4. **No Position Smoothing**
- Frontend directly uses `position_on_edge` from backend
- No interpolation or smoothing between updates
- Small fluctuations in position are immediately visible

## Current Code Issues

### vehicle.py (Lines 83-90)
```python
self.position_on_edge = 0.0
self.current_speed = 0.0
self.target_speed = self.speed_multiplier  # 60 for cars
self.acceleration = 10.0  # TOO HIGH - causes jerky movement
```

### vehicle.py (Lines 145-165) - update_position()
```python
# Problem: Direct acceleration without damping
self.current_speed += self.acceleration * delta_time

# Problem: No minimum movement threshold
distance_moved = self.current_speed * delta_time
self.position_on_edge += distance_moved / edge_length
```

### multi_vehicle_simulator.py (Lines 467-490)
```python
# Problem: Adjusts target_speed even for small differences
if abs(speed_diff) > 1.0:
    if speed_diff > 0:
        vehicle.target_speed = min(vehicle.target_speed + 0.5, ideal_speed)
    else:
        vehicle.target_speed = max(ideal_speed, vehicle.target_speed - 0.5)
elif abs(speed_diff) > 0.1:
    vehicle.target_speed = ideal_speed  # Direct set can cause jumps
```

### multi_vehicle_simulator.py (Lines 403-410)
```python
# Problem: Random congestion changes too frequently
if self.simulation_step % 10 == 0:
    time_penalty = 1.0 + (congestion_factor * random.uniform(0.5, 2.0))
    # This causes traffic_multiplier to change, which changes ideal_speed
```

## Proper Solution Strategy

### Fix 1: Reduce Acceleration (Back to Reasonable Value)
- Change from 10.0 → 3.0 px/s²
- At 3.0 px/s², vehicle reaches 17 px/s in ~1.1 seconds (acceptable)
- Smoother acceleration curve, less jerky

### Fix 2: Position Interpolation/Smoothing
- Don't update position if movement < 0.001 (too small)
- OR apply exponential smoothing to position changes
- This filters out sub-pixel jitter

### Fix 3: Target Speed Damping
- Don't adjust target_speed at speeds < 3.0 px/s (let it accelerate freely)
- Use larger deadband (> 2.0 px/s instead of > 1.0 px/s)
- Slower adjustment rate (0.2 px/s per frame instead of 0.5)

### Fix 4: Stabilize Traffic Multipliers
- Update hotspot congestion less frequently (every 30 steps, not 10)
- Smooth traffic multiplier changes (exponential moving average)
- Larger threshold before recalculating ideal_speed

### Fix 5: Frontend Anti-Aliasing
- Ensure vehicle markers render with proper sub-pixel positioning
- Use `transform: translate3d()` for GPU acceleration
- Round positions to nearest 0.1 pixel to reduce jitter

## Implementation Plan

1. **vehicle.py changes:**
   - Reduce acceleration to 3.0 px/s²
   - Add minimum position change threshold (0.001)
   - Skip position update if movement too small

2. **multi_vehicle_simulator.py changes:**
   - Increase deadband threshold to 2.0 px/s
   - Reduce adjustment rate to 0.2 px/s per frame
   - Don't adjust target_speed if current_speed < 3.0 px/s
   - Update hotspot congestion every 30 steps instead of 10
   - Apply smoothing to traffic multiplier changes

3. **Frontend changes (if needed):**
   - Round position to 0.1 pixel precision
   - Use CSS transform for smoother rendering

## Expected Results
- Vehicles accelerate smoothly from 0 to full speed
- No visible jumping at any speed
- Traffic slowdowns are gradual and smooth
- Visual movement appears fluid and realistic
