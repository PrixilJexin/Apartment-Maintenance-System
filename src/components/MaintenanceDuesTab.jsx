import React, { useState } from 'react';
import {
  useMaintenance, DUE_DAY, fmt, dt, getStatus, daysOverdue, monthInfo, monthLabel, todayISO
} from '../context/MaintenanceContext';
import { Modal } from './Modal';
import { ReceiptModal } from './ReceiptModal';
import { PlusCircle, Search, Receipt, CheckCircle, Undo2, Pencil, Trash2, CalendarPlus } from 'lucide-react';

export const MaintenanceDuesTab = () => {
  const {
    data, addDue, updateDue, markPaid, markUnpaid, deleteDue, generateMonthlyDues, getResidentName
  } = useMaintenance();

  const currentMonth = monthInfo(0).key;
  const [filter, setFilter] = useState('All');
  const [month, setMonth] = useState(currentMonth);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedReceiptDue, setSelectedReceiptDue] = useState(null);
  const [saving, setSaving] = useState(false);
  const [billing, setBilling] = useState(false);

  const [apt, setApt] = useState('');
  const [amount, setAmount] = useState('2500');
  const [due, setDue] = useState(monthInfo(0).due);
  const [error, setError] = useState('');

  const dues = data.dues;
  const months = Array.from(new Set([currentMonth, ...dues.map(d => d.due.slice(0, 7))])).sort().reverse();

  const filteredDues = dues
    .filter(d => {
      if (month !== 'All' && d.due.slice(0, 7) !== month) return false;
      if (filter !== 'All' && getStatus(d) !== filter) return false;
      const q = search.toLowerCase();
      return d.apt.toLowerCase().includes(q) || getResidentName(d.apt).toLowerCase().includes(q);
    })
    .sort((a, b) => b.due.localeCompare(a.due) || a.apt.localeCompare(b.apt));

  const openAdd = () => {
    setEditingId(null);
    setApt(data.apts[0]?.id || '');
    setAmount('2500');
    setDue(monthInfo(0).due < todayISO() ? todayISO() : monthInfo(0).due);
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (d) => {
    setEditingId(d.id);
    setApt(d.apt);
    setAmount(String(d.amount));
    setDue(d.due);
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amtNum = Number(amount);
    if (!apt) return setError('Please choose an apartment unit.');
    if (!amtNum || amtNum <= 0) return setError('Please enter a valid maintenance fee amount.');
    if (!due) return setError('Please select a valid payment due date.');

    setSaving(true);
    try {
      if (editingId) await updateDue(editingId, { amount: amtNum, due });
      else await addDue({ apt, amount: amtNum, due });
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (d) => {
    const updated = await markPaid(d.id);
    if (updated) setSelectedReceiptDue(updated);
  };

  const handleDelete = (d) => {
    const extra = d.due.slice(0, 7) === currentMonth
      ? ' This month’s due is re-created automatically for occupied units the next time the app loads.'
      : '';
    if (window.confirm(`Delete the ${fmt(d.amount)} due for ${d.apt} (${monthLabel(d.due.slice(0, 7))})?${extra}`)) {
      deleteDue(d.id);
    }
  };

  const handleBill = async () => {
    setBilling(true);
    await generateMonthlyDues({ manual: true });
    setBilling(false);
  };

  return (
    <div>
      <div className="card-header">
        <div>
          <h2>Maintenance Dues Registry</h2>
          <span style={{ color: 'var(--ink-muted)', fontSize: '14px' }}>
            Every occupied unit is billed automatically each month, due on day {DUE_DAY}.
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={handleBill} disabled={billing}>
            <CalendarPlus size={15} />
            <span>{billing ? 'Billing…' : `Bill ${monthLabel(currentMonth)}`}</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <PlusCircle size={15} />
            <span>Add One-off Due</span>
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <select
          className="form-select"
          style={{ width: 'auto', height: '36px', fontSize: '13px' }}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          <option value="All">All months</option>
          {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>

        <div style={{ display: 'flex', gap: '6px' }}>
          {['All', 'Paid', 'Pending', 'Overdue'].map(f => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-secondary' : 'btn-ghost'}`}
              style={{
                fontWeight: filter === f ? '700' : '500',
                borderColor: filter === f ? 'var(--accent)' : 'transparent'
              }}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', flex: '1', maxWidth: '300px', marginLeft: 'auto' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--ink-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }}
            placeholder="Search unit or resident..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Resident</th>
                <th>Month</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Payment Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDues.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--ink-muted)' }}>
                    No maintenance dues match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredDues.map((d) => {
                  const status = getStatus(d);
                  const days = daysOverdue(d);
                  return (
                    <tr key={d.id}>
                      <td style={{ fontWeight: '700' }}>{d.apt}</td>
                      <td>{getResidentName(d.apt)}</td>
                      <td style={{ color: 'var(--ink-muted)' }}>{monthLabel(d.due.slice(0, 7))}</td>
                      <td style={{ fontWeight: '700', color: d.paid ? 'var(--ok)' : 'var(--ink)' }}>
                        {fmt(d.amount)}
                      </td>
                      <td style={{ color: 'var(--ink-muted)' }}>{dt(d.due)}</td>
                      <td>
                        <span className={`pill ${status}`}>
                          {status === 'Overdue' ? `Overdue ${days}d` : status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {d.paid ? (
                            <>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => setSelectedReceiptDue(d)}
                                style={{ fontSize: '12px' }}
                              >
                                <Receipt size={13} />
                                <span>{d.rcpt || 'Receipt'}</span>
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                title="Undo payment (mark unpaid)"
                                onClick={() => {
                                  if (window.confirm(`Mark ${d.apt}'s ${monthLabel(d.due.slice(0, 7))} payment as unpaid?`)) markUnpaid(d.id);
                                }}
                              >
                                <Undo2 size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-success btn-sm" onClick={() => handleMarkPaid(d)}>
                                <CheckCircle size={13} />
                                <span>Mark Paid</span>
                              </button>
                              <button className="btn btn-ghost btn-sm" title="Edit amount / due date" onClick={() => openEdit(d)}>
                                <Pencil size={14} />
                              </button>
                            </>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Delete this due"
                            style={{ color: 'var(--bad)' }}
                            onClick={() => handleDelete(d)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => !saving && setIsModalOpen(false)}
        title={editingId ? 'Edit Maintenance Due' : 'Add One-off Maintenance Due'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Apartment Unit</label>
            <select className="form-select" value={apt} onChange={(e) => setApt(e.target.value)} disabled={Boolean(editingId)}>
              {data.apts.map(a => (
                <option key={a.id} value={a.id}>{a.id} — {getResidentName(a.id)}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount (&#8377;)</label>
              <input
                className="form-input"
                type="number"
                placeholder="2500"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Due Date</label>
              <input
                className="form-input"
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
          </div>

          {editingId && (
            <p style={{ fontSize: '12px', color: 'var(--ink-muted)', margin: '0 0 8px' }}>
              Future months are billed at the most recent amount for this unit.
            </p>
          )}

          {error && (
            <div style={{ color: 'var(--bad)', fontSize: '13px', marginBottom: '12px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsModalOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Due'}
            </button>
          </div>
        </form>
      </Modal>

      <ReceiptModal
        dueItem={selectedReceiptDue}
        isOpen={Boolean(selectedReceiptDue)}
        onClose={() => setSelectedReceiptDue(null)}
      />
    </div>
  );
};
