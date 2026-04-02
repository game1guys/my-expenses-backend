import { Response } from 'express';
import { supabase } from '../database/supabase';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

/**
 * UTILITY: Get All User Transactions
 */
const fetchUserTransactions = async (userId: string) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('amount, type, category_id, transaction_date, categories(name, color, icon_url)')
    .eq('user_id', userId);
  return { data: data || [], error };
};

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Week starts Monday */
function startOfWeekMonday(ref: Date): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Unified spending overview: day | week | month window with daily buckets + category splits.
 * GET /api/analytics/overview?period=day|week|month&date=YYYY-MM-DD
 */
export const getSpendingOverview = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const period = (req.query.period as string) || 'month';
  const dateStr = req.query.date as string | undefined;

  let ref = new Date();
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, da] = dateStr.split('-').map(Number);
    ref = new Date(y, m - 1, da);
    if (Number.isNaN(ref.getTime())) ref = new Date();
  }

  let rangeStart: Date;
  let rangeEnd: Date;

  if (period === 'day') {
    rangeStart = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0, 0);
    rangeEnd = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59, 999);
  } else if (period === 'week') {
    rangeStart = startOfWeekMonday(ref);
    rangeEnd = new Date(addDays(rangeStart, 6));
    rangeEnd.setHours(23, 59, 59, 999);
  } else if (period === 'quarter') {
    const quarter = Math.floor(ref.getMonth() / 3);
    rangeStart = new Date(ref.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
    rangeEnd = new Date(ref.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
  } else if (period === 'half') {
    const half = Math.floor(ref.getMonth() / 6);
    rangeStart = new Date(ref.getFullYear(), half * 6, 1, 0, 0, 0, 0);
    rangeEnd = new Date(ref.getFullYear(), (half + 1) * 6, 0, 23, 59, 59, 999);
  } else if (period === 'year') {
    rangeStart = new Date(ref.getFullYear(), 0, 1, 0, 0, 0, 0);
    rangeEnd = new Date(ref.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else {
    rangeStart = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
    rangeEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  const startStr = toYMD(rangeStart);
  const endStr = toYMD(rangeEnd);

  // Calculate Previous Range for Comparison
  let prevRangeStart: Date;
  let prevRangeEnd: Date;

  if (period === 'day') {
    prevRangeStart = addDays(rangeStart, -1);
    prevRangeEnd = addDays(rangeEnd, -1);
  } else if (period === 'week') {
    prevRangeStart = addDays(rangeStart, -7);
    prevRangeEnd = addDays(rangeEnd, -7);
  } else if (period === 'quarter') {
    prevRangeStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth() - 3, 1);
    prevRangeEnd = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 0, 23, 59, 59, 999);
  } else if (period === 'half') {
    prevRangeStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth() - 6, 1);
    prevRangeEnd = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 0, 23, 59, 59, 999);
  } else if (period === 'year') {
    prevRangeStart = new Date(rangeStart.getFullYear() - 1, 0, 1);
    prevRangeEnd = new Date(rangeStart.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
  } else {
    prevRangeStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth() - 1, 1);
    prevRangeEnd = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 0, 23, 59, 59, 999);
  }

  const prevStartStr = toYMD(prevRangeStart);
  const prevEndStr = toYMD(prevRangeEnd);

  const filterCategoryId =
    typeof req.query.category_id === 'string' && req.query.category_id.length > 0
      ? req.query.category_id
      : undefined;

  const { data: raw, error } = await fetchUserTransactions(req.user!.id);
  if (error) return res.status(500).json({ error: error.message });

  const data = (raw || []).filter((trx: any) => {
    const d = String(trx.transaction_date).split('T')[0];
    if (d < startStr || d > endStr) return false;
    if (filterCategoryId && trx.category_id !== filterCategoryId) return false;
    return true;
  });

  const prevData = (raw || []).filter((trx: any) => {
    const d = String(trx.transaction_date).split('T')[0];
    if (d < prevStartStr || d > prevEndStr) return false;
    if (filterCategoryId && trx.category_id !== filterCategoryId) return false;
    return true;
  });

  let filterLabel: string | null = null;
  if (filterCategoryId) {
    const fromTrx = (raw || []).find((t: any) => t.category_id === filterCategoryId);
    const c = fromTrx?.categories as { name?: string } | { name?: string }[] | undefined;
    filterLabel = (Array.isArray(c) ? c[0]?.name : c?.name) || null;
    if (!filterLabel) {
      const { data: catRow } = await supabase
        .from('categories')
        .select('name')
        .eq('id', filterCategoryId)
        .maybeSingle();
      filterLabel = catRow?.name || 'Category';
    }
  }

  const bucketKeys: string[] = [];
  const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
  const endDay = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());
  while (cursor <= endDay) {
    bucketKeys.push(toYMD(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const dailyBuckets = bucketKeys.map((date) => ({ date, income: 0, expense: 0, savings: 0 }));
  const totals = { income: 0, expense: 0, savings: 0 };
  const prevTotals = { income: 0, expense: 0, savings: 0 };
  const expenseByCategory: Record<string, { value: number; color: string; icon_url: string }> = {};
  const incomeByCategory: Record<string, { value: number; color: string; icon_url: string }> = {};

  data.forEach((trx: any) => {
    const d = String(trx.transaction_date).split('T')[0];
    const amt = Number(trx.amount);
    const idx = bucketKeys.indexOf(d);
    if (trx.type === 'income') {
      totals.income += amt;
      if (idx >= 0) dailyBuckets[idx].income += amt;
      const catName = trx.categories?.name || 'Uncategorized';
      const color = trx.categories?.color || '#22c55e';
      const icon_url = trx.categories?.icon_url || '';
      if (!incomeByCategory[catName]) incomeByCategory[catName] = { value: 0, color, icon_url };
      incomeByCategory[catName].value += amt;
    } else if (trx.type === 'expense') {
      totals.expense += amt;
      if (idx >= 0) dailyBuckets[idx].expense += amt;
      const catName = trx.categories?.name || 'Uncategorized';
      const color = trx.categories?.color || '#cbd5e1';
      const icon_url = trx.categories?.icon_url || '';
      if (!expenseByCategory[catName]) expenseByCategory[catName] = { value: 0, color, icon_url };
      expenseByCategory[catName].value += amt;
    }
  });

  prevData.forEach((trx: any) => {
    const amt = Number(trx.amount);
    if (trx.type === 'income') prevTotals.income += amt;
    else if (trx.type === 'expense') prevTotals.expense += amt;
  });

  dailyBuckets.forEach((b) => {
    b.savings = b.income - b.expense;
  });
  totals.savings = totals.income - totals.expense;
  prevTotals.savings = prevTotals.income - prevTotals.expense;

  const toArr = (rec: Record<string, { value: number; color: string; icon_url: string }>) =>
    Object.keys(rec)
      .map((name) => ({ 
        name, 
        value: rec[name].value, 
        color: rec[name].color,
        icon_url: rec[name].icon_url
      }))
      .sort((a, b) => b.value - a.value);

  return res.status(200).json({
    period,
    range: { start: startStr, end: endStr },
    prevRange: { start: prevStartStr, end: prevEndStr },
    totals,
    prevTotals,
    dailyBuckets,
    expenseByCategory: toArr(expenseByCategory),
    incomeByCategory: toArr(incomeByCategory),
    filter: filterCategoryId
      ? { category_id: filterCategoryId, name: filterLabel || 'Category' }
      : null,
  });
};

/**
 * API 1: Monthly Bar Graph Data
 * Groups transactions by DAY (1st to 30th/31st) for the CURRENT month.
 */
export const getMonthlyBarGraph = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { data, error } = await fetchUserTransactions(req.user!.id);
  if (error) return res.status(500).json({ error: error.message });

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Initialize days map for current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dailyData: Record<string, { date: string, income: number, expense: number, savings: number }> = {};
  
  for (let i = 1; i <= daysInMonth; i++) {
    const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    dailyData[dayStr] = { date: dayStr, income: 0, expense: 0, savings: 0 };
  }

  data.forEach((trx: any) => {
    const trxDate = new Date(trx.transaction_date);
    if (trxDate.getMonth() === currentMonth && trxDate.getFullYear() === currentYear) {
      const dateKey = trx.transaction_date.split('T')[0];
      if (dailyData[dateKey]) {
        const amt = Number(trx.amount);
        if (trx.type === 'income') dailyData[dateKey].income += amt;
        if (trx.type === 'expense') dailyData[dateKey].expense += amt;
        dailyData[dateKey].savings = dailyData[dateKey].income - dailyData[dateKey].expense;
      }
    }
  });

  return res.status(200).json({ chartData: Object.values(dailyData) });
};

/**
 * API 2: Weekly Trends
 * Return Week 1, 2, 3, 4 grouping for current month.
 */
export const getWeeklyTrends = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { data, error } = await fetchUserTransactions(req.user!.id);
  if (error) return res.status(500).json({ error: error.message });

  const currentMonth = new Date().getMonth();
  const weeklyData = [
    { week: 'Week 1', expense: 0, savings: 0, income: 0 },
    { week: 'Week 2', expense: 0, savings: 0, income: 0 },
    { week: 'Week 3', expense: 0, savings: 0, income: 0 },
    { week: 'Week 4', expense: 0, savings: 0, income: 0 }
  ];

  data.forEach((trx: any) => {
    const trxDate = new Date(trx.transaction_date);
    if (trxDate.getMonth() === currentMonth) {
      const day = trxDate.getDate();
      let weekIndex = 0;
      if (day > 7 && day <= 14) weekIndex = 1;
      else if (day > 14 && day <= 21) weekIndex = 2;
      else if (day > 21) weekIndex = 3;

      const amt = Number(trx.amount);
      if (trx.type === 'income') weeklyData[weekIndex].income += amt;
      if (trx.type === 'expense') weeklyData[weekIndex].expense += amt;
      weeklyData[weekIndex].savings = weeklyData[weekIndex].income - weeklyData[weekIndex].expense;
    }
  });

  return res.status(200).json({ weeklyTrends: weeklyData });
};

/**
 * API 3: Compare Two specific Dates
 * GET /api/analytics/compare?date1=2026-03-25&date2=2026-03-26
 */
export const compareDates = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const date1 = req.query.date1 as string;
  const date2 = req.query.date2 as string;

  if (!date1 || !date2) return res.status(400).json({ error: "Missing date1 or date2 query parameters." });

  const { data, error } = await fetchUserTransactions(req.user!.id);
  if (error) return res.status(500).json({ error: error.message });

  const metrics = {
    [date1]: { income: 0, expense: 0, savings: 0 },
    [date2]: { income: 0, expense: 0, savings: 0 }
  };

  data.forEach((trx: any) => {
    const d = trx.transaction_date.split('T')[0];
    if (d === date1 || d === date2) {
      const amt = Number(trx.amount);
      if (trx.type === 'income') metrics[d].income += amt;
      if (trx.type === 'expense') metrics[d].expense += amt;
      metrics[d].savings = metrics[d].income - metrics[d].expense;
    }
  });

  return res.status(200).json({ comparison: metrics });
};

/**
 * API 4: Category Wise Distribution Pipeline for Pie Charts
 */
export const getCategoryDistribution = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const { data, error } = await fetchUserTransactions(req.user!.id);
  if (error) return res.status(500).json({ error: error.message });

  const distribution: Record<string, { value: number, color: string }> = {};

  data.forEach((trx: any) => {
    if (trx.type === 'expense') {
      const catName = trx.categories?.name || 'Uncategorized';
      const color = trx.categories?.color || '#cbd5e1';
      const amt = Number(trx.amount);

      if (!distribution[catName]) {
        distribution[catName] = { value: 0, color };
      }
      distribution[catName].value += amt;
    }
  });

  // Format array for recharts/victory chart libraries
  const chartArray = Object.keys(distribution).map(key => ({
    name: key,
    value: distribution[key].value,
    color: distribution[key].color
  })).sort((a,b) => b.value - a.value);

  return res.status(200).json({ categoryChart: chartArray });
};
