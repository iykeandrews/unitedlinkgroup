'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight, User } from 'lucide-react';
import { Modal } from './Modal';

interface ExpiringQualificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  qualifications: any[];
}

export function ExpiringQualificationsModal({ isOpen, onClose, qualifications }: ExpiringQualificationsModalProps) {
  const router = useRouter();

  const handleNavigate = (employeeId: string, qualificationId: string) => {
    router.push(`/dashboard/people?employeeId=${employeeId}&tab=Qualifications&qualificationId=${qualificationId}`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Expiring Qualifications" maxWidth="max-w-2xl">
      <div className="max-h-[60vh] overflow-y-auto -mx-2 px-2">
        {qualifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No expiring qualifications found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {qualifications.map((qual) => (
              <button 
                key={qual.id} 
                onClick={() => handleNavigate(qual.employee.id, qual.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-semibold text-sm shrink-0">
                    {qual.employee.firstName?.[0]}{qual.employee.lastName?.[0] || <User size={16} />}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {qual.employee.firstName} {qual.employee.lastName}
                    </h4>
                    <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                      <span className="font-medium text-gray-700">{qual.name}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded text-xs border border-red-100">
                         Expires {new Date(qual.expiryDate).toLocaleDateString()}
                      </span>
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-end pt-4 border-t border-gray-100">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
