import type { Debt } from '../types.js';

export type DebtRecommendationType = 'snowball' | 'avalanche' | 'single' | null;

export interface DebtStrategies {
  liabilities: Debt[];
  avalancheDebt: Debt | null;
  snowballDebt: Debt | null;
  recommendedDebt: Debt | null;
  recommendationType: DebtRecommendationType;
}

export const getDebtStrategies = (debts: Debt[]): DebtStrategies => {
  const liabilities = debts.filter((debt) => debt.type === 'LIABILITY' && debt.status === 'ACTIVE');
  if (liabilities.length === 0) {
    return {
      liabilities: [],
      avalancheDebt: null,
      snowballDebt: null,
      recommendedDebt: null,
      recommendationType: null,
    };
  }

  const avalancheDebt =
    [...liabilities].sort((a, b) => {
      const rateDiff = (b.interestRate || 0) - (a.interestRate || 0);
      if (rateDiff !== 0) return rateDiff;
      return b.currentBalance - a.currentBalance;
    })[0] ?? null;

  const snowballDebt =
    [...liabilities].sort((a, b) => {
      const balanceDiff = a.currentBalance - b.currentBalance;
      if (balanceDiff !== 0) return balanceDiff;
      return (b.interestRate || 0) - (a.interestRate || 0);
    })[0] ?? null;

  let recommendedDebt: Debt | null = snowballDebt;
  let recommendationType: DebtRecommendationType = 'snowball';

  if (avalancheDebt && (avalancheDebt.interestRate || 0) >= 18) {
    recommendedDebt = avalancheDebt;
    recommendationType = 'avalanche';
  } else if (avalancheDebt && snowballDebt && avalancheDebt.id === snowballDebt.id) {
    recommendedDebt = avalancheDebt;
    recommendationType = 'single';
  }

  return {
    liabilities,
    avalancheDebt,
    snowballDebt,
    recommendedDebt,
    recommendationType,
  };
};
