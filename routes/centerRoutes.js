import express from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { protect, adminOnly } from '../middleware/auth.js';
import multer from 'multer';
import {
  getCenters,
  getCenter,
  createCenter,
  updateCenter,
  deleteCenter,
  checkTutorLocation,
  getNearbyTutors
} from '../controllers/centerController.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Center validation rules
const centerValidation = [
  body('name').notEmpty().withMessage('Center name is required'),
  body('location').notEmpty().withMessage('Location is required'),
  body('coordinates').notEmpty().withMessage('Coordinates are required'),
  body('area').notEmpty().withMessage('Area is required'),
  body('sadarName').notEmpty().withMessage('Sadar name is required'),
  body('sadarContact').matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number')
];

// Location check validation
const locationCheckValidation = [
  body('centerId').isMongoId().withMessage('Invalid center ID'),
  body('tutorLocation').isArray().withMessage('Tutor location must be an array')
    .custom((value) => {
      if (!Array.isArray(value) || value.length !== 2) {
        throw new Error('Location must be an array of [latitude, longitude]');
      }
      const [lat, lng] = value;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        throw new Error('Coordinates must be numbers');
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('Invalid coordinates range');
      }
      return true;
    })
];

router.route('/')
  .get(protect, getCenters)
  .post(protect, adminOnly, upload.array('images', 5), centerValidation, validateRequest, createCenter);

router.route('/:id')
  .get(protect, getCenter)
  .put(protect, adminOnly, upload.array('images', 5), centerValidation, validateRequest, updateCenter)
  .delete(protect, adminOnly, deleteCenter);

router.post('/check-location', protect, locationCheckValidation, validateRequest, checkTutorLocation);

router.get('/:centerId/nearby-tutors', getNearbyTutors);

// Report routes
// router.get('/:id/statistics', protect, getCenterStatistics);
// router.get('/:id/attendance', protect, getCenterAttendanceReport);
// router.get('/:id/performance', protect, getCenterPerformanceReport);

export default router;