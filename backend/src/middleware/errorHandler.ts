import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  details?: unknown;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "An unexpected internal server error occurred.";

  console.error(`[Error] ${statusCode} - ${message}`);

  // Never expose raw stack traces in responses
  res.status(statusCode).json({
    success: false,
    error: message,
  });
};
