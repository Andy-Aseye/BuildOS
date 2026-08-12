export type WhatsAppWebhookPayload = Record<string, string | undefined> & {
  AccountSid?: string;
  SmsSid?: string;
  SmsMessageSid?: string;
  MessageSid?: string;
  From?: string;
  To?: string;
  Body?: string;
  NumMedia?: string;
  Timestamp?: string;
  [key: string]: string | undefined;
};

export type TwilioMediaItem = {
  url: string;
  contentType?: string;
};

export type TwilioInboundMessage = {
  from: string;
  to: string;
  id: string;
  timestamp: string;
  body: string | null;
  numMedia: number;
  media: TwilioMediaItem[];
};

export type WhatsAppInboundJobData = {
  payload: WhatsAppWebhookPayload;
};
