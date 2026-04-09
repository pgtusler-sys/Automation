import { refreshMicrosoftToken, TokenSet } from '../../config/credentials';
import { logger } from '../shared/logger';

let cachedToken: TokenSet | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }
  logger.info('Refreshing Microsoft Graph access token');
  cachedToken = await refreshMicrosoftToken();
  return cachedToken.accessToken;
}

async function graphRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const token = await getAccessToken();
  const url = `https://graph.microsoft.com/v1.0${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Graph API error ${response.status}: ${body}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function getInboxMessages(sinceDateTime: string, top = 50): Promise<any[]> {
  const filter = `receivedDateTime ge ${sinceDateTime}`;
  const select = 'id,conversationId,subject,from,toRecipients,body,bodyPreview,receivedDateTime,hasAttachments,parentFolderId,isRead';
  const data = await graphRequest(
    `/me/mailfolders/inbox/messages?$filter=${encodeURIComponent(filter)}&$select=${select}&$top=${top}&$orderby=receivedDateTime asc`
  );
  return data.value || [];
}

export async function getSharedMailboxMessages(
  mailboxEmail: string,
  sinceDateTime: string,
  top = 50
): Promise<any[]> {
  const filter = `receivedDateTime ge ${sinceDateTime}`;
  const select = 'id,subject,from,body,bodyPreview,receivedDateTime,hasAttachments';
  const data = await graphRequest(
    `/users/${mailboxEmail}/mailfolders/inbox/messages?$filter=${encodeURIComponent(filter)}&$select=${select}&$top=${top}&$orderby=receivedDateTime asc`
  );
  return data.value || [];
}

export async function getMessageAttachments(messageId: string): Promise<any[]> {
  const data = await graphRequest(`/me/messages/${messageId}/attachments`);
  return data.value || [];
}

export async function createReplyDraft(
  messageId: string,
  replyBody: string
): Promise<any> {
  const reply = await graphRequest(`/me/messages/${messageId}/createReply`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

  const updated = await graphRequest(`/me/messages/${reply.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      body: { contentType: 'HTML', content: replyBody },
      categories: ['AutoDrafted'],
    }),
  });

  return updated;
}

export async function getDraftMessages(): Promise<any[]> {
  const data = await graphRequest(
    '/me/mailfolders/drafts/messages?$select=id,conversationId,body,categories&$top=100'
  );
  return data.value || [];
}

export async function getSentMessages(sinceDateTime: string, top = 100): Promise<any[]> {
  const filter = `sentDateTime ge ${sinceDateTime}`;
  const data = await graphRequest(
    `/me/mailfolders/sentitems/messages?$filter=${encodeURIComponent(filter)}&$select=id,conversationId,body,sentDateTime&$top=${top}&$orderby=sentDateTime desc`
  );
  return data.value || [];
}

export async function getConversationHistory(
  conversationId: string,
  top = 5
): Promise<any[]> {
  const filter = `conversationId eq '${conversationId}'`;
  const data = await graphRequest(
    `/me/messages?$filter=${encodeURIComponent(filter)}&$select=id,from,body,bodyPreview,receivedDateTime&$top=${top}&$orderby=receivedDateTime desc`
  );
  return data.value || [];
}
