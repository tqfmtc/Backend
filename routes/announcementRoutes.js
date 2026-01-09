import express from 'express';
import { auth, adminOnly, checkPermission } from '../middleware/auth.js';
import {
  getActiveAnnouncements,
  createAnnouncement,
  getAllAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcementController.js';

const router = express.Router();

// Public - active announcements
router.get('/', getActiveAnnouncements);

// Admin-only CRUD
router.use(auth);
router.post('/', checkPermission('announcements', 'write'), createAnnouncement);
router.get('/all', checkPermission('announcements', 'read'), getAllAnnouncements);
router.put('/:id', checkPermission('announcements', 'write'), updateAnnouncement);
router.delete('/:id', checkPermission('announcements', 'write'), deleteAnnouncement);

export default router;
