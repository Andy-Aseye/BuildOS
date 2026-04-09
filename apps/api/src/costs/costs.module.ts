import { Module, forwardRef } from '@nestjs/common';
import { CostsController } from './costs.controller';
import { CostsService } from './costs.service';
import { BudgetAlertService } from './budget-alert.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [forwardRef(() => WhatsAppModule)],
  controllers: [CostsController],
  providers: [CostsService, BudgetAlertService],
  exports: [CostsService, BudgetAlertService],
})
export class CostsModule {}
