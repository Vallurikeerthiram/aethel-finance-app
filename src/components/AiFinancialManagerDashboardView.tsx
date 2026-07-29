import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Flame, 
  Sparkles, 
  PieChart as PieIcon, 
  Wallet, 
  Zap, 
  ShieldCheck,
  Clock,
  CreditCard,
  Building,
  Award,
  Layers,
  CheckCircle2,
  AlertTriangle,
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

  // Aggregates: Strictly tracking how much is invested (NO RETURN % NONSENSE)
  const totalInvestedSum = investments.reduce((sum, i) => sum + i.totalInvested, 0);
  const monthlyInvestmentSum = investments.reduce((sum, i) => sum + (i.sipMonthlyAmount || i.totalInvested), 0);

  // Expense Nature Totals
  let perpetualSum = 0;
  let phaseBoundSum = 0; // Rent & Child Fees
  let emiSum = 0;

  transactions.filter(t => t.type === 'expense').forEach(t => {
    const nature = t.expenseNature || 'Perpetual Lifestyle';
    if (nature === 'Perpetual Lifestyle') perpetualSum += t.totalAmount;
    else if (nature === 'Phase-Bound Temporary') phaseBoundSum += t.totalAmount;
    else if (nature === 'EMI / Debt') emiSum += t.totalAmount;
  });

  // Insurance monthly amortization (Annual Premium / 12)
  const totalAnnualInsurance = policies.reduce((sum, p) => sum + p.annualPremium, 0);
  const monthlyInsurance = Math.round(totalAnnualInsurance / 12);
  const totalFixedAndInsurance = perpetualSum + monthlyInsurance;

  const isDoingGreat = monthlyInvestmentSum >= totalFixedAndInsurance;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner */}
      <div className="glass-card-glow" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Sparkles size={20} color="#8b5cf6" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Financial Manager Engine
              </span>
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Investments vs Fixed Expenses Manager</h1>
          </div>

          <button className="btn-primary" onClick={onNavigateEntry}>
            <Wallet size={18} />
            <span>+ Log Entry / Vault</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid: No Return Nonsense */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
        
        {/* Monthly Investment */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #38bdf8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>MONTHLY INVESTING</span>
            <PieIcon size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', marginBottom: '4px' }}>
            {currency}{monthlyInvestmentSum.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Invested: {currency}{totalInvestedSum.toLocaleString()}</div>
        </div>

        {/* Fixed Expenses + Insurance Amortization */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>FIXED + INSURANCE / MONTH</span>
            <ShieldCheck size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginBottom: '4px' }}>
            {currency}{totalFixedAndInsurance.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fixed Lifestyle ({currency}{perpetualSum}) + Insurance ({currency}{monthlyInsurance}/mo)</div>
        </div>

        {/* Personal Inflation */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #f43f5e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>PERSONAL INFLATION</span>
            <Flame size={18} color="#f43f5e" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fb7185', marginBottom: '4px' }}>
            {inflationData ? `${Number(inflationData.personalInflationPercent).toFixed(1)}%` : 'Calculating...'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Market CPI Baseline: {settings.marketCPIBenchmarkPercent}%</div>
        </div>

        {/* Recommended Step-Up Target */}
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>NEXT-YEAR STEP-UP</span>
            <TrendingUp size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24', marginBottom: '4px' }}>
            +{stepUpData ? stepUpData.recommendedStepUpPercent : 15}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Monthly: {currency}{stepUpData?.recommendedNextMonthlyInvestment.toLocaleString()}</div>
        </div>

      </div>

      {/* Visual Chart: Monthly Investments vs Fixed Expenses + Insurance */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={20} color="#38bdf8" />
          <span>Monthly Investments vs Fixed & Insurance Growth</span>
        </h3>

        {/* SVG Graphic Comparison Chart */}
        <div style={{ padding: '20px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '12px', fontWeight: 600 }}>
            <div style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }}></span>
              <span>Monthly Investment Contribution: {currency}{monthlyInvestmentSum.toLocaleString()}/mo</span>
            </div>
            <div style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }}></span>
              <span>Fixed Costs + Insurance Amortization: {currency}{totalFixedAndInsurance.toLocaleString()}/mo</span>
            </div>
          </div>

          {/* Simple Visual Bar Comparison */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '16px 0' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span>Investments Contribution</span>
                <span>{currency}{monthlyInvestmentSum.toLocaleString()}</span>
              </div>
              <div style={{ height: '14px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '7px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min((monthlyInvestmentSum / Math.max(monthlyInvestmentSum + totalFixedAndInsurance, 1)) * 100, 100)}%`,
                  background: 'linear-gradient(90deg, #38bdf8 0%, #6366f1 100%)',
                  borderRadius: '7px',
                  transition: 'width 0.5s'
                }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span>Fixed Lifestyle + Insurance (Annual ÷ 12)</span>
                <span>{currency}{totalFixedAndInsurance.toLocaleString()}</span>
              </div>
              <div style={{ height: '14px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '7px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min((totalFixedAndInsurance / Math.max(monthlyInvestmentSum + totalFixedAndInsurance, 1)) * 100, 100)}%`,
                  background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                  borderRadius: '7px',
                  transition: 'width 0.5s'
                }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Structural Expense Nature Breakdown */}
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
            AI Financial Manager Verdict & Step-Up Advice
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
          <p>
            You are investing <strong>{currency}{monthlyInvestmentSum.toLocaleString()}/month</strong>. Your total fixed lifestyle expenses are <strong>{currency}{perpetualSum.toLocaleString()}/month</strong> and annual insurance commitments are <strong>{currency}{totalAnnualInsurance.toLocaleString()}</strong> ({currency}{monthlyInsurance}/month amortized).
          </p>

          <div style={{
            padding: '18px',
            background: isDoingGreat ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${isDoingGreat ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
            borderRadius: 'var(--radius-md)',
            color: '#f8fafc'
          }}>
            <div style={{ fontSize: '0.9rem', color: isDoingGreat ? '#34d399' : '#fb7185', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isDoingGreat ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <span>{isDoingGreat ? 'EXCELLENT FINANCIAL DISCIPLINE' : 'STEP-UP RECOMMENDED'}</span>
            </div>
            <div>
              {isDoingGreat 
                ? `You are doing great! Your monthly investment contributions (${currency}${monthlyInvestmentSum.toLocaleString()}) exceed your total fixed lifestyle & insurance costs (${currency}${totalFixedAndInsurance.toLocaleString()}). Step up your monthly investments by +${stepUpData?.recommendedStepUpPercent}% (Target: ${currency}${stepUpData?.recommendedNextMonthlyInvestment.toLocaleString()}/mo) next year to stay ahead of your ${inflationData?.personalInflationPercent}% personal inflation rate!`
                : `Your fixed expenses inflated by ${inflationData?.personalInflationPercent}%. To outpace your fixed obligations (${currency}${totalFixedAndInsurance.toLocaleString()}), step up your monthly investments to ${currency}${stepUpData?.recommendedNextMonthlyInvestment.toLocaleString()} next year.`}
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
            placeholder="Ask AI e.g. 'Compare my investments vs fixed costs' or 'How much is my monthly insurance commitment?'"
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
