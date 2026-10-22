import React from 'react';
import { useMaintenance } from '../context/MaintenanceContext';
import { CheckCircle2 } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts } = useMaintenance();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast">
          <CheckCircle2 size={16} color="#34d399" />
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
};
