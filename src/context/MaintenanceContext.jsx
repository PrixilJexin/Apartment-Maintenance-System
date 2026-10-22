import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

const STORAGE_KEY = 'maint_admin_v3';
const SESSION_KEY = 'maint_session';
const THEME_KEY = 'maint_admin_theme';

// Billing rules: every occupied unit is billed once per calendar month, due on DUE_DAY.
export const DUE_DAY = 5;
const DEFAULT_FEE = 2500;

const ADMIN_USER = import.meta.env.VITE_ADMIN_USER || 'admin';
const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS || 'admin123';

const remote = isSupabaseConfigured ? supabase : null;

const MaintenanceContext = createContext(null);

/* ---------- date helpers (local time, so "today" matches the user's calendar) ---------- */

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const todayISO = () => iso(new Date());

// Billing month `offset` months from now: its key ("2026-10") and standard due date.
export const monthInfo = (offset = 0) => {
  const n = new Date();
  const d = new Date(n.getFullYear(), n.getMonth() + offset, 1);
  const key = iso(d).slice(0, 7);
  return { key, due: `${key}-${String(DUE_DAY).padStart(2, '0')}` };
};

export const monthLabel = (key) =>
  new Date(`${key}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

export const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export const dt = (s) => {
  if (!s) return '—';
  return new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// Whole days between a due date and today (positive = overdue, negative = still upcoming).
export const daysPast = (dueDate) =>
  Math.round((new Date(todayISO()) - new Date(dueDate)) / 864e5);

export const daysOverdue = (due) => {
  if (!due || due.paid) return 0;
  return daysPast(due.due);
};

export const getStatus = (due) => {
  if (!due) return 'Pending';
  if (due.paid) return 'Paid';
  return daysOverdue(due) > 0 ? 'Overdue' : 'Pending';
};

const rcptFor = (id) => 'RCP' + (1000 + id);
const normalizePhone = (s) => String(s || '').replace(/\D/g, '');
const nextId = (rows) => Math.max(0, ...rows.map(r => r.id || 0)) + 1;

/* ---------- supabase helpers ---------- */

const check = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

// A write that matched nothing (e.g. blocked by database rules) must not look like a success.
const expectRows = (rows, message) => {
  if (!rows || rows.length === 0) throw new Error(message);
  return rows;
};

/* ---------- demo data (only used when Supabase is not configured) ---------- */

const getInitialSeed = () => {
  const residents = [
    { id: 1, apt: 'A-101', name: 'Priya Nair', phone: '9840010001', type: 'tenant' },
    { id: 2, apt: 'A-102', name: 'Rahul Menon', phone: '9840010002', type: 'owner' },
    { id: 3, apt: 'B-201', name: 'Meena Iyer', phone: '9840010003', type: 'tenant' },
    { id: 4, apt: 'B-202', name: 'Arjun Rao', phone: '9840010004', type: 'owner' },
    { id: 5, apt: 'C-301', name: 'Karthik S', phone: '9840010005', type: 'tenant' }
  ];

  const apts = [
    { id: 'A-101', floor: 1, type: '2 BHK' },
    { id: 'A-102', floor: 1, type: '3 BHK' },
    { id: 'B-201', floor: 2, type: '2 BHK' },
    { id: 'B-202', floor: 2, type: '1 BHK' },
    { id: 'C-301', floor: 3, type: '3 BHK' },
    { id: 'C-302', floor: 3, type: '2 BHK' }
  ];

  const fees = { 'A-101': 2500, 'A-102': 3000, 'B-201': 2200, 'B-202': 1800, 'C-301': 3000 };
  const dues = [];
  let id = 1;
  [-2, -1, 0].forEach((offset) => {
    const { due } = monthInfo(offset);
    residents.forEach((r) => {
      // Past months are settled, except one unit that is still behind; this month A-101 has paid.
      const settled = offset < 0 ? !(offset === -1 && r.apt === 'B-202') : r.apt === 'A-101';
      dues.push({
        id,
        apt: r.apt,
        amount: fees[r.apt],
        due,
        paid: settled ? due : null,
        rcpt: settled ? rcptFor(id) : null
      });
      id++;
    });
  });

  return { residents, apts, dues };
};

/* ---------- provider ---------- */

export const MaintenanceProvider = ({ children }) => {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // With a real database the cache is only a placeholder until the first fetch finishes.
    return isSupabaseConfigured ? { residents: [], apts: [], dues: [] } : getInitialSeed();
  });

  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [loadError, setLoadError] = useState('');

  // session: null | { role: 'admin' } | { role: 'tenant', apt }
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
    } catch {
      return null;
    }
  });

  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light');
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [selectedHistoryApt, setSelectedHistoryApt] = useState(null);
  const [toasts, setToasts] = useState([]);

  const dataRef = useRef(data);
  const generating = useRef(false);
  const attempted = useRef(new Set());
  const hasConnectedOnce = useRef(false);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const showToast = useCallback((message) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3600);
  }, []);

  /* ---------- loading ---------- */

  const fetchSupabaseData = useCallback(async ({ announce = false } = {}) => {
    if (!remote) return;
    try {
      setIsLoading(true);
      const [resRes, aptsRes, duesRes] = await Promise.all([
        remote.from('residents').select('*').order('id'),
        remote.from('apartments').select('*').order('id'),
        remote.from('dues').select('*').order('id', { ascending: false })
      ]);

      setData({
        residents: check(resRes) || [],
        apts: check(aptsRes) || [],
        dues: check(duesRes) || []
      });
      setIsLiveConnected(true);
      setLoadError('');
      if (announce || !hasConnectedOnce.current) {
        showToast(announce ? 'Data refreshed from the database' : 'Connected to Supabase database');
      }
      hasConnectedOnce.current = true;
    } catch (err) {
      console.error('Supabase fetch error:', err);
      setIsLiveConnected(false);
      setLoadError(err.message || 'Could not reach the database');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSupabaseData();
  }, [fetchSupabaseData]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error(e);
    }
  }, [data]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  /* ---------- auth ---------- */

  const startSession = (s) => {
    setSession(s);
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  };

  const login = (u, p) => {
    if (u === ADMIN_USER && p === ADMIN_PASS) {
      startSession({ role: 'admin' });
      setActiveTab('Dashboard');
      showToast('Welcome back, Admin!');
      return true;
    }
    return false;
  };

  // Residents sign in with their unit number and the phone number they registered with.
  const loginTenant = (unit, phone) => {
    const resident = data.residents.find(
      r => r.apt.toLowerCase() === unit.trim().toLowerCase() &&
        normalizePhone(r.phone) === normalizePhone(phone) &&
        normalizePhone(phone).length > 0
    );
    if (!resident) return false;
    startSession({ role: 'tenant', apt: resident.apt });
    showToast(`Welcome, ${resident.name}!`);
    return true;
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem(SESSION_KEY);
    setSelectedHistoryApt(null);
    showToast('Signed out successfully.');
  };

  // If a resident is removed while signed in, end their session.
  useEffect(() => {
    if (session?.role === 'tenant' && !isLoading && (!remote || isLiveConnected)) {
      if (!data.residents.some(r => r.apt === session.apt)) {
        setSession(null);
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, [session, data.residents, isLoading, isLiveConnected]);

  const isAdmin = session?.role === 'admin';
  const isAuthenticated = Boolean(session);

  /* ---------- lookups ---------- */

  const getResident = (apt) => data.residents.find(r => r.apt === apt) || null;
  const getResidentName = (apt) => getResident(apt)?.name || 'Vacant';

  /* ---------- writes ----------
     Form actions (add*, updateDue) throw on failure so the form can show the message.
     Button actions (markPaid, markUnpaid, delete*) report failure with a toast and return a falsy value.
     State is only updated after the database confirms the change. */

  const insertDues = async (rows) => {
    if (remote) return expectRows(check(await remote.from('dues').insert(rows).select()), 'Could not save the due.');
    let id = nextId(dataRef.current.dues);
    return rows.map(r => ({ id: id++, paid: null, rcpt: null, ...r }));
  };

  const lastAmount = (dues, apt) => {
    const latest = dues
      .filter(d => d.apt === apt)
      .sort((a, b) => b.due.localeCompare(a.due))[0];
    return latest ? latest.amount : DEFAULT_FEE;
  };

  // Bills every occupied unit that has no due yet this month. Safe to call repeatedly.
  const generateMonthlyDues = useCallback(async ({ manual = false } = {}) => {
    if (generating.current) return 0;
    generating.current = true;
    try {
      const { key, due } = monthInfo(0);
      const next = monthInfo(1).key;
      if (manual) attempted.current.clear();

      const { residents, dues } = dataRef.current;
      const billed = new Set(dues.filter(d => d.due.slice(0, 7) === key).map(d => d.apt));

      if (remote) {
        // Re-check the database so two open browsers don't bill the same month twice.
        const rows = check(await remote.from('dues').select('apt').gte('due', `${key}-01`).lt('due', `${next}-01`));
        rows.forEach(r => billed.add(r.apt));
      }

      const rows = [];
      for (const r of residents) {
        const marker = key + r.apt;
        if (billed.has(r.apt) || attempted.current.has(marker)) continue;
        attempted.current.add(marker);
        rows.push({ apt: r.apt, amount: lastAmount(dues, r.apt), due });
      }
      if (rows.length === 0) {
        if (manual) showToast(`${monthLabel(key)} dues are already up to date.`);
        return 0;
      }

      const created = await insertDues(rows);
      setData(prev => ({ ...prev, dues: [...created, ...prev.dues] }));
      showToast(`${monthLabel(key)} maintenance billed for ${created.length} unit${created.length > 1 ? 's' : ''}`);
      return created.length;
    } catch (err) {
      console.error('Monthly billing failed:', err);
      if (manual) showToast('Could not generate dues: ' + err.message);
      return 0;
    } finally {
      generating.current = false;
    }
  }, [showToast]);

  const dbReady = !isLoading && (!remote || isLiveConnected);

  useEffect(() => {
    if (dbReady && session) generateMonthlyDues();
  }, [dbReady, session, data.residents, generateMonthlyDues]);

  const requireLive = () => {
    if (remote && !isLiveConnected) {
      throw new Error('Not connected to the database. Check your connection and refresh.');
    }
  };

  const addApt = async ({ id, floor, type }) => {
    requireLive();
    if (data.apts.some(a => a.id.toLowerCase() === id.toLowerCase())) {
      throw new Error(`Unit ${id} already exists`);
    }
    let newApt = { id, floor: Number(floor) || 1, type };
    if (remote) {
      [newApt] = expectRows(check(await remote.from('apartments').insert([newApt]).select()), 'Could not save the unit.');
    }
    setData(prev => ({ ...prev, apts: [...prev.apts, newApt] }));
    showToast(`Unit ${id} added successfully`);
  };

  const addResident = async ({ apt, name, phone, type, fee }) => {
    requireLive();
    if (data.residents.some(r => r.apt === apt)) {
      throw new Error(`Unit ${apt} already has a resident. Remove them first to register someone new.`);
    }
    if (normalizePhone(phone).length < 6) {
      throw new Error('Please enter a valid phone number. Residents use it to sign in.');
    }

    let newResident = { apt, name, phone, type };
    if (remote) {
      [newResident] = expectRows(check(await remote.from('residents').insert([newResident]).select()), 'Could not save the resident.');
    } else {
      newResident = { id: nextId(data.residents), ...newResident };
    }

    // Start billing immediately: this month's due, unless the unit was already billed.
    let created = [];
    const { key, due } = monthInfo(0);
    if (!data.dues.some(d => d.apt === apt && d.due.slice(0, 7) === key)) {
      const amount = Number(fee) > 0 ? Number(fee) : lastAmount(data.dues, apt);
      const firstDue = due < todayISO() ? todayISO() : due;
      try {
        created = await insertDues([{ apt, amount, due: firstDue }]);
      } catch (err) {
        showToast('Resident saved, but the first due could not be created: ' + err.message);
      }
    }

    setData(prev => ({
      ...prev,
      residents: [...prev.residents, newResident],
      dues: [...created, ...prev.dues]
    }));
    showToast(`Resident ${name} registered for unit ${apt}`);
  };

  const addDue = async ({ apt, amount, due }) => {
    requireLive();
    const [created] = await insertDues([{ apt, amount: Number(amount), due }]);
    setData(prev => ({ ...prev, dues: [created, ...prev.dues] }));
    showToast(`Maintenance due of ${fmt(amount)} recorded for unit ${apt}`);
  };

  const updateDue = async (id, { amount, due }) => {
    requireLive();
    const existing = data.dues.find(d => d.id === id);
    if (!existing) throw new Error('This due no longer exists.');
    if (existing.paid) throw new Error('A paid due cannot be edited. Undo the payment first.');
    const patch = { amount: Number(amount), due };

    let updated = { ...existing, ...patch };
    if (remote) {
      [updated] = expectRows(check(await remote.from('dues').update(patch).eq('id', id).select()), 'The due was not updated.');
    }
    setData(prev => ({ ...prev, dues: prev.dues.map(d => (d.id === id ? updated : d)) }));
    showToast('Due updated');
  };

  const setPaidState = async (id, patch) => {
    requireLive();
    let updated;
    if (remote) {
      [updated] = expectRows(
        check(await remote.from('dues').update(patch).eq('id', id).select()),
        'The payment was not saved.'
      );
    } else {
      updated = { ...data.dues.find(d => d.id === id), ...patch };
    }
    setData(prev => ({ ...prev, dues: prev.dues.map(d => (d.id === id ? updated : d)) }));
    return updated;
  };

  // Records a payment. Residents can only pay their own unit's dues. Returns the updated due or null.
  const markPaid = async (id) => {
    try {
      const due = data.dues.find(d => d.id === id);
      if (!due) throw new Error('This due no longer exists.');
      if (session?.role === 'tenant' && session.apt !== due.apt) {
        throw new Error('You can only pay dues for your own unit.');
      }
      const updated = await setPaidState(id, { paid: todayISO(), rcpt: rcptFor(id) });
      showToast(`Payment recorded. Receipt ${updated.rcpt}`);
      return updated;
    } catch (err) {
      showToast('Payment failed: ' + err.message);
      return null;
    }
  };

  const markUnpaid = async (id) => {
    try {
      if (!isAdmin) throw new Error('Only the admin can undo a payment.');
      await setPaidState(id, { paid: null, rcpt: null });
      showToast('Payment reverted to unpaid');
      return true;
    } catch (err) {
      showToast('Could not revert payment: ' + err.message);
      return false;
    }
  };

  const deleteDue = async (id) => {
    try {
      requireLive();
      if (remote) {
        expectRows(check(await remote.from('dues').delete().eq('id', id).select()), 'The due was not deleted.');
      }
      setData(prev => ({ ...prev, dues: prev.dues.filter(d => d.id !== id) }));
      showToast('Due deleted');
      return true;
    } catch (err) {
      showToast('Delete failed: ' + err.message);
      return false;
    }
  };

  const deleteResident = async (id) => {
    try {
      requireLive();
      if (remote) {
        expectRows(check(await remote.from('residents').delete().eq('id', id).select()), 'The resident was not deleted.');
      }
      setData(prev => ({ ...prev, residents: prev.residents.filter(r => r.id !== id) }));
      showToast('Resident removed');
      return true;
    } catch (err) {
      showToast('Delete failed: ' + err.message);
      return false;
    }
  };

  // Deleting a unit also deletes its payment history.
  const deleteApt = async (id) => {
    try {
      requireLive();
      if (data.residents.some(r => r.apt === id)) {
        throw new Error('Remove the resident from this unit first.');
      }
      if (remote) {
        check(await remote.from('dues').delete().eq('apt', id).select());
        expectRows(check(await remote.from('apartments').delete().eq('id', id).select()), 'The unit was not deleted.');
      }
      setData(prev => ({
        ...prev,
        apts: prev.apts.filter(a => a.id !== id),
        dues: prev.dues.filter(d => d.apt !== id)
      }));
      showToast(`Unit ${id} deleted`);
      return true;
    } catch (err) {
      showToast('Delete failed: ' + err.message);
      return false;
    }
  };

  // Demo mode only: the live database is never wiped from the UI.
  const resetData = () => {
    if (remote) return;
    setData(getInitialSeed());
    showToast('Demo data reset successfully.');
  };

  const viewTenantHistory = (apt) => {
    setSelectedHistoryApt(apt);
    setActiveTab('Tenant History');
  };

  return (
    <MaintenanceContext.Provider
      value={{
        data,
        isLoading,
        isLiveConnected,
        isSupabaseConfigured,
        loadError,
        fetchSupabaseData,
        session,
        isAdmin,
        isAuthenticated,
        login,
        loginTenant,
        logout,
        theme,
        toggleTheme,
        activeTab,
        setActiveTab,
        selectedHistoryApt,
        setSelectedHistoryApt,
        viewTenantHistory,
        getResident,
        getResidentName,
        addResident,
        addApt,
        addDue,
        updateDue,
        markPaid,
        markUnpaid,
        deleteDue,
        deleteResident,
        deleteApt,
        generateMonthlyDues,
        resetData,
        showToast,
        toasts
      }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenance = () => {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error('useMaintenance must be used within MaintenanceProvider');
  }
  return context;
};
