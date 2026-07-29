import React, { useState, useEffect } from 'react';
import { Flame, AlertTriangle, TrendingUp, RefreshCw, Sliders } from 'lucide-react';
import { recalculatePersonalInflation, InflationAnalysisResult } from '../services/inflationEngine';
import { saveSettings } from '../services/db';
import { UserSettings } from '../types';

interface Props {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
}

export const PersonalInflationView: React.FC<Props> = ({ settings, onUpdateSettings }) => {
  const [inflationResult, setInflationResult] = useState<InflationAnalysisResult | null>(null);
  const [cpiInput, setCpiInput] = useState<string>(String(settings.marketCPIBenchmarkPercent));
  const [isUpdatingCpi, setIsUpdatingCpi] = useState(false);

  const currency = settings.currencySymbol;

  useEffect(() => {
    runAnalysis();
  }, [settings]);

  const runAnalysis = async () => {
    const res = await recalculatePersonalInflation(settings.marketCPIBenchmarkPercent);
    setInflationResult(res);
  };

  const handleUpdateCpi = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(cpiInput);
    if (isNaN(val)) return;

    const newSet = { ...settings, marketCPIBenchmarkPercent: val };
    await saveSettings(newSet);
    onUpdateSettings(newSet);
    setIsUpdatingCpi(false);
    runAnalysis();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner */}
      <div className="glass-card-glow" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Flame size={22} color="#fb7185" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fb7185', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Personal Inflation Intelligence Engine
              </span>
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Market CPI vs Personal Cost Engine</h1>
          </div>

          <button className="btn-secondary" onClick={() => setIsUpdatingCpi(!isUpdatingCpi)}>
            <Sliders size={16} />
            <span>CPI Benchmark: {settings.marketCPIBenchmarkPercent}%</span>
          </button>
        </div>

        {isUpdatingCpi && (
          <form onSubmit={handleUpdateCpi} style={{ marginTop: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="number"
              step="0.1"
              className="form-input"
              style={{ maxWidth: '180px' }}
              value={cpiInput}
              onChange={(e) => setCpiInput(e.target.value)}
              placeholder="e.g. 5.2"
            />
            <button type="submit" className="btn-primary" style={{ padding: '10px 16px' }}>Set Market CPI</button>
          </form>
        )}
      </div>

      {/* Main Gauge Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* Personal Rate */}
        <div className="glass-card" style={{ padding: '24px', borderTop: '4px solid #f43f5e' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>YOUR PERSONAL INFLATION RATE</div>
          <div style={{ fontSize: '2.8rem', fontWeight: 800, color: '#fb7185' }}>
            {inflationResult ? `${inflationResult.personalInflationPercent}%` : '—'}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', marginTop: '8px' }}>
            Calculated from {inflationResult?.trackedItemsCount || 0} repeat item purchases logged over time.
          </p>
        </div>

        {/* Market Benchmark */}
        <div className="glass-card" style={{ padding: '24px', borderTop: '4px solid #38bdf8' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>OFFICIAL MARKET CPI BENCHMARK</div>
          <div style={{ fontSize: '2.8rem', fontWeight: 800, color: '#38bdf8' }}>
            {settings.marketCPIBenchmarkPercent}%
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', marginTop: '8px' }}>
            National average Consumer Price Index baseline.
          </p>
        </div>

        {/* Inflation Gap */}
        <div className="glass-card" style={{ padding: '24px', borderTop: '4px solid #f59e0b' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>REAL INFLATION GAP</div>
          <div style={{ fontSize: '2.8rem', fontWeight: 800, color: '#fbbf24' }}>
            {inflationResult?.inflationGapPercent && inflationResult.inflationGapPercent >= 0 ? `+${inflationResult.inflationGapPercent}%` : `${inflationResult?.inflationGapPercent}%`}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', marginTop: '8px' }}>
            {inflationResult?.inflationGapPercent && inflationResult.inflationGapPercent > 0 
              ? 'Your expenses are inflating FASTER than official government CPI statistics!'
              : 'Your spending is below national CPI average.'}
          </p>
        </div>

      </div>

      {/* Item Price Hikes Table */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={20} color="#f43f5e" />
          <span>Granular Commodity & Item Price Hikes</span>
        </h3>

        {!inflationResult || inflationResult.highestPriceHikes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            Log repeat item purchases (e.g. Milk, Gasoline, Electricity, Coffee) across multiple dates to build your historical inflation tracking basket!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 18px' }}>Item Name</th>
                  <th style={{ padding: '14px 18px' }}>Category</th>
                  <th style={{ padding: '14px 18px' }}>Unit</th>
                  <th style={{ padding: '14px 18px' }}>Original Price</th>
                  <th style={{ padding: '14px 18px' }}>Current Price</th>
                  <th style={{ padding: '14px 18px' }}>Price Hike %</th>
                </tr>
              </thead>
              <tbody>
                {inflationResult.highestPriceHikes.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 600 }}>{item.itemName}</td>
                    <td style={{ padding: '14px 18px' }}><span className="badge badge-cyan">{item.category}</span></td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>{item.unit}</td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>{currency}{item.oldPrice}</td>
                    <td style={{ padding: '14px 18px', fontWeight: 600 }}>{currency}{item.newPrice}</td>
                    <td style={{ padding: '14px 18px', fontWeight: 800, color: '#fb7185' }}>+{item.changePercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
