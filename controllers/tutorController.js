import Tutor from '../models/Tutor.js';
import Center from '../models/Center.js';
import Attendance from '../models/Attendance.js';
import bcrypt from 'bcryptjs';
import { isWithinRadius, calculateDistance } from '../utils/geoUtils.js';

// Helper: get file path or null
const getFilePath = (files, field) => files[field] && files[field][0] ? files[field][0].path.replace(/\\/g, '/') : null;
const getFilePaths = (files, field) => files[field] ? files[field].map(f => f.path.replace(/\\/g, '/')) : null;

// @desc    Get all tutors
// @route   GET /api/tutors
// @access  Private/Admin
export const getTutors = async (req, res) => {
  try {
    const tutors = await Tutor.find()
      .populate('assignedCenter', 'name location')
      .select('-password');
    const tutorsWithCenterName = tutors.map(tutor => {
      const tutorObj = tutor.toObject();
      tutorObj.centerName = tutorObj.assignedCenter?.name || "Unknown Center";
      return tutorObj;
    });
    res.json(tutorsWithCenterName);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single tutor
// @route   GET /api/tutors/:id
// @access  Private/Admin & Private/Self
export const getTutor = async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id)
      .populate('assignedCenter', 'name location')
      .select('-password');
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });
    if (req.role !== 'admin' && req.user._id.toString() !== tutor._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this tutor' });
    }
    const tutorObj = tutor.toObject();
    tutorObj.centerName = tutorObj.assignedCenter?.name || "Unknown Center";
    res.json(tutorObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new tutor
// @route   POST /api/tutors
// @access  Private/Admin
export const createTutor = async (req, res) => {
  try {
    const {
      name, email, phone, password, qualifications, assignedCenter, subjects,
      sessionType, sessionTiming, assignedHadiyaAmount, aadharNumber,
      bankName, accountNumber, bankBranch, ifscCode
    } = req.body;
    
    // Detailed logging for debugging subjects
    console.log('Tutor creation request - subjects info:', {
      hasSubjects: !!subjects,
      subjects: subjects,
      isArray: Array.isArray(subjects),
      type: typeof subjects
    });
    
    console.log('Full request body:', req.body);
    
    // Check if tutor exists
    const tutorExists = await Tutor.findOne({ phone });
    if (tutorExists) return res.status(400).json({ message: 'Tutor already exists' });
    
    // Validate password
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    console.log(`Creating tutor with phone: ${phone}`);
    
    // Properly hash the password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Verify the hash works
    const testVerify = await bcrypt.compare(password, hashedPassword);
    console.log(`Password hash verification test: ${testVerify ? 'PASSED' : 'FAILED'}`);
    
    if (!testVerify) {
      console.error('Critical error: Password hash verification failed');
      return res.status(500).json({ message: 'Server error while creating tutor' });
    }
    
    // Ensure subjects is always an array
    let subjectsArray = subjects;
    if (!Array.isArray(subjects)) {
      // If it's a string, convert to array with one element
      subjectsArray = subjects ? [subjects] : [];
    }
    
    console.log('Subjects after processing:', subjectsArray);
    
    // Create tutor matching the model structure
    const tutor = await Tutor.create({
      // Personal Information
      name,
      email,
      phone,
      password: hashedPassword,
      qualifications: qualifications || '',
      
      // Center & Subject Information
      assignedCenter,
      subjects: subjectsArray,
      
      // Session Information
      sessionType,
      sessionTiming,
      
      // Hadiya Information
      assignedHadiyaAmount: assignedHadiyaAmount || 0,
      
      // Bank Details
      bankName: bankName || '',
      bankBranch: bankBranch || '',
      accountNumber: accountNumber || '',
      ifscCode: ifscCode || '',
      
      // Identification details
      aadharNumber: aadharNumber || ''
    });
    // Add tutor to center's tutors array
    await Center.findByIdAndUpdate(tutor.assignedCenter, { $addToSet: { tutors: tutor._id } });
    res.status(201).json({
      _id: tutor._id,
      name: tutor.name,
      email: tutor.email,
      phone: tutor.phone,
      role: tutor.role,
      assignedCenter: tutor.assignedCenter
    });
  } catch (error) {
    console.error('Create tutor error:', error);
    res.status(500).json({ message: 'Error creating tutor', error: error.message });
  }
};

// @desc    Update tutor
// @route   PUT /api/tutors/:id
// @access  Private/Admin
export const updateTutor = async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id);
    if (!tutor) {
      res.status(404).json({ message: 'Tutor not found' });
      return;
    }

    // Handle uploaded files
    const files = req.files || {};
    const getFilePath = (field) => files[field] && files[field][0] ? files[field][0].path.replace(/\\/g, '/') : null;
    const getFilePaths = (field) => files[field] ? files[field].map(f => f.path.replace(/\\/g, '/')) : null;

    // Prepare update data
    const updateData = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.phone) updateData.phone = req.body.phone;
    if (req.body.assignedCenter) updateData.assignedCenter = req.body.assignedCenter;
    if (req.body.subjects) updateData.subjects = req.body.subjects;
    if (req.body.sessionType) updateData.sessionType = req.body.sessionType;
    if (req.body.sessionTiming) updateData.sessionTiming = req.body.sessionTiming;
    if (req.body.assignmentInformation) updateData.assignmentInformation = req.body.assignmentInformation;
    if (req.body.assignedHadiyaAmount) updateData.assignedHadiyaAmount = req.body.assignedHadiyaAmount;
    
    // Banking information - direct fields (CRITICAL FIX)
    if (req.body.bankName) updateData.bankName = req.body.bankName;
    if (req.body.bankBranch) updateData.bankBranch = req.body.bankBranch;
    if (req.body.accountNumber) updateData.accountNumber = req.body.accountNumber;
    if (req.body.ifscCode) updateData.ifscCode = req.body.ifscCode;
    if (req.body.aadharNumber) updateData.aadharNumber = req.body.aadharNumber;

    // Update documents
    updateData.documents = tutor.documents || {};
    if (req.body.aadharNumber) updateData.documents.aadharNumber = req.body.aadharNumber;
    if (getFilePath('aadharPhoto')) updateData.documents.aadharPhoto = getFilePath('aadharPhoto');
    if (!updateData.documents.bankAccount) updateData.documents.bankAccount = {};
    if (req.body.bankAccountNumber) updateData.documents.bankAccount.accountNumber = req.body.bankAccountNumber;
    if (req.body.ifscCode) updateData.documents.bankAccount.ifscCode = req.body.ifscCode;
    if (getFilePath('passbookPhoto')) updateData.documents.bankAccount.passbookPhoto = getFilePath('passbookPhoto');
    if (getFilePaths('certificates')) updateData.documents.certificates = getFilePaths('certificates');
    if (getFilePaths('memos')) updateData.documents.memos = getFilePaths('memos');
    if (getFilePath('resume')) updateData.documents.resume = getFilePath('resume');

    // Password update logic
    if (req.body.password) {
      if (req.body.password.length < 6) {
        res.status(400).json({ message: 'Password must be at least 6 characters long' });
        return;
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);
      updateData.password = hashedPassword;
    }

    // Center change logic
    if (req.body.assignedCenter && 
        (tutor.assignedCenter === null || req.body.assignedCenter !== tutor.assignedCenter.toString())) {
      // Remove tutor from old center if it exists
      if (tutor.assignedCenter) {
        const oldCenter = await Center.findById(tutor.assignedCenter);
        if (oldCenter) {
          oldCenter.tutors = oldCenter.tutors.filter(id => id.toString() !== tutor._id.toString());
          await oldCenter.save();
        }
      }
      // Add tutor to new center
      const newCenter = await Center.findById(req.body.assignedCenter);
      if (!newCenter) {
        res.status(404).json({ message: 'New center not found' });
        return;
      }
      newCenter.tutors.push(tutor._id);
      await newCenter.save();
    }

    // Check if all required information is complete
    const isInformationComplete = Boolean(
      req.body.name &&
      req.body.email &&
      req.body.phone &&
      req.body.assignedCenter &&
      req.body.subjects &&
      req.body.sessionType &&
      req.body.sessionTiming
    );

    // Update status based on information completeness
    if (isInformationComplete) {
      updateData.status = 'active';
    } else {
      updateData.status = 'pending';
    }

    // Update the tutor document
    const updatedTutor = await Tutor.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: false, context: 'query' }
    )
      .select('-password')
      .populate('assignedCenter', 'name location');

    if (!updatedTutor) {
      res.status(404).json({ message: 'Tutor not found' });
      return;
    }

    // Add centerName to the response
    const tutorResponse = updatedTutor.toObject();
    tutorResponse.centerName = tutorResponse.assignedCenter?.name || "Unknown Center";

    res.json(tutorResponse);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'A tutor with this phone number already exists' });
      return;
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete tutor
// @route   DELETE /api/tutors/:id
// @access  Private/Admin
export const deleteTutor = async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id);
    
    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    // Remove tutor from center
    const center = await Center.findById(tutor.assignedCenter);
    if (center) {
      center.tutors = center.tutors.filter(id => id.toString() !== tutor._id.toString());
      await center.save();
    }

    // Important: Update all students to clear the assignedTutor field
    // This keeps the students but removes the reference to the deleted tutor
    const Student = (await import('../models/Student.js')).default;
    const studentUpdateResult = await Student.updateMany(
      { assignedTutor: tutor._id },
      { $set: { assignedTutor: null } }
    );
    console.log(`Updated ${studentUpdateResult.modifiedCount} students to remove tutor reference`);

    // Delete the tutor
    await tutor.deleteOne();
    
    res.json({ 
      message: 'Tutor removed successfully',
      studentsUpdated: studentUpdateResult.modifiedCount 
    });
  } catch (error) {
    console.error('Error deleting tutor:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get tutor attendance report
// @route   GET /api/tutors/:id/attendance
// @access  Private
export const getTutorAttendanceReport = async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id);
    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    // Check if the requesting user is the tutor or an admin
    if (req.role !== 'admin' && req.user._id.toString() !== tutor._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this report' });
    }

    const { month, year } = req.query;

    let filteredAttendance = tutor.attendance;

    if (month && year) {
      const numericMonth = parseInt(month, 10);
      const numericYear = parseInt(year, 10);

      if (isNaN(numericMonth) || isNaN(numericYear) || numericMonth < 1 || numericMonth > 12) {
        return res.status(400).json({ message: 'Invalid month or year format.' });
      }

      filteredAttendance = tutor.attendance.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getFullYear() === numericYear && recordDate.getMonth() === (numericMonth - 1);
      });
    }

    const attendedSessions = filteredAttendance.filter(record => record.status === 'present').length;
    const totalSessionsForCalc = filteredAttendance.length;
    const attendancePercentage = totalSessionsForCalc > 0 ? (attendedSessions / totalSessionsForCalc) * 100 : 0;

    res.json({
      tutorId: tutor._id,
      name: tutor.name,
      filter: {
        month: month ? parseInt(month, 10) : undefined,
        year: year ? parseInt(year, 10) : undefined,
      },
      attendanceStats: {
        totalExpectedSessions: totalSessionsForCalc,
        attendedSessions: attendedSessions,
        absentSessions: totalSessionsForCalc - attendedSessions,
        attendancePercentage: parseFloat(attendancePercentage.toFixed(2)),
      }
    });
  } catch (error) {
    console.error('Error fetching tutor attendance report:', error);
    res.status(500).json({ message: 'Error fetching attendance report', errorDetails: error.message });
  }
};

// @desc    Get tutor performance report
// @route   GET /api/tutors/:id/performance
// @access  Private
export const getTutorPerformanceReport = async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id);
    
    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    if (req.role !== 'admin' && req.user._id.toString() !== tutor._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this report' });
    }

    res.json({
      tutorId: tutor._id,
      name: tutor.name,
      performance: {
        averageRating: 0,
        totalStudents: 0,
        subjectPerformance: [],
        monthlyProgress: []
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get tutor students report
// @route   GET /api/tutors/:id/students
// @access  Private
export const getTutorStudentsReport = async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id);
    
    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    if (req.role !== 'admin' && req.user._id.toString() !== tutor._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this report' });
    }

    res.json({
      tutorId: tutor._id,
      name: tutor.name,
      location: tutor.location,
      students: {
        total: 0,
        active: 0,
        bySubject: [],
        byClass: []
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit attendance
// @route   POST /api/tutors/attendance
// @access  Private/Tutor
export const submitAttendance = async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.user._id);
    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    const center = await Center.findById(tutor.assignedCenter);
    if (!center) {
      return res.status(404).json({ message: 'Assigned center not found' });
    }

    if (!req.body.currentLocation || !Array.isArray(req.body.currentLocation) || req.body.currentLocation.length !== 2) {
      return res.status(400).json({ message: 'Invalid location data provided' });
    }

    const [tutorLat, tutorLon] = req.body.currentLocation;
    const [centerLat, centerLon] = center.coordinates;

    const isWithinRange = isWithinRadius(
      tutorLat,
      tutorLon,
      centerLat,
      centerLon,
      1300
    );

    if (!isWithinRange) {
      const distance = calculateDistance(tutorLat, tutorLon, centerLat, centerLon);
      return res.status(400).json({
        message: 'You must be within 1300 meters of the center to submit attendance',
        distance: distance,
        tutorLocation: [tutorLat, tutorLon],
        centerLocation: [centerLat, centerLon]
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendanceRecord = {
      date: today,
      status: 'present',
      location: {
        type: 'Point',
        coordinates: [tutorLon, tutorLat]
      },
      center: center._id,
      centerName: center.name
    };

    try {
      await Attendance.create({
        tutor: tutor._id,
        center: center._id,
        date: today,
        status: 'present',
        markedBy: tutor._id,
        location: {
          type: 'Point',
          coordinates: [tutorLon, tutorLat]
        }
      });
    } catch (err) {
      console.error('Error creating Attendance document:', err);
    }

    const existingAttendanceIndex = tutor.attendance.findIndex(
      record => record.date.getTime() === today.getTime()
    );

    if (existingAttendanceIndex === -1) {
      tutor.attendance.push(attendanceRecord);
    } else {
      tutor.attendance[existingAttendanceIndex] = attendanceRecord;
    }

    await tutor.save();

    res.status(200).json({
      message: 'Attendance submitted successfully',
      attendance: attendanceRecord
    });
  } catch (error) {
    console.error('Error submitting attendance:', error);
    res.status(500).json({ 
      message: 'Error submitting attendance',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get center location for a tutor
// @route   POST /api/tutors/get-center-location
// @access  Private/Tutor
export const getCenterLocation = async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.body.tutorId)
      .populate('assignedCenter', 'location coordinates');
    
    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    if (!tutor.assignedCenter) {
      return res.status(404).json({ message: 'No center assigned to this tutor' });
    }

    res.json({
      centerId: tutor.assignedCenter._id,
      centerName: tutor.assignedCenter.name,
      coordinates: tutor.assignedCenter.coordinates
    });
  } catch (error) {
    console.error('Error getting center location:', error);
    res.status(500).json({ message: 'Error getting center location' });
  }
};