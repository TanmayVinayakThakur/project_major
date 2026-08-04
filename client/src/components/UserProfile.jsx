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
  { name: 'Vidhana Soudha (Assembly)', stationCode: 'AMBD' },
  { name: 'Kempegowda Majestic Bus Stand', stationCode: 'MSJP' },
  { name: 'Yeshwanthpur Railway Station', stationCode: 'YWPR' },
  { name: 'KSR Bengaluru City Railway Station', stationCode: 'CTRW' },
  { name: 'Forum Mall Koramangala', stationCode: 'BTML' },
  { name: 'Central Silk Board Junction', stationCode: 'SLKB' },
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

  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch autocomplete suggestions when searchQuery changes
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setAutocompleteSuggestions([]);
      return;
    }

    // Do not search if it exactly matches the currently active address
    if (searchQuery === address) {
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setIsSearching(true);
        const gKey = localStorage.getItem('google_maps_api_key') || '';
        const res = await fetch(`/api/location/autocomplete?input=${encodeURIComponent(searchQuery)}`, {
          headers: {
            'x-google-maps-key': gKey
          }
        });
        if (res.ok) {
          const data = await res.json();
          setAutocompleteSuggestions(data);
        }
      } catch (err) {
        console.error('Error fetching autocomplete:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, address]);

  // Select suggestion and geocode it if needed
  const handleSelectOption = async (opt) => {
    if (opt.type === 'google') {
      try {
        setSaveStatus('saving');
        setErrorMessage('');
        const gKey = localStorage.getItem('google_maps_api_key') || '';
        const res = await fetch(`/api/location/geocode?placeId=${opt.placeId}`, {
          headers: {
            'x-google-maps-key': gKey
          }
        });
        if (res.ok) {
          const data = await res.json();
          setLat(data.lat);
          setLng(data.lng);
          setAddress(data.address);
          setSearchQuery(data.address);
          setSaveStatus(null);
        } else {
          setErrorMessage('Failed to geocode selected address.');
          setSaveStatus(null);
        }
      } catch (err) {
        console.error('Geocoding error:', err);
        setErrorMessage('Error connecting to geocoding service.');
        setSaveStatus(null);
      }
    } else {
      // Local fallback (station or landmark)
      setLat(opt.lat);
      setLng(opt.lng);
      setAddress(opt.description);
      setSearchQuery(opt.description);
    }
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
        const label = 'GPS Current Location';
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
    <div className="rounded-2xl border border-emerald-100 bg-white/70 p-6 backdrop-blur-xl shadow-lg shadow-emerald-500/5">
      {/* Header section */}
      <div className="flex items-center justify-between border-b border-emerald-50 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 shadow-sm">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-lg">{user?.name}</h3>
            <p className="text-xs text-slate-500 font-medium">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-rose-350 hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm"
          title="Sign Out"
        >
          <LogOut className="h-4.5 w-4.5" />
        </button>
      </div>

      <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Location Settings</label>
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={isLocating}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-sm"
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
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setShowDropdown(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white/80 pl-11 pr-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-all shadow-sm focus:ring-1 focus:ring-emerald-500"
              placeholder="Type landmark or station name..."
            />
          </div>

          {/* Autocomplete Dropdown list */}
          {showDropdown && (autocompleteSuggestions.length > 0 || isSearching) && (
            <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-emerald-100 bg-white p-2 shadow-xl">
              {isSearching && (
                <div className="p-3 text-center text-xs text-slate-500 font-medium animate-pulse">
                  Searching addresses...
                </div>
              )}
              {autocompleteSuggestions.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectOption(opt)}
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
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-all shadow-sm focus:ring-1 focus:ring-emerald-500"
            placeholder="AIzaSy... (Enables Google driving Routes API)"
          />
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-600 font-medium">
            <AlertCircle className="h-4.5 w-4.5 flex-shrink-0 text-rose-500" />
            <p>{errorMessage}</p>
          </div>
        )}

        {saveStatus === 'success' && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-600 font-medium">
            <Check className="h-4.5 w-4.5 flex-shrink-0 animate-bounce text-emerald-500" />
            <p className="font-medium">Settings saved & synced!</p>
          </div>
        )}

        <button
          type="submit"
          disabled={saveStatus === 'saving'}
          className="w-full flex items-center justify-center rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 focus:outline-none transition-all shadow-sm focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          {saveStatus === 'saving' ? 'Saving...' : 'Save Location Settings'}
        </button>
      </form>

      {/* Closest Station Details */}
      {localNearestStation && (
        <div className="mt-6 border-t border-emerald-50 pt-5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            <MapPin className="h-4 w-4 text-emerald-600 animate-pulse" />
            <span>Closest Station Details</span>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-base font-black text-slate-800">{localNearestStation.name}</h4>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Code: {localNearestStation.code}</p>
              </div>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{
                  backgroundColor: `${localNearestStation.line === 'Purple' ? '#A855F7' : localNearestStation.line === 'Green' ? '#22C55E' : '#EAB308'}15`,
                  color: localNearestStation.line === 'Purple' ? '#A855F7' : localNearestStation.line === 'Green' ? '#15803D' : '#854D0E',
                  border: `1px solid ${localNearestStation.line === 'Purple' ? '#A855F7' : localNearestStation.line === 'Green' ? '#22C55E' : '#EAB308'}30`,
                }}
              >
                {localNearestStation.line} Line
              </span>
            </div>

            <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-xs">
              <span className="text-slate-500">Straight-line distance</span>
              <span className="font-bold text-emerald-600 font-mono">
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
