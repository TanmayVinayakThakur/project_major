import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowUpDown, MapPin, Compass, Info, RefreshCw, Zap } from 'lucide-react';

const LANDMARKS = [
  { name: 'Lalbagh Botanical Garden', stationCode: 'LBGH' },
  { name: 'Cubbon Park Garden', stationCode: 'CPBK' },
  { name: 'Vidhana Soudha (Assembly)', stationCode: 'AMBD' },
  { name: 'Kempegowda Majestic Bus Stand', stationCode: 'MSJP' },
  { name: 'Yeshwanthpur Railway Station', stationCode: 'YWPR' },
  { name: 'KSR Bengaluru City Railway Station', stationCode: 'CTRW' },
  { name: 'Forum Mall Koramangala', stationCode: 'BTML' },
  { name: 'Central Silk Board Junction', stationCode: 'SLKB' },
  { name: 'Phoenix Marketcity Mall', stationCode: 'MSTH' },
  { name: 'M.G. Road Boulevard / UB City', stationCode: 'MGRD' },
];

const RoutePlanner = ({ 
  stations, 
  sourceStation, 
  destStation, 
  sourceLocation,
  destLocation,
  onSelectSource, 
  onSelectDest, 
  calculatedRoute, 
  onClearRoute,
  comparisonData,
  comparisonLoading,
  preference,
  setPreference,
  activeMode,
  setActiveMode,
  view = 'setup', // 'setup' | 'results'
  onPlanCommute
}) => {
  const [sourceSearch, setSourceSearch] = useState('');
  const [destSearch, setDestSearch] = useState('');
  const [sourceDropdown, setSourceDropdown] = useState(false);
  const [destDropdown, setDestDropdown] = useState(false);
  
  const [sourceSuggestions, setSourceSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [sourceSearching, setSourceSearching] = useState(false);
  const [destSearching, setDestSearching] = useState(false);

  const [gpsMode, setGpsMode] = useState('manual'); // 'gps' | 'manual'
  const [locatingGPS, setLocatingGPS] = useState(false);

  const sourceRef = useRef(null);
  const destRef = useRef(null);

  // Sync inputs with props/locations
  useEffect(() => {
    setSourceSearch(sourceLocation ? sourceLocation.name : (sourceStation ? sourceStation.name : ''));
  }, [sourceStation, sourceLocation]);

  useEffect(() => {
    setDestSearch(destLocation ? destLocation.name : (destStation ? destStation.name : ''));
  }, [destStation, destLocation]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sourceRef.current && !sourceRef.current.contains(event.target)) {
        setSourceDropdown(false);
      }
      if (destRef.current && !destRef.current.contains(event.target)) {
        setDestDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autocomplete debounce source search
  useEffect(() => {
    if (sourceSearch.length < 2 || sourceLocation || sourceStation) {
      setSourceSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setSourceSearching(true);
        const res = await fetch(`/api/location/autocomplete?input=${encodeURIComponent(sourceSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setSourceSuggestions(data);
        }
      } catch (err) {
        console.error('Error fetching autocomplete:', err);
      } finally {
        setSourceSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [sourceSearch, sourceLocation, sourceStation]);

  // Autocomplete debounce dest search
  useEffect(() => {
    if (destSearch.length < 2 || destLocation || destStation) {
      setDestSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setDestSearching(true);
        const res = await fetch(`/api/location/autocomplete?input=${encodeURIComponent(destSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setDestSuggestions(data);
        }
      } catch (err) {
        console.error('Error fetching autocomplete:', err);
      } finally {
        setDestSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [destSearch, destLocation, destStation]);

  // GPS auto detector via reverse-geocoding endpoint
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
          const res = await fetch(`/api/location/reverse?lat=${lat}&lng=${lng}`);
          if (res.ok) {
            const data = await res.json();
            onSelectSource({
              name: data.address,
              lat: data.lat,
              lng: data.lng,
              isStation: false
            });
            setSourceSearch(data.address);
          } else {
            onSelectSource({
              name: 'GPS Current Location',
              lat,
              lng,
              isStation: false
            });
            setSourceSearch('GPS Current Location');
          }
        } catch (err) {
          console.error(err);
          onSelectSource({
            name: 'GPS Current Location',
            lat,
            lng,
            isStation: false
          });
          setSourceSearch('GPS Current Location');
        } finally {
          setLocatingGPS(false);
        }
      },
      (error) => {
        console.error(error);
        alert('GPS location detection failed or permission denied.');
        setLocatingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Select suggestion handlers
  const handleSelectSourceOption = async (opt) => {
    const matchedStation = stations.find(s => opt.description.startsWith(s.name));
    if (matchedStation) {
      onSelectSource({
        name: matchedStation.name,
        lat: matchedStation.coordinates.lat,
        lng: matchedStation.coordinates.lng,
        isStation: true,
        stationCode: matchedStation.code
      });
      setSourceSearch(matchedStation.name);
    } else {
      onSelectSource({
        name: opt.description,
        lat: opt.lat,
        lng: opt.lng,
        isStation: false
      });
      setSourceSearch(opt.description);
    }
    setSourceDropdown(false);
  };

  const handleSelectDestOption = async (opt) => {
    const matchedStation = stations.find(s => opt.description.startsWith(s.name));
    if (matchedStation) {
      onSelectDest({
        name: matchedStation.name,
        lat: matchedStation.coordinates.lat,
        lng: matchedStation.coordinates.lng,
        isStation: true,
        stationCode: matchedStation.code
      });
      setDestSearch(matchedStation.name);
    } else {
      onSelectDest({
        name: opt.description,
        lat: opt.lat,
        lng: opt.lng,
        isStation: false
      });
      setDestSearch(opt.description);
    }
    setDestDropdown(false);
  };

  const handleSwap = () => {
    const tempLoc = sourceLocation;
    const tempStation = sourceStation;
    
    if (destLocation) {
      onSelectSource({ ...destLocation, isStation: !!destStation, stationCode: destStation?.code });
    } else if (destStation) {
      onSelectSource({ name: destStation.name, lat: destStation.coordinates.lat, lng: destStation.coordinates.lng, isStation: true, stationCode: destStation.code });
    } else {
      onSelectSource(null);
    }

    if (tempLoc) {
      onSelectDest({ ...tempLoc, isStation: !!tempStation, stationCode: tempStation?.code });
    } else if (tempStation) {
      onSelectDest({ name: tempStation.name, lat: tempStation.coordinates.lat, lng: tempStation.coordinates.lng, isStation: true, stationCode: tempStation.code });
    } else {
      onSelectDest(null);
    }
  };

  // Build directions
  const getDirections = () => {
    const walkToStartKm = comparisonData?.pureMetro?.walkToStartKm || 0;
    const walkToStartTime = comparisonData?.pureMetro?.walkToStartTimeMinutes || 0;
    const walkFromEndKm = comparisonData?.pureMetro?.walkFromEndKm || 0;
    const walkFromEndTime = comparisonData?.pureMetro?.walkFromEndTimeMinutes || 0;

    const startCabFare = Math.max(60, Math.ceil(20 + walkToStartKm * 14));
    const startCabTime = Math.ceil(walkToStartKm * 3);
    const endCabFare = Math.max(60, Math.ceil(20 + walkFromEndKm * 14));
    const endCabTime = Math.ceil(walkFromEndKm * 3);

    if (activeMode === 'metro') {
      if (!calculatedRoute || !calculatedRoute.path) return [];
      const path = calculatedRoute.path;
      const directions = [];
      const start = path[0];
      const end = path[path.length - 1];

      if (walkToStartKm > 0.05) {
        directions.push({
          text: `🚶 Walk to ${start.name} Metro Station (${walkToStartKm} km, ~${walkToStartTime} mins) — ₹0`,
          type: 'walk',
        });
        directions.push({
          text: `🚖 OR take Cab/Auto to ${start.name} (${walkToStartKm} km, ~${startCabTime} mins) — ~₹${startCabFare}`,
          type: 'cab-alt',
        });
      } else {
        directions.push({
          text: `Enter ${start.name} Metro Station`,
          type: 'walk',
        });
      }

      directions.push({
        text: `Board ${start.line} Line at ${start.name} (Towards direction of travel)`,
        type: 'board',
        line: start.line,
      });

      calculatedRoute.interchanges.forEach((change) => {
        directions.push({
          text: `At ${change.station}, swap from the ${change.fromLine} Line to the ${change.toLine} Line`,
          type: 'transfer',
          from: change.fromLine,
          to: change.toLine,
          station: change.station,
        });
      });

      directions.push({
        text: `De-board at ${end.name} Metro Station`,
        type: 'exit',
        line: end.line,
      });

      if (walkFromEndKm > 0.05) {
        directions.push({
          text: `🚶 Walk to your destination (${walkFromEndKm} km, ~${walkFromEndTime} mins) — ₹0`,
          type: 'walk',
        });
        directions.push({
          text: `🚖 OR take Cab/Auto to destination (${walkFromEndKm} km, ~${endCabTime} mins) — ~₹${endCabFare}`,
          type: 'cab-alt',
        });
      } else {
        directions.push({
          text: `Arrive at your destination`,
          type: 'walk',
        });
      }
      return directions;
    }

    if (activeMode === 'uber') {
      if (!comparisonData?.pureUber) return [];
      const uber = comparisonData.pureUber;
      return [
        {
          text: `Board Uber cab directly at your starting location`,
          type: 'uber-board',
        },
        {
          text: `Drive via road network for ${uber.distanceKm} km (~${uber.timeMinutes} mins)`,
          type: 'uber-drive',
        },
        {
          text: `Arrive at destination coordinates`,
          type: 'uber-arrive',
        }
      ];
    }

    if (activeMode === 'hybrid') {
      if (!comparisonData?.hybrid) return [];
      const hyb = comparisonData.hybrid;
      const start = sourceStation;
      
      const hybridEndCabFare = Math.ceil(hyb.cabFare);
      const directions = [];

      if (walkToStartKm > 0.05) {
        directions.push({
          text: `🚶 Walk to ${start.name} Metro Station (${walkToStartKm} km, ~${walkToStartTime} mins) — ₹0`,
          type: 'walk',
        });
        directions.push({
          text: `🚖 OR take Cab/Auto to ${start.name} (${walkToStartKm} km, ~${startCabTime} mins) — ~₹${startCabFare}`,
          type: 'cab-alt',
        });
      } else {
        directions.push({
          text: `Enter ${start.name} Metro Station`,
          type: 'walk',
        });
      }

      directions.push({
        text: `Board ${start.line} Line at ${start.name} Station`,
        type: 'board',
        line: start.line,
      });

      directions.push({
        text: `Ride metro for ${hyb.metroTimeMinutes} mins and de-board at ${hyb.exitStation.name}`,
        type: 'exit',
        line: hyb.exitStation.line,
      });

      directions.push({
        text: `Exit station and board Uber cab (allow ~5 mins waiting buffer)`,
        type: 'uber-board',
      });

      directions.push({
        text: `Drive final ${hyb.cabDistanceKm} km via road to destination (~${hyb.cabTimeMinutes} mins) — ~₹${hybridEndCabFare}`,
        type: 'uber-drive',
      });

      directions.push({
        text: `Arrive at destination`,
        type: 'uber-arrive',
      });
      return directions;
    }
    return [];
  };

  const activeRec = comparisonData?.recommendations 
    ? (preference === 'faster' ? comparisonData.recommendations.faster : comparisonData.recommendations.cheaper)
    : null;

  // Render view components
  if (view === 'setup') {
    const isReady = (sourceLocation || sourceStation) && (destLocation || destStation);
    return (
      <div className="w-full max-w-2xl mx-auto rounded-3xl border border-emerald-100 bg-white/95 p-6 md:p-8 shadow-xl shadow-emerald-500/5 animate-fadeIn">
        <div className="text-center mb-6">
          <span className="inline-block rounded-2xl bg-emerald-500/10 p-3 text-emerald-600 shadow-sm mb-3">
            <Compass className="h-6 w-6 animate-pulse" />
          </span>
          <h2 className="text-2xl font-black text-emerald-850">Plan Your Commute</h2>
          <p className="text-slate-500 text-xs font-semibold mt-1">Select starting point and destination in Bangalore</p>
        </div>

        <div className="space-y-6">
          {/* Origin Section */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
              Origin / Starting Point
            </label>
            
            {/* GPS vs Manual Toggle */}
            <div className="flex gap-2 rounded-xl bg-slate-100 p-1 border border-slate-200 shadow-inner max-w-xs">
              <button
                type="button"
                onClick={() => {
                  setGpsMode('gps');
                  onSelectSource(null);
                  setSourceSearch('');
                }}
                className={`flex-1 rounded-lg py-1 px-2.5 text-[10px] font-bold transition-all ${gpsMode === 'gps' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Use GPS Location
              </button>
              <button
                type="button"
                onClick={() => {
                  setGpsMode('manual');
                  onSelectSource(null);
                  setSourceSearch('');
                }}
                className={`flex-1 rounded-lg py-1 px-2.5 text-[10px] font-bold transition-all ${gpsMode === 'manual' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Type Address
              </button>
            </div>

            {gpsMode === 'gps' ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={locatingGPS}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 shadow-sm transition-all disabled:opacity-55 text-sm"
                >
                  {locatingGPS ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Locating GPS...</span>
                    </>
                  ) : (
                    <>
                      <Compass className="h-4 w-4" />
                      <span>Detect My Location</span>
                    </>
                  )}
                </button>
                {sourceLocation && (
                  <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/30 text-emerald-800 font-semibold text-xs flex items-center gap-2 shadow-sm animate-fadeIn">
                    <MapPin className="h-4 w-4 text-emerald-600 flex-shrink-0 animate-bounce" />
                    <span className="truncate">{sourceLocation.name}</span>
                  </div>
                )}
              </div>
            ) : (
              <div ref={sourceRef} className="relative">
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 h-4.5 w-4.5 text-emerald-500" />
                  <input
                    type="text"
                    value={sourceSearch}
                    onFocus={() => setSourceDropdown(true)}
                    onChange={(e) => {
                      setSourceSearch(e.target.value);
                      onSelectSource(null);
                      setSourceDropdown(true);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-all shadow-sm focus:ring-1 focus:ring-emerald-500"
                    placeholder="Type starting station, mall, or landmark..."
                  />
                </div>

                {sourceDropdown && (sourceSuggestions.length > 0 || sourceSearching) && (
                  <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-emerald-100 bg-white p-2 shadow-xl">
                    {sourceSearching && (
                      <div className="p-3 text-center text-xs text-slate-500 font-medium animate-pulse">
                        Searching addresses...
                      </div>
                    )}
                    {sourceSuggestions.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSourceOption(opt)}
                        className="w-full flex items-center justify-between rounded-lg p-2.5 hover:bg-emerald-50/50 transition-colors text-left text-xs border border-transparent hover:border-emerald-100"
                      >
                        <div className="flex-1 pr-2">
                          <p className="font-bold text-slate-700">{opt.description}</p>
                          <p className="text-[9px] text-slate-400 uppercase mt-0.5 font-semibold tracking-wider">
                            {opt.type === 'google' ? 'Google Maps Address' : opt.type === 'osm' ? 'Address / Landmark' : opt.type === 'station' ? 'Metro Station' : 'Landmark'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Swap Button (only manual) */}
          {gpsMode === 'manual' && (
            <div className="flex justify-center -my-3">
              <button
                type="button"
                onClick={handleSwap}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-100 bg-white text-emerald-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all shadow-sm"
                title="Swap Directions"
              >
                <ArrowUpDown className="h-4.5 w-4.5" />
              </button>
            </div>
          )}

          {/* Destination Section */}
          <div ref={destRef} className="relative space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
              Where to? (Destination)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3 h-4.5 w-4.5 text-rose-500" />
              <input
                type="text"
                value={destSearch}
                onFocus={() => setDestDropdown(true)}
                onChange={(e) => {
                  setDestSearch(e.target.value);
                  onSelectDest(null);
                  setDestDropdown(true);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-all shadow-sm focus:ring-1 focus:ring-emerald-500"
                placeholder="Type destination station, landmark, or mall..."
              />
            </div>

            {destDropdown && (destSuggestions.length > 0 || destSearching) && (
              <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-emerald-100 bg-white p-2 shadow-xl">
                {destSearching && (
                  <div className="p-3 text-center text-xs text-slate-500 font-medium animate-pulse">
                    Searching addresses...
                  </div>
                )}
                {destSuggestions.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectDestOption(opt)}
                    className="w-full flex items-center justify-between rounded-lg p-2.5 hover:bg-emerald-50/50 transition-colors text-left text-xs border border-transparent hover:border-emerald-100"
                  >
                    <div className="flex-1 pr-2">
                      <p className="font-bold text-slate-700">{opt.description}</p>
                      <p className="text-[9px] text-slate-400 uppercase mt-0.5 font-semibold tracking-wider">
                        {opt.type === 'google' ? 'Google Maps Address' : opt.type === 'osm' ? 'Address / Landmark' : opt.type === 'station' ? 'Metro Station' : 'Landmark'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Suggested Quick Landmarks shortcut when empty */}
          {(!sourceStation && !destStation) && (
            <div className="rounded-xl border border-emerald-100 bg-white/50 p-3.5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Popular Bangalore Destinations</p>
              <div className="flex flex-wrap gap-1.5">
                {LANDMARKS.slice(0, 5).map((l, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const station = stations.find((s) => s.code === l.stationCode);
                      if (station) {
                        onSelectDest(station);
                        setDestSearch(station.name);
                      }
                    }}
                    className="rounded-lg border border-emerald-100 bg-white px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:border-emerald-300 hover:text-emerald-800 hover:bg-emerald-50/30 transition-all shadow-sm"
                  >
                    {l.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Wizard CTA button */}
          <button
            type="button"
            disabled={!isReady}
            onClick={onPlanCommute}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white font-bold py-3 px-4 shadow-sm hover:bg-emerald-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            <span>Plan My Commute</span>
          </button>
        </div>
      </div>
    );
  }

  // view === 'results'
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-emerald-100 bg-white/85 p-5 shadow-lg shadow-emerald-500/5 animate-fadeIn">
      {(sourceStation || destStation) && (
        <div className="flex justify-end -mb-2">
          <button
            onClick={onClearRoute}
            className="text-xs font-bold text-rose-500 hover:text-rose-400 hover:underline"
          >
            Clear Fields
          </button>
        </div>
      )}

      {comparisonLoading && (
        <div className="flex flex-col items-center justify-center p-6 text-slate-500 rounded-xl bg-white/50 border border-emerald-100 shadow-sm animate-pulse">
          <RefreshCw className="h-6 w-6 animate-spin text-emerald-600 mb-2" />
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Comparing routes & Uber predictions...</p>
        </div>
      )}

      {!comparisonLoading && comparisonData && (
        <div className="space-y-4">
          {/* Preference Switcher */}
          <div className="space-y-1">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 font-bold">Route Preference Priority</span>
            <div className="flex gap-2 rounded-xl bg-slate-100 p-1 border border-slate-200 shadow-inner">
              <button
                type="button"
                onClick={() => setPreference('cheaper')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-black transition-all ${preference === 'cheaper' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Cheaper Preference
              </button>
              <button
                type="button"
                onClick={() => setPreference('faster')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-black transition-all ${preference === 'faster' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Faster Preference
              </button>
            </div>
          </div>

          {/* Comparative Cards Dashboard */}
          <div className="flex flex-col gap-2">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 font-bold">Select Mode to View Directions</span>
            
            {/* 1. Metro Option Card */}
            <button
              type="button"
              onClick={() => setActiveMode('metro')}
              className={`w-full flex items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                activeMode === 'metro' 
                  ? 'border-emerald-500 bg-emerald-50/70 shadow-sm shadow-emerald-500/5' 
                  : 'border-slate-205 bg-white hover:border-emerald-300 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🚇</span>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Namma Metro</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Flat transit fare</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-emerald-600 font-mono">₹{comparisonData.pureMetro.totalCostRupees}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{comparisonData.pureMetro.totalTimeMinutes} mins</p>
              </div>
            </button>

            {/* 2. Hybrid Option Card */}
            {comparisonData.hybrid && (
              <button
                type="button"
                onClick={() => setActiveMode('hybrid')}
                className={`w-full flex items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                  activeMode === 'hybrid' 
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-sm shadow-emerald-500/5' 
                    : 'border-slate-205 bg-white hover:border-emerald-300 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚡</span>
                  <div>
                    <h4 className="text-xs font-black text-slate-800">Metro + Cab Hybrid</h4>
                    <p className="text-[9px] font-bold text-emerald-700 uppercase mt-0.5">Via {comparisonData.hybrid.exitStation.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-700 font-mono">₹{comparisonData.hybrid.totalCostRupees.toFixed(0)}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{comparisonData.hybrid.totalTimeMinutes} mins</p>
                </div>
              </button>
            )}

            {/* 3. Pure Uber Card */}
            <button
              type="button"
              onClick={() => setActiveMode('uber')}
              className={`w-full flex items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                activeMode === 'uber' 
                  ? 'border-emerald-500 bg-emerald-50/70 shadow-sm shadow-emerald-500/5' 
                  : 'border-slate-205 bg-white hover:border-emerald-300 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🚗</span>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Direct Uber Cab</h4>
                  <p className="text-[10px] text-slate-500 font-medium">{comparisonData.pureUber.distanceKm} km drive</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-emerald-600 font-mono">₹{comparisonData.pureUber.costRupees.toFixed(0)}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{comparisonData.pureUber.timeMinutes} mins</p>
              </div>
            </button>
          </div>

          {/* Active Recommendation Banner */}
          {activeRec && (
            <div className="rounded-xl border border-emerald-100 p-4 bg-emerald-50/30 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className="h-4.5 w-4.5 text-emerald-600 animate-bounce" />
                <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                  Recommended: {activeRec.title}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                {activeRec.reason}
              </p>
            </div>
          )}

          {/* Journey directions */}
          <div className="rounded-xl border border-emerald-100 bg-white/60 p-4 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 border-b border-emerald-50 pb-2 flex items-center justify-between font-bold">
              <span>Directions Detail</span>
              <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono uppercase font-bold">
                {activeMode}
              </span>
            </h3>
            
            <div className="relative pl-5 border-l border-slate-200 space-y-4">
              {getDirections().map((step, idx) => (
                <div key={idx} className="relative">
                  <span
                    className={`absolute -left-[24.5px] top-0.5 flex h-2 w-2 rounded-full border border-white ${
                      step.type === 'board' || step.type === 'uber-board'
                        ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]'
                        : step.type === 'exit' || step.type === 'uber-arrive'
                        ? 'bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]'
                        : step.type === 'transfer'
                        ? 'bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.4)]'
                        : 'bg-emerald-600 shadow-[0_0_6px_rgba(16,185,129,0.4)]'
                    }`}
                  />
                  
                  <p className="text-xs text-slate-700 leading-relaxed font-semibold">{step.text}</p>
                  
                  {step.type === 'transfer' && (
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-[9px] font-bold uppercase bg-slate-100 text-slate-500 px-1 rounded font-bold">Switch Line</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutePlanner;
