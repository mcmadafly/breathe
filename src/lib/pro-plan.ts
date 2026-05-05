export type ProPlan = 'monthly' | 'lifetime' | 'complimentary';

export function isProPlan(value: string | null | undefined): value is ProPlan {
  return value === 'monthly' || value === 'lifetime' || value === 'complimentary';
}
