import { supabase } from './supabase';

export interface MonthlyRevenue {
  label: string; // e.g., 'May', 'אוג', etc. depending on localization, though we can return Date and format in UI
  monthKey: string; // YYYY-MM
  expected: number;
  actual: number;
}

export const fetchAnnualRevenueTrend = async (userId: string, monthsToFetch: number = 12): Promise<MonthlyRevenue[]> => {
  // 1. Calculate date ranges
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth() - monthsToFetch + 1, 1);
  const startMonthIso = startMonth.toISOString().split('T')[0];
  
  // 2. Fetch payments from Supabase
  const { data: payments, error } = await supabase
    .from('payments')
    .select('amount, status, due_date, paid_date, paid_amount')
    .eq('user_id', userId)
    .gte('due_date', startMonthIso); // Or we fetch all and filter in JS if paid_date is earlier but due is later. To be safe, fetch a bit earlier.

  if (error) {
    console.error('Error fetching payments for revenue trend:', error);
    return [];
  }

  // 3. Initialize mapping for the last N months
  const monthsMap = new Map<string, { expected: number; actual: number; date: Date }>();
  
  for (let i = monthsToFetch - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthsMap.set(mStr, { expected: 0, actual: 0, date: d });
  }

  // 4. Aggregate data
  if (payments) {
    payments.forEach(p => {
      // Aggregate Expected: based on due_date
      if (p.due_date) {
        const dueDate = new Date(p.due_date);
        const dueKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthsMap.has(dueKey)) {
          monthsMap.get(dueKey)!.expected += Number(p.amount || 0);
        }
      }

      // Aggregate Actual: based on paid_date, only if status is paid
      if (p.status === 'paid' && p.paid_date) {
        const paidDate = new Date(p.paid_date);
        const paidKey = `${paidDate.getFullYear()}-${String(paidDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthsMap.has(paidKey)) {
          // Attempt to use paid_amount if it exists, fallback to amount
          const paidValue = p.paid_amount !== null && p.paid_amount !== undefined ? p.paid_amount : p.amount;
          monthsMap.get(paidKey)!.actual += Number(paidValue || 0);
        }
      }
    });
  }

  // 5. Convert to array and calculate labels
  const result: MonthlyRevenue[] = [];
  monthsMap.forEach((val, key) => {
    // Label will be formatting in short Hebrew month name
    const label = val.date.toLocaleDateString('he-IL', { month: 'short' }).replace('.', '');
    result.push({
      label,
      monthKey: key,
      expected: val.expected,
      actual: val.actual,
    });
  });

  // Sort chronologically (map iteration is usually insertion order, but just to be safe)
  return result.sort((a, b) => a.monthKey.localeCompare(b.monthKey));
};
