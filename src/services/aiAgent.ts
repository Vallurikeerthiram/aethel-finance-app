import { db, getOrInitSettings } from './db';
import { TransactionItem, ExpenseCategory, ExpenseNature } from '../types';
import { recalculatePersonalInflation } from './inflationEngine';
import { calculateStepUpPlan } from './stepupEngine';

export interface ParsedQuickExpense {
  itemName: string;
  category: ExpenseCategory;
  totalAmount: number;
  unitPrice?: number;
  quantity?: number;
  quantityUnit?: string;
  storeMerchant?: string;
  paymentMethod?: string;
  bankCreditCard?: string;
  cityLocation?: string;
  expenseNature: ExpenseNature;
}

/**
 * Enhanced Natural Language AI Parser for granular expense entry
 */
export function parseNaturalLanguageLog(input: string): ParsedQuickExpense {
  const text = input.trim();
  const lower = text.toLowerCase();

  // Extract amount ($123, ₹123, 123 USD, 123$)
  const amountMatch = text.match(/(?:[\$₹€£]|\bUSD|\bINR)?\s*(\d+(?:\.\d{1,2})?)\s*(?:[\$₹€£]|\bUSD|\bINR)?/i);
  const totalAmount = amountMatch ? parseFloat(amountMatch[1]) : 0;

  // Infer quantity and units (500g, 2kg, 3 liters, 5 packs, 2x)
  const qtyMatch = text.match(/(\d+(?:\.\d{1,2})?)\s*(g|kg|gram|grams|liter|litres|l|ml|pack|packs|box|units|month|x)\b/i);
  let quantity = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
  let quantityUnit = qtyMatch ? qtyMatch[2].toLowerCase() : 'unit';

  // Infer Bank / Credit Card
  let bankCreditCard = 'HDFC Bank Account';
  if (lower.includes('hdfc regalia') || lower.includes('hdfc card')) bankCreditCard = 'HDFC Regalia Credit Card';
  else if (lower.includes('icici card') || lower.includes('amazon pay')) bankCreditCard = 'ICICI Amazon Pay Credit Card';
  else if (lower.includes('icici bank')) bankCreditCard = 'ICICI Bank Account';
  else if (lower.includes('sbi')) bankCreditCard = 'SBI Savings Account';
  else if (lower.includes('axis')) bankCreditCard = 'Axis Bank Credit Card';
  else if (lower.includes('upi') || lower.includes('gpay') || lower.includes('phonepe')) bankCreditCard = 'UPI / GPay / PhonePe';
  else if (lower.includes('cash')) bankCreditCard = 'Cash';

  // Infer City / Location
  let cityLocation = undefined;
  const cityMatch = text.match(/(?:in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
  if (cityMatch && !['Walmart', 'Costco', 'Target', 'Starbucks', 'Amazon'].includes(cityMatch[1])) {
    cityLocation = cityMatch[1];
  } else if (lower.includes('bangalore') || lower.includes('bengaluru')) cityLocation = 'Bangalore';
  else if (lower.includes('hyderabad')) cityLocation = 'Hyderabad';
  else if (lower.includes('mumbai')) cityLocation = 'Mumbai';
  else if (lower.includes('village')) cityLocation = 'Village Home';

  // Infer Store / Merchant
  const storeMatch = text.match(/(?:from|at|@)\s+([A-Za-z0-9\s]+?)(?:\s+(?:for|costing|paid|via|\$|₹|in)|$)/i);
  const storeMerchant = storeMatch ? storeMatch[1].trim() : undefined;

  // Infer Category & Expense Nature
  let category: ExpenseCategory = 'Groceries & Food';
  let expenseNature: ExpenseNature = 'Perpetual Lifestyle';

  if (lower.includes('rent') || lower.includes('lease')) {
    category = 'Rent & Lease';
    expenseNature = 'Phase-Bound Temporary'; // Will drop off when moving to village home
  } else if (lower.includes('child') || lower.includes('school') || lower.includes('tuition') || lower.includes('college fee')) {
    category = 'Child Fees & Schooling';
    expenseNature = 'Phase-Bound Temporary'; // Will drop off post retirement / school completion
  } else if (lower.includes('emi') || lower.includes('loan') || lower.includes('car emi') || lower.includes('home loan') || lower.includes('mobile emi')) {
    category = 'EMIs & Loans';
    expenseNature = 'EMI / Debt';
  } else if (lower.includes('insurance') || lower.includes('lic') || lower.includes('health insurance')) {
    category = 'Insurance Premiums';
    expenseNature = 'Perpetual Lifestyle';
  } else if (lower.includes('fuel') || lower.includes('petrol') || lower.includes('diesel') || lower.includes('uber') || lower.includes('taxi')) {
    category = 'Transportation & Fuel';
    expenseNature = 'Perpetual Lifestyle';
  } else if (lower.includes('electricity') || lower.includes('water') || lower.includes('internet') || lower.includes('gas')) {
    category = 'Housing & Utilities';
    expenseNature = 'Perpetual Lifestyle';
  } else if (lower.includes('doctor') || lower.includes('medicine') || lower.includes('gym')) {
    category = 'Healthcare & Wellness';
    expenseNature = 'Perpetual Lifestyle';
  } else if (lower.includes('coffee') || lower.includes('restaurant') || lower.includes('swiggy') || lower.includes('zomato')) {
    category = 'Dining & Social';
    expenseNature = 'Perpetual Lifestyle';
  } else if (lower.includes('stock') || lower.includes('invest') || lower.includes('sip') || lower.includes('mutual fund') || lower.includes('gold')) {
    category = 'Investments & Savings Outflow';
    expenseNature = 'Perpetual Lifestyle';
  }

  // Clean item name
  let itemName = text
    .replace(/(?:[\$₹€£]|\bUSD|\bINR)?\s*(\d+(?:\.\d{1,2})?)/gi, '')
    .replace(/(?:via|from|at|@|in)\s+[A-Za-z0-9\s]+/gi, '')
    .replace(/\b(bought|paid|spent|purchased|costing|for|fee|rent|emi)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!itemName || itemName.length < 2) {
    itemName = text.slice(0, 30);
  }
  itemName = itemName.charAt(0).toUpperCase() + itemName.slice(1);

  const unitPrice = totalAmount > 0 && quantity > 0 ? Number((totalAmount / quantity).toFixed(2)) : totalAmount;

  return {
    itemName,
    category,
    totalAmount,
    unitPrice,
    quantity,
    quantityUnit,
    storeMerchant,
    paymentMethod: 'Card / Online',
    bankCreditCard,
    cityLocation,
    expenseNature
  };
}

/**
 * On-Device Financial Advisor AI Core with Fixed vs Phase-Bound Analysis
 */
export async function queryAiAdvisor(userQuery: string): Promise<string> {
  const settings = await getOrInitSettings();

  // Gemini Cloud Fallback if API key present
  if (settings.geminiApiKey && settings.geminiApiKey.trim().length > 10) {
    try {
      const cloudResponse = await queryGeminiCloud(userQuery, settings.geminiApiKey);
      if (cloudResponse) return cloudResponse;
    } catch (e) {
      console.warn('Gemini cloud API fallback:', e);
    }
  }

  // On-Device Intelligence Engine
  const transactions = await db.transactions.toArray();
  const investments = await db.investments.toArray();
  const insurancePolicies = await db.insurancePolicies.toArray();
  
  const inflationData = await recalculatePersonalInflation(settings.marketCPIBenchmarkPercent);
  const stepUpData = await calculateStepUpPlan(undefined, 8.0, 30.0, inflationData.personalInflationPercent);

  const symbol = settings.currencySymbol;

  // Breakdown by Expense Nature
  let perpetualSum = 0;
  let phaseBoundSum = 0; // Rent & Child Fees
  let emiSum = 0;
  
  const bankCardSum: Record<string, number> = {};
  const citySum: Record<string, number> = {};

  transactions.filter(t => t.type === 'expense').forEach(t => {
    const nature = t.expenseNature || 'Perpetual Lifestyle';
    if (nature === 'Perpetual Lifestyle') perpetualSum += t.totalAmount;
    else if (nature === 'Phase-Bound Temporary') phaseBoundSum += t.totalAmount;
    else if (nature === 'EMI / Debt') emiSum += t.totalAmount;

    if (t.bankCreditCard) {
      bankCardSum[t.bankCreditCard] = (bankCardSum[t.bankCreditCard] || 0) + t.totalAmount;
    }
    if (t.cityLocation) {
      citySum[t.cityLocation] = (citySum[t.cityLocation] || 0) + t.totalAmount;
    }
  });

  const totalExpenseSum = perpetualSum + phaseBoundSum + emiSum;
  const totalInvestmentSum = investments.reduce((sum, i) => sum + i.currentValue, 0);
  const monthlySipSum = investments.reduce((sum, i) => sum + (i.sipMonthlyAmount || 0), 0);

  const lowerQuery = userQuery.toLowerCase();

  if (lowerQuery.includes('nature') || lowerQuery.includes('fixed') || lowerQuery.includes('rent') || lowerQuery.includes('child fee') || lowerQuery.includes('temporary') || lowerQuery.includes('perpetual')) {
    return `🏛️ **Expense Nature & Structural Analysis**:

1. 🔄 **Perpetual Lifestyle Expenses** (Food, Utilities, Dining, Health):
   - Total: **${symbol}${perpetualSum.toLocaleString()}** (${((perpetualSum / Math.max(totalExpenseSum, 1)) * 100).toFixed(1)}%)
   - *Insight*: These costs continue for life and will inflate at your **${inflationData.personalInflationPercent}% personal inflation rate**.

2. ⏳ **Phase-Bound / Temporary Expenses** (Rent, Child School Fees):
   - Total: **${symbol}${phaseBoundSum.toLocaleString()}** (${((phaseBoundSum / Math.max(totalExpenseSum, 1)) * 100).toFixed(1)}%)
   - *Financial Advisor Note*: **These are NOT permanent!** When you move to your village home or post-retirement when children complete school, this ${symbol}${phaseBoundSum.toLocaleString()} monthly cash drain disappears entirely!

3. 💳 **EMI & Debt Servicing**:
   - Total: **${symbol}${emiSum.toLocaleString()}** (${((emiSum / Math.max(totalExpenseSum, 1)) * 100).toFixed(1)}%)
   - *Insight*: EMIs end after tenure completion, unlocking additional monthly cashflow for investment step-ups!`;
  }

  // General Comprehensive Advisor Report
  return `📊 **Executive Financial Advisor Master Report**:

💰 **Income vs Spending vs Investment Cashflow**:
- **Estimated Annual Income**: **${symbol}${stepUpData.currentAnnualIncome.toLocaleString()}**
- **Monthly Expenses Total**: **${symbol}${totalExpenseSum.toLocaleString()}**
  - 🔄 **Perpetual Expenses (Food/Lifestyle)**: **${symbol}${perpetualSum.toLocaleString()}**
  - ⏳ **Phase-Bound (Rent/Child Fees)**: **${symbol}${phaseBoundSum.toLocaleString()}** *(Disappears post-retirement/village move)*
  - 💳 **EMIs & Debt Servicing**: **${symbol}${emiSum.toLocaleString()}**
- **Monthly Investment SIP Contribution**: **${symbol}${monthlySipSum.toLocaleString()}**
- **Total Investment Portfolio Value**: **${symbol}${totalInvestmentSum.toLocaleString()}** (${investments.length} assets tracked)

🔥 **Personalized Inflation Audit**:
- **Your Personal Inflation Rate**: **${inflationData.personalInflationPercent}%** (Market CPI Benchmark: ${settings.marketCPIBenchmarkPercent}%)
- **Primary Cost Increases**: ${inflationData.highestPriceHikes.slice(0, 2).map(h => `${h.itemName} (+${h.changePercent}%)`).join(', ') || 'Groceries & Fuel'}

🎯 **Financial Manager Advisor Recommendation**:
- *"Your Phase-Bound expenses (Rent & Child Fees) totaling **${symbol}${phaseBoundSum.toLocaleString()}** will naturally drop off over your retirement horizon. However, to offset your **${inflationData.personalInflationPercent}% personal inflation rate** on Perpetual expenses, **increase your monthly investment SIP by +${stepUpData.recommendedStepUpPercent}%** (Target: ${symbol}${stepUpData.recommendedNextMonthlyInvestment.toLocaleString()}/mo) next year!"*

💳 **Top Payment Methods / Banks Used**:
${Object.entries(bankCardSum).slice(0, 3).map(([bank, amt]) => `- **${bank}**: ${symbol}${amt.toLocaleString()}`).join('\n') || '- Log transactions with bank/card details to see instrument breakdown.'}`;
}

async function queryGeminiCloud(userQuery: string, apiKey: string): Promise<string | null> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Act as a senior personal financial advisor. User Query: "${userQuery}". Give concise markdown financial advice.` }] }]
    })
  });

  if (!response.ok) return null;
  const resData = await response.json();
  return resData.candidates?.[0]?.content?.parts?.[0]?.text || null;
}
