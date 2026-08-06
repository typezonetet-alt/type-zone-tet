import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { AuthenticatedUser } from '@tt-digita/shared';
import { AuthService } from './auth.service';
import { StudentLoginDto } from './dto/student-login.dto';
import { StaffLoginDto } from './dto/staff-login.dto';
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from './auth.constants';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

const LOGIN_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login/student')
  @HttpCode(200)
  @Throttle(LOGIN_THROTTLE)
  async loginStudent(
    @Body() dto: StudentLoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthenticatedUser> {
    const user = await this.authService.validateStudent(dto.code, dto.password);
    await this.setSessionCookie(res, user);
    return user;
  }

  @Post('login/staff')
  @HttpCode(200)
  @Throttle(LOGIN_THROTTLE)
  async loginStaff(
    @Body() dto: StaffLoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthenticatedUser> {
    const user = await this.authService.validateStaff(dto.email, dto.password);
    await this.setSessionCookie(res, user);
    return user;
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  private async setSessionCookie(res: Response, user: AuthenticatedUser) {
    const token = await this.authService.issueToken(user);
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_MS,
      path: '/',
    });
  }
}
