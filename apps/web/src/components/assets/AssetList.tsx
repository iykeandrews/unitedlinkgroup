import React, { useEffect, useState } from 'react';
import { Wrench, MapPin, User, Edit2, Trash2, Eye } from 'lucide-react';
import api from '../../lib/api';
import AssetModal from './AssetModal';
import AssetAssignmentModal from './AssetAssignmentModal';
import AssetReturnModal from './AssetReturnModal';
import AssetDetailsModal from './AssetDetailsModal';

interface Asset {
  id: string;
  name: string;
  description: string;
  serialNumber: string;
  type: string;
  category?: string;
  quantity?: number;
  status: string;
  location?: {
    name: string;
  };
  assignedTo?: {
    firstName: string;
    lastName: string;
  };
}

export default function AssetList() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/assets');
      setAssets(res.data);
    } catch (error) {
      console.error('Failed to fetch assets', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsModalOpen(true);
  };

  const handleAssign = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsDetailsModalOpen(false);
    if (asset.assignedTo) {
      // If already assigned, technically shouldn't happen from assign button, but safe to handle
      // Maybe we want to open details if assigned? But this handler is "Assign"
      setIsDetailsModalOpen(true);
    } else {
      setIsAssignmentModalOpen(true);
    }
  };

  const handleReturn = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsDetailsModalOpen(false);
    setIsReturnModalOpen(true);
  };

  const handleDetails = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsDetailsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    try {
      await api.delete(`/assets/${id}`);
      fetchAssets();
    } catch (error) {
      console.error('Failed to delete asset', error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAsset(null);
  };

  const handleCloseAssignmentModal = () => {
    setIsAssignmentModalOpen(false);
    setSelectedAsset(null);
  };

  const handleCloseReturnModal = () => {
    setIsReturnModalOpen(false);
    setSelectedAsset(null);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedAsset(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'MAINTENANCE': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'REPAIR': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'LOST': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'RETIRED': return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
      case 'ASSIGNED': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Wrench size={16} />
          Add Asset
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading assets...</div>
      ) : assets.length === 0 ? (
        <div className="text-center py-8 text-slate-500 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          No assets found.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <div key={asset.id} className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(asset.status)}`}>
                  {asset.status}
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleDetails(asset)}
                    className="text-slate-400 hover:text-blue-500"
                    title="View Details & History"
                  >
                    <Eye size={16} />
                  </button>
                  
                  <button onClick={() => handleEdit(asset)} className="text-slate-400 hover:text-blue-500">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(asset.id)} className="text-slate-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 dark:text-white truncate" title={asset.name}>{asset.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{asset.type} {asset.category ? `• ${asset.category}` : ''}</p>
              {asset.quantity && asset.quantity > 1 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Qty: {asset.quantity}</p>
              )}
              {asset.serialNumber && (
                <p className="text-xs font-mono text-slate-400 mt-1">SN: {asset.serialNumber}</p>
              )}
              
              <div className="mt-2 space-y-2 text-sm text-slate-500 dark:text-slate-400">
                {asset.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} />
                    <span>{asset.location.name}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AssetModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={fetchAssets}
        initialData={selectedAsset}
      />

      <AssetAssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={handleCloseAssignmentModal}
        onSuccess={fetchAssets}
        asset={selectedAsset}
      />
      
      <AssetReturnModal
        isOpen={isReturnModalOpen}
        onClose={handleCloseReturnModal}
        onSuccess={fetchAssets}
        asset={selectedAsset}
      />

      <AssetDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetailsModal}
        onAssign={handleAssign}
        onReturn={handleReturn}
        asset={selectedAsset}
      />
    </div>
  );
}
