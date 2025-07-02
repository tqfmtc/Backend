import express from 'express';
import { auth, adminOnly } from '../middleware/auth.js';
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
router.use(auth, adminOnly);
router.post('/', createAnnouncement);
router.get('/all', getAllAnnouncements);
router.put('/:id', updateAnnouncement);
router.delete('/:id', deleteAnnouncement);

export default router;
