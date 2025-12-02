'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GraphData, Vehicle, EdgeTrafficData, getCongestionColor, VEHICLE_EMOJI, Accident, BlockedRoad } from '@/lib/types';
import VehicleMarker from './VehicleMarker';
import VehicleDetailsTooltip from './VehicleDetailsTooltip';

// Smooth position tracking for each vehicle to eliminate jitter
interface SmoothedPosition {
  edgeKey: string;          // "currentNode-nextNode" to detect edge changes
  smoothedProgress: number; // EMA-smoothed position (0.0 to 1.0)
  lastUpdate: number;       // Timestamp of last update
}

interface MultiVehicleMapVisualizationProps {
  vehicles: Vehicle[];
  edgeTraffic: EdgeTrafficData[];
  mapData: GraphData;
  highlightedVehicle?: string | null;
  accidents?: Accident[];
  blockedRoads?: BlockedRoad[];
}

const MultiVehicleMapVisualization: React.FC<MultiVehicleMapVisualizationProps> = ({
  vehicles,
  edgeTraffic,
  mapData,
  highlightedVehicle = null,
  accidents = [],
  blockedRoads = [],
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showCongestion, setShowCongestion] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [hoveredVehicle, setHoveredVehicle] = useState<Vehicle | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Smooth position tracking to eliminate jumping/jitter at all speeds
  const smoothedPositions = useRef<Map<string, SmoothedPosition>>(new Map());
  
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  
  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click only
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };
  
  const SCALE = 110;
  const OFFSET_X = 180;
  const OFFSET_Y = 150;
  const WIDTH = 1600;
  const HEIGHT = 1100;

  // Check if map data is loaded
  if (!mapData || !mapData.nodes || mapData.nodes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-2xl p-8 border border-gray-200">
        <div className="text-center text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p className="text-lg font-medium">Loading map data...</p>
        </div>
      </div>
    );
  }

  const scaleX = (x: number) => x * SCALE + OFFSET_X;
  const scaleY = (y: number) => HEIGHT - (y * SCALE + OFFSET_Y);

  // Get edge congestion data
  const getEdgeCongestion = (from: string, to: string): EdgeTrafficData | undefined => {
    return edgeTraffic.find(e => e.from === from && e.to === to);
  };

  // Check if edge has an accident
  const hasAccident = (from: string, to: string): Accident | undefined => {
    return accidents.find(a => a.from_node === from && a.to_node === to);
  };

  // Check if edge is blocked
  const isBlocked = (from: string, to: string): BlockedRoad | undefined => {
    return blockedRoads.find(b => b.from_node === from && b.to_node === to);
  };

  // Get curve control point for realistic roads with better separation
  const getCurveOffset = (from: string, to: string, x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Check if there's a reverse edge
    const hasReverseEdge = mapData.edges.some(e => e.from === to && e.to === from);
    
    // Calculate perpendicular direction (for offset)
    const perpX = -dy / length;
    const perpY = dx / length;
    
    if (hasReverseEdge) {
      // If bidirectional, offset significantly to separate the two directions
      const offset = Math.min(length * 0.15, 25); // Larger offset for parallel routes
      
      // Create unique offset based on edge direction
      const edgeKey = `${from}-${to}`;
      const reverseKey = `${to}-${from}`;
      
      // Use consistent offset direction based on alphabetical order
      const offsetDirection = edgeKey < reverseKey ? 1 : -1;
      
      return {
        cx: (x1 + x2) / 2 + perpX * offset * offsetDirection,
        cy: (y1 + y2) / 2 + perpY * offset * offsetDirection
      };
    } else {
      // Single direction - add slight curve for visual appeal
      const baseOffset = Math.min(length * 0.12, 40);
      // Use consistent hash-based variation instead of edgeIndex
      const edgeKey = `${from}-${to}`;
      const hash = edgeKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const variation = ((hash % 5) - 2) * 0.3; // Consistent variation based on edge names
      const offsetAmount = baseOffset * variation;
      
      return {
        cx: (x1 + x2) / 2 + perpX * offsetAmount,
        cy: (y1 + y2) / 2 + perpY * offsetAmount
      };
    }
  };

  // Calculate point on quadratic bezier curve
  const getPointOnCurve = (x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, t: number) => {
    // Quadratic bezier formula: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
    const oneMinusT = 1 - t;
    const x = oneMinusT * oneMinusT * x1 + 2 * oneMinusT * t * cx + t * t * x2;
    const y = oneMinusT * oneMinusT * y1 + 2 * oneMinusT * t * cy + t * t * y2;
    return { x, y };
  };

  // Get place icon
  const getPlaceIcon = (nodeName: string): string => {
    const name = nodeName.toLowerCase();
    if (name.includes('seecs')) return '💻';
    if (name.includes('library')) return '📚';
    if (name.includes('cafeteria')) return '🍽️';
    if (name.includes('sports')) return '⚽';
    if (name.includes('admin')) return '🏢';
    if (name.includes('hostel')) return '🏠';
    if (name.includes('mosque')) return '🕌';
    if (name.includes('gate')) return '🚪';
    if (name.includes('hospital')) return '🏥';
    if (name.includes('university')) return '🎓';
    if (name.includes('mall')) return '🛍️';
    if (name.includes('park')) return '🌳';
    if (name.includes('airport')) return '✈️';
    return '📍';
  };

  // Get vehicle count on edge - only count vehicles actively on this edge
  const getEdgeVehicleCount = (from: string, to: string): number => {
    return vehicles.filter(v => 
      v.current_node === from && 
      v.next_node === to && 
      v.status !== 'arrived' &&
      v.position_on_edge > 0.05 && // Vehicle has left the start node
      v.position_on_edge < 0.95    // Vehicle hasn't reached the end node yet
    ).length;
  };

  // Get all vehicles on a specific edge with their queue positions
  const getVehiclesOnEdge = (from: string, to: string): Array<{vehicle: Vehicle, queuePosition: number}> => {
    const edgeVehicles = vehicles.filter(v => 
      v.current_node === from && v.next_node === to && v.status !== 'arrived'
    );
    
    // Sort by ID to maintain consistent ordering
    return edgeVehicles
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((vehicle, index) => ({ vehicle, queuePosition: index }));
  };

  // Calculate vehicle position with exponential smoothing to eliminate jitter
  // This approach is ROBUST - it won't break with roadblocks, accidents, or any future features
  const calculateVehiclePosition = (vehicle: Vehicle) => {
    const currentNodeData = mapData.nodes.find(n => n.id === vehicle.current_node);
    const nextNodeData = vehicle.next_node ? mapData.nodes.find(n => n.id === vehicle.next_node) : null;
    
    if (!currentNodeData) return null;

    // If no next node, vehicle is at current node
    if (!nextNodeData || !vehicle.next_node) {
      // Clear smoothing for this vehicle
      smoothedPositions.current.delete(vehicle.id);
      return {
        x: scaleX(currentNodeData.x),
        y: scaleY(currentNodeData.y)
      };
    }

    // Scale node positions
    const x1 = scaleX(currentNodeData.x);
    const y1 = scaleY(currentNodeData.y);
    const x2 = scaleX(nextNodeData.x);
    const y2 = scaleY(nextNodeData.y);
    
    // Get the curve control point (same as the road)
    const curve = getCurveOffset(vehicle.current_node, vehicle.next_node, x1, y1, x2, y2);
    
    // Get backend physics position (0.0 to 1.0)
    const backendProgress = vehicle.position_on_edge || 0.0;
    const edgeKey = `${vehicle.current_node}-${vehicle.next_node}`;
    const now = Date.now();
    
    // Get or initialize smoothed position for this vehicle
    let smoothedData = smoothedPositions.current.get(vehicle.id);
    
    // Detect edge change (vehicle moved to new edge) - reset smoothing
    if (!smoothedData || smoothedData.edgeKey !== edgeKey) {
      smoothedData = {
        edgeKey,
        smoothedProgress: backendProgress,
        lastUpdate: now
      };
      smoothedPositions.current.set(vehicle.id, smoothedData);
    } else {
      // Apply exponential moving average (EMA) for smooth interpolation
      // Alpha determines smoothing strength: lower = smoother, higher = more responsive
      // Use speed-adaptive alpha: slower speeds need more smoothing
      const speed = vehicle.current_speed || 0;
      const baseAlpha = 0.3;  // Base smoothing factor
      
      // Increase smoothing (lower alpha) at low speeds where jitter is visible
      // At 0 px/s: alpha = 0.1 (heavy smoothing)
      // At 10+ px/s: alpha = 0.3 (normal smoothing)
      const speedFactor = Math.min(speed / 10, 1.0);
      const alpha = 0.1 + (baseAlpha - 0.1) * speedFactor;
      
      // EMA formula: smoothed = alpha * new + (1 - alpha) * previous
      smoothedData.smoothedProgress = alpha * backendProgress + (1 - alpha) * smoothedData.smoothedProgress;
      smoothedData.lastUpdate = now;
    }
    
    // Use smoothed progress for rendering
    const progress = Math.min(Math.max(smoothedData.smoothedProgress, 0), 1);
    
    // Calculate position on bezier curve
    const point = getPointOnCurve(x1, y1, curve.cx, curve.cy, x2, y2, progress);
    
    return {
      x: point.x,
      y: point.y
    };
  };

  return (
    <div className="bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200 relative flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Multi-Vehicle Traffic Simulation</h2>
            <p className="text-xs text-gray-500">{vehicles.length} vehicles • Real-time traffic</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCongestion(!showCongestion)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              showCongestion ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {showCongestion ? 'Hide' : 'Show'} Congestion
          </button>
          <button
            onClick={() => setShowVehicles(!showVehicles)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              showVehicles ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {showVehicles ? 'Hide' : 'Show'} Vehicles
          </button>
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredVehicle && tooltipPosition && (
        <VehicleDetailsTooltip
          vehicle={hoveredVehicle}
          x={tooltipPosition.x}
          y={tooltipPosition.y}
        />
      )}

      {/* Map canvas */}
      <div 
        className="relative bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden cursor-grab active:cursor-grabbing h-full flex-1"
        style={{ 
          touchAction: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div style={{
          transform: `translate(${panPosition.x}px, ${panPosition.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          width: 'fit-content',
          height: 'fit-content'
        }}>
          <svg 
            width={WIDTH * zoomLevel} 
            height={HEIGHT * zoomLevel}
            style={{
              display: 'block'
            }}
          >
            <g transform={`scale(${zoomLevel})`}>
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width={WIDTH} height={HEIGHT} fill="url(#grid)" />

            {/* Draw edges with congestion */}
            {mapData.edges.map((edge, idx) => {
              const fromNode = mapData.nodes.find(n => n.id === edge.from);
              const toNode = mapData.nodes.find(n => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              const x1 = scaleX(fromNode.x);
              const y1 = scaleY(fromNode.y);
              const x2 = scaleX(toNode.x);
              const y2 = scaleY(toNode.y);

              const congestion = getEdgeCongestion(edge.from, edge.to);
              const accident = hasAccident(edge.from, edge.to);
              const blocked = isBlocked(edge.from, edge.to);
              
              // Determine road color based on status
              let roadColor = congestion && showCongestion 
                ? getCongestionColor(congestion.congestion_level)
                : '#6b7280';
              
              // Override color if blocked (red) or has accident (orange)
              if (blocked) {
                roadColor = '#dc2626'; // red for blocked
              } else if (accident) {
                roadColor = '#f97316'; // orange for accident
              }
              
              const vehicleCount = getEdgeVehicleCount(edge.from, edge.to);

              const curve = getCurveOffset(edge.from, edge.to, x1, y1, x2, y2);
              const pathD = `M ${x1} ${y1} Q ${curve.cx} ${curve.cy} ${x2} ${y2}`;

              return (
                <g key={idx}>
                  {/* Road shadow */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#1f2937"
                    strokeWidth={12}
                    strokeOpacity={0.2}
                    strokeLinecap="round"
                  />
                  
                  {/* Main road with status color */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={roadColor}
                    strokeWidth={blocked ? 10 : 8}
                    strokeOpacity={0.9}
                    strokeLinecap="round"
                    strokeDasharray={edge.one_way ? '8,4' : '0'}
                  />

                  {/* Center line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth={1}
                    strokeOpacity={0.7}
                    strokeDasharray="10,6"
                  />

                  {/* Accident Warning Icon */}
                  {accident && (
                    <g>
                      <text
                        x={curve.cx}
                        y={curve.cy}
                        fontSize="24"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="select-none"
                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                      >
                        ⚠️
                      </text>
                      <text
                        x={curve.cx}
                        y={curve.cy + 20}
                        fontSize="9"
                        fontWeight="bold"
                        fill="#dc2626"
                        textAnchor="middle"
                        className="select-none"
                      >
                        {accident.severity.toUpperCase()}
                      </text>
                    </g>
                  )}

                  {/* Road Block Icon */}
                  {blocked && (
                    <g>
                      <text
                        x={curve.cx}
                        y={curve.cy}
                        fontSize="24"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="select-none"
                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                      >
                        🚧
                      </text>
                      <text
                        x={curve.cx}
                        y={curve.cy + 20}
                        fontSize="9"
                        fontWeight="bold"
                        fill="#dc2626"
                        textAnchor="middle"
                        className="select-none"
                      >
                        BLOCKED
                      </text>
                    </g>
                  )}

                  {/* Vehicle count badge (only if no accident/block icon) */}
                  {vehicleCount > 0 && !accident && !blocked && (
                    <g>
                      <circle
                        cx={curve.cx}
                        cy={curve.cy}
                        r="12"
                        fill="#ef4444"
                        stroke="white"
                        strokeWidth="2"
                      />
                      <text
                        x={curve.cx}
                        y={curve.cy}
                        fontSize="10"
                        fontWeight="bold"
                        fill="white"
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        {vehicleCount}
                      </text>
                    </g>
                  )}

                  {/* Congestion probability indicator (only if no accident/block) */}
                  {!accident && !blocked && congestion && showCongestion && congestion.congestion_probability > 0.5 && (
                    <text
                      x={curve.cx}
                      y={curve.cy - 20}
                      fontSize="9"
                      fontWeight="600"
                      fill="#dc2626"
                      textAnchor="middle"
                      className="select-none"
                    >
                      {(congestion.congestion_probability * 100).toFixed(0)}%
                    </text>
                  )}
                </g>
              );
            })}

            {/* Draw nodes */}
            {mapData.nodes.map((node) => {
              const nodeX = scaleX(node.x);
              const nodeY = scaleY(node.y);
              const vehiclesAtNode = vehicles.filter(v => v.current_node === node.id && v.status !== 'arrived');

              return (
                <g key={node.id}>
                  {/* Place icon */}
                  <text
                    x={nodeX}
                    y={nodeY - 25}
                    fontSize="18"
                    textAnchor="middle"
                    className="select-none"
                  >
                    {getPlaceIcon(node.id)}
                  </text>

                  {/* Node circle */}
                  <circle
                    cx={nodeX}
                    cy={nodeY}
                    r={8}
                    fill="#6b7280"
                    stroke="white"
                    strokeWidth="2"
                  />

                  {/* Vehicle count at node */}
                  {vehiclesAtNode.length > 0 && (
                    <g>
                      <circle
                        cx={nodeX + 12}
                        cy={nodeY - 12}
                        r="10"
                        fill="#3b82f6"
                        stroke="white"
                        strokeWidth="2"
                      />
                      <text
                        x={nodeX + 12}
                        y={nodeY - 12}
                        fontSize="9"
                        fontWeight="bold"
                        fill="white"
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        {vehiclesAtNode.length}
                      </text>
                    </g>
                  )}

                  {/* Node label */}
                  <text
                    x={nodeX}
                    y={nodeY + 20}
                    fontSize="10"
                    fontWeight="600"
                    fill="#1f2937"
                    textAnchor="middle"
                    className="select-none"
                  >
                    {node.id.replace(/_/g, ' ')}
                  </text>
                </g>
              );
            })}

            {/* Draw vehicles */}
            {showVehicles && vehicles.filter(v => v.status !== 'arrived').map((vehicle) => {
              const position = calculateVehiclePosition(vehicle);
              
              if (!position) return null;

              const isHighlighted = vehicle.id === highlightedVehicle || vehicle.id === hoveredVehicle?.id;

              return (
                <g key={vehicle.id}>
                  {/* Draw vehicle's path if hovered */}
                  {vehicle.id === hoveredVehicle?.id && vehicle.path.length > 0 && (
                    <>
                      {/* Highlight all edges in the path */}
                      {vehicle.path.map((nodeId, pathIdx) => {
                        if (pathIdx === vehicle.path.length - 1) return null;
                        
                        const fromNodeData = mapData.nodes.find(n => n.id === nodeId);
                        const toNodeData = mapData.nodes.find(n => n.id === vehicle.path[pathIdx + 1]);
                        
                        if (!fromNodeData || !toNodeData) return null;

                        const x1 = scaleX(fromNodeData.x);
                        const y1 = scaleY(fromNodeData.y);
                        const x2 = scaleX(toNodeData.x);
                        const y2 = scaleY(toNodeData.y);

                        const curve = getCurveOffset(nodeId, vehicle.path[pathIdx + 1], x1, y1, x2, y2);
                        const pathD = `M ${x1} ${y1} Q ${curve.cx} ${curve.cy} ${x2} ${y2}`;

                        // Determine if this is the current edge
                        const isCurrentEdge = nodeId === vehicle.current_node && vehicle.path[pathIdx + 1] === vehicle.next_node;

                        return (
                          <path
                            key={`path-${pathIdx}`}
                            d={pathD}
                            fill="none"
                            stroke={isCurrentEdge ? "#3b82f6" : "#60a5fa"}
                            strokeWidth={isCurrentEdge ? "10" : "6"}
                            strokeOpacity="0.7"
                            strokeLinecap="round"
                            className="pointer-events-none"
                          />
                        );
                      })}

                      {/* Highlight start and goal nodes */}
                      {(() => {
                        const startNode = mapData.nodes.find(n => n.id === vehicle.start_node);
                        const goalNode = mapData.nodes.find(n => n.id === vehicle.goal_node);

                        return (
                          <>
                            {startNode && (
                              <g>
                                <circle
                                  cx={scaleX(startNode.x)}
                                  cy={scaleY(startNode.y)}
                                  r="15"
                                  fill="#22c55e"
                                  fillOpacity="0.3"
                                  stroke="#22c55e"
                                  strokeWidth="3"
                                  className="pointer-events-none"
                                />
                                <text
                                  x={scaleX(startNode.x)}
                                  y={scaleY(startNode.y) - 25}
                                  fontSize="12"
                                  fontWeight="bold"
                                  fill="#22c55e"
                                  textAnchor="middle"
                                  className="select-none pointer-events-none"
                                >
                                  START
                                </text>
                              </g>
                            )}
                            {goalNode && (
                              <g>
                                <circle
                                  cx={scaleX(goalNode.x)}
                                  cy={scaleY(goalNode.y)}
                                  r="15"
                                  fill="#ef4444"
                                  fillOpacity="0.3"
                                  stroke="#ef4444"
                                  strokeWidth="3"
                                  className="pointer-events-none"
                                />
                                <text
                                  x={scaleX(goalNode.x)}
                                  y={scaleY(goalNode.y) - 25}
                                  fontSize="12"
                                  fontWeight="bold"
                                  fill="#ef4444"
                                  textAnchor="middle"
                                  className="select-none pointer-events-none"
                                >
                                  GOAL
                                </text>
                              </g>
                            )}
                          </>
                        );
                      })()}
                    </>
                  )}

                  {/* Highlight ring */}
                  {isHighlighted && (
                    <circle
                      cx={position.x}
                      cy={position.y}
                      r="20"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3"
                      opacity="0.6"
                      className="animate-pulse pointer-events-none"
                    />
                  )}
                  
                  {/* Vehicle with hover area */}
                  <g
                    onMouseEnter={(e) => {
                      setHoveredVehicle(vehicle);
                      const svgRect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                      if (svgRect) {
                        setTooltipPosition({
                          x: position.x * zoomLevel + svgRect.left,
                          y: position.y * zoomLevel + svgRect.top,
                        });
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredVehicle(null);
                      setTooltipPosition(null);
                    }}
                    style={{ 
                      cursor: 'pointer',
                      // GPU acceleration for smoother rendering
                      transform: 'translate3d(0, 0, 0)',
                      willChange: 'transform'
                    }}
                  >
                    {/* Larger invisible hitbox for easier hover */}
                    <circle
                      cx={position.x}
                      cy={position.y}
                      r="15"
                      fill="transparent"
                    />
                    <VehicleMarker 
                      vehicle={vehicle} 
                      x={position.x} 
                      y={position.y} 
                      scale={isHighlighted ? 1.3 : 1}
                    />
                  </g>
                </g>
              );
            })}
          </g>
        </svg>
        </div>

        {/* Map controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 pointer-events-auto">
          <button 
            onClick={handleZoomIn}
            className="bg-white p-2 rounded-lg shadow-lg border hover:bg-gray-50 transition"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button 
            onClick={handleZoomOut}
            className="bg-white p-2 rounded-lg shadow-lg border hover:bg-gray-50 transition"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <div className="bg-white px-2 py-1 rounded-lg shadow-lg border text-xs font-medium text-center">
            {Math.round(zoomLevel * 100)}%
          </div>
          <button 
            onClick={() => {
              setPanPosition({ x: 0, y: 0 });
              setZoomLevel(1);
            }}
            className="bg-white p-2 rounded-lg shadow-lg border hover:bg-gray-50 transition"
            title="Reset view"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 border-t border-gray-200 p-3 flex-shrink-0">
        <div className="grid grid-cols-7 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-1 bg-green-500 rounded"></div>
            <span>Free Flow</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-1 bg-lime-500 rounded"></div>
            <span>Light</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-1 bg-yellow-500 rounded"></div>
            <span>Moderate</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-1 bg-orange-500 rounded"></div>
            <span>Heavy</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-1 bg-red-500 rounded"></div>
            <span>Congested</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-base">⚠️</span>
            <span>Accident</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-base">🚧</span>
            <span>Road Block</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiVehicleMapVisualization;
