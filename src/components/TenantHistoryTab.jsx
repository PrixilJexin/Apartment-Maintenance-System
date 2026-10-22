import React, { useState } from 'react';
import { useMaintenance, fmt, dt, getStatus, daysOverdue } from '../context/MaintenanceContext';
import { ReceiptModal } from './ReceiptModal';
import {
  ArrowLeft,
  Receipt,
  User,
  Phone,
  CheckCircle2,
  Clock,
  AlertTriangle,
  History
} from 'lucide-react';

export const TenantHistoryTab = () => {
  const {
    data,
    selectedHistoryApt,
    setSelectedHistoryApt,
    getResident,
    markPaid
  } = useMaintenance();

  const [selectedReceiptDue, setSelectedReceiptDue] = useState(null);

  const dues = data.dues;
  const residents = data.residents;

  // If a specific tenant is selected
  if (selectedHistoryApt) {
    const resident = getResident(selectedHistoryApt);
    const tenantDues = dues
      .filter(d => d.apt === selectedHistoryApt)
      .sort((a, b) => b.due.localeCompare(a.due));

    const totalPaid = tenantDues.filter(d => d.paid).reduce((s, d) => s + d.amount, 0);
    const totalPending = tenantDues.filter(d => !d.paid).reduce((s, d) => s + d.amount, 0);
    const paymentsCount = tenantDues.filter(d => d.paid).length;

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSelectedHistoryApt(null)}
          >
            <ArrowLeft size={14} />
            <span>All Residents</span>
          </button>
          <div>
            <h2>{resident ? resident.name : 'Resident'} — Unit {selectedHistoryApt}</h2>
            <div style={{ display: 'flex', gap: '12px', color: 'var(--ink-muted)', fontSize: '13px', marginTop: '2px' }}>
              <span>Tenure: <b>{resident?.type === 'owner' ? 'Owner Resident' : 'Tenant'}</b></span>
              {resident?.phone && <span>Phone: <b>{resident.phone}</b></span>}
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-icon" style={{ background: 'rgba(5, 150, 105, 0.12)', color: '#059669' }}>
              <CheckCircle2 size={22} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Paid (Lifetime)</span>
              <div className="stat-val" style={{ color: 'var(--ok)' }}>{fmt(totalPaid)}</div>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon" style={{ background: 'rgba(217, 119, 6, 0.12)', color: '#d97706' }}>
              <Clock size={22} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Outstanding</span>
              <div className="stat-val" style={{ color: totalPending > 0 ? 'var(--bad)' : 'var(--ink)' }}>
                {fmt(totalPending)}
              </div>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' }}>
              <Receipt size={22} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Cleared Receipts</span>
              <div className="stat-val">{paymentsCount}</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cycle Due Date</th>
                  <th>Maintenance Amount</th>
                  <th>Payment Status</th>
                  <th>Settled On</th>
                  <th>Official Receipt</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenantDues.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--ink-muted)' }}>
                      No maintenance records found for this unit.
                    </td>
                  </tr>
                ) : (
                  tenantDues.map((d) => {
                    const status = getStatus(d);
                    const days = daysOverdue(d);
                    return (
                      <tr key={d.id}>
                        <td>
                          <b>{dt(d.due)}</b>
                        </td>
                        <td style={{ fontWeight: '700' }}>
                          {fmt(d.amount)}
                        </td>
                        <td>
                          <span className={`pill ${status}`}>
                            {status === 'Overdue' ? `Overdue ${days}d` : status}
                          </span>
                        </td>
                        <td style={{ color: d.paid ? 'var(--ok)' : 'var(--ink-muted)' }}>
                          {d.paid ? dt(d.paid) : '—'}
                        </td>
                        <td>
                          {d.rcpt ? (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => setSelectedReceiptDue(d)}
                              style={{ fontSize: '12px' }}
                            >
                              <Receipt size={13} />
                              <span>{d.rcpt}</span>
                            </button>
                          ) : (
                            <span style={{ color: 'var(--ink-muted)' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {!d.paid && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => markPaid(d.id)}
                            >
                              <CheckCircle2 size={13} />
                              <span>Mark Paid</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ReceiptModal
          dueItem={selectedReceiptDue}
          isOpen={Boolean(selectedReceiptDue)}
          onClose={() => setSelectedReceiptDue(null)}
        />
      </div>
    );
  }

  // Resident directory overview
  return (
    <div>
      <div className="card-header">
        <div>
          <h2>Tenants Payment Ledgers</h2>
          <span style={{ color: 'var(--ink-muted)', fontSize: '14px' }}>
            Select any resident to review their full historical maintenance timeline.
          </span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {residents.map((r) => {
          const tenantDues = dues.filter(d => d.apt === r.apt);
          const paidCount = tenantDues.filter(d => d.paid).length;
          const pendingDues = tenantDues.filter(d => !d.paid);
          const hasOverdue = pendingDues.some(d => daysOverdue(d) > 0);
          const totalPaid = tenantDues.filter(d => d.paid).reduce((s, d) => s + d.amount, 0);

          let borderColor = 'var(--border)';
          let statusBadge = (
            <span style={{ color: 'var(--ok)', fontSize: '12px', fontWeight: '600' }}>
              ✓ All clear
            </span>
          );

          if (hasOverdue) {
            borderColor = 'var(--bad)';
            statusBadge = (
              <span style={{ color: 'var(--bad)', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={13} /> Overdue Dues
              </span>
            );
          } else if (pendingDues.length > 0) {
            borderColor = 'var(--warn)';
            statusBadge = (
              <span style={{ color: 'var(--warn)', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} /> {pendingDues.length} Pending
              </span>
            );
          }

          return (
            <div
              key={r.apt}
              className="card"
              style={{
                cursor: 'pointer',
                borderLeft: `4px solid ${borderColor}`,
                padding: '18px',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                marginBottom: 0
              }}
              onClick={() => setSelectedHistoryApt(r.apt)}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: 'var(--accent)',
                  background: 'var(--accent-light)',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  Unit {r.apt}
                </span>
                {statusBadge}
              </div>

              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--ink)' }}>
                {r.name}
              </div>

              <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={12} /> {r.phone}
              </div>

              <div style={{
                marginTop: '14px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '13px'
              }}>
                <div>
                  <span style={{ color: 'var(--ink-muted)', fontSize: '11px', display: 'block' }}>Settled</span>
                  <span style={{ fontWeight: '600' }}>{paidCount} cycles</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: 'var(--ink-muted)', fontSize: '11px', display: 'block' }}>Total Paid</span>
                  <span style={{ fontWeight: '700', color: 'var(--ok)' }}>{fmt(totalPaid)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
