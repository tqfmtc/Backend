console.log('Tutor Application Routes loaded');
import express from 'express';
import { createTutorApplication, getTutorApplications } from '../controllers/tutorApplicationController.js';
import multer from 'multer';
import { auth, supervisorAndAdminOnly } from '../middleware/auth.js';

const router = express.Router();
const upload = multer();

router.post('/', upload.fields([
  { name: 'certificates', maxCount: 1 },
  { name: 'memos', maxCount: 1 },
  { name: 'resume', maxCount: 1 }
]), createTutorApplication);
// Applications contain applicants' personal details and documents: admins/supervisors only
router.get('/', auth, supervisorAndAdminOnly, getTutorApplications);

export default router; 