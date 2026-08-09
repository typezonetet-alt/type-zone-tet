import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ClassesModule } from '../classes/classes.module';
import { GamificationModule } from '../gamification/gamification.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [AuthModule, ClassesModule, GamificationModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
