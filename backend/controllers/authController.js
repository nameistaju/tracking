const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const admin = require('../config/firebaseAdmin');

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const buildAuthResponse = (user) => {
  const safeUser = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  return {
    token: generateToken(user),
    user: safeUser,
    ...safeUser,
  };
};

const isAdminEmail = (email) => {
  const adminEmails = [process.env.GOOGLE_ADMIN_EMAIL, process.env.ADMIN_EMAIL]
    .filter(Boolean)
    .map((value) => value.trim().toLowerCase());

  return adminEmails.includes((email || '').trim().toLowerCase());
};

// @desc    Register user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({ name, email, password, role });
    res.status(201).json(buildAuthResponse(user));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await user.comparePassword(password))) {
      res.json(buildAuthResponse(user));
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login/Register with Google
// @route   POST /api/auth/google
exports.googleLogin = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'Firebase token is required' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const email = decoded.email;
    const name = decoded.name || email?.split('@')[0] || 'Google User';

    if (!email) {
      return res.status(400).json({ message: 'Google account email not available' });
    }

    let user = await User.findOne({ email });
    const role = isAdminEmail(email) ? 'Admin' : 'Intern';

    if (!user) {
      user = await User.create({
        email,
        name,
        role,
        password: crypto.randomBytes(32).toString('hex'),
      });
    } else if (user.role !== role) {
      user.role = role;
      if (!user.name && name) {
        user.name = name;
      }
      await user.save();
    } else if (!user.name && name) {
      user.name = name;
      await user.save();
    }

    return res.json(buildAuthResponse(user));
  } catch (error) {
    console.error('[Google Auth Error]', error.message);
    return res.status(401).json({ message: 'Invalid or expired Firebase token' });
  }
};
