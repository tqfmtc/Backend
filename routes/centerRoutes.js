import express from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest.js';
import { protect, adminOnly, supervisorOnly, auth, checkPermission } from '../middleware/auth.js';
import { createActivityLogger, logAdminActivity } from '../middleware/activityLogger.js';
import multer from 'multer';
import Center from '../models/Center.js';
import CenterComment from '../models/CenterComment.js';
import {
  getCenters,
  getCenter,
  createCenter,
  updateCenter,
  deleteCenter,
  checkTutorLocation,
  getNearbyTutors
} from '../controllers/centerController.js';
import { ca } from 'date-fns/locale';

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
  .get(protect, checkPermission('centers', 'read'), getCenters)
  .post(protect, checkPermission('centers', 'write'), createActivityLogger('CREATE_CENTER', 'Center'), upload.array('images', 5), centerValidation, validateRequest, createCenter);

router.get('/comments', protect, checkPermission('centers', 'read'), async (req, res) => {
  console.log('enter center comments');
  try{
    console.log('Fetching all center comments');
    const comments = await CenterComment.find()
      .populate('center', 'name location area')
      .populate('supervisor', 'name email phone')
      .select('-__v');
        console.log('Comments fetched successfully:', comments);
    res.status(201).json(comments);
  }catch (error) {
    console.error('Error fetching center comments:', error);
    res.status(500).json({ message: error.message });
  }
});

router.route('/:id')
  .get(protect, checkPermission('centers', 'read'), getCenter)
  .put(protect, checkPermission('centers', 'write'), createActivityLogger('UPDATE_CENTER', 'Center'), upload.array('images', 5), centerValidation, validateRequest, updateCenter)
  .delete(protect, checkPermission('centers', 'write'), createActivityLogger('DELETE_CENTER', 'Center'), deleteCenter);

router.post('/check-location', protect, locationCheckValidation, validateRequest, checkTutorLocation);

router.get('/:centerId/nearby-tutors', getNearbyTutors);

// router.get('/:id/comments', auth, adminOnly, async (req, res) => {
//   try {
//     const center = await Center.findById(req.params.id);
//     if (!center) {
//       return res.status(404).json({ message: 'Center not found' });
//     }

//     const comments = await CenterComment.find({ center: center._id })
//       .populate('supervisor', 'name email phone')
//       .select('-__v');
//     console.log(comments);
//     res.status(201).json(comments);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// })

router.post('/comment/:id', auth, supervisorOnly, async (req, res) => {
  try {
    const center = await Center.findById(req.params.id);
    if (!center) {
      return res.status(404).json({ message: 'Center not found' });
    }

    const { comment, rating } = req.body;
    if (!comment || typeof rating !== 'number') {
      return res.status(400).json({ message: 'Comment text and numeric rating are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Create and save the comment
    const newComment = await CenterComment.create({
      center: center._id,
      supervisor: req.user._id,
      text: comment,
      rating: rating
    });

    res.status(201).json({ message: 'Comment added successfully', comment: newComment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Report routes
// router.get('/:id/statistics', protect, getCenterStatistics);
// router.get('/:id/attendance', protect, getCenterAttendanceReport);
// router.get('/:id/performance', protect, getCenterPerformanceReport);

export default router;