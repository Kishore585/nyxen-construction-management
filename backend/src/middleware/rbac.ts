/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Factory function that returns middleware restricting access to specified roles.
 * Must be used AFTER requireAuth or optionalAuth middleware so req.user is populated.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Returns middleware that only allows the listed roles through.
 * Role comparison is case-insensitive.
 *
 * Usage:
 *   router.put('/resource', requireRole('Admin', 'Jr. Engineer'), handler);
 */
export function requireRole(...allowedRoles: string[]) {
  const normalised = allowedRoles.map((r) => r.toLowerCase());

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const userRole = req.user.role.toLowerCase();

    if (!normalised.includes(userRole)) {
      res.status(403).json({
        message: `Access denied — your role (${req.user.role}) is not permitted for this action`,
      });
      return;
    }

    next();
  };
}

export default { requireRole };
