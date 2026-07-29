import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, AlertCircle, ArrowUpRight, Sparkles, Sliders, DollarSign, Calculator } from 'lucide-react';
import { calculateStepUpPlan, StepUpRecommendationResult } from '../services/stepupEngine';
import { recalculatePersonalInflation } from '../services/inflationEngine';
import { UserSettings } from '../types';

interface Props {
  settings: UserSettings;
}

export const StepUpPlannerView: React.FC<Props> = ({ settings }) => {
  const [stepUpData, setStepUpData] = useState<StepUpRecommendationResult | null>(null);
  
  // Controls
  const [incomeInput, setIncomeInput] = useState<string>('100000');
  const [salaryHikeInput, setSalaryHikeInput] = useState<string>('8.0');
  const [targetSavingsRateInput, setTargetSavingsRateInput] = useState<string>('30.0');
  const [userStepUpOverride, setUserStepUpOverride] = useState<number | undefined>(undefined);

  const currency = settings.currencySymbol;

  useEffect(() => {
    runSimulator();
  }, [incomeInput, salaryHikeInput, targetSavingsRateInput, userStepUpOverride, settings]);

  const runSimulator = async () => {
    const inf = await recalculatePersonalInflation(settings.marketCPIBenchmarkPercent);
    const inc = parseFloat(incomeInput) || 100000;
    const hike = parseFloat(salaryHikeInput) || 8.0;
    const savRate = parseFloat(targetSavingsRateInput) || 30.0;

    const res = await calculateStepUpPlan(inc, hike, savRate, inf.personalInflationPercent, userStepUpOverride);
    setStepUpData(res);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div className="glass-card-glow" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <TrendingUp size={22} color="#10b981" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#34d399', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Next-Year Wealth Step-Up Simulator
          </span>
        </div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Investment Step-Up Planner</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
          Calculate how stepping up your monthly investments annually counters personal inflation and exponentially accelerates your 5-year & 10-year net worth.
        </p>
      </div>

      {/* Simulator Inputs & Key Recommendation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Simulator Controls Card */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={20} color="#8b5cf6" />
            <span>Financial Controls</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                Annual Income ({currency})
              </label>
              <input
                type="number"
                className="form-input"
                value={incomeInput}
                onChange={(e) => setIncomeInput(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                  Expected Salary Hike %
                </label>
                <input
                  type="number"
                  step="0.5"
                  className="form-input"
                  value={salaryHikeInput}
                  onChange={(e) => setSalaryHikeInput(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                  Target Savings Rate %
                </label>
                <input
                  type="number"
                  step="1"
                  className="form-input"
                  value={targetSavingsRateInput}
                  onChange={(e) => setTargetSavingsRateInput(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                <span>Custom Step-Up Override Rate:</span>
                <span style={{ fontWeight: 700, color: '#34d399' }}>{stepUpData?.recommendedStepUpPercent}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
                value={userStepUpOverride !== undefined ? userStepUpOverride : (stepUpData?.recommendedStepUpPercent || 15)}
                onChange={(e) => setUserStepUpOverride(parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* AI Recommendation Summary */}
        <div className="glass-card" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(18, 20, 29, 0.8) 100%)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} color="#34d399" />
            <span>AI Recommended Target</span>
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>RECOMMENDED NEXT-YEAR STEP-UP</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#34d399' }}>
              +{stepUpData?.recommendedStepUpPercent}%
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Current Monthly Investment:</span>
              <span style={{ fontWeight: 700 }}>{currency}{stepUpData?.currentMonthlyInvestment.toLocaleString()}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <span style={{ color: '#34d399', fontWeight: 600 }}>Target Monthly Investment Next Year:</span>
              <span style={{ fontWeight: 800, color: '#34d399' }}>{currency}{stepUpData?.recommendedNextMonthlyInvestment.toLocaleString()}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Additional Contribution Needed:</span>
              <span style={{ fontWeight: 700, color: '#fbbf24' }}>+{currency}{stepUpData?.additionalMonthlyInvestmentNeeded.toLocaleString()}/month</span>
            </div>
          </div>
        </div>

      </div>

      {/* 5-Year & 10-Year Wealth Projection Comparison Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* 5-Year Comparison */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>5-Year Wealth Impact</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '14px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>WITHOUT STEP-UP (FLAT INVESTMENTS)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '4px' }}>
                {currency}{stepUpData?.projectionWithoutStepUp5Y.toLocaleString()}
              </div>
            </div>

            <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
              <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>WITH +{stepUpData?.recommendedStepUpPercent}% ANNUAL STEP-UP</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
                {currency}{stepUpData?.projectionWithStepUp5Y.toLocaleString()}
              </div>
            </div>

            <div style={{ padding: '10px 14px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: 'var(--radius-sm)', color: '#fbbf24', fontWeight: 700, fontSize: '0.9rem', textAlign: 'center' }}>
              🎉 Wealth Boost: +{currency}{stepUpData?.wealthBoost5Y.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 10-Year Comparison */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>10-Year Compounding Wealth</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '14px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>WITHOUT STEP-UP</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '4px' }}>
                {currency}{stepUpData?.projectionWithoutStepUp10Y.toLocaleString()}
              </div>
            </div>

            <div style={{ padding: '14px', background: 'rgba(139, 92, 246, 0.15)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(139, 92, 246, 0.4)' }}>
              <div style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600 }}>WITH +{stepUpData?.recommendedStepUpPercent}% ANNUAL STEP-UP</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
                {currency}{stepUpData?.projectionWithStepUp10Y.toLocaleString()}
              </div>
            </div>

            <div style={{ padding: '10px 14px', background: 'rgba(139, 92, 246, 0.2)', borderRadius: 'var(--radius-sm)', color: '#c084fc', fontWeight: 700, fontSize: '0.9rem', textAlign: 'center' }}>
              🚀 10Y Wealth Boost: +{currency}{stepUpData?.wealthBoost10Y.toLocaleString()}
            </div>
          </div>
        </div>

      </div>

      {/* Actionable Insights List */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>AI Wealth Strategy Insights</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {stepUpData?.actionableInsights.map((insight, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <Sparkles size={16} color="#8b5cf6" style={{ marginTop: '3px', flexShrink: 0 }} />
              <span>{insight}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
