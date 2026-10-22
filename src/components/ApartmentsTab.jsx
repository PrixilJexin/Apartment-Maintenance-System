import React, { useState } from 'react';
import { useMaintenance, fmt } from '../context/MaintenanceContext';
import { Modal } from './Modal';
import { PlusCircle, Building, CheckCircle, CircleDashed, Trash2 } from 'lucide-react';

export const ApartmentsTab = () => {
  const { data, addApt, deleteApt, getResident, viewTenantHistory } = useMaintenance();
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unitId, setUnitId] = useState('');
  const [floor, setFloor] = useState('1');
  const [type, setType] = useState('2 BHK');
  const [error, setError] = useState('');

  const apts = data.apts;
  const dues = data.dues;

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!unitId.trim()) {
      setError('Please provide a unit identifier (e.g. D-401).');
      return;
    }
    setSaving(true);
    try {
      await addApt({
        id: unitId.trim().toUpperCase(),
        floor,
        type
      });
      setUnitId('');
      setFloor('1');
      setError('');
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (a) => {
    if (window.confirm(`Delete unit ${a.id}? Its entire payment history will be deleted too. This cannot be undone.`)) {
      deleteApt(a.id);
    }
  };

  const getOpenDues = (aptId) => {
    return dues
      .filter(d => d.apt === aptId && !d.paid)
      .reduce((s, d) => s + d.amount, 0);
  };

  return (
    <div>
      <div className="card-header">
        <div>
          <h2>Apartment Inventory</h2>
          <span style={{ color: 'var(--ink-muted)', fontSize: '14px' }}>
            Registered units, layouts, and current occupancy statuses.
          </span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
          <PlusCircle size={15} />
          <span>Add Apartment Unit</span>
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Layout</th>
                <th>Floor</th>
                <th>Occupancy Status</th>
                <th>Resident</th>
                <th>Open Maintenance Dues</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {apts.map((a) => {
                const resident = getResident(a.id);
                const openDues = getOpenDues(a.id);
                return (
                  <tr key={a.id}>
                    <td>
                      <span style={{ fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Building size={14} color="var(--accent)" />
                        {a.id}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        background: 'var(--bg-subtle)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {a.type}
                      </span>
                    </td>
                    <td style={{ color: 'var(--ink-muted)' }}>Floor {a.floor}</td>
                    <td>
                      {resident ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--ok)', fontSize: '13px', fontWeight: '600' }}>
                          <CheckCircle size={14} />
                          Occupied
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--ink-muted)', fontSize: '13px' }}>
                          <CircleDashed size={14} />
                          Vacant
                        </span>
                      )}
                    </td>
                    <td>
                      {resident ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{resident.name}</span>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '2px 6px', fontSize: '11px' }}
                            onClick={() => viewTenantHistory(a.id)}
                          >
                            Ledger
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--ink-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {openDues > 0 ? (
                        <span style={{ color: 'var(--bad)', fontWeight: '700' }}>
                          {fmt(openDues)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--ok)', fontWeight: '600' }}>
                          Clear
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--bad)' }}
                        title={resident ? 'Remove the resident before deleting this unit' : 'Delete unit'}
                        disabled={Boolean(resident)}
                        onClick={() => handleDelete(a)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Apartment Unit">
        <form onSubmit={handleAddSubmit}>
          <div className="form-group">
            <label className="form-label">Unit Number / Identifier</label>
            <input
              className="form-input"
              placeholder="e.g. D-401 or Tower-1 502"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Layout / Configuration</label>
              <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="1 BHK">1 BHK</option>
                <option value="2 BHK">2 BHK</option>
                <option value="3 BHK">3 BHK</option>
                <option value="4 BHK Penthouse">4 BHK Penthouse</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Floor</label>
              <input
                className="form-input"
                type="number"
                min="0"
                max="100"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div style={{ color: 'var(--bad)', fontSize: '13px', marginBottom: '12px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Saving…' : 'Add Unit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
