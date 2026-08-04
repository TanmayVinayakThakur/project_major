import React, { useState, useEffect } from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import Auth from './components/Auth';
import RoutePlanner from './components/RoutePlanner';
import MetroMap from './components/MetroMap';
import AIChatAgent from './components/AIChatAgent';

// Simplified distance calc helper
const calculateDistanceSimple = (lat1, lon1, lat2, lon2) => {
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  return Math.sqrt(dLat * dLat + dLon * dLon) * 111; // 1 degree ~ 111km
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [stations, setStations] = useState([]);
  const [sourceStation, setSourceStation] = useState(null);
  const [destStation, setDestStation] = useState(null);
  const [sourceLocation, setSourceLocation] = useState(null);
  const [destLocation, setDestLocation] = useState(null);

  const [calculatedRoute, setCalculatedRoute] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [preference, setPreference] = useState('cheaper'); // 'cheaper' | 'faster'
  const [activeMode, setActiveMode] = useState('metro'); // 'metro' | 'uber' | 'hybrid'
  
  // Transit Mode & Geofencing States
  const [isJourneyStarted, setIsJourneyStarted] = useState(false);
  const [showCabAlert, setShowCabAlert] = useState(false);
  const [geofenceDistance, setGeofenceDistance] = useState(null);

  const [selectedStation, setSelectedStation] = useState(null);
  const [nearestStation, setNearestStation] = useState(null);
  const [userSyncing, setUserSyncing] = useState(!!localStorage.getItem('token'));
  const [connectionError, setConnectionError] = useState(false);

  const [wizardStep, setWizardStep] = useState('setup'); // 'setup' | 'results'

  // Helper to find closest station to coordinates
  const findClosestStationToCoords = (lat, lng, stationList) => {
    const list = stationList || stations;
    if (!list || list.length === 0) return null;
    let minDistance = Infinity;
    let closest = null;
    list.forEach((station) => {
      const dist = calculateDistanceSimple(lat, lng, station.coordinates.lat, station.coordinates.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closest = station;
      }
    });
    return closest;
  };

  // Helper to find closest station to coordinates and select it
  const findAndSetClosestStation = (lat, lng, stationList) => {
    const list = stationList || stations;
    const closest = findClosestStationToCoords(lat, lng, list);

    if (closest) {
      setNearestStation(closest);
      setSourceStation(closest);
      setSelectedStation(closest);
      setSourceLocation({
        name: 'Current Location',
        lat,
        lng
      });
    }
    return closest;
  };

  const handleSelectSource = (loc) => {
    if (!loc) {
      setSourceLocation(null);
      setSourceStation(null);
      return;
    }
    
    setSourceLocation({ name: loc.name, lat: loc.lat, lng: loc.lng });

    if (loc.isStation) {
      const station = stations.find(s => s.code === loc.stationCode || s.name === loc.name);
      setSourceStation(station);
    } else {
      const closest = findClosestStationToCoords(loc.lat, loc.lng);
      setSourceStation(closest);
    }
  };

  const handleSelectDest = (loc) => {
    if (!loc) {
      setDestLocation(null);
      setDestStation(null);
      return;
    }

    setDestLocation({ name: loc.name, lat: loc.lat, lng: loc.lng });

    if (loc.isStation) {
      const station = stations.find(s => s.code === loc.stationCode || s.name === loc.name);
      setDestStation(station);
    } else {
      const closest = findClosestStationToCoords(loc.lat, loc.lng);
      setDestStation(closest);
    }
  };

  // Fetch all metro stations
  const fetchStations = async () => {
    try {
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
    }
  };

  // Auto geolocation lookup
  const triggerAutoGeolocation = (stationList) => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        console.log('Automatic geolocation success');

        const updatedLocation = {
          lat,
          lng,
          address: 'Current GPS Location',
        };

        setUser((prev) => {
          if (!prev) return null;
          return { ...prev, location: updatedLocation };
        });

        findAndSetClosestStation(lat, lng, stationList);
      },
      (error) => {
        console.warn('Browser geolocation default bypassed:', error.message);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Sync session and load routes
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
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          
          if (data.location && data.location.lat && data.location.lng) {
            const list = fetchedStations.length > 0 ? fetchedStations : [];
            const closest = findClosestStationToCoords(data.location.lat, data.location.lng, list);
            if (closest) {
              setNearestStation(closest);
              setSourceStation(closest);
              setSourceLocation({
                name: data.location.address || 'Current Location',
                lat: data.location.lat,
                lng: data.location.lng
              });
            }
          } else {
            triggerAutoGeolocation(fetchedStations);
          }
        } else {
          handleLogout();
        }
      } catch (err) {
        console.error('Error verifying user:', err);
      } finally {
        setUserSyncing(false);
      }
    };

    initializeApp();
  }, [token]);

  // Geolocation watch logic for transit mode
  useEffect(() => {
    if (!isJourneyStarted) {
      setGeofenceDistance(null);
      setShowCabAlert(false);
      return;
    }

    let watchId = null;

    if (activeMode === 'hybrid' && comparisonData && comparisonData.hybrid) {
      const exitStation = comparisonData.hybrid.exitStation;

      const success = (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        const dist = calculateDistanceSimple(
          lat, lng, 
          exitStation.coordinates.lat, exitStation.coordinates.lng
        );
        
        setGeofenceDistance(dist);
        
        // Trigger alert if within 500m (0.5 km)
        if (dist <= 0.5) {
          setShowCabAlert(true);
        }
      };

      const error = (err) => {
        console.warn('Geolocation watch error:', err.message);
      };

      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(success, error, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000
        });
      }
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isJourneyStarted, activeMode, comparisonData]);

  // Handler to force simulate approaching exit station
  const handleSimulateGeofence = () => {
    setGeofenceDistance(0.42); // 420 meters
    setShowCabAlert(true);
  };

  // Handler to load route applied from the conversational agent
  const handleApplyRouteFromAgent = (routeData) => {
    const source = stations.find(s => s.name === routeData.pureMetro.startStation);
    const dest = stations.find(s => s.name === routeData.pureMetro.endStation);
    
    if (source && dest) {
      setSourceStation(source);
      setDestStation(dest);
      setSourceLocation({
        name: source.name + ' Metro Station',
        lat: source.coordinates.lat,
        lng: source.coordinates.lng,
        isStation: true,
        stationCode: source.code
      });
      setDestLocation({
        name: dest.name + ' Metro Station',
        lat: dest.coordinates.lat,
        lng: dest.coordinates.lng,
        isStation: true,
        stationCode: dest.code
      });
      setCalculatedRoute(routeData.pureMetro);
      setComparisonData(routeData);
      setWizardStep('results');
    }
  };

  // Automatically calculate route when source & destination are selected
  useEffect(() => {
    const fetchCalculatedRoute = async () => {
      if (!sourceStation || !destStation) {
        setCalculatedRoute(null);
        setComparisonData(null);
        return;
      }

      try {
        setComparisonLoading(true);
        
        // 1. Fetch Dijkstra route
        const resRoute = await fetch(`/api/route?from=${sourceStation.code}&to=${destStation.code}`);
        if (resRoute.ok) {
          const dataRoute = await resRoute.json();
          setCalculatedRoute(dataRoute);
        }

        // 2. Fetch comparative data
        const gKey = localStorage.getItem('google_maps_api_key') || '';
        
        const fromBody = sourceLocation 
          ? { lat: sourceLocation.lat, lng: sourceLocation.lng, name: sourceLocation.name }
          : { lat: sourceStation.coordinates.lat, lng: sourceStation.coordinates.lng, name: sourceStation.name };
        
        const toBody = destLocation
          ? { lat: destLocation.lat, lng: destLocation.lng, name: destLocation.name }
          : { lat: destStation.coordinates.lat, lng: destStation.coordinates.lng, name: destStation.name };

        const resCompare = await fetch('/api/compare', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-google-maps-key': gKey
          },
          body: JSON.stringify({
            from: fromBody,
            to: toBody
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
  }, [sourceStation, destStation, sourceLocation, destLocation]);

  // Handle successful login/registration
  const handleLoginSuccess = (userToken, userData) => {
    localStorage.setItem('token', userToken);
    setToken(userToken);
    setUser(userData);
    setWizardStep('setup');
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
    setSourceLocation(null);
    setDestLocation(null);
    setCalculatedRoute(null);
    setComparisonData(null);
    setPreference('cheaper');
    setActiveMode('metro');
    setWizardStep('setup');
  };

  // Clear planner fields
  const handleClearRoute = () => {
    setSourceStation(null);
    setDestStation(null);
    setSourceLocation(null);
    setDestLocation(null);
    setCalculatedRoute(null);
    setComparisonData(null);
    setPreference('cheaper');
    setActiveMode('metro');
    setWizardStep('setup');
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-emerald-100/80 bg-white/75 backdrop-blur-md px-6 py-4 shadow-sm shadow-emerald-500/5">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-pulse">🚇</span>
            <div>
              <h1 className="text-xl font-black text-emerald-800">
                CommuteIQ
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-bold">
                Smart Commute Guide
              </p>
            </div>
          </div>
          
          {user && (
            <div className="flex items-center gap-3 animate-fadeIn">
              <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-1.5 text-xs text-emerald-800 font-bold shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{user.name}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs font-bold text-rose-600 hover:text-rose-500 hover:underline border border-rose-200 bg-white rounded-xl px-3 py-1.5 transition-all shadow-sm"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 mx-auto max-w-7xl w-full p-4 md:p-6 lg:p-8">
        {userSyncing ? (
          <div className="flex h-[50vh] items-center justify-center">
            <div className="text-center text-slate-500">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-600 mb-3" />
              <p className="font-bold text-xs uppercase tracking-wider text-emerald-700">Synchronizing session...</p>
            </div>
          </div>
        ) : !token ? (
          <Auth onLoginSuccess={handleLoginSuccess} />
        ) : connectionError ? (
          <div className="mx-auto max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-lg animate-fadeIn">
            <ShieldAlert className="mx-auto h-12 w-12 text-rose-500 mb-4 animate-bounce" />
            <h2 className="text-xl font-black text-slate-800 mb-2">Server Connection Error</h2>
            <p className="text-xs text-slate-500 leading-relaxed mb-6 font-semibold">
              We couldn't connect to the backend server or the database. Please ensure the backend is running.
            </p>
            <button
              onClick={fetchStations}
              className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-500 transition-colors shadow-sm"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Step 1: Location Setup Form */}
            {wizardStep === 'setup' && (
              <div className="flex justify-center items-center py-6">
                <RoutePlanner
                  stations={stations}
                  sourceStation={sourceStation}
                  destStation={destStation}
                  sourceLocation={sourceLocation}
                  destLocation={destLocation}
                  onSelectSource={handleSelectSource}
                  onSelectDest={handleSelectDest}
                  onClearRoute={handleClearRoute}
                  view="setup"
                  onPlanCommute={() => setWizardStep('results')}
                />
              </div>
            )}

            {/* Step 2: Route Analysis Results & Map */}
            {wizardStep === 'results' && (
              <div className="space-y-6 animate-fadeIn">
                {/* Wizard Route Summary Header */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm shadow-emerald-500/5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 font-bold shadow-sm text-lg">
                      📍
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-800">
                        {sourceLocation?.name || sourceStation?.name} ➡️ {destLocation?.name || destStation?.name}
                      </h2>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-wider">Commute Routing Results</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWizardStep('setup')}
                    className="rounded-xl border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 px-4 py-2 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                  >
                    🔄 Modify Commute Details
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  {/* Left Column: Plan list */}
                  <div className="lg:col-span-1">
                    <RoutePlanner
                      stations={stations}
                      sourceStation={sourceStation}
                      destStation={destStation}
                      sourceLocation={sourceLocation}
                      destLocation={destLocation}
                      onSelectSource={handleSelectSource}
                      onSelectDest={handleSelectDest}
                      calculatedRoute={calculatedRoute}
                      onClearRoute={handleClearRoute}
                      comparisonData={comparisonData}
                      comparisonLoading={comparisonLoading}
                      preference={preference}
                      setPreference={setPreference}
                      activeMode={activeMode}
                      setActiveMode={setActiveMode}
                      view="results"
                      onStartJourney={() => setIsJourneyStarted(true)}
                    />
                  </div>

                  {/* Right Column: Live Map */}
                  <div className="lg:col-span-2">
                    <MetroMap
                      stations={stations}
                      userLocation={user?.location}
                      nearestStation={nearestStation}
                      onSelectStation={setSelectedStation}
                      selectedStation={selectedStation}
                      sourceStation={sourceStation}
                      destStation={destStation}
                      sourceLocation={sourceLocation}
                      destLocation={destLocation}
                      onSelectSource={handleSelectSource}
                      onSelectDest={handleSelectDest}
                      calculatedRoute={calculatedRoute}
                      activeMode={activeMode}
                      comparisonData={comparisonData}
                    />
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-emerald-100 bg-white/60 py-6 text-center text-xs text-slate-500">
        <p>© 2026 CommuteIQ. Built with React + Express + MongoDB.</p>
      </footer>

      {/* Active Journey Live Tracker HUD */}
      {isJourneyStarted && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[999] w-[90%] max-w-lg bg-slate-900/90 backdrop-blur-md border border-purple-500/30 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-top-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-spin">⚡</span>
            <div className="text-left">
              <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest">Active Commute Tracking</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Mode: <span className="text-purple-400 font-bold uppercase">{activeMode}</span>
                {activeMode === 'hybrid' && comparisonData?.hybrid && (
                  <span> | Transition Exit: {comparisonData.hybrid.exitStation.name}</span>
                )}
              </p>
              {activeMode === 'hybrid' && geofenceDistance !== null && (
                <p className="text-[10px] text-purple-300 font-semibold mt-0.5">
                  Distance to exit: {geofenceDistance.toFixed(2)} km
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeMode === 'hybrid' && (
              <button
                onClick={handleSimulateGeofence}
                className="px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-950/40 text-[10px] text-purple-300 font-bold hover:bg-purple-900/30 transition-all whitespace-nowrap"
              >
                Simulate Geofence (500m)
              </button>
            )}
            <button
              onClick={() => {
                setIsJourneyStarted(false);
                setShowCabAlert(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-[10px] text-white font-bold transition-all shadow-md shadow-rose-950/20 whitespace-nowrap"
            >
              Stop Journey
            </button>
          </div>
        </div>
      )}

      {/* Cab Pre-Booking Modal */}
      {showCabAlert && activeMode === 'hybrid' && comparisonData?.hybrid && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-[90%] max-w-md bg-slate-950/95 border border-purple-500/30 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="mx-auto w-12 h-12 bg-purple-500/20 border border-purple-500/40 rounded-full flex items-center justify-center text-xl">
              🚗
            </div>
            <h3 className="text-md font-black text-slate-100">Smart Transit Alert: Pre-book Cab</h3>
            <p className="text-xs text-slate-300 leading-relaxed font-semibold">
              You are approaching <strong className="text-purple-300">{comparisonData.hybrid.exitStation.name} Metro Station</strong> (approx. {geofenceDistance ? geofenceDistance.toFixed(2) : '0.42'} km away).
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Book your ride now to ensure your driver is waiting at the exit when you arrive.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  const exitStation = comparisonData.hybrid.exitStation;
                  const dest = destLocation || {
                    lat: destStation.coordinates.lat,
                    lng: destStation.coordinates.lng,
                    name: destStation.name
                  };
                  const url = `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${exitStation.coordinates.lat}&pickup[longitude]=${exitStation.coordinates.lng}&pickup[nickname]=${encodeURIComponent(exitStation.name + ' Metro Station')}&dropoff[latitude]=${dest.lat}&dropoff[longitude]=${dest.lng}&dropoff[nickname]=${encodeURIComponent(dest.name)}`;
                  window.open(url, '_blank');
                  setShowCabAlert(false);
                }}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md shadow-purple-900/20"
              >
                Pre-book Ride on Uber ➡️
              </button>
              <button
                onClick={() => setShowCabAlert(false)}
                className="w-full py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800/40 text-slate-300 font-bold text-xs transition-all"
              >
                Dismiss Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating conversational AI Travel Concierge */}
      <AIChatAgent 
        onApplyRoute={handleApplyRouteFromAgent}
        currentLocations={{ sourceLocation, destLocation, sourceStation, destStation }}
      />
    </div>
  );
}

export default App;
