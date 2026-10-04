import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowDownLeft, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight,
  Bell, BriefcaseBusiness, CalendarDays, Check, ChevronDown, ChevronLeft,
  ChevronRight, CircleHelp, Coffee, CreditCard, Download, Ellipsis,
  FileChartColumnIncreasing, Heart, LayoutDashboard, Leaf, Menu, Pencil,
  Plus, Search, Settings, ShieldCheck, ShoppingBag, SlidersHorizontal,
  Smartphone, Sparkles, Tag, Trash2, TrendingUp, Utensils, Wallet,
  X, Zap, Car, Film, ArrowLeftRight, CircleAlert,
} from 'lucide-react';
import {
  CATEGORIES, WALLETS, formatCurrency, formatCompactCurrency, toISODate,
  makeDemoTransactions, sortTransactions, getTotals, getWalletBalance,
  getMonthlySeries, getCategoryBreakdown, validateTransaction,
} from './finance.js';

const STORAGE_KEY = 'arus-transactions-v1';
const PROFILE_KEY = 'arus-profile-v1';
const NAV_ITEMS = [
  { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transaksi', icon: ArrowLeftRight },
  { id: 'wallets', label: 'Dompet saya', icon: Wallet },
  { id: 'reports', label: 'Laporan', icon: FileChartColumnIncreasing },
];
const CATEGORY_ICONS = {
  salary: BriefcaseBusiness, freelance: Sparkles, investment: TrendingUp,
  'other-income': ArrowDownLeft, food: Utensils, shopping: ShoppingBag,
  transport: Car, bills: Zap, entertainment: Film, health: Heart,
  'other-expense': Tag,
};
const WALLET_ICONS = { bank: CreditCard, cash: Wallet, ewallet: Smartphone };
const dateFormatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const monthFormatter = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' });
const getDate = (iso) => new Date(`${iso}T12:00:00`);
const getCategory = (id) => CATEGORIES.find((category) => category.id === id);

function loadTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { transactions: makeDemoTransactions(), warning: '' };
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.some((item) => !item || typeof item.id !== 'string' || Object.keys(validateTransaction(item)).length || typeof item.amount !== 'number') || new Set(parsed.map((item) => item.id)).size !== parsed.length) {
      throw new Error('Invalid saved transactions');
    }
    return { transactions: sortTransactions(parsed), warning: '' };
  } catch {
    return { transactions: makeDemoTransactions(), warning: 'Data lokal tidak dapat dibaca. Data contoh ditampilkan; data lama tidak akan ditimpa sampai kamu menyimpan perubahan.' };
  }
}

function loadName() {
  try { return localStorage.getItem(PROFILE_KEY)?.trim() || 'Alex Morgan'; }
  catch { return 'Alex Morgan'; }
}

function Modal({ title, subtitle, onClose, children, className = '' }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = dialogRef.current;
    const focusable = () => [...dialog.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')].filter((el) => !el.disabled && el.getClientRects().length);
    (dialog.querySelector('[data-autofocus]') || focusable()[0])?.focus();
    function onKeyDown(event) {
      if (event.key === 'Escape') closeRef.current();
      if (event.key === 'Tab') {
        const elements = focusable();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`modal ${className}`}>
        <div className="modal-heading"><div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" aria-label="Tutup dialog" onClick={onClose}><X size={20} /></button></div>
        {children}
      </section>
    </div>
  );
}

function TransactionForm({ transaction, onClose, onSave }) {
  const [values, setValues] = useState(transaction || {
    title: '', amount: '', type: 'expense', category: 'food', wallet: 'bank', date: toISODate(new Date()), note: '',
  });
  const [errors, setErrors] = useState({});
  function update(field, value) {
    setValues((old) => ({ ...old, [field]: value }));
    setErrors((old) => ({ ...old, [field]: undefined }));
  }
  function changeType(type) {
    setValues((old) => ({ ...old, type, category: type === 'income' ? 'salary' : 'food' }));
    setErrors({});
  }
  function submit(event) {
    event.preventDefault();
    const nextErrors = validateTransaction(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSave({ ...values, title: values.title.trim(), amount: Number(values.amount), note: values.note?.trim() || '', id: transaction?.id || crypto.randomUUID() });
  }
  const fieldProps = (field) => ({ 'aria-invalid': !!errors[field], 'aria-describedby': errors[field] ? `error-${field}` : undefined });
  const error = (field) => errors[field] && <span className="field-error" id={`error-${field}`}>{errors[field]}</span>;
  return (
    <Modal title={transaction ? 'Edit transaksi' : 'Catat transaksi baru'} subtitle="Langkah kecil untuk keuangan yang lebih teratur." onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="type-toggle" role="group" aria-label="Jenis transaksi">
          <button type="button" className={values.type === 'income' ? 'selected income' : ''} aria-pressed={values.type === 'income'} onClick={() => changeType('income')}><ArrowDownLeft size={18} /> Pemasukan</button>
          <button type="button" className={values.type === 'expense' ? 'selected expense' : ''} aria-pressed={values.type === 'expense'} onClick={() => changeType('expense')}><ArrowUpRight size={18} /> Pengeluaran</button>
        </div>
        <label className="field">Nama transaksi<input data-autofocus value={values.title} onChange={(event) => update('title', event.target.value)} placeholder="Contoh: Belanja mingguan" maxLength={80} {...fieldProps('title')} />{error('title')}</label>
        <label className="field">Nominal<div className="amount-input"><span>Rp</span><input type="number" inputMode="numeric" min="1" max="1000000000000" step="1" placeholder="0" value={values.amount} onChange={(event) => update('amount', event.target.value)} {...fieldProps('amount')} /></div>{error('amount')}</label>
        <div className="form-grid">
          <label className="field">Kategori<select value={values.category} onChange={(event) => update('category', event.target.value)} {...fieldProps('category')}>{CATEGORIES.filter((item) => item.type === values.type).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>{error('category')}</label>
          <label className="field">Dompet<select value={values.wallet} onChange={(event) => update('wallet', event.target.value)} {...fieldProps('wallet')}>{WALLETS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{error('wallet')}</label>
        </div>
        <label className="field">Tanggal<input type="date" value={values.date} onChange={(event) => update('date', event.target.value)} {...fieldProps('date')} />{error('date')}</label>
        <label className="field">Catatan <span className="optional">(opsional)</span><textarea rows={2} maxLength={400} value={values.note || ''} onChange={(event) => update('note', event.target.value)} placeholder="Tambahkan detail transaksi…" /></label>
        <div className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Batal</button><button type="submit" className="button button-primary"><Check size={17} />{transaction ? 'Simpan perubahan' : 'Simpan transaksi'}</button></div>
      </form>
    </Modal>
  );
}

function Sparkline({ values, color = '#198360' }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const points = values.map((value, index) => `${index * 17},${32 - ((value - min) / (max - min || 1)) * 26}`).join(' ');
  return <svg className="sparkline" width="88" height="38" viewBox="0 0 88 38" aria-hidden="true"><polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function MetricCard({ label, amount, icon: Icon, tone, children, values }) {
  return <article className={`metric-card ${tone}`}><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={18} strokeWidth={1.8} /></span></div><div className="metric-value">{formatCurrency(amount)}</div><div className="metric-bottom">{children}{values && <Sparkline values={values} color={tone === 'orange' ? '#eaa47c' : '#78b69f'} />}</div></article>;
}

function ChangeIndicator({ current, previous, expense = false }) {
  if (previous === 0) return <span className="metric-note">{current > 0 ? 'Aktivitas baru periode ini' : 'Belum ada aktivitas'}</span>;
  const percentage = (current - previous) / previous * 100;
  const good = expense ? percentage <= 0 : percentage >= 0;
  return <span className="comparison"><span className={`change ${good ? 'positive' : 'negative'}`}>{percentage >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}{Math.abs(percentage).toFixed(1).replace('.', ',')}%</span><span>dari bulan lalu</span></span>;
}

function smoothPath(points) {
  return points.reduce((path, point, index) => {
    if (!index) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const middle = (previous.x + point.x) / 2;
    return `${path} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  }, '');
}

function CashFlowChart({ transactions, referenceDate, net }) {
  const [months, setMonths] = useState(6);
  const [hovered, setHovered] = useState(null);
  const gradientId = useId().replaceAll(':', '');
  const series = getMonthlySeries(transactions, referenceDate, months);
  const maximum = Math.max(...series.flatMap((item) => [item.income, item.expense]), 1000000);
  const ceiling = Math.ceil(maximum / 4000000) * 4000000;
  const x = (index) => 48 + index * 600 / (series.length - 1);
  const y = (value) => 190 - value / ceiling * 158;
  const incomePoints = series.map((item, index) => ({ x: x(index), y: y(item.income) }));
  const expensePoints = series.map((item, index) => ({ x: x(index), y: y(item.expense) }));
  const incomePath = smoothPath(incomePoints);
  const active = hovered === null ? null : series[hovered];
  const tooltipX = hovered === null ? 0 : Math.min(Math.max(x(hovered) - 68, 52), 526);
  return (
    <section className="panel cashflow-panel">
      <div className="panel-heading"><div><h2>Arus kas <span className="heading-dot" /></h2><p>Cerita uang masuk dan uang keluarmu.</p></div><label className="small-select"><select aria-label="Rentang grafik arus kas" value={months} onChange={(event) => { setMonths(Number(event.target.value)); setHovered(null); }}><option value={6}>6 bulan terakhir</option><option value={12}>12 bulan terakhir</option></select><ChevronDown size={14} /></label></div>
      <div className="chart-legend"><span><i className="legend-dot green" />Pemasukan</span><span><i className="legend-dot peach" />Pengeluaran</span></div>
      <div className="line-chart">
        <svg viewBox="0 0 680 232" role="img" aria-label={`Grafik pemasukan dan pengeluaran ${months} bulan terakhir. ${series.map((item) => `${item.label}: masuk ${formatCurrency(item.income)}, keluar ${formatCurrency(item.expense)}`).join('; ')}`}>
          <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#31a577" stopOpacity="0.13" /><stop offset="100%" stopColor="#31a577" stopOpacity="0" /></linearGradient></defs>
          {[0, 1, 2, 3, 4].map((step) => <g key={step}><line x1="48" y1={y(ceiling * step / 4)} x2="648" y2={y(ceiling * step / 4)} stroke="#eef0ef" strokeDasharray="4 4" /><text x="0" y={y(ceiling * step / 4) + 4} className="axis-label">{formatCompactCurrency(ceiling * step / 4)}</text></g>)}
          <path d={`${incomePath} L 648 190 L 48 190 Z`} fill={`url(#${gradientId})`} />
          <path d={smoothPath(expensePoints)} fill="none" stroke="#e7b293" strokeWidth="2.5" strokeLinecap="round" />
          <path d={incomePath} fill="none" stroke="#268c68" strokeWidth="2.7" strokeLinecap="round" />
          {series.map((item, index) => <g key={item.month}><text x={x(index)} y="219" textAnchor="middle" className={`axis-label ${index === series.length - 1 ? 'current-month' : ''}`}>{item.label}</text><rect x={x(index) - 22} y="24" width="44" height="175" fill="transparent" tabIndex={0} role="button" aria-label={`${item.label}: pemasukan ${formatCurrency(item.income)}, pengeluaran ${formatCurrency(item.expense)}`} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(index)} onBlur={() => setHovered(null)} /></g>)}
          {active && <g pointerEvents="none"><line x1={x(hovered)} x2={x(hovered)} y1="24" y2="190" stroke="#b4cfc1" strokeDasharray="4 4" /><circle cx={x(hovered)} cy={y(active.income)} r="4" fill="#268c68" stroke="white" strokeWidth="2" /><circle cx={x(hovered)} cy={y(active.expense)} r="4" fill="#e7b293" stroke="white" strokeWidth="2" /><rect x={tooltipX} y="0" width="130" height="59" rx="8" fill="#253b33" /><text x={tooltipX + 10} y="16" fill="white" fontSize="10" fontWeight="600">{active.label}</text><text x={tooltipX + 10} y="33" fill="#c1ead8" fontSize="10">Masuk: {formatCurrency(active.income)}</text><text x={tooltipX + 10} y="48" fill="#f4cfb8" fontSize="10">Keluar: {formatCurrency(active.expense)}</text></g>}
        </svg>
      </div>
      <div className="chart-footer"><span><span className="tiny-icon"><TrendingUp size={15} /></span>{net >= 0 ? 'Surplus' : 'Defisit'} periode ini</span><strong className={net >= 0 ? 'text-green' : 'text-red'}>{net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(net))}</strong></div>
    </section>
  );
}

function SpendingChart({ transactions, onCategory }) {
  const breakdown = getCategoryBreakdown(transactions);
  const total = getTotals(transactions).expense;
  const displayed = breakdown.length > 4 ? [...breakdown.slice(0, 3), { id: 'other', label: 'Lainnya', color: '#d5ddd8', amount: breakdown.slice(3).reduce((sum, item) => sum + item.amount, 0), percentage: breakdown.slice(3).reduce((sum, item) => sum + item.percentage, 0) }] : breakdown;
  let offset = 0;
  const segments = displayed.map((item) => {
    const start = offset;
    offset += item.percentage;
    return `${item.color} ${start}% ${offset}%`;
  }).join(', ');
  return <section className="panel spending-panel"><div className="panel-heading"><div><h2>Ke mana uangmu?</h2><p>Pengeluaran berdasarkan kategori.</p></div><span className="subtle-icon"><ShoppingBag size={18} /></span></div><div className="donut-wrap"><div className="donut" style={{ background: total ? `conic-gradient(from -90deg, ${segments})` : '#edf1ee' }} role="img" aria-label={total ? displayed.map((item) => `${item.label} ${item.percentage.toFixed(1)} persen`).join(', ') : 'Belum ada pengeluaran'}><div className="donut-center"><span>Total pengeluaran</span><strong>{formatCompactCurrency(total)}</strong><span className="donut-caption">rupiah</span></div></div></div><div className="category-legend">{displayed.length ? displayed.map((item) => <button key={item.id} onClick={() => onCategory(item.id === 'other' ? 'all' : item.id)}><span><i className="legend-dot" style={{ background: item.color }} />{item.label}</span><strong>{item.percentage.toFixed(0)}<span>%</span></strong></button>) : <p className="muted empty-category">Belum ada pengeluaran.<br />Awal yang baik untuk menabung!</p>}</div></section>;
}

function TransactionsTable({ transactions, query, onQuery, type, onType, category, onCategory, wallet, onWallet, onEdit, onDelete, isOverview, onSeeAll, onAdd, periodLabel }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = isOverview ? 5 : 10;
  const searched = transactions.filter((item) => {
    const text = `${item.title} ${item.note || ''} ${getCategory(item.category)?.label || ''} ${WALLETS.find((w) => w.id === item.wallet)?.name || ''}`.toLocaleLowerCase('id-ID');
    return text.includes(query.toLocaleLowerCase('id-ID')) && (category === 'all' || item.category === category) && (wallet === 'all' || item.wallet === wallet);
  });
  const filtered = searched.filter((item) => type === 'all' || item.type === type);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = sortTransactions(filtered).slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const hasFilters = category !== 'all' || wallet !== 'all';
  useEffect(() => { setPage(1); }, [query, type, category, wallet, transactions, pageSize]);
  return <section className="panel transactions-panel">
    <div className="panel-heading"><div><h2>{isOverview ? 'Transaksi terbaru' : 'Semua transaksi'}<span className="count-badge">{transactions.length}</span></h2><p>{isOverview ? 'Semua aktivitas uangmu, dalam satu tempat.' : `Riwayat transaksi · ${periodLabel}`}</p></div>{isOverview && <button className="text-button" onClick={onSeeAll}>Lihat semua <ArrowRight size={15} /></button>}</div>
    <div className="table-toolbar"><div className="tabs" role="group" aria-label="Jenis transaksi yang ditampilkan">{[{ id: 'all', label: 'Semua' }, { id: 'income', label: 'Pemasukan' }, { id: 'expense', label: 'Pengeluaran' }].map((tab) => <button key={tab.id} className={type === tab.id ? 'active' : ''} aria-pressed={type === tab.id} onClick={() => onType(tab.id)}>{tab.label}<span>{tab.id === 'all' ? searched.length : searched.filter((item) => item.type === tab.id).length}</span></button>)}</div><div className="table-tools"><label className="table-search"><Search size={15} /><input placeholder="Cari transaksi…" aria-label="Cari transaksi" value={query} onChange={(event) => onQuery(event.target.value)} />{query && <button aria-label="Hapus pencarian" onClick={() => onQuery('')}><X size={13} /></button>}</label><button className={`button filter-button ${hasFilters ? 'has-filters' : ''}`} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={15} /><span>Filter</span>{hasFilters && <i />}</button></div></div>
    {filtersOpen && <div className="filter-bar"><label>Kategori<select value={category} onChange={(event) => onCategory(event.target.value)}><option value="all">Semua kategori</option>{CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>Dompet<select value={wallet} onChange={(event) => onWallet(event.target.value)}><option value="all">Semua dompet</option>{WALLETS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="text-button" onClick={() => { onCategory('all'); onWallet('all'); onType('all'); onQuery(''); }}>Reset filter <X size={13} /></button></div>}
    <div className="table-scroll"><table><thead><tr><th>Transaksi</th><th>Kategori</th><th>Tanggal</th><th>Dompet</th><th className="amount-cell">Nominal</th><th className="action-cell"><span className="sr-only">Aksi</span></th></tr></thead><tbody>{visible.map((item) => {
      const cat = getCategory(item.category);
      const Icon = CATEGORY_ICONS[item.category] || Tag;
      return <tr key={item.id}><td><button className="transaction-title" onClick={() => onEdit(item)}><span className={`transaction-icon ${item.type}`} style={{ '--category-color': cat?.color }}><Icon size={17} strokeWidth={1.8} /></span><span><strong>{item.title}</strong><small>{item.type === 'income' ? 'Uang masuk' : 'Uang keluar'}</small></span></button></td><td><span className="category-pill">{cat?.label}</span></td><td className="date-cell">{dateFormatter.format(getDate(item.date))}</td><td><span className="wallet-label"><span className={`wallet-dot ${item.wallet}`} />{WALLETS.find((w) => w.id === item.wallet)?.name}</span></td><td className={`amount-cell transaction-amount ${item.type}`}>{item.type === 'income' ? '+' : '−'}{formatCurrency(item.amount)}</td><td className="action-cell"><div className="row-actions"><button className="icon-button" aria-label={`Edit ${item.title}`} onClick={() => onEdit(item)}><Pencil size={14} /></button><button className="icon-button delete-button" aria-label={`Hapus ${item.title}`} onClick={() => onDelete(item)}><Trash2 size={14} /></button></div></td></tr>;
    })}</tbody></table></div>
    {!visible.length && <div className="empty-state"><span><Search size={26} /></span><h3>{transactions.length ? 'Transaksi tidak ditemukan' : 'Lembaran baru, cerita baru'}</h3><p>{transactions.length ? 'Coba kata kunci atau filter yang berbeda.' : 'Mulai catat pemasukan atau pengeluaran pertamamu.'}</p>{transactions.length ? <button className="text-button" onClick={() => { onQuery(''); onType('all'); onCategory('all'); onWallet('all'); }}>Hapus semua filter</button> : <button className="button button-primary" onClick={onAdd}><Plus size={16} />Catat transaksi</button>}</div>}
    <div className="table-footer"><span>{filtered.length ? `Menampilkan ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} dari ${filtered.length} transaksi` : '0 transaksi'}</span><div className="pagination"><button aria-label="Halaman sebelumnya" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button><span>{currentPage}<span> / {pages}</span></span><button aria-label="Halaman berikutnya" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button></div></div>
  </section>;
}

function WalletsView({ transactions, onWallet, onAdd }) {
  return <><div className="wallet-grid">{WALLETS.map((wallet) => {
    const Icon = WALLET_ICONS[wallet.id];
    const balance = getWalletBalance(transactions, wallet.id);
    const count = transactions.filter((item) => item.wallet === wallet.id).length;
    return <article className={`wallet-card wallet-${wallet.id}`} key={wallet.id}><div className="wallet-card-top"><span className="wallet-card-icon"><Icon size={24} /></span><span>{wallet.kind}</span></div><p>{wallet.name}</p><h2>{formatCurrency(balance)}</h2><div className="wallet-card-bottom"><span>{count} transaksi tercatat</span><button aria-label={`Lihat transaksi ${wallet.name}`} onClick={() => onWallet(wallet.id)}><ArrowUpRight size={20} /></button></div></article>;
  })}</div><section className="panel wallet-info"><span className="info-illustration"><ShieldCheck size={32} /></span><div><h2>Uangmu tercatat. Privasimu terjaga.</h2><p>Saldo dompet dihitung dari saldo awal dan seluruh riwayat transaksi. Data disimpan hanya di browser ini, tanpa koneksi ke rekening bank.</p><div className="opening-balances">{WALLETS.map((wallet) => <span key={wallet.id}>{wallet.name}: saldo awal <strong>{formatCurrency(wallet.openingBalance)}</strong></span>)}</div></div><button className="button button-primary" onClick={onAdd}><Plus size={17} />Tambah transaksi</button></section></>;
}

function SettingsModal({ name, onName, onClose, onReset, onRestore }) {
  const [draft, setDraft] = useState(name);
  return <Modal title="Sentuhan personal" subtitle="Buat Arus terasa lebih seperti milikmu." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); if (draft.trim()) onName(draft.trim()); }}><label className="field">Nama kamu<input data-autofocus value={draft} onChange={(event) => setDraft(event.target.value)} required maxLength={40} /></label><div className="settings-note"><ShieldCheck size={20} /><p>Arus adalah aplikasi frontend. Data hanya tersimpan di browser dan tidak dikirim ke server. Ekspor CSV secara berkala untuk membuat salinan.</p></div><div className="settings-data"><h3>Data transaksi</h3><p>Mulai dari nol atau jelajahi kembali dengan data contoh. Saldo awal dompet tetap dipertahankan.</p><div><button type="button" className="button button-secondary" onClick={onRestore}>Muat data contoh</button><button type="button" className="button button-danger" onClick={onReset}><Trash2 size={15} />Kosongkan transaksi</button></div></div><div className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Batal</button><button className="button button-primary" type="submit"><Check size={16} />Simpan nama</button></div></form></Modal>;
}

export default function App() {
  const [initialData] = useState(loadTransactions);
  const [transactions, setTransactions] = useState(initialData.transactions);
  const [storageWarning, setStorageWarning] = useState(initialData.warning);
  const [name, setName] = useState(loadName);
  const [view, setView] = useState('overview');
  const [period, setPeriod] = useState(toISODate(new Date()).slice(0, 7));
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [category, setCategory] = useState('all');
  const [walletFilter, setWalletFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const searchRef = useRef(null);
  const notificationRef = useRef(null);
  const toastTimer = useRef(null);
  const referenceDate = useMemo(() => period === 'all' ? new Date() : getDate(`${period}-01`), [period]);
  const scopedTransactions = useMemo(() => transactions.filter((item) => period === 'all' || item.date.startsWith(period)), [transactions, period]);
  const totals = getTotals(scopedTransactions);
  const allTotals = getTotals(transactions);
  const totalBalance = WALLETS.reduce((sum, w) => sum + w.openingBalance, 0) + allTotals.balance;
  const series = getMonthlySeries(transactions, referenceDate, 6);
  const previousMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
  const previousTotals = getTotals(transactions.filter((item) => item.date.startsWith(toISODate(previousMonth).slice(0, 7))));
  const savingRate = totals.income > 0 ? Math.max(0, totals.balance / totals.income * 100) : 0;
  const periodLabel = period === 'all' ? 'Semua waktu' : monthFormatter.format(referenceDate);
  const monthOptions = useMemo(() => {
    const months = new Set([toISODate(new Date()).slice(0, 7), ...transactions.map((item) => item.date.slice(0, 7))]);
    for (let i = 0; i < 12; i++) months.add(toISODate(new Date(new Date().getFullYear(), new Date().getMonth() - i, 1)).slice(0, 7));
    return [...months].sort().reverse();
  }, [transactions]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    function shortcut(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchRef.current?.focus(); }
      if (event.key === 'Escape') { setSidebarOpen(false); setNotificationsOpen(false); }
    }
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);
  useEffect(() => {
    if (!notificationsOpen) return;
    const dismiss = (event) => { if (!notificationRef.current?.contains(event.target)) setNotificationsOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [notificationsOpen]);

  function notify(message) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }
  function persist(next) {
    const sorted = sortTransactions(next);
    setTransactions(sorted);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted)); setStorageWarning(''); }
    catch { setStorageWarning('Penyimpanan browser tidak tersedia atau penuh. Perubahan hanya bertahan selama sesi ini. Ekspor CSV untuk menyimpan data.'); }
  }
  function navigate(nextView) { setView(nextView); setSidebarOpen(false); setNotificationsOpen(false); }
  function saveTransaction(item) {
    const existing = transactions.some((old) => old.id === item.id);
    persist(existing ? transactions.map((old) => old.id === item.id ? item : old) : [item, ...transactions]);
    setModal(null);
    if (period !== 'all' && !item.date.startsWith(period)) setPeriod(item.date.slice(0, 7));
    notify(existing ? 'Perubahan transaksi tersimpan.' : 'Transaksi berhasil dicatat. Satu langkah lebih teratur!');
  }
  function setProfile(next) {
    setName(next);
    try { localStorage.setItem(PROFILE_KEY, next); }
    catch { notify('Nama diperbarui untuk sesi ini; penyimpanan browser tidak tersedia.'); setModal(null); return; }
    setModal(null); notify('Nama berhasil diperbarui.');
  }
  function showCategory(id) { setCategory(id); setType('expense'); navigate('transactions'); }
  function exportCSV() {
    const selected = sortTransactions(scopedTransactions.filter((item) => view !== 'transactions' || ((type === 'all' || item.type === type) && (category === 'all' || item.category === category) && (walletFilter === 'all' || item.wallet === walletFilter) && `${item.title} ${item.note || ''} ${getCategory(item.category)?.label || ''} ${WALLETS.find((w) => w.id === item.wallet)?.name || ''}`.toLocaleLowerCase('id-ID').includes(query.toLocaleLowerCase('id-ID')))));
    if (!selected.length) { notify('Tidak ada transaksi untuk diekspor pada periode atau filter ini.'); return; }
    const escape = (value) => {
      const text = String(value ?? '');
      const safe = /^[=+@\-\t\r\n]/.test(text) ? `'${text}` : text;
      return `"${safe.replaceAll('"', '""')}"`;
    };
    const rows = [['Tanggal', 'Transaksi', 'Jenis', 'Kategori', 'Dompet', 'Nominal (IDR)', 'Catatan'], ...selected.map((item) => [item.date, item.title, item.type === 'income' ? 'Pemasukan' : 'Pengeluaran', getCategory(item.category)?.label, WALLETS.find((w) => w.id === item.wallet)?.name, item.amount, item.note])];
    const blob = new Blob(['\uFEFF' + rows.map((row) => row.map(escape).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `arus-transaksi-${period}.csv`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(`${selected.length} transaksi berhasil diekspor.`);
  }

  const pageTitles = {
    overview: ['Ringkasan keuangan', 'Kenali arus uangmu. Buat keputusan yang lebih baik.'],
    transactions: ['Setiap transaksi, tercatat.', 'Catat, cari, dan kelola seluruh aktivitas keuanganmu.'],
    wallets: ['Semua dompet, satu tempat.', 'Lihat posisi uangmu tanpa perlu berpindah-pindah.'],
    reports: ['Angka yang bercerita.', 'Pahami kebiasaanmu dan temukan ruang untuk bertumbuh.'],
  };
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const tableProps = { transactions: scopedTransactions, query, onQuery: setQuery, type, onType: setType, category, onCategory: setCategory, wallet: walletFilter, onWallet: setWalletFilter, onEdit: (item) => setModal({ kind: 'transaction', transaction: item }), onDelete: (item) => setModal({ kind: 'delete', transaction: item }), onAdd: () => setModal({ kind: 'transaction' }), periodLabel };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Langsung ke konten</a>
      {sidebarOpen && <button className="sidebar-overlay" aria-label="Tutup navigasi" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); navigate('overview'); }} aria-label="Arus, kembali ke ringkasan"><span className="brand-mark"><ArrowUpRight size={25} strokeWidth={2.5} /><span /></span><span>arus<span className="brand-period">.</span></span></a>
        <div className="workspace"><span className="workspace-avatar"><Leaf size={18} /></span><div><strong>Keuangan pribadi</strong><span>Ruang untuk bertumbuh</span></div><span className="workspace-status" /></div>
        <span className="nav-label">RUANG KERJA</span>
        <nav aria-label="Navigasi utama">{NAV_ITEMS.map((item) => <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} aria-current={view === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><item.icon size={19} strokeWidth={1.8} /><span>{item.label}</span>{item.id === 'transactions' && <span className="nav-count">{transactions.length}</span>}{view === item.id && <span className="active-indicator" />}</button>)}</nav>
        <div className="sidebar-bottom"><div className="sidebar-promo"><span className="promo-icon"><Sparkles size={20} /></span><div className="promo-art" aria-hidden="true"><i /><i /><i /></div><h3>Kebiasaan kecil.<br />Dampak besar.</h3><p>Keuangan yang sehat dimulai dari satu catatan.</p><button onClick={() => setModal({ kind: 'transaction' })}>Mulai catat <ArrowUpRight size={16} /></button></div><button className="nav-item utility-nav" onClick={() => setModal({ kind: 'help' })}><CircleHelp size={18} />Panduan singkat<ArrowUpRight size={14} /></button><button className="nav-item utility-nav" onClick={() => setModal({ kind: 'settings' })}><Settings size={18} />Pengaturan</button><div className="sidebar-profile"><span className="avatar">{initials}</span><div><strong>{name}</strong><span>Akun personal</span></div><button className="icon-button" aria-label="Pengaturan profil" onClick={() => setModal({ kind: 'settings' })}><Ellipsis size={18} /></button></div></div>
      </aside>
      <div className="workspace-main">
        <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Buka navigasi" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={21} /></button><div className="breadcrumb"><span>Ruang kerja</span><ChevronRight size={13} /><strong>{NAV_ITEMS.find((item) => item.id === view)?.label}</strong></div></div><div className="topbar-right"><label className="global-search"><Search size={16} /><input ref={searchRef} aria-label="Cari transaksi di dashboard" placeholder="Cari sesuatu…" value={query} onChange={(event) => { setQuery(event.target.value); if (view !== 'overview' && view !== 'transactions') setView('transactions'); }} /><kbd>⌘ K</kbd></label><span className="topbar-divider" /><div className="notification-wrap" ref={notificationRef}><button className={`icon-button notification-button ${notificationsOpen ? 'selected' : ''}`} aria-label="Lihat insight keuangan" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={19} /><i /></button>{notificationsOpen && <div className="notification-popover"><span className="notification-icon"><Sparkles size={20} /></span><h3>Sedikit kabar baik ✨</h3><p>{totals.balance >= 0 ? `Arus kasmu positif sebesar ${formatCurrency(totals.balance)} pada periode ini. Pertahankan kebiasaan baikmu!` : `Pengeluaran melebihi pemasukan sebesar ${formatCurrency(Math.abs(totals.balance))}. Cek kategori pengeluaran untuk menemukan yang bisa dihemat.`}</p><small><ShieldCheck size={12} />Insight dari data di browsermu</small></div>}</div><button className="topbar-avatar avatar" aria-label="Edit profil" onClick={() => setModal({ kind: 'settings' })}>{initials}</button></div></header>
        <main id="main-content" className="main-content">
          <div className="greeting"><span><span className="greeting-dot" />HALO, {name.split(' ')[0].toUpperCase()}</span><span className="today">{new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</span></div>
          <div className="page-heading"><div><h1>{pageTitles[view][0]}<span className="title-dot">.</span></h1><p>{pageTitles[view][1]}</p></div><button className="button button-primary add-button" onClick={() => setModal({ kind: 'transaction' })}><Plus size={18} />Tambah transaksi</button></div>
          {storageWarning && <div className="storage-warning" role="alert"><CircleAlert size={18} /><span>{storageWarning}</span></div>}
          <div className="dashboard-toolbar"><div className="period-controls"><span className="period-label">{view === 'wallets' ? 'Saldo seluruh waktu' : 'Periode'}</span>{view !== 'wallets' && <label className="period-select"><CalendarDays size={15} /><select aria-label="Pilih periode transaksi" value={period} onChange={(event) => setPeriod(event.target.value)}>{monthOptions.map((month) => <option key={month} value={month}>{monthFormatter.format(getDate(`${month}-01`))}</option>)}<option value="all">Semua waktu</option></select><ChevronDown size={13} /></label>}<span className="live-badge"><i />Disimpan di perangkatmu</span></div><button className="button export-button" onClick={exportCSV}><ArrowDownToLine size={15} />Ekspor CSV</button></div>
          {view !== 'wallets' && <div className="metrics-grid"><MetricCard label="Total saldo" amount={totalBalance} icon={Wallet} tone="green" values={series.map((item) => item.income - item.expense)}><span className="metric-note"><i className="small-green-dot" />Tersebar di 3 dompet</span></MetricCard><MetricCard label="Pemasukan" amount={totals.income} icon={ArrowDownLeft} tone="mint" values={series.map((item) => item.income)}>{period !== 'all' ? <ChangeIndicator current={totals.income} previous={previousTotals.income} /> : <span className="metric-note">Seluruh pemasukan tercatat</span>}</MetricCard><MetricCard label="Pengeluaran" amount={totals.expense} icon={ArrowUpRight} tone="orange" values={series.map((item) => item.expense)}>{period !== 'all' ? <ChangeIndicator current={totals.expense} previous={previousTotals.expense} expense /> : <span className="metric-note">Seluruh pengeluaran tercatat</span>}</MetricCard><MetricCard label="Sisa uang" amount={totals.balance} icon={Leaf} tone="purple"><span className="comparison"><span className="saving-badge">{savingRate.toFixed(0)}%</span><span>dari pemasukan</span></span><div className="mini-progress"><span style={{ width: `${Math.min(savingRate, 100)}%` }} /></div></MetricCard></div>}
          {(view === 'overview' || view === 'reports') && <div className="charts-grid"><CashFlowChart transactions={transactions} referenceDate={referenceDate} net={totals.balance} /><SpendingChart transactions={scopedTransactions} onCategory={showCategory} /></div>}
          {view === 'reports' && <section className="insight-card"><span className="insight-icon"><Leaf size={24} /></span><div><span className="eyebrow">CATATAN UNTUKMU</span><h3>{totals.balance >= 0 ? 'Ada ruang untuk mimpi berikutnya.' : 'Saatnya menata ulang prioritas.'}</h3><p>{totals.income > 0 ? `Kamu menyisihkan ${savingRate.toFixed(0)}% dari pemasukan pada periode ini. ` : 'Belum ada pemasukan pada periode ini. '}{totals.balance >= 0 ? 'Terus catat transaksi agar kebiasaan baikmu tetap terlihat.' : 'Mulai dari pengeluaran terbesar, lalu cari yang bisa dikurangi.'}</p></div><span className="insight-decoration" aria-hidden="true"><Sparkles size={40} /></span></section>}
          {(view === 'overview' || view === 'transactions') && <TransactionsTable {...tableProps} isOverview={view === 'overview'} onSeeAll={() => navigate('transactions')} />}
          {view === 'wallets' && <WalletsView transactions={transactions} onAdd={() => setModal({ kind: 'transaction' })} onWallet={(id) => { setWalletFilter(id); setCategory('all'); setType('all'); setQuery(''); setPeriod('all'); navigate('transactions'); }} />}
          <footer className="page-footer"><span><span className="footer-brand">arus.</span> Sedikit lebih teratur, setiap hari.</span><span><ShieldCheck size={13} />Privat & tersimpan lokal<span className="footer-separator">·</span>Dibuat untukmu</span></footer>
        </main>
      </div>
      {modal?.kind === 'transaction' && <TransactionForm transaction={modal.transaction} onClose={() => setModal(null)} onSave={saveTransaction} />}
      {modal?.kind === 'delete' && <Modal title="Hapus transaksi ini?" subtitle="Transaksi yang dihapus tidak bisa dikembalikan." onClose={() => setModal(null)}><div className="delete-preview"><span className="delete-preview-icon"><Trash2 size={22} /></span><div><strong>{modal.transaction.title}</strong><p>{formatCurrency(modal.transaction.amount)} · {dateFormatter.format(getDate(modal.transaction.date))}</p></div></div><div className="modal-footer"><button className="button button-secondary" onClick={() => setModal(null)}>Batal</button><button className="button button-danger" onClick={() => { persist(transactions.filter((item) => item.id !== modal.transaction.id)); setModal(null); notify('Transaksi berhasil dihapus.'); }}>Ya, hapus transaksi</button></div></Modal>}
      {modal?.kind === 'settings' && <SettingsModal name={name} onName={setProfile} onClose={() => setModal(null)} onReset={() => setModal({ kind: 'reset' })} onRestore={() => setModal({ kind: 'restore' })} />}
      {(modal?.kind === 'reset' || modal?.kind === 'restore') && <Modal title={modal.kind === 'reset' ? 'Mulai dari lembaran kosong?' : 'Muat kembali data contoh?'} subtitle="Seluruh transaksi saat ini akan diganti. Ekspor CSV terlebih dahulu jika ingin menyimpan salinannya." onClose={() => setModal(null)}><div className="modal-footer"><button className="button button-secondary" onClick={() => setModal({ kind: 'settings' })}>Batal</button><button className={`button ${modal.kind === 'reset' ? 'button-danger' : 'button-primary'}`} onClick={() => { const reset = modal.kind === 'reset'; persist(reset ? [] : makeDemoTransactions()); setPeriod(toISODate(new Date()).slice(0, 7)); setQuery(''); setType('all'); setCategory('all'); setWalletFilter('all'); setModal(null); notify(reset ? 'Transaksi dikosongkan. Siap untuk awal baru.' : 'Data contoh berhasil dimuat.'); }}>{modal.kind === 'reset' ? 'Kosongkan transaksi' : 'Muat data contoh'}</button></div></Modal>}
      {modal?.kind === 'help' && <Modal title="Kenalan dengan Arus" subtitle="Keuangan sederhana, tanpa ribet." onClose={() => setModal(null)}><div className="help-steps">{[{ icon: Plus, title: 'Catat setiap arus', text: 'Tambahkan pemasukan atau pengeluaran. Pilih kategori, dompet, dan tanggalnya.' }, { icon: LayoutDashboard, title: 'Lihat gambaran besarnya', text: 'Pilih periode untuk melihat ringkasan, grafik, dan kategori pengeluaran. Total saldo selalu mencakup seluruh dompet.' }, { icon: Download, title: 'Simpan salinanmu', text: 'Ekspor transaksi ke CSV. Data tersimpan hanya di browser ini; menghapus data browser juga menghapus catatanmu.' }].map((step, index) => <div key={step.title}><span><step.icon size={20} /></span><div><h3>{index + 1}. {step.title}</h3><p>{step.text}</p></div></div>)}</div><div className="demo-note"><Coffee size={17} /><span>Kamu sedang memulai dengan data contoh. Kosongkan transaksi lewat Pengaturan untuk mencatat keuanganmu sendiri.</span></div><div className="modal-footer"><button className="button button-primary" onClick={() => setModal(null)}>Siap, mulai jelajahi <ArrowRight size={16} /></button></div></Modal>}
      <div className="toast-region" role="status" aria-live="polite">{toast && <div className="toast"><span><Check size={16} /></span>{toast}<button aria-label="Tutup pemberitahuan" onClick={() => setToast(null)}><X size={15} /></button></div>}</div>
    </div>
  );
}
