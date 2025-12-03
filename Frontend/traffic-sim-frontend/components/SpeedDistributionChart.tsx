'use client';

import React from 'react';

interface SpeedDistributionChartProps {
  speedConfig: {
    car: { mean: number; std_dev: number; min: number; max: number };
    bicycle: { mean: number; std_dev: number; min: number; max: number };
    pedestrian: { mean: number; std_dev: number; min: number; max: number };
  };
  liveSpeedStats?: {
    car?: { count: number; avg_speed: number; min_speed: number; max_speed: number };
    bicycle?: { count: number; avg_speed: number; min_speed: number; max_speed: number };
    pedestrian?: { count: number; avg_speed: number; min_speed: number; max_speed: number };
  };
}

const SpeedDistributionChart: React.FC<SpeedDistributionChartProps> = ({ 
  speedConfig, 
  liveSpeedStats 
}) => {
  // Calculate normal distribution probability
  const normalPDF = (x: number, mean: number, stdDev: number): number => {
    const coefficient = 1 / (stdDev * Math.sqrt(2 * Math.PI));
    const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
    return coefficient * Math.exp(exponent);
  };

  // Generate distribution curve points
  const generateDistribution = (mean: number, stdDev: number, min: number, max: number) => {
    const points: { x: number; y: number; label: string }[] = [];
    const rangeStart = Math.max(min, mean - 3 * stdDev);
    const rangeEnd = Math.min(max, mean + 3 * stdDev);
    const step = (rangeEnd - rangeStart) / 100;

    for (let x = rangeStart; x <= rangeEnd; x += step) {
      points.push({
        x,
        y: normalPDF(x, mean, stdDev),
        label: ''
      });
    }

    return points;
  };

  // Calculate z-score and percentile
  const calculateZScore = (x: number, mean: number, stdDev: number): number => {
    return (x - mean) / stdDev;
  };

  // Approximate cumulative distribution function (CDF) using error function
  const cdf = (x: number, mean: number, stdDev: number): number => {
    const z = calculateZScore(x, mean, stdDev);
    // Using approximation: CDF(z) ≈ 0.5 * (1 + erf(z/sqrt(2)))
    // Simplified approximation for erf
    const t = 1 / (1 + 0.5 * Math.abs(z));
    const tau = t * Math.exp(-z * z - 1.26551223 +
      t * (1.00002368 +
        t * (0.37409196 +
          t * (0.09678418 +
            t * (-0.18628806 +
              t * (0.27886807 +
                t * (-1.13520398 +
                  t * (1.48851587 +
                    t * (-0.82215223 +
                      t * 0.17087277)))))))));
    return z >= 0 ? 1 - tau : tau;
  };

  const vehicleTypes: Array<{ 
    type: 'car' | 'bicycle' | 'pedestrian'; 
    label: string; 
    color: string; 
    bgColor: string;
    emoji: string;
  }> = [
    { type: 'car', label: 'Car', color: '#3b82f6', bgColor: 'bg-blue-500', emoji: '🚗' },
    { type: 'bicycle', label: 'Bicycle', color: '#10b981', bgColor: 'bg-green-500', emoji: '🚴' },
    { type: 'pedestrian', label: 'Pedestrian', color: '#f59e0b', bgColor: 'bg-amber-500', emoji: '🚶' }
  ];

  const renderDistributionTable = (vehicleType: typeof vehicleTypes[0]) => {
    const config = speedConfig[vehicleType.type];
    const liveStats = liveSpeedStats?.[vehicleType.type];
    const mean = config.mean;
    const stdDev = config.std_dev;

    // Standard deviation ranges
    const ranges = [
      { label: 'μ - 3σ', value: mean - 3 * stdDev, z: -3 },
      { label: 'μ - 2σ', value: mean - 2 * stdDev, z: -2 },
      { label: 'μ - 1σ', value: mean - stdDev, z: -1 },
      { label: 'μ (Mean)', value: mean, z: 0 },
      { label: 'μ + 1σ', value: mean + stdDev, z: 1 },
      { label: 'μ + 2σ', value: mean + 2 * stdDev, z: 2 },
      { label: 'μ + 3σ', value: mean + 3 * stdDev, z: 3 },
    ];

    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{vehicleType.emoji}</span>
          <h3 className="text-lg font-semibold text-white">{vehicleType.label} Speed Distribution</h3>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="bg-gray-900 p-3 rounded border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Configured Mean (μ)</div>
            <div className="text-xl font-bold text-white">{mean.toFixed(1)} km/h</div>
          </div>
          <div className="bg-gray-900 p-3 rounded border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Std Dev (σ)</div>
            <div className="text-xl font-bold text-white">{stdDev.toFixed(2)} km/h</div>
          </div>
          {liveStats && (
            <>
              <div className="bg-gray-900 p-3 rounded border border-green-700">
                <div className="text-gray-400 text-xs mb-1">Live Avg Speed</div>
                <div className="text-xl font-bold text-green-400">{liveStats.avg_speed.toFixed(1)} km/h</div>
                <div className="text-xs text-gray-500">({liveStats.count} vehicles)</div>
              </div>
              <div className="bg-gray-900 p-3 rounded border border-gray-700">
                <div className="text-gray-400 text-xs mb-1">Live Range</div>
                <div className="text-sm font-bold text-white">
                  {liveStats.min_speed.toFixed(1)} - {liveStats.max_speed.toFixed(1)} km/h
                </div>
              </div>
            </>
          )}
        </div>

        {/* Normal Distribution Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-3 text-gray-300 font-semibold">Range</th>
                <th className="text-right py-2 px-3 text-gray-300 font-semibold">Speed (km/h)</th>
                <th className="text-right py-2 px-3 text-gray-300 font-semibold">Z-Score</th>
                <th className="text-right py-2 px-3 text-gray-300 font-semibold">Percentile</th>
                <th className="text-right py-2 px-3 text-gray-300 font-semibold">Cumulative %</th>
              </tr>
            </thead>
            <tbody>
              {ranges.map((range, idx) => {
                const percentile = cdf(range.value, mean, stdDev) * 100;
                const isWithinBounds = range.value >= config.min && range.value <= config.max;
                const isMean = range.z === 0;
                const isLiveAvg = liveStats && Math.abs(liveStats.avg_speed - range.value) < stdDev / 2;

                return (
                  <tr 
                    key={idx} 
                    className={`border-b border-gray-800 ${
                      isMean ? 'bg-blue-900/30' : 
                      isLiveAvg ? 'bg-green-900/30' : 
                      !isWithinBounds ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="py-2 px-3">
                      <span className={`font-mono ${isMean ? 'font-bold text-blue-400' : 'text-gray-300'}`}>
                        {range.label}
                      </span>
                    </td>
                    <td className="text-right py-2 px-3">
                      <span className={`font-semibold ${
                        isMean ? 'text-blue-400' : 
                        isLiveAvg ? 'text-green-400' :
                        !isWithinBounds ? 'text-red-400' : 'text-white'
                      }`}>
                        {range.value.toFixed(2)}
                      </span>
                      {!isWithinBounds && (
                        <span className="text-xs text-red-400 ml-1">
                          ({range.value < config.min ? 'below min' : 'above max'})
                        </span>
                      )}
                    </td>
                    <td className="text-right py-2 px-3 text-gray-300 font-mono">
                      {range.z > 0 ? '+' : ''}{range.z.toFixed(1)}
                    </td>
                    <td className="text-right py-2 px-3 text-gray-300">
                      {percentile.toFixed(2)}%
                    </td>
                    <td className="text-right py-2 px-3">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${vehicleType.bgColor}`}
                            style={{ width: `${percentile}%` }}
                          />
                        </div>
                        <span className="text-gray-300 w-12">{percentile.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Distribution curve visualization */}
        <div className="mt-4">
          <div className="text-xs text-gray-400 mb-2">Normal Distribution Curve</div>
          <div className="bg-gray-900 border border-gray-700 rounded p-3">
            <svg width="100%" height="80" viewBox="0 0 300 80" preserveAspectRatio="xMidYMid meet">
              {(() => {
                const points = generateDistribution(mean, stdDev, config.min, config.max);
                const maxY = Math.max(...points.map(p => p.y));
                const scaleX = (x: number) => ((x - points[0].x) / (points[points.length - 1].x - points[0].x)) * 280 + 10;
                const scaleY = (y: number) => 70 - (y / maxY) * 60;

                const pathD = points.map((p, i) => 
                  `${i === 0 ? 'M' : 'L'} ${scaleX(p.x)} ${scaleY(p.y)}`
                ).join(' ');

                return (
                  <>
                    {/* Grid lines */}
                    <line x1="10" y1="70" x2="290" y2="70" stroke="#374151" strokeWidth="1" />
                    
                    {/* Mean line */}
                    <line 
                      x1={scaleX(mean)} 
                      y1="10" 
                      x2={scaleX(mean)} 
                      y2="70" 
                      stroke={vehicleType.color} 
                      strokeWidth="2" 
                      strokeDasharray="4,2"
                    />
                    
                    {/* Live average line */}
                    {liveStats && (
                      <line 
                        x1={scaleX(liveStats.avg_speed)} 
                        y1="10" 
                        x2={scaleX(liveStats.avg_speed)} 
                        y2="70" 
                        stroke="#10b981" 
                        strokeWidth="2" 
                        strokeDasharray="2,2"
                      />
                    )}
                    
                    {/* Distribution curve */}
                    <path 
                      d={pathD} 
                      fill="none" 
                      stroke={vehicleType.color} 
                      strokeWidth="2"
                    />
                    
                    {/* Fill under curve */}
                    <path 
                      d={`${pathD} L ${scaleX(points[points.length - 1].x)} 70 L ${scaleX(points[0].x)} 70 Z`} 
                      fill={vehicleType.color} 
                      fillOpacity="0.2"
                    />
                    
                    {/* Labels */}
                    <text x={scaleX(mean)} y="5" fontSize="8" fill={vehicleType.color} textAnchor="middle">μ</text>
                    {liveStats && (
                      <text x={scaleX(liveStats.avg_speed)} y="80" fontSize="7" fill="#10b981" textAnchor="middle">
                        Live: {liveStats.avg_speed.toFixed(1)}
                      </text>
                    )}
                    <text x="10" y="80" fontSize="8" fill="#9ca3af">{points[0].x.toFixed(0)}</text>
                    <text x="290" y="80" fontSize="8" fill="#9ca3af" textAnchor="end">{points[points.length - 1].x.toFixed(0)}</text>
                  </>
                );
              })()}
            </svg>
          </div>
        </div>

        {/* Statistical notes */}
        <div className="mt-3 text-xs text-gray-400 space-y-1">
          <div>• 68.2% of values fall within μ ± 1σ ({(mean - stdDev).toFixed(1)} - {(mean + stdDev).toFixed(1)} km/h)</div>
          <div>• 95.4% of values fall within μ ± 2σ ({(mean - 2*stdDev).toFixed(1)} - {(mean + 2*stdDev).toFixed(1)} km/h)</div>
          <div>• 99.7% of values fall within μ ± 3σ ({(mean - 3*stdDev).toFixed(1)} - {(mean + 3*stdDev).toFixed(1)} km/h)</div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
        <h2 className="text-xl font-bold text-white mb-2">Speed Distribution Analysis</h2>
        <p className="text-sm text-gray-400">
          Normal distribution table showing configured mean (μ), standard deviation (σ), and live vehicle speeds
        </p>
      </div>

      {vehicleTypes.map(vehicleType => (
        <div key={vehicleType.type}>
          {renderDistributionTable(vehicleType)}
        </div>
      ))}
    </div>
  );
};

export default SpeedDistributionChart;
