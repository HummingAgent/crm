type NotificationType = 
  | 'deal-created' 
  | 'deal-stage-change' 
  | 'deal-won' 
  | 'deal-lost' 
  | 'contact-created' 
  | 'company-created';

interface NotificationPayload {
  type: NotificationType;
  dealName?: string;
  dealAmount?: number;
  companyName?: string;
  contactName?: string;
  stageTo?: string;
  stageFrom?: string;
  userName?: string;
}

export async function sendSlackNotification(payload: NotificationPayload): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/slack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
    return false;
  }
}

// Helper functions for common notifications
export const notifyDealCreated = (dealName: string, amount?: number, companyName?: string) =>
  sendSlackNotification({ type: 'deal-created', dealName, dealAmount: amount, companyName });

export const notifyDealStageChange = (dealName: string, stageFrom: string, stageTo: string) =>
  sendSlackNotification({ type: 'deal-stage-change', dealName, stageFrom, stageTo });

export const notifyDealWon = (dealName: string, amount?: number, companyName?: string) =>
  sendSlackNotification({ type: 'deal-won', dealName, dealAmount: amount, companyName });

export const notifyDealLost = (dealName: string, companyName?: string) =>
  sendSlackNotification({ type: 'deal-lost', dealName, companyName });

export const notifyContactCreated = (contactName: string, companyName?: string) =>
  sendSlackNotification({ type: 'contact-created', contactName, companyName });

export const notifyCompanyCreated = (companyName: string) =>
  sendSlackNotification({ type: 'company-created', companyName });
