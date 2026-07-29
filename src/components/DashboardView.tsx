import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  Sparkles, 
  PieChart as PieIcon, 
  Wallet, 
  Zap, 
  Plus, 
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Shield,
  Layers,
  Clock,
  CreditCard
} from 'lucide-react';
import { db } from '../services/db';
import { TransactionItem, InvestmentAsset, UserSettings } from '../types';
import { recalculatePersonalInflation, InflationAnalysisResult } from '../services/inflationEngine';
import { calculateStepUpPlan, StepUpRecommendationResult } from '../services/stepupEngine';
import { parseNaturalLanguageLog } from '../services/aiAgent';

interface Props {
  settings: UserSettings;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<Props> = ({ settings, onNavigateTab }) => {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [investments, setInvestments] = useState<InvestmentAsset[]>([]);
  const [inflationData, setInflationData] = useState<InflationAnalysisResult | null>(null);
  const [stepUpData, setStepUpData] = useState<StepUpRecommendationResult | null>(null);
  
  const [quickInputText, setQuickInputText] = useState('');
  const [quickLogSuccess, setQuickLogSuccess] = useState(false);

  const currency = settings.currencySymbol;

  useEffect(() => {
    loadDashboardData();
  }, [settings]);

  const loadDashboardData = async () => {
    const txList = await db.transactions.toArray();
    const invList = await db.investments.toArray();
    
    setTransactions(txList);
    setInvestments(invList);

    const inf = await recalculatePersonalInflation(settings.marketCPIBenchmarkPercent);
    setInflationData(inf);

    const step = await calculateStepUpPlan(undefined, 8.0, 30.0, inf.personalInflationPercent);
    setStepUpData(step);
  };

  const handleQuickLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInputText.trim()) return;

    const parsed = parseNaturalLanguageLog(quickInputText);
    const newTx: TransactionItem = {
      id: `tx-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      type: 'expense',
      category: parsed.category,
      expenseNature: parsed.expenseNature,
      bankCreditCard: parsed.bankCreditCard,
      cityLocation: parsed.cityLocation,
      itemName: parsed.itemName,
      unitPrice: parsed.unitPrice,
      quantity: parsed.quantity,
      quantityUnit: parsed.quantityUnit,
      totalAmount: parsed.totalAmount,
      storeMerchant: parsed.storeMerchant,
      paymentMethod: parsed.paymentMethod,
      createdAt: new Date().toISOString()
    };

    await db.transactions.put(newTx);
    setQuickInputText('');
    setQuickLogSuccess(true);
    setTimeout(() => setQuickLogSuccess(false), 3000);
    loadDashboardData();
  };

  // Portfolio & Financial Stats
  const totalInvestmentValue = investments.reduce((sum, i) => sum + i.currentValue, 0);
  const totalInvested = investments.reduce((sum, i) => sum + i.totalInvested, 0);
  const totalGain = totalInvestmentValue - totalInvested;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyExpenses = transactions
    .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
    .reduce((sum, t) => sum + t.totalAmount, 0);

  const monthlyIncome = transactions
    .filter(t => t.type === 'income' && t.date.startsWith(currentMonth))
    .reduce((sum, t) => sum + t.totalAmount, 0) || 8500;

  // Expense Nature Totals
  let perpetualSum = 0;
  let phaseBoundSum = 0;
  let emiSum = 0;

  transactions.filter(t => t.type === 'expense').forEach(t => {
    const nature = t.expenseNature || 'Perpetual Lifestyle';
    if (nature === 'Perpetual Lifestyle') perpetualSum += t.totalAmount;
    else if (nature === 'Phase-Bound Temporary') phaseBoundSum += t.totalAmount;
    else if (nature === 'EMI / Debt') emiSum += t.totalAmount;
  });

  const netWorth = totalInvestmentValue + (monthlyIncome - monthlyExpenses);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner & Quick Log */}
      <div className="glass-card-glow" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Sparkles size={20} color="#8b5cf6" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px' }}>
                On-Device Financial Advisor Active
              </span>
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Wealth & Expense Manager</h1>
          </div>

          <button className="btn-primary" onClick={() => onNavigateTab('ai-advisor')}>
            <Zap size={18} />
            <span>Ask Financial Advisor</span>
          </button>
        </div>

        {/* Natural Language Quick Input Bar */}
        <form onSubmit={handleQuickLog} style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="⚡ Quick Log e.g. 'Paid 25000 rent for Bangalore flat via HDFC' or 'Bought 500g coffee for 450'"
            value={quickInputText}
            onChange={(e) => setQuickInputText(e.target.value)}
            style={{ flex: 1, padding: '14px 18px', background: 'rgba(9, 10, 15, 0.7)' }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '14px 24px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
            <Plus size={20} />
            <span className="desktop-only">Log Expense</span>
          </button>
        </form>

        {quickLogSuccess && (
          <div style={{ marginTop: '10px', color: '#34d399', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} />
            <span>Parsed & logged transaction with expense nature classification!</span>
          </div>
        )}
      </div>

      {/* Key Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        
        {/* Net Worth Card */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>ESTIMATED NET WORTH</span>
            <Wallet size={20} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
            {currency}{netWorth.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUpRight size={14} />
            <span>Investments + Liquid Cash</span>
          </div>
        </div>

        {/* Investment Portfolio Card */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>INVESTMENT PORTFOLIO</span>
            <PieIcon size={20} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24', marginBottom: '6px' }}>
            {currency}{totalInvestmentValue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.8rem', color: totalGain >= 0 ? '#34d399' : '#fb7185', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {totalGain >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            <span>{totalGain >= 0 ? '+' : ''}{currency}{totalGain.toLocaleString()} ({totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(1) : 0}%)</span>
          </div>
        </div>

        {/* Personal Inflation Rate Card */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #f43f5e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>YOUR PERSONAL INFLATION</span>
            <Flame size={20} color="#f43f5e" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fb7185', marginBottom: '6px' }}>
            {inflationData ? `${inflationData.personalInflationPercent}%` : 'Calculating...'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Official CPI: <strong>{settings.marketCPIBenchmarkPercent}%</strong>
          </div>
        </div>

        {/* Step-Up Target Card */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>NEXT-YEAR STEP-UP TARGET</span>
            <TrendingUp size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', marginBottom: '6px' }}>
            {stepUpData ? `+${stepUpData.recommendedStepUpPercent}%` : '+15%'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Target Monthly: <strong>{currency}{stepUpData?.recommendedNextMonthlyInvestment.toLocaleString()}</strong>
          </div>
        </div>

      </div>

      {/* Expense Nature Structural Breakdown Grid */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={20} color="#8b5cf6" />
          <span>Expense Nature Structural Analysis</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          
          {/* Perpetual */}
          <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} />
              <span>PERPETUAL LIFESTYLE EXPENSES</span>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', margin: '6px 0' }}>
              {currency}{perpetualSum.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Food, Utilities, Health & Entertainment (Inflates over lifetime)
            </div>
          </div>

          {/* Phase-Bound */}
          <div style={{ padding: '16px', background: 'rgba(244, 63, 94, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
            <div style={{ fontSize: '0.8rem', color: '#fb7185', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} />
              <span>PHASE-BOUND TEMPORARY (RENT & CHILD FEES)</span>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', margin: '6px 0' }}>
              {currency}{phaseBoundSum.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#fb7185', fontWeight: 600 }}>
              💡 Disappears when moving to village home or post-retirement!
            </div>
          </div>

          {/* EMI & Debt */}
          <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <div style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CreditCard size={14} />
              <span>EMI & DEBT SERVICING</span>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', margin: '6px 0' }}>
              {currency}{emiSum.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Car/Home Loan & Mobile EMIs (Ends after loan tenure)
            </div>
          </div>

        </div>
      </div>

      {/* Intelligence & Analytics Insights Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Personal Inflation Breakdown Card */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={20} color="#f43f5e" />
              <span>Personal Inflation Hikes</span>
            </h3>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => onNavigateTab('inflation')}>
              Full History
            </button>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
            {inflationData?.summaryText || 'Analyzing granular item price hikes across repeat purchases...'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {inflationData?.highestPriceHikes.slice(0, 3).map((item, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                background: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-sm)'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.itemName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{item.category} • {item.unit}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#fb7185', fontSize: '0.95rem' }}>+{item.changePercent}%</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currency}{item.oldPrice} ➔ {currency}{item.newPrice}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next-Year Step-Up Wealth Booster Card */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} color="#10b981" />
              <span>5-Year Wealth Booster</span>
            </h3>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => onNavigateTab('step-up')}>
              Simulator
            </button>
          </div>

          <div style={{
            padding: '16px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600, marginBottom: '4px' }}>
              5-YEAR WEALTH BOOST WITH STEP-UP
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc' }}>
              +{currency}{stepUpData?.wealthBoost5Y.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Projected 5Y Net Worth: <strong>{currency}{stepUpData?.projectionWithStepUp5Y.toLocaleString()}</strong>
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Stepping up your monthly SIP to {currency}{stepUpData?.recommendedNextMonthlyInvestment.toLocaleString()} counters your {inflationData?.personalInflationPercent}% personal inflation rate!
          </div>
        </div>

      </div>

      {/* Recent Logged Expenses */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Recent Logged Expenses</h3>
          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => onNavigateTab('expenses')}>
            View All Expenses
          </button>
        </div>

        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            No expenses logged yet. Use the quick bar above to log purchases.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {transactions.slice(0, 5).map(tx => (
              <div key={tx.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: tx.type === 'expense' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: tx.type === 'expense' ? '#fb7185' : '#34d399',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}>
                    {tx.itemName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{tx.itemName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                      {tx.date} • {tx.category} • {tx.bankCreditCard || 'HDFC Card'} {tx.cityLocation ? `• ${tx.cityLocation}` : ''}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>
                    -{currency}{tx.totalAmount.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                    {tx.expenseNature || 'Perpetual'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
