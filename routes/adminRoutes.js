import express from 'express';
import Admin from '../models/Admin.js';
import { auth, adminOnly } from '../middleware/auth.js';

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

// PUT /api/admin/:id - Update admin (admin only)
router.put('/:id', auth, adminOnly, async (req, res) => {
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
    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.json({ message: 'Admin deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router; 