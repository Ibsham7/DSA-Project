'use client';

import React from 'react';
import { graphData } from '@/lib/graphData';
import { getTrafficColor } from '@/lib/types';

interface GraphVisualizationProps {
  path: string[] | null;
  traffic: Record<string, number>;
  currentNode?: string;
  mode: string;
}

const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  path,
  traffic,
  currentNode,
  mode,
}) => {
  const SCALE = 60;
  const OFFSET_X = 50;
  const OFFSET_Y = 50;
  const WIDTH = 600;
  const HEIGHT = 500;

  const scaleX = (x: number) => x * SCALE + OFFSET_X;
  const scaleY = (y: number) => HEIGHT - (y * SCALE + OFFSET_Y);

  const isEdgeInPath = (from: string, to: string): boolean => {
    if (!path) return false;
    for (let i = 0; i < path.length - 1; i++) {
      if (path[i] === from && path[i + 1] === to) return true;
    }
    return false;
  };

  const getEdgeTraffic = (from: string, to: string): number => {
    return traffic[`${from},${to}`] || 1.0;
  };

  const isEdgeAllowedForMode = (allowedModes: string[]): boolean => {
    return allowedModes.includes(mode);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Network Map</h2>
      <svg width={WIDTH} height={HEIGHT} className="border border-gray-200 rounded">
        {/* Draw edges */}
        {graphData.edges.map((edge, idx) => {
          const fromNode = graphData.nodes.find((n) => n.id === edge.from);
          const toNode = graphData.nodes.find((n) => n.id === edge.to);
          if (!fromNode || !toNode) return null;

          const x1 = scaleX(fromNode.x);
          const y1 = scaleY(fromNode.y);
          const x2 = scaleX(toNode.x);
          const y2 = scaleY(toNode.y);

          const inPath = isEdgeInPath(edge.from, edge.to);
          const trafficMultiplier = getEdgeTraffic(edge.from, edge.to);
          const color = getTrafficColor(trafficMultiplier);
          const isAllowed = isEdgeAllowedForMode(edge.allowed_modes);

          return (
            <g key={idx}>
              {/* Edge line */}
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={inPath ? '#3b82f6' : isAllowed ? color : '#d1d5db'}
                strokeWidth={inPath ? 4 : isAllowed ? 3 : 1}
                strokeOpacity={isAllowed ? 1 : 0.3}
                strokeDasharray={edge.one_way ? '5,5' : '0'}
              />
              
              {/* Arrow for one-way edges */}
              {edge.one_way && (
                <defs>
                  <marker
                    id={`arrow-${idx}`}
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M0,0 L0,6 L9,3 z" fill={isAllowed ? color : '#d1d5db'} />
                  </marker>
                </defs>
              )}
              {edge.one_way && (
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth={3}
                  markerEnd={`url(#arrow-${idx})`}
                />
              )}

              {/* Distance label */}
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 5}
                fontSize="10"
                fill="#374151"
                textAnchor="middle"
                className="select-none"
              >
                {edge.distance}
              </text>
            </g>
          );
        })}

        {/* Draw reverse edges (for bidirectional) */}
        {graphData.edges.map((edge, idx) => {
          if (edge.one_way) return null;

          const fromNode = graphData.nodes.find((n) => n.id === edge.to);
          const toNode = graphData.nodes.find((n) => n.id === edge.from);
          if (!fromNode || !toNode) return null;

          const inPath = isEdgeInPath(edge.to, edge.from);

          return inPath ? (
            <line
              key={`reverse-${idx}`}
              x1={scaleX(fromNode.x)}
              y1={scaleY(fromNode.y)}
              x2={scaleX(toNode.x)}
              y2={scaleY(toNode.y)}
              stroke="#3b82f6"
              strokeWidth={4}
            />
          ) : null;
        })}

        {/* Draw nodes */}
        {graphData.nodes.map((node) => {
          const isInPath = path?.includes(node.id) || false;
          const isCurrent = currentNode === node.id;
          const isStart = path && path.length > 0 && path[0] === node.id;
          const isGoal = path && path.length > 0 && path[path.length - 1] === node.id;

          return (
            <g key={node.id}>
              <circle
                cx={scaleX(node.x)}
                cy={scaleY(node.y)}
                r={isCurrent ? 16 : isStart || isGoal ? 14 : 12}
                fill={
                  isCurrent
                    ? '#f59e0b'
                    : isStart
                    ? '#10b981'
                    : isGoal
                    ? '#ef4444'
                    : isInPath
                    ? '#3b82f6'
                    : '#6b7280'
                }
                stroke="#fff"
                strokeWidth={2}
              />
              <text
                x={scaleX(node.x)}
                y={scaleY(node.y) + 4}
                fontSize="12"
                fontWeight="bold"
                fill="#fff"
                textAnchor="middle"
                className="select-none"
              >
                {node.id}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500"></div>
          <span>Start Node</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500"></div>
          <span>Goal Node</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-amber-500"></div>
          <span>Current Position</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
          <span>Path Node</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-1 bg-green-500"></div>
          <span>Low Traffic</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-1 bg-yellow-500"></div>
          <span>Medium Traffic</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-1 bg-red-500"></div>
          <span>High Traffic</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-1 border-t-2 border-dashed border-gray-400"></div>
          <span>One-way</span>
        </div>
      </div>
    </div>
  );
};

export default GraphVisualization;
