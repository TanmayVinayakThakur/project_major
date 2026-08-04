import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowUpDown, MapPin, Navigation, Info, DollarSign, Clock, HelpCircle, Car, RefreshCw, Zap } from 'lucide-react';

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
  setActiveMode
}) => {
  const [sourceSearch, setSourceSearch] = useState('');
  const [destSearch, setDestSearch] = useState('');
  const [sourceDropdown, setSourceDropdown] = useState(false);
  const [destDropdown, setDestDropdown] = useState(false);
  
  const [sourceSuggestions, setSourceSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [sourceSearching, setSourceSearching] = useState(false);
  const [destSearching, setDestSearching] = useState(false);

  const sourceRef = useRef(null);
  const destRef = useRef(null);

  // Sync inputs with props/locations
  useEffect(() => {
    setSourceSearch(sourceLocation ? sourceLocation.name : (sourceStation ? sourceStation.name : ''));
  }, [sourceStation, sourceLocation]);

  useEffect(() => {
    setDestSearch(destLocation ? destLocation.name : (destStation ? destStation.name : ''));
  }, [destStation, destLocation]);

  // Click outside helper
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

  // Autocomplete for Source Search Input
  useEffect(() => {
    if (!sourceSearch || sourceSearch.trim().length < 3) {
      setSourceSuggestions([]);
      return;
    }
    const currentName = sourceLocation ? sourceLocation.name : (sourceStation ? sourceStation.name : '');
    if (sourceSearch === currentName) {
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setSourceSearching(true);
        const gKey = localStorage.getItem('google_maps_api_key') || '';
        const res = await fetch(`/api/location/autocomplete?input=${encodeURIComponent(sourceSearch)}`, {
          headers: {
            'x-google-maps-key': gKey
          }
        });
        if (res.ok) {
          const data = await res.json();
          setSourceSuggestions(data);
        }
      } catch (err) {
        console.error('Error fetching source autocomplete:', err);
      } finally {
        setSourceSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [sourceSearch, sourceLocation, sourceStation]);

  // Autocomplete for Destination Search Input
  useEffect(() => {
    if (!destSearch || destSearch.trim().length < 3) {
      setDestSuggestions([]);
      return;
    }
    const currentName = destLocation ? destLocation.name : (destStation ? destStation.name : '');
    if (destSearch === currentName) {
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setDestSearching(true);
        const gKey = localStorage.getItem('google_maps_api_key') || '';
        const res = await fetch(`/api/location/autocomplete?input=${encodeURIComponent(destSearch)}`, {
          headers: {
            'x-google-maps-key': gKey
          }
        });
        if (res.ok) {
          const data = await res.json();
          setDestSuggestions(data);
        }
      } catch (err) {
        console.error('Error fetching dest autocomplete:', err);
      } finally {
        setDestSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [destSearch, destLocation, destStation]);

  // Select suggestion handlers
  const handleSelectSourceOption = async (opt) => {
    if (opt.type === 'google') {
      try {
        setSourceSearch('Resolving address...');
        const gKey = localStorage.getItem('google_maps_api_key') || '';
        const res = await fetch(`/api/location/geocode?placeId=${opt.placeId}`, {
          headers: {
            'x-google-maps-key': gKey
          }
        });
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
          setSourceSearch('');
        }
      } catch (err) {
        console.error('Source geocoding error:', err);
        setSourceSearch('');
      }
    } else {
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
    }
    setSourceDropdown(false);
  };

  const handleSelectDestOption = async (opt) => {
    if (opt.type === 'google') {
      try {
        setDestSearch('Resolving address...');
        const gKey = localStorage.getItem('google_maps_api_key') || '';
        const res = await fetch(`/api/location/geocode?placeId=${opt.placeId}`, {
          headers: {
            'x-google-maps-key': gKey
          }
        });
        if (res.ok) {
          const data = await res.json();
          onSelectDest({
            name: data.address,
            lat: data.lat,
            lng: data.lng,
            isStation: false
          });
          setDestSearch(data.address);
        } else {
          setDestSearch('');
        }
      } catch (err) {
        console.error('Dest geocoding error:', err);
        setDestSearch('');
      }
    } else {
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

  // Build step-by-step directions for the currently selected activeMode
  const getDirections = () => {
    const walkToStartKm = comparisonData?.pureMetro?.walkToStartKm || 0;
    const walkToStartTime = comparisonData?.pureMetro?.walkToStartTimeMinutes || 0;
    const walkFromEndKm = comparisonData?.pureMetro?.walkFromEndKm || 0;
    const walkFromEndTime = comparisonData?.pureMetro?.walkFromEndTimeMinutes || 0;

    const startCabFare = Math.max(60, Math.ceil(20 + walkToStartKm * 14));
    const startCabTime = Math.ceil(walkToStartKm * 3); // Approx 20 km/h avg speed -> 3 mins per km
    
    const endCabFare = Math.max(60, Math.ceil(20 + walkFromEndKm * 14));
    const endCabTime = Math.ceil(walkFromEndKm * 3);

    if (activeMode === 'metro') {
      if (!calculatedRoute || !calculatedRoute.path) return [];
      const path = calculatedRoute.path;
      const directions = [];
      const start = path[0];
      const end = path[path.length - 1];

      // Walk or Cab to start metro station
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

      // Walk or Cab from end metro station to destination
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

      // Walk or Cab to start metro station
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
        text: `Take cab from ${hyb.exitStation.name} directly to destination for ${hyb.cabDistanceKm} km (~${hyb.cabTimeMinutes} mins) — ~₹${hybridEndCabFare}`,
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

  const getLineBadgeStyle = (line) => {
    switch (line) {
      case 'Purple':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/30';
      case 'Green':
        return 'bg-green-500/10 text-green-400 border border-green-500/30';
      case 'Yellow':
        return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/30';
    }
  };

  // Get active recommendation object
  const activeRec = comparisonData?.recommendations 
    ? (preference === 'faster' ? comparisonData.recommendations.faster : comparisonData.recommendations.cheaper)
    : null;

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-emerald-100 bg-white/85 p-5 shadow-lg shadow-emerald-500/5">
      <div className="flex items-center justify-between border-b border-emerald-50 pb-3">
        <div className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-emerald-600 animate-pulse" />
          <h2 className="text-lg font-black text-emerald-850">Find Metro Route</h2>
        </div>
        {(sourceStation || destStation) && (
          <button
            onClick={onClearRoute}
            className="text-xs font-bold text-rose-500 hover:text-rose-400 hover:underline"
          >
            Clear Fields
          </button>
        )}
      </div>

      {/* Input forms */}
      <div className="relative flex flex-col gap-4">
        {/* Source */}
        <div ref={sourceRef} className="relative">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Origin / Starting Point
          </label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-3 h-4.5 w-4.5 text-emerald-400" />
            <input
              type="text"
              value={sourceSearch}
              onFocus={() => setSourceDropdown(true)}
              onChange={(e) => {
                setSourceSearch(e.target.value);
                setSourceDropdown(true);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white/80 pl-11 pr-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-all shadow-sm focus:ring-1 focus:ring-emerald-500"
              placeholder="Type station name or landmark (e.g. Lalbagh)"
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
                      {opt.type === 'google' ? 'Google Maps Address' : opt.type === 'station' ? 'Metro Station' : 'Landmark'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Swap Button */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10">
          <button
            type="button"
            onClick={handleSwap}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-100 bg-white text-emerald-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all shadow-sm"
            title="Swap"
          >
            <ArrowUpDown className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Destination */}
        <div ref={destRef} className="relative">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Where to? (Destination)
          </label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-3 h-4.5 w-4.5 text-rose-400" />
            <input
              type="text"
              value={destSearch}
              onFocus={() => setDestDropdown(true)}
              onChange={(e) => {
                setDestSearch(e.target.value);
                setDestDropdown(true);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white/80 pl-11 pr-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-all shadow-sm focus:ring-1 focus:ring-emerald-500"
              placeholder="Type station name or landmark (e.g. UB City)"
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
                      {opt.type === 'google' ? 'Google Maps Address' : opt.type === 'station' ? 'Metro Station' : 'Landmark'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Suggested Quick Landmarks shortcut when empty */}
      {!sourceStation && !destStation && (
        <div className="rounded-xl border border-emerald-100 bg-white/50 p-3 shadow-sm">
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

      {/* Preference Toggle & Smart Comparison Cards */}
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
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Route Preference Priority</span>
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
                  {/* Step pin indicators */}
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
