export type TransactionType = 'expense' | 'income';

export type ExpenseNature = 'Perpetual Lifestyle' | 'Phase-Bound Temporary' | 'EMI / Debt';

export type ExpenseCategory = 
  | 'Groceries & Food'
  | 'Housing & Utilities'
  | 'Rent & Lease'
  | 'Child Fees & Schooling'
  | 'EMIs & Loans'
  | 'Insurance Premiums'
  | 'Transportation & Fuel'
  | 'Healthcare & Wellness'
  | 'Entertainment & Lifestyle'
  | 'Shopping & Goods'
  | 'Subscriptions & Tech'
  | 'Dining & Social'
  | 'Investments & Savings Outflow'
  | 'Miscellaneous'
  | string;

export interface TransactionItem {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  category: ExpenseCategory;
  subCategory?: string;
  itemName: string;
  storeMerchant?: string;
  unitPrice?: number;
  quantity?: number;
  quantityUnit?: string; // g, kg, liter, month, unit, etc.
  totalAmount: number;
  paymentMethod?: string; // UPI, Cash, Card
  bankCreditCard?: string; // e.g. "HDFC Credit Card", "SBI Bank Account"
  cityLocation?: string; // e.g. "Bangalore", "Village Home", "Mumbai"
  expenseNature?: ExpenseNature; // Perpetual vs Phase-Bound vs EMI
  emiTenureMonthsRemaining?: number; // For EMIs
  tags?: string[];
  notes?: string;
  isRecurring?: boolean;
  createdAt: string;
}

export interface InsurancePolicy {
  id: string;
  policyName: string;
  insuranceType: 'Life Insurance' | 'Health Insurance' | 'Vehicle Insurance' | 'Property Insurance' | 'Other';
  provider: string; // e.g. HDFC ERGO, LIC, Star Health
  sumAssured: number;
  annualPremium: number;
  paymentFrequency: 'Annual' | 'Semi-Annual' | 'Quarterly' | 'Monthly';
  dueDate: string;
  bankCreditCardUsed?: string;
  notes?: string;
}

export type AssetClass = 
  | 'Stocks'
  | 'Mutual Funds / ETFs'
  | 'Crypto'
  | 'Gold & Metals'
  | 'Real Estate'
  | 'Fixed Deposit / Debt'
  | 'Emergency Cash'
  | 'Custom Asset';

export interface InvestmentAsset {
  id: string;
  name: string; // Asset / Fund Name
  platformWhere: string; // e.g. Zerodha, Groww, Bank FD, Post Office, Real Estate
  assetClass: AssetClass;
  symbol?: string;
  purchaseDate: string;
  buyPrice: number;
  quantity: number;
  totalInvested: number;
  currentPrice: number;
  currentValue: number;
  expectedAnnualReturnRate: number;
  dividendsEarned: number;
  sipMonthlyAmount?: number;
  notes?: string;
  updatedAt: string;
}

export interface PricePoint {
  date: string;
  unitPrice: number;
  storeMerchant?: string;
  cityLocation?: string;
}

export interface InflationItemTracker {
  id: string;
  itemName: string;
  category: string;
  quantityUnit: string; // e.g. "g", "kg", "liter", "pack", "month"
  baselineDate: string;
  baselineUnitPrice: number;
  currentDate: string;
  currentUnitPrice: number;
  priceHistory: PricePoint[];
  personalInflationPercent: number;
}

export interface StepUpPlanConfig {
  id?: string;
  currentAnnualIncome: number;
  expectedSalaryHikePercent: number;
  currentMonthlyExpenses: number;
  perpetualMonthlyExpenses: number;
  phaseBoundMonthlyExpenses: number;
  emiMonthlyExpenses: number;
  currentMonthlyInvestment: number;
  targetSavingsRatePercent: number;
  recommendedStepUpPercent: number;
  userSetStepUpPercent: number;
  nextYearMonthlyInvestment: number;
  projected5YearNetWorth: number;
  projected10YearNetWorth: number;
  lifestyleInflationAlert: string | null;
  updatedAt: string;
}

export interface UserSettings {
  currencySymbol: string;
  currencyCode: string;
  isSecurityEnabled: boolean;
  pinHash?: string;
  salt?: string;
  autoLockMinutes: number;
  marketCPIBenchmarkPercent: number;
  customCategories: string[];
  customBankCards: string[];
  githubGistToken?: string;
  githubGistId?: string;
  geminiApiKey?: string;
  lastSyncedAt?: string;
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  insightType?: 'inflation' | 'stepup' | 'spending' | 'budget' | 'investment';
  dataPayload?: any;
}
