'use client';

import { useState, useEffect } from 'react';
import { Play, Square, Coffee, Utensils, Clock, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

interface TimeClockProps {
  onClockAction?: () => void;
}

type ClockStatus = 'CLOCKED_IN' | 'CLOCKED_OUT' | 'ON_BREAK';

interface StatusResponse {
  status: ClockStatus;
  startTime: string | null;
  breakStartTime?: string | null;
}

export function TimeClock({ onClockAction }: TimeClockProps) {
  const [status, setStatus] = useState<ClockStatus>('CLOCKED_OUT');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchStatus();
    return () => clearInterval(timer);
  }, []);

  const getFreshLocation = () =>
    new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported on this device'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
      );
    });

  const fetchStatus = async () => {
    try {
      const res = await api.get<StatusResponse>('/time-tracking/status');
      setStatus(res.data.status);
      setStartTime(res.data.startTime ? new Date(res.data.startTime) : null);
      setBreakStartTime(res.data.breakStartTime ? new Date(res.data.breakStartTime) : null);
    } catch (err) {
      console.error('Failed to fetch status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      setLoading(true);
      setError('');
      const coords = await getFreshLocation();
      setLocation(coords);
      await api.post('/time-tracking/clock-in', {
        lat: coords.lat,
        lng: coords.lng
      });
      await fetchStatus();
      onClockAction?.();
      toast.success('Clocked in successfully');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to clock in';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setLoading(true);
      setError('');
      let coords: { lat: number; lng: number } | null = null;
      try {
        coords = await getFreshLocation();
        setLocation(coords);
      } catch {}
      await api.post('/time-tracking/clock-out', {
        lat: coords?.lat,
        lng: coords?.lng,
      });
      await fetchStatus();
      onClockAction?.();
      toast.success('Clocked out successfully');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to clock out';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async (type: 'MEAL' | 'REST') => {
    try {
      setLoading(true);
      setError('');
      await api.post('/time-tracking/break/start', { type });
      await fetchStatus();
      onClockAction?.();
      toast.success(`Started ${type.toLowerCase()} break`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to start break';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async () => {
    try {
      setLoading(true);
      setError('');
      await api.post('/time-tracking/break/end');
      await fetchStatus();
      onClockAction?.();
      toast.success('Ended break');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to end break';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const getDuration = (start: Date | null) => {
    if (!start) return '00:00:00';
    const diff = currentTime.getTime() - start.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading && !startTime) {
    return <div className="animate-pulse h-48 bg-gray-100 rounded-lg"></div>;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-100 dark:border-slate-700">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Time Display */}
        <div className="text-center md:text-left">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Current Time</h2>
          <div className="text-4xl font-bold text-gray-900 dark:text-white tabular-nums">
            {currentTime.toLocaleTimeString([], { hour12: true })}
          </div>
          <div className="text-gray-500 dark:text-gray-400 mt-1">
            {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          {location && (
            <div className="flex items-center justify-center md:justify-start mt-2 text-xs text-green-600 dark:text-green-400">
              <MapPin className="w-3 h-3 mr-1" />
              Location Active
            </div>
          )}
        </div>

        {/* Status Display */}
        <div className="flex-1 w-full md:w-auto bg-gray-50 dark:bg-slate-900 rounded-lg p-4 flex flex-col items-center justify-center border border-gray-200 dark:border-slate-700">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</div>
          <div className={`text-xl font-bold mb-2 ${
            status === 'CLOCKED_IN' ? 'text-green-600 dark:text-green-400' :
            status === 'ON_BREAK' ? 'text-yellow-600 dark:text-yellow-400' :
            'text-gray-600 dark:text-gray-400'
          }`}>
            {status.replace('_', ' ')}
          </div>
          {status !== 'CLOCKED_OUT' && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm">
              <Clock className="w-4 h-4" />
              <span className="tabular-nums font-mono">
                {status === 'ON_BREAK' ? getDuration(breakStartTime) : getDuration(startTime)}
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3 w-full md:w-auto min-w-[200px]">
          {status === 'CLOCKED_OUT' ? (
            <button
              onClick={handleClockIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-md hover:shadow-lg"
            >
              <Play className="w-5 h-5 fill-current" />
              Clock In
            </button>
          ) : (
            <>
              {status === 'ON_BREAK' ? (
                <button
                  onClick={handleEndBreak}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-6 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-md"
                >
                  <Utensils className="w-5 h-5" />
                  End Break
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleStartBreak('MEAL')}
                    disabled={loading}
                    className="flex flex-col items-center justify-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 py-3 px-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    <Utensils className="w-4 h-4" />
                    Meal Break
                  </button>
                  <button
                    onClick={() => handleStartBreak('REST')}
                    disabled={loading}
                    className="flex flex-col items-center justify-center gap-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 py-3 px-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    <Coffee className="w-4 h-4" />
                    Rest Break
                  </button>
                </div>
              )}
              
              {status !== 'ON_BREAK' && (
                <button
                  onClick={handleClockOut}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-md hover:shadow-lg"
                >
                  <Square className="w-5 h-5 fill-current" />
                  Clock Out
                </button>
              )}
            </>
          )}
        </div>
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm text-center animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}
    </div>
  );
}
