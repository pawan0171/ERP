import { Response } from 'express';

/** 200 OK */
export const ok = (res: Response, data: any) => res.status(200).json(data);

/** 201 Created */
export const created = (res: Response, data: any) => res.status(201).json(data);

/** 400 Bad Request */
export const badRequest = (res: Response, message: string) =>
  res.status(400).json({ error: message });

/** 401 Unauthorized */
export const unauthorized = (res: Response, message = 'Authentication required') =>
  res.status(401).json({ error: message });

/** 403 Forbidden */
export const forbidden = (res: Response, message = 'Access denied') =>
  res.status(403).json({ error: message });

/** 404 Not Found */
export const notFound = (res: Response, resource = 'Resource') =>
  res.status(404).json({ error: `${resource} not found` });

/** 409 Conflict */
export const conflict = (res: Response, message: string) =>
  res.status(409).json({ error: message });

/** 422 Unprocessable — validation errors */
export const validationError = (res: Response, errors: { field: string; message: string }[]) =>
  res.status(422).json({ error: 'Validation failed', details: errors });

/** 500 Internal Server Error */
export const serverError = (res: Response, message = 'Internal server error') =>
  res.status(500).json({ error: message });
