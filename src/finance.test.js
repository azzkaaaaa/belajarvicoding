import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORIES,
  WALLETS,
  formatCurrency,
  formatCompactCurrency,
  toISODate,
  makeDemoTransactions,
  sortTransactions,
  getTotals,
  getWalletBalance,
  getMonthlySeries,
  getCategoryBreakdown,
  validateTransaction,
} from './finance.js';

const transactions = [
  { id: 'salary', title: 'Gaji', amount: 1000000, type: 'income', category: 'salary', wallet: 'bank', date: '2025-03-15', note: '' },
  { id: 'rent', title: 'Sewa', amount: 200000, type: 'expense', category: 'bills', wallet: 'bank', date: '2025-03-03', note: '' },
  { id: 'food', title: 'Makan', amount: 150000, type: 'expense', category: 'food', wallet: 'cash', date: '2025-03-10', note: '' },
  { id: 'freelance', title: 'Desain', amount: 250000, type: 'income', category: 'freelance', wallet: 'ewallet', date: '2025-03-12', note: '' },
  { id: 'transport', title: 'Kereta', amount: 100000, type: 'expense', category: 'transport', wallet: 'ewallet', date: '2025-02-28', note: '' },
  { id: 'groceries', title: 'Sayur', amount: 50000, type: 'expense', category: 'food', wallet: 'bank', date: '2025-01-31', note: '' },
  { id: 'refund', title: 'Pengembalian dana', amount: 50000, type: 'income', category: 'other-income', wallet: 'cash', date: '2025-03-20', note: '' },
];
const validValues = {
  title: '  Makan siang  ',
  amount: '25000',
  type: 'expense',
  category: 'food',
  wallet: 'cash',
  date: '2025-03-10',
};

function frozenCopy(values) {
  return Object.freeze(values.map((value) => Object.freeze({ ...value })));
}

test('kategori dan dompet mengikuti kontrak API', () => {
  assert.deepEqual(CATEGORIES.map(({ id, label, type }) => [id, label, type]), [
    ['salary', 'Gaji', 'income'],
    ['freelance', 'Freelance', 'income'],
    ['investment', 'Investasi', 'income'],
    ['other-income', 'Pemasukan lain', 'income'],
    ['food', 'Makanan & minuman', 'expense'],
    ['shopping', 'Belanja', 'expense'],
    ['transport', 'Transportasi', 'expense'],
    ['bills', 'Tagihan', 'expense'],
    ['entertainment', 'Hiburan', 'expense'],
    ['health', 'Kesehatan', 'expense'],
    ['other-expense', 'Pengeluaran lain', 'expense'],
  ]);
  assert.deepEqual(WALLETS.map(({ id, name, kind, openingBalance }) => [id, name, kind, openingBalance]), [
    ['bank', 'Rekening utama', 'Bank', 12500000],
    ['cash', 'Uang tunai', 'Tunai', 1000000],
    ['ewallet', 'Dompet digital', 'E-wallet', 500000],
  ]);
  for (const item of [...CATEGORIES, ...WALLETS]) {
    assert.match(item.color, /^#[\da-f]{6}$/i);
  }
});

test('formatCurrency menggunakan rupiah Indonesia tanpa desimal', () => {
  const normalize = (value) => value.replace(/\s/g, ' ');
  assert.equal(normalize(formatCurrency(1250000)), 'Rp 1.250.000');
  assert.equal(normalize(formatCurrency(1250000.6)), 'Rp 1.250.001');
  assert.equal(normalize(formatCurrency(0)), 'Rp 0');
  assert.equal(normalize(formatCurrency(-2500)), '-Rp 2.500');
});

test('formatCompactCurrency menggunakan satuan dan desimal Indonesia', () => {
  for (const [amount, expected] of [
    [5000000, '5 jt'],
    [500000, '500 rb'],
    [1500000, '1,5 jt'],
    [1250, '1,3 rb'],
    [1000000000, '1 miliar'],
    [1000000000000, '1 triliun'],
    [-5000000, '-5 jt'],
    [999, '999'],
    [0, '0'],
  ]) {
    assert.equal(formatCompactCurrency(amount), expected);
  }
});

test('toISODate memakai komponen tanggal lokal, termasuk dekat tengah malam', () => {
  for (const hour of [0, 23]) {
    const date = new Date(2025, 0, 2, hour, 30);
    const timestamp = date.getTime();
    assert.equal(toISODate(date), '2025-01-02');
    assert.equal(date.getTime(), timestamp);
  }
  assert.equal(toISODate(new Date(2024, 1, 29, 12)), '2024-02-29');
  const earlyYear = new Date(2025, 0, 1, 12);
  earlyYear.setFullYear(9);
  assert.equal(toISODate(earlyYear), '0009-01-01');
});

test('sortTransactions mengurutkan terbaru dahulu tanpa mengubah input', () => {
  const input = frozenCopy(transactions);
  const sorted = sortTransactions(input);
  assert.notEqual(sorted, input);
  assert.deepEqual(sorted.map(({ id }) => id), [
    'refund', 'salary', 'freelance', 'food', 'rent', 'transport', 'groceries',
  ]);
  assert.deepEqual(input, transactions);
  assert.equal(sorted[0], input[6]);
  assert.deepEqual(sortTransactions([]), []);
});

test('sortTransactions mempertahankan urutan awal untuk tanggal yang sama', () => {
  const input = frozenCopy([
    { id: 'first', date: '2025-03-01' },
    { id: 'second', date: '2025-03-01' },
  ]);
  assert.deepEqual(sortTransactions(input).map(({ id }) => id), ['first', 'second']);
});

test('getTotals menghitung pemasukan, pengeluaran, dan selisih', () => {
  assert.deepEqual(getTotals(frozenCopy(transactions)), {
    income: 1300000, expense: 500000, balance: 800000,
  });
  assert.deepEqual(getTotals([]), { income: 0, expense: 0, balance: 0 });
  assert.deepEqual(getTotals(transactions.filter(({ type }) => type === 'expense')), {
    income: 0, expense: 500000, balance: -500000,
  });
});

test('getWalletBalance menambahkan semua transaksi dompet ke saldo awal', () => {
  const input = frozenCopy(transactions);
  assert.equal(getWalletBalance(input, 'bank'), 13250000);
  assert.equal(getWalletBalance(input, 'cash'), 900000);
  assert.equal(getWalletBalance(input, 'ewallet'), 650000);
  for (const wallet of WALLETS) {
    assert.equal(getWalletBalance([], wallet.id), wallet.openingBalance);
  }
  assert.equal(getWalletBalance(input, 'unknown'), 0);
  const walletTotal = WALLETS.reduce((sum, { id }) => sum + getWalletBalance(input, id), 0);
  const openingTotal = WALLETS.reduce((sum, { openingBalance }) => sum + openingBalance, 0);
  assert.equal(walletTotal, openingTotal + getTotals(input).balance);
});

test('getMonthlySeries menjumlahkan tiap bulan dan mencakup bulan referensi', () => {
  const reference = new Date(2025, 2, 31, 23, 30);
  const timestamp = reference.getTime();
  assert.deepEqual(getMonthlySeries(frozenCopy(transactions), reference, 3), [
    { label: 'Jan', month: '2025-01', income: 0, expense: 50000 },
    { label: 'Feb', month: '2025-02', income: 0, expense: 100000 },
    { label: 'Mar', month: '2025-03', income: 1300000, expense: 350000 },
  ]);
  assert.equal(reference.getTime(), timestamp);
  const defaultSeries = getMonthlySeries(transactions, reference);
  assert.equal(defaultSeries.length, 6);
  assert.equal(defaultSeries[0].month, '2024-10');
  assert.equal(defaultSeries[5].month, '2025-03');
  assert.deepEqual(defaultSeries[0], { label: 'Okt', month: '2024-10', income: 0, expense: 0 });
});

test('getMonthlySeries menangani pergantian tahun, bulan kosong, dan count', () => {
  assert.deepEqual(getMonthlySeries([], new Date(2025, 0, 31), 3), [
    { label: 'Nov', month: '2024-11', income: 0, expense: 0 },
    { label: 'Des', month: '2024-12', income: 0, expense: 0 },
    { label: 'Jan', month: '2025-01', income: 0, expense: 0 },
  ]);
  assert.equal(getMonthlySeries(transactions, new Date(2025, 2, 1), 1)[0].income, 1300000);
  assert.deepEqual(getMonthlySeries(transactions, new Date(2025, 2, 1), 0), []);
  assert.deepEqual(getMonthlySeries(transactions, new Date(2025, 2, 1), -1), []);
  const outside = [...transactions, { ...transactions[0], date: '2025-04-01' }];
  assert.deepEqual(
    getMonthlySeries(outside, new Date(2025, 2, 31), 3),
    getMonthlySeries(transactions, new Date(2025, 2, 31), 3),
  );
});

test('getCategoryBreakdown hanya menghitung pengeluaran, diurutkan menurun', () => {
  const breakdown = getCategoryBreakdown(frozenCopy(transactions));
  assert.deepEqual(breakdown.map(({ amount }) => amount), [200000, 200000, 100000]);
  const byId = Object.fromEntries(breakdown.map((category) => [category.id, category]));
  assert.equal(byId.food.percentage, 40);
  assert.equal(byId.bills.percentage, 40);
  assert.equal(byId.transport.percentage, 20);
  for (const item of breakdown) {
    const category = CATEGORIES.find(({ id }) => id === item.id);
    assert.equal(item.label, category.label);
    assert.equal(item.color, category.color);
    assert.equal(category.type, 'expense');
    assert.deepEqual(Object.keys(item).sort(), ['amount', 'color', 'id', 'label', 'percentage']);
  }
  assert.equal(breakdown.reduce((sum, { percentage }) => sum + percentage, 0), 100);
});

test('getCategoryBreakdown aman untuk data kosong dan tidak membulatkan persentase', () => {
  assert.deepEqual(getCategoryBreakdown([]), []);
  assert.deepEqual(getCategoryBreakdown(transactions.filter(({ type }) => type === 'income')), []);
  assert.deepEqual(getCategoryBreakdown([{ ...transactions[2], amount: 0 }]), []);
  const breakdown = getCategoryBreakdown([
    { ...transactions[2], amount: 1 },
    { ...transactions[1], amount: 2 },
  ]);
  assert.equal(breakdown[0].percentage, 2 / 3 * 100);
  assert.equal(breakdown[1].percentage, 1 / 3 * 100);
});

test('validateTransaction menerima input valid tanpa mengubahnya', () => {
  assert.deepEqual(validateTransaction(Object.freeze({ ...validValues })), {});
  for (const amount of [1, 1000000000000, '1000000000000', ' 25000 ']) {
    assert.deepEqual(validateTransaction({ ...validValues, amount }), {});
  }
  for (const category of CATEGORIES) {
    assert.deepEqual(validateTransaction({ ...validValues, type: category.type, category: category.id }), {});
  }
  for (const { id: wallet } of WALLETS) {
    assert.deepEqual(validateTransaction({ ...validValues, wallet }), {});
  }
});

test('validateTransaction menghitung panjang judul setelah trim', () => {
  for (const title of ['', ' ', ' a ', 'x'.repeat(81), null, 123]) {
    assert.deepEqual(Object.keys(validateTransaction({ ...validValues, title })), ['title']);
  }
  for (const title of [' ab ', ` ${'x'.repeat(80)} `]) {
    assert.deepEqual(validateTransaction({ ...validValues, title }), {});
  }
});

test('validateTransaction menolak nominal kosong, pecahan, tidak aman, dan terlalu besar', () => {
  for (const amount of [
    0, -1, 1.5, '', '   ', 'abc', '1,000', 'Rp25000',
    NaN, Infinity, -Infinity, 1000000000001, Number.MAX_SAFE_INTEGER + 1,
    null, undefined, true, false, [], {}, 1n,
  ]) {
    assert.deepEqual(Object.keys(validateTransaction({ ...validValues, amount })), ['amount']);
  }
});

test('validateTransaction menolak jenis, kategori tidak cocok, dan dompet tidak dikenal', () => {
  assert.deepEqual(Object.keys(validateTransaction({ ...validValues, type: 'transfer' })).sort(), ['category', 'type']);
  assert.deepEqual(Object.keys(validateTransaction({ ...validValues, category: 'salary' })), ['category']);
  assert.deepEqual(Object.keys(validateTransaction({ ...validValues, type: 'income' })).sort(), ['category']);
  assert.deepEqual(Object.keys(validateTransaction({ ...validValues, category: 'unknown' })), ['category']);
  assert.deepEqual(Object.keys(validateTransaction({ ...validValues, wallet: 'unknown' })), ['wallet']);
  assert.deepEqual(Object.keys(validateTransaction()).sort(), ['amount', 'category', 'date', 'title', 'type', 'wallet']);
  assert.deepEqual(validateTransaction(null), validateTransaction());
});

test('validateTransaction memeriksa format dan tanggal kalender sebenarnya', () => {
  for (const date of [
    '2025-02-29', '2024-02-30', '1900-02-29', '2100-02-29', '2025-04-31',
    '2025-00-10', '2025-13-01', '2025-01-00', '2025-01-32', '0000-01-01',
    '2025-1-01', '2025-01-1', '25-01-01', '2025-01-01T00:00:00Z',
    '2025-01-01\n', ' 2025-01-01 ', '', null, new Date(2025, 0, 1),
  ]) {
    assert.deepEqual(Object.keys(validateTransaction({ ...validValues, date })), ['date'], String(date));
  }
  for (const date of ['2024-02-29', '2000-02-29', '2025-04-30', '0001-01-01', '9999-12-31']) {
    assert.deepEqual(validateTransaction({ ...validValues, date }), {}, date);
  }
});

test('makeDemoTransactions membuat data deterministik, valid, unik, dan terbaru dahulu', () => {
  const reference = new Date(2025, 9, 20, 0, 15);
  const timestamp = reference.getTime();
  const demo = makeDemoTransactions(reference);
  assert.ok(demo.length >= 35 && demo.length <= 50);
  assert.equal(new Set(demo.map(({ id }) => id)).size, demo.length);
  assert.deepEqual(demo, makeDemoTransactions(reference));
  assert.equal(reference.getTime(), timestamp);
  assert.deepEqual(demo, sortTransactions(demo));
  assert.deepEqual([...new Set(demo.map(({ date }) => date.slice(0, 7)))].sort(), [
    '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10',
  ]);
  const current = demo.filter(({ date }) => date.startsWith('2025-10'));
  assert.ok(current.length >= 10);
  assert.ok(current.every(({ date }) => date <= toISODate(reference)));
  for (const transaction of demo) {
    assert.deepEqual(Object.keys(transaction).sort(), ['amount', 'category', 'date', 'id', 'note', 'title', 'type', 'wallet']);
    assert.deepEqual(validateTransaction(transaction), {}, transaction.id);
    assert.ok(Number.isSafeInteger(transaction.amount) && transaction.amount > 0);
    assert.equal(typeof transaction.note, 'string');
  }
  const salaries = demo.filter(({ category }) => category === 'salary');
  assert.equal(salaries.length, 6);
  assert.ok(salaries.every(({ amount }) => amount === 8500000));
  assert.equal(new Set(demo.filter(({ type }) => type === 'expense').map(({ amount }) => amount)).size > 5, true);
  demo[0].title = 'Diubah oleh pemanggil';
  assert.notEqual(makeDemoTransactions(reference)[0].title, demo[0].title);
});

test('makeDemoTransactions aman pada awal bulan, tahun baru, dan Februari kabisat', () => {
  for (const reference of [
    new Date(2025, 0, 1, 0, 1),
    new Date(2025, 0, 31, 23, 59),
    new Date(2024, 1, 29, 23, 59),
    new Date(2025, 1, 28, 0, 1),
    new Date(2026, 9, 4, 12),
  ]) {
    const demo = makeDemoTransactions(reference);
    const month = toISODate(reference).slice(0, 7);
    const current = demo.filter(({ date }) => date.startsWith(month));
    assert.ok(current.length >= 10);
    assert.ok(demo.every(({ date }) => date <= toISODate(reference)));
    assert.equal(new Set(demo.map(({ date }) => date.slice(0, 7))).size, 6);
    for (const transaction of demo) assert.deepEqual(validateTransaction(transaction), {});
    const series = getMonthlySeries(demo, reference);
    assert.equal(series.at(-1).month, month);
    assert.equal(series.reduce((sum, { income }) => sum + income, 0), getTotals(demo).income);
    assert.equal(series.reduce((sum, { expense }) => sum + expense, 0), getTotals(demo).expense);
    assert.deepEqual(
      current.map(({ id }) => id).sort(),
      makeDemoTransactions(new Date(reference.getFullYear(), reference.getMonth(), 15))
        .filter(({ date }) => date.startsWith(month)).map(({ id }) => id).sort(),
    );
  }
});

test('default tanggal referensi menggunakan bulan lokal saat ini', () => {
  const before = new Date();
  const demo = makeDemoTransactions();
  const series = getMonthlySeries([]);
  const after = new Date();
  const possibleMonths = new Set([toISODate(before).slice(0, 7), toISODate(after).slice(0, 7)]);
  assert.ok(possibleMonths.has(demo[0].date.slice(0, 7)));
  assert.ok(demo.every(({ date }) => date <= toISODate(after)));
  assert.ok(possibleMonths.has(series.at(-1).month));
  assert.equal(series.length, 6);
});
