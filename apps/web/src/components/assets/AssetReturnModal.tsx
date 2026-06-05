import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Modal, ModalActionButton } from '../Modal';
import api from '../../lib/api';

interface AssetReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  asset: any;
}

const CONDITIONS = [
  'NEW',
  'GOOD',
  'FAIR',
  'DAMAGED',
  'RETIRED',
];

export default function AssetReturnModal({ isOpen, onClose, onSuccess, asset }: AssetReturnModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    returnDate: new Date().toISOString().split('T')[0],
    condition: 'GOOD',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset) return;
    
    setLoading(true);
    try {
      await api.post(`/assets/${asset.id}/return`, {
        returnDate: new Date(formData.returnDate).toISOString(),
        condition: formData.condition,
        notes: formData.notes,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to return asset', error);
    } finally {
      setLoading(false);
    }
  };

  if (!asset) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Return Asset"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">Returning Asset:</p>
          <p className="font-medium text-slate-900 dark:text-white">{asset.name}</p>
          {asset.assignedTo && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Currently assigned to: <span className="text-slate-900 dark:text-white font-medium">{asset.assignedTo.firstName} {asset.assignedTo.lastName}</span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Return Date</label>
          <input
            type="date"
            required
            className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            value={formData.returnDate}
            onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Returned Condition</label>
          <select
            required
            className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            value={formData.condition}
            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
          >
            {CONDITIONS.map(condition => (
              <option key={condition} value={condition}>{condition}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
          <textarea
            className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any comments about the return or condition..."
          />
        </div>

        <div className="flex justify-end pt-4">
          <div className="flex gap-3">
            <ModalActionButton kind="cancel" onClick={onClose}>
              Cancel
            </ModalActionButton>
            <ModalActionButton kind="submit" type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Confirm Return'}
            </ModalActionButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}
