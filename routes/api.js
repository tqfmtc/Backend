import express from 'express';
import authRoutes from './authRoutes.js';
import centerRoutes from './centerRoutes.js';
import tutorRoutes from './tutorRoutes.js';
import studentRoutes from './studentRoutes.js';
import tutorApplicationRoutes from './tutorApplicationRoutes.js';
import contactRoutes from './contactRoutes.js';

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/centers', centerRoutes);
router.use('/tutors', tutorRoutes);
router.use('/students', studentRoutes);
router.use('/tutor-applications', tutorApplicationRoutes);
router.use('/contact', contactRoutes);

export default router;