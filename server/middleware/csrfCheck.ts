import type { Request, Response, NextFunction } from 'express'

const WRITE_METHODS = new Set(['POST', 'PATCH', 'DELETE'])

export function csrfCheck(req: Request, res: Response, next: NextFunction): void {
  if (WRITE_METHODS.has(req.method)) {
    const origin = req.headers.origin
    if (origin !== process.env.ALLOWED_ORIGIN) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'CSRF check failed', retryable: false },
      })
      return
    }
  }
  next()
}
