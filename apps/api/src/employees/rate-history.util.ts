/** Compare persisted pay profiles, keeping hourly and annual amounts distinct. */
export function rateChanges(before: any, after: any) {
  const snapshots = (employee: any) => {
    const result: Record<string, { rate: number; payType: string; paySchedule: string | null }> = {};
    if (employee.w2Profile || employee.workerType !== 'CONTRACTOR_1099') {
      const payType = employee.w2Profile?.payType || employee.payType || 'HOURLY';
      const normalized = payType === 'SALARIED' ? 'SALARY' : payType;
      const rate = employee.w2Profile?.rate ?? (normalized === 'SALARY' ? employee.salary : employee.hourlyRate);
      if (rate != null) result.W2 = { rate: Number(rate), payType: normalized, paySchedule: employee.w2Profile?.paySchedule || employee.paySchedule || null };
    }
    if (employee.contractorProfile || ['CONTRACTOR_1099', 'BOTH'].includes(employee.workerType)) {
      const rate = employee.contractorProfile?.rate ?? employee.hourlyRate;
      if (rate != null) result.CONTRACTOR_1099 = { rate: Number(rate), payType: 'HOURLY', paySchedule: null };
    }
    return result;
  };
  const previous = snapshots(before), current = snapshots(after);
  return Object.entries(current).flatMap(([classification, next]) => {
    const old = previous[classification];
    if (old && old.rate === next.rate && old.payType === next.payType) return [];
    const comparable = old && old.payType === next.payType;
    return [{
      classification,
      previousRate: old?.rate ?? null,
      newRate: next.rate,
      previousPayType: old?.payType ?? null,
      payType: next.payType,
      paySchedule: next.paySchedule,
      change: !old ? 'INITIAL' : !comparable ? 'PAY_TYPE_CHANGED' : next.rate > old.rate ? 'INCREASE' : 'DECREASE',
      difference: comparable ? Number((next.rate - old.rate).toFixed(6)) : null,
      percentage: comparable && old.rate > 0 ? Number(((next.rate - old.rate) / old.rate * 100).toFixed(2)) : null,
    }];
  });
}
