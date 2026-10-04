export const CATEGORIES = [
  { id: 'salary', label: 'Gaji', type: 'income', color: '#059669' },
  { id: 'freelance', label: 'Freelance', type: 'income', color: '#10B981' },
  { id: 'investment', label: 'Investasi', type: 'income', color: '#047857' },
  { id: 'other-income', label: 'Pemasukan lain', type: 'income', color: '#34D399' },
  { id: 'food', label: 'Makanan & minuman', type: 'expense', color: '#F97316' },
  { id: 'shopping', label: 'Belanja', type: 'expense', color: '#8B5CF6' },
  { id: 'transport', label: 'Transportasi', type: 'expense', color: '#3B82F6' },
  { id: 'bills', label: 'Tagihan', type: 'expense', color: '#F43F5E' },
  { id: 'entertainment', label: 'Hiburan', type: 'expense', color: '#A855F7' },
  { id: 'health', label: 'Kesehatan', type: 'expense', color: '#FB7185' },
  { id: 'other-expense', label: 'Pengeluaran lain', type: 'expense', color: '#FB923C' },
];

export const WALLETS = [
  { id: 'bank', name: 'Rekening utama', kind: 'Bank', color: '#059669', openingBalance: 12500000 },
  { id: 'cash', name: 'Uang tunai', kind: 'Tunai', color: '#F97316', openingBalance: 1000000 },
  { id: 'ewallet', name: 'Dompet digital', kind: 'E-wallet', color: '#8B5CF6', openingBalance: 500000 },
];

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const compactNumberFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 1,
});
const monthFormatter = new Intl.DateTimeFormat('id-ID', { month: 'short' });

export function formatCurrency(number) {
  return currencyFormatter.format(number);
}

export function formatCompactCurrency(number) {
  const units = [
    [1000000000000, 'triliun'],
    [1000000000, 'miliar'],
    [1000000, 'jt'],
    [1000, 'rb'],
  ];
  const unit = units.find(([divisor]) => Math.abs(number) >= divisor);
  return unit
    ? `${compactNumberFormatter.format(number / unit[0])} ${unit[1]}`
    : compactNumberFormatter.format(number);
}

export function toISODate(date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysInMonth(year, month) {
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function monthStart(referenceDate, offset) {
  const date = new Date(referenceDate.getTime());
  // Reset the day before shifting months to avoid overflow from dates like January 31.
  date.setDate(1);
  date.setHours(12, 0, 0, 0);
  date.setMonth(date.getMonth() + offset);
  return date;
}

export function sortTransactions(transactions) {
  return [...transactions].sort((a, b) => b.date.localeCompare(a.date));
}

export function getTotals(transactions) {
  let income = 0;
  let expense = 0;
  for (const transaction of transactions) {
    if (transaction.type === 'income') income += transaction.amount;
    if (transaction.type === 'expense') expense += transaction.amount;
  }
  return { income, expense, balance: income - expense };
}

export function getWalletBalance(transactions, walletId) {
  const wallet = WALLETS.find(({ id }) => id === walletId);
  if (!wallet) return 0;
  const totals = getTotals(transactions.filter(({ wallet: id }) => id === walletId));
  return wallet.openingBalance + totals.balance;
}

export function getMonthlySeries(transactions, referenceDate = new Date(), count = 6) {
  if (!Number.isSafeInteger(count) || count <= 0) return [];

  const totalsByMonth = new Map();
  for (const transaction of transactions) {
    const month = transaction.date.slice(0, 7);
    if (!totalsByMonth.has(month)) totalsByMonth.set(month, { income: 0, expense: 0 });
    const totals = totalsByMonth.get(month);
    if (transaction.type === 'income') totals.income += transaction.amount;
    if (transaction.type === 'expense') totals.expense += transaction.amount;
  }

  return Array.from({ length: count }, (_, index) => {
    const date = monthStart(referenceDate, index - count + 1);
    const month = toISODate(date).slice(0, 7);
    const totals = totalsByMonth.get(month) ?? { income: 0, expense: 0 };
    return { label: monthFormatter.format(date), month, ...totals };
  });
}

export function getCategoryBreakdown(transactions) {
  const amounts = new Map();
  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue;
    amounts.set(transaction.category, (amounts.get(transaction.category) ?? 0) + transaction.amount);
  }

  const categories = CATEGORIES
    .filter(({ id, type }) => type === 'expense' && (amounts.get(id) ?? 0) > 0)
    .map(({ id, label, color }) => ({ id, label, color, amount: amounts.get(id) }));
  const total = categories.reduce((sum, { amount }) => sum + amount, 0);
  return categories
    .map((category) => ({ ...category, percentage: total === 0 ? 0 : category.amount / total * 100 }))
    .sort((a, b) => b.amount - a.amount);
}

export function validateTransaction(values = {}) {
  const errors = {};
  const title = typeof values?.title === 'string' ? values.title.trim() : '';
  if (title.length < 2 || title.length > 80) {
    errors.title = 'Judul harus berisi 2–80 karakter.';
  }

  const rawAmount = values?.amount;
  const amount = typeof rawAmount === 'number' || typeof rawAmount === 'string'
    ? Number(rawAmount)
    : NaN;
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1000000000000) {
    errors.amount = 'Nominal harus berupa bilangan bulat positif, maksimal Rp1 triliun.';
  }

  if (values?.type !== 'income' && values?.type !== 'expense') {
    errors.type = 'Pilih jenis pemasukan atau pengeluaran.';
  }
  if (!CATEGORIES.some(({ id, type }) => id === values?.category && type === values?.type)) {
    errors.category = 'Pilih kategori yang sesuai dengan jenis transaksi.';
  }
  if (!WALLETS.some(({ id }) => id === values?.wallet)) {
    errors.wallet = 'Pilih dompet yang tersedia.';
  }

  const date = values?.date;
  let validDate = false;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    validDate = year >= 1 && month >= 1 && month <= 12
      && day >= 1 && day <= daysInMonth(year, month);
  }
  if (!validDate) errors.date = 'Gunakan tanggal kalender yang valid dengan format YYYY-MM-DD.';

  return errors;
}

const demoTemplates = [
  { key: 'salary', day: 1, title: 'Gaji bulanan', amount: 8500000, type: 'income', category: 'salary', wallet: 'bank', note: 'Gaji dari pekerjaan utama.' },
  { key: 'rent', day: 3, title: 'Sewa tempat tinggal', amount: 1750000, type: 'expense', category: 'bills', wallet: 'bank', note: 'Pembayaran sewa bulanan.' },
  { key: 'groceries', day: 5, title: 'Belanja bahan makanan', amount: 365000, type: 'expense', category: 'food', wallet: 'cash', note: 'Sayur, buah, dan kebutuhan dapur.' },
  { key: 'transport', day: 8, title: 'Transportasi harian', amount: 85000, type: 'expense', category: 'transport', wallet: 'ewallet', note: 'Perjalanan ke kantor dan pulang.' },
  { key: 'freelance', day: 10, title: 'Proyek desain freelance', amount: 1250000, type: 'income', category: 'freelance', wallet: 'bank', note: 'Pembayaran proyek dari klien.' },
  { key: 'internet', day: 12, title: 'Tagihan internet', amount: 285000, type: 'expense', category: 'bills', wallet: 'bank', note: 'Paket internet rumah.' },
  { key: 'coffee', day: 15, title: 'Kopi bersama teman', amount: 48000, type: 'expense', category: 'food', wallet: 'ewallet', note: 'Ngopi setelah bekerja.' },
  { key: 'shopping', day: 18, title: 'Belanja kebutuhan pribadi', amount: 275000, type: 'expense', category: 'shopping', wallet: 'bank', note: 'Pakaian dan perlengkapan sehari-hari.' },
  { key: 'health', day: 21, title: 'Vitamin dan obat', amount: 135000, type: 'expense', category: 'health', wallet: 'cash', note: 'Kebutuhan kesehatan di apotek.' },
  { key: 'movie', day: 23, title: 'Tiket bioskop', amount: 95000, type: 'expense', category: 'entertainment', wallet: 'ewallet', note: 'Menonton film akhir pekan.' },
  { key: 'investment', day: 25, title: 'Hasil investasi', amount: 180000, type: 'income', category: 'investment', wallet: 'bank', note: 'Pembagian hasil investasi bulanan.' },
  { key: 'refund', day: 26, title: 'Pengembalian dana', amount: 75000, type: 'income', category: 'other-income', wallet: 'ewallet', note: 'Pengembalian dana dari toko.' },
  { key: 'donation', day: 27, title: 'Donasi bulanan', amount: 100000, type: 'expense', category: 'other-expense', wallet: 'bank', note: 'Donasi untuk kegiatan sosial.' },
  { key: 'dinner', day: 28, title: 'Makan malam keluarga', amount: 165000, type: 'expense', category: 'food', wallet: 'ewallet', note: 'Makan bersama keluarga.' },
];

export function makeDemoTransactions(referenceDate = new Date()) {
  const transactions = [];
  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo -= 1) {
    const month = monthStart(referenceDate, -monthsAgo);
    const monthId = toISODate(month).slice(0, 7);
    const monthDays = daysInMonth(month.getFullYear(), month.getMonth() + 1);
    const availableDays = monthsAgo === 0 ? referenceDate.getDate() : monthDays;
    const templates = monthsAgo === 0
      ? demoTemplates
      : [...demoTemplates.slice(0, 6), demoTemplates[6 + month.getMonth() % 8]];

    for (const template of templates) {
      const date = new Date(month.getTime());
      // Spread current-month activity over elapsed days, even at the start of the month.
      const day = monthsAgo === 0
        ? 1 + Math.floor((template.day - 1) * (availableDays - 1) / (monthDays - 1))
        : Math.min(template.day, monthDays);
      date.setDate(day);
      const variation = 1 + ((month.getMonth() + template.day) % 5) * 0.025;
      transactions.push({
        id: `demo-${monthId}-${template.key}`,
        title: template.title,
        amount: template.type === 'income' ? template.amount : Math.round(template.amount * variation),
        type: template.type,
        category: template.category,
        wallet: template.wallet,
        date: toISODate(date),
        note: template.note,
      });
    }
  }
  return sortTransactions(transactions);
}
