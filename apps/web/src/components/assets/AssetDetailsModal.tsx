import React, { useEffect, useState } from 'react';
import { Modal } from '../Modal';
import api from '../../lib/api';
import { useBusiness } from '../../context/business-context';
import { formatCurrency, formatDate } from '../../lib/localization';
import { Calendar, User, FileText, MapPin, Tag, Box, DollarSign, UserPlus, RotateCcw } from 'lucide-react';

interface AssetDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (asset: any) => void;
  onReturn: (asset: any) => void;
  asset: any;
}

interface HistoryRecord {
  id: string;
  employee: {
    firstName: string;
    lastName: string;
  };
  assignedDate: string;
  returnedDate: string | null;
  returnCondition: string | null;
  notes: string | null;
}

interface FullAssetDetails extends Record<string, any> {
  id: string;
  name: string;
  type: string;
  category?: string;
  serialNumber?: string;
  status: string;
  quantity: number;
  location?: { name: string };
  purchaseDate?: string;
  purchaseCost?: number;
  warrantyExpiration?: string;
  condition?: string;
  notes?: string;
  assignedTo?: {
    firstName: string;
    lastName: string;
  };
  assignedDate?: string;
  expectedReturnDate?: string;
  children?: any[]; // For split assets
}

export default function AssetDetailsModal({ isOpen, onClose, onAssign, onReturn, asset: initialAsset }: AssetDetailsModalProps) {
  const { selectedBusiness } = useBusiness();
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [assetDetails, setAssetDetails] = useState<FullAssetDetails | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetails = React.useCallback(async () => {
    try {
      setLoading(true);
      const [historyRes, assetRes] = await Promise.all([
        api.get(`/assets/${initialAsset.id}/history`),
        api.get(`/assets/${initialAsset.id}`)
      ]);
      setHistory(historyRes.data);
      setAssetDetails(assetRes.data);
    } catch (error) {
      console.error('Failed to fetch asset details', error);
    } finally {
      setLoading(false);
    }
  }, [initialAsset]);

  useEffect(() => {
    if (isOpen && initialAsset) {
      fetchDetails();
    }
  }, [isOpen, initialAsset, fetchDetails]);

  if (!initialAsset) return null;

  const displayAsset = assetDetails || initialAsset;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Asset Details"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{displayAsset.name}</h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Tag size={14} />
                {displayAsset.type} {displayAsset.category ? `• ${displayAsset.category}` : ''}
              </span>
              {displayAsset.serialNumber && (
                <span className="flex items-center gap-1 font-mono bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-xs">
                  SN: {displayAsset.serialNumber}
                </span>
              )}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium 
            ${displayAsset.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
              displayAsset.status === 'ASSIGNED' ? 'bg-purple-100 text-purple-800' : 
              'bg-slate-100 text-slate-800'}`}>
            {displayAsset.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* General Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
              General Information
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-slate-500 dark:text-slate-400 text-xs">Location</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin size={14} className="text-slate-400" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {displayAsset.location?.name || 'Unassigned'}
                  </span>
                </div>
              </div>
              <div>
                <span className="block text-slate-500 dark:text-slate-400 text-xs">Quantity</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Box size={14} className="text-slate-400" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {displayAsset.quantity}
                  </span>
                </div>
              </div>
              {displayAsset.purchaseDate && (
                <div>
                  <span className="block text-slate-500 dark:text-slate-400 text-xs">Purchase Date</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Calendar size={14} className="text-slate-400" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {formatDate(displayAsset.purchaseDate, selectedBusiness?.country)}
                    </span>
                  </div>
                </div>
              )}
              {displayAsset.purchaseCost && (
                <div>
                  <span className="block text-slate-500 dark:text-slate-400 text-xs">Cost</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <DollarSign size={14} className="text-slate-400" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {formatCurrency(displayAsset.purchaseCost, selectedBusiness?.currencyCode)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {displayAsset.description && (
              <div>
                <span className="block text-slate-500 dark:text-slate-400 text-xs mb-1">Description</span>
                <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700">
                  {displayAsset.description}
                </p>
              </div>
            )}
          </div>

          {/* Current Assignment */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
              <h4 className="font-semibold text-slate-900 dark:text-white">
                Current Assignment
              </h4>
              {displayAsset.assignedTo ? (
                <button
                  onClick={() => {
                    onReturn(displayAsset);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50 rounded-md text-sm transition-colors"
                >
                  <RotateCcw size={14} />
                  Return Asset
                </button>
              ) : (
                <button
                  onClick={() => {
                    onAssign(displayAsset);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 rounded-md text-sm transition-colors"
                >
                  <UserPlus size={14} />
                  Assign Asset
                </button>
              )}
            </div>

            {/* Split/Child Assignments */}
            {displayAsset.children && displayAsset.children.length > 0 && (
              <div className="space-y-3 mb-4">
                <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300">Active Assignments ({displayAsset.children.length})</h5>
                <div className="space-y-3">
                  {displayAsset.children.map((child: any) => (
                    <div key={child.id} className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-100 dark:border-purple-800/30 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-300">
                          <User size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white">
                            {child.assignedTo?.firstName} {child.assignedTo?.lastName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                             Qty: {child.quantity} • Assigned: {new Date(child.assignedDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => onReturn(child)}
                        className="p-2 text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-full transition-colors"
                        title="Return this item"
                      >
                        <RotateCcw size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {displayAsset.assignedTo ? (
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-300">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {displayAsset.assignedTo.firstName} {displayAsset.assignedTo.lastName}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-300">Currently Assigned</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Assigned Date</span>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {displayAsset.assignedDate ? formatDate(displayAsset.assignedDate, selectedBusiness?.country) : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Expected Return</span>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {displayAsset.expectedReturnDate ? formatDate(displayAsset.expectedReturnDate, selectedBusiness?.country) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              !displayAsset.children?.length && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6">
                  <Box size={32} className="mb-2 opacity-50" />
                  <p className="text-sm">Not currently assigned</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Assignment History */}
        <div className="pt-4">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText size={18} />
            Assignment History
          </h4>
          
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-slate-500 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              No assignment history found.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Returned</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Condition</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                  {history.map((record) => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-slate-400 mr-2" />
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {record.employee.firstName} {record.employee.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(record.assignedDate, selectedBusiness?.country)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.returnedDate ? (
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {formatDate(record.returnedDate, selectedBusiness?.country)}
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            Current
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                        {record.returnCondition || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate" title={record.notes || ''}>
                        {record.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
