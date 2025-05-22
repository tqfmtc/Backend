import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import Admin from '../models/Admin.js';
import Tutor from '../models/Tutor.js';
import Center from '../models/Center.js';

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
    console.log('------------------------------------------------------------');
    console.log(`DEBUG: Login attempt for phone: ${phone}`);
    console.log(`DEBUG: Password received (first 3 chars): ${password.substring(0, 3)}***`);
    console.log(`DEBUG: Password length: ${password.length} characters`);

    // Find tutor by phone number, explicitly selecting the password field
    const tutor = await Tutor.findOne({ phone }).select('+password')
      .populate('assignedCenter', 'name location coordinates');

    if (!tutor) {
      console.log(`DEBUG: No tutor found with phone: ${phone}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log(`DEBUG: Tutor found: ${tutor.name} (ID: ${tutor._id})`);
    
    if(tutor.status === 'inactive') {
      console.log(`DEBUG: Tutor account is inactive: ${tutor.name}`);
      return res.status(401).json({ message: 'Account is inactive. Please contact admin.' });
    }

    // Check if password exists
    if (!tutor.password) {
      console.log('DEBUG: Tutor has no password set');
      return res.status(401).json({ message: 'Account setup incomplete. Please contact admin.' });
    }
    
    console.log(`DEBUG: Password hash in DB: ${tutor.password}`);
    console.log(`DEBUG: DB password hash length: ${tutor.password.length} characters`);
    console.log(`DEBUG: Is bcrypt hash? ${tutor.password.startsWith('$2a$') || tutor.password.startsWith('$2b$')}`);
    
    // Now attempt bcrypt verification with detailed logging
    let isMatch = false;
    
    try {
      console.log('DEBUG: Attempting bcrypt comparison...');
      // Let's try to create a test hash just to make sure bcrypt is working
      const testSalt = await bcrypt.genSalt(10);
      const testHash = await bcrypt.hash('test123', testSalt);
      console.log(`DEBUG: Test hash generation: ${testHash ? 'SUCCESS' : 'FAILED'}`);
      
      // Verify our test hash works
      const testVerify = await bcrypt.compare('test123', testHash);
      console.log(`DEBUG: Test verification: ${testVerify ? 'SUCCESS' : 'FAILED'}`);
      
      // Now try the actual login password verification
      isMatch = await bcrypt.compare(password, tutor.password);
      console.log(`DEBUG: Actual password verification result: ${isMatch ? 'SUCCESS' : 'FAILED'}`);
      
      // Try comparing with the default password, just in case
      const defaultMatch = await bcrypt.compare('***REMOVED***', tutor.password);
      console.log(`DEBUG: Default password '***REMOVED***' match: ${defaultMatch ? 'YES' : 'NO'}`);
      
      // If default password matches but entered password doesn't, suggest using default
      if (defaultMatch && !isMatch) {
        console.log(`DEBUG: User should try the default password '***REMOVED***'`);
      }
      
    } catch (err) {
      console.error('DEBUG: Error in bcrypt comparison:', err);
    }
    
    if (!isMatch) {
      console.log('DEBUG: Login failed - Invalid credentials');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    console.log('DEBUG: Password verification SUCCESSFUL');
    console.log('------------------------------------------------------------');
    
    // Generate JWT token
    const token = generateToken(tutor._id, 'tutor');
    console.log('Login successful, token generated');

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
// @access  Public
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