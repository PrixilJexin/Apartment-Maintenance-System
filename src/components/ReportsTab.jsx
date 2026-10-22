import React, { useState } from 'react';
import { useMaintenance, fmt, dt, daysOverdue } from '../context/MaintenanceContext';
import { Download, Copy, RefreshCw, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export const ReportsTab = () => {
  const { data, getResidentName, showToast, resetData, isSupabaseConfigured, fetchSupabaseData } = useMaintenance();
  const [copied, setCopied] = useState(false);

  const dues = data.dues;
  const apts = data.apts;

  const totalCollected = dues.filter(d => d.paid).reduce((s, d) => s + d.amount, 0);
  const totalPending = dues.filter(d => !d.paid).reduce((s, d) => s + d.amount, 0);
  const totalOverdue = dues.filter(d => !d.paid && daysOverdue(d) > 0).reduce((s, d) => s + d.amount, 0);

  const getCsvContent = () => {
    const headers = 'Unit,Resident,Amount,DueDate,DaysOverdue\n';
    const rows = dues
      .filter(d => !d.paid)
      .map(d => [
        d.apt,
        `"${getResidentName(d.apt)}"`,
        d.amount,
        d.due,
        Math.max(0, daysOverdue(d))
      ].join(','))
      .join('\n');
    return headers + rows;
  };

  const handleCopyCsv = async () => {
    try {
      await navigator.clipboard.writeText(getCsvContent());
      setCopied(true);
      showToast('Pending maintenance list copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      showToast('Clipboard copy blocked by browser permissions.');
    }
  };

  const handleDownloadCsv = () => {
    const csvData = getCsvContent();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `maintenance_dues_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded CSV report.');
  };

  return (
    <div>
      <div className="card-header">
        <div>
          <h2>Financial Reports &amp; Ledger Audits</h2>
          <span style={{ color: 'var(--ink-muted)', fontSize: '14px' }}>
            Aggregate summaries and exportable maintenance logs.
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleCopyCsv}>
            <Copy size={14} />
            <span>{copied ? 'Copied!' : 'Copy Pending CSV'}</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleDownloadCsv}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-icon" style={{ background: 'rgba(5, 150, 105, 0.12)', color: '#059669' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Collected</span>
            <div className="stat-val" style={{ color: 'var(--ok)' }}>{fmt(totalCollected)}</div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon" style={{ background: 'rgba(217, 119, 6, 0.12)', color: '#d97706' }}>
            <Clock size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Pending</span>
            <div className="stat-val" style={{ color: totalPending > 0 ? 'var(--warn)' : 'var(--ink)' }}>
              {fmt(totalPending)}
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon" style={{ background: 'rgba(220, 38, 38, 0.12)', color: '#dc2626' }}>
            <AlertTriangle size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Overdue</span>
            <div className="stat-val" style={{ color: totalOverdue > 0 ? 'var(--bad)' : 'var(--ink)' }}>
              {fmt(totalOverdue)}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3>Per-Unit Maintenance Statement</h3>
        </div>
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Resident</th>
                <th>Total Paid (All Time)</th>
                <th>Total Outstanding</th>
                <th>Last Settled Date</th>
              </tr>
            </thead>
            <tbody>
              {apts.map((a) => {
                const residentName = getResidentName(a.id);
                const aptDues = dues.filter(d => d.apt === a.id);
                const paidDues = aptDues.filter(d => d.paid);
                const openDues = aptDues.filter(d => !d.paid);

                const paidTotal = paidDues.reduce((s, d) => s + d.amount, 0);
                const openTotal = openDues.reduce((s, d) => s + d.amount, 0);

                const lastPaid = paidDues.sort((x, y) => y.paid.localeCompare(x.paid))[0];

                return (
                  <tr key={a.id}>
                    <td><b>{a.id}</b></td>
                    <td>{residentName}</td>
                    <td style={{ fontWeight: '700', color: 'var(--ok)' }}>{fmt(paidTotal)}</td>
                    <td style={{ fontWeight: '700', color: openTotal > 0 ? 'var(--bad)' : 'var(--ink-muted)' }}>
                      {fmt(openTotal)}
                    </td>
                    <td style={{ color: 'var(--ink-muted)' }}>
                      {lastPaid ? dt(lastPaid.paid) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
        <div>
          <h4 style={{ fontSize: '14px' }}>{isSupabaseConfigured ? 'Refresh Data' : 'Reset Demo Database'}</h4>
          <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
            {isSupabaseConfigured
              ? 'Reload all units, residents and payments from the live database.'
              : 'Restore default seed units, residents, and payment history.'}
          </span>
        </div>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => {
            if (isSupabaseConfigured) {
              fetchSupabaseData({ announce: true });
            } else if (window.confirm('Are you sure you want to restore default demo maintenance records?')) {
              resetData();
            }
          }}
        >
          <RefreshCw size={13} />
          <span>{isSupabaseConfigured ? 'Refresh Now' : 'Reset Sample Data'}</span>
        </button>
      </div>
    </div>
  );
};
