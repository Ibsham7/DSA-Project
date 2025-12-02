'use client';

import React from 'react';
import { VehicleStatistics, TrafficStatistics } from '@/lib/types';

interface TrafficStatsDashboardProps {
  vehicleStats?: VehicleStatistics;
  trafficStats?: TrafficStatistics;
  simulationStep: number;
}

const TrafficStatsDashboard: React.FC<TrafficStatsDashboardProps> = ({
  vehicleStats,
  trafficStats,
  simulationStep,
}) => {
  if (!vehicleStats || !trafficStats) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <p className="text-gray-500 italic">No statistics available</p>
      </div>
    );
  }

  const congestionPercentages = trafficStats.congestion_distribution;
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="text-lg font-bold text-gray-800">Traffic Statistics</h3>
        <span className="text-sm text-gray-600">Step: {simulationStep}</span>
      </div>

      {/* Vehicle Statistics */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">🚗 Vehicles</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-blue-50 p-2 rounded">
            <div className="text-gray-600">Total</div>
            <div className="text-2xl font-bold text-blue-600">{vehicleStats.total_vehicles}</div>
          </div>
          <div className="bg-green-50 p-2 rounded">
            <div className="text-gray-600">Active</div>
            <div className="text-2xl font-bold text-green-600">{vehicleStats.active_vehicles}</div>
          </div>
          <div className="bg-purple-50 p-2 rounded">
            <div className="text-gray-600">Arrived</div>
            <div className="text-2xl font-bold text-purple-600">{vehicleStats.arrived_vehicles}</div>
          </div>
          <div className="bg-yellow-50 p-2 rounded">
            <div className="text-gray-600">Reroutes</div>
            <div className="text-2xl font-bold text-yellow-600">{vehicleStats.total_reroutes}</div>
          </div>
        </div>
      </div>

      {/* Vehicle Types */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Vehicle Types</h4>
        <div className="flex gap-2 text-xs">
          <div className="flex-1 bg-gray-50 p-2 rounded text-center">
            <div>🚗 Cars</div>
            <div className="font-bold text-lg">{vehicleStats.vehicles_by_type.car}</div>
          </div>
          <div className="flex-1 bg-gray-50 p-2 rounded text-center">
            <div>🚴 Bikes</div>
            <div className="font-bold text-lg">{vehicleStats.vehicles_by_type.bicycle}</div>
          </div>
          <div className="flex-1 bg-gray-50 p-2 rounded text-center">
            <div>🚶 Pedestrians</div>
            <div className="font-bold text-lg">{vehicleStats.vehicles_by_type.pedestrian}</div>
          </div>
        </div>
      </div>

      {/* Travel Times */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">⏱️ Average Times</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600 text-xs">Travel Time</div>
            <div className="font-bold text-gray-800">
              {vehicleStats.average_travel_time.toFixed(1)}s
            </div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600 text-xs">Wait Time</div>
            <div className="font-bold text-gray-800">
              {vehicleStats.average_wait_time.toFixed(1)}s
            </div>
          </div>
        </div>
      </div>

      {/* Congestion Analysis */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">🚦 Congestion Analysis</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Average Density:</span>
            <span className="font-bold">{(trafficStats.average_density * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Congestion Probability:</span>
            <span className="font-bold text-orange-600">
              {(trafficStats.average_congestion_probability * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Bottlenecks:</span>
            <span className="font-bold text-red-600">{trafficStats.bottleneck_count}</span>
          </div>
        </div>
      </div>

      {/* Congestion Distribution */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Road Conditions</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-16 text-gray-600">Free Flow</div>
            <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-green-500 h-full transition-all duration-300"
                style={{ width: `${congestionPercentages.free_flow}%` }}
              />
            </div>
            <div className="w-12 text-right font-semibold">{congestionPercentages.free_flow.toFixed(0)}%</div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-16 text-gray-600">Light</div>
            <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-lime-500 h-full transition-all duration-300"
                style={{ width: `${congestionPercentages.light}%` }}
              />
            </div>
            <div className="w-12 text-right font-semibold">{congestionPercentages.light.toFixed(0)}%</div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-16 text-gray-600">Moderate</div>
            <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-yellow-500 h-full transition-all duration-300"
                style={{ width: `${congestionPercentages.moderate}%` }}
              />
            </div>
            <div className="w-12 text-right font-semibold">{congestionPercentages.moderate.toFixed(0)}%</div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-16 text-gray-600">Heavy</div>
            <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-orange-500 h-full transition-all duration-300"
                style={{ width: `${congestionPercentages.heavy}%` }}
              />
            </div>
            <div className="w-12 text-right font-semibold">{congestionPercentages.heavy.toFixed(0)}%</div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-16 text-gray-600">Congested</div>
            <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-red-500 h-full transition-all duration-300"
                style={{ width: `${congestionPercentages.congested}%` }}
              />
            </div>
            <div className="w-12 text-right font-semibold">{congestionPercentages.congested.toFixed(0)}%</div>
          </div>
        </div>
      </div>

      {/* Top Bottlenecks */}
      {trafficStats.top_bottlenecks && trafficStats.top_bottlenecks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">🔴 Top Bottlenecks</h4>
          <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
            {trafficStats.top_bottlenecks.map((bottleneck, idx) => (
              <div key={idx} className="flex justify-between items-center bg-red-50 p-2 rounded">
                <span className="text-gray-700 truncate">
                  {bottleneck.from} → {bottleneck.to}
                </span>
                <span className="font-bold text-red-600 ml-2">
                  {(bottleneck.density * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrafficStatsDashboard;
