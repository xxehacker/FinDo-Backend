/** Employment-month salary tiers starting May 2025 (13 months through May 2026). */

export const SALARY_CATEGORY_NAME = "Salary";
export const SALARY_MONTH_COUNT = 13;

/** May = month index 4 in JS Date */
export const SALARY_START = { year: 2025, month: 4 };

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** 0-based employment month index (0 = month 1). */
export function getSalaryAmount(employmentMonthIndex) {
  const month = employmentMonthIndex + 1;
  if (month <= 3) return 5000;
  if (month <= 10) return 13500;
  return 18000;
}

function formatMonthYear(date) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * @returns {{ date: Date, amount: number, description: string, employmentMonth: number }[]}
 */
export function buildSalaryEntries() {
  const entries = [];
  for (let i = 0; i < SALARY_MONTH_COUNT; i++) {
    const date = new Date(SALARY_START.year, SALARY_START.month + i, 1);
    entries.push({
      date,
      amount: getSalaryAmount(i),
      description: `Salary – ${formatMonthYear(date)}`,
      employmentMonth: i + 1,
    });
  }
  return entries;
}

export function getSalaryScheduleSummary() {
  return buildSalaryEntries().map((e) => ({
    month: formatMonthYear(e.date),
    amount: e.amount,
    employmentMonth: e.employmentMonth,
  }));
}
