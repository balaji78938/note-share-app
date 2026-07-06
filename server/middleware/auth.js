import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function requireAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      const error = new Error('Login required');
      error.status = 401;
      throw error;
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
    const user = await User.findById(payload.userId);

    if (!user) {
      const error = new Error('User not found');
      error.status = 401;
      throw error;
    }

    req.user = user;
    next();
  } catch (error) {
    error.status = error.status || 401;
    next(error);
  }
}
