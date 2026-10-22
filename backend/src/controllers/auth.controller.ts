import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as authService from '../services/auth.service';
import { signToken } from '../lib/jwt';

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req: AuthRequest, res: Response) {
  try {
    const body = registerSchema.parse(req.body);
    const user = await authService.register(body.name, body.email, body.password);
    const token = signToken(user.id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ success: true, data: { user } });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'REGISTRATION_FAILED', message: error.message },
    });
  }
}

export async function login(req: AuthRequest, res: Response) {
  try {
    const body = loginSchema.parse(req.body);
    const user = await authService.login(body.email, body.password);
    const token = signToken(user.id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, data: { user } });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: { code: 'LOGIN_FAILED', message: error.message },
    });
  }
}

export async function logout(req: AuthRequest, res: Response) {
  res.clearCookie('token');
  res.json({ success: true, data: { message: 'Logged out successfully' } });
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    const user = await authService.getMe(req.userId!);
    res.json({ success: true, data: { user } });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: error.message },
    });
  }
}
