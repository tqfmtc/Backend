console.log('Tutor Application Routes loaded');
import express from 'express';
import { createTutorApplication, getTutorApplications } from '../controllers/tutorApplicationController.js';
import multer from 'multer';

const router = express.Router();
const upload = multer();

router.post('/', upload.fields([
  { name: 'certificates', maxCount: 1 },
  { name: 'memos', maxCount: 1 },
  { name: 'resume', maxCount: 1 }
]), createTutorApplication);
router.get('/', getTutorApplications);

export default router; 