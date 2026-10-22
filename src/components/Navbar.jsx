import React from 'react';
import { useMaintenance } from '../context/MaintenanceContext';
import { ShieldCheck, Moon, Sun, LogOut, Building, Database } from 'lucide-react';

export const Navbar = () => {
  const { logout, theme, toggleTheme, isLiveConnected, isSupabaseConfigured, session, isAdmin, getResidentName } = useMaintenance();

  return (
    <header className="portal-header">
      <div className="portal-brand">
        <div className="portal-logo-icon">
          <Building size={20} />
        </div>
        <div>
          <span className="portal-title">Maintenance Portal</span>
          <span className="portal-subtitle">{isAdmin ? 'Admin Monitoring & Ledger' : 'Resident Dues & Payments'}</span>
        </div>
      </div>

      <div className="portal-actions">
        <div
          title={
            isLiveConnected
              ? 'Connected to live Supabase cloud database'
              : isSupabaseConfigured
              ? 'Connecting to Supabase...'
              : 'Running in Local Storage mode (Supabase keys not configured yet)'
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: isLiveConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.1)',
            border: isLiveConnected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.15)',
            color: isLiveConnected ? '#34d399' : 'rgba(255, 255, 255, 0.8)',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          <Database size={13} />
          <span>{isLiveConnected ? 'Supabase Live' : isSupabaseConfigured ? 'Offline' : 'Local Mode'}</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          <ShieldCheck size={14} color="#34d399" />
          <span>{isAdmin ? 'Admin' : `${getResidentName(session.apt)} · ${session.apt}`}</span>
        </div>

        <button
          onClick={toggleTheme}
          className="btn btn-ghost btn-sm"
          style={{ color: '#fff' }}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>

        <button
          onClick={logout}
          className="btn btn-sm"
          style={{
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#fca5a5',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}
        >
          <LogOut size={14} />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
};
