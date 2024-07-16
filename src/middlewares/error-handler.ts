import { Request, Response, NextFunction } from "express";

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log the error
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });

  // Send error response
  res.status(500).json({
    error: 'An unexpected error occurred',
    requestId: req.headers['x-request-id'] || 'unknown'
  });
};