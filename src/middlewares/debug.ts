import { NextFunction, Request, Response } from 'npm:@types/express@4.17.15';

export const debugMiddleware = (req: Request, _: Response, next: NextFunction) => {
  console.log({
    path: req.path,
    method: req.method,
    'x-sender-channel': req.headers['x-sender-channel'] as string,
    'x-sender-name': req.headers['x-sender-name'] as string,
    'x-user-id': req.headers['x-user-id'] as string,
  });
  
  next();
};