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

  const amountMatch = text.match(/(?:[\$₹€£]|\bUSD|\bINR)?\s*(\d+(?:\.\d{1,2})?)\s*(?:[\$₹€£]|\bUSD|\bINR)?/i);
  const totalAmount = amountMatch ? parseFloat(amountMatch[1]) : 0;

  const qtyMatch = text.match(/(\d+(?:\.\d{1,2})?)\s*(g|kg|gram|grams|liter|litres|l|ml|pack|packs|box|units|month|x)\b/i);
  let quantity = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
  let quantityUnit = qtyMatch ? qtyMatch[2].toLowerCase() : 'unit';

  let bankCreditCard = 'HDFC Bank Account';
  if (lower.includes('hdfc regalia') || lower.includes('hdfc card')) bankCreditCard = 'HDFC Regalia Credit Card';
  else if (lower.includes('icici card') || lower.includes('amazon pay')) bankCreditCard = 'ICICI Amazon Pay Credit Card';
  else if (lower.includes('icici bank')) bankCreditCard = 'ICICI Bank Account';
  else if (lower.includes('sbi')) bankCreditCard = 'SBI Savings Account';
  else if (lower.includes('axis')) bankCreditCard = 'Axis Bank Credit Card';
  else if (lower.includes('upi') || lower.includes('gpay') || lower.includes('phonepe')) bankCreditCard = 'UPI / GPay / PhonePe';
  else if (lower.includes('cash')) bankCreditCard = 'Cash';

  let cityLocation = undefined;
  const cityMatch = text.match(/(?:in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
  if (cityMatch && !['Walmart', 'Costco', 'Target', 'Starbucks', 'Amazon'].includes(cityMatch[1])) {
    cityLocation = cityMatch[1];
  } else if (lower.includes('bangalore') || lower.includes('bengaluru')) cityLocation = 'Bangalore';
  else if (lower.includes('hyderabad')) cityLocation = 'Hyderabad';
  else if (lower.includes('mumbai')) cityLocation = 'Mumbai';
  else if (lower.includes('village')) cityLocation = 'Village Home';

  const storeMatch = text.match(/(?:from|at|@)\s+([A-Za-z0-9\s]+?)(?:\s+(?:for|costing|paid|via|\$|₹|in)|$)/i);
  const storeMerchant = storeMatch ? storeMatch[1].trim() : undefined;

  let category: ExpenseCategory = 'Groceries & Food';
  let expenseNature: ExpenseNature = 'Perpetual Lifestyle';

  if (lower.includes('rent') || lower.includes('lease')) {
    category = 'Rent & Lease';
    expenseNature = 'Phase-Bound Temporary';
  } else if (lower.includes('child') || lower.includes('school') || lower.includes('tuition') || lower.includes('college fee')) {
    category = 'Child Fees & Schooling';
    expenseNature = 'Phase-Bound Temporary';
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
 * On-Device Financial Advisor AI Core focused strictly on Investments vs Fixed Expenses + Insurance
 */
export async function queryAiAdvisor(userQuery: string): Promise<string> {
  const settings = await getOrInitSettings();

  if (settings.geminiApiKey && settings.geminiApiKey.trim().length > 10) {
    try {
      const cloudResponse = await queryGeminiCloud(userQuery, settings.geminiApiKey);
      if (cloudResponse) return cloudResponse;
    } catch (e) {
      console.warn('Gemini cloud API fallback:', e);
    }
  }

  const transactions = await db.transactions.toArray();
  const investments = await db.investments.toArray();
  const insurancePolicies = await db.insurancePolicies.toArray();
  
  const inflationData = await recalculatePersonalInflation(settings.marketCPIBenchmarkPercent);
  const stepUpData = await calculateStepUpPlan(undefined, 8.0, 30.0, inflationData.personalInflationPercent);

  const symbol = settings.currencySymbol;

  let perpetualSum = 0;
  let phaseBoundSum = 0;
  let emiSum = 0;

  transactions.filter(t => t.type === 'expense').forEach(t => {
    const nature = t.expenseNature || 'Perpetual Lifestyle';
    if (nature === 'Perpetual Lifestyle') perpetualSum += t.totalAmount;
    else if (nature === 'Phase-Bound Temporary') phaseBoundSum += t.totalAmount;
    else if (nature === 'EMI / Debt') emiSum += t.totalAmount;
  });

  const totalAnnualInsurance = insurancePolicies.reduce((sum, p) => sum + p.annualPremium, 0);
  const monthlyInsurance = Math.round(totalAnnualInsurance / 12);

  const monthlyFixedAndInsurance = perpetualSum + monthlyInsurance;
  const monthlyInvestmentSum = investments.reduce((sum, i) => sum + (i.sipMonthlyAmount || i.totalInvested), 0);

  const isDoingGreat = monthlyInvestmentSum >= monthlyFixedAndInsurance;

  return `📊 **Financial Manager Executive Advisor Report**:

💰 **Monthly Investments vs Fixed & Insurance Commitments**:
- **Monthly Investments Contribution**: **${symbol}${monthlyInvestmentSum.toLocaleString()}**
- **Monthly Fixed Lifestyle Expenses**: **${symbol}${perpetualSum.toLocaleString()}**
- **Monthly Insurance Premium Amortization** (${insurancePolicies.length} policies): **${symbol}${monthlyInsurance.toLocaleString()}** (Total Annual: ${symbol}${totalAnnualInsurance.toLocaleString()})
- **Total Fixed Obligations (Fixed + Insurance)**: **${symbol}${monthlyFixedAndInsurance.toLocaleString()}**
- **Phase-Bound Temporary Costs (Rent & Child Fees)**: **${symbol}${phaseBoundSum.toLocaleString()}** *(Disappears when moving to village home or post-retirement)*

🔥 **Personal Inflation Growth Impact**:
- Your fixed perpetual expenses & items are inflating at **${inflationData.personalInflationPercent}%** per year.

📢 **Financial Advisor Verdict**:
${isDoingGreat 
  ? `✅ **EXCELLENT FINANCIAL DISCIPLINE!** Your monthly investment contribution (${symbol}${monthlyInvestmentSum.toLocaleString()}) exceeds your total fixed lifestyle & insurance commitments (${symbol}${monthlyFixedAndInsurance.toLocaleString()}). Keep stepping up your investments by +${stepUpData.recommendedStepUpPercent}% annually to stay ahead of inflation!` 
  : `⚠️ **STEP-UP RECOMMENDED!** Your fixed expenses inflated by ${inflationData.personalInflationPercent}%. To outpace your fixed obligations (${symbol}${monthlyFixedAndInsurance.toLocaleString()}), step up your monthly investments to **${symbol}${stepUpData.recommendedNextMonthlyInvestment.toLocaleString()}** next year.`}`;
}

async function queryGeminiCloud(userQuery: string, apiKey: string): Promise<string | null> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Act as a personal financial manager. User Query: "${userQuery}". Give concise markdown advice on investments vs fixed expenses.` }] }]
    })
  });

  if (!response.ok) return null;
  const resData = await response.json();
  return resData.candidates?.[0]?.content?.parts?.[0]?.text || null;
}
