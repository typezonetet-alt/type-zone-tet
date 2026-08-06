import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WorldsController } from './worlds.controller';
import { WorldsService } from './worlds.service';

@Module({
  imports: [AuthModule],
  controllers: [WorldsController],
  providers: [WorldsService],
})
export class WorldsModule {}
