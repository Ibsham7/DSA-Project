'use client';

import React, { useState } from 'react';
import { graphData } from '@/lib/graphData';
import { getTrafficColor, MODE_EMOJI } from '@/lib/types';
import { GraphData } from '@/lib/types';

interface GoogleMapsStyleVisualizationProps {
  path: string[] | null;
  traffic: Record<string, number>;
  currentNode?: string;
  mode: string;
  mapData?: GraphData;
}

const GoogleMapsStyleVisualization: React.FC<GoogleMapsStyleVisualizationProps> = ({
  path,
  traffic,
  currentNode,
  mode,
  mapData = graphData,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };
  
  const SCALE = 110;
  const OFFSET_X = 180;
  const OFFSET_Y = 150;
  const WIDTH = 1600;
  const HEIGHT = 1100;

  const scaleX = (x: number) => x * SCALE + OFFSET_X;
  const scaleY = (y: number) => HEIGHT - (y * SCALE + OFFSET_Y);

  const isEdgeInPath = (from: string, to: string): boolean => {
    if (!path) return false;
    // During simulation, show entire path
    for (let i = 0; i < path.length - 1; i++) {
      if (path[i] === from && path[i + 1] === to) return true;
    }
    return false;
  };

  const isActiveEdge = (from: string, to: string): boolean => {
    if (!path || !currentNode) return false;
    const currentIdx = path.indexOf(currentNode);
    // Check if this is the edge currently being traversed
    if (currentIdx > 0 && path[currentIdx - 1] === from && path[currentIdx] === to) {
      return true;
    }
    return false;
  };

  const getEdgeTraffic = (from: string, to: string): number => {
    return traffic[`${from},${to}`] || 1.0;
  };

  const isEdgeAllowedForMode = (allowedModes: string[]): boolean => {
    return allowedModes.includes(mode);
  };

  // Calculate edge angle for arrow direction
  const getEdgeAngle = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
  };

  // Generate curved path with offset for more realistic roads
  const getCurveOffset = (x1: number, y1: number, x2: number, y2: number, index: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Variable curve intensity based on distance and index
    const baseOffset = Math.min(length * 0.2, 80);
    const variation = (index % 3) - 1; // -1, 0, or 1 for variety
    const offsetAmount = baseOffset * variation;
    
    // Perpendicular direction
    const perpX = -dy / length;
    const perpY = dx / length;
    
    // Add slight randomness based on index for natural look
    const offsetX = (index % 5) * 5 - 10;
    const offsetY = ((index * 3) % 5) * 5 - 10;
    
    return {
      cx: (x1 + x2) / 2 + perpX * offsetAmount + offsetX,
      cy: (y1 + y2) / 2 + perpY * offsetAmount + offsetY
    };
  };

  // Get emoji position along the path
  const getEmojiPosition = () => {
    if (!path || !currentNode) return null;
    const currentIdx = path.indexOf(currentNode);
    if (currentIdx === -1) return null;
    
    const currentNodeData = mapData.nodes.find(n => n.id === currentNode);
    if (!currentNodeData) return null;
    
    return {
      x: scaleX(currentNodeData.x),
      y: scaleY(currentNodeData.y)
    };
  };

  // Get icon for place type based on name
  const getPlaceIcon = (nodeName: string): string => {
    const name = nodeName.toLowerCase();
    // NUST Campus specific
    if (name.includes('seecs')) return '💻';
    if (name.includes('sada')) return '🎨';
    if (name.includes('smme')) return '⚙️';
    if (name.includes('nbs')) return '💼';
    if (name.includes('scme')) return '🔬';
    if (name.includes('sns')) return '🧪';
    if (name.includes('library')) return '📚';
    if (name.includes('sports') || name.includes('ground')) return '⚽';
    if (name.includes('student_center')) return '👥';
    if (name.includes('cafeteria')) return '🍽️';
    if (name.includes('medical')) return '🏥';
    if (name.includes('admin')) return '🏢';
    if (name.includes('hostel_boys')) return '🏠';
    if (name.includes('hostel_girls')) return '🏡';
    if (name.includes('faculty_housing')) return '🏘️';
    if (name.includes('mosque')) return '🕌';
    if (name.includes('innovation')) return '💡';
    if (name.includes('research')) return '🔬';
    if (name.includes('auditorium')) return '🎭';
    if (name.includes('parking')) return '🅿️';
    if (name.includes('bus')) return '🚌';
    if (name.includes('gate')) return '🚪';
    // City map
    if (name.includes('airport')) return '✈️';
    if (name.includes('hospital')) return '🏥';
    if (name.includes('university') || name.includes('school')) return '🎓';
    if (name.includes('mall') || name.includes('shop')) return '🛍️';
    if (name.includes('park')) return '🌳';
    if (name.includes('stadium')) return '🏟️';
    if (name.includes('harbor') || name.includes('port')) return '⚓';
    if (name.includes('beach')) return '🏖️';
    if (name.includes('museum')) return '🏛️';
    if (name.includes('station') || name.includes('train')) return '🚉';
    if (name.includes('city_hall') || name.includes('hall')) return '🏛️';
    if (name.includes('downtown') || name.includes('plaza')) return '🏙️';
    return '📍';
  };

  return (
    <div className="bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200">
      {/* Google Maps style header */}
      <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">City Navigation</h2>
            <p className="text-xs text-gray-500">Real-time traffic monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            Live Traffic
          </div>
        </div>
      </div>

      {/* Map canvas with scrolling */}
      <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 overflow-auto max-h-[700px]">
        <svg 
          width={WIDTH * zoomLevel} 
          height={HEIGHT * zoomLevel} 
          className="min-w-full"
          style={{ transformOrigin: 'top left' }}
        >
          <g transform={`scale(${zoomLevel})`}>
          {/* Background grid pattern (like Google Maps) */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width={WIDTH} height={HEIGHT} fill="url(#grid)" />

          {/* Draw edges (roads) */}
          {mapData.edges.map((edge, idx) => {
            const fromNode = mapData.nodes.find((n) => n.id === edge.from);
            const toNode = mapData.nodes.find((n) => n.id === edge.to);
            if (!fromNode || !toNode) return null;

            const x1 = scaleX(fromNode.x);
            const y1 = scaleY(fromNode.y);
            const x2 = scaleX(toNode.x);
            const y2 = scaleY(toNode.y);

            const inPath = isEdgeInPath(edge.from, edge.to);
            const active = isActiveEdge(edge.from, edge.to);
            const trafficMultiplier = getEdgeTraffic(edge.from, edge.to);
            const color = getTrafficColor(trafficMultiplier);
            const isAllowed = isEdgeAllowedForMode(edge.allowed_modes);

            // Get curve control point for realistic curvy roads
            const curve = getCurveOffset(x1, y1, x2, y2, idx);
            const pathD = `M ${x1} ${y1} Q ${curve.cx} ${curve.cy} ${x2} ${y2}`;

            return (
              <g key={idx}>
                {/* Road outer border (dark shadow) */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#1f2937"
                  strokeWidth={(inPath || active) ? 14 : 11}
                  strokeOpacity={0.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Road inner border */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#4b5563"
                  strokeWidth={(inPath || active) ? 11 : 8}
                  strokeOpacity={0.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Main road - only show blue for path */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={(inPath || active) ? '#2563eb' : isAllowed ? color : '#9ca3af'}
                  strokeWidth={(inPath || active) ? 8 : 6}
                  strokeOpacity={isAllowed ? 1 : 0.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={edge.one_way ? '8,4' : '0'}
                />

                {/* Center lane marking for realism (only on non-path roads) */}
                {!inPath && !active && isAllowed && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth={1.2}
                    strokeOpacity={0.8}
                    strokeLinecap="butt"
                    strokeDasharray="12,8"
                  />
                )}

                {/* Active edge animated highlight */}
                {active && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth={5}
                    strokeOpacity={0.8}
                    strokeLinecap="round"
                  >
                    <animate
                      attributeName="stroke-dasharray"
                      values="0,20;20,0"
                      dur="0.8s"
                      repeatCount="indefinite"
                    />
                  </path>
                )}

                {/* One-way arrow */}
                {edge.one_way && (
                  <g>
                    <defs>
                      <marker
                        id={`arrow-${idx}`}
                        markerWidth="8"
                        markerHeight="8"
                        refX="6"
                        refY="3"
                        orient="auto"
                        markerUnits="strokeWidth"
                      >
                        <path d="M0,0 L0,6 L6,3 z" fill={isAllowed ? '#1f2937' : '#9ca3af'} />
                      </marker>
                    </defs>
                    <path
                      d={pathD}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={3}
                      markerEnd={`url(#arrow-${idx})`}
                    />
                  </g>
                )}

                {/* Distance label with background at curve midpoint */}
                <g>
                  <rect
                    x={curve.cx - 15}
                    y={curve.cy - 12}
                    width="30"
                    height="16"
                    fill="white"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    rx="3"
                  />
                  <text
                    x={curve.cx}
                    y={curve.cy}
                    fontSize="10"
                    fontWeight="600"
                    fill="#374151"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="select-none"
                  >
                    {edge.distance}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Draw nodes (locations) */}
          {mapData.nodes.map((node) => {
            const isInPath = path?.includes(node.id) || false;
            const isCurrent = currentNode === node.id;
            const isStart = path && path.length > 0 && path[0] === node.id;
            const isGoal = path && path.length > 0 && path[path.length - 1] === node.id;

            const nodeX = scaleX(node.x);
            const nodeY = scaleY(node.y);

            return (
              <g key={node.id}>
                {/* Location pin shadow */}
                {(isStart || isGoal || isCurrent) && (
                  <ellipse
                    cx={nodeX}
                    cy={nodeY + 25}
                    rx="8"
                    ry="3"
                    fill="#000"
                    opacity="0.2"
                  />
                )}

                {/* Place icon above location */}
                <text
                  x={nodeX}
                  y={nodeY - (isStart || isGoal || isCurrent ? 35 : 25)}
                  fontSize="20"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="select-none"
                  filter="drop-shadow(0 1px 2px rgba(0,0,0,0.3))"
                >
                  {getPlaceIcon(node.id)}
                </text>

                {/* Location pin */}
                {isStart || isGoal || isCurrent ? (
                  <g>
                    <path
                      d={`M ${nodeX} ${nodeY - 20} 
                          Q ${nodeX - 12} ${nodeY - 20}, ${nodeX - 12} ${nodeY - 8}
                          Q ${nodeX - 12} ${nodeY + 4}, ${nodeX} ${nodeY + 16}
                          Q ${nodeX + 12} ${nodeY + 4}, ${nodeX + 12} ${nodeY - 8}
                          Q ${nodeX + 12} ${nodeY - 20}, ${nodeX} ${nodeY - 20} Z`}
                      fill={isCurrent ? '#f59e0b' : isStart ? '#10b981' : '#ef4444'}
                      stroke="white"
                      strokeWidth="2"
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                    />
                    <circle
                      cx={nodeX}
                      cy={nodeY - 8}
                      r="6"
                      fill="white"
                    />
                    
                    {/* Animated emoji at current position - stays at node */}
                    {isCurrent && (
                      <g transform={`translate(${nodeX}, ${nodeY - 8})`}>
                        <text
                          x={0}
                          y={0}
                          fontSize="16"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="select-none"
                        >
                          {MODE_EMOJI[mode as keyof typeof MODE_EMOJI]}
                        </text>
                        <animateTransform
                          attributeName="transform"
                          type="scale"
                          values="1;1.3;1"
                          dur="1s"
                          repeatCount="indefinite"
                          additive="sum"
                        />
                      </g>
                    )}
                  </g>
                ) : (
                  <circle
                    cx={nodeX}
                    cy={nodeY}
                    r={isInPath ? 10 : 8}
                    fill={isInPath ? '#3b82f6' : '#6b7280'}
                    stroke="white"
                    strokeWidth="2"
                    filter="drop-shadow(0 1px 2px rgba(0,0,0,0.2))"
                  />
                )}

                {/* Node label with background */}
                <g>
                  <rect
                    x={nodeX - 45}
                    y={nodeY + (isStart || isGoal || isCurrent ? 20 : 12)}
                    width="90"
                    height="20"
                    fill="white"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    rx="4"
                    filter="drop-shadow(0 1px 2px rgba(0,0,0,0.1))"
                  />
                  <text
                    x={nodeX}
                    y={nodeY + (isStart || isGoal || isCurrent ? 30 : 22)}
                    fontSize="11"
                    fontWeight="600"
                    fill="#1f2937"
                    textAnchor="middle"
                    className="select-none"
                  >
                    {node.id.replace(/_/g, ' ')}
                  </text>
                </g>
              </g>
            );
          })}
          </g>
        </svg>

        {/* Map controls (Google Maps style) */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button 
            onClick={handleZoomIn}
            className="bg-white p-2 rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition"
            title="Zoom In"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button 
            onClick={handleZoomOut}
            className="bg-white p-2 rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition"
            title="Zoom Out"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <div className="bg-white px-2 py-1 rounded-lg shadow-lg border border-gray-200 text-xs font-medium text-gray-700 text-center">
            {Math.round(zoomLevel * 100)}%
          </div>
        </div>
      </div>

      {/* Legend - Google Maps style */}
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full shadow-sm"></div>
            <span className="text-gray-700 font-medium">Origin</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full shadow-sm"></div>
            <span className="text-gray-700 font-medium">Destination</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-500 rounded-full shadow-sm"></div>
            <span className="text-gray-700 font-medium">Current</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-green-500 rounded"></div>
            <span className="text-gray-600">Light Traffic</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-yellow-500 rounded"></div>
            <span className="text-gray-600">Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-red-500 rounded"></div>
            <span className="text-gray-600">Heavy Traffic</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapsStyleVisualization;
