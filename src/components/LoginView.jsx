import React, { useState } from 'react';
import { useMaintenance } from '../context/MaintenanceContext';
import { Building, Lock, User, ArrowRight, ShieldCheck, Home, Phone, RefreshCw, AlertTriangle } from 'lucide-react';

const iconStyle = { position: 'absolute', left: '12px', top: '12px', color: 'var(--ink-muted)' };

export const LoginView = () => {
  const { login, loginTenant, isLoading, loadError, isSupabaseConfigured, isLiveConnected, fetchSupabaseData } = useMaintenance();
  const [mode, setMode] = useState('resident');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [unit, setUnit] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const switchMode = (m) => {
    setMode(m);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'admin') {
      if (!login(username.trim(), password)) setError('Invalid administrator username or password.');
    } else if (!loginTenant(unit, phone)) {
      setError('We could not find that unit and phone number. Use the phone number registered with the building office.');
    }
  };

  const offline = isSupabaseConfigured && !isLoading && !isLiveConnected;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'radial-gradient(ellipse at top, rgba(37, 99, 235, 0.08), transparent 70%), var(--bg)'
    }}>
      <div style={{ width: '100%', maxWidth: '420px', animation: 'fadeIn 0.25s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #2563eb, #1e40af)',
            borderRadius: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
            marginBottom: '14px'
          }}>
            <Building size={26} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.02em' }}>
            Maintenance Portal
          </h1>
          <p style={{ color: 'var(--ink-muted)', fontSize: '14px', margin: '6px 0 0' }}>
            Pay your monthly apartment maintenance and track your dues
          </p>
        </div>

        <div className="card" style={{ padding: '28px', boxShadow: 'var(--shadow-md)' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
            background: 'var(--bg-subtle)',
            padding: '4px',
            borderRadius: '10px',
            marginBottom: '22px'
          }}>
            {[
              { id: 'resident', label: 'Resident', icon: Home },
              { id: 'admin', label: 'Admin', icon: ShieldCheck }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => switchMode(id)}
                className="btn btn-sm"
                style={{
                  justifyContent: 'center',
                  background: mode === id ? 'var(--card)' : 'transparent',
                  boxShadow: mode === id ? 'var(--shadow-sm)' : 'none',
                  color: mode === id ? 'var(--accent)' : 'var(--ink-muted)',
                  fontWeight: 700,
                  border: 'none'
                }}
              >
                <Icon size={15} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {isLoading && (
            <p style={{ fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '14px' }}>
              Loading building records…
            </p>
          )}

          {offline && (
            <div style={{
              background: 'var(--warn-bg)',
              border: '1px solid var(--warn-border)',
              color: 'var(--warn)',
              fontSize: '13px',
              padding: '10px 12px',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontWeight: 700 }}>
                <AlertTriangle size={14} /> Can&apos;t reach the database
              </div>
              <div style={{ margin: '4px 0 8px' }}>{loadError}</div>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => fetchSupabaseData()}>
                <RefreshCw size={13} /> <span>Try again</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === 'resident' ? (
              <>
                <div className="form-group">
                  <label className="form-label">Unit Number</label>
                  <div style={{ position: 'relative' }}>
                    <Home size={16} style={iconStyle} />
                    <input
                      className="form-input"
                      style={{ paddingLeft: '36px' }}
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="e.g. A-101"
                      autoComplete="off"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Registered Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} style={iconStyle} />
                    <input
                      className="form-input"
                      style={{ paddingLeft: '36px' }}
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Your phone number"
                      autoComplete="tel"
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={iconStyle} />
                    <input
                      className="form-input"
                      style={{ paddingLeft: '36px' }}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={iconStyle} />
                    <input
                      className="form-input"
                      style={{ paddingLeft: '36px' }}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {error && (
              <div style={{
                background: 'var(--bad-bg)',
                border: '1px solid var(--bad-border)',
                color: 'var(--bad)',
                fontSize: '13px',
                padding: '8px 12px',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px', justifyContent: 'center' }}
              disabled={mode === 'resident' && (isLoading || offline)}
            >
              <span>{mode === 'resident' ? 'View My Dues' : 'Enter Admin Portal'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
