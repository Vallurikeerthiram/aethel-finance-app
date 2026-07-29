import React, { useState } from 'react';
import { Lock, ShieldCheck, KeyRound, AlertCircle, Fingerprint } from 'lucide-react';
import { hashPin } from '../services/crypto';
import { authenticateBiometricPasskey, isWebAuthnSupported } from '../services/webAuthn';
import { UserSettings } from '../types';

interface Props {
  settings: UserSettings;
  onUnlockSuccess: () => void;
}

export const SecurityLockModal: React.FC<Props> = ({ settings, onUnlockSuccess }) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isAuthenticatingPasskey, setIsAuthenticatingPasskey] = useState(false);

  const handleUnlockWithPin = async (e: React.FormEvent) => {
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
      onUnlockSuccess();
    }
  };

  const handleUnlockWithBiometrics = async () => {
    setErrorMsg('');
    setIsAuthenticatingPasskey(true);

    const res = await authenticateBiometricPasskey(settings.passkeyCredentialId);
    setIsAuthenticatingPasskey(false);

    if (res.success) {
      onUnlockSuccess();
    } else {
      setErrorMsg(res.message || 'Biometric fingerprint verification failed.');
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
        maxWidth: '440px',
        width: '100%',
        padding: '36px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '68px',
          height: '68px',
          borderRadius: '50%',
          background: 'rgba(139, 92, 246, 0.15)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: '#8b5cf6'
        }}>
          <Lock size={34} />
        </div>

        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '8px' }}>
          Aethel Private Vault
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '28px' }}>
          Unlock your private financial vault using your Fingerprint / Passkey or Master Passcode.
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
            gap: '8px',
            textAlign: 'left'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Biometric / Fingerprint Unlock Button */}
        {isWebAuthnSupported() && (
          <div style={{ marginBottom: '20px' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleUnlockWithBiometrics}
              disabled={isAuthenticatingPasskey}
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '14px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                fontSize: '1rem'
              }}
            >
              <Fingerprint size={22} />
              <span>{isAuthenticatingPasskey ? 'Verifying Fingerprint...' : 'Unlock with Fingerprint / Passkey'}</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '18px 0', color: 'var(--text-subtle)', fontSize: '0.8rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }}></div>
              <span style={{ padding: '0 12px' }}>OR USE PASSCODE</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }}></div>
            </div>
          </div>
        )}

        {/* Master PIN Unlock Form */}
        <form onSubmit={handleUnlockWithPin}>
          <div style={{ marginBottom: '20px' }}>
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
            />
          </div>

          <button type="submit" className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
            <KeyRound size={18} />
            <span>Unlock with Passcode</span>
          </button>
        </form>

        <div style={{ marginTop: '24px', fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <ShieldCheck size={14} color="#10b981" />
          <span>WebAuthn Biometric & AES-256 Encrypted</span>
        </div>
      </div>
    </div>
  );
};
