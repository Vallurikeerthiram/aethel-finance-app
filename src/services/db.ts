import Dexie, { Table } from 'dexie';
import { TransactionItem, InvestmentAsset, InflationItemTracker, StepUpPlanConfig, UserSettings, AiChatMessage, InsurancePolicy } from '../types';

export class FinanceAppDatabase extends Dexie {
  transactions!: Table<TransactionItem, string>;
  investments!: Table<InvestmentAsset, string>;
  insurancePolicies!: Table<InsurancePolicy, string>;
  inflationItems!: Table<InflationItemTracker, string>;
  stepUpPlan!: Table<StepUpPlanConfig, string>;
  settings!: Table<UserSettings, string>;
  aiMessages!: Table<AiChatMessage, string>;

  constructor() {
    super('AethelFinanceDB');
    this.version(2).stores({
      transactions: 'id, date, type, category, itemName, bankCreditCard, cityLocation, expenseNature, createdAt',
      investments: 'id, name, platformWhere, assetClass, purchaseDate, updatedAt',
      insurancePolicies: 'id, policyName, insuranceType, dueDate',
      inflationItems: 'id, itemName, category, baselineDate',
      stepUpPlan: 'id',
      settings: 'currencyCode',
      aiMessages: 'id, timestamp, sender'
    });
  }
}

export const db = new FinanceAppDatabase();

export const DEFAULT_CUSTOM_CATEGORIES = [
  'Groceries & Food',
  'Housing & Utilities',
  'Rent & Lease',
  'Child Fees & Schooling',
  'EMIs & Loans',
  'Insurance Premiums',
  'Transportation & Fuel',
  'Healthcare & Wellness',
  'Entertainment & Lifestyle',
  'Shopping & Goods',
  'Subscriptions & Tech',
  'Dining & Social',
  'Investments & Savings Outflow',
  'Miscellaneous'
];

export const DEFAULT_BANK_CARDS = [
  'HDFC Bank Account',
  'HDFC Regalia Credit Card',
  'ICICI Bank Account',
  'ICICI Amazon Pay Credit Card',
  'SBI Savings Account',
  'Axis Bank Credit Card',
  'UPI / GPay / PhonePe',
  'Cash'
];

export const DEFAULT_SETTINGS: UserSettings = {
  currencySymbol: '₹',
  currencyCode: 'INR',
  isSecurityEnabled: false,
  autoLockMinutes: 5,
  marketCPIBenchmarkPercent: 5.2,
  customCategories: DEFAULT_CUSTOM_CATEGORIES,
  customBankCards: DEFAULT_BANK_CARDS
};

export async function getOrInitSettings(): Promise<UserSettings> {
  const allSettings = await db.settings.toArray();
  if (allSettings.length === 0) {
    await db.settings.put(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  
  const saved = allSettings[0];
  // Ensure array defaults exist
  if (!saved.customCategories || saved.customCategories.length === 0) {
    saved.customCategories = DEFAULT_CUSTOM_CATEGORIES;
  }
  if (!saved.customBankCards || saved.customBankCards.length === 0) {
    saved.customBankCards = DEFAULT_BANK_CARDS;
  }
  return saved;
}

export async function saveSettings(newSettings: UserSettings): Promise<void> {
  await db.settings.clear();
  await db.settings.put(newSettings);
}
