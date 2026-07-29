import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Flame, 
  Sparkles, 
  PieChart as PieIcon, 
  Wallet, 
  Zap, 
  ShieldAlert,
  Clock,
  CreditCard,
  Building,
  Award,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Bot
} from 'lucide-react';
import { db } from '../services/db';
import { TransactionItem, InvestmentAsset, UserSettings, InsurancePolicy } from '../types';
import { recalculatePersonalInflation, InflationAnalysisResult } from '../services/inflationEngine';
import { calculateStepUpPlan, StepUpRecommendationResult } from '../services/stepupEngine';
import { queryAiAdvisor } from '../services/aiAgent';

interface Props {
  settings: UserSettings;
  onNavigateEntry: () => void;
}

export const AiFinancialManagerDashboardView: React.FC<Props> = ({ settings, onNavigateEntry }) => {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [investments, setInvestments] = useState<InvestmentAsset[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [inflationData, setInflationData] = useState<InflationAnalysisResult | null>(null);
  const [stepUpData, setStepUpData] = useState<StepUpRecommendationResult | null>(null);
  
  const [aiQueryInput, setAiQueryInput] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const currency = settings.currencySymbol;

  useEffect(() => {
    loadDashboardData();
  }, [settings]);

  const loadDashboardData = async () => {
    const txList = await db.transactions.toArray();
    const invList = await db.investments.toArray();
    const polList = await db.insurancePolicies.toArray();
    
    setTransactions(txList);
    setInvestments(invList);
    setPolicies(polList);

    const inf = await recalculatePersonalInflation(settings.marketCPIBenchmarkPercent);
    setInflationData(inf);

    const step = await calculateStepUpPlan(undefined, 8.0, 30.0, inf.personalInflationPercent);
    setStepUpData(step);
  };

  const handleAskAiManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQueryInput.trim() || isAiLoading) return;

    setIsAiLoading(true);
    try {
      const res = await queryAiAdvisor(aiQueryInput);
      setAiAnswer(res);
    } catch (err: any) {
      setAiAnswer(`Error: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Financial Statistics
  const totalInvestmentValue = investments.reduce((sum, i) => sum + i.currentValue, 0);
  const totalInvested = investments.reduce((sum, i) => sum + i.totalInvested, 0);
  const totalGain = totalInvestmentValue - totalInvested;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyExpenses = transactions
    .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
    .reduce((sum, t) => sum + t.totalAmount, 0);

  const monthlyIncome = transactions
    .filter(t => t.type === 'income' && t.date.startsWith(currentMonth))
    .reduce((sum, t) => sum + t.totalAmount, 0) || 85000;

  // Expense Nature Breakdown
  let perpetualSum = 0;
  let phaseBoundSum = 0; // Rent & Child Fees
  let emiSum = 0;

  transactions.filter(t => t.type === 'expense').forEach(t => {
    const nature = t.expenseNature || 'Perpetual Lifestyle';
    if (nature === 'Perpetual Lifestyle') perpetualSum += t.totalAmount;
    else if (nature === 'Phase-Bound Temporary') phaseBoundSum += t.totalAmount;
    else if (nature === 'EMI / Debt') emiSum += t.totalAmount;
  });

  const totalExpenseSum = perpetualSum + phaseBoundSum + emiSum;
  const netWorth = totalInvestmentValue + (monthlyIncome - monthlyExpenses);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner */}
      <div className="glass-card-glow" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Sparkles size={20} color="#8b5cf6" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px' }}>
                On-Device AI Financial Manager
              </span>
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Wealth & Financial Manager Command</h1>
          </div>

          <button className="btn-primary" onClick={onNavigateEntry}>
            <Wallet size={18} />
            <span>+ Log Entry / Vault</span>
          </button>
        </div>
      </div>

      {/* Metric Summary Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        
        {/* Net Worth */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>ESTIMATED NET WORTH</span>
            <Wallet size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
            {currency}{netWorth.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#34d399' }}>Investments + Cash Liquid</div>
        </div>

        {/* Investment Portfolio */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>PORTFOLIO VALUE</span>
            <PieIcon size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24', marginBottom: '4px' }}>
            {currency}{totalInvestmentValue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: totalGain >= 0 ? '#34d399' : '#fb7185' }}>
            {totalGain >= 0 ? '+' : ''}{currency}{totalGain.toLocaleString()} ({totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(1) : 0}%)
          </div>
        </div>

        {/* Personal Inflation */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #f43f5e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>PERSONAL INFLATION</span>
            <Flame size={18} color="#f43f5e" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fb7185', marginBottom: '4px' }}>
            {inflationData ? `${inflationData.personalInflationPercent}%` : 'Calculating...'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Market CPI: {settings.marketCPIBenchmarkPercent}%</div>
        </div>

        {/* Step-Up Target */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>RECOMMENDED STEP-UP</span>
            <TrendingUp size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginBottom: '4px' }}>
            {stepUpData ? `+${stepUpData.recommendedStepUpPercent}%` : '+15%'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Monthly: {currency}{stepUpData?.recommendedNextMonthlyInvestment.toLocaleString()}</div>
        </div>

      </div>

      {/* Structural Expense Nature Analysis (Perpetual vs Phase-Bound Rent/Child Fees vs EMI) */}
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

      {/* AI Financial Advisor Executive Master Report Card */}
      <div className="glass-card-glow" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(18, 20, 29, 0.9) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Award size={24} color="#a78bfa" />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>
            AI Financial Manager Report & Wealth Advice
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
          <p>
            You are earning an estimated <strong>{currency}{stepUpData?.currentAnnualIncome.toLocaleString()}/yr</strong>. Your total monthly outflow is <strong>{currency}{totalExpenseSum.toLocaleString()}</strong>, composed of:
          </p>
          <ul style={{ paddingLeft: '20px' }}>
            <li>🔄 <strong>Perpetual Food & Lifestyle</strong>: <strong>{currency}{perpetualSum.toLocaleString()}</strong> (Subject to your <strong>{inflationData?.personalInflationPercent}% personal inflation rate</strong>).</li>
            <li>⏳ <strong>Phase-Bound Temporary (Rent & Child Fees)</strong>: <strong>{currency}{phaseBoundSum.toLocaleString()}</strong> (<em>Financial Manager Note: Rent & Child Fees will completely vanish post-retirement or when moving to your village home!</em>).</li>
            <li>💳 <strong>EMI & Loans</strong>: <strong>{currency}{emiSum.toLocaleString()}</strong>.</li>
          </ul>

          <div style={{
            padding: '16px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: 'var(--radius-md)',
            color: '#f8fafc',
            marginTop: '6px'
          }}>
            <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 700, marginBottom: '4px' }}>
              🎯 ADVISOR ACTION PLAN
            </div>
            <div>
              Step up your monthly investment SIP by <strong>+{stepUpData?.recommendedStepUpPercent}%</strong> (Target: <strong>{currency}{stepUpData?.recommendedNextMonthlyInvestment.toLocaleString()}/mo</strong>) next year. This counters your personal inflation rate and will create an extra <strong>+{currency}{stepUpData?.wealthBoost5Y.toLocaleString()}</strong> in 5-year compounding wealth!
            </div>
          </div>
        </div>
      </div>

      {/* Interactive AI Manager Question Box */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={20} color="#8b5cf6" />
          <span>Ask AI Financial Manager</span>
        </h3>

        <form onSubmit={handleAskAiManager} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Ask AI e.g. 'Analyze my rent vs food expenses' or 'Why increase my SIP by 15%?'"
            value={aiQueryInput}
            onChange={(e) => setAiQueryInput(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn-primary" disabled={isAiLoading || !aiQueryInput.trim()}>
            <Send size={16} />
            <span>Ask Advisor</span>
          </button>
        </form>

        {aiAnswer && (
          <div style={{
            padding: '18px',
            background: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-glass)',
            whiteSpace: 'pre-wrap',
            fontSize: '0.95rem',
            lineHeight: '1.6'
          }}>
            {aiAnswer}
          </div>
        )}
      </div>

    </div>
  );
};
