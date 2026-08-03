import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import MetroMap from './components/MetroMap';
import UserProfile from './components/UserProfile';
import RoutePlanner from './components/RoutePlanner';
import { ShieldAlert, RefreshCw, Compass } from 'lucide-react';

// Haversine distance helper
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const r = 6371; // Earth radius in km
  const p = Math.PI / 180;
  const a = 0.5 - Math.cos((lat2 - lat1) * p) / 2 +
            Math.cos(lat1 * p) * Math.cos(lat2 * p) *
            (1 - Math.cos((lon2 - lon1) * p)) / 2;
  return r * 2 * Math.asin(Math.sqrt(a));
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [stations, setStations] = useState([]);
  
  // Routing States
  const [sourceStation, setSourceStation] = useState(null);
  const [destStation, setDestStation] = useState(null);
  const [calculatedRoute, setCalculatedRoute] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [preference, setPreference] = useState('cheaper'); // 'cheaper' | 'faster'
  const [activeMode, setActiveMode] = useState('metro'); // 'metro' | 'uber' | 'hybrid'

  const [selectedStation, setSelectedStation] = useState(null);
  const [nearestStation, setNearestStation] = useState(null);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [userSyncing, setUserSyncing] = useState(!!localStorage.getItem('token'));
  const [connectionError, setConnectionError] = useState(false);

  // 1. Helper to find closest station to coordinates
  const findAndSetClosestStation = (lat, lng, stationList) => {
    const list = stationList || stations;
    if (!list || list.length === 0) return null;

    let minDistance = Infinity;
    let closest = null;

    list.forEach((station) => {
      const dist = calculateDistance(lat, lng, station.coordinates.lat, station.coordinates.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closest = station;
      }
    });

    if (closest) {
      setNearestStation(closest);
      setSourceStation(closest); // AUTOMATIC SELECTION of Source Station!
      setSelectedStation(closest);
    }
    return closest;
  };

  // 2. Fetch all metro stations
  const fetchStations = async () => {
    try {
      setStationsLoading(true);
      const res = await fetch('/api/stations');
      if (res.ok) {
        const data = await res.json();
        setStations(data);
        setConnectionError(false);
        return data;
      } else {
        console.error('Failed to load stations');
        setConnectionError(true);
        return [];
      }
    } catch (err) {
      console.error('Error fetching stations:', err);
      setConnectionError(true);
      return [];
    } finally {
      setStationsLoading(false);
    }
  };

  // 3. Auto geolocation lookup
  const triggerAutoGeolocation = (stationList) => {
    if (!navigator.geolocation) return;

    console.log('Requesting automatic browser geolocation (high accuracy)...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        console.log(`Automatic geolocation success: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

        // Update local location state
        const updatedLocation = {
          lat,
          lng,
          address: `Current GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        };

        setUser((prev) => {
          if (!prev) return null;
          // Update the user's active coordinate set
          return { ...prev, location: updatedLocation };
        });

        // Recalculate and select closest station from live GPS coordinates
        findAndSetClosestStation(lat, lng, stationList);
      },
      (error) => {
        console.warn('Browser geolocation prompt declined or failed. Sticking to profile defaults:', error.message);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // 4. Sync session and load routes
  useEffect(() => {
    const initializeApp = async () => {
      const fetchedStations = await fetchStations();
      
      if (!token) {
        setUserSyncing(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const profileData = await res.json();
          setUser(profileData);

          // If the user profile contains a saved location, set that as the initial default
          if (profileData.location && profileData.location.lat && profileData.location.lng) {
            findAndSetClosestStation(profileData.location.lat, profileData.location.lng, fetchedStations);
          }

          // Trigger live browser geolocation automatically to override profile coordinates with active GPS location
          triggerAutoGeolocation(fetchedStations);

        } else {
          handleLogout();
        }
      } catch (err) {
        console.error('Error syncing user session:', err);
      } finally {
        setUserSyncing(false);
      }
    };

    initializeApp();
  }, [token]);

  // 5. Automatically calculate route when source & destination are selected
  useEffect(() => {
    const fetchCalculatedRoute = async () => {
      if (!sourceStation || !destStation) {
        setCalculatedRoute(null);
        setComparisonData(null);
        return;
      }

      try {
        setComparisonLoading(true);
        
        // 1. Fetch Namma Metro Dijkstra route
        const resRoute = await fetch(`/api/route?from=${sourceStation.code}&to=${destStation.code}`);
        if (resRoute.ok) {
          const dataRoute = await resRoute.json();
          setCalculatedRoute(dataRoute);
        }

        // 2. Fetch comparative (Uber vs Metro vs Hybrid) data
        const gKey = localStorage.getItem('google_maps_api_key') || '';
        const resCompare = await fetch('/api/compare', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-google-maps-key': gKey
          },
          body: JSON.stringify({
            from: {
              lat: sourceStation.coordinates.lat,
              lng: sourceStation.coordinates.lng,
              name: sourceStation.name
            },
            to: {
              lat: destStation.coordinates.lat,
              lng: destStation.coordinates.lng,
              name: destStation.name
            }
          })
        });

        if (resCompare.ok) {
          const dataCompare = await resCompare.json();
          setComparisonData(dataCompare);
        } else {
          console.error('Failed to fetch route comparison');
        }
      } catch (err) {
        console.error('Error calculating route:', err);
      } finally {
        setComparisonLoading(false);
      }
    };

    fetchCalculatedRoute();
  }, [sourceStation, destStation]);

  // Handle successful login/registration
  const handleLoginSuccess = (userToken, userData) => {
    localStorage.setItem('token', userToken);
    setToken(userToken);
    setUser(userData);
  };

  // Sync active mode automatically when preference changes
  useEffect(() => {
    if (comparisonData && comparisonData.recommendations) {
      const rec = preference === 'faster' 
        ? comparisonData.recommendations.faster 
        : comparisonData.recommendations.cheaper;
      setActiveMode(rec.type);
    }
  }, [preference, comparisonData]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setNearestStation(null);
    setSelectedStation(null);
    setSourceStation(null);
    setDestStation(null);
    setCalculatedRoute(null);
    setComparisonData(null);
    setPreference('cheaper');
    setActiveMode('metro');
  };

  // Update profile in local state
  const handleUpdateProfile = (updatedUser) => {
    setUser(updatedUser);
    if (updatedUser.location && updatedUser.location.lat && updatedUser.location.lng) {
      findAndSetClosestStation(updatedUser.location.lat, updatedUser.location.lng);
    }
  };

  // Clear planner fields
  const handleClearRoute = () => {
    setSourceStation(null);
    setDestStation(null);
    setCalculatedRoute(null);
    setComparisonData(null);
    setPreference('cheaper');
    setActiveMode('metro');
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 shadow-md">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-pulse">🚇</span>
            <div>
              <h1 className="text-xl font-black bg-gradient-to-r from-purple-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
                NammaRoute
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                Bangalore Metro Route Guide
              </p>
            </div>
          </div>
          
          {user && (
            <div className="flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/5 px-3.5 py-1.5 text-xs text-purple-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold">{user.name}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 mx-auto max-w-7xl w-full p-4 md:p-6 lg:p-8">
        {userSyncing ? (
          <div className="flex h-[50vh] items-center justify-center">
            <div className="text-center text-slate-400">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-purple-500 mb-3" />
              <p className="font-medium text-sm">Synchronizing your session...</p>
            </div>
          </div>
        ) : !token ? (
          <Auth onLoginSuccess={handleLoginSuccess} />
        ) : connectionError ? (
          <div className="mx-auto max-w-md rounded-3xl border border-rose-950/50 bg-rose-950/15 p-8 text-center backdrop-blur-lg animate-fadeIn">
            <ShieldAlert className="mx-auto h-12 w-12 text-rose-500 mb-4" />
            <h2 className="text-xl font-black text-white mb-2">Server Connection Error</h2>
            <p className="text-sm text-rose-300 leading-relaxed mb-6">
              We couldn't connect to the backend server or the database. Please ensure the backend is running and MongoDB is active.
            </p>
            <button
              onClick={fetchStations}
              className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-500 transition-colors shadow-md"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-fadeIn">
            {/* 3-Panel Grid Dashboard */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
              
              {/* Panel 1: Route Planner (1/4 column) */}
              <div className="xl:col-span-1">
                <RoutePlanner
                  stations={stations}
                  sourceStation={sourceStation}
                  destStation={destStation}
                  onSelectSource={setSourceStation}
                  onSelectDest={setDestStation}
                  calculatedRoute={calculatedRoute}
                  onClearRoute={handleClearRoute}
                  comparisonData={comparisonData}
                  comparisonLoading={comparisonLoading}
                  preference={preference}
                  setPreference={setPreference}
                  activeMode={activeMode}
                  setActiveMode={setActiveMode}
                />
              </div>

              {/* Panel 2: Graphical Leaflet Satellite Map (2/4 column) */}
              <div className="xl:col-span-2">
                <MetroMap
                  stations={stations}
                  userLocation={user?.location}
                  nearestStation={nearestStation}
                  onSelectStation={setSelectedStation}
                  selectedStation={selectedStation}
                  sourceStation={sourceStation}
                  destStation={destStation}
                  calculatedRoute={calculatedRoute}
                  onSelectSource={setSourceStation}
                  onSelectDest={setDestStation}
                  activeMode={activeMode}
                  comparisonData={comparisonData}
                />
              </div>

              {/* Panel 3: User Profile & Geolocation (1/4 column) */}
              <div className="xl:col-span-1">
                <UserProfile
                  user={user}
                  token={token}
                  onUpdateProfile={handleUpdateProfile}
                  onLogout={handleLogout}
                  stations={stations}
                  onSetNearestStation={setNearestStation}
                />
              </div>

            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/40 py-6 text-center text-xs text-slate-600">
        <p>© 2026 NammaRoute. Built with React + Express + MongoDB.</p>
      </footer>
    </div>
  );
}

export default App;
