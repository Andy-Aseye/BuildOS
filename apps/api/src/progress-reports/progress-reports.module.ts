import { Module } from '@nestjs/common';
import { ProgressReportsService } from './progress-reports.service';
import { ProgressReportsController } from './progress-reports.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [ProgressReportsController],
  providers: [ProgressReportsService],
})
export class ProgressReportsModule {}
