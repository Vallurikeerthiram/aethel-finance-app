import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Receipt, 
  PieChart, 
  ShieldAlert, 
  DollarSign, 
  FolderPlus, 
  CheckCircle2, 
  Trash2, 
  Edit2, 
  Sparkles,
  CreditCard,
  Building,
  Clock,
  MapPin
} from 'lucide-react';
import { db, saveSettings } from '../services/db';
import { TransactionItem, InvestmentAsset, InsurancePolicy, ExpenseNature, UserSettings } from '../types';
import { parseNaturalLanguageLog } from '../services/aiAgent';
import { recalculatePersonalInflation } from '../services/inflationEngine';

interface Props {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onDataChange: () => void;
}

export const UnifiedDataEntryView: React.FC<Props> = ({ settings, onUpdateSettings, onDataChange }) => {
  const [activeSection, setActiveSection] = useState<'expense' | 'phase-bound' | 'emi' | 'investment' | 'insurance' | 'income'>('expense');
  
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [investments, setInvestments] = useState<InvestmentAsset[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  
  const [notification, setNotification] = useState<string | null>(null);

  // Custom Category Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // AI Quick Log Bar
  const [quickAiInput, setQuickAiInput] = useState('');

  // Form State: Expenses (Fixed Perpetual & Phase-Bound)
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<string>('Groceries & Food');
  const [expenseNature, setExpenseNature] = useState<ExpenseNature>('Perpetual Lifestyle');
  const [bankCreditCard, setBankCreditCard] = useState<string>('HDFC Bank Account');
  const [cityLocation, setCityLocation] = useState<string>('Bangalore');
  const [storeMerchant, setStoreMerchant] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [quantityUnit, setQuantityUnit] = useState('g');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  // Form State: Investments
  const [invName, setInvName] = useState('');
  const [invWhere, setInvWhere] = useState('Zerodha / Broking');
  const [invAssetClass, setInvAssetClass] = useState<any>('Stocks');
  const [invAmount, setInvAmount] = useState('');
  const [invSip, setInvSip] = useState('0');

  // Form State: Insurance
  const [insPolicyName, setInsPolicyName] = useState('');
  const [insType, setInsType] = useState<any>('Life Insurance');
  const [insProvider, setInsProvider] = useState('');
  const [insSumAssured, setInsSumAssured] = useState('');
  const [insPremium, setInsPremium] = useState('');
  const [insDueDate, setInsDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [insBank, setInsBank] = useState('HDFC Regalia Credit Card');

  // Form State: Income
  const [incomeSource, setIncomeSource] = useState('Salary Income');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeBank, setIncomeBank] = useState('HDFC Bank Account');

  const currency = settings.currencySymbol;
  const categoriesList = settings.customCategories || [];
  const bankCardsList = settings.customBankCards || [];

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const txList = await db.transactions.toArray();
    txList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(txList);

    const invList = await db.investments.toArray();
    setInvestments(invList);

    const polList = await db.insurancePolicies.toArray();
    setPolicies(polList);
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // 1. Save Expense (Perpetual, Phase-Bound, or EMI)
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !totalAmount) return;

    const tot = parseFloat(totalAmount);
    const qty = parseFloat(quantity) || 1;
    const unitP = Number((tot / qty).toFixed(2));

    let nature: ExpenseNature = expenseNature;
    if (activeSection === 'phase-bound') nature = 'Phase-Bound Temporary';
    else if (activeSection === 'emi') nature = 'EMI / Debt';

    const newTx: TransactionItem = {
      id: `tx-${Date.now()}`,
      date,
      type: 'expense',
      category: activeSection === 'phase-bound' ? (category || 'Rent & Lease') : (activeSection === 'emi' ? 'EMIs & Loans' : category),
      expenseNature: nature,
      bankCreditCard: bankCreditCard || bankCardsList[0],
      cityLocation: cityLocation || 'Bangalore',
      itemName,
      storeMerchant: storeMerchant || undefined,
      unitPrice: unitP,
      quantity: qty,
      quantityUnit,
      totalAmount: tot,
      createdAt: new Date().toISOString()
    };

    await db.transactions.put(newTx);
    await recalculatePersonalInflation(settings.marketCPIBenchmarkPercent);
    
    // Reset form
    setItemName('');
    setTotalAmount('');
    setStoreMerchant('');
    
    loadAllData();
    onDataChange();
    showToast(`Logged ${nature} expense: ${itemName} (${currency}${tot})`);
  };

  // 2. Save Investment
  const handleSaveInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName || !invAmount) return;

    const amt = parseFloat(invAmount);
    const item: InvestmentAsset = {
      id: `inv-${Date.now()}`,
      name: invName,
      platformWhere: invWhere || 'Direct',
      assetClass: invAssetClass,
      purchaseDate: date,
      buyPrice: amt,
      quantity: 1,
      totalInvested: amt,
      currentPrice: amt,
      currentValue: amt,
      expectedAnnualReturnRate: 12.0,
      dividendsEarned: 0,
      sipMonthlyAmount: parseFloat(invSip) || 0,
      updatedAt: new Date().toISOString()
    };

    await db.investments.put(item);
    setInvName('');
    setInvAmount('');
    setInvSip('0');

    loadAllData();
    onDataChange();
    showToast(`Logged Investment: ${invName} (${currency}${amt}) at ${invWhere}`);
  };

  // 3. Save Insurance Policy
  const handleSaveInsurance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!insPolicyName || !insPremium || !insSumAssured) return;

    const pol: InsurancePolicy = {
      id: `ins-${Date.now()}`,
      policyName: insPolicyName,
      insuranceType: insType,
      provider: insProvider || 'Insurance Provider',
      sumAssured: parseFloat(insSumAssured),
      annualPremium: parseFloat(insPremium),
      paymentFrequency: 'Annual',
      dueDate: insDueDate,
      bankCreditCardUsed: insBank
    };

    await db.insurancePolicies.put(pol);
    setInsPolicyName('');
    setInsPremium('');
    setInsSumAssured('');
    setInsProvider('');

    loadAllData();
    onDataChange();
    showToast(`Saved Insurance Policy: ${insPolicyName}`);
  };

  // 4. Save Income
  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeSource || !incomeAmount) return;

    const amt = parseFloat(incomeAmount);
    const incTx: TransactionItem = {
      id: `inc-${Date.now()}`,
      date,
      type: 'income',
      category: 'Income',
      itemName: incomeSource,
      totalAmount: amt,
      bankCreditCard: incomeBank,
      createdAt: new Date().toISOString()
    };

    await db.transactions.put(incTx);
    setIncomeAmount('');

    loadAllData();
    onDataChange();
    showToast(`Logged Income: ${incomeSource} (${currency}${amt})`);
  };

  // 5. Add Custom Category
  const handleAddCustomCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const catName = newCategoryName.trim();
    if (!catName) return;

    if (categoriesList.includes(catName)) {
      showToast('Category already exists!');
      return;
    }

    const updatedCategories = [...categoriesList, catName];
    const updatedSettings = { ...settings, customCategories: updatedCategories };

    await saveSettings(updatedSettings);
    onUpdateSettings(updatedSettings);
    setCategory(catName);
    setNewCategoryName('');
    setIsCategoryModalOpen(false);
    showToast(`Saved Custom Category: "${catName}"`);
  };

  // 6. Natural Language Smart Parse Log
  const handleSmartNaturalLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAiInput.trim()) return;

    const parsed = parseNaturalLanguageLog(quickAiInput);
    const newTx: TransactionItem = {
      id: `tx-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      type: 'expense',
      category: parsed.category,
      expenseNature: parsed.expenseNature,
      bankCreditCard: parsed.bankCreditCard || bankCardsList[0],
      cityLocation: parsed.cityLocation || 'Bangalore',
      itemName: parsed.itemName,
      unitPrice: parsed.unitPrice,
      quantity: parsed.quantity,
      quantityUnit: parsed.quantityUnit,
      totalAmount: parsed.totalAmount,
      storeMerchant: parsed.storeMerchant,
      createdAt: new Date().toISOString()
    };

    await db.transactions.put(newTx);
    await recalculatePersonalInflation(settings.marketCPIBenchmarkPercent);
    setQuickAiInput('');
    loadAllData();
    onDataChange();
    showToast(`Smart Parsed & Logged: ${parsed.itemName} (${currency}${parsed.totalAmount})`);
  };

  const handleDeleteTx = async (id: string) => {
    if (confirm('Delete this record?')) {
      await db.transactions.delete(id);
      await recalculatePersonalInflation(settings.marketCPIBenchmarkPercent);
      loadAllData();
      onDataChange();
      showToast('Record deleted');
    }
  };

  const handleDeleteInv = async (id: string) => {
    if (confirm('Delete this investment entry?')) {
      await db.investments.delete(id);
      loadAllData();
      onDataChange();
    }
  };

  const handleDeleteIns = async (id: string) => {
    if (confirm('Delete this insurance entry?')) {
      await db.insurancePolicies.delete(id);
      loadAllData();
      onDataChange();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: 'rgba(16, 185, 129, 0.95)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
        }}>
          <CheckCircle2 size={18} />
          <span>{notification}</span>
        </div>
      )}

      {/* Header & Quick AI Parser */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Financial Vault & Data Entry</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Log Income, Investments, Fixed Perpetual Expenses, Phase-Bound Expenses (Rent, Child Fees), EMIs, and Insurance.
            </p>
          </div>

          <button className="btn-secondary" onClick={() => setIsCategoryModalOpen(true)}>
            <FolderPlus size={16} color="#8b5cf6" />
            <span>+ Add Custom Category</span>
          </button>
        </div>

        {/* Natural Language Voice/Text Log Bar */}
        <form onSubmit={handleSmartNaturalLog} style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              className="form-input"
              placeholder="✨ Smart AI Parser: e.g., 'Paid 25000 rent for Bangalore flat via HDFC' or 'Bought 500g coffee for 450'"
              value={quickAiInput}
              onChange={(e) => setQuickAiInput(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
            <Sparkles size={18} color="#8b5cf6" style={{ position: 'absolute', left: '12px', top: '14px' }} />
          </div>
          <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
            Auto-Parse & Log
          </button>
        </form>
      </div>

      {/* Entry Section Selector Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { id: 'expense', label: '🔄 Fixed Perpetual Expenses', icon: Receipt },
          { id: 'phase-bound', label: '⏳ Phase-Bound (Rent / Child Fee)', icon: Clock },
          { id: 'emi', label: '💳 EMIs & Debt', icon: CreditCard },
          { id: 'investment', label: '📈 Investments & Wealth', icon: PieChart },
          { id: 'insurance', label: '🛡️ Insurance Policies', icon: ShieldAlert },
          { id: 'income', label: '💰 Income Entry', icon: DollarSign }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveSection(tab.id as any);
              if (tab.id === 'expense') setExpenseNature('Perpetual Lifestyle');
              if (tab.id === 'phase-bound') setExpenseNature('Phase-Bound Temporary');
              if (tab.id === 'emi') setExpenseNature('EMI / Debt');
            }}
            className={activeSection === tab.id ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.85rem', padding: '10px 16px' }}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Section 1 & 2 & 3: Expense Entry (Perpetual, Phase-Bound, or EMI) */}
      {(activeSection === 'expense' || activeSection === 'phase-bound' || activeSection === 'emi') && (
        <div className="glass-card animate-slide-up" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', color: activeSection === 'phase-bound' ? '#fb7185' : activeSection === 'emi' ? '#fbbf24' : '#34d399' }}>
            {activeSection === 'phase-bound' ? '⏳ Log Phase-Bound Temporary Expense (Rent, Child Fees, College Tuition)' : 
             activeSection === 'emi' ? '💳 Log EMI or Debt Servicing (Car Loan, Mobile EMI, Home Loan)' : 
             '🔄 Log Fixed Perpetual Expense (Food, Groceries, Utilities, Health)'}
          </h2>

          <form onSubmit={handleSaveExpense} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Item / Expense Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder={activeSection === 'phase-bound' ? "e.g. Bangalore Flat Rent, School Tuition Fee" : "e.g. Organic Coffee Beans, Electricity Bill"}
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Category</label>
                <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Bank / Credit Card Used</label>
                <select className="form-input" value={bankCreditCard} onChange={(e) => setBankCreditCard(e.target.value)}>
                  {bankCardsList.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Total Amount ({currency}) *</label>
                <input type="number" step="0.01" className="form-input" placeholder="0.00" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Quantity</label>
                <input type="number" step="0.01" className="form-input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Unit</label>
                <input type="text" className="form-input" placeholder="g, kg, liter, month" value={quantityUnit} onChange={(e) => setQuantityUnit(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Place / City</label>
                <input type="text" className="form-input" placeholder="Bangalore, Village Home" value={cityLocation} onChange={(e) => setCityLocation(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Date</label>
                <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
              <Plus size={16} />
              <span>Save Expense Entry</span>
            </button>
          </form>
        </div>
      )}

      {/* Section 4: Investments Entry */}
      {activeSection === 'investment' && (
        <div className="glass-card animate-slide-up" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', color: '#fbbf24' }}>
            📈 Log Investment Entry (Where, How Much & Asset Class)
          </h2>

          <form onSubmit={handleSaveInvestment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Investment Name *</label>
              <input type="text" className="form-input" placeholder="e.g. Vanguard S&P 500 ETF, SBI Fixed Deposit" value={invName} onChange={(e) => setInvName(e.target.value)} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Where / Platform</label>
                <input type="text" className="form-input" placeholder="Zerodha, Groww, Bank FD, Post Office, Village Real Estate" value={invWhere} onChange={(e) => setInvWhere(e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Asset Class / What</label>
                <select className="form-input" value={invAssetClass} onChange={(e) => setInvAssetClass(e.target.value as any)}>
                  <option value="Stocks">Stocks</option>
                  <option value="Mutual Funds / ETFs">Mutual Funds / ETFs</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Gold & Metals">Gold & Metals</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Fixed Deposit / Debt">Fixed Deposit / Debt</option>
                  <option value="Emergency Cash">Emergency Cash</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>How Much Invested ({currency}) *</label>
                <input type="number" step="0.01" className="form-input" placeholder="50000" value={invAmount} onChange={(e) => setInvAmount(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Monthly SIP Amount ({currency})</label>
                <input type="number" step="0.01" className="form-input" placeholder="5000" value={invSip} onChange={(e) => setInvSip(e.target.value)} />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
              <Plus size={16} />
              <span>Save Investment Entry</span>
            </button>
          </form>
        </div>
      )}

      {/* Section 5: Insurance Entry */}
      {activeSection === 'insurance' && (
        <div className="glass-card animate-slide-up" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', color: '#38bdf8' }}>
            🛡️ Log Insurance Policy (Life, Health, Vehicle, Property)
          </h2>

          <form onSubmit={handleSaveInsurance} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Policy Name *</label>
              <input type="text" className="form-input" placeholder="e.g. LIC Tech Term, Star Health Mediclaim" value={insPolicyName} onChange={(e) => setInsPolicyName(e.target.value)} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Insurance Type</label>
                <select className="form-input" value={insType} onChange={(e) => setInsType(e.target.value as any)}>
                  <option value="Life Insurance">Life Insurance</option>
                  <option value="Health Insurance">Health Insurance</option>
                  <option value="Vehicle Insurance">Vehicle Insurance</option>
                  <option value="Property Insurance">Property Insurance</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Provider</label>
                <input type="text" className="form-input" placeholder="HDFC ERGO, LIC, Star Health" value={insProvider} onChange={(e) => setInsProvider(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Sum Assured ({currency}) *</label>
                <input type="number" className="form-input" placeholder="5000000" value={insSumAssured} onChange={(e) => setInsSumAssured(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Annual Premium ({currency}) *</label>
                <input type="number" className="form-input" placeholder="15000" value={insPremium} onChange={(e) => setInsPremium(e.target.value)} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Renewal / Due Date</label>
                <input type="date" className="form-input" value={insDueDate} onChange={(e) => setInsDueDate(e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Bank / Credit Card</label>
                <select className="form-input" value={insBank} onChange={(e) => setInsBank(e.target.value)}>
                  {bankCardsList.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
              <Plus size={16} />
              <span>Save Insurance Policy</span>
            </button>
          </form>
        </div>
      )}

      {/* Section 6: Income Entry */}
      {activeSection === 'income' && (
        <div className="glass-card animate-slide-up" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', color: '#10b981' }}>
            💰 Log Monthly Income (Salary, Freelance, Rental)
          </h2>

          <form onSubmit={handleSaveIncome} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Income Source *</label>
              <input type="text" className="form-input" placeholder="e.g. Monthly Tech Salary, Village Property Rent Income" value={incomeSource} onChange={(e) => setIncomeSource(e.target.value)} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Amount Received ({currency}) *</label>
                <input type="number" step="0.01" className="form-input" placeholder="85000" value={incomeAmount} onChange={(e) => setIncomeAmount(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Received into Bank Account</label>
                <select className="form-input" value={incomeBank} onChange={(e) => setIncomeBank(e.target.value)}>
                  {bankCardsList.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
              <Plus size={16} />
              <span>Save Income Entry</span>
            </button>
          </form>
        </div>
      )}

      {/* Master Data Records Table */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Master Logged Records Vault</h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px' }}>Record Name</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>Nature</th>
                <th style={{ padding: '12px 16px' }}>Bank / Card</th>
                <th style={{ padding: '12px 16px' }}>City</th>
                <th style={{ padding: '12px 16px' }}>Amount</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No financial records logged yet. Use the form above to add expenses, income, investments or insurance.
                  </td>
                </tr>
              ) : (
                transactions.map(tx => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{tx.date}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{tx.itemName}</td>
                    <td style={{ padding: '12px 16px' }}><span className="badge badge-cyan">{tx.category}</span></td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${
                        tx.expenseNature === 'Phase-Bound Temporary' ? 'badge-rose' :
                        tx.expenseNature === 'EMI / Debt' ? 'badge-gold' : 'badge-emerald'
                      }`}>
                        {tx.expenseNature || (tx.type === 'income' ? 'Income' : 'Perpetual')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{tx.bankCreditCard || '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-subtle)' }}>{tx.cityLocation || '—'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: tx.type === 'income' ? '#34d399' : '#f8fafc' }}>
                      {tx.type === 'income' ? '+' : '-'}{currency}{tx.totalAmount.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button className="btn-secondary" style={{ padding: '4px 8px', color: '#fb7185' }} onClick={() => handleDeleteTx(tx.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Category Modal */}
      {isCategoryModalOpen && (
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
          <div className="glass-card-glow animate-slide-up" style={{ maxWidth: '420px', width: '100%', padding: '28px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '16px' }}>Add Custom Category</h2>
            <form onSubmit={handleAddCustomCategory}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Category Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Village Maintenance, Child Schooling"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsCategoryModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
