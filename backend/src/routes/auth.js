import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
// dotenv.config() is called in app.js before this file is imported
import User from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_change_me';

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    JWT_SECRET,
    { expiresIn: '12h' },
  );
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: 'Email and password are required' });
  }

  if (password.length < 4) {
    return res
      .status(400)
      .json({ error: 'Password must be at least 4 characters long' });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const userRole = role || 'user';

    const user = new User({
      name: name || null,
      email: email.toLowerCase(),
      phone: phone || null,
      password_hash: hashed,
      role: userRole,
    });

    await user.save();

    // Convert to JSON (removes password_hash)
    const userObj = user.toJSON();
    const userResponse = {
      id: user._id.toString(),
      name: userObj.name,
      email: userObj.email,
      phone: userObj.phone,
      role: userObj.role,
    };

    const token = signToken(user);

    return res.status(201).json({ user: userResponse, token });
  } catch (err) {
    console.error('Signup error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    if (err.name === 'MongoServerError' && err.code === 11000) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    return res.status(500).json({ error: err.message || 'Signup failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userObj = user.toJSON();
    const userResponse = {
      id: user._id.toString(),
      name: userObj.name,
      email: userObj.email,
      phone: userObj.phone,
      role: userObj.role,
    };

    const token = signToken(user);

    return res.json({ user: userResponse, token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

export default router;