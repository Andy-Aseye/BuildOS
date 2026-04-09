import { Module } from '@nestjs/common';
import { DelaysService } from './delays.service';
import { DelaysController } from './delays.controller';

@Module({
  controllers: [DelaysController],
  providers: [DelaysService],
})
export class DelaysModule {}
