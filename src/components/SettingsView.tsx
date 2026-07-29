import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Cloud, 
  Github, 
  Download, 
  Upload, 
  Database, 
  Sparkles, 
  Key, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { UserSettings } from '../types';
import { saveSettings } from '../services/db';
import { hashPin, generateSalt } from '../services/crypto';
import { registerBiometricPasskey, isWebAuthnSupported } from '../services/webAuthn';
import { exportBackupToFile, restoreBackupFromFile, syncToGitHubGist, pullFromGitHubGist } from '../services/sync';
import { clearAllFinancialData } from '../services/seedData';

interface Props {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onDataReset: () => void;
}

export const SettingsView: React.FC<Props> = ({ settings, onUpdateSettings, onDataReset }) => {
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [currencyCode, setCurrencyCode] = useState(settings.currencyCode);
  const [marketCpi, setMarketCpi] = useState(String(settings.marketCPIBenchmarkPercent));
  const [geminiKey, setGeminiKey] = useState(settings.geminiApiKey || '');

  // Passcode Security
  const [isSecurityEnabled, setIsSecurityEnabled] = useState(settings.isSecurityEnabled);
  const [newPin, setNewPin] = useState('');
  
  // GitHub Sync
  const [githubToken, setGithubToken] = useState(settings.githubGistToken || '');
  const [gistId, setGistId] = useState(settings.githubGistId || '');
  const [encryptionPassphrase, setEncryptionPassphrase] = useState('');

  // Status Toasts
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const showStatus = (text: string, isError = false) => {
    setStatusMsg({ text, isError });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleSaveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserSettings = {
      ...settings,
      currencySymbol,
      currencyCode,
      marketCPIBenchmarkPercent: parseFloat(marketCpi) || 5.2,
      geminiApiKey: geminiKey || undefined,
      githubGistToken: githubToken || undefined,
      githubGistId: gistId || undefined
    };

    await saveSettings(updated);
    onUpdateSettings(updated);
    showStatus('General settings saved!');
  };

  const handleRegisterPasskey = async () => {
    const res = await registerBiometricPasskey();
    if (res.success && res.credentialId) {
      const updated: UserSettings = {
        ...settings,
        isSecurityEnabled: true,
        passkeyCredentialId: res.credentialId
      };
      await saveSettings(updated);
      onUpdateSettings(updated);
      setIsSecurityEnabled(true);
      showStatus(res.message);
    } else {
      showStatus(res.message, true);
    }
  };

  const handleToggleSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    let pinHash = settings.pinHash;
    let salt = settings.salt;

    if (isSecurityEnabled && newPin.trim().length > 0) {
      salt = generateSalt();
      pinHash = await hashPin(newPin, salt);
    }

    const updated: UserSettings = {
      ...settings,
      isSecurityEnabled,
      pinHash: isSecurityEnabled ? pinHash : undefined,
      salt: isSecurityEnabled ? salt : undefined
    };

    await saveSettings(updated);
    onUpdateSettings(updated);
    setNewPin('');
    showStatus(`Security passcode protection ${isSecurityEnabled ? 'ENABLED' : 'DISABLED'}`);
  };

  const handleExportBackup = async (encrypted: boolean) => {
    await exportBackupToFile(encrypted ? encryptionPassphrase || 'aethel123' : undefined);
    showStatus(`Exported ${encrypted ? 'Encrypted Vault' : 'JSON Backup'} successfully!`);
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await restoreBackupFromFile(content, encryptionPassphrase);
      if (res.success) {
        showStatus(res.message);
        onDataReset();
      } else {
        showStatus(res.message, true);
      }
    };
    reader.readAsText(file);
  };

  const handleGitHubSync = async () => {
    if (!githubToken.trim()) {
      showStatus('Please enter a GitHub Personal Access Token first.', true);
      return;
    }

    setIsSyncing(true);
    const res = await syncToGitHubGist(githubToken, gistId, encryptionPassphrase);
    setIsSyncing(false);

    if (res.success) {
      if (res.gistId) {
        setGistId(res.gistId);
        const updated = { ...settings, githubGistToken: githubToken, githubGistId: res.gistId };
        await saveSettings(updated);
        onUpdateSettings(updated);
      }
      showStatus(res.message);
    } else {
      showStatus(res.message, true);
    }
  };

  const handleGitHubPull = async () => {
    if (!githubToken.trim() || !gistId.trim()) {
      showStatus('GitHub Token and Gist ID are required to pull backup.', true);
      return;
    }

    setIsSyncing(true);
    const res = await pullFromGitHubGist(githubToken, gistId, encryptionPassphrase);
    setIsSyncing(false);

    if (res.success) {
      showStatus(res.message);
      onDataReset();
    } else {
      showStatus(res.message, true);
    }
  };

  const handleClearData = async () => {
    if (confirm('Wipe all financial records and reset vault database to clean state?')) {
      await clearAllFinancialData();
      onDataReset();
      showStatus('Vault cleared and reset to clean state!');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Toast Notification */}
      {statusMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: statusMsg.isError ? 'rgba(244, 63, 94, 0.9)' : 'rgba(16, 185, 129, 0.9)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {statusMsg.isError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Vault Security & Cloud Sync Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Manage AES-256 vault security, GitHub Gist cloud backups, currency settings, and data seeding.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Passcode Security Card */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} color="#8b5cf6" />
            <span>Vault Passcode Protection</span>
          </h3>

          <form onSubmit={handleToggleSecurity} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Enable Lock Screen</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Require passcode on app opening</div>
              </div>
              <input
                type="checkbox"
                checked={isSecurityEnabled}
                onChange={(e) => setIsSecurityEnabled(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: '#8b5cf6', cursor: 'pointer' }}
              />
            </div>

            {isSecurityEnabled && (
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Set New Passcode / PIN</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter 4 to 8 digit passcode"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                />
              </div>
            )}

            {isWebAuthnSupported() && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleRegisterPasskey}
                style={{ width: '100%', justifyContent: 'center', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
              >
                <Key size={16} />
                <span>{settings.passkeyCredentialId ? '✓ Fingerprint Passkey Registered (Click to Re-register)' : 'Register Fingerprint / Passkey'}</span>
              </button>
            )}

            <button type="submit" className="btn-primary">
              <Lock size={16} />
              <span>Update Security Settings</span>
            </button>
          </form>
        </div>

        {/* GitHub Gist Cloud Sync */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Github size={20} color="#38bdf8" />
            <span>GitHub Gist Encrypted Cloud Sync</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>GitHub Personal Access Token</label>
              <input
                type="password"
                className="form-input"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Existing Gist ID (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Auto-generated on first sync"
                value={gistId}
                onChange={(e) => setGistId(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Vault Encryption Passphrase</label>
              <input
                type="password"
                className="form-input"
                placeholder="Passphrase to encrypt Gist content"
                value={encryptionPassphrase}
                onChange={(e) => setEncryptionPassphrase(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button className="btn-primary" onClick={handleGitHubSync} disabled={isSyncing} style={{ flex: 1 }}>
                <Cloud size={16} />
                <span>Sync to Gist</span>
              </button>
              <button className="btn-secondary" onClick={handleGitHubPull} disabled={isSyncing} style={{ flex: 1 }}>
                <RefreshCw size={16} />
                <span>Pull from Gist</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Local Export / Import & Currency Settings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Export / Import Vault */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={20} color="#f59e0b" />
            <span>Local Vault Backup & Restore</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => handleExportBackup(false)}>
                <Download size={16} />
                <span>Export JSON</span>
              </button>
              <button className="btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }} onClick={() => handleExportBackup(true)}>
                <Lock size={16} />
                <span>Export Encrypted</span>
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Restore Backup File (.json / .aethel)</label>
              <input type="file" accept=".json,.aethel" onChange={handleImportBackup} className="form-input" style={{ padding: '8px' }} />
            </div>
          </div>
        </div>

        {/* Currency & Seed Data Card */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="#10b981" />
            <span>General Preferences & Seed Data</span>
          </h3>

          <form onSubmit={handleSaveGeneralSettings} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Currency Symbol</label>
                <input type="text" className="form-input" value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} placeholder="₹, $, €" />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Currency Code</label>
                <input type="text" className="form-input" value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} placeholder="INR, USD" />
              </div>
            </div>

            <button type="submit" className="btn-secondary">Save Preferences</button>
          </form>

          <div style={{ borderTop: '1px solid var(--border-glass)', marginTop: '16px', paddingTop: '16px' }}>
            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', color: '#fb7185' }} onClick={handleClearData}>
              <RefreshCw size={16} />
              <span>Wipe & Reset Clean Vault</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
