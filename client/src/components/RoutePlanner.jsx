import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowUpDown, MapPin, Navigation, Info, DollarSign, Clock, HelpCircle, Car, RefreshCw, Zap } from 'lucide-react';

const LANDMARKS = [
  { name: 'Lalbagh Botanical Garden', stationCode: 'LBGH' },
  { name: 'Cubbon Park Garden', stationCode: 'CPBK' },
  { name: 'Vidhana Soudha (Assembly)', stationCode: 'VSVY' },
  { name: 'Kempegowda Majestic Bus Stand', stationCode: 'MSJP' },
  { name: 'Yeshwanthpur Railway Station', stationCode: 'YWPR' },
  { name: 'KSR Bengaluru City Railway Station', stationCode: 'CTRW' },
  { name: 'Forum Mall Koramangala', stationCode: 'BTML' },
  { name: 'Central Silk Board Junction', stationCode: 'CNRK' },
  { name: 'Phoenix Marketcity Mall', stationCode: 'MSTH' },
  { name: 'M.G. Road Boulevard / UB City', stationCode: 'MGRD' },
];

const RoutePlanner = ({ 
  stations, 
  sourceStation, 
  destStation, 
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

  const sourceRef = useRef(null);
  const destRef = useRef(null);

  // Sync inputs with props
  useEffect(() => {
    setSourceSearch(sourceStation ? sourceStation.name : '');
  }, [sourceStation]);

  useEffect(() => {
    setDestSearch(destStation ? destStation.name : '');
  }, [destStation]);

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

  const getFilteredOptions = (query) => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();

    const matchedStations = stations
      .filter((s) => s.name.toLowerCase().includes(lowerQuery) || s.code.toLowerCase().includes(lowerQuery))
      .map((s) => ({ type: 'station', label: s.name, code: s.code, line: s.line, original: s }));

    const matchedLandmarks = LANDMARKS.filter((l) => l.name.toLowerCase().includes(lowerQuery)).map((l) => {
      const station = stations.find((s) => s.code === l.stationCode);
      return {
        type: 'landmark',
        label: `${l.name} (Nearest: ${station ? station.name : ''})`,
        code: l.stationCode,
        line: station ? station.line : '',
        original: station,
      };
    });

    return [...matchedStations, ...matchedLandmarks].slice(0, 8);
  };

  const sourceOptions = getFilteredOptions(sourceSearch);
  const destOptions = getFilteredOptions(destSearch);

  const handleSwap = () => {
    const tempSource = sourceStation;
    onSelectSource(destStation);
    onSelectDest(tempSource);
  };

  // Build step-by-step directions for the currently selected activeMode
  const getDirections = () => {
    if (activeMode === 'metro') {
      if (!calculatedRoute || !calculatedRoute.path) return [];
      const path = calculatedRoute.path;
      const directions = [];
      const start = path[0];
      const end = path[path.length - 1];

      directions.push({
        text: `Walk to ${start.name} Metro Station (${comparisonData?.pureMetro?.walkToStartKm || 0} km, ~${comparisonData?.pureMetro?.walkToStartTimeMinutes || 0} mins)`,
        type: 'walk',
      });

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

      directions.push({
        text: `Walk to your destination coordinates (${comparisonData?.pureMetro?.walkFromEndKm || 0} km, ~${comparisonData?.pureMetro?.walkFromEndTimeMinutes || 0} mins)`,
        type: 'walk',
      });

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
      return [
        {
          text: `Walk to ${start.name} Metro Station (${comparisonData?.pureMetro?.walkToStartKm || 0} km, ~${comparisonData?.pureMetro?.walkToStartTimeMinutes || 0} mins)`,
          type: 'walk',
        },
        {
          text: `Board ${start.line} Line at ${start.name} Station`,
          type: 'board',
          line: start.line,
        },
        {
          text: `Ride metro for ${hyb.metroTimeMinutes} mins and de-board at ${hyb.exitStation.name}`,
          type: 'exit',
          line: hyb.exitStation.line,
        },
        {
          text: `Exit station and board Uber cab (allow ~5 mins waiting buffer)`,
          type: 'uber-board',
        },
        {
          text: `Take cab from ${hyb.exitStation.name} directly to destination for ${hyb.cabDistanceKm} km (~${hyb.cabTimeMinutes} mins)`,
          type: 'uber-drive',
        },
        {
          text: `Arrive at destination`,
          type: 'uber-arrive',
        }
      ];
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
    <div className="flex flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-xl shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-purple-400 animate-pulse" />
          <h2 className="text-lg font-black text-slate-100">Find Metro Route</h2>
        </div>
        {(sourceStation || destStation) && (
          <button
            onClick={onClearRoute}
            className="text-xs font-bold text-rose-400 hover:text-rose-300 hover:underline"
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
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-11 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition-colors"
              placeholder="Type station name or landmark (e.g. Lalbagh)"
            />
          </div>

          {sourceDropdown && sourceOptions.length > 0 && (
            <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-2 shadow-2xl">
              {sourceOptions.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onSelectSource(opt.original);
                    setSourceSearch(opt.original.name);
                    setSourceDropdown(false);
                  }}
                  className="w-full flex items-center justify-between rounded-lg p-2.5 hover:bg-slate-900 transition-colors text-left text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-200">{opt.label}</p>
                    <p className="text-[10px] text-slate-500 uppercase mt-0.5">
                      {opt.type === 'landmark' ? 'Landmark' : `Station • ${opt.code}`}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getLineBadgeStyle(opt.line)}`}>
                    {opt.line}
                  </span>
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
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-purple-500/50 hover:bg-purple-950/20 transition-all shadow-md"
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
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-11 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-rose-500 focus:outline-none transition-colors"
              placeholder="Type station name or landmark (e.g. UB City)"
            />
          </div>

          {destDropdown && destOptions.length > 0 && (
            <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-2 shadow-2xl">
              {destOptions.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onSelectDest(opt.original);
                    setDestSearch(opt.original.name);
                    setDestDropdown(false);
                  }}
                  className="w-full flex items-center justify-between rounded-lg p-2.5 hover:bg-slate-900 transition-colors text-left text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-200">{opt.label}</p>
                    <p className="text-[10px] text-slate-500 uppercase mt-0.5">
                      {opt.type === 'landmark' ? 'Landmark' : `Station • ${opt.code}`}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getLineBadgeStyle(opt.line)}`}>
                    {opt.line}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Suggested Quick Landmarks shortcut when empty */}
      {!sourceStation && !destStation && (
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/20 p-3">
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
                className="rounded-lg border border-slate-800/85 bg-slate-950/40 px-2 py-1 text-[10px] font-semibold text-slate-400 hover:border-purple-500/30 hover:text-purple-400 hover:bg-purple-950/10 transition-all"
              >
                {l.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preference Toggle & Smart Comparison Cards */}
      {comparisonLoading && (
        <div className="flex flex-col items-center justify-center p-6 text-slate-400 rounded-xl bg-slate-950/20 border border-slate-800/50">
          <RefreshCw className="h-6 w-6 animate-spin text-purple-500 mb-2" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Comparing routes & Uber predictions...</p>
        </div>
      )}

      {!comparisonLoading && comparisonData && (
        <div className="space-y-4">
          
          {/* Preference Switcher */}
          <div className="space-y-1">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Route Preference Priority</span>
            <div className="flex gap-2 rounded-xl bg-slate-950/60 p-1 border border-slate-850">
              <button
                type="button"
                onClick={() => setPreference('cheaper')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-black transition-all ${preference === 'cheaper' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Cheaper Preference
              </button>
              <button
                type="button"
                onClick={() => setPreference('faster')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-black transition-all ${preference === 'faster' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Faster Preference
              </button>
            </div>
          </div>

          {/* Comparative Cards Dashboard */}
          <div className="flex flex-col gap-2">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Select Mode to View Directions</span>
            
            {/* 1. Metro Option Card */}
            <button
              type="button"
              onClick={() => setActiveMode('metro')}
              className={`w-full flex items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                activeMode === 'metro' 
                  ? 'border-emerald-500/60 bg-emerald-500/5 shadow-md shadow-emerald-500/5' 
                  : 'border-slate-850 bg-slate-950/20 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🚇</span>
                <div>
                  <h4 className="text-xs font-black text-slate-200">Namma Metro</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Flat transit fare</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-emerald-400 font-mono">₹{comparisonData.pureMetro.totalCostRupees}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{comparisonData.pureMetro.totalTimeMinutes} mins</p>
              </div>
            </button>

            {/* 2. Hybrid Option Card */}
            {comparisonData.hybrid && (
              <button
                type="button"
                onClick={() => setActiveMode('hybrid')}
                className={`w-full flex items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                  activeMode === 'hybrid' 
                    ? 'border-purple-500/60 bg-purple-500/5 shadow-md shadow-purple-500/5' 
                    : 'border-slate-850 bg-slate-950/20 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚡</span>
                  <div>
                    <h4 className="text-xs font-black text-slate-200">Metro + Cab Hybrid</h4>
                    <p className="text-[9px] font-bold text-purple-400 uppercase mt-0.5">Via {comparisonData.hybrid.exitStation.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-purple-400 font-mono">₹{comparisonData.hybrid.totalCostRupees.toFixed(0)}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{comparisonData.hybrid.totalTimeMinutes} mins</p>
                </div>
              </button>
            )}

            {/* 3. Pure Uber Card */}
            <button
              type="button"
              onClick={() => setActiveMode('uber')}
              className={`w-full flex items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                activeMode === 'uber' 
                  ? 'border-blue-500/60 bg-blue-500/5 shadow-md shadow-blue-500/5' 
                  : 'border-slate-850 bg-slate-950/20 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🚗</span>
                <div>
                  <h4 className="text-xs font-black text-slate-200">Direct Uber Cab</h4>
                  <p className="text-[10px] text-slate-500 font-medium">{comparisonData.pureUber.distanceKm} km drive</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-blue-400 font-mono">₹{comparisonData.pureUber.costRupees.toFixed(0)}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{comparisonData.pureUber.timeMinutes} mins</p>
              </div>
            </button>
          </div>

          {/* Active Recommendation Banner */}
          {activeRec && (
            <div className={`rounded-xl border p-4 bg-gradient-to-r ${
              activeRec.type === 'hybrid' 
                ? 'from-purple-950/20 to-indigo-950/20 border-purple-500/20' 
                : activeRec.type === 'uber'
                ? 'from-blue-950/20 to-slate-950/20 border-blue-500/20'
                : 'from-emerald-950/20 to-slate-950/20 border-emerald-500/20'
            }`}>
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className={`h-4.5 w-4.5 ${
                  activeRec.type === 'hybrid' ? 'text-purple-400' : activeRec.type === 'uber' ? 'text-blue-400' : 'text-emerald-400'
                } animate-bounce`} />
                <span className="text-xs font-black text-slate-200 uppercase tracking-wider">
                  Recommended: {activeRec.title}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                {activeRec.reason}
              </p>
            </div>
          )}

          {/* Journey directions */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 border-b border-slate-900 pb-2 flex items-center justify-between">
              <span>Directions Detail</span>
              <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono uppercase">
                {activeMode}
              </span>
            </h3>
            
            <div className="relative pl-5 border-l border-slate-800 space-y-4">
              {getDirections().map((step, idx) => (
                <div key={idx} className="relative">
                  {/* Step pin indicators */}
                  <span
                    className={`absolute -left-[24.5px] top-0.5 flex h-2 w-2 rounded-full border border-slate-950 ${
                      step.type === 'board' || step.type === 'uber-board'
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                        : step.type === 'exit' || step.type === 'uber-arrive'
                        ? 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]'
                        : step.type === 'transfer'
                        ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]'
                        : 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]'
                    }`}
                  />
                  
                  <p className="text-xs text-slate-200 leading-relaxed font-semibold">{step.text}</p>
                  
                  {step.type === 'transfer' && (
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-[9px] font-bold uppercase bg-slate-800 text-slate-400 px-1 rounded">Switch Line</span>
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
