import { Controller, Post, Body, Res, HttpStatus, UnauthorizedException, UseGuards, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { JwtGuard } from './guards/jwt.guard';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiProperty({
    example: {
      code: 'admin123',
    },
  })
  async login(@Body('code') code: string, @Res() res: Response) {
    if (!this.authService.validateAdminCode(code)) {
      throw new UnauthorizedException('Invalid admin code');
    }

    const payload = { isAdmin: true };
    const token = this.authService.generateJwtToken(payload);

    res.cookie('jwt', token, {
      domain: process.env.FRONTEND_DOMAIN,
      path: '/',
      sameSite: 'strict',
      secure: true,
      httpOnly: false,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  
    res.status(HttpStatus.OK).send({ message: 'Login successful' });
  }

  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT')
  @Get('validate')
  validate(@Req() req: Request) {
    return { message: 'Token is valid' };
  }
}
