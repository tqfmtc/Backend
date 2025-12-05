import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Tutor from '../models/Tutor.js';
import Supervisor from '../models/Supervisor.js';
export const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (verifyErr) {
      console.error('❌ JWT verification failed:', verifyErr.message);
      return res.status(401).json({ message: 'Token is not valid (verification failed)' });
    }

    let user = null;
    if (decoded.role === 'admin') {
      user = await Admin.findById(decoded.id).select('-password');
    } else if (decoded.role === 'tutor') {
      user = await Tutor.findById(decoded.id).select('-password');
    } else if (decoded.role === 'guest') {
      user = { _id: decoded.id };
      req.tutorId = decoded.tutorId;
    } else if (decoded.role === 'supervisor') {
      user = await Supervisor.findById(decoded.id).select('-password');
    }

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid (user not found)' });
    }

    req.user = user;
    req.role = decoded.role;
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