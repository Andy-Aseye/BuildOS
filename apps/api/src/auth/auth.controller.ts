import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  companyName: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class RefreshDto {
  @IsString()
  refreshToken: string;
}

export class AcceptInviteDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(1)
  name: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle([{ ttl: 60_000, limit: 5 }])
  register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  @Post('login')
  @Throttle([{ ttl: 60_000, limit: 10 }])
  login(@Body() body: LoginDto) {
    return this.auth.login(body);
  }

  @Post('refresh')
  refresh(@Body() body: RefreshDto) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('accept-invite')
  acceptInvite(@Body() body: AcceptInviteDto) {
    return this.auth.acceptInvite(body);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: unknown) {
    return user;
  }
}
