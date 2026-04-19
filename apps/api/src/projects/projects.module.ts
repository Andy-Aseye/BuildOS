import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { CostsModule } from '../costs/costs.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [CostsModule, WhatsAppModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
