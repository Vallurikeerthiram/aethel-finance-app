import React, { useState } from 'react';
import { Lock, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';
import { hashPin } from '../services/crypto';
import { UserSettings } from '../types';

interface Props {
  settings: UserSettings;
  onUnlockSuccess: () => void;
}

export const SecurityLockModal: React.FC<Props> = ({ settings, onUnlockSuccess }) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!pinInput.trim()) {
      setErrorMsg('Please enter your Security Passcode');
      return;
    }

    if (settings.pinHash && settings.salt) {
      const hashed = await hashPin(pinInput, settings.salt);
      if (hashed === settings.pinHash) {
        onUnlockSuccess();
      } else {
        setErrorMsg('Invalid Security Passcode. Try again.');
        setPinInput('');
      }
    } else {
      // Fallback if hash not generated
      onUnlockSuccess();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      backgroundColor: 'rgba(9, 10, 15, 0.95)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-card-glow animate-slide-up" style={{
        maxWidth: '420px',
        width: '100%',
        padding: '36px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(139, 92, 246, 0.15)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: '#8b5cf6'
        }}>
          <Lock size={32} />
        </div>

        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '8px' }}>
          Aethel Private Vault
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '28px' }}>
          Enter your master passcode to decrypt and unlock your financial intelligence on this device.
        </p>

        {errorMsg && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fb7185',
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleUnlock}>
          <div style={{ marginBottom: '24px', position: 'relative' }}>
            <input
              type="password"
              className="form-input"
              style={{
                textAlign: 'center',
                letterSpacing: '6px',
                fontSize: '1.4rem',
                padding: '14px'
              }}
              placeholder="••••••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              autoFocus
            />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
            <KeyRound size={18} />
            <span>Unlock Vault</span>
          </button>
        </form>

        <div style={{ marginTop: '24px', fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <ShieldCheck size={14} color="#10b981" />
          <span>100% Privacy Preserved • AES-256 On-Device Key</span>
        </div>
      </div>
    </div>
  );
};
