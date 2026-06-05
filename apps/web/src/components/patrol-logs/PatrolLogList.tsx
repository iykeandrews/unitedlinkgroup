import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Clock, MapPin, AlertTriangle, CheckCircle, Info, User } from 'lucide-react';
import api from '../../lib/api';

interface PatrolLog {
  id: string;
  message: string;
  type: 'CHECK' | 'INCIDENT' | 'MAINTENANCE';
  geoLat?: number;
  geoLng?: number;
  imageUrl?: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
  servicePin?: {
    positionType: string;
    location?: {
      name: string;
    };
  };
}

interface PatrolLogListProps {
  servicePinId?: string;
  locationId?: string;
  refreshTrigger?: number;
}

export default function PatrolLogList({ servicePinId, locationId, refreshTrigger }: PatrolLogListProps) {
  const [logs, setLogs] = useState<PatrolLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      let url = '';
      if (servicePinId) {
        url = `/patrol-logs/pin/${servicePinId}`;
      } else if (locationId) {
        url = `/patrol-logs/location/${locationId}`;
      } else {
        url = '/patrol-logs';
      }

      const res = await api.get(url);
      setLogs(res.data);
    } catch (error) {
      console.error('Failed to fetch patrol logs', error);
    } finally {
      setLoading(false);
    }
  }, [servicePinId, locationId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, refreshTrigger]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'INCIDENT':
        return <AlertTriangle className="text-red-500" size={20} />;
      case 'MAINTENANCE':
        return <Info className="text-orange-500" size={20} />;
      default:
        return <CheckCircle className="text-green-500" size={20} />;
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-500">Loading logs...</div>;
  }

  if (logs.length === 0) {
    return <div className="text-center py-8 text-slate-500">No patrol logs found.</div>;
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div key={log.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="mt-1 bg-slate-100 dark:bg-slate-700 p-2 rounded-full">
              {getIcon(log.type)}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    {log.type}
                    {log.servicePin?.location && (
                        <span className="text-xs font-normal text-slate-500">
                            @ {log.servicePin.location.name}
                        </span>
                    )}
                    {log.servicePin && (
                        <span className="text-xs font-normal bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-300">
                            {log.servicePin.positionType}
                        </span>
                    )}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{log.message}</p>
                  <p className="text-xs text-slate-400 mt-1">By: {log.user?.firstName} {log.user?.lastName}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div className="flex items-center gap-1 justify-end">
                    <Clock size={12} />
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 justify-end mt-1">
                    <User size={12} />
                    {log.user.firstName} {log.user.lastName}
                  </div>
                </div>
              </div>
              
              {(log.geoLat && log.geoLng) && (
                <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin size={12} />
                  {log.geoLat.toFixed(6)}, {log.geoLng.toFixed(6)}
                </div>
              )}
              
              {log.imageUrl && (
                <div className="mt-3">
                  <Image 
                    src={log.imageUrl} 
                    alt="Log attachment" 
                    width={500}
                    height={300}
                    className="rounded-md w-auto h-auto max-h-48 object-cover border border-slate-200 dark:border-slate-700" 
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
