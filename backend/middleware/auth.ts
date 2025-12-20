import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase.js';

// Attach req.user when a valid Bearer token is provided
export async function authenticate(req: Request & { user?: any }, res: Response, next: NextFunction) {
  try {
    const authHeader = (req.headers.authorization || '') as string;
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) return res.status(401).json({ error: 'Missing Authorization token' });

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach minimal user info to request
    req.user = { id: data.user.id, email: data.user.email };
    return next();
  } catch (e: any) {
    console.error('Auth middleware error:', e?.message || e);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}
