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

/**
 * GET /api/auth/users
 * Admin-only: list all users (without password hashes)
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    // Verify admin via token (simple header check)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;
    if (decoded.role !== 'Admin') {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const users = await UserModel.find().lean();
    const sanitized = users.map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      role: u.role,
    }));
    res.json(sanitized);
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Failed to list users' });
  }
});

/**
 * POST /api/auth/register
 * Admin-only: create a new user
 * Body: { username, password, name, email, role }
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;
    if (decoded.role !== 'Admin') {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const { username, password, name, email, role } = req.body;

    if (!username || !password || !name || !email || !role) {
      res.status(400).json({ message: 'All fields are required: username, password, name, email, role' });
      return;
    }

    // Check uniqueness
    const existing = await UserModel.findOne({ username }).lean();
    if (existing) {
      res.status(409).json({ message: 'Username already exists' });
      return;
    }

    const userCount = await UserModel.countDocuments();
    const newUser = new UserModel({
      id: `user-${String(userCount + 1).padStart(3, '0')}`,
      username,
      passwordHash: bcrypt.hashSync(password, 10),
      name,
      email,
      role,
    });
    await newUser.save();

    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

export default router;
