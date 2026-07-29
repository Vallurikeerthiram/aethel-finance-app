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
  
  // Projections
  projectionWithoutStepUp5Y: number;
  projectionWithStepUp5Y: number;
  wealthBoost5Y: number;
  
  projectionWithoutStepUp10Y: number;
  projectionWithStepUp10Y: number;
  wealthBoost10Y: number;

  lifestyleCreepAlert: string | null;
  actionableInsights: string[];
}

export async function calculateStepUpPlan(
  userIncome?: number,
  expectedSalaryHike: number = 8.0,
  targetSavingsRate: number = 30.0,
  personalInflationPct: number = 7.0,
  userStepUpOverride?: number
): Promise<StepUpRecommendationResult> {
  const transactions = await db.transactions.toArray();
  const investments = await db.investments.toArray();

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

  const monthlyExpenses = recentExpenseSum > 0 ? Math.round(recentExpenseSum / 3) : 45000;
  const perpetualMonthlyExpenses = perpetualSum > 0 ? Math.round(perpetualSum / 3) : 25000;
  const phaseBoundMonthlyExpenses = phaseBoundSum > 0 ? Math.round(phaseBoundSum / 3) : 15000;
  const emiMonthlyExpenses = emiSum > 0 ? Math.round(emiSum / 3) : 5000;

  const monthlyIncome = userIncome 
    ? Math.round(userIncome / 12) 
    : (recentIncomeSum > 0 ? Math.round(recentIncomeSum / 3) : 85000);
  
  const annualIncome = monthlyIncome * 12;

  let currentMonthlyInvestment = investments.reduce((acc, inv) => acc + (inv.sipMonthlyAmount || 0), 0);
  if (currentMonthlyInvestment === 0) {
    currentMonthlyInvestment = Math.max(monthlyIncome - monthlyExpenses, 15000);
  }

  const currentSavingsRate = Number(((currentMonthlyInvestment / monthlyIncome) * 100).toFixed(1));

  let recommendedStepUpPct = personalInflationPct + (expectedSalaryHike * 0.4);
  if (currentSavingsRate < targetSavingsRate) {
    recommendedStepUpPct += (targetSavingsRate - currentSavingsRate) * 0.4;
  }
  
  recommendedStepUpPct = Math.min(Math.max(Number(recommendedStepUpPct.toFixed(1)), 5.0), 35.0);

  const activeStepUpPct = userStepUpOverride !== undefined ? userStepUpOverride : recommendedStepUpPct;
  const recommendedNextMonthlyInvestment = Math.round(currentMonthlyInvestment * (1 + activeStepUpPct / 100));
  const additionalMonthlyNeeded = recommendedNextMonthlyInvestment - currentMonthlyInvestment;

  const annualReturnRate = 0.12;

  const calculateWealth = (initialMonthly: number, stepUpAnnualPct: number, years: number) => {
    let totalPortfolio = investments.reduce((acc, inv) => acc + (inv.currentValue || 0), 0);
    let monthlyInvest = initialMonthly;

    for (let yr = 1; yr <= years; yr++) {
      for (let m = 1; m <= 12; m++) {
        totalPortfolio = (totalPortfolio + monthlyInvest) * (1 + annualReturnRate / 12);
      }
      monthlyInvest = monthlyInvest * (1 + stepUpAnnualPct / 100);
    }
    return Math.round(totalPortfolio);
  };

  const projectionWithoutStepUp5Y = calculateWealth(currentMonthlyInvestment, 0, 5);
  const projectionWithStepUp5Y = calculateWealth(currentMonthlyInvestment, activeStepUpPct, 5);
  const wealthBoost5Y = projectionWithStepUp5Y - projectionWithoutStepUp5Y;

  const projectionWithoutStepUp10Y = calculateWealth(currentMonthlyInvestment, 0, 10);
  const projectionWithStepUp10Y = calculateWealth(currentMonthlyInvestment, activeStepUpPct, 10);
  const wealthBoost10Y = projectionWithStepUp10Y - projectionWithoutStepUp10Y;

  let lifestyleCreepAlert: string | null = null;
  if (personalInflationPct > expectedSalaryHike) {
    lifestyleCreepAlert = `WARNING: Personal inflation (${personalInflationPct}%) is higher than your expected salary hike (${expectedSalaryHike}%). Step up your investments to preserve purchasing power!`;
  }

  const insights: string[] = [
    `Your Phase-Bound expenses (Rent & Child Fees) total $${phaseBoundMonthlyExpenses.toLocaleString()}/mo. These disappear post-retirement/village move!`,
    `Increasing your monthly investment by ${activeStepUpPct}% (+$${additionalMonthlyNeeded.toLocaleString()}/mo) adds $${wealthBoost5Y.toLocaleString()} to your 5-year net worth!`,
    `Personal inflation at ${personalInflationPct}% requires your investments to step up by at least ${Math.ceil(personalInflationPct)}% annually.`
  ];

  const planConfig: StepUpPlanConfig = {
    id: 'active-stepup-plan',
    currentAnnualIncome: annualIncome,
    expectedSalaryHikePercent: expectedSalaryHike,
    currentMonthlyExpenses: monthlyExpenses,
    perpetualMonthlyExpenses,
    phaseBoundMonthlyExpenses,
    emiMonthlyExpenses,
    currentMonthlyInvestment: currentMonthlyInvestment,
    targetSavingsRatePercent: targetSavingsRate,
    recommendedStepUpPercent: recommendedStepUpPct,
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
    recommendedStepUpPercent: recommendedStepUpPct,
    recommendedNextMonthlyInvestment,
    additionalMonthlyInvestmentNeeded: additionalMonthlyNeeded,
    projectionWithoutStepUp5Y,
    projectionWithStepUp5Y,
    wealthBoost5Y,
    projectionWithoutStepUp10Y,
    projectionWithStepUp10Y,
    wealthBoost10Y,
    lifestyleCreepAlert,
    actionableInsights: insights
  };
}
