import express from 'express';
import Supervisor from '../models/Supervisor.js';
import { auth, adminOnly } from '../middleware/auth.js';


const router = express.Router();

router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const supervisors = await Supervisor.find().select('-password');
    res.json(supervisors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, email, phone, password,assignedCenters } = req.body;
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

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const supervisor = await Supervisor.findByIdAndDelete(req.params.id);
    if (!supervisor) {
      return res.status(404).json({ message: 'Supervisor not found' });
    }
    res.json({ message: 'Supervisor deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('')

export default router; 