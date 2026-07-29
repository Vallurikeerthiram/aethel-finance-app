import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Trash2, Edit2, Sparkles, CheckCircle2, Building, CreditCard, MapPin, Layers, FolderPlus } from 'lucide-react';
import { db, saveSettings } from '../services/db';
import { TransactionItem, ExpenseCategory, ExpenseNature, UserSettings } from '../types';
import { parseNaturalLanguageLog } from '../services/aiAgent';
import { recalculatePersonalInflation } from '../services/inflationEngine';

interface Props {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
}

export const ExpenseTrackerView: React.FC<Props> = ({ settings, onUpdateSettings }) => {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedNature, setSelectedNature] = useState<string>('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomCategoryModalOpen, setIsCustomCategoryModalOpen] = useState(false);
  const [newCustomCategoryInput, setNewCustomCategoryInput] = useState('');
  const [editingTx, setEditingTx] = useState<TransactionItem | null>(null);

  // Form State
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Groceries & Food');
  const [expenseNature, setExpenseNature] = useState<ExpenseNature>('Perpetual Lifestyle');
  const [bankCreditCard, setBankCreditCard] = useState('HDFC Bank Account');
  const [cityLocation, setCityLocation] = useState('Bangalore');
  const [storeMerchant, setStoreMerchant] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [quantityUnit, setQuantityUnit] = useState('g');
  const [totalAmount, setTotalAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('Card / Online');
  const [notes, setNotes] = useState('');
  
  const [naturalLogInput, setNaturalLogInput] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const currency = settings.currencySymbol;
  const categoriesList = settings.customCategories || [];
  const bankCardsList = settings.customBankCards || [];

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const list = await db.transactions.toArray();
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(list);
  };

  const handleOpenAddModal = () => {
    setEditingTx(null);
    setItemName('');
    setCategory(categoriesList[0] || 'Groceries & Food');
    setExpenseNature('Perpetual Lifestyle');
    setBankCreditCard(bankCardsList[0] || 'HDFC Bank Account');
    setCityLocation('Bangalore');
    setStoreMerchant('');
    setUnitPrice('');
    setQuantity('1');
    setQuantityUnit('g');
    setTotalAmount('');
    setDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('Card / Online');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tx: TransactionItem) => {
    setEditingTx(tx);
    setItemName(tx.itemName);
    setCategory(tx.category);
    setExpenseNature(tx.expenseNature || 'Perpetual Lifestyle');
    setBankCreditCard(tx.bankCreditCard || bankCardsList[0]);
    setCityLocation(tx.cityLocation || 'Bangalore');
    setStoreMerchant(tx.storeMerchant || '');
    setUnitPrice(tx.unitPrice ? String(tx.unitPrice) : '');
    setQuantity(tx.quantity ? String(tx.quantity) : '1');
    setQuantityUnit(tx.quantityUnit || 'g');
    setTotalAmount(String(tx.totalAmount));
    setDate(tx.date);
    setPaymentMethod(tx.paymentMethod || 'Card / Online');
    setNotes(tx.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !totalAmount) return;

    const tot = parseFloat(totalAmount);
    const qty = parseFloat(quantity) || 1;
    const unitP = unitPrice ? parseFloat(unitPrice) : Number((tot / qty).toFixed(2));

    const itemData: TransactionItem = {
      id: editingTx ? editingTx.id : `tx-${Date.now()}`,
      date,
      type: 'expense',
      category,
      expenseNature,
      bankCreditCard,
      cityLocation: cityLocation || undefined,
      itemName,
      storeMerchant: storeMerchant || undefined,
      unitPrice: unitP,
      quantity: qty,
      quantityUnit,
      totalAmount: tot,
      paymentMethod,
      notes: notes || undefined,
      createdAt: editingTx ? editingTx.createdAt : new Date().toISOString()
    };

    await db.transactions.put(itemData);
    await recalculatePersonalInflation(settings.marketCPIBenchmarkPercent);
    setIsModalOpen(false);
    loadTransactions();

    showToast(editingTx ? 'Transaction updated' : 'Expense logged!');
  };

  const handleAddCustomCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const catName = newCustomCategoryInput.trim();
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
    setNewCustomCategoryInput('');
    setIsCustomCategoryModalOpen(false);
    showToast(`Added custom category: "${catName}"`);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this expense log?')) {
      await db.transactions.delete(id);
      await recalculatePersonalInflation(settings.marketCPIBenchmarkPercent);
      loadTransactions();
      showToast('Transaction deleted');
    }
  };

  const handleSmartNaturalLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!naturalLogInput.trim()) return;

    const parsed = parseNaturalLanguageLog(naturalLogInput);
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
      paymentMethod: parsed.paymentMethod,
      createdAt: new Date().toISOString()
    };

    await db.transactions.put(newTx);
    await recalculatePersonalInflation(settings.marketCPIBenchmarkPercent);
    setNaturalLogInput('');
    loadTransactions();
    showToast(`Smart Parsed: ${parsed.itemName} (${currency}${parsed.totalAmount}) [${parsed.expenseNature}]`);
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Filtering
  const filtered = transactions.filter(t => {
    const matchesSearch = t.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.storeMerchant && t.storeMerchant.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (t.cityLocation && t.cityLocation.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === 'ALL' || t.category === selectedCategory;
    const matchesNature = selectedNature === 'ALL' || t.expenseNature === selectedNature;
    return matchesSearch && matchesCat && matchesNature;
  });

  const totalExpenseSum = filtered.reduce((acc, t) => acc + (t.type === 'expense' ? t.totalAmount : 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 999,
          background: 'rgba(16, 185, 129, 0.9)',
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

      {/* Header & Smart Parser */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Granular Expense & Item Tracker</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Log food, rent, child fees, and EMIs with Bank/Card, City, and Nature classification.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" onClick={() => setIsCustomCategoryModalOpen(true)}>
              <FolderPlus size={16} color="#8b5cf6" />
              <span>+ Custom Category</span>
            </button>
            <button className="btn-primary" onClick={handleOpenAddModal}>
              <Plus size={18} />
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        {/* AI Natural Language Log Bar */}
        <form onSubmit={handleSmartNaturalLog} style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              className="form-input"
              placeholder="✨ Smart AI Parser: e.g. 'Paid 25000 rent for Bangalore flat via HDFC bank' or 'Bought 500g coffee for 450'"
              value={naturalLogInput}
              onChange={(e) => setNaturalLogInput(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
            <Sparkles size={18} color="#8b5cf6" style={{ position: 'absolute', left: '12px', top: '14px' }} />
          </div>
          <button type="submit" className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>
            Auto-Parse & Log
          </button>
        </form>
      </div>

      {/* Search & Filter Control Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search items, merchants, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
          <Search size={18} color="var(--text-subtle)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
        </div>

        <select
          className="form-input"
          style={{ width: 'auto', minWidth: '160px' }}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="ALL">All Categories</option>
          {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          className="form-input"
          style={{ width: 'auto', minWidth: '180px' }}
          value={selectedNature}
          onChange={(e) => setSelectedNature(e.target.value)}
        >
          <option value="ALL">All Expense Natures</option>
          <option value="Perpetual Lifestyle">🔄 Perpetual Lifestyle</option>
          <option value="Phase-Bound Temporary">⏳ Phase-Bound Temporary</option>
          <option value="EMI / Debt">💳 EMI / Debt</option>
        </select>

        <div className="badge badge-gold" style={{ fontSize: '0.9rem', padding: '10px 16px' }}>
          Filtered Total: {currency}{totalExpenseSum.toLocaleString()} ({filtered.length} logs)
        </div>
      </div>

      {/* Expense Transactions Table */}
      <div className="glass-card" style={{ overflowX: 'auto', padding: '0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '14px 18px' }}>Date</th>
              <th style={{ padding: '14px 18px' }}>Item Name</th>
              <th style={{ padding: '14px 18px' }}>Category</th>
              <th style={{ padding: '14px 18px' }}>Nature</th>
              <th style={{ padding: '14px 18px' }}>Bank / Card</th>
              <th style={{ padding: '14px 18px' }}>City</th>
              <th style={{ padding: '14px 18px' }}>Qty / Unit</th>
              <th style={{ padding: '14px 18px' }}>Total</th>
              <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No matching expenses found. Click 'Add Expense' to log your purchases.
                </td>
              </tr>
            ) : (
              filtered.map(tx => (
                <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <td style={{ padding: '14px 18px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{tx.date}</td>
                  <td style={{ padding: '14px 18px', fontWeight: 600 }}>{tx.itemName}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>{tx.category}</span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span className={`badge ${
                      tx.expenseNature === 'Phase-Bound Temporary' ? 'badge-rose' :
                      tx.expenseNature === 'EMI / Debt' ? 'badge-gold' : 'badge-emerald'
                    }`} style={{ fontSize: '0.75rem' }}>
                      {tx.expenseNature || 'Perpetual'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <CreditCard size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    {tx.bankCreditCard || 'HDFC Bank'}
                  </td>
                  <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>{tx.cityLocation || '—'}</td>
                  <td style={{ padding: '14px 18px' }}>{tx.quantity || 1} {tx.quantityUnit || 'unit'}</td>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: '#f8fafc' }}>
                    {currency}{tx.totalAmount.toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn-secondary" style={{ padding: '6px 10px' }} onClick={() => handleOpenEditModal(tx)}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn-secondary" style={{ padding: '6px 10px', color: '#fb7185' }} onClick={() => handleDelete(tx.id)}>
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

      {/* Add / Edit Expense Modal */}
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
          <div className="glass-card-glow animate-slide-up" style={{ maxWidth: '560px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '20px' }}>
              {editingTx ? 'Edit Expense Log' : 'Log New Expense / Purchase'}
            </h2>

            <form onSubmit={handleSaveTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Item / Expense Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Organic Almond Milk, Apartment Rent, Child Tuition Fee"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Category</label>
                  <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Expense Nature</label>
                  <select className="form-input" value={expenseNature} onChange={(e) => setExpenseNature(e.target.value as ExpenseNature)}>
                    <option value="Perpetual Lifestyle">🔄 Perpetual Lifestyle (Food, Health)</option>
                    <option value="Phase-Bound Temporary">⏳ Phase-Bound Temporary (Rent, Child Fee)</option>
                    <option value="EMI / Debt">💳 EMI / Debt (Car/Home Loan)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Bank / Credit Card Used</label>
                  <select className="form-input" value={bankCreditCard} onChange={(e) => setBankCreditCard(e.target.value)}>
                    {bankCardsList.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>City / Location</label>
                  <input type="text" className="form-input" placeholder="Bangalore, Village Home, etc." value={cityLocation} onChange={(e) => setCityLocation(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Total Amount ({currency}) *</label>
                  <input type="number" step="0.01" className="form-input" placeholder="0.00" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Quantity</label>
                  <input type="number" step="0.01" className="form-input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Unit</label>
                  <input type="text" className="form-input" placeholder="g, kg, liter, month" value={quantityUnit} onChange={(e) => setQuantityUnit(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Date</label>
                  <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Store / Merchant</label>
                  <input type="text" className="form-input" placeholder="e.g. Costco, Landlord, School" value={storeMerchant} onChange={(e) => setStoreMerchant(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Expense Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Category Modal */}
      {isCustomCategoryModalOpen && (
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
                  placeholder="e.g. Village Property Maintenance, Pet Care"
                  value={newCustomCategoryInput}
                  onChange={(e) => setNewCustomCategoryInput(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsCustomCategoryModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add & Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
