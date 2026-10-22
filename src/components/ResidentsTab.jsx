import React, { useState } from 'react';
import { useMaintenance, fmt } from '../context/MaintenanceContext';
import { Modal } from './Modal';
import { UserPlus, Search, History, Phone, Home, Trash2 } from 'lucide-react';

export const ResidentsTab = () => {
  const { data, addResident, deleteResident, viewTenantHistory } = useMaintenance();
  const [fee, setFee] = useState('');
  const [saving, setSaving] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('tenant');
  const [apt, setApt] = useState(data.apts[0]?.id || 'A-101');
  const [formError, setFormError] = useState('');

  const residents = data.residents;
  const vacantApts = data.apts.filter(a => !residents.some(r => r.apt === a.id));
  const chosenApt = vacantApts.some(a => a.id === apt) ? apt : (vacantApts[0]?.id || '');
  const dues = data.dues;

  const filteredResidents = residents.filter(r => {
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.apt.toLowerCase().includes(q) || r.phone.includes(q);
  });

  const getOpenDues = (unit) => {
    return dues
      .filter(d => d.apt === unit && !d.paid)
      .reduce((s, d) => s + d.amount, 0);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Please enter the resident name.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Please enter a contact phone number.');
      return;
    }
    if (!chosenApt) {
      setFormError('Every unit already has a resident. Add a new apartment unit first.');
      return;
    }
    setSaving(true);
    try {
      await addResident({
        name: name.trim(),
        phone: phone.trim(),
        type,
        apt: chosenApt,
        fee
      });
      setName('');
      setPhone('');
      setFee('');
      setFormError('');
      setIsAddModalOpen(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (r) => {
    if (window.confirm(`Remove ${r.name} from unit ${r.apt}? Their payment history is kept with the unit, and they will no longer be able to sign in.`)) {
      deleteResident(r.id);
    }
  };

  return (
    <div>
      <div className="card-header">
        <div>
          <h2>Residents Directory</h2>
          <span style={{ color: 'var(--ink-muted)', fontSize: '14px' }}>
            Tenants and owner-residents residing across all units.
          </span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setIsAddModalOpen(true)}>
          <UserPlus size={15} />
          <span>Register Resident</span>
        </button>
      </div>

      <div className="filter-bar">
        <div style={{ position: 'relative', flex: '1', maxWidth: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--ink-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: '34px' }}
            placeholder="Search by name, unit, phone..."
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
                <th>Full Name</th>
                <th>Tenure Type</th>
                <th>Contact</th>
                <th>Open Maintenance Dues</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredResidents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--ink-muted)' }}>
                    No matching residents found.
                  </td>
                </tr>
              ) : (
                filteredResidents.map((r, idx) => {
                  const openDue = getOpenDues(r.apt);
                  return (
                    <tr key={r.id ?? idx}>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                          <Home size={14} color="var(--accent)" />
                          {r.apt}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600' }}>{r.name}</td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          fontSize: '12px',
                          fontWeight: '600',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: r.type === 'owner' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                          color: r.type === 'owner' ? 'var(--accent)' : 'var(--ink-secondary)'
                        }}>
                          {r.type === 'owner' ? 'Owner Resident' : 'Tenant'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--ink-muted)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={13} />
                          {r.phone}
                        </span>
                      </td>
                      <td>
                        {openDue > 0 ? (
                          <span style={{ color: 'var(--bad)', fontWeight: '700' }}>
                            {fmt(openDue)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--ok)', fontWeight: '600' }}>
                            Clear
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => viewTenantHistory(r.apt)}
                          title="View complete payment timeline"
                        >
                          <History size={13} />
                          <span>History</span>
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--bad)', marginLeft: '6px' }}
                          onClick={() => handleDelete(r)}
                          title="Remove resident"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register New Resident">
        <form onSubmit={handleAddSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              className="form-input"
              placeholder="e.g. Anand Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              className="form-input"
              placeholder="e.g. 98400 12345"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Resident Type</label>
              <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="tenant">Tenant</option>
                <option value="owner">Owner Resident</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Unit</label>
              <select className="form-select" value={chosenApt} onChange={(e) => setApt(e.target.value)}>
                {vacantApts.map(a => (
                  <option key={a.id} value={a.id}>{a.id} ({a.type})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Monthly Maintenance Fee (&#8377;)</label>
            <input
              className="form-input"
              type="number"
              min="1"
              placeholder="Leave blank to use the unit's last amount (default 2500)"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
              The resident signs in with their unit number and this phone number.
            </span>
          </div>

          {formError && (
            <div style={{ color: 'var(--bad)', fontSize: '13px', marginBottom: '12px' }}>
              {formError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Saving…' : 'Register Resident'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
