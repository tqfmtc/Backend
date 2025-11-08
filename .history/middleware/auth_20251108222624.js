import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Tutor from '../models/Tutor.js';
import Supervisor from '../models/Supervisor.js';
export const auth = async (req, res, next) => {
  try {
    console.log('\n--- 🔐 AUTH MIDDLEWARE START ---');
    console.log('Request URL:', req.originalUrl);
    console.log('Headers received:', req.headers);

    const authHeader = req.header('Authorization');
    console.log('Authorization header:', authHeader);

    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      console.warn('⚠️  No Authorization token provided');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Log partial token for sanity check
    console.log('Extracted token (first 40 chars):', token.slice(0, 40) + '...');

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ JWT decoded successfully:', decoded);
    } catch (verifyErr) {
      console.error('❌ JWT verification failed:', verifyErr.message);
      return res.status(401).json({ message: 'Token is not valid (verification failed)' });
    }

    let user = null;
    if (decoded.role === 'admin') {
      console.log('Role: admin → Finding admin in DB');
      user = await Admin.findById(decoded.id).select('-password');
    } else if (decoded.role === 'tutor') {
      console.log('Role: tutor → Finding tutor in DB');
      user = await Tutor.findById(decoded.id).select('-password');
    } else if (decoded.role === 'guest') {
      console.log('Role: guest → Using lightweight guest token');
      user = { _id: decoded.id };
      req.tutorId = decoded.tutorId;
    } else if (decoded.role === 'supervisor') {
      console.log('Role: supervisor → Finding supervisor in DB');
      user = await Supervisor.findById(decoded.id).select('-password');
    } else {
      console.warn('⚠️  Unknown role in token:', decoded.role);
    }

    if (!user) {
      console.warn('⚠️  No user found for decoded ID:', decoded.id);
      return res.status(401).json({ message: 'Token is not valid (user not found)' });
    }

    console.log('✅ Auth success → user found:', {
      id: user._id,
      name: user.name,
      role: decoded.role,
    });

    req.user = user;
    req.role = decoded.role;
    console.log('--- 🔐 AUTH MIDDLEWARE END ---\n');
    next();
  } catch (err) {
    console.error('💥 Auth middleware exception:', err);
    res.status(401).json({ message: 'Token is not valid (exception)' });
  }
};


// Export both auth and protect (for backward compatibility)
export const protect = auth;

export const adminOnly = (req, res, next) => {
  if (req.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

export const supervisorOnly = (req, res, next) => {
  if (req.role !== 'supervisor') {
    return res.status(403).json({ message: 'Access denied. Supervisor only.' });
  }
  next();
};
export const supervisorAndAdminOnly = (req, res, next) => {
  if (req.role !== 'supervisor' && req.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Supervisor or Admin only.' });
  }
  next();
};

export const tutorOnly = (req, res, next) => {
  if (req.role !== 'tutor') {
    return res.status(403).json({ message: 'Access denied. Tutor only.' });
  }
  next();
};

export const guestOnly = (req, res, next) => {
  if (req.role !== 'guest') {
    return res.status(403).json({ message: 'Access denied. Guest only.' });
  }
  next();
};