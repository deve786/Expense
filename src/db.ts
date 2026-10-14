import * as SQLite from 'expo-sqlite';
import { todayStr, ymKey } from './dates';

export type Category = { id: number; name: string; icon: string; color: string };
export type Expense = {
  id: number;
  amount: number;
  category_id: number;
  date: string; // YYYY-MM-DD
  note: string;
  method: string;
  recurring_id: number | null;
};
export type ExpenseRow = Expense & { cat_name: string; cat_icon: string; cat_color: string };
export type Recurring = {
  id: number;
  amount: number;
  category_id: number;
  note: string;
  method: string;
  day: number;
  last_ym: string;
  cat_name?: string;
};

export const METHODS = ['Cash', 'UPI', 'Card', 'Bank'] as const;

// Hue order is deliberate: warm and cool alternate so neighbouring swatches stay
// distinguishable for red-green colour blindness. Validated, don't reorder casually.
const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Food', icon: 'restaurant-outline', color: '#C8553D' },
  { name: 'Transport', icon: 'car-outline', color: '#2E7DB8' },
  { name: 'Shopping', icon: 'bag-handle-outline', color: '#A8831F' },
  { name: 'Bills', icon: 'receipt-outline', color: '#7159C4' },
  { name: 'Rent', icon: 'home-outline', color: '#2E9465' },
  { name: 'Health', icon: 'medkit-outline', color: '#B0479B' },
  { name: 'Entertainment', icon: 'film-outline', color: '#7B8B1E' },
  { name: 'Other', icon: 'ellipsis-horizontal-circle-outline', color: '#0D8FAF' },
];

/** Colours shipped before the muted palette, keyed by category name. */
const LEGACY_COLORS: Record<string, string> = {
  Food: '#E4572E', Transport: '#2E86AB', Shopping: '#A23B72', Bills: '#F18F01',
  Rent: '#5C6B73', Health: '#3BB273', Entertainment: '#7768AE', Other: '#8D99AE',
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  if (!dbPromise) dbPromise = init();
  return dbPromise;
}

async function init() {
  const db = await SQLite.openDatabaseAsync('spendly.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT NOT NULL,
      color TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      category_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      method TEXT NOT NULL DEFAULT 'Cash',
      recurring_id INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE TABLE IF NOT EXISTS recurring (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      category_id INTEGER NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      method TEXT NOT NULL DEFAULT 'Cash',
      day INTEGER NOT NULL,
      last_ym TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM categories');
  if (!row || row.c === 0) {
    for (const c of DEFAULT_CATEGORIES) {
      await db.runAsync('INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)', c.name, c.icon, c.color);
    }
  } else {
    // Repaint only the defaults the user never customised, so their own picks survive.
    for (const c of DEFAULT_CATEGORIES) {
      await db.runAsync('UPDATE categories SET color = ? WHERE name = ? AND color = ?', c.color, c.name, LEGACY_COLORS[c.name]);
    }
  }
  await generateRecurring(db);
  return db;
}

/** Create this month's entries for any recurring expense whose day has arrived. */
async function generateRecurring(db: SQLite.SQLiteDatabase) {
  const today = todayStr();
  const ym = ymKey(today);
  const dayNow = Number(today.slice(8, 10));
  const daysInMonth = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate();
  const list = await db.getAllAsync<Recurring>('SELECT * FROM recurring WHERE last_ym != ?', ym);
  for (const r of list) {
    const day = Math.min(r.day, daysInMonth);
    if (dayNow >= day) {
      const date = `${ym}-${String(day).padStart(2, '0')}`;
      await db.runAsync(
        'INSERT INTO expenses (amount, category_id, date, note, method, recurring_id) VALUES (?, ?, ?, ?, ?, ?)',
        r.amount, r.category_id, date, r.note, r.method, r.id
      );
      await db.runAsync('UPDATE recurring SET last_ym = ? WHERE id = ?', ym, r.id);
    }
  }
}

export async function refreshRecurring() {
  const db = await getDb();
  await generateRecurring(db);
}

// ---------- Categories ----------
export async function listCategories() {
  const db = await getDb();
  return db.getAllAsync<Category>('SELECT * FROM categories ORDER BY id');
}
export async function addCategory(name: string, icon: string, color: string) {
  const db = await getDb();
  await db.runAsync('INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)', name.trim(), icon, color);
}
export const CATEGORY_COLORS = ['#C8553D', '#2E7DB8', '#A8831F', '#7159C4', '#2E9465', '#B0479B', '#7B8B1E', '#0D8FAF'];

/** Return the id of the category with this name (case-insensitive), creating it if it doesn't exist. */
export async function findOrCreateCategory(name: string) {
  const db = await getDb();
  const n = name.trim();
  const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', n);
  if (existing) return existing.id;
  const count = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM categories');
  const color = CATEGORY_COLORS[(count?.c ?? 0) % CATEGORY_COLORS.length];
  const res = await db.runAsync('INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)', n, 'pricetag-outline', color);
  return res.lastInsertRowId;
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  const other = await db.getFirstAsync<{ id: number }>("SELECT id FROM categories WHERE name = 'Other'");
  if (other && other.id !== id) {
    await db.runAsync('UPDATE expenses SET category_id = ? WHERE category_id = ?', other.id, id);
    await db.runAsync('UPDATE recurring SET category_id = ? WHERE category_id = ?', other.id, id);
    await db.runAsync('DELETE FROM categories WHERE id = ?', id);
  }
}

// ---------- Expenses ----------
const EXPENSE_SELECT = `
  SELECT e.*, c.name AS cat_name, c.icon AS cat_icon, c.color AS cat_color
  FROM expenses e JOIN categories c ON c.id = e.category_id`;

export async function listExpenses(from?: string, to?: string) {
  const db = await getDb();
  if (from && to) {
    return db.getAllAsync<ExpenseRow>(
      `${EXPENSE_SELECT} WHERE e.date >= ? AND e.date <= ? ORDER BY e.date DESC, e.id DESC`, from, to
    );
  }
  return db.getAllAsync<ExpenseRow>(`${EXPENSE_SELECT} ORDER BY e.date DESC, e.id DESC`);
}

export async function getExpense(id: number) {
  const db = await getDb();
  return db.getFirstAsync<Expense>('SELECT * FROM expenses WHERE id = ?', id);
}

export async function saveExpense(e: Omit<Expense, 'id' | 'recurring_id'> & { id?: number }) {
  const db = await getDb();
  if (e.id) {
    await db.runAsync(
      'UPDATE expenses SET amount=?, category_id=?, date=?, note=?, method=? WHERE id=?',
      e.amount, e.category_id, e.date, e.note, e.method, e.id
    );
  } else {
    await db.runAsync(
      'INSERT INTO expenses (amount, category_id, date, note, method) VALUES (?, ?, ?, ?, ?)',
      e.amount, e.category_id, e.date, e.note, e.method
    );
  }
}

export async function deleteExpense(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM expenses WHERE id = ?', id);
}

// ---------- Recurring ----------
export async function listRecurring() {
  const db = await getDb();
  return db.getAllAsync<Recurring>(
    `SELECT r.*, c.name AS cat_name FROM recurring r JOIN categories c ON c.id = r.category_id ORDER BY r.day`
  );
}
export async function addRecurring(r: Omit<Recurring, 'id' | 'last_ym' | 'cat_name'>) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO recurring (amount, category_id, note, method, day) VALUES (?, ?, ?, ?, ?)',
    r.amount, r.category_id, r.note, r.method, r.day
  );
  await generateRecurring(db);
}
export async function deleteRecurring(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM recurring WHERE id = ?', id);
}

// ---------- Settings ----------
export async function getSetting(key: string, fallback = '') {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row ? row.value : fallback;
}
export async function setSetting(key: string, value: string) {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
}
