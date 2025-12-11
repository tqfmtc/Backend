import express from 'express';
import Supervisor from '../models/Supervisor.js';
import { auth, adminOnly, checkPermission } from '../middleware/auth.js';
import { createActivityLogger, logAdminActivity } from '../middleware/activityLogger.js';


const router = express.Router();

// GET /api/supervisor - Get all supervisors (admin only)
router.get('/', auth, checkPermission('supervisors', 'read'), async (req, res) => {
  try {
    const supervisors = await Supervisor.find().select('-password');
    res.json(supervisors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/supervisor - Create new supervisor (admin only)
router.post('/', auth, checkPermission('supervisors', 'write'), createActivityLogger('CREATE_SUPERVISOR', 'Supervisor'), async (req, res) => {
  try {
    const { name, email, phone, password, assignedCenters } = req.body;
    
    // Check if supervisor already exists
    const existingSupervisor = await Supervisor.findOne({ 
      $or: [{ email }, { phone }] 
    });
    
    if (existingSupervisor) {
      return res.status(400).json({ 
        message: 'Supervisor with this email or phone already exists' 
      });
    }

    const supervisor = new Supervisor({
      name,
      email,
      phone,
      password,
      assignedCenters: assignedCenters || []
    });

    await supervisor.save();
    
    // Remove password from response
    const supervisorResponse = supervisor.toObject();
    delete supervisorResponse.password;

    res.status(201).json(supervisorResponse);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/supervisor/:id - Update supervisor (admin only)
router.put('/:id', auth, checkPermission('supervisors', 'write'), createActivityLogger('UPDATE_SUPERVISOR', 'Supervisor'), async (req, res) => {
  try {
    const { name, email, phone, password, assignedCenters } = req.body;
    const updateData = {};
    
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (password) updateData.password = password;
    if (assignedCenters) updateData.assignedCenters = assignedCenters;

    const supervisor = await Supervisor.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!supervisor) {
      return res.status(404).json({ message: 'Supervisor not found' });
    }

    res.json(supervisor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/supervisor/:id - Delete supervisor (admin only)
router.delete('/:id', auth, checkPermission('supervisors', 'write'), async (req, res) => {
  try {
    const supervisor = await Supervisor.findById(req.params.id);
    if (!supervisor) {
      return res.status(404).json({ message: 'Supervisor not found' });
    }
    
    // Store supervisor name for activity logging
    req.deletedItemName = supervisor.name;
    
    await Supervisor.findByIdAndDelete(req.params.id);
    
    // Log the activity manually since we need the supervisor info before deletion
    await logAdminActivity(
      req.user,
      'DELETE_SUPERVISOR',
      'Supervisor',
      req.params.id,
      supervisor.name,
      { deletedSupervisor: { name: supervisor.name, email: supervisor.email } },
      req
    );
    
    res.json({ message: 'Supervisor deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router; 