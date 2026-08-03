import React, { useState, useEffect, useRef } from 'react';
import { User, MapPin, Compass, Check, AlertCircle, LogOut, Search } from 'lucide-react';

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const r = 6371; // Earth radius in km
  const p = Math.PI / 180;
  
  const a = 0.5 - Math.cos((lat2 - lat1) * p) / 2 +
            Math.cos(lat1 * p) * Math.cos(lat2 * p) *
            (1 - Math.cos((lon2 - lon1) * p)) / 2;

  return r * 2 * Math.asin(Math.sqrt(a));
};

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

const UserProfile = ({ user, token, onUpdateProfile, onLogout, stations, onSetNearestStation }) => {
  const [lat, setLat] = useState(user?.location?.lat || 12.9716);
  const [lng, setLng] = useState(user?.location?.lng || 77.5946);
  const [address, setAddress] = useState(user?.location?.address || 'Bangalore Central');
  const [searchQuery, setSearchQuery] = useState(user?.location?.address || 'Bangalore Central');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [localNearestStation, setLocalNearestStation] = useState(null);
  const [googleMapsKey, setGoogleMapsKey] = useState(localStorage.getItem('google_maps_api_key') || '');

  const autocompleteRef = useRef(null);

  // Sync state if user prop changes
  useEffect(() => {
    if (user?.location) {
      setLat(user.location.lat);
      setLng(user.location.lng);
      setAddress(user.location.address);
      setSearchQuery(user.location.address);
    }
  }, [user]);

  // Compute nearest station whenever lat, lng, or stations list changes
  useEffect(() => {
    if (stations && stations.length > 0 && lat && lng) {
      let minDistance = Infinity;
      let nearest = null;

      stations.forEach((station) => {
        const dist = calculateDistance(lat, lng, station.coordinates.lat, station.coordinates.lng);
        if (dist < minDistance) {
          minDistance = dist;
          nearest = { ...station, distanceToUser: dist };
        }
      });

      setLocalNearestStation(nearest);
      if (onSetNearestStation) {
        onSetNearestStation(nearest);
      }
    }
  }, [lat, lng, stations]);

  // Click outside listener for dropdown close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on autocomplete search
  const getFilteredOptions = () => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();

    // Match stations
    const matchedStations = stations
      .filter((s) => s.name.toLowerCase().includes(query) || s.code.toLowerCase().includes(query))
      .map((s) => ({
        label: s.name,
        lat: s.coordinates.lat,
        lng: s.coordinates.lng,
        type: 'station',
        line: s.line,
        original: s,
      }));

    // Match landmarks
    const matchedLandmarks = LANDMARKS.filter((l) => l.name.toLowerCase().includes(query)).map((l) => {
      const station = stations.find((s) => s.code === l.stationCode);
      return {
        label: l.name,
        lat: station ? station.coordinates.lat : 12.9716,
        lng: station ? station.coordinates.lng : 77.5946,
        type: 'landmark',
        line: station ? station.line : '',
        original: station,
      };
    });

    return [...matchedStations, ...matchedLandmarks].slice(0, 6);
  };

  const filteredOptions = getFilteredOptions();

  // Select suggestion
  const handleSelectOption = (opt) => {
    setLat(opt.lat);
    setLng(opt.lng);
    setAddress(opt.label);
    setSearchQuery(opt.label);
    setShowDropdown(false);
  };

  // Geolocation trigger
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLat = position.coords.latitude;
        const currentLng = position.coords.longitude;
        setLat(currentLat);
        setLng(currentLng);
        const label = `GPS Location (${currentLat.toFixed(4)}, ${currentLng.toFixed(4)})`;
        setAddress(label);
        setSearchQuery(label);
        setIsLocating(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsLocating(false);
        setErrorMessage('Failed to query browser GPS location');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Submit profile settings
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveStatus('saving');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          location: {
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            address,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSaveStatus('success');
        onUpdateProfile(data);
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('error');
        setErrorMessage(data.message || 'Failed to update location settings');
      }
    } catch (err) {
      console.error('Update profile error:', err);
      setSaveStatus('error');
      setErrorMessage('Network error occurred while saving profile');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-xl shadow-2xl">
      {/* Header section */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-slate-100 text-lg">{user?.name}</h3>
            <p className="text-xs text-slate-400 font-medium">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/40 text-slate-400 hover:border-rose-900/50 hover:bg-rose-950/20 hover:text-rose-400 transition-all shadow-sm"
          title="Sign Out"
        >
          <LogOut className="h-4.5 w-4.5" />
        </button>
      </div>

      <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Location Settings</label>
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={isLocating}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors shadow-md"
          >
            <Compass className={`h-3.5 w-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Locating...' : 'Get GPS'}</span>
          </button>
        </div>

        {/* Smart Autocomplete Search Bar */}
        <div ref={autocompleteRef} className="relative">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
            Search Location / Station
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setShowDropdown(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-11 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-purple-500 focus:outline-none transition-colors"
              placeholder="Type landmark or station name..."
            />
          </div>

          {/* Autocomplete Dropdown list */}
          {showDropdown && filteredOptions.length > 0 && (
            <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-2 shadow-2xl">
              {filteredOptions.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectOption(opt)}
                  className="w-full flex items-center justify-between rounded-lg p-2 hover:bg-slate-900 transition-colors text-left text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-200">{opt.label}</p>
                    <p className="text-[9px] text-slate-500 uppercase mt-0.5">
                      {opt.type === 'landmark' ? 'Landmark' : 'Metro Station'}
                    </p>
                  </div>
                  {opt.line && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[8px] font-bold border"
                      style={{
                        backgroundColor: `${opt.line === 'Purple' ? '#A855F7' : opt.line === 'Green' ? '#22C55E' : '#EAB308'}15`,
                        color: opt.line === 'Purple' ? '#C084FC' : opt.line === 'Green' ? '#4ADE80' : '#FACC15',
                        borderColor: `${opt.line === 'Purple' ? '#A855F7' : opt.line === 'Green' ? '#22C55E' : '#EAB308'}30`,
                      }}
                    >
                      {opt.line}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Read-Only Coordinates display box */}
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-950/40 p-3 border border-slate-900/60 text-xs">
          <div>
            <span className="block text-[9px] font-bold uppercase text-slate-600 mb-0.5">Latitude</span>
            <span className="font-mono text-slate-300 font-semibold">{lat.toFixed(4)}</span>
          </div>
          <div>
            <span className="block text-[9px] font-bold uppercase text-slate-600 mb-0.5">Longitude</span>
            <span className="font-mono text-slate-300 font-semibold">{lng.toFixed(4)}</span>
          </div>
        </div>

        {/* Optional Google Maps API Key Input */}
        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
            Google Maps API Key (Optional)
          </label>
          <input
            type="password"
            value={googleMapsKey}
            onChange={(e) => {
              setGoogleMapsKey(e.target.value);
              localStorage.setItem('google_maps_api_key', e.target.value);
            }}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-300 placeholder-slate-600 focus:border-purple-500 focus:outline-none transition-colors"
            placeholder="AIzaSy... (Enables Google driving Routes API)"
          />
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-950/30 border border-rose-900/50 p-3 text-xs text-rose-400">
            <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
            <p className="font-medium">{errorMessage}</p>
          </div>
        )}

        {saveStatus === 'success' && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-950/30 border border-emerald-900/50 p-3 text-xs text-emerald-400">
            <Check className="h-4.5 w-4.5 flex-shrink-0 animate-bounce" />
            <p className="font-medium">Settings saved & synced!</p>
          </div>
        )}

        <button
          type="submit"
          disabled={saveStatus === 'saving'}
          className="w-full flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-2.5 text-sm font-black text-white hover:from-purple-500 hover:to-indigo-500 focus:outline-none transition-all shadow-lg"
        >
          {saveStatus === 'saving' ? 'Saving...' : 'Save Location Settings'}
        </button>
      </form>

      {/* Closest Station Details */}
      {localNearestStation && (
        <div className="mt-6 border-t border-slate-800 pt-5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            <MapPin className="h-4 w-4 text-purple-400 animate-pulse" />
            <span>Closest Station Details</span>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-base font-black text-slate-100">{localNearestStation.name}</h4>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Code: {localNearestStation.code}</p>
              </div>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{
                  backgroundColor: `${localNearestStation.line === 'Purple' ? '#A855F7' : localNearestStation.line === 'Green' ? '#22C55E' : '#EAB308'}15`,
                  color: localNearestStation.line === 'Purple' ? '#C084FC' : localNearestStation.line === 'Green' ? '#4ADE80' : '#FACC15',
                  border: `1px solid ${localNearestStation.line === 'Purple' ? '#A855F7' : localNearestStation.line === 'Green' ? '#22C55E' : '#EAB308'}30`,
                }}
              >
                {localNearestStation.line} Line
              </span>
            </div>

            <div className="mt-3 flex justify-between border-t border-slate-900 pt-3 text-xs">
              <span className="text-slate-400">Straight-line distance</span>
              <span className="font-bold text-blue-400 font-mono">
                {localNearestStation.distanceToUser.toFixed(2)} km away
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
