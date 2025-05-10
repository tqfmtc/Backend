import Center from '../models/Center.js';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import Tutor from '../models/Tutor.js';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// @desc    Get all centers
// @route   GET /api/centers
// @access  Private/Admin
export const getCenters = async (req, res) => {
  try {
    const centers = await Center.find()
      .populate('tutors', 'name phone')
      .populate('students', 'name');
    res.json(centers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single center
// @route   GET /api/centers/:id
// @access  Private/Admin
export const getCenter = async (req, res) => {
  try {
    const center = await Center.findById(req.params.id)
      .populate('tutors', 'name phone')
      .populate('students', 'name');
    
    if (!center) {
      return res.status(404).json({ message: 'Center not found' });
    }
    
    res.json(center);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create center
// @route   POST /api/centers
// @access  Private/Admin
export const createCenter = async (req, res) => {
  try {
    const { name, location, coordinates, area, sadarName, sadarContact } = req.body;
    
    let images = [];
    if (req.files && req.files.images) {
      const uploadPromises = req.files.images.map(file => 
        new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              folder: 'centers',
              resource_type: 'auto'
            },
            (error, result) => {
              if (error) reject(error);
              resolve({
                url: result.secure_url,
                publicId: result.public_id
              });
            }
          ).end(file.buffer);
        })
      );
      images = await Promise.all(uploadPromises);
    }

    const center = await Center.create({
      name,
      location,
      coordinates: JSON.parse(coordinates),
      area,
      sadarName,
      sadarContact,
      images
    });

    res.status(201).json(center);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update center
// @route   PUT /api/centers/:id
// @access  Private/Admin
export const updateCenter = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, coordinates, area, sadarName, sadarContact, existingImages, deletedImages } = req.body;
    
    // Delete removed images from Cloudinary
    if (deletedImages && deletedImages.length > 0) {
      await Promise.all(
        deletedImages.map(publicId => 
          cloudinary.uploader.destroy(publicId)
        )
      );
    }

    // Get existing images
    let images = existingImages ? JSON.parse(existingImages) : [];
    
    // Upload new images
    if (req.files && req.files.images) {
      const uploadPromises = req.files.images.map(file => 
        new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              folder: 'centers',
              resource_type: 'auto'
            },
            (error, result) => {
              if (error) reject(error);
              resolve({
                url: result.secure_url,
                publicId: result.public_id
              });
            }
          ).end(file.buffer);
        })
      );
      const newImages = await Promise.all(uploadPromises);
      images = [...images, ...newImages];
    }

    const center = await Center.findByIdAndUpdate(
      id,
      {
        name,
        location,
        coordinates: JSON.parse(coordinates),
        area,
        sadarName,
        sadarContact,
        images
      },
      { new: true }
    );

    if (!center) {
      return res.status(404).json({ message: 'Center not found' });
    }

    res.json(center);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete center
// @route   DELETE /api/centers/:id
// @access  Private/Admin
export const deleteCenter = async (req, res) => {
  try {
    const center = await Center.findById(req.params.id);
    
    if (!center) {
      return res.status(404).json({ message: 'Center not found' });
    }

    // Delete all images from Cloudinary
    if (center.images && center.images.length > 0) {
      await Promise.all(
        center.images.map(image => 
          cloudinary.uploader.destroy(image.publicId)
        )
      );
    }

    // Find and delete all students associated with this center
    const Student = (await import('../models/Student.js')).default;
    const deletedStudentsResult = await Student.deleteMany({ assignedCenter: center._id });
    console.log(`Deleted ${deletedStudentsResult.deletedCount} students associated with center ${center._id}`);

    // Remove center references from any tutors assigned to this center
    const tutorsUpdated = await Tutor.updateMany(
      { assignedCenter: center._id },
      { $set: { assignedCenter: null } }
    );
    console.log(`Updated ${tutorsUpdated.modifiedCount} tutors to remove center reference`);

    // Delete the center itself
    await center.deleteOne();
    
    res.json({ 
      message: 'Center removed successfully', 
      studentsDeleted: deletedStudentsResult.deletedCount,
      tutorsUpdated: tutorsUpdated.modifiedCount
    });
  } catch (error) {
    console.error('Error deleting center:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check if tutor is within center radius
// @route   POST /api/centers/check-location
// @access  Private/Tutor
export const checkTutorLocation = async (req, res) => {
  try {
    const { centerId, tutorLocation } = req.body;
    
    const center = await Center.findById(centerId);
    if (!center) {
      return res.status(404).json({ message: 'Center not found' });
    }

    // Calculate distance between tutor and center (using MongoDB's geospatial queries)
    const maxDistance = 100; // 100 meters radius
    
    const distance = await Center.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: tutorLocation },
          distanceField: "distance",
          maxDistance: maxDistance,
          spherical: true,
          query: { _id: center._id }
        }
      }
    ]);

    const isWithinRadius = distance.length > 0;
    
    res.json({
      isWithinRadius,
      distance: isWithinRadius ? distance[0].distance : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all tutors within 100 meters of a center
// @route   GET /api/centers/:centerId/nearby-tutors
// @access  Private/Admin
export const getNearbyTutors = async (req, res) => {
  try {
    const centerId = req.params.centerId;
    const center = await Center.findById(centerId);
    if (!center) return res.status(404).json({ message: 'Center not found' });
    if (!center.coordinates || center.coordinates.length !== 2) {
      return res.status(400).json({ message: 'Center does not have valid coordinates' });
    }
    // Find tutors within 100 meters (0.1 km)
    const tutors = await Tutor.find({
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [center.coordinates[1], center.coordinates[0]] // [lng, lat]
          },
          $maxDistance: 100 // meters
        }
      }
    });
    res.json(tutors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};