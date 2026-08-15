import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { AiQueryModule } from '../ai-query/ai-query.module';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppWebhookService } from './whatsapp-webhook.service';
import { WhatsAppCloudService } from './whatsapp-cloud.service';
import { WhatsAppOpenAiService } from './whatsapp-openai.service';
import { WhatsAppProcessorService } from './whatsapp-processor.service';
import { WhatsAppWorkerRegistrar } from './whatsapp-worker.registrar';

@Module({
  imports: [PrismaModule, AiQueryModule],
  controllers: [WhatsAppController],
  providers: [
    WhatsAppWebhookService,
    WhatsAppCloudService,
    WhatsAppOpenAiService,
    WhatsAppProcessorService,
    WhatsAppWorkerRegistrar,
  ],
  exports: [WhatsAppCloudService],
})
export class WhatsAppModule {}
