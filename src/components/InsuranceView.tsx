import React, { useState, useEffect } from 'react';
import { Plus, Shield, ShieldCheck, AlertCircle, Edit2, Trash2, Calendar, CreditCard, DollarSign } from 'lucide-react';
import { db } from '../services/db';
import { InsurancePolicy, UserSettings } from '../types';

interface Props {
  settings: UserSettings;
}

export const InsuranceView: React.FC<Props> = ({ settings }) => {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<InsurancePolicy | null>(null);

  // Form State
  const [policyName, setPolicyName] = useState('');
  const [insuranceType, setInsuranceType] = useState<InsurancePolicy['insuranceType']>('Life Insurance');
  const [provider, setProvider] = useState('');
  const [sumAssured, setSumAssured] = useState('');
  const [annualPremium, setAnnualPremium] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState<InsurancePolicy['paymentFrequency']>('Annual');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [bankCreditCardUsed, setBankCreditCardUsed] = useState('HDFC Regalia Credit Card');
  const [notes, setNotes] = useState('');

  const currency = settings.currencySymbol;
  const bankCardsList = settings.customBankCards || [];

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    const list = await db.insurancePolicies.toArray();
    setPolicies(list);
  };

  const handleOpenAddModal = () => {
    setEditingPolicy(null);
    setPolicyName('');
    setInsuranceType('Life Insurance');
    setProvider('');
    setSumAssured('');
    setAnnualPremium('');
    setPaymentFrequency('Annual');
    setDueDate(new Date().toISOString().slice(0, 10));
    setBankCreditCardUsed(bankCardsList[0] || 'HDFC Regalia Credit Card');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: InsurancePolicy) => {
    setEditingPolicy(p);
    setPolicyName(p.policyName);
    setInsuranceType(p.insuranceType);
    setProvider(p.provider);
    setSumAssured(String(p.sumAssured));
    setAnnualPremium(String(p.annualPremium));
    setPaymentFrequency(p.paymentFrequency);
    setDueDate(p.dueDate);
    setBankCreditCardUsed(p.bankCreditCardUsed || bankCardsList[0]);
    setNotes(p.notes || '');
    setIsModalOpen(true);
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyName || !annualPremium || !sumAssured) return;

    const item: InsurancePolicy = {
      id: editingPolicy ? editingPolicy.id : `ins-${Date.now()}`,
      policyName,
      insuranceType,
      provider: provider || 'Insurance Provider',
      sumAssured: parseFloat(sumAssured),
      annualPremium: parseFloat(annualPremium),
      paymentFrequency,
      dueDate,
      bankCreditCardUsed,
      notes: notes || undefined
    };

    await db.insurancePolicies.put(item);
    setIsModalOpen(false);
    loadPolicies();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this insurance policy entry?')) {
      await db.insurancePolicies.delete(id);
      loadPolicies();
    }
  };

  const totalSumAssured = policies.reduce((sum, p) => sum + p.sumAssured, 0);
  const totalAnnualPremium = policies.reduce((sum, p) => sum + p.annualPremium, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Insurance Policies & Risk Coverage</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Track Life, Health, Vehicle & Property insurance premiums, renewal due dates, and coverage.
            </p>
          </div>

          <button className="btn-primary" onClick={handleOpenAddModal}>
            <Plus size={18} />
            <span>Add Insurance Policy</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>TOTAL COVERAGE / SUM ASSURED</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
            {currency}{totalSumAssured.toLocaleString()}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>TOTAL ANNUAL PREMIUM</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fb7185', marginTop: '4px' }}>
            {currency}{totalAnnualPremium.toLocaleString()}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>ACTIVE POLICIES</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
            {policies.length} Policies
          </div>
        </div>
      </div>

      {/* Policies List Table */}
      <div className="glass-card" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '14px 18px' }}>Policy Name</th>
              <th style={{ padding: '14px 18px' }}>Type</th>
              <th style={{ padding: '14px 18px' }}>Provider</th>
              <th style={{ padding: '14px 18px' }}>Sum Assured</th>
              <th style={{ padding: '14px 18px' }}>Premium</th>
              <th style={{ padding: '14px 18px' }}>Due Date</th>
              <th style={{ padding: '14px 18px' }}>Bank / Card</th>
              <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {policies.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No insurance policies logged yet. Click 'Add Insurance Policy' to log your Life, Health or Vehicle covers.
                </td>
              </tr>
            ) : (
              policies.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 600 }}>{p.policyName}</td>
                  <td style={{ padding: '14px 18px' }}><span className="badge badge-emerald">{p.insuranceType}</span></td>
                  <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>{p.provider}</td>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: '#38bdf8' }}>{currency}{p.sumAssured.toLocaleString()}</td>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: '#fb7185' }}>{currency}{p.annualPremium.toLocaleString()}/yr</td>
                  <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>{p.dueDate}</td>
                  <td style={{ padding: '14px 18px', color: 'var(--text-subtle)' }}>{p.bankCreditCardUsed || '—'}</td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn-secondary" style={{ padding: '6px 10px' }} onClick={() => handleOpenEditModal(p)}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn-secondary" style={{ padding: '6px 10px', color: '#fb7185' }} onClick={() => handleDelete(p.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Policy Modal */}
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
              {editingPolicy ? 'Edit Insurance Policy' : 'Add Insurance Policy'}
            </h2>

            <form onSubmit={handleSavePolicy} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Policy Name *</label>
                <input type="text" className="form-input" placeholder="e.g. LIC Tech Term, Star Health Mediclaim" value={policyName} onChange={(e) => setPolicyName(e.target.value)} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Insurance Type</label>
                  <select className="form-input" value={insuranceType} onChange={(e) => setInsuranceType(e.target.value as any)}>
                    <option value="Life Insurance">Life Insurance</option>
                    <option value="Health Insurance">Health Insurance</option>
                    <option value="Vehicle Insurance">Vehicle Insurance</option>
                    <option value="Property Insurance">Property Insurance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Insurance Provider</label>
                  <input type="text" className="form-input" placeholder="HDFC ERGO, LIC, Star Health" value={provider} onChange={(e) => setProvider(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Sum Assured ({currency}) *</label>
                  <input type="number" className="form-input" placeholder="1000000" value={sumAssured} onChange={(e) => setSumAssured(e.target.value)} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Annual Premium ({currency}) *</label>
                  <input type="number" className="form-input" placeholder="12000" value={annualPremium} onChange={(e) => setAnnualPremium(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Next Due / Renewal Date</label>
                  <input type="date" className="form-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Bank / Credit Card</label>
                  <select className="form-input" value={bankCreditCardUsed} onChange={(e) => setBankCreditCardUsed(e.target.value)}>
                    {bankCardsList.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Policy</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
