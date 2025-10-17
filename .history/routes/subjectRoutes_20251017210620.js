import express from 'express';
import studentSubjectController from '../controllers/studentSubjectController.js';
import { auth, adminOnly } from '../middleware/auth.js';
import { createActivityLogger } from '../middleware/activityLogger.js';

const router = express.Router();