import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, DollarSign, PieChart as PieIcon, ShieldAlert, Edit2, Trash2, ArrowUpRight, ArrowDownRight, Layers, Building } from 'lucide-react';
import { db } from '../services/db';
import { InvestmentAsset, AssetClass, UserSettings } from '../types';

interface Props {
  settings: UserSettings;
}

const ASSET_CLASSES: AssetClass[] = [
  'Stocks',
  'Mutual Funds / ETFs',
  'Crypto',
  'Gold & Metals',
  'Real Estate',
  'Fixed Deposit / Debt',
  'Emergency Cash',
  'Custom Asset'
];

export const InvestmentView: React.FC<Props> = ({ settings }) => {
  const [investments, setInvestments] = useState<InvestmentAsset[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<InvestmentAsset | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [platformWhere, setPlatformWhere] = useState('Zerodha / Broking');
  const [assetClass, setAssetClass] = useState<AssetClass>('Stocks');
  const [symbol, setSymbol] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalInvestedInput, setTotalInvestedInput] = useState('');
  const [currentValueInput, setCurrentValueInput] = useState('');
  const [sipMonthlyAmount, setSipMonthlyAmount] = useState('0');
  const [notes, setNotes] = useState('');

  const currency = settings.currencySymbol;

  useEffect(() => {
    loadInvestments();
  }, []);

  const loadInvestments = async () => {
    const list = await db.investments.toArray();
    setInvestments(list);
  };

  const handleOpenAddModal = () => {
    setEditingInv(null);
    setName('');
    setPlatformWhere('Zerodha / Broking');
    setAssetClass('Stocks');
    setSymbol('');
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setTotalInvestedInput('');
    setCurrentValueInput('');
    setSipMonthlyAmount('0');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (inv: InvestmentAsset) => {
    setEditingInv(inv);
    setName(inv.name);
    setPlatformWhere(inv.platformWhere || 'Zerodha');
    setAssetClass(inv.assetClass);
    setSymbol(inv.symbol || '');
    setPurchaseDate(inv.purchaseDate);
    setTotalInvestedInput(String(inv.totalInvested));
    setCurrentValueInput(String(inv.currentValue));
    setSipMonthlyAmount(String(inv.sipMonthlyAmount || 0));
    setNotes(inv.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !totalInvestedInput) return;

    const totInv = parseFloat(totalInvestedInput);
    const currVal = currentValueInput ? parseFloat(currentValueInput) : totInv;

    const item: InvestmentAsset = {
      id: editingInv ? editingInv.id : `inv-${Date.now()}`,
      name,
      platformWhere: platformWhere || 'Direct',
      assetClass,
      symbol: symbol || undefined,
      purchaseDate,
      buyPrice: totInv,
      quantity: 1,
      totalInvested: totInv,
      currentPrice: currVal,
      currentValue: currVal,
      expectedAnnualReturnRate: 12.0,
      dividendsEarned: 0,
      sipMonthlyAmount: parseFloat(sipMonthlyAmount) || 0,
      notes: notes || undefined,
      updatedAt: new Date().toISOString()
    };

    await db.investments.put(item);
    setIsModalOpen(false);
    loadInvestments();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this asset from portfolio?')) {
      await db.investments.delete(id);
      loadInvestments();
    }
  };

  // Portfolio aggregates
  const totalInvestedSum = investments.reduce((acc, i) => acc + i.totalInvested, 0);
  const totalCurrentSum = investments.reduce((acc, i) => acc + i.currentValue, 0);
  const totalProfit = totalCurrentSum - totalInvestedSum;
  const overallReturnPct = totalInvestedSum > 0 ? ((totalProfit / totalInvestedSum) * 100).toFixed(1) : '0';
  const totalMonthlySip = investments.reduce((acc, i) => acc + (i.sipMonthlyAmount || 0), 0);

  // Group by Asset Class
  const classBreakdown: Record<string, number> = {};
  investments.forEach(i => {
    classBreakdown[i.assetClass] = (classBreakdown[i.assetClass] || 0) + i.currentValue;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header & Add Button */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Multi-Asset Portfolio Tracker</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Log where, how much, and what category (Stocks, Mutual Funds, Gold, Real Estate, FDs, Crypto).
            </p>
          </div>

          <button className="btn-primary" onClick={handleOpenAddModal}>
            <Plus size={18} />
            <span>Add Asset / Investment</span>
          </button>
        </div>
      </div>

      {/* Portfolio Aggregates Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>TOTAL INVESTED</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
            {currency}{totalInvestedSum.toLocaleString()}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>CURRENT VALUE</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
            {currency}{totalCurrentSum.toLocaleString()}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>UNREALIZED PROFIT</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: totalProfit >= 0 ? '#34d399' : '#fb7185', marginTop: '4px' }}>
            {totalProfit >= 0 ? '+' : ''}{currency}{totalProfit.toLocaleString()} ({overallReturnPct}%)
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>TOTAL MONTHLY SIP</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
            {currency}{totalMonthlySip.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Asset Allocation Breakdown Cards */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={20} color="#8b5cf6" />
          <span>Asset Allocation</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {Object.entries(classBreakdown).map(([ac, val]) => {
            const pct = totalCurrentSum > 0 ? ((val / totalCurrentSum) * 100).toFixed(1) : '0';
            return (
              <div key={ac} style={{
                padding: '14px',
                background: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-glass)'
              }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ac}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: '4px 0' }}>{currency}{val.toLocaleString()}</div>
                <div style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600 }}>{pct}% of portfolio</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assets Table */}
      <div className="glass-card" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '14px 18px' }}>Investment Name</th>
              <th style={{ padding: '14px 18px' }}>Platform / Where</th>
              <th style={{ padding: '14px 18px' }}>Class</th>
              <th style={{ padding: '14px 18px' }}>Invested Amount</th>
              <th style={{ padding: '14px 18px' }}>Current Value</th>
              <th style={{ padding: '14px 18px' }}>Gain / Loss</th>
              <th style={{ padding: '14px 18px' }}>Monthly SIP</th>
              <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {investments.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No investments logged yet. Add your Stocks, Mutual Funds, Gold, Real Estate or Bank FDs.
                </td>
              </tr>
            ) : (
              investments.map(inv => {
                const gain = inv.currentValue - inv.totalInvested;
                const gainPct = inv.totalInvested > 0 ? ((gain / inv.totalInvested) * 100).toFixed(1) : '0';

                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 600 }}>{inv.name}</td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>
                      <Building size={14} style={{ display: 'inline', marginRight: '4px' }} />
                      {inv.platformWhere || 'Direct'}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>{inv.assetClass}</span>
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>{currency}{inv.totalInvested.toLocaleString()}</td>
                    <td style={{ padding: '14px 18px', fontWeight: 700 }}>{currency}{inv.currentValue.toLocaleString()}</td>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: gain >= 0 ? '#34d399' : '#fb7185' }}>
                      {gain >= 0 ? '+' : ''}{currency}{gain.toLocaleString()} ({gainPct}%)
                    </td>
                    <td style={{ padding: '14px 18px', color: '#38bdf8' }}>
                      {inv.sipMonthlyAmount ? `${currency}${inv.sipMonthlyAmount.toLocaleString()}/mo` : '—'}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn-secondary" style={{ padding: '6px 10px' }} onClick={() => handleOpenEditModal(inv)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn-secondary" style={{ padding: '6px 10px', color: '#fb7185' }} onClick={() => handleDelete(inv.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Investment Asset Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(9, 10, 15, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-card-glow animate-slide-up" style={{ maxWidth: '520px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '20px' }}>
              {editingInv ? 'Edit Investment' : 'Log Investment Entry'}
            </h2>

            <form onSubmit={handleSaveInvestment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Investment Name *</label>
                <input type="text" className="form-input" placeholder="e.g. Vanguard S&P 500 ETF, SBI Fixed Deposit" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Platform / Where</label>
                  <input type="text" className="form-input" placeholder="e.g. Zerodha, Groww, Post Office, Bank" value={platformWhere} onChange={(e) => setPlatformWhere(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Asset Class</label>
                  <select className="form-input" value={assetClass} onChange={(e) => setAssetClass(e.target.value as AssetClass)}>
                    {ASSET_CLASSES.map(ac => <option key={ac} value={ac}>{ac}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Invested Amount ({currency}) *</label>
                  <input type="number" step="0.01" className="form-input" placeholder="50000" value={totalInvestedInput} onChange={(e) => setTotalInvestedInput(e.target.value)} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Current Value ({currency})</label>
                  <input type="number" step="0.01" className="form-input" placeholder="Leave empty if same as invested" value={currentValueInput} onChange={(e) => setCurrentValueInput(e.target.value)} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Monthly SIP Amount ({currency})</label>
                <input type="number" className="form-input" placeholder="5000" value={sipMonthlyAmount} onChange={(e) => setSipMonthlyAmount(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Investment</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
