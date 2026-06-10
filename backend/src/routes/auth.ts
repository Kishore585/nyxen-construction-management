/**
 * Auth Routes
 * POST /api/auth/login — Authenticate user and return JWT token
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import ENV from '../config/env';
import { UserModel, User } from '../models/User';

const router = Router();

// Demo users with pre-hashed passwords
export const DEMO_USERS = [
  {
    id: 'user-001',
    username: 'admin',
    passwordHash: bcrypt.hashSync('admin123', 10),
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@nyxen.ai',
    role: 'Admin',
  },
  {
    id: 'user-002',
    username: 'engineer',
    passwordHash: bcrypt.hashSync('eng123', 10),
    name: 'Vikram Reddy',
    email: 'vikram.reddy@nyxen.ai',
    role: 'Engineer',
  },
  {
    id: 'user-003',
    username: 'auditor',
    passwordHash: bcrypt.hashSync('audit123', 10),
    name: 'Meera Nair',
    email: 'meera.nair@nyxen.ai',
    role: 'Auditor',
  },
  {
    id: 'user-004',
    username: 'supervisor',
    passwordHash: bcrypt.hashSync('super123', 10),
    name: 'Priya Sharma',
    email: 'priya.sharma@nyxen.ai',
    role: 'Supervisor',
  },
  {
    id: 'user-005',
    username: 'jrengineer',
    passwordHash: bcrypt.hashSync('jre123', 10),
    name: 'Arun Patel',
    email: 'arun.patel@nyxen.ai',
    role: 'Jr. Engineer',
  },
];

/**
 * Seed users helper
 */
export async function seedUsers(): Promise<void> {
  const adminUser = await UserModel.findOne({ username: 'admin' });
  if (!adminUser) {
    console.log('🌱 Admin user not found. Dropping users collection and seeding...');
    try {
      await mongoose.connection.collection('users').drop();
    } catch (e) {
      // Collection might not exist, ignore
    }
    await UserModel.insertMany(DEMO_USERS);
    console.log(`✅ Seeded ${DEMO_USERS.length} demo users`);
  }
}

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Returns: { token, user }
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ message: 'Username and password are required' });
      return;
    }

    const user = await UserModel.findOne({ username }).lean();
    if (!user) {
      res.status(401).json({ message: 'Invalid username or password' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ message: 'Invalid username or password' });
      return;
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRY as any }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
