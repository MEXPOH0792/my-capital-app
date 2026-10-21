import { DEFAULT_CURRENCY, formatMinorAsCurrency } from '../../utils/money.js';
import type { Debt } from '../types.js';

export type AdvisorTone = 'green' | 'blue' | 'amber' | 'red';

export interface AdvisorInsight {
  tone: AdvisorTone;
  badge: string;
  title: string;
  summary: string;
  action: string;
  impact: string;
}

interface AdvisorCopySection {
  payYourself: string;
  setup: string;
  risk: string;
  deficit: string;
  debt: string;
  safety: string;
  growth: string;
  onTrack: string;
  actionNow?: string;
  disabled: { title: string; summary: string; action: string; impact: string };
  setupRequired: { title: string; summary: string; action: string; impact: string };
  obligationRisk: { title: string; summary: (gap: string) => string; action: string; impact: string };
  uncoveredRequired: {
    title: string;
    summary: (gap: string) => string;
    action: string;
    impact: string;
  };
  expensiveDebt: {
    title: (name: string) => string;
    summary: (rate: number, balance: string) => string;
    action: string;
    impact: (total: string) => string;
  };
  weakSafety: { title: string; summary: string; action: string; impact: string };
  weakGrowth: { title: string; summary: (percent: number) => string; action: string; impact: string };
  stable: { title: string; summary: (progress: number) => string; action: string; impact: string };
}

interface AdvisorCopy {
  advisor: AdvisorCopySection;
}

export interface AdvisorArgs {
  copy: AdvisorCopy;
  locale: string;
  currency?: string;
  incomeDistributionEnabled: boolean;
  incomeDistributionBasis: 'total_income' | 'free_after_required';
  payYourselfPercent: number;
  totalRequiredExpenses: number;
  obligationsDelta: number;
  uncoveredRequired: number;
  topPriorityDebt: Pick<Debt, 'title' | 'interestRate' | 'currentBalance'> | null;
  totalLiabilityDebt: number;
  safetyFund: number;
  targetSafety: number;
  capital: number;
  targetCapital: number;
}

export const getAdvisorInsight = ({
  copy,
  locale,
  currency = DEFAULT_CURRENCY,
  incomeDistributionEnabled,
  incomeDistributionBasis,
  payYourselfPercent,
  totalRequiredExpenses,
  obligationsDelta,
  uncoveredRequired,
  topPriorityDebt,
  totalLiabilityDebt,
  safetyFund,
  targetSafety,
  capital,
  targetCapital,
}: AdvisorArgs): AdvisorInsight => {
  const formatMoney = (value: number): string => formatMinorAsCurrency(value, locale, currency);

  if (!incomeDistributionEnabled) {
    return {
      tone: 'blue',
      badge: copy.advisor.payYourself,
      title: copy.advisor.disabled.title,
      summary: copy.advisor.disabled.summary,
      action: copy.advisor.disabled.action,
      impact: copy.advisor.disabled.impact,
    };
  }

  if (totalRequiredExpenses <= 0) {
    return {
      tone: 'amber',
      badge: copy.advisor.setup,
      title: copy.advisor.setupRequired.title,
      summary: copy.advisor.setupRequired.summary,
      action: copy.advisor.setupRequired.action,
      impact: copy.advisor.setupRequired.impact,
    };
  }

  if (obligationsDelta < 0 && incomeDistributionBasis === 'total_income') {
    return {
      tone: 'red',
      badge: copy.advisor.risk,
      title: copy.advisor.obligationRisk.title,
      summary: copy.advisor.obligationRisk.summary(formatMoney(Math.abs(obligationsDelta))),
      action: copy.advisor.obligationRisk.action,
      impact: copy.advisor.obligationRisk.impact,
    };
  }

  if (uncoveredRequired > 0 && incomeDistributionBasis === 'free_after_required') {
    return {
      tone: 'red',
      badge: copy.advisor.deficit,
      title: copy.advisor.uncoveredRequired.title,
      summary: copy.advisor.uncoveredRequired.summary(formatMoney(uncoveredRequired)),
      action: copy.advisor.uncoveredRequired.action,
      impact: copy.advisor.uncoveredRequired.impact,
    };
  }

  if (topPriorityDebt && topPriorityDebt.interestRate >= 18) {
    return {
      tone: 'red',
      badge: copy.advisor.debt,
      title: copy.advisor.expensiveDebt.title(topPriorityDebt.title),
      summary: copy.advisor.expensiveDebt.summary(
        topPriorityDebt.interestRate,
        formatMoney(topPriorityDebt.currentBalance),
      ),
      action: copy.advisor.expensiveDebt.action,
      impact: copy.advisor.expensiveDebt.impact(formatMoney(totalLiabilityDebt)),
    };
  }

  if (safetyFund < Math.max(targetSafety * 0.1, totalRequiredExpenses)) {
    return {
      tone: 'amber',
      badge: copy.advisor.safety,
      title: copy.advisor.weakSafety.title,
      summary: copy.advisor.weakSafety.summary,
      action: copy.advisor.weakSafety.action,
      impact: copy.advisor.weakSafety.impact,
    };
  }

  if (payYourselfPercent < 10) {
    return {
      tone: 'blue',
      badge: copy.advisor.growth,
      title: copy.advisor.weakGrowth.title,
      summary: copy.advisor.weakGrowth.summary(payYourselfPercent),
      action: copy.advisor.weakGrowth.action,
      impact: copy.advisor.weakGrowth.impact,
    };
  }

  return {
    tone: 'green',
    badge: copy.advisor.onTrack,
    title: copy.advisor.stable.title,
    summary: copy.advisor.stable.summary(Math.round((capital / Math.max(targetCapital, 1)) * 100)),
    action: copy.advisor.stable.action,
    impact: copy.advisor.stable.impact,
  };
};
