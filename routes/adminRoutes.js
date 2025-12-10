import express from 'express';
import Admin from '../models/Admin.js';
import AdminActivity from '../models/AdminActivity.js';
import { auth, adminOnly } from '../middleware/auth.js';
import { createActivityLogger, logAdminActivity } from '../middleware/activityLogger.js';

const router = express.Router();

// GET /api/admin - Get all admins (admin only)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin - Create new admin (admin only)
router.post('/', auth, adminOnly, createActivityLogger('CREATE_ADMIN', 'Admin'), async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ 
      $or: [{ email }, { phone }] 
    });
    
    if (existingAdmin) {
      return res.status(400).json({ 
        message: 'Admin with this email or phone already exists' 
      });
    }

    const admin = new Admin({
      name,
      email,
      phone,
      password
    });

    await admin.save();
    
    // Remove password from response
    const adminResponse = admin.toObject();
    delete adminResponse.password;

    res.status(201).json(adminResponse);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/admin/:id - Update admin (admin only)
router.put('/:id', auth, adminOnly, createActivityLogger('UPDATE_ADMIN', 'Admin'), async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const updateData = {};
    
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (password) updateData.password = password;

    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json(admin);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/admin/:id - Delete admin (admin only)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    // Delete all activities of this admin first
    await AdminActivity.deleteMany({ adminId: req.params.id });
    
    // Store admin name for activity logging
    req.deletedItemName = admin.name;
    
    await Admin.findByIdAndDelete(req.params.id);
    
    // Log the activity manually since we need the admin info before deletion
    await logAdminActivity(
      req.user,
      'DELETE_ADMIN',
      'Admin',
      req.params.id,
      admin.name,
      { deletedAdmin: { name: admin.name, email: admin.email } },
      req
    );
    
    res.json({ message: 'Admin deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router; 