import React, { useState } from 'react';
import { useMaintenance, fmt, dt, getStatus, daysOverdue } from '../context/MaintenanceContext';
import { Modal } from './Modal';
import { AlertCircle, Bell, CheckCircle2, Phone, Sparkles } from 'lucide-react';

export const PendingOverdueTab = () => {
  const { data, markPaid, getResident, getResidentName, showToast } = useMaintenance();
  const [reminderTargetDue, setReminderTargetDue] = useState(null);

  const dues = data.dues;
  const pendingDues = dues
    .filter(d => !d.paid)
    .sort((a, b) => daysOverdue(b) - daysOverdue(a));

  const handleSendReminderConfirm = () => {
    if (reminderTargetDue) {
      const res = getResident(reminderTargetDue.apt);
      const name = res ? res.name : 'Resident';
      showToast(`Reminder notification dispatched to ${name} (${reminderTargetDue.apt})`);
      setReminderTargetDue(null);
    }
  };

  return (
    <div>
      <div className="card-header">
        <div>
          <h2>Pending &amp; Overdue Collections</h2>
          <span style={{ color: 'var(--ink-muted)', fontSize: '14px' }}>
            Action center for uncollected maintenance fees and resident follow-ups.
          </span>
        </div>
      </div>

      {pendingDues.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--ok-bg)',
            color: 'var(--ok)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px'
          }}>
            <Sparkles size={24} />
          </div>
          <h3>All Dues Are Fully Cleared!</h3>
          <p style={{ color: 'var(--ink-muted)', fontSize: '14px', maxWidth: '400px', margin: '6px auto 0' }}>
            There are zero pending or overdue maintenance accounts across the entire building.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Resident &amp; Contact</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingDues.map((d) => {
                  const status = getStatus(d);
                  const overdueDays = daysOverdue(d);
                  const res = getResident(d.apt);
                  const isOverdue = overdueDays > 0;

                  return (
                    <tr key={d.id} style={{ background: isOverdue ? 'rgba(239, 68, 68, 0.02)' : 'transparent' }}>
                      <td>
                        <span style={{ fontWeight: '800', fontSize: '15px' }}>{d.apt}</span>
                      </td>
                      <td>
                        <div>
                          <div style={{ fontWeight: '600' }}>{getResidentName(d.apt)}</div>
                          {res?.phone && (
                            <span style={{ color: 'var(--ink-muted)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={11} /> {res.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: '800', color: isOverdue ? 'var(--bad)' : 'var(--warn)' }}>
                        {fmt(d.amount)}
                      </td>
                      <td style={{ color: 'var(--ink-muted)' }}>{dt(d.due)}</td>
                      <td>
                        <span className={`pill ${status}`}>
                          {status === 'Overdue' ? `Overdue by ${overdueDays}d` : 'Pending'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setReminderTargetDue(d)}
                            style={{
                              color: isOverdue ? 'var(--bad)' : 'var(--warn)',
                              borderColor: isOverdue ? 'var(--bad-border)' : 'var(--warn-border)'
                            }}
                          >
                            <Bell size={13} />
                            <span>Remind</span>
                          </button>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => markPaid(d.id)}
                          >
                            <CheckCircle2 size={13} />
                            <span>Mark Paid</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reminderTargetDue && (
        <Modal
          isOpen={Boolean(reminderTargetDue)}
          onClose={() => setReminderTargetDue(null)}
          title="Send Maintenance Fee Reminder"
        >
          <div>
            <p style={{ fontSize: '14px', color: 'var(--ink-secondary)', marginBottom: '16px' }}>
              Dispatch a payment notification to <b>{getResidentName(reminderTargetDue.apt)}</b> (Unit {reminderTargetDue.apt}) for <b>{fmt(reminderTargetDue.amount)}</b> due on <b>{dt(reminderTargetDue.due)}</b>.
            </p>

            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '13px',
              color: 'var(--ink-secondary)',
              marginBottom: '20px'
            }}>
              <b>SMS / Notification Preview:</b>
              <div style={{ marginTop: '6px', fontStyle: 'italic' }}>
                "Dear {getResidentName(reminderTargetDue.apt)}, this is a friendly reminder that maintenance dues of {fmt(reminderTargetDue.amount)} for Unit {reminderTargetDue.apt} were due on {dt(reminderTargetDue.due)}. Please clear the outstanding dues."
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setReminderTargetDue(null)}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSendReminderConfirm}>
                Confirm &amp; Send
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
