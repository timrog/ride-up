/**
 * Consolidated secrets utility
 * All secrets are stored as a single JSON string in the APP_SECRETS environment variable
 */

export interface AppSecrets {
  // Honeycomb (Observability)
  honeycomb: {
    apiKey: string;
  };

  // Firebase Admin Credentials
  firebase: {
    privateKey: string;
    clientEmail: string;
  };

  // Push Notifications (Web Push)
  vapid: {
    privateKey: string;
  };

  // Contact Information
  contact: {
    email: string;
    whatsapp: string;
    rideCoordinator: string;
  };

  // SMTP Configuration
  smtp: {
    host: string;
    port: number;
    user: string;
    password: string;
    fromEmail: string;
  };

  // Mailerlite (Email Service)
  mailerlite: {
    apiKey: string;
    username: string;
    password: string;
  };

  // External Integrations
  google: {
    calendarId: string;
  };
}

let cachedSecrets: AppSecrets | null = null;

/**
 * Parse the consolidated APP_SECRETS environment variable
 * Must be called only in server-side code
 */
export function getAppSecrets(): AppSecrets {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  const secretsJson = process.env.APP_SECRETS;
  
  if (!secretsJson) {
    throw new Error(
      'APP_SECRETS environment variable not found. ' +
      'Ensure the consolidated secrets are set up correctly.'
    );
  }

  try {
    cachedSecrets = JSON.parse(secretsJson) as AppSecrets;
    validateSecrets(cachedSecrets);
    return cachedSecrets;
  } catch (error) {
    throw new Error(
      `Failed to parse APP_SECRETS: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validate that all required secrets are present
 */
function validateSecrets(secrets: AppSecrets): void {
  const required: (keyof AppSecrets)[] = [
    'honeycomb',
    'firebase',
    'vapid',
    'contact',
    'smtp',
    'mailerlite',
    'google',
  ];

  for (const key of required) {
    if (!secrets[key]) {
      throw new Error(`Missing required secret group: ${key}`);
    }
  }

  // Validate sub-properties
  if (!secrets.honeycomb.apiKey) throw new Error('Missing honeycomb.apiKey');
  if (!secrets.firebase.privateKey) throw new Error('Missing firebase.privateKey');
  if (!secrets.firebase.clientEmail) throw new Error('Missing firebase.clientEmail');
  if (!secrets.vapid.privateKey) throw new Error('Missing vapid.privateKey');
  if (!secrets.contact.email) throw new Error('Missing contact.email');
  if (!secrets.contact.whatsapp) throw new Error('Missing contact.whatsapp');
  if (!secrets.contact.rideCoordinator) throw new Error('Missing contact.rideCoordinator');
  if (!secrets.smtp.host) throw new Error('Missing smtp.host');
  if (!secrets.smtp.port) throw new Error('Missing smtp.port');
  if (!secrets.smtp.user) throw new Error('Missing smtp.user');
  if (!secrets.smtp.password) throw new Error('Missing smtp.password');
  if (!secrets.smtp.fromEmail) throw new Error('Missing smtp.fromEmail');
  if (!secrets.mailerlite.apiKey) throw new Error('Missing mailerlite.apiKey');
  if (!secrets.mailerlite.username) throw new Error('Missing mailerlite.username');
  if (!secrets.mailerlite.password) throw new Error('Missing mailerlite.password');
  if (!secrets.google.calendarId) throw new Error('Missing google.calendarId');
}

/**
 * Clear cached secrets (useful for testing)
 */
export function clearCachedSecrets(): void {
  cachedSecrets = null;
}
