import { NextFunction, Request, Response } from 'express';
import JWT from 'jsonwebtoken';
import { NotAuthorizedError } from './error-handler';
import { AuthPayload } from '@auth/interfaces/auth.interface';
import { config } from '@root/config';

export class AuthMiddleware {
  // TODO: Add active timeout of 15 min

  public verifyUser(req: Request, _res: Response, next: NextFunction): void {
    if (!req.session?.jwt) {
      throw new NotAuthorizedError('Please login - no token');
    }

    try {
      const payload: AuthPayload = JWT.verify(req.session.jwt, config.JWT_TOKEN!) as AuthPayload;
      req.currentUser = payload;
    } catch (error) {
      throw new NotAuthorizedError('Token invalid, Please login');
    }
    next();
  }

  public checkAuth(req: Request, _res: Response, next: NextFunction): void {
    if (!req.currentUser) {
      throw new NotAuthorizedError('Authentication is reqired to access this route');
    }
    next();
  }
}

export const authMiddleware: AuthMiddleware = new AuthMiddleware();
