/** Meta WhatsApp Cloud API webhook payload (messages field only). */

export type WhatsAppWebhookPayload = {
  object?: string;
  entry?: WhatsAppEntry[];
};

export type WhatsAppEntry = {
  id?: string;
  changes?: WhatsAppChange[];
};

export type WhatsAppChange = {
  field?: string;
  value?: WhatsAppChangeValue;
};

export type WhatsAppChangeValue = {
  messaging_product?: string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: { profile?: { name?: string }; wa_id?: string }[];
  messages?: WhatsAppInboundMessage[];
  statuses?: unknown[];
};

export type WhatsAppInboundMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type?: string; sha256?: string; caption?: string };
  audio?: { id: string; mime_type?: string; voice?: boolean };
  video?: { id: string; mime_type?: string };
  document?: { id: string; mime_type?: string; filename?: string };
};

export type WhatsAppInboundJobData = {
  payload: WhatsAppWebhookPayload;
};
