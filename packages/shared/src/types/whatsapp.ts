export enum MessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VOICE_NOTE = 'VOICE_NOTE',
  DOCUMENT = 'DOCUMENT',
  VIDEO = 'VIDEO',
}

export enum ProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export type ClassificationType =
  | 'site_update'
  | 'cost_entry'
  | 'material_delivery'
  | 'attendance'
  | 'incident'
  | 'delay_report'
  | 'rfi'
  | 'question'
  | 'unclassified';

export interface WhatsappMessage {
  id: string;
  tenantId: string | null;
  projectId: string | null;
  direction: MessageDirection;
  whatsappMsgId: string;
  fromPhone: string;
  toPhone: string;
  messageType: MessageType;
  textContent: string | null;
  transcription: string | null;
  mediaUrl: string | null;
  processingStatus: ProcessingStatus;
  classifiedAs: ClassificationType | null;
  extractedData: unknown;
  senderId: string | null;
  receivedAt: string;
  processedAt: string | null;
}
