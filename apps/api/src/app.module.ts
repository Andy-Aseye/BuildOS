import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { TenantsModule } from './tenants/tenants.module';
import { CostsModule } from './costs/costs.module';
import { DiaryModule } from './diary/diary.module';
import { AttendanceModule } from './attendance/attendance.module';
import { FilesModule } from './files/files.module';
import { PhasesModule } from './phases/phases.module';
import { JobsModule } from './jobs/jobs.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { UsersModule } from './users/users.module';
import { RfisModule } from './rfis/rfis.module';
import { DrawingsModule } from './drawings/drawings.module';
import { MaterialsModule } from './materials/materials.module';
import { DelaysModule } from './delays/delays.module';
import { ProgressReportsModule } from './progress-reports/progress-reports.module';
import { InvitesModule } from './invites/invites.module';
import { SearchModule } from './search/search.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EmailModule } from './email/email.module';
import { AiQueryModule } from './ai-query/ai-query.module';
import { ImportModule } from './import/import.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
    PrismaModule,
    JobsModule,
    NotificationsModule,
    EmailModule,
    AuthModule,
    UsersModule,
    InvitesModule,
    ProjectsModule,
    TenantsModule,
    CostsModule,
    DiaryModule,
    AttendanceModule,
    FilesModule,
    PhasesModule,
    RfisModule,
    DrawingsModule,
    MaterialsModule,
    DelaysModule,
    ProgressReportsModule,
    WhatsAppModule,
    SearchModule,
    AiQueryModule,
    ImportModule,
  ],
})
export class AppModule {}
