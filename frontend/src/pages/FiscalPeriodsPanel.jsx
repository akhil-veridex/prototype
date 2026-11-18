import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { authApi } from '../services/api';
import ModalClose from '../components/ModalClose';
import {
  Lock,
  Unlock,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Search,
  Download,
  FileText
} from 'lucide-react';

/**
 * Fiscal Periods - month-close gate modelled on Southlake's Period Closure screen.
 * A period is a calendar month that is Open or Closed. A close is Soft (can be reopened
 * with a reason) or Hard (permanent). Closing blocks journal posting for that month.
 */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const periodLabel = (y, m) => `${MONTHS[m - 1] || m} ${y}`;
const money = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
};
const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '-');

export default function FiscalPeriodsPanel() {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'ok' | 'err', text }
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Close / Reopen modal
  const [modal, setModal] = useState(null); // { mode: 'close' | 'reopen' }
  const [form, setForm] = useState({ period_year: '', period_month: '', close_type: 'soft', reason: '' });
  const [formError, setFormError] = useState('');

  // Period detail
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);

  const loadPeriods = useCallback(async () => {
    try {
      const res = await authApi.getPeriods();
      if (res.success) setPeriods(res.data);
    } catch (err) {
      setMsg({ type: 'err', text: err.message || 'Failed to load period closures' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPeriods(); }, [loadPeriods]);
  useEffect(() => {
    if (!detailId) { setDetail(null); return; }
    authApi.getPeriodDetail(detailId).then(res => res.success && setDetail(res.data)).catch(err => setMsg({ type: 'err', text: err.message }));
  }, [detailId, periods]);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const years = new Set(periods.map(p => p.period_year));
    for (let y = current + 1; y >= current - 5; y--) years.add(y);
    return Array.from(years).sort((a, b) => b - a);
  }, [periods]);

  const counts = useMemo(() => ({
    OPEN: periods.filter(p => p.status === 'OPEN').length,
    CLOSED: periods.filter(p => p.status === 'CLOSED').length
  }), [periods]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return periods
      .filter(p => statusFilter === 'ALL' || p.status === statusFilter)
      .filter(p => !term || periodLabel(p.period_year, p.period_month).toLowerCase().includes(term))
      .sort((a, b) => b.period_year - a.period_year || b.period_month - a.period_month);
  }, [periods, search, statusFilter]);

  function openClose(year = '', month = '') {
    setForm({ period_year: year, period_month: month, close_type: 'soft', reason: '' });
    setFormError('');
    setModal({ mode: 'close' });
  }
  function openReopen(p) {
    setForm({ period_year: p.period_year, period_month: p.period_month, close_type: 'soft', reason: '' });
    setFormError('');
    setModal({ mode: 'reopen' });
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.period_year || !form.period_month) { setFormError('Select a month and year.'); return; }
    if (modal.mode === 'reopen' && !form.reason.trim()) { setFormError('A reason is required to reopen a closed period'); return; }
    setBusy(true);
    setMsg(null);
    try {
      const res = modal.mode === 'reopen'
        ? await authApi.reopenPeriod(form.period_year, form.period_month, form.reason)
        : await authApi.closePeriod(form.period_year, form.period_month, form.close_type);
      setMsg({ type: 'ok', text: res.message });
      setModal(null);
      await loadPeriods();
    } catch (err) {
      setMsg({ type: 'err', text: err.message || (modal.mode === 'reopen' ? 'Failed to reopen period' : 'Failed to close period') });
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const header = ['Period', 'Status', 'Close Type', 'Closed By', 'Closed At', 'Journals'];
    const rows = visible.map(p => [
      periodLabel(p.period_year, p.period_month),
      p.status === 'CLOSED' ? 'Closed' : 'Open',
      p.close_type === 'hard' ? 'Hard' : p.close_type === 'soft' ? 'Soft' : '-',
      p.closed_by || '-',
      fmtDate(p.closed_at),
      p.journal_count
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fiscal-periods.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const inputCls = 'w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white';
  const btnPrimary = 'py-1.5 px-3 rounded-md text-[11px] font-semibold flex items-center space-x-1.5 whitespace-nowrap bg-brand-600 hover:bg-brand-500 text-white transition disabled:opacity-50';
  const btnGhost = 'py-1.5 px-3 rounded-md text-[11px] font-semibold flex items-center space-x-1.5 whitespace-nowrap border bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed';

  const banner = msg && (
    <div
      className={`p-3 rounded-lg text-xs flex items-center space-x-2 border ${msg.type === 'ok'
        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
        : 'bg-rose-950/40 border-rose-500/40 text-rose-400'}`}
      role="status"
    >
      {msg.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      <span>{msg.text}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {banner}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search here"
              aria-label="Search periods"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-56 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
            />
          </div>
          <div className="flex gap-2">
            {[['ALL', 'All'], ['OPEN', `${counts.OPEN} open`], ['CLOSED', `${counts.CLOSED} closed`]].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition ${statusFilter === key
                  ? 'bg-brand-500/10 text-brand-400 border-brand-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={exportCsv} className={btnGhost}><Download className="w-3.5 h-3.5" /><span>Export</span></button>
            <button onClick={() => openClose()} className={btnPrimary}><Lock className="w-3.5 h-3.5" /><span>Close Period</span></button>
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850 text-slate-400 uppercase font-mono tracking-wider">
              <tr>
                <th className="py-3 px-5">Period</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Close Type</th>
                <th className="py-3 px-5">Closed By</th>
                <th className="py-3 px-5">Closed At</th>
                <th className="py-3 px-5 text-right">Journals</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading ? (
                <tr><td colSpan="7" className="py-8 text-center text-slate-500">Loading periods...</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan="7" className="py-8 text-center text-slate-500 font-sans">No periods match your search.</td></tr>
              ) : visible.map(p => (
                <tr key={p._id} onClick={() => setDetailId(p._id)} className="hover:bg-slate-850/50 transition cursor-pointer">
                  <td className="py-3 px-5 font-semibold text-white">{periodLabel(p.period_year, p.period_month)}</td>
                  <td className="py-3 px-5">
                    <span className={`font-bold ${p.status === 'CLOSED' ? 'text-rose-500' : 'text-emerald-600'}`}>{p.status === 'CLOSED' ? 'Closed' : 'Open'}</span>
                  </td>
                  <td className="py-3 px-5">
                    {p.close_type === 'hard' ? <span className="font-semibold text-rose-500">Hard</span>
                      : p.close_type === 'soft' ? <span className="font-semibold text-slate-400">Soft</span>
                        : <span className="text-slate-500">-</span>}
                  </td>
                  <td className="py-3 px-5">{p.closed_by || '-'}</td>
                  <td className="py-3 px-5 font-mono text-[11px]">{fmtDate(p.closed_at)}</td>
                  <td className="py-3 px-5 text-right font-mono">{p.journal_count}</td>
                  <td className="py-3 px-5">
                    <div className="flex justify-end">
                      {p.status !== 'CLOSED' ? (
                        <button onClick={(e) => { e.stopPropagation(); openClose(p.period_year, p.period_month); }} className={btnGhost}>
                          <Lock className="w-3.5 h-3.5" /><span>Close</span>
                        </button>
                      ) : (
                        <button
                          disabled={p.close_type === 'hard'}
                          title={p.close_type === 'hard' ? 'Hard closed periods are permanent and cannot be reopened' : 'Reopen this period'}
                          onClick={(e) => { e.stopPropagation(); openReopen(p); }}
                          className={btnGhost}
                        >
                          <Unlock className="w-3.5 h-3.5" /><span>Reopen</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Period detail */}
      {detailId && detail && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto" onClick={() => setDetailId(null)}>
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl my-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <ModalClose onClick={() => setDetailId(null)} />
            <div className="pr-8">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-base font-bold text-white">{periodLabel(detail.period.period_year, detail.period.period_month)}</h3>
                <span className={`font-bold text-xs ${detail.period.status === 'CLOSED' ? 'text-rose-500' : 'text-emerald-600'}`}>{detail.period.status === 'CLOSED' ? 'Closed' : 'Open'}</span>
                {detail.period.close_type && <span className="text-xs text-slate-400">{detail.period.close_type === 'hard' ? 'Hard' : 'Soft'} close</span>}
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                {detail.period.start_date} to {detail.period.end_date} &middot; {detail.period.journal_count} journals &middot; Dr {money(detail.period.total_debits)} / Cr {money(detail.period.total_credits)}
              </p>
              {detail.period.closed_at && (
                <p className="text-xs text-slate-400 mt-1">
                  {detail.period.status === 'CLOSED' ? 'Closed' : 'Last closed'} by {detail.period.closed_by || '-'} on {fmtDateTime(detail.period.closed_at)}
                </p>
              )}
            </div>

            <section>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">Journals in this period ({detail.journals.length})</h4>
              {detail.journals.length === 0 ? (
                <p className="text-xs text-slate-500">No journals have been posted in this period.</p>
              ) : (
                <ul className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden text-xs">
                  {detail.journals.slice(0, 8).map(j => (
                    <li key={j._id} className="px-4 py-2 flex items-center gap-3">
                      <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-mono text-white w-28 shrink-0">{j.journal_number}</span>
                      <span className="text-slate-400 flex-1 truncate">{j.description}</span>
                      <span className="font-mono text-slate-300">{money(j.total_debits)}</span>
                    </li>
                  ))}
                  {detail.journals.length > 8 && <li className="px-4 py-2 text-slate-500">and {detail.journals.length - 8} more in the Journal Register</li>}
                </ul>
              )}
            </section>

            <section>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5"><CalendarCheck className="w-3.5 h-3.5" />Activity</h4>
              {detail.activity.length === 0 ? <p className="text-xs text-slate-500">No close or reopen activity.</p> : (
                <ul className="space-y-1.5 text-xs">
                  {detail.activity.slice(0, 12).map(a => (
                    <li key={a._id} className="flex flex-wrap gap-x-3 text-slate-400">
                      <span className="font-mono text-slate-500 w-36 shrink-0">{fmtDateTime(a.at)}</span>
                      <span className="text-slate-200">{a.description}</span>
                      <span>{a.user}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      {/* Close / Reopen */}
      {modal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <ModalClose onClick={() => setModal(null)} />
            <h3 className="text-base font-bold text-white mb-4 pr-8">{modal.mode === 'reopen' ? 'Reopen Accounting Period' : 'Close Accounting Period'}</h3>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="pc-month">Month *</label>
                  <select id="pc-month" disabled={modal.mode === 'reopen'} value={form.period_month} onChange={(e) => setForm({ ...form, period_month: e.target.value })} className={inputCls}>
                    <option value="" disabled>Select month</option>
                    {MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="pc-year">Year *</label>
                  <select id="pc-year" disabled={modal.mode === 'reopen'} value={form.period_year} onChange={(e) => setForm({ ...form, period_year: e.target.value })} className={inputCls}>
                    <option value="" disabled>Select year</option>
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {modal.mode === 'reopen' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="pc-reason">Reason *</label>
                  <textarea id="pc-reason" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Why is this closed period being reopened?" className={inputCls} />
                </div>
              ) : (
                <>
                  <fieldset>
                    <legend className="block text-xs font-medium text-slate-300 mb-1">Close Type *</legend>
                    <div className="flex gap-5">
                      {[['soft', 'Soft Close'], ['hard', 'Hard Close']].map(([val, label]) => (
                        <label key={val} className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                          <input type="radio" name="close_type" value={val} checked={form.close_type === val} onChange={() => setForm({ ...form, close_type: val })} />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                    {form.close_type === 'hard' ? (
                      <p className="text-[11px] text-rose-500 mt-2">Hard closed periods are permanent and can never be reopened. Use this only when the period is truly final.</p>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-2">Soft closed periods can be reopened later by any user who can close periods.</p>
                    )}
                  </fieldset>
                  <p className="text-[11px] text-slate-400">Closing this period blocks journal entries and GL posting for it.</p>
                </>
              )}

              {formError && <p className="text-xs text-rose-500">{formError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)} className={btnGhost}>Cancel</button>
                <button type="submit" disabled={busy} className={btnPrimary}>
                  {busy ? (modal.mode === 'reopen' ? 'Reopening...' : 'Closing...') : (modal.mode === 'reopen' ? 'Reopen Period' : 'Close Period')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
