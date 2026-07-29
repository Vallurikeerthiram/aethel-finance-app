import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  Lock, 
  ShieldCheck,
  Sparkles,
  Cloud,
  Settings,
  X
} from 'lucide-react';
import { getOrInitSettings, saveSettings } from './services/db';
import { UserSettings } from './types';
import { populateSeedDataIfEmpty } from './services/seedData';
import { SecurityLockModal } from './components/SecurityLockModal';
import { AiFinancialManagerDashboardView } from './components/AiFinancialManagerDashboardView';
import { UnifiedDataEntryView } from './components/UnifiedDataEntryView';
import { SettingsView } from './components/SettingsView';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'entry' | 'settings'>('dashboard');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [dataVersion, setDataVersion] = useState<number>(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    await populateSeedDataIfEmpty();
    const currentSettings = await getOrInitSettings();
    setSettings(currentSettings);
    if (currentSettings.isSecurityEnabled && currentSettings.pinHash) {
      setIsLocked(true);
    }
  };

  const handleUpdateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
  };

  const handleDataReset = () => {
    setDataVersion(prev => prev + 1);
  };

  if (!settings) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-dark)',
        color: 'var(--text-muted)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Sparkles size={36} color="#8b5cf6" className="animate-spin" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Initializing Aethel Financial AI Vault...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-dark)' }}>
      
      {/* Security Lock Screen Modal */}
      {isLocked && (
        <SecurityLockModal settings={settings} onUnlockSuccess={() => setIsLocked(false)} />
      )}

      {/* Main Top Header */}
      <header style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-glass)',
        padding: '14px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.5px' }}>AETHEL AI</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Financial Manager & Advisor</div>
          </div>
        </div>

        {/* Simplified 2 Main Pages Navigation Menu */}
        <nav style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.85rem', padding: '10px 18px' }}
          >
            <LayoutDashboard size={16} />
            <span>AI Manager Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('entry')}
            className={activeTab === 'entry' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.85rem', padding: '10px 18px' }}
          >
            <Receipt size={16} />
            <span>Vault & Data Entry</span>
          </button>
        </nav>

        {/* Vault Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="btn-secondary"
            style={{ padding: '8px 12px', fontSize: '0.8rem' }}
            title="Cloud Sync & Vault Security"
          >
            <Cloud size={16} color="#38bdf8" />
            <span className="desktop-only">Cloud Sync</span>
          </button>

          {settings.isSecurityEnabled && (
            <button
              onClick={() => setIsLocked(true)}
              className="btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.8rem' }}
              title="Lock Vault"
            >
              <Lock size={16} color="#8b5cf6" />
            </button>
          )}

          <div className="badge badge-emerald desktop-only">
            <ShieldCheck size={12} />
            <span>On-Device</span>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main style={{ flex: 1, padding: '24px', maxWidth: '1280px', width: '100%', margin: '0 auto', paddingBottom: '40px' }}>
        {activeTab === 'dashboard' && (
          <AiFinancialManagerDashboardView key={dataVersion} settings={settings} onNavigateEntry={() => setActiveTab('entry')} />
        )}

        {activeTab === 'entry' && (
          <UnifiedDataEntryView key={dataVersion} settings={settings} onUpdateSettings={handleUpdateSettings} onDataChange={handleDataReset} />
        )}
      </main>

      {/* Cloud Sync & Vault Settings Modal */}
      {isSettingsOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(9, 10, 15, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-card-glow animate-slide-up" style={{ maxWidth: '800px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Cloud Sync & Vault Passcode Settings</h2>
              <button className="btn-secondary" style={{ padding: '6px 10px' }} onClick={() => setIsSettingsOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <SettingsView settings={settings} onUpdateSettings={handleUpdateSettings} onDataReset={handleDataReset} />
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
