import { Module } from '@nestjs/common';
import { RfisService } from './rfis.service';
import { ProjectRfisController } from './rfis.controller';
import { TenantRfisController } from './tenant-rfis.controller';

@Module({
  controllers: [ProjectRfisController, TenantRfisController],
  providers: [RfisService],
  exports: [RfisService],
})
export class RfisModule {}
