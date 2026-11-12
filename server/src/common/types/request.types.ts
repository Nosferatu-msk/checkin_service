import { Request } from 'express';

export interface JwtPayload {
  id: string;
  login: string;
  role: string;
  email: string;
  device_fingerprint?: string;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
