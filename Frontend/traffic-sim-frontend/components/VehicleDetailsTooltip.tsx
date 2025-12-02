'use client';

import React from 'react';
import { Vehicle, VEHICLE_EMOJI, getStatusColor } from '@/lib/types';

interface VehicleDetailsTooltipProps {
  vehicle: Vehicle;
  x: number;
  y: number;
}

const VehicleDetailsTooltip: React.FC<VehicleDetailsTooltipProps> = ({ vehicle, x, y }) => {
  const emoji = VEHICLE_EMOJI[vehicle.type];
  const statusColor = getStatusColor(vehicle.status);
  
  const formatSpeed = (speed: number) => {
    return `${Math.round(speed)} px/s`;
  };
  
  const formatPosition = (pos: number) => {
    return `${Math.round(pos * 100)}%`;
  };
  
  const formatTime = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    return `${Math.round(seconds)}s`;
  };
  
  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{
        left: `${x + 25}px`,
        top: `${y - 10}px`,
        transform: 'translateY(-100%)',
      }}
    >
      <div className="bg-gray-900 text-white rounded-lg shadow-2xl p-3 min-w-[280px] border border-gray-700">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
          <span className="text-2xl">{emoji}</span>
          <div className="flex-1">
            <div className="font-bold text-sm">{vehicle.id}</div>
            <div className="text-xs text-gray-400 capitalize">{vehicle.type}</div>
          </div>
          <div
            className="px-2 py-1 rounded text-xs font-medium"
            style={{ backgroundColor: statusColor, color: 'white' }}
          >
            {vehicle.status}
          </div>
        </div>
        
        {/* Route Info */}
        <div className="mb-2 pb-2 border-b border-gray-700">
          <div className="text-xs font-semibold text-gray-400 mb-1">ROUTE</div>
          <div className="flex items-center gap-1 text-xs">
            <span className="bg-green-600 text-white px-1.5 py-0.5 rounded font-mono">
              {vehicle.start_node}
            </span>
            <span className="text-gray-500">→</span>
            <span className="bg-red-600 text-white px-1.5 py-0.5 rounded font-mono">
              {vehicle.goal_node}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Via: {vehicle.current_node}
            {vehicle.next_node && (
              <span className="text-blue-400"> → {vehicle.next_node}</span>
            )}
          </div>
        </div>
        
        {/* Movement Stats */}
        <div className="grid grid-cols-2 gap-2 mb-2 pb-2 border-b border-gray-700">
          <div>
            <div className="text-xs text-gray-400">Current Speed</div>
            <div className="text-sm font-bold text-blue-400">{formatSpeed(vehicle.current_speed)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Progress</div>
            <div className="text-sm font-bold text-green-400">{formatPosition(vehicle.position_on_edge)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Wait Time</div>
            <div className="text-sm font-bold text-yellow-400">{formatTime(vehicle.wait_time)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Travel Time</div>
            <div className="text-sm font-bold text-purple-400">{formatTime(vehicle.travel_time)}</div>
          </div>
        </div>
        
        {/* Path Info */}
        <div>
          <div className="text-xs text-gray-400 mb-1">
            Path: {vehicle.path_index + 1} / {vehicle.path.length} nodes
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="text-gray-400">Reroutes:</div>
            <div className="bg-orange-600 text-white px-2 py-0.5 rounded font-bold">
              {vehicle.reroute_count}
            </div>
          </div>
        </div>
        
        {/* Arrow pointer */}
        <div
          className="absolute w-3 h-3 bg-gray-900 border-l border-b border-gray-700 transform rotate-45"
          style={{
            left: '20px',
            bottom: '-6px',
          }}
        ></div>
      </div>
    </div>
  );
};

export default VehicleDetailsTooltip;
