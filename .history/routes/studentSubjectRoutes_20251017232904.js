import express from 'express';
import {addStudentSubject, getStudentSubjects, removeStudentSubject} from '../controllers/studentSubjectController.js';
import { auth } from '../middleware/auth.js';
import { createActivityLogger } from '../middleware/activityLogger.js';
