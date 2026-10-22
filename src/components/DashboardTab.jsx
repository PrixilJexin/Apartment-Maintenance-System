import React, { useState } from 'react';
import { useMaintenance, fmt, dt, getStatus, daysOverdue, monthInfo, monthLabel } from '../context/MaintenanceContext';
import { ReceiptModal } from './ReceiptModal';
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

export const DashboardTab = () => {
  const { data, getResidentName, setActiveTab, setSelectedHistoryApt, markPaid } = useMaintenance();
  const [selectedReceiptDue, setSelectedReceiptDue] = useState(null);

  const dues = data.dues;
  const apts = data.apts;
  const residents = data.residents;

  const { key: monthKey } = monthInfo(0);
  const monthDues = dues.filter(d => d.due.slice(0, 7) === monthKey);
  const monthPaid = monthDues.filter(d => d.paid);
  const monthUnpaid = monthDues
    .filter(d => !d.paid)
    .sort((a, b) => a.due.localeCompare(b.due) || a.apt.localeCompare(b.apt));

  const monthBilled = monthDues.reduce((s, d) => s + d.amount, 0);
  const collectedTotal = monthPaid.reduce((s, d) => s + d.amount, 0);
  const pending = dues.filter(d => !d.paid);
  const pendingTotal = pending.reduce((s, d) => s + d.amount, 0);

  const collectionPercent = monthBilled > 0
    ? Math.round((collectedTotal / monthBilled) * 100)
    : 100;

  const overdueCount = pending.filter(d => daysOverdue(d) > 0).length;
  const occupiedCount = apts.filter(a => residents.some(r => r.apt === a.id)).length;

  const recentPayments = dues
    .filter(d => d.paid)
    .sort((a, b) => b.paid.localeCompare(a.paid))
    .slice(0, 6);

  return (
    <div>
      <div className="card-header">
        <div>
          <h2>Dashboard Overview</h2>
          <span style={{ color: 'var(--ink-muted)', fontSize: '14px' }}>
            Real-time status of apartment maintenance collections &amp; occupancy.
          </span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' }}>
            <Building2 size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Units</span>
            <div className="stat-val">{apts.length}</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
            <Users size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Occupied</span>
            <div className="stat-val">{occupiedCount} <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--ink-muted)' }}>/ {apts.length}</span></div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon" style={{ background: 'rgba(5, 150, 105, 0.12)', color: '#059669' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Collected ({monthLabel(monthKey).split(' ')[0]})</span>
            <div className="stat-val">{fmt(collectedTotal)}</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon" style={{ background: 'rgba(217, 119, 6, 0.12)', color: '#d97706' }}>
            <Clock size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Outstanding</span>
            <div className="stat-val">{fmt(pendingTotal)}</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon" style={{ background: 'rgba(220, 38, 38, 0.12)', color: '#dc2626' }}>
            <AlertTriangle size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Overdue Dues</span>
            <div className="stat-val">{overdueCount}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '15px' }}>{monthLabel(monthKey)} Collection</h3>
            <span style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>
              {monthPaid.length} of {monthDues.length} units paid · {fmt(collectedTotal)} of {fmt(monthBilled)} collected
            </span>
          </div>
          <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--ok)' }}>
            {collectionPercent}%
          </span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${collectionPercent}%` }} />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>Yet to Pay — {monthLabel(monthKey)}</h3>
            <span style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>
              Units that have not paid this month&apos;s maintenance
            </span>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('Pending / Overdue')}>
            <span>All Pending</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {monthUnpaid.length === 0 ? (
          <p style={{ color: 'var(--ok)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={16} />
            {monthDues.length === 0 ? 'No dues billed this month yet.' : 'Every unit has paid this month.'}
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Resident</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {monthUnpaid.map(due => {
                  const status = getStatus(due);
                  return (
                    <tr key={due.id}>
                      <td><b>{due.apt}</b></td>
                      <td>{getResidentName(due.apt)}</td>
                      <td style={{ fontWeight: '700' }}>{fmt(due.amount)}</td>
                      <td style={{ color: 'var(--ink-muted)' }}>{dt(due.due)}</td>
                      <td>
                        <span className={`pill ${status}`}>
                          {status === 'Overdue' ? `Overdue ${daysOverdue(due)}d` : 'Pending'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-success btn-sm" onClick={() => markPaid(due.id)}>
                          <CheckCircle2 size={13} />
                          <span>Mark Paid</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>Recent Maintenance Payments</h3>
            <span style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>Latest confirmed ledger entries</span>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setActiveTab('Maintenance Dues')}
          >
            <span>View All Dues</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {recentPayments.length === 0 ? (
          <p style={{ color: 'var(--ink-muted)' }}>No recorded payments yet.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Resident</th>
                  <th>Amount</th>
                  <th>Paid Date</th>
                  <th>Receipt</th>
                  <th>History</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map(due => (
                  <tr key={due.id}>
                    <td><b>{due.apt}</b></td>
                    <td>{getResidentName(due.apt)}</td>
                    <td style={{ fontWeight: '700', color: 'var(--ok)' }}>{fmt(due.amount)}</td>
                    <td style={{ color: 'var(--ink-muted)' }}>{dt(due.paid)}</td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setSelectedReceiptDue(due)}
                        style={{ fontSize: '12px', padding: '3px 8px' }}
                      >
                        <Receipt size={13} />
                        <span>{due.rcpt}</span>
                      </button>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setSelectedHistoryApt(due.apt);
                          setActiveTab('Tenant History');
                        }}
                      >
                        Ledger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReceiptModal
        dueItem={selectedReceiptDue}
        isOpen={Boolean(selectedReceiptDue)}
        onClose={() => setSelectedReceiptDue(null)}
      />
    </div>
  );
};
