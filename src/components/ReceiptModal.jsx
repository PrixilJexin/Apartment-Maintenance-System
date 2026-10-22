import React from 'react';
import { Modal } from './Modal';
import { fmt, dt, useMaintenance } from '../context/MaintenanceContext';
import { CheckCircle2, Printer } from 'lucide-react';

export const ReceiptModal = ({ dueItem, isOpen, onClose }) => {
  const { getResidentName } = useMaintenance();

  if (!dueItem) return null;

  const residentName = getResidentName(dueItem.apt);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Receipt: ${dueItem.rcpt || 'RCP-PENDING'}`}>
      <div style={{
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--ok)', marginBottom: '14px' }}>
          <CheckCircle2 size={18} />
          <span style={{ fontWeight: '700', fontSize: '13px' }}>OFFICIAL MAINTENANCE RECEIPT</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--ink-muted)', fontSize: '13px' }}>Unit Number</span>
          <span style={{ fontWeight: '700' }}>{dueItem.apt}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--ink-muted)', fontSize: '13px' }}>Resident</span>
          <span style={{ fontWeight: '600' }}>{residentName}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--ink-muted)', fontSize: '13px' }}>Payment For</span>
          <span style={{ fontWeight: '600' }}>Apartment Maintenance Fee</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--ink-muted)', fontSize: '13px' }}>Due Date</span>
          <span>{dt(dueItem.due)}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--ink-muted)', fontSize: '13px' }}>Paid Date</span>
          <span style={{ color: 'var(--ok)', fontWeight: '600' }}>{dt(dueItem.paid)}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px', alignItems: 'center' }}>
          <span style={{ fontWeight: '700', fontSize: '15px' }}>Amount Paid</span>
          <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--ok)' }}>
            {fmt(dueItem.amount)}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => window.print()}
        >
          <Printer size={14} />
          <span>Print</span>
        </button>
        <button className="btn btn-primary btn-sm" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
};
