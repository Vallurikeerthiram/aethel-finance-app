import { db } from './db';
import { InflationItemTracker, TransactionItem } from '../types';

export interface InflationAnalysisResult {
  personalInflationPercent: number;
  officialCpiBenchmarkPercent: number;
  inflationGapPercent: number;
  trackedItemsCount: number;
  highestPriceHikes: {
    itemName: string;
    category: string;
    oldPrice: number;
    newPrice: number;
    changePercent: number;
    unit: string;
  }[];
  categoryInflationMap: Record<string, number>;
  summaryText: string;
  isEnoughData: boolean;
}

export async function recalculatePersonalInflation(officialCpiBenchmark: number = 5.2): Promise<InflationAnalysisResult> {
  const allTransactions = await db.transactions.toArray();

  // Group transactions by item name to track price evolution
  const itemMap: Record<string, TransactionItem[]> = {};

  allTransactions.forEach(tx => {
    if (tx.type === 'expense' && tx.itemName && tx.unitPrice && tx.unitPrice > 0) {
      const key = tx.itemName.toLowerCase().trim();
      if (!itemMap[key]) itemMap[key] = [];
      itemMap[key].push(tx);
    }
  });

  const updatedTrackers: InflationItemTracker[] = [];
  const hikes: InflationAnalysisResult['highestPriceHikes'] = [];
  const categoryChanges: Record<string, { totalPct: number; count: number }> = {};

  let totalWeightedInflationSum = 0;
  let validTrackedCount = 0;

  for (const [key, txList] of Object.entries(itemMap)) {
    if (txList.length < 2) continue; // Need at least 2 entries across time

    txList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const first = txList[0];
    const latest = txList[txList.length - 1];

    const daysApart = (new Date(latest.date).getTime() - new Date(first.date).getTime()) / (1000 * 3600 * 24);
    if (daysApart < 7) continue;

    const oldPrice = first.unitPrice || (first.totalAmount / (first.quantity || 1));
    const newPrice = latest.unitPrice || (latest.totalAmount / (latest.quantity || 1));

    if (!oldPrice || oldPrice <= 0) continue;

    const priceChangePct = ((newPrice - oldPrice) / oldPrice) * 100;
    const yearsApart = Math.max(daysApart / 365, 0.1);
    const annualizedChangePct = priceChangePct / yearsApart;

    totalWeightedInflationSum += annualizedChangePct;
    validTrackedCount++;

    const category = first.category || 'Groceries & Food';
    if (!categoryChanges[category]) categoryChanges[category] = { totalPct: 0, count: 0 };
    categoryChanges[category].totalPct += annualizedChangePct;
    categoryChanges[category].count++;

    hikes.push({
      itemName: first.itemName,
      category: category,
      oldPrice: Number(oldPrice.toFixed(2)),
      newPrice: Number(newPrice.toFixed(2)),
      changePercent: Number(priceChangePct.toFixed(2)),
      unit: first.quantityUnit || 'unit'
    });

    const tracker: InflationItemTracker = {
      id: `inf-${key}`,
      itemName: first.itemName,
      category: category,
      quantityUnit: first.quantityUnit || 'unit',
      baselineDate: first.date,
      baselineUnitPrice: oldPrice,
      currentDate: latest.date,
      currentUnitPrice: newPrice,
      priceHistory: txList.map(t => ({
        date: t.date,
        unitPrice: t.unitPrice || (t.totalAmount / (t.quantity || 1)),
        storeMerchant: t.storeMerchant
      })),
      personalInflationPercent: Number(annualizedChangePct.toFixed(2))
    };

    updatedTrackers.push(tracker);
  }

  if (updatedTrackers.length > 0) {
    await db.inflationItems.bulkPut(updatedTrackers);
  }

  const isEnoughData = validTrackedCount > 0;
  // If zero repeat data, personal inflation is 0.00% (NO HARDCODED MAGIC FALLBACK NUMBERS)
  const personalInflation = isEnoughData 
    ? Number((totalWeightedInflationSum / validTrackedCount).toFixed(2))
    : 0.00;

  const inflationGap = Number((personalInflation - officialCpiBenchmark).toFixed(2));

  hikes.sort((a, b) => b.changePercent - a.changePercent);

  const categoryInflationMap: Record<string, number> = {};
  for (const [cat, val] of Object.entries(categoryChanges)) {
    categoryInflationMap[cat] = Number((val.totalPct / val.count).toFixed(2));
  }

  let summaryText = '';
  if (!isEnoughData) {
    summaryText = `Log repeat item purchases over at least 1 month to calculate your personalized inflation rate baseline. Currently benchmarked to official CPI (${officialCpiBenchmark.toFixed(2)}%).`;
  } else if (inflationGap > 0) {
    summaryText = `Your personal inflation is ${personalInflation.toFixed(2)}%, which is ${inflationGap.toFixed(2)}% HIGHER than official CPI (${officialCpiBenchmark.toFixed(2)}%). Cost drivers: ${hikes.slice(0, 2).map(h => h.itemName).join(' & ')}.`;
  } else {
    summaryText = `Your personal inflation is ${personalInflation.toFixed(2)}%, below official CPI benchmark (${officialCpiBenchmark.toFixed(2)}%). Excellent efficiency!`;
  }

  return {
    personalInflationPercent: personalInflation,
    officialCpiBenchmarkPercent: Number(officialCpiBenchmark.toFixed(2)),
    inflationGapPercent: inflationGap,
    trackedItemsCount: validTrackedCount,
    highestPriceHikes: hikes.slice(0, 6),
    categoryInflationMap,
    summaryText,
    isEnoughData
  };
}
