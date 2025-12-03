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
  
  // Add pulsing animation for moving vehicles
  const isMoving = vehicle.status === 'moving';
  const isStuck = vehicle.status === 'stuck';
  
  return (
    <g transform={`translate(${x}, ${y})`}>
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
        className={isStuck ? 'animate-bounce' : ''}
      >
        {emoji}
      </text>
      
      {/* Tooltip on hover */}
      <title>
        {`${vehicle.id}\n` +
         `Type: ${vehicle.type}\n` +
         `Status: ${vehicle.status}\n` +
         `From: ${vehicle.start_node}\n` +
         `To: ${vehicle.goal_node}\n` +
         `Current: ${vehicle.current_node}\n` +
         `Reroutes: ${vehicle.reroute_count}`}
      </title>
    </g>
  );
};

export default VehicleMarker;
