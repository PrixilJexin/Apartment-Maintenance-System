import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  useMaintenance, fmt, dt, getStatus, daysPast, monthLabel, monthInfo
} from '../context/MaintenanceContext';
import { Modal } from './Modal';
import { ReceiptModal } from './ReceiptModal';
import { CheckCircle2, AlertTriangle, Clock, Receipt, PartyPopper, CalendarDays, Smartphone, Copy } from 'lucide-react';

// Where residents send maintenance payments. A UPI ID (e.g. name@okaxis, shown in the GPay profile)
// lets the app pre-fill the amount; without it residents pay the number manually.
const PAY_PHONE = import.meta.env.VITE_UPI_PHONE || '7845727093';
const PAY_UPI_ID = import.meta.env.VITE_UPI_ID || '';
const PAY_NAME = import.meta.env.VITE_UPI_NAME || 'Apartment Maintenance';

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const upiLink = (due) => {
  const params = new URLSearchParams({
    pa: PAY_UPI_ID,
    pn: PAY_NAME,
    am: String(due.amount),
    cu: 'INR',
    tn: `Maintenance ${due.apt} ${monthLabel(due.due.slice(0, 7))}`
  });
  return `upi://pay?${params.toString().replace(/\+/g, '%20')}`;
};

const dueText = (due) => {
  const d = daysPast(due.due);
  if (d > 0) return `Overdue by ${d} day${d > 1 ? 's' : ''}`;
  if (d === 0) return 'Due today';
  return `Due in ${-d} day${d < -1 ? 's' : ''}`;
};

// Desktop browsers can't open UPI apps, so show a QR code to scan with GPay on a phone.
const UpiQr = ({ link }) => {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(link, { width: 220, margin: 1 })
      .then(url => { if (!cancelled) setSrc(url); })
      .catch(() => { if (!cancelled) setSrc(''); });
    return () => { cancelled = true; };
  }, [link]);
  if (!src) return null;
  return (
    <div style={{ textAlign: 'center' }}>
      <img
        src={src}
        alt="UPI payment QR code"
        width={220}
        height={220}
        style={{ background: '#fff', padding: '8px', borderRadius: '12px', border: '1px solid var(--border)' }}
      />
      <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', margin: '8px 0 0' }}>
        Scan with <b>Google Pay</b> (or any UPI app) on your phone
      </p>
    </div>
  );
};

export const TenantPortal = () => {
  const { session, data, getResident, markPaid, showToast } = useMaintenance();
  const [confirmDue, setConfirmDue] = useState(null);
  const [receiptDue, setReceiptDue] = useState(null);
  const [saving, setSaving] = useState(false);

  const resident = getResident(session.apt);
  const myDues = data.dues
    .filter(d => d.apt === session.apt)
    .sort((a, b) => b.due.localeCompare(a.due));
  const unpaid = myDues.filter(d => !d.paid).sort((a, b) => a.due.localeCompare(b.due));
  const paid = myDues.filter(d => d.paid);
  const totalDue = unpaid.reduce((s, d) => s + d.amount, 0);
  const anyOverdue = unpaid.some(d => getStatus(d) === 'Overdue');
  const nextBill = monthInfo(1).due;

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(PAY_PHONE);
      showToast('Number copied. Paste it in GPay.');
    } catch {
      showToast(`GPay number: ${PAY_PHONE}`);
    }
  };

  const handleConfirm = async () => {
    setSaving(true);
    const updated = await markPaid(confirmDue.id);
    setSaving(false);
    setConfirmDue(null);
    if (updated) setReceiptDue(updated);
  };

  const tone = unpaid.length === 0 ? 'ok' : anyOverdue ? 'bad' : 'warn';

  return (
    <div>
      <div className="card-header">
        <div>
          <h2>Hello, {resident?.name || 'Resident'}</h2>
          <span style={{ color: 'var(--ink-muted)', fontSize: '14px' }}>
            Unit {session.apt} · {resident?.type === 'owner' ? 'Owner Resident' : 'Tenant'}
          </span>
        </div>
      </div>

      <div className="card" style={{
        background: `var(--${tone}-bg)`,
        borderColor: `var(--${tone}-border)`,
        padding: '24px'
      }}>
        {unpaid.length === 0 ? (
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <PartyPopper size={34} color="var(--ok)" />
            <div>
              <h3 style={{ color: 'var(--ok)' }}>You&apos;re all paid up!</h3>
              <span style={{ fontSize: '14px', color: 'var(--ink-secondary)' }}>
                Nothing is pending. Your next bill ({monthLabel(nextBill.slice(0, 7))}) will appear here
                automatically and is due on <b>{dt(nextBill)}</b>.
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              {anyOverdue ? <AlertTriangle size={34} color="var(--bad)" /> : <Clock size={34} color="var(--warn)" />}
              <div>
                <span style={{ fontSize: '13px', color: 'var(--ink-secondary)', fontWeight: 600 }}>
                  {anyOverdue ? 'Overdue amount to pay' : 'Amount to pay'}
                </span>
                <div style={{ fontSize: '32px', fontWeight: 800, color: `var(--${tone})`, lineHeight: 1.1 }}>
                  {fmt(totalDue)}
                </div>
                <span style={{ fontSize: '13px', color: 'var(--ink-secondary)' }}>
                  {unpaid.length === 1
                    ? <>Due by <b>{dt(unpaid[0].due)}</b> · {dueText(unpaid[0])}</>
                    : <>{unpaid.length} months unpaid · oldest due <b>{dt(unpaid[0].due)}</b></>}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {unpaid.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px 4px' }}>
            <h3 style={{ fontSize: '15px' }}>Payments Due</h3>
            <span style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>
              Tap &quot;Pay Now&quot; to pay through Google Pay and get your receipt.
            </span>
          </div>
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {unpaid.map(d => {
                  const status = getStatus(d);
                  return (
                    <tr key={d.id}>
                      <td><b>{monthLabel(d.due.slice(0, 7))}</b></td>
                      <td style={{ fontWeight: 800 }}>{fmt(d.amount)}</td>
                      <td>{dt(d.due)}</td>
                      <td><span className={`pill ${status}`}>{dueText(d)}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-success btn-sm" onClick={() => setConfirmDue(d)}>
                          <CheckCircle2 size={14} />
                          <span>Pay Now</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarDays size={16} color="var(--accent)" />
          <h3 style={{ fontSize: '15px' }}>Payment History</h3>
        </div>
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Amount</th>
                <th>Paid On</th>
                <th style={{ textAlign: 'right' }}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {paid.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '28px', color: 'var(--ink-muted)' }}>
                    No payments recorded yet.
                  </td>
                </tr>
              ) : paid.map(d => (
                <tr key={d.id}>
                  <td><b>{monthLabel(d.due.slice(0, 7))}</b></td>
                  <td style={{ fontWeight: 700, color: 'var(--ok)' }}>{fmt(d.amount)}</td>
                  <td>{dt(d.paid)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setReceiptDue(d)} style={{ fontSize: '12px' }}>
                      <Receipt size={13} />
                      <span>{d.rcpt}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={Boolean(confirmDue)} onClose={() => !saving && setConfirmDue(null)} title="Pay Maintenance">
        {confirmDue && (
          <div>
            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>
                {monthLabel(confirmDue.due.slice(0, 7))} · Unit {confirmDue.apt}
              </span>
              <div style={{ fontSize: '30px', fontWeight: 800 }}>{fmt(confirmDue.amount)}</div>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginBottom: '6px' }}>
              <b>Step 1.</b> Pay to the building&apos;s GPay number:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
              <b style={{ fontSize: '18px', letterSpacing: '0.04em' }}>{PAY_PHONE}</b>
              <button className="btn btn-outline btn-sm" onClick={copyNumber}>
                <Copy size={13} /> <span>Copy</span>
              </button>
            </div>

            {PAY_UPI_ID ? (
              isMobile ? (
                <a
                  className="btn btn-primary"
                  href={upiLink(confirmDue)}
                  style={{ width: '100%', justifyContent: 'center', padding: '10px', textDecoration: 'none' }}
                >
                  <Smartphone size={16} />
                  <span>Open Google Pay · {fmt(confirmDue.amount)}</span>
                </a>
              ) : (
                <UpiQr link={upiLink(confirmDue)} />
              )
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--ink-muted)', margin: 0 }}>
                Open Google Pay, choose &quot;Pay phone number&quot; and enter the number above with the amount shown.
              </p>
            )}

            <div style={{ fontSize: '13px', color: 'var(--ink-secondary)', margin: '18px 0 8px' }}>
              <b>Step 2.</b> Once GPay shows the payment as successful, confirm here:
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDue(null)} disabled={saving}>
                Not yet
              </button>
              <button className="btn btn-success btn-sm" onClick={handleConfirm} disabled={saving}>
                {saving ? 'Saving…' : 'I’ve completed the payment'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ReceiptModal dueItem={receiptDue} isOpen={Boolean(receiptDue)} onClose={() => setReceiptDue(null)} />
    </div>
  );
};
