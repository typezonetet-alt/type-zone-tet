import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type {
  AuthenticatedUser,
  BulkImportResult,
  ClassDetail,
  ClassSummary,
  CreatedCredentials,
} from '@tt-digita/shared';
import { Role } from '@tt-digita/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { CreateStudentsBulkDto } from './dto/create-students-bulk.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER, Role.ADMIN, Role.SUPERADMIN)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<ClassSummary[]> {
    return this.classesService.listForUser(user);
  }

  @Get(':id')
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ClassDetail> {
    return this.classesService.getDetail(user, id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  create(@Body() dto: CreateClassDto): Promise<ClassSummary> {
    return this.classesService.create(dto);
  }

  @Patch(':id/archive')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  archive(@Param('id') id: string): Promise<ClassSummary> {
    return this.classesService.archive(id);
  }

  @Post(':id/students')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  createStudent(
    @Param('id') id: string,
    @Body() dto: CreateStudentDto,
  ): Promise<CreatedCredentials> {
    return this.classesService.createStudent(id, dto);
  }

  @Post(':id/students/bulk')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  createStudentsBulk(
    @Param('id') id: string,
    @Body() dto: CreateStudentsBulkDto,
  ): Promise<BulkImportResult> {
    return this.classesService.createStudentsBulk(id, dto.names);
  }

  @Post(':id/members')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
  ): Promise<{ ok: true }> {
    await this.classesService.addExistingMember(id, dto.code);
    return { ok: true };
  }

  @Delete(':id/members/:studentId')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async removeMember(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ): Promise<{ ok: true }> {
    await this.classesService.removeMember(id, studentId);
    return { ok: true };
  }
}
