import { db } from './db';

export async function populateSeedDataIfEmpty(): Promise<boolean> {
  // Started clean for personal usage (no sample test data auto-populated)
  return false;
}

export async function clearAllFinancialData(): Promise<void> {
  await db.transactions.clear();
  await db.investments.clear();
  await db.insurancePolicies.clear();
  await db.inflationItems.clear();
  await db.stepUpPlan.clear();
  await db.aiMessages.clear();
}
