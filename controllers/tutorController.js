import Tutor from '../models/Tutor.js';
import Center from '../models/Center.js';
import Attendance from '../models/Attendance.js';
import AttendanceButton from '../models/AttendanceButton.js';
import bcrypt from 'bcryptjs';
import { queueAttendanceEmail } from '../utils/emailQueue.js';

// Helper: get file path or null
const getFilePath = (files, field) => files[field] && files[field][0] ? files[field][0].path.replace(/\\/g, '/') : null;
const getFilePaths = (files, field) => files[field] ? files[field].map(f => f.path.replace(/\\/g, '/')) : null;

import mongoose from 'mongoose';
import { istToday, istDayOfWeek } from '../utils/istTime.js';
import { tutorCenterIds, tutorHasCenter, assignmentsPopulate, parseAssignments, nearestAssignedCenter } from '../utils/tutorCenters.js';

// Comma-separated names of a tutor's populated centers
const centerNamesOf = (tutor) =>
  (tutor.assignments || []).map(a => a.center?.name).filter(Boolean).join(', ') || 'Unknown Center';

// @desc    Get all tutors
// @route   GET /api/tutors
// @access  Private/Admin
export const getTutors = async (req, res) => {
  try {
    // Add lean() for faster queries and limit populated fields
    const tutors = await Tutor.find()
      .populate(assignmentsPopulate())
      .select('-password -documents -__v')
      .lean(); // Convert to plain JS objects (faster)

    // Map center names without additional student population
    const tutorsWithCenterName = tutors.map(tutor => ({
      ...tutor,
      centerName: centerNamesOf(tutor),
      studentCount: tutor.students?.length || 0 // Just count, don't populate full data
    }));
    
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
      .populate(assignmentsPopulate()).populate({
        path: 'students',
        match: { status: 'active' }, // Only populate active students
        select: 'name fatherName contact assignedCenter' // the app groups students by center
      })
      .select('-password');
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });
    if (req.role !== 'admin' && req.user._id.toString() !== tutor._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this tutor' });
    }
    const tutorObj = tutor.toObject();
    tutorObj.centerName = centerNamesOf(tutorObj);
    res.json(tutorObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// @desc    Get tutors by center
// @route   GET /api/tutors/center/:centerId
// @access  Private/Admin & Private/Tutor from same center
export const getTutorsByCenter = async (req, res) => {
  try {
    const { centerId } = req.params;
    
    // Verify center exists
    const center = await Center.findById(centerId);
    if (!center) {
      return res.status(404).json({ message: 'Center not found' });
    }

    // If tutor is requesting, they must be assigned to this center
    if (req.role === 'tutor') {
      const tutor = await Tutor.findById(req.user._id);
      if (!tutor || !tutorHasCenter(tutor, centerId)) {
        return res.status(403).json({ message: 'Not authorized to view tutors from this center' });
      }
    }

    // Get all tutors assigned to this center
    const tutors = await Tutor.find({ 'assignments.center': centerId })
      .populate(assignmentsPopulate())
      .select('_id name contact email assignments');

    res.json(tutors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const normalizeIdArray = (value) => {
  if (value == null) return undefined;
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value];
};

// Parse req.body.assignments and check every center exists.
// Returns { assignments } or { status, message } for the error response.
const readAssignments = async (body, { required }) => {
  const parsed = parseAssignments(body);
  if (!parsed) {
    return required ? { status: 400, message: 'At least one center assignment is required' } : { assignments: null };
  }
  if (parsed.error) return { status: 400, message: parsed.error };

  const ids = parsed.assignments.map(a => a.center);
  const found = await Center.countDocuments({ _id: { $in: ids } });
  if (found !== ids.length) return { status: 404, message: 'Assigned center not found' };
  return parsed;
};

// @desc    Create tutor
// @route   POST /api/tutors
// @access  Private/Admin
export const createTutor = async (req, res) => {
  try {
    const {
      name, email, phone, password, address, qualifications, subjects,
      assignedHadiyaAmount, aadharNumber,
      bankName, accountNumber, bankBranch, ifscCode,
      // Educational Details
      qualificationType, qualificationOther, qualificationStatus,
      yearOfCompletion, madarsahName, collegeName, specialization, joiningDate,
      // OPTIONAL: allow students during create (array of ObjectIds)
      students
    } = req.body;

    const tutorExists = await Tutor.findOne({ phone });
    if (tutorExists) return res.status(400).json({ message: 'Tutor already exists' });

    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const { assignments, status: errStatus, message: errMessage } = await readAssignments(req.body, { required: true });
    if (errStatus) return res.status(errStatus).json({ message: errMessage });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Ensure subjects array
    let subjectsArray = subjects;
    if (!Array.isArray(subjects)) {
      subjectsArray = subjects ? [subjects] : [];
    }

    // OPTIONAL: normalize and validate students
    let studentsArray = normalizeIdArray(students) || [];
    for (const sid of studentsArray) {
      if (!isValidObjectId(sid)) {
        return res.status(400).json({ message: `Invalid student id: ${sid}` });
      }
    }

    const tutor = await Tutor.create({
      // Personal Information
      name,
      email,
      phone,
      password: hashedPassword,
      address,
      qualifications: qualifications || '',
      // Educational Details
      qualificationType: qualificationType || '',
      qualificationOther: qualificationOther || '',
      qualificationStatus: qualificationStatus || '',
      yearOfCompletion: yearOfCompletion || '',
      madarsahName: madarsahName || '',
      collegeName: collegeName || '',
      specialization: specialization || '',
      // Centers (each with its session) & Subject Information
      assignments,
      subjects: subjectsArray,
      joiningDate: joiningDate || Date.now(),
      // Hadiya Information
      assignedHadiyaAmount: assignedHadiyaAmount || 0,
      // Bank Details
      bankName: bankName || '',
      bankBranch: bankBranch || '',
      accountNumber: accountNumber || '',
      ifscCode: ifscCode || '',
      // Identification details
      aadharNumber: aadharNumber || '',
      // NEW
      students: studentsArray
    });

    await Center.updateMany({ _id: { $in: tutorCenterIds(tutor) } }, { $addToSet: { tutors: tutor._id } });

    res.status(201).json({
      _id: tutor._id,
      name: tutor.name,
      email: tutor.email,
      phone: tutor.phone,
      role: tutor.role,
      assignments: tutor.assignments,
      collegeName: tutor.collegeName,
      students: tutor.students
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

    const updateData = {};

    // Personal Information
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.phone) updateData.phone = req.body.phone;
    if (req.body.address) updateData.address = req.body.address;
    if (req.body.qualifications) updateData.qualifications = req.body.qualifications;

    // Joining Date Logic (Completed)
    if (req.body.joiningDate) {
      const date = new Date(req.body.joiningDate);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: 'Invalid joining date format' });
      }
      updateData.joiningDate = date;
    }
    // Important: If not provided, old value remains automatically.

    // Educational Details
    if (req.body.qualificationType) updateData.qualificationType = req.body.qualificationType;
    if (req.body.qualificationOther) updateData.qualificationOther = req.body.qualificationOther;
    if (req.body.qualificationStatus) updateData.qualificationStatus = req.body.qualificationStatus;
    if (req.body.yearOfCompletion) updateData.yearOfCompletion = req.body.yearOfCompletion;
    if (req.body.madarsahName) updateData.madarsahName = req.body.madarsahName;
    if (req.body.collegeName) updateData.collegeName = req.body.collegeName;
    if (req.body.specialization) updateData.specialization = req.body.specialization;

    // Centers (each with its session) & Subject Information
    const { assignments, status: errStatus, message: errMessage } = await readAssignments(req.body, { required: false });
    if (errStatus) return res.status(errStatus).json({ message: errMessage });
    if (assignments) updateData.assignments = assignments;
    if (req.body.subjects) {
      updateData.subjects = Array.isArray(req.body.subjects)
        ? req.body.subjects
        : [req.body.subjects];
    }

    // NEW: Students update modes
    const studentsReplace = normalizeIdArray(req.body.students);
    const studentsAdd = normalizeIdArray(req.body.studentsAdd);
    const studentsRemove = normalizeIdArray(req.body.studentsRemove);

    // Validate all provided ids
    const allIds = [
      ...(studentsReplace || []),
      ...(studentsAdd || []),
      ...(studentsRemove || [])
    ];
    for (const sid of allIds) {
      if (!isValidObjectId(sid)) {
        return res.status(400).json({ message: `Invalid student id: ${sid}` });
      }
    }
    if (studentsReplace) {
      updateData.students = studentsReplace; // full replacement
    }

    // Hadiya Information
    if (req.body.assignedHadiyaAmount !== undefined)
      updateData.assignedHadiyaAmount = req.body.assignedHadiyaAmount;

    // Banking Information
    if (req.body.bankName) updateData.bankName = req.body.bankName;
    if (req.body.bankBranch) updateData.bankBranch = req.body.bankBranch;
    if (req.body.accountNumber) updateData.accountNumber = req.body.accountNumber;
    if (req.body.ifscCode) updateData.ifscCode = req.body.ifscCode;

    // Identification Details
    if (req.body.aadharNumber) updateData.aadharNumber = req.body.aadharNumber;
    if (req.body.collegeName) updateData.collegeName = req.body.collegeName;

    // Documents
    updateData.documents = tutor.documents || {};
    if (req.body.aadharNumber) updateData.documents.aadharNumber = req.body.aadharNumber;

    if (!updateData.documents.bankAccount) updateData.documents.bankAccount = {};
    if (req.body.bankAccountNumber)
      updateData.documents.bankAccount.accountNumber = req.body.bankAccountNumber;

    if (req.body.ifscCode)
      updateData.documents.bankAccount.ifscCode = req.body.ifscCode;

    // Password update logic
    if (req.body.password) {
      if (req.body.password.length < 8) {
        res.status(400).json({ message: 'Password must be at least 8 characters long' });
        return;
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);
      updateData.password = hashedPassword;
    }

    // Center change logic: keep each center's tutors list in sync
    if (assignments) {
      const oldIds = tutorCenterIds(tutor);
      const newIds = assignments.map(a => a.center);
      const removed = oldIds.filter(id => !newIds.includes(id));
      const added = newIds.filter(id => !oldIds.includes(id));
      if (removed.length) await Center.updateMany({ _id: { $in: removed } }, { $pull: { tutors: tutor._id } });
      if (added.length) await Center.updateMany({ _id: { $in: added } }, { $addToSet: { tutors: tutor._id } });
    }

    // Status changes only when the admin sets it explicitly. (It used to be recomputed from
    // profile completeness on every edit, which reactivated soft-deleted tutors and made
    // incomplete ones inactive, so their next delete became permanent.)
    if (['active', 'inactive'].includes(req.body.status)) {
      updateData.status = req.body.status;
    }

    // Apply base update
    await Tutor.updateOne({ _id: tutor._id }, { $set: updateData });

    // Apply add/remove student ops if not replaced
    if (!studentsReplace && (studentsAdd?.length || studentsRemove?.length)) {
      const ops = {};
      if (studentsAdd?.length) ops.$addToSet = { students: { $each: studentsAdd } };
      if (studentsRemove?.length) ops.$pull = { students: { $in: studentsRemove } };
      if (Object.keys(ops).length) {
        await Tutor.updateOne({ _id: tutor._id }, ops);
      }
    }

    const updatedTutor = await Tutor.findById(req.params.id)
      .select('-password')
      .populate(assignmentsPopulate())
      .populate('students', '_id name phone');

    if (!updatedTutor) {
      res.status(404).json({ message: 'Tutor not found' });
      return;
    }

    const tutorResponse = updatedTutor.toObject();
    tutorResponse.centerName = centerNamesOf(tutorResponse);
    tutorResponse.collegeName = tutorResponse.collegeName;

    res.json(tutorResponse);
  } catch (error) {
    console.error('Update tutor error:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'A tutor with this phone number already exists' });
      return;
    }
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err) => err.message);
      res.status(400).json({ message: 'Validation failed', errors: validationErrors });
      return;
    }
    res.status(500).json({ message: 'Error updating tutor', error: error.message });
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

    // Remove tutor from all their centers
    await Center.updateMany({ _id: { $in: tutorCenterIds(tutor) } }, { $pull: { tutors: tutor._id } });
    if(tutor.status === 'inactive') {
      await tutor.deleteOne();
      return res.json({ message: 'Tutor permanently deleted' });
    }
    else{
          tutor.status = 'inactive';
      await tutor.save();
       return res.json({ message: 'Tutor set to inactive' });

    }


    // Important: Update all students to clear the assignedTutor field
    // This keeps the students but removes the reference to the deleted tutor
    const Student = (await import('../models/Student.js')).default;
    // const studentUpdateResult = await Student.updateMany(
    //   { assignedTutor: tutor._id },
    //   { $set: { assignedTutor: "null" } }
    // );
    console.log(`Updated ${studentUpdateResult.modifiedCount} students to remove tutor reference`);

    // Delete the tutor
    // await tutor.deleteOne();
    
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
    const tutor = await Tutor.findById(req.params.id)
      .populate({
        path: 'students',
        select: 'name fatherName contact gender medium schoolInfo isOrphan assignedTutor assignedCenter'
      });
    
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
      students: tutor.students
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
    const tutor = await Tutor.findById(req.user._id).populate(assignmentsPopulate('name coordinates'));
    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    if (!req.body.currentLocation || !Array.isArray(req.body.currentLocation) || req.body.currentLocation.length !== 2) {
      return res.status(400).json({ message: 'Invalid location data provided' });
    }

    const [tutorLat, tutorLon] = req.body.currentLocation;

    // Attendance counts for whichever of the tutor's centers they are at
    const nearest = nearestAssignedCenter(tutor, tutorLat, tutorLon);
    if (!nearest) {
      return res.status(404).json({ message: 'Assigned center not found' });
    }
    const { center, distance } = nearest;

    if (distance > 50) {
      return res.status(400).json({
        message: 'You must be within 50 meters of the center to submit attendance',
        distance: distance,
        tutorLocation: [tutorLat, tutorLon],
        centerLocation: center.coordinates,
        centerName: center.name
      });
    }

    // Calendar day and weekday in IST (the server clock is UTC)
    const today = istToday();

    // Check if it's Sunday (0 is Sunday)
    if (istDayOfWeek() === 0) {
      return res.status(400).json({
        message: 'Attendance cannot be submitted on Sundays as it is a weekly off day.'
      });
    }
    // status is a Boolean (false = disabled); a missing document means enabled (schema default)
    const attendanceButton= await AttendanceButton.findOne();
    if(attendanceButton && attendanceButton.status === false){
      return res.status(400).json({
        message: 'Attendance disabled by Admin' //⚠️DO NOT CHANGE THIS TEXT - ATTENDANCE APP WILL STOP WORKING
      });
    }
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
      record => record.date.getTime() === today.getTime() && String(record.center) === String(center._id)
    );

    if (existingAttendanceIndex === -1) {
      tutor.attendance.push(attendanceRecord);
    } else {
      tutor.attendance[existingAttendanceIndex] = attendanceRecord;
    }

    await tutor.save();
    if(0){
      res.status(200).json({
        message: 'Attendance disabled by Admin'  //⚠️DO NOT CHANGE THIS TEXT - ATTENDANCE APP WILL STOP WORKING
      })
    }
    res.status(200).json({
      message: 'Attendance submitted successfully', //⚠️DO NOT CHANGE THIS TEXT - ATTENDANCE APP WILL STOP WORKING
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

// @desc    Get center information for the logged-in tutor
// @route   GET /api/tutors/my-center
// @access  Private/Tutor
export const getTutorCenter = async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.user._id)
      .populate(assignmentsPopulate('name location coordinates area sadarName sadarContact'));

    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    const centers = tutor.assignments
      .filter(a => a.center)
      .map(({ center, sessionType, sessionTiming }) => ({
        _id: center._id,
        name: center.name,
        location: center.location,
        coordinates: center.coordinates,
        area: center.area,
        sadarName: center.sadarName,
        sadarContact: center.sadarContact,
        sessionType,
        sessionTiming
      }));

    if (!centers.length) {
      return res.status(404).json({ message: 'No center assigned to this tutor' });
    }

    // `center` is the first one, for clients that expect a single center
    res.json({ success: true, centers, center: centers[0] });
  } catch (error) {
    console.error('Error getting tutor center:', error);
    res.status(500).json({ message: 'Error getting center information' });
  }
};

// @desc    Get center location for a tutor
// @route   POST /api/tutors/get-center-location
// @access  Private/Tutor
export const getCenterLocation = async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.body.tutorId)
      .populate(assignmentsPopulate('name coordinates'));

    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    const centers = tutor.assignments
      .filter(a => a.center)
      .map(({ center }) => ({ centerId: center._id, centerName: center.name, coordinates: center.coordinates }));

    if (!centers.length) {
      return res.status(404).json({ message: 'No center assigned to this tutor' });
    }

    // Top-level fields are the first center, for clients that expect a single center
    res.json({ ...centers[0], centers });
  } catch (error) {
    console.error('Error getting center location:', error);
    res.status(500).json({ message: 'Error getting center location' });
  }
};
