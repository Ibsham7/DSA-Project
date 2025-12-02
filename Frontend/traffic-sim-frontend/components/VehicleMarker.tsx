'use client';

import React from 'react';
import { Vehicle, VEHICLE_EMOJI, getStatusColor } from '@/lib/types';

interface VehicleMarkerProps {
  vehicle: Vehicle;
  x: number;
  y: number;
  scale?: number;
}

const VehicleMarker: React.FC<VehicleMarkerProps> = ({ vehicle, x, y, scale = 1 }) => {
  const emoji = VEHICLE_EMOJI[vehicle.type];
  const statusColor = getStatusColor(vehicle.status);
  
  // Calculate speed percentage (current_speed / speed_multiplier) with safety check
  const speedPercentage = vehicle.speed_multiplier > 0 
    ? vehicle.current_speed / vehicle.speed_multiplier 
    : 0;
  
  // CRITICAL: Hide vehicles at very low speeds to prevent spawn jumping
  // Vehicles fade in progressively from 8-12 px/s for completely smooth appearance
  const MIN_VISIBLE_SPEED = 8.0;  // Start fading in at 8 px/s (higher threshold = no jumping)
  const FULL_VISIBLE_SPEED = 12.0; // Fully visible at 12 px/s
  
  let opacity = 1.0;
  if (vehicle.current_speed < MIN_VISIBLE_SPEED) {
    opacity = 0; // Completely hidden below 8 px/s - eliminates all jumping
  } else if (vehicle.current_speed < FULL_VISIBLE_SPEED) {
    // Progressive fade-in from 8-12 px/s for buttery-smooth appearance
    opacity = (vehicle.current_speed - MIN_VISIBLE_SPEED) / (FULL_VISIBLE_SPEED - MIN_VISIBLE_SPEED);
  }
  
  // Don't render if invisible
  if (opacity === 0) return null;
  
  // Add pulsing animation for moving vehicles
  const isMoving = vehicle.status === 'moving' && speedPercentage > 0.5;
  const isStuck = vehicle.status === 'stuck' || speedPercentage < 0.3;
  const isSlow = speedPercentage >= 0.3 && speedPercentage < 0.7;
  
  // Determine visual indicator based on speed
  let speedIndicatorColor = '#10b981'; // green - fast
  if (speedPercentage < 0.3) {
    speedIndicatorColor = '#ef4444'; // red - stuck/stopped
  } else if (speedPercentage < 0.7) {
    speedIndicatorColor = '#f59e0b'; // orange - slow
  }
  
  return (
    <g transform={`translate(${x}, ${y})`} opacity={opacity} style={{ transition: 'opacity 0.3s ease-in-out' }}>
      {/* Speed indicator ring */}
      <circle
        cx="0"
        cy="0"
        r={14 * scale}
        fill="none"
        stroke={speedIndicatorColor}
        strokeWidth={2 * scale}
        opacity="0.6"
        className={isStuck ? 'animate-pulse' : ''}
      />
      
      {/* Status ring */}
      <circle
        cx="0"
        cy="0"
        r={12 * scale}
        fill={statusColor}
        opacity="0.3"
        className={isMoving ? 'animate-pulse' : ''}
      />
      
      {/* Vehicle icon */}
      <text
        x="0"
        y="0"
        fontSize={20 * scale}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ userSelect: 'none' }}
        className={isStuck ? 'animate-bounce' : isSlow ? 'opacity-80' : ''}
      >
        {emoji}
      </text>
      
      {/* Tooltip on hover */}
      <title>
        {`${vehicle.id}\n` +
         `Type: ${vehicle.type}\n` +
         `Status: ${vehicle.status}\n` +
         `Speed: ${vehicle.current_speed.toFixed(1)} px/s (${(speedPercentage * 100).toFixed(0)}%)\n` +
         `Max Speed: ${vehicle.speed_multiplier.toFixed(1)} px/s\n` +
         `From: ${vehicle.start_node}\n` +
         `To: ${vehicle.goal_node}\n` +
         `Current: ${vehicle.current_node}\n` +
         `Reroutes: ${vehicle.reroute_count}`}
      </title>
    </g>
  );
};

export default VehicleMarker;
