import { db } from './db';
import { StepUpPlanConfig } from '../types';

export interface StepUpRecommendationResult {
  currentAnnualIncome: number;
  currentMonthlyExpenses: number;
  perpetualMonthlyExpenses: number;
  phaseBoundMonthlyExpenses: number;
  emiMonthlyExpenses: number;
  currentMonthlyInvestment: number;
  currentSavingsRatePercent: number;
  personalInflationPercent: number;
  expectedSalaryHikePercent: number;
  
  recommendedStepUpPercent: number;
  recommendedNextMonthlyInvestment: number;
  additionalMonthlyInvestmentNeeded: number;
  
  projectionWithoutStepUp5Y: number;
  projectionWithStepUp5Y: number;
  wealthBoost5Y: number;
  
  projectionWithoutStepUp10Y: number;
  projectionWithStepUp10Y: number;
  wealthBoost10Y: number;

  lifestyleCreepAlert: string | null;
  actionableInsights: string[];
  hasHistory: boolean;
}

export async function calculateStepUpPlan(
  userIncome?: number,
  expectedSalaryHike: number = 8.0,
  targetSavingsRate: number = 30.0,
  personalInflationPct: number = 0.0,
  userStepUpOverride?: number
): Promise<StepUpRecommendationResult> {
  const transactions = await db.transactions.toArray();
  const investments = await db.investments.toArray();

  const hasHistory = transactions.length > 0 || investments.length > 0;

  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 3600 * 1000);

  let recentExpenseSum = 0;
  let recentIncomeSum = 0;
  let perpetualSum = 0;
  let phaseBoundSum = 0;
  let emiSum = 0;

  transactions.forEach(tx => {
    const txDate = new Date(tx.date);
    if (txDate >= threeMonthsAgo) {
      if (tx.type === 'expense') {
        recentExpenseSum += tx.totalAmount;
        const nature = tx.expenseNature || 'Perpetual Lifestyle';
        if (nature === 'Perpetual Lifestyle') perpetualSum += tx.totalAmount;
        else if (nature === 'Phase-Bound Temporary') phaseBoundSum += tx.totalAmount;
        else if (nature === 'EMI / Debt') emiSum += tx.totalAmount;
      }
      if (tx.type === 'income') recentIncomeSum += tx.totalAmount;
    }
  });

  const monthlyExpenses = recentExpenseSum > 0 ? Number((recentExpenseSum / 3).toFixed(2)) : 0;
  const perpetualMonthlyExpenses = perpetualSum > 0 ? Number((perpetualSum / 3).toFixed(2)) : 0;
  const phaseBoundMonthlyExpenses = phaseBoundSum > 0 ? Number((phaseBoundSum / 3).toFixed(2)) : 0;
  const emiMonthlyExpenses = emiSum > 0 ? Number((emiSum / 3).toFixed(2)) : 0;

  const monthlyIncome = userIncome 
    ? Number((userIncome / 12).toFixed(2)) 
    : (recentIncomeSum > 0 ? Number((recentIncomeSum / 3).toFixed(2)) : 0);
  
  const annualIncome = monthlyIncome * 12;

  let currentMonthlyInvestment = investments.reduce((acc, inv) => acc + (inv.sipMonthlyAmount || inv.totalInvested || 0), 0);

  const currentSavingsRate = monthlyIncome > 0 
    ? Number(((currentMonthlyInvestment / monthlyIncome) * 100).toFixed(2))
    : 0;

  // Step-Up Calculation: ONLY calculated if user has income / investment data
  let recommendedStepUpPct = 0;
  if (hasHistory && (currentMonthlyInvestment > 0 || monthlyIncome > 0)) {
    recommendedStepUpPct = personalInflationPct + (expectedSalaryHike * 0.4);
    if (currentSavingsRate > 0 && currentSavingsRate < targetSavingsRate) {
      recommendedStepUpPct += (targetSavingsRate - currentSavingsRate) * 0.4;
    }
    recommendedStepUpPct = Math.min(Math.max(Number(recommendedStepUpPct.toFixed(2)), 0.0), 35.0);
  }

  const activeStepUpPct = userStepUpOverride !== undefined ? userStepUpOverride : recommendedStepUpPct;
  const recommendedNextMonthlyInvestment = currentMonthlyInvestment > 0 
    ? Number((currentMonthlyInvestment * (1 + activeStepUpPct / 100)).toFixed(2))
    : 0;
  
  const additionalMonthlyNeeded = Number((recommendedNextMonthlyInvestment - currentMonthlyInvestment).toFixed(2));

  const annualReturnRate = 0.12;

  const calculateWealth = (initialMonthly: number, stepUpAnnualPct: number, years: number) => {
    if (initialMonthly === 0) return 0;
    let totalPortfolio = investments.reduce((acc, inv) => acc + (inv.totalInvested || 0), 0);
    let monthlyInvest = initialMonthly;

    for (let yr = 1; yr <= years; yr++) {
      for (let m = 1; m <= 12; m++) {
        totalPortfolio = (totalPortfolio + monthlyInvest) * (1 + annualReturnRate / 12);
      }
      monthlyInvest = monthlyInvest * (1 + stepUpAnnualPct / 100);
    }
    return Number(totalPortfolio.toFixed(2));
  };

  const projectionWithoutStepUp5Y = calculateWealth(currentMonthlyInvestment, 0, 5);
  const projectionWithStepUp5Y = calculateWealth(currentMonthlyInvestment, activeStepUpPct, 5);
  const wealthBoost5Y = Number((projectionWithStepUp5Y - projectionWithoutStepUp5Y).toFixed(2));

  const projectionWithoutStepUp10Y = calculateWealth(currentMonthlyInvestment, 0, 10);
  const projectionWithStepUp10Y = calculateWealth(currentMonthlyInvestment, activeStepUpPct, 10);
  const wealthBoost10Y = Number((projectionWithStepUp10Y - projectionWithoutStepUp10Y).toFixed(2));

  let lifestyleCreepAlert: string | null = null;
  if (hasHistory && personalInflationPct > expectedSalaryHike) {
    lifestyleCreepAlert = `WARNING: Personal inflation (${personalInflationPct.toFixed(2)}%) is higher than expected salary hike (${expectedSalaryHike.toFixed(2)}%). Step up investments to preserve purchasing power!`;
  }

  const insights: string[] = hasHistory ? [
    `Phase-Bound expenses (Rent & Child Fees) total $${phaseBoundMonthlyExpenses.toLocaleString()}/mo. These disappear post-retirement/village move!`,
    `Increasing monthly investment by ${activeStepUpPct.toFixed(2)}% (+$${additionalMonthlyNeeded.toLocaleString()}/mo) adds $${wealthBoost5Y.toLocaleString()} to 5-year wealth!`,
    `Personal inflation at ${personalInflationPct.toFixed(2)}% requires annual step-ups to prevent purchasing power degradation.`
  ] : [
    'Log your monthly income, investments, and expenses in the Vault tab to activate personalized wealth projections.'
  ];

  const planConfig: StepUpPlanConfig = {
    id: 'active-stepup-plan',
    currentAnnualIncome: annualIncome,
    expectedSalaryHikePercent: expectedSalaryHike,
    currentMonthlyExpenses: monthlyExpenses,
    perpetualMonthlyExpenses,
    phaseBoundMonthlyExpenses,
    emiMonthlyExpenses,
    currentMonthlyInvestment,
    targetSavingsRatePercent: targetSavingsRate,
    recommendedStepUpPercent: activeStepUpPct,
    userSetStepUpPercent: activeStepUpPct,
    nextYearMonthlyInvestment: recommendedNextMonthlyInvestment,
    projected5YearNetWorth: projectionWithStepUp5Y,
    projected10YearNetWorth: projectionWithStepUp10Y,
    lifestyleInflationAlert: lifestyleCreepAlert,
    updatedAt: new Date().toISOString()
  };

  await db.stepUpPlan.put(planConfig);

  return {
    currentAnnualIncome: annualIncome,
    currentMonthlyExpenses: monthlyExpenses,
    perpetualMonthlyExpenses,
    phaseBoundMonthlyExpenses,
    emiMonthlyExpenses,
    currentMonthlyInvestment,
    currentSavingsRatePercent: currentSavingsRate,
    personalInflationPercent: personalInflationPct,
    expectedSalaryHikePercent: expectedSalaryHike,
    recommendedStepUpPercent: Number(activeStepUpPct.toFixed(2)),
    recommendedNextMonthlyInvestment,
    additionalMonthlyInvestmentNeeded: additionalMonthlyNeeded,
    projectionWithoutStepUp5Y,
    projectionWithStepUp5Y,
    wealthBoost5Y,
    projectionWithoutStepUp10Y,
    projectionWithStepUp10Y,
    wealthBoost10Y,
    lifestyleCreepAlert,
    actionableInsights: insights,
    hasHistory
  };
}
