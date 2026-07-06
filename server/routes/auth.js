import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function createToken(user) {
  return jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'dev-secret-change-me', {
    expiresIn: '7d'
  });
}

router.post('/signup', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, email, passwordHash });

    res.status(201).json({ user, token: createToken(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const login = String(req.body.login || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const user = await User.findOne({ $or: [{ username: login }, { email: login }] });
    if (!user) {
      return res.status(401).json({ message: 'Invalid login details' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid login details' });
    }

    res.json({ user, token: createToken(user) });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
