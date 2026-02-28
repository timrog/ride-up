/**
 * Consolidated secrets utility for Cloud Functions
 * This mirrors the app-side secrets structure but is optimized for functions
 */

export interface FunctionSecrets {
  honeycomb: {
    apiKey: string;
  };
  firebase: {
    privateKey: string;
    clientEmail: string;
  };
  vapid: {
    privateKey: string;
  };
  contact: {
    email: string;
    whatsapp: string;
    rideCoordinator: string;
  };
  smtp: {
    host: string;
    port: number;
    user: string;
    password: string;
    fromEmail: string;
  };
  mailerlite: {
    apiKey: string;
    username: string;
    password: string;
  };
  google: {
    calendarId: string;
  };
}

let cachedSecrets: FunctionSecrets | null = null;

/**
 * Parse the consolidated APP_SECRETS environment variable in Cloud Functions
 */
export function getAppSecrets(): FunctionSecrets {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  const secretsJson = process.env.APP_SECRETS;

  if (!secretsJson) {
    throw new Error(
      'APP_SECRETS environment variable not found in Cloud Functions. ' +
      'Ensure the function is configured with the APP_SECRETS secret in firebase.json'
    );
  }

  try { 
    cachedSecrets = JSON.parse(secretsJson) as FunctionSecrets;
    return cachedSecrets;
  } catch (error) {
    throw new Error(
      `Failed to parse APP_SECRETS in Cloud Functions: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Clear cached secrets (useful for testing)
 */
export function clearCachedSecrets(): void {
  cachedSecrets = null;
}
