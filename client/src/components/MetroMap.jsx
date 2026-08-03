import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Info, Layers } from 'lucide-react';

const MetroMap = ({
  stations,
  userLocation,
  nearestStation,
  onSelectStation,
  selectedStation,
  sourceStation,
  destStation,
  calculatedRoute,
  onSelectSource,
  onSelectDest,
  activeMode,
  comparisonData,
}) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const layersGroupRef = useRef(null);
  const initialFitDone = useRef(false);

  // Line theme colors mapping
  const getLineColor = (line) => {
    switch (line) {
      case 'Purple':
        return '#A855F7'; // purple-500
      case 'Green':
        return '#22C55E';  // green-500
      case 'Yellow':
        return '#EAB308'; // yellow-500
      default:
        return '#64748B'; // slate-500
    }
  };

  // 1. Initialize map on mount
  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      // Create map centered on Bangalore
      mapInstance.current = L.map(mapRef.current, {
        center: [12.9716, 77.5946],
        zoom: 12,
        zoomControl: true,
        maxZoom: 18,
        minZoom: 10,
      });

      // Add Esri World Imagery (Satellite) tile layer
      const satelliteLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        }
      ).addTo(mapInstance.current);

      // Add Hybrid Reference Overlay (Labels and boundaries)
      L.tileLayer(
        'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          opacity: 0.9,
          attribution: '&copy; Esri reference overlay',
        }
      ).addTo(mapInstance.current);

      // Initialize layer group to manage dynamic markers and lines
      layersGroupRef.current = L.layerGroup().addTo(mapInstance.current);
    }

    // Cleanup map instance on unmount
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Check if a connection is part of the calculated path
  const isLinkActiveRoute = (fromCode, toCode) => {
    if (!calculatedRoute || !calculatedRoute.path || calculatedRoute.path.length < 2) return false;
    const path = calculatedRoute.path;
    for (let i = 0; i < path.length - 1; i++) {
      const c1 = path[i].code;
      const c2 = path[i + 1].code;
      if ((c1 === fromCode && c2 === toCode) || (c1 === toCode && c2 === fromCode)) {
        return true;
      }
    }
    return false;
  };

  // Check if station is part of the calculated path
  const isStationActiveRoute = (code) => {
    if (!calculatedRoute || !calculatedRoute.path) return false;
    return calculatedRoute.path.some((s) => s.code === code);
  };

  // 2. Update map layer elements (markers, polylines, paths) on state change
  useEffect(() => {
    if (!mapInstance.current || !layersGroupRef.current || !stations || stations.length === 0) return;

    // Clear previous layers
    layersGroupRef.current.clearLayers();

    const hasRoute = calculatedRoute && calculatedRoute.path && calculatedRoute.path.length > 0;
    const drawnEdges = new Set();
    const mapBoundsPoints = [];

    // Draw Route Polyline Edges (Background and Active overlays)
    stations.forEach((station) => {
      const fromLatLng = [station.coordinates.lat, station.coordinates.lng];
      mapBoundsPoints.push(fromLatLng);

      station.connections.forEach((conn) => {
        const dest = stations.find((s) => s._id === conn.stationId || s.code === conn.stationId);
        if (dest) {
          const edgeId = [station.code, dest.code].sort().join('-');
          if (!drawnEdges.has(edgeId)) {
            drawnEdges.add(edgeId);

            const toLatLng = [dest.coordinates.lat, dest.coordinates.lng];
            const isActive = isLinkActiveRoute(station.code, dest.code);
            const lineColor = getLineColor(station.line);

            // Determine opacity
            let opacity = 0.8;
            if (hasRoute) {
              opacity = isActive ? 1.0 : 0.15;
            }

            // Draw primary route polyline
            if (station.line !== dest.line) {
              // Interchange connection (dashed gray)
              L.polyline([fromLatLng, toLatLng], {
                color: '#64748B',
                weight: isActive ? 6 : 3,
                dashArray: '5, 5',
                opacity: opacity,
              }).addTo(layersGroupRef.current);
            } else {
              // Standard line connection
              L.polyline([fromLatLng, toLatLng], {
                color: lineColor,
                weight: isActive ? 7 : 5,
                opacity: opacity,
              }).addTo(layersGroupRef.current);

              // If active, overlay a blinking/dashed line on top for flow animation
              if (isActive) {
                L.polyline([fromLatLng, toLatLng], {
                  color: '#FFFFFF',
                  weight: 3,
                  dashArray: '8, 8',
                  opacity: 0.9,
                }).addTo(layersGroupRef.current);
              }
            }
          }
        }
      });
    });

    // Draw Stations as Circle Markers
    stations.forEach((station) => {
      const isSelected = selectedStation && selectedStation._id === station._id;
      const isSource = sourceStation && sourceStation._id === station._id;
      const isDest = destStation && destStation._id === station._id;
      const isActiveInRoute = isStationActiveRoute(station.code);
      const lineColor = getLineColor(station.line);

      // Determine colors and sizing
      let markerRadius = station.isInterchange ? 7 : 5;
      let markerColor = lineColor;
      let fillColor = '#0F172A';
      let fillOpacity = 0.9;
      let opacity = 0.9;

      if (isSource) {
        markerRadius = 8;
        markerColor = '#10B981'; // emerald-500
        fillColor = '#10B981';
      } else if (isDest) {
        markerRadius = 8;
        markerColor = '#F43F5E'; // rose-500
        fillColor = '#F43F5E';
      } else if (isSelected) {
        markerRadius = 7.5;
        markerColor = '#C084FC'; // purple-400
        fillColor = '#3B0764';
      }

      if (hasRoute) {
        // Dim out stations not in route
        const active = isActiveInRoute || isSource || isDest;
        opacity = active ? 1.0 : 0.25;
        fillOpacity = active ? 0.9 : 0.15;
      }

      const marker = L.circleMarker([station.coordinates.lat, station.coordinates.lng], {
        radius: markerRadius,
        color: markerColor,
        weight: isSelected || isSource || isDest ? 3.5 : 2,
        fillColor: fillColor,
        fillOpacity: fillOpacity,
        opacity: opacity,
      }).addTo(layersGroupRef.current);

      // Bind tooltips
      let tooltipContent = station.name;
      if (isSource) tooltipContent = `🟢 START: ${station.name}`;
      if (isDest) tooltipContent = `🔴 END: ${station.name}`;
      
      const isPermanent = station.isInterchange || isSelected || isSource || isDest;

      marker.bindTooltip(tooltipContent, {
        permanent: isPermanent,
        direction: 'right',
        className: `px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[10px] font-bold text-slate-200 shadow-xl ${
          isSource ? 'border-emerald-500/50 text-emerald-300' : isDest ? 'border-rose-500/50 text-rose-300' : ''
        }`,
      });

      // Handle click event on stations
      marker.on('click', () => {
        onSelectStation(station);
      });
    });

    // Draw User Location
    if (userLocation && userLocation.lat && userLocation.lng) {
      // Outer pulse ring
      L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 14,
        color: '#3B82F6',
        weight: 1,
        fillColor: '#3B82F6',
        fillOpacity: 0.15,
        opacity: 0.4,
      }).addTo(layersGroupRef.current);

      // Center marker
      const userMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 6,
        color: '#FFFFFF',
        weight: 1.5,
        fillColor: '#3B82F6',
        fillOpacity: 1.0,
        opacity: 1.0,
      }).addTo(layersGroupRef.current);

      userMarker.bindTooltip('You Are Here 🏠', {
        permanent: true,
        direction: 'top',
        className: 'px-2 py-0.5 rounded bg-blue-600 border border-blue-400 text-[9px] font-black text-white shadow-md',
      });

      // Geolocation dashed connection line to nearest station
      if (nearestStation) {
        L.polyline(
          [
            [userLocation.lat, userLocation.lng],
            [nearestStation.coordinates.lat, nearestStation.coordinates.lng],
          ],
          {
            color: '#3B82F6',
            weight: 2,
            dashArray: '5, 5',
            opacity: 0.8,
          }
        ).addTo(layersGroupRef.current);
      }
    }

    // Draw dynamic driving overlays based on active mode
    if (activeMode === 'hybrid' && comparisonData?.hybrid && destStation) {
      const exitStationCoords = [
        comparisonData.hybrid.exitStation.coordinates.lat,
        comparisonData.hybrid.exitStation.coordinates.lng
      ];
      const destCoords = [
        destStation.coordinates.lat,
        destStation.coordinates.lng
      ];
      
      // Draw the Uber cab leg of the hybrid route (Vibrant Blue dashed line)
      L.polyline([exitStationCoords, destCoords], {
        color: '#3B82F6',
        weight: 5,
        dashArray: '8, 8',
        opacity: 0.9,
      }).addTo(layersGroupRef.current);
    } else if (activeMode === 'uber' && sourceStation && destStation) {
      const startCoords = [
        sourceStation.coordinates.lat,
        sourceStation.coordinates.lng
      ];
      const destCoords = [
        destStation.coordinates.lat,
        destStation.coordinates.lng
      ];

      // Draw direct Uber route
      L.polyline([startCoords, destCoords], {
        color: '#3B82F6',
        weight: 6,
        dashArray: '8, 8',
        opacity: 0.95,
      }).addTo(layersGroupRef.current);
    }

    // Adjust Map Fit Bounds
    if (hasRoute) {
      // Zoom map to fit the calculated route path perfectly
      const routePoints = calculatedRoute.path.map((s) => [s.coordinates.lat, s.coordinates.lng]);
      
      // Include cab start/endpoints to fit map bounds correctly
      if (activeMode === 'hybrid' && comparisonData?.hybrid && destStation) {
        routePoints.push([destStation.coordinates.lat, destStation.coordinates.lng]);
      } else if (activeMode === 'uber' && sourceStation && destStation) {
        routePoints.push([sourceStation.coordinates.lat, sourceStation.coordinates.lng]);
        routePoints.push([destStation.coordinates.lat, destStation.coordinates.lng]);
      }

      const bounds = L.latLngBounds(routePoints);
      mapInstance.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (stations.length > 0 && !initialFitDone.current) {
      // Center map on all stations on load
      const bounds = L.latLngBounds(mapBoundsPoints);
      mapInstance.current.fitBounds(bounds, { padding: [40, 40] });
      initialFitDone.current = true;
    }
  }, [stations, userLocation, nearestStation, selectedStation, sourceStation, destStation, calculatedRoute, activeMode, comparisonData]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row animate-fadeIn">
      {/* Satellite Map Div */}
      <div className="flex-1 flex flex-col rounded-2xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur-xl shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-400 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-100">Satellite Metro Map</h2>
          </div>
          {/* Legend */}
          <div className="flex gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#A855F7]" /> Purple
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#22C55E]" /> Green
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#EAB308]" /> Yellow
            </span>
          </div>
        </div>

        {/* Map Container Target Div */}
        <div
          ref={mapRef}
          id="map"
          className="rounded-xl border border-slate-900 shadow-inner overflow-hidden"
          style={{ height: '520px', minHeight: '400px' }}
        />
      </div>

      {/* Sidebar Details Panel */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        {selectedStation ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-xl shadow-2xl">
            <span
              className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: `${getLineColor(selectedStation.line)}20`,
                color: getLineColor(selectedStation.line),
                border: `1px solid ${getLineColor(selectedStation.line)}50`,
              }}
            >
              {selectedStation.line} Line
            </span>

            <h3 className="mt-3 text-xl font-black text-slate-100">{selectedStation.name}</h3>
            <p className="text-xs text-slate-400 font-mono">Code: {selectedStation.code}</p>

            {/* Set as Start / End Action Buttons */}
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-800/80 pt-4">
              <button
                type="button"
                onClick={() => onSelectSource(selectedStation)}
                className="flex items-center justify-center rounded-lg bg-emerald-600/10 border border-emerald-500/30 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
              >
                Set as Start
              </button>
              <button
                type="button"
                onClick={() => onSelectDest(selectedStation)}
                className="flex items-center justify-center rounded-lg bg-rose-600/10 border border-rose-500/30 py-2 text-xs font-bold text-rose-400 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
              >
                Set as End
              </button>
            </div>

            <div className="mt-4 border-t border-slate-800 pt-4 space-y-2 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Interchange Station</span>
                <span className="font-semibold text-slate-200">
                  {selectedStation.isInterchange ? 'Yes 🔄' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>GPS Coordinates</span>
                <span className="font-mono text-slate-300">
                  {selectedStation.coordinates.lat.toFixed(4)}, {selectedStation.coordinates.lng.toFixed(4)}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Connected Stations</h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {selectedStation.connections.map((conn, idx) => {
                  const target = stations.find((s) => s._id === conn.stationId || s.code === conn.stationId);
                  if (!target) return null;
                  return (
                    <div
                      key={idx}
                      onClick={() => onSelectStation(target)}
                      className="flex items-center justify-between rounded-lg border border-slate-900 bg-slate-950/40 p-2 hover:bg-slate-800/20 transition-colors cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: getLineColor(target.line) }}
                        />
                        <span className="font-semibold text-slate-300">{target.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {conn.distance} km
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/10 p-6 text-center text-slate-400 backdrop-blur-sm">
            <Info className="h-8 w-8 text-slate-500 mb-2" />
            <p className="text-sm font-medium">Select any station on the map to set it as route start/end, or view properties</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetroMap;
