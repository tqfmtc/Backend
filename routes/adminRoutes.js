import express from 'express';
import Admin from '../models/Admin.js';
import AdminActivity from '../models/AdminActivity.js';
import { auth, adminOnly, checkPermission } from '../middleware/auth.js';
import { createActivityLogger, logAdminActivity } from '../middleware/activityLogger.js';

const router = express.Router();

// GET /api/admin - Get all admins (admin only)
router.get('/', auth, checkPermission('admins', 'read'), async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Helper to validate admin write permissions
const validateAdminPermissions = (permissions) => {
  if (!permissions) return { isValid: true, isSuperAdmin: false };
  
  // If trying to give write access to admins section
  if (permissions.admins && permissions.admins.write) {
    const requiredSections = [
      'dashboard', 'tutors', 'hadiyaCenters', 'students', 
      'tutorAttendance', 'guestTutors', 'announcements', 
      'supervisors', 'subjects'
    ];

    // Check if all other sections have both read and write access
    const hasAllAccess = requiredSections.every(section => 
      permissions[section] && 
      permissions[section].read === true && 
      permissions[section].write === true
    );

    if (!hasAllAccess) {
      return { 
        isValid: false, 
        error: 'Cannot grant Admin Write permission unless all other permissions (Read & Write) are granted.' 
      };
    }
    
    // If all access is present, they become superAdmin
    return { isValid: true, isSuperAdmin: true };
  }

  return { isValid: true, isSuperAdmin: false };
};

// POST /api/admin - Create new admin (admin only)
router.post('/', auth, checkPermission('admins', 'write'), createActivityLogger('CREATE_ADMIN', 'Admin'), async (req, res) => {
  try {
    const { name, email, phone, password, permissions } = req.body;
    
    // Validate permissions logic
    const permCheck = validateAdminPermissions(permissions);
    if (!permCheck.isValid) {
      return res.status(400).json({ message: permCheck.error });
    }

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
      password,
      superAdmin: permCheck.isSuperAdmin, // Auto-set based on permissions
      permissions: permissions || {}
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
router.put('/:id', auth, checkPermission('admins', 'write'), createActivityLogger('UPDATE_ADMIN', 'Admin'), async (req, res) => {
  try {
    const { name, email, phone, password, permissions } = req.body;
    const updateData = {};
    
    // Validate permissions logic if permissions are being updated
    if (permissions) {
      const permCheck = validateAdminPermissions(permissions);
      if (!permCheck.isValid) {
        return res.status(400).json({ message: permCheck.error });
      }
      updateData.permissions = permissions;
      // Only update superAdmin if permissions logic dictates it, or if explicitly turning off (though logic handles true case)
      if (permCheck.isSuperAdmin) {
        updateData.superAdmin = true;
      } else {
        // If not super admin by permission logic, we should probably respect the explicit superAdmin flag if passed, 
        // OR set it to false if they lost the "all access" status. 
        // The requirement says "in this case... set superAdmin true". 
        // It implies if they DON'T have all access, they shouldn't be superAdmin?
        // Let's assume if they don't meet the criteria, superAdmin is false.
        updateData.superAdmin = false;
      }
    }

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
router.delete('/:id', auth, checkPermission('admins', 'write'), async (req, res) => {
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