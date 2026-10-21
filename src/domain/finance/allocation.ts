import { splitMinorByPercents, toSafeMinorAmount } from '../../utils/money.js';
import type { AllocationPercents, DistributionMode, AllocationModeDefinition } from '../types.js';

const DEFAULT_ALLOCATION: AllocationPercents = {
  balance: 85,
  safety: 8,
  capital: 6,
  sadaka: 1,
};

export const ALLOCATION_MODES: Record<DistributionMode, AllocationModeDefinition> = {
  soft: { allocation: { balance: 94, safety: 3, capital: 2, sadaka: 1 } },
  base: { allocation: { balance: 85, safety: 8, capital: 6, sadaka: 1 } },
  growth: { allocation: { balance: 72, safety: 15, capital: 12, sadaka: 1 } },
  custom: { allocation: DEFAULT_ALLOCATION },
};

const normalizeAllocation = (allocation: Partial<AllocationPercents> | null | undefined): AllocationPercents => ({
  balance: Math.max(0, Number(allocation?.balance) || 0),
  safety: Math.max(0, Number(allocation?.safety) || 0),
  capital: Math.max(0, Number(allocation?.capital) || 0),
  sadaka: Math.max(0, Number(allocation?.sadaka) || 0),
});

export const getAllocationTotal = (allocation: Partial<AllocationPercents> | null | undefined): number => {
  const safe = normalizeAllocation(allocation);
  return safe.balance + safe.safety + safe.capital + safe.sadaka;
};

export interface DistributedIncome {
  toBalance: number;
  toSafety: number;
  toCapital: number;
  toSadaka: number;
}

export const distributeIncome = (
  amount: number,
  allocation: Partial<AllocationPercents> | null | undefined,
): DistributedIncome => {
  const safe = normalizeAllocation(allocation);
  const split = splitMinorByPercents(toSafeMinorAmount(amount), { ...safe });
  return {
    toBalance: split.balance || 0,
    toSafety: split.safety || 0,
    toCapital: split.capital || 0,
    toSadaka: split.sadaka || 0,
  };
};
