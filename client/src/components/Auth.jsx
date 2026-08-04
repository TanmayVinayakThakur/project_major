import React, { useState } from 'react';
import { Mail, Lock, User, MapPin, CheckCircle, AlertCircle } from 'lucide-react';

const Auth = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('Bangalore Central');
  const [lat, setLat] = useState(12.9716);
  const [lng, setLng] = useState(77.5946);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    const bodyData = isLogin 
      ? { email, password }
      : { 
          name, 
          email, 
          password, 
          location: { 
            lat: parseFloat(lat), 
            lng: parseFloat(lng), 
            address 
          } 
        };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyData),
      });

      const data = await response.json();

      if (response.ok) {
        onLoginSuccess(data.token, data);
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch (err) {
      console.error('Auth request error:', err);
      setError('Could not connect to authentication server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-emerald-100/80 bg-white/75 p-8 backdrop-blur-xl shadow-2xl shadow-emerald-500/5">
        <div className="text-center">
          <span className="inline-block rounded-2xl bg-emerald-500/10 p-4 text-emerald-600 shadow-sm">
            <span className="text-3xl">🚇</span>
          </span>
          <div className="mt-4">
            <h2 className="text-3xl font-black tracking-tight text-emerald-800 animate-breathe">
              Welcome to CommuteIQ
            </h2>
          </div>
          <p className="mt-2 text-sm text-slate-500 font-semibold">
            {isLogin ? 'Sign in to access Bangalore Metro route map' : 'Create an account to start tracking routes'}
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-600 font-medium">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-500" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/80 pl-11 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-all shadow-sm focus:ring-1 focus:ring-emerald-500"
                    placeholder="Enter your name"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white/80 pl-11 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-all shadow-sm focus:ring-1 focus:ring-emerald-500"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white/80 pl-11 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-all shadow-sm focus:ring-1 focus:ring-emerald-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/20 p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  <span>Default Location Details</span>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Location Label</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none transition-all"
                    placeholder="e.g. Indiranagar, Bangalore"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={lat}
                      onChange={(e) => setLat(parseFloat(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={lng}
                      onChange={(e) => setLng(parseFloat(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500 transition-all shadow-md shadow-emerald-600/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-500 hover:underline"
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
