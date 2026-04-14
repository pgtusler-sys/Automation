import dotenv from 'dotenv';

dotenv.config();

export const settings = {
  emailScanIntervalMinutes: parseInt(process.env.EMAIL_SCAN_INTERVAL_MINUTES || '15', 10),
  documentConfidenceThreshold: parseFloat(process.env.DOCUMENT_CONFIDENCE_THRESHOLD || '0.8'),
  logLevel: process.env.LOG_LEVEL || 'info',

  outlook: {
    clientId: process.env.AZURE_CLIENT_ID || '',
    clientSecret: process.env.AZURE_CLIENT_SECRET || '',
    tenantId: process.env.AZURE_TENANT_ID || '',
    redirectUri: process.env.AZURE_REDIRECT_URI || 'http://localhost:3000/auth/callback',
    refreshToken: process.env.MS_GRAPH_REFRESH_TOKEN || '',
    andreaMailbox: process.env.ANDREA_MAILBOX_EMAIL || '',
  },

  dropbox: {
    appKey: process.env.DROPBOX_APP_KEY || '',
    appSecret: process.env.DROPBOX_APP_SECRET || '',
    refreshToken: process.env.DROPBOX_REFRESH_TOKEN || '',
  },

  google: {
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './credentials/google-service-account.json',
    pipelineSheetId: process.env.GOOGLE_PIPELINE_SHEET_ID || '',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },

  arive: {
    loginUrl: process.env.ARIVE_LOGIN_URL || 'https://arive.com/login',
    username: process.env.ARIVE_USERNAME || '',
    password: process.env.ARIVE_PASSWORD || '',
  },

  n8n: {
    webhookUrl: process.env.N8N_WEBHOOK_URL || 'http://localhost:5678',
  },

  jobs: {
    enabled: process.env.JOB_SEARCH_ENABLED !== 'false',
    scoreThreshold: parseInt(process.env.JOB_SCORE_THRESHOLD || '75', 10),
    autoGenerateThreshold: parseInt(process.env.JOB_AUTO_GENERATE_THRESHOLD || '80', 10),
    notifyEmail: process.env.JOB_NOTIFY_EMAIL || '',
    serpApiKey: process.env.SERP_API_KEY || '',
    autoApply: {
      enabled: process.env.JOB_AUTO_APPLY_ENABLED === 'true',
      maxPerDay: parseInt(process.env.JOB_MAX_DAILY_APPLIES || '10', 10),
    },
  },
} as const;
