import express from 'express';
const router = express.Router();
import { auth, adminOnly, tutorOnly } from '../../../middleware/auth.js';
import guestTutorController from '../controllers/guestTutorController.js';

// Tutor routes
router.post('/request', auth, tutorOnly, guestTutorController.requestGuestTutor);
router.get('/my-requests', auth, tutorOnly, guestTutorController.getTutorRequests);

// Admin routes
router.get('/pending', auth, adminOnly, guestTutorController.getPendingRequests);
router.post('/approve/:requestId', auth, adminOnly, guestTutorController.approveRequest);

// Guest login route (public)
router.post('/login', guestTutorController.guestLogin);

export default router;
