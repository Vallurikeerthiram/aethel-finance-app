/**
 * Browser WebAuthn API for Fingerprint / Passkey / TouchID / Windows Hello Authentication
 */

export function isWebAuthnSupported(): boolean {
  return window.PublicKeyCredential !== undefined && typeof window.PublicKeyCredential === 'function';
}

export async function registerBiometricPasskey(userEmail: string = 'user@aethel.ai'): Promise<{ success: boolean; credentialId?: string; message: string }> {
  if (!isWebAuthnSupported()) {
    return { success: false, message: 'WebAuthn Passkey / Biometrics is not supported in this browser.' };
  }

  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge: challenge,
      rp: {
        name: 'Aethel Financial Vault',
        id: window.location.hostname
      },
      user: {
        id: userId,
        name: userEmail,
        displayName: 'Aethel Vault Owner'
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Fingerprint / TouchID / Windows Hello
        userVerification: 'preferred'
      },
      timeout: 60000,
      attestation: 'none'
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    }) as PublicKeyCredential;

    if (!credential) {
      return { success: false, message: 'Passkey registration cancelled.' };
    }

    const credIdBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
    return {
      success: true,
      credentialId: credIdBase64,
      message: 'Fingerprint / Biometric Passkey successfully registered!'
    };
  } catch (err: any) {
    return { success: false, message: `Passkey Registration Error: ${err.message}` };
  }
}

export async function authenticateBiometricPasskey(storedCredentialIdBase64?: string): Promise<{ success: boolean; message: string }> {
  if (!isWebAuthnSupported()) {
    return { success: false, message: 'WebAuthn Passkey / Biometrics is not supported in this browser.' };
  }

  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const allowCredentials: PublicKeyCredentialDescriptor[] = [];
    if (storedCredentialIdBase64) {
      const rawIdStr = atob(storedCredentialIdBase64);
      const rawId = new Uint8Array(rawIdStr.length);
      for (let i = 0; i < rawIdStr.length; i++) {
        rawId[i] = rawIdStr.charCodeAt(i);
      }
      allowCredentials.push({
        id: rawId,
        type: 'public-key'
      });
    }

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge: challenge,
      timeout: 60000,
      userVerification: 'preferred',
      allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined
    };

    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    }) as PublicKeyCredential;

    if (assertion) {
      return { success: true, message: 'Biometric Passkey Authentication Successful!' };
    } else {
      return { success: false, message: 'Biometric verification failed.' };
    }
  } catch (err: any) {
    return { success: false, message: `Biometric Authentication Error: ${err.message}` };
  }
}
