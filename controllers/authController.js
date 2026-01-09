import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import Admin from '../models/Admin.js';
import Supervisor from '../models/Supervisor.js';
import Tutor from '../models/Tutor.js';
import Center from '../models/Center.js';
import { logAdminActivity } from '../middleware/activityLogger.js';

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Admin Login
// @route   POST /api/auth/admin/login
// @access  Public
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for admin
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if password is a bcrypt hash
    const isBcryptHash = admin.password && 
      (admin.password.startsWith('$2a$') || admin.password.startsWith('$2b$'));
    
    let isMatch = false;
    
    // Handle both bcrypt and plain text passwords for backward compatibility
    if (isBcryptHash) {
      // Bcrypt comparison
      isMatch = await bcrypt.compare(password, admin.password);
    } else {
      // Plain text comparison (for backward compatibility)
      isMatch = (password === admin.password);
      
      if (isMatch) {
        // If plain text password matches, upgrade to bcrypt hash for future logins
        // This preserves the admin's original password but stores it securely
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await Admin.updateOne({ _id: admin._id }, { password: hashedPassword });
        console.log(`Admin password upgraded to bcrypt hash for ${admin.email}`);
      }
    }
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      superAdmin: admin.superAdmin,
      permissions: admin.permissions,
      token: generateToken(admin._id, 'admin')
    });
  } catch (error) {
    console.error('DEBUG: Admin login error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Tutor Login
// @route   POST /api/auth/tutor/login
// @access  Public
export const tutorLogin = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Find tutor by phone number, explicitly selecting the password field
    const tutor = await Tutor.findOne({ phone }).select('+password')
      .populate('assignedCenter', 'name location coordinates');

    if (!tutor) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    if(tutor.status === 'inactive') {
      return res.status(401).json({ message: 'Account is inactive. Please contact admin.' });
    }

    // Check if password exists
    if (!tutor.password) {
      return res.status(401).json({ message: 'Account setup incomplete. Please contact admin.' });
    }
    
    // Verify password
    let isMatch = false;
    
    try {
      isMatch = await bcrypt.compare(password, tutor.password);
    } catch (err) {
      console.error('Error in bcrypt comparison:', err);
    }
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = generateToken(tutor._id, 'tutor');

    // Prepare response with tutor and center data
    const response = {
      _id: tutor._id,
      name: tutor.name,
      email: tutor.email,
      phone: tutor.phone,
      role: tutor.role,
      token,
      assignedCenter: tutor.assignedCenter ? {
        _id: tutor.assignedCenter._id,
        name: tutor.assignedCenter.name,
        location: tutor.assignedCenter.location,
        coordinates: tutor.assignedCenter.coordinates
      } : null
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
};

export const supervisorLogin = async(req,res)=>{
  try {
    const { email, password } = req.body;

    // Check for supervisor
    const supervisor = await Supervisor.findOne({email}).select('+password');
    if (!supervisor) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isBcryptHash = supervisor.password && 
      (supervisor.password.startsWith('$2a$') || supervisor.password.startsWith('$2b$'));
    let isMatch = false;
    // Handle both bcrypt and plain text passwords for backward compatibility
    if (isBcryptHash) {
      // Bcrypt comparison
      isMatch = await bcrypt.compare(password, supervisor.password);
    } else {
      // Plain text comparison (for backward compatibility)
      isMatch = (password === supervisor.password);
      
      if (isMatch) {
        // If plain text password matches, upgrade to bcrypt hash for future logins
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await Supervisor.updateOne({ _id: supervisor._id }, { password: hashedPassword });
        console.log(`Supervisor password upgraded to bcrypt hash for ${supervisor.email}`);
      }
    }
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.json({
      _id: supervisor._id,
      name: supervisor.name,
      email: supervisor.email,
      role: supervisor.role,
      assignedCenters: supervisor.assignedCenters,
      token: generateToken(supervisor._id, 'supervisor')
    });
  }
  catch (error) {
    console.error('Supervisor login error:', error);
    res.status(500).json({ message: error.message });
}
}


// Fast password reset endpoint for debugging
export const forceResetTutorPassword = async (req, res) => {
  const { phone, newPassword } = req.body;
  const tutor = await Tutor.findOne({ phone });
  if (!tutor) return res.status(404).json({ message: 'Tutor not found' });
  tutor.password = await bcrypt.hash(newPassword, 10);
  await tutor.save();
  console.log('Password after manual hash:', tutor.password);
  res.json({ message: 'Password reset!' });
};

// @desc    Register Admin
// @route   POST /api/auth/admin/register
// @access  Admin only
export const registerAdmin = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Check if admin exists
    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    // Create admin
    const admin = await Admin.create({
      name,
      email,
      phone,
      password
    });

    // Log the activity
    if (req.user) {
      await logAdminActivity(
        req.user,
        'CREATE_ADMIN',
        'Admin',
        admin._id,
        admin.name,
        {
          requestBody: req.body,
          responseData: {
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role
          }
        },
        req
      );
    }

    res.status(201).json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      token: generateToken(admin._id, 'admin')
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const registerSupervisor = async (req, res) => {
  try {
    const { name, email, phone, password, assignedCenters } = req.body;
    const supervisorExists = await Supervisor.findOne({ email });
    if (supervisorExists) {
      return res.status(400).json({ message: 'Supervisor already exists' });
    }
    const supervisor = await Supervisor.create({
      name,
      email,
      phone,
      password,
      assignedCenters
    });

    // Log the activity
    if (req.user) {
      await logAdminActivity(
        req.user,
        'CREATE_SUPERVISOR',
        'Supervisor',
        supervisor._id,
        supervisor.name,
        {
          requestBody: req.body,
          responseData: {
            _id: supervisor._id,
            name: supervisor.name,
            email: supervisor.email,
            role: supervisor.role
          }
        },
        req
      );
    }

    res.status(201).json({
      _id: supervisor._id,
      name: supervisor.name,
      email: supervisor.email,
      role: supervisor.role,
      token: generateToken(supervisor._id, 'supervisor')
    });
  } catch (error) {
    console.error('Supervisor registration error:', error);
    res.status(500).json({ message: error.message });
  }
};