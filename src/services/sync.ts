import { db, saveSettings } from './db';
import { encryptData, decryptData } from './crypto';

export interface FullBackupPayload {
  version: string;
  timestamp: string;
  transactions: any[];
  investments: any[];
  inflationItems: any[];
  stepUpPlan: any[];
  settings: any;
}

export async function createBackupPayload(): Promise<FullBackupPayload> {
  const transactions = await db.transactions.toArray();
  const investments = await db.investments.toArray();
  const inflationItems = await db.inflationItems.toArray();
  const stepUpPlan = await db.stepUpPlan.toArray();
  const settingsArray = await db.settings.toArray();

  return {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    transactions,
    investments,
    inflationItems,
    stepUpPlan,
    settings: settingsArray[0] || {}
  };
}

export async function exportBackupToFile(passphrase?: string): Promise<void> {
  const payload = await createBackupPayload();
  const jsonStr = JSON.stringify(payload, null, 2);
  let blobContent = jsonStr;
  let filename = `aethel_finance_backup_${new Date().toISOString().slice(0, 10)}.json`;

  if (passphrase && passphrase.trim().length > 0) {
    const encryptedStr = await encryptData(jsonStr, passphrase);
    blobContent = JSON.stringify({ encrypted: true, data: encryptedStr });
    filename = `aethel_finance_encrypted_vault_${new Date().toISOString().slice(0, 10)}.aethel`;
  }

  const blob = new Blob([blobContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function restoreBackupFromFile(fileContent: string, passphrase?: string): Promise<{ success: boolean; message: string }> {
  try {
    let rawJson = fileContent;
    const parsed = JSON.parse(fileContent);

    if (parsed.encrypted) {
      if (!passphrase) {
        return { success: false, message: 'Vault is password protected. Passphrase required.' };
      }
      try {
        rawJson = await decryptData(parsed.data, passphrase);
      } catch (e) {
        return { success: false, message: 'Invalid passphrase or corrupted vault file.' };
      }
    }

    const payload: FullBackupPayload = JSON.parse(rawJson);
    if (!payload.transactions || !payload.investments) {
      return { success: false, message: 'Invalid backup file structure.' };
    }

    await db.transaction('rw', [db.transactions, db.investments, db.inflationItems, db.stepUpPlan, db.settings], async () => {
      await db.transactions.clear();
      await db.investments.clear();
      await db.inflationItems.clear();
      await db.stepUpPlan.clear();

      if (payload.transactions?.length) await db.transactions.bulkPut(payload.transactions);
      if (payload.investments?.length) await db.investments.bulkPut(payload.investments);
      if (payload.inflationItems?.length) await db.inflationItems.bulkPut(payload.inflationItems);
      if (payload.stepUpPlan?.length) await db.stepUpPlan.bulkPut(payload.stepUpPlan);
      if (payload.settings) await saveSettings(payload.settings);
    });

    return { success: true, message: `Successfully restored ${payload.transactions.length} transactions & ${payload.investments.length} investments!` };
  } catch (err: any) {
    return { success: false, message: `Failed to restore: ${err.message}` };
  }
}

export async function syncToGitHubGist(githubToken: string, existingGistId?: string, encryptionPassphrase?: string): Promise<{ success: boolean; gistId?: string; message: string }> {
  try {
    const payload = await createBackupPayload();
    let contentStr = JSON.stringify(payload, null, 2);

    if (encryptionPassphrase && encryptionPassphrase.trim().length > 0) {
      const encrypted = await encryptData(contentStr, encryptionPassphrase);
      contentStr = JSON.stringify({ encrypted: true, data: encrypted });
    }

    const gistData = {
      description: 'Aethel AI Personal Finance Encrypted Cloud Sync',
      public: false,
      files: {
        'aethel_finance_vault.json': {
          content: contentStr
        }
      }
    };

    const url = existingGistId 
      ? `https://api.github.com/gists/${existingGistId}`
      : 'https://api.github.com/gists';
    
    const method = existingGistId ? 'PATCH' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gistData)
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, message: `GitHub Sync Failed (${response.status}): ${errText}` };
    }

    const resJson = await response.json();
    return { success: true, gistId: resJson.id, message: 'Successfully synced to GitHub Gist!' };
  } catch (err: any) {
    return { success: false, message: `GitHub Sync Error: ${err.message}` };
  }
}

export async function pullFromGitHubGist(githubToken: string, gistId: string, encryptionPassphrase?: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      return { success: false, message: `Failed to fetch Gist (${response.status})` };
    }

    const gistObj = await response.json();
    const fileObj = gistObj.files['aethel_finance_vault.json'];
    if (!fileObj || !fileObj.content) {
      return { success: false, message: 'Vault file missing in GitHub Gist' };
    }

    return await restoreBackupFromFile(fileObj.content, encryptionPassphrase);
  } catch (err: any) {
    return { success: false, message: `GitHub Restore Error: ${err.message}` };
  }
}
