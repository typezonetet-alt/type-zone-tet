import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StatsModule } from '../stats/stats.module';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';
import { AdaptiveSessionService } from './adaptive-session.service';

@Module({
  imports: [AuthModule, StatsModule],
  controllers: [ExercisesController],
  providers: [ExercisesService, AdaptiveSessionService],
  exports: [ExercisesService],
})
export class ExercisesModule {}
