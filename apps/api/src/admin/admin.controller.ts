import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type {
  AdminOverview,
  CreatedCredentials,
  TeacherSummary,
} from '@tt-digita/shared';
import { Role } from '@tt-digita/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPERADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  overview(): Promise<AdminOverview> {
    return this.adminService.overview();
  }

  @Get('teachers')
  listTeachers(): Promise<TeacherSummary[]> {
    return this.adminService.listTeachers();
  }

  @Post('teachers')
  createTeacher(@Body() dto: CreateTeacherDto): Promise<CreatedCredentials> {
    return this.adminService.createTeacher(dto);
  }

  @Post('students/:id/reset-progress')
  async resetProgress(@Param('id') id: string): Promise<{ ok: true }> {
    await this.adminService.resetStudentProgress(id);
    return { ok: true };
  }
}
