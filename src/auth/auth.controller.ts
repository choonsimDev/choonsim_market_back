import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
  Get,
  Req,
} from '@nestjs/common';
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
    // console.log('code', code);
    if (!this.authService.validateAdminCode(code)) {
      throw new UnauthorizedException('Invalid admin code');
    }

    const payload = { isAdmin: true };
    // console.log('payload', payload);
    const token = this.authService.generateJwtToken(payload);
    // console.log('token', token);

    res.cookie('jwt', token, {
      // domain: process.env.FRONTEND_DOMAIN,
      domain: 'http://localhost:8080',
      path: '/',
      sameSite: 'strict',
      secure: true,
      httpOnly: false,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(HttpStatus.OK).send({ message: 'Login successful' });
  }

  // @UseGuards(JwtGuard)
  // @ApiBearerAuth('JWT')
  @Get('validate')
  validate(@Req() req: Request) {
    // console.log(req);
    return { message: 'Token is valid' };
  }
}
