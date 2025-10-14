import Attendance from '../models/Attendance.js';
import AttendanceButton from '../models/AttendanceButton.js';
import Tutor from '../models/Tutor.js';
import Center from '../models/Center.js';
import { startOfMonth, endOfMonth, format, eachDayOfInterval } from 'date-fns';

//Toggle attendance button
export const toggleAttendanceButton=async(req,res)=>{
  try{
    const {status}=req.body;
    if(typeof status !=='boolean'){
      return res.status(400).json({message:"Status must be boolean"});
    }
    let button=await AttendanceButton.findOne();
    if(!button){
      button=new AttendanceButton({status:status,lastChangedBy:req.user._id});
    }

// Mark attendance for a tutor (by Admin)
export const  markAttendance = async (req, res) => {
  try {
    const { tutorId, centerId, date, status } = req.body;
    const adminId = req.user._id; // Admin who is marking

    if (!tutorId || !centerId || !date || !status) {
      return res.status(400).json({ message: 'Missing required fields: tutorId, centerId, date, status.' });
    }

    const tutor = await Tutor.findById(tutorId);
    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    const center = await Center.findById(centerId);
    if (!center) {
      return res.status(404).json({ message: 'Center not found' });
    }

    const recordDate = new Date(date);
    recordDate.setHours(0, 0, 0, 0); // Normalize to start of day

    const attendanceRecord = {
      date: recordDate,
      status: status, // 'present' or 'absent' from request
      center: center._id,
      centerName: center.name,
      markedBy: adminId, // Record who marked it
      // location: null, // Location not typically provided by admin marking
    };

    // --- NEW: Create Attendance document and use its createdAt for embedded array ---
    console.log('Creating Attendance document with:', {
      tutor: tutor._id,
      center: center._id,
      date: recordDate,
      status: status,
      markedBy: adminId
    });
    let attendanceDoc;
    try {
      attendanceDoc = await Attendance.create({
        tutor: tutor._id,
        center: center._id,
        date: recordDate,
        status: status,
        markedBy: adminId // (this will be the tutor's ID if tutors mark their own attendance)
      });
      console.log('Attendance document created:', attendanceDoc);
    } catch (err) {
      console.error('Error creating Attendance document:', err);
    }

    // Always push a new record to the embedded array
    tutor.attendance.push({
      date: recordDate,
      status: status,
      center: center._id,
      centerName: center.name,
      markedBy: adminId,
      createdAt: attendanceDoc.createdAt
    });
    await tutor.save();

    // Return the newly added record (the last one in the array)
    const savedRecord = tutor.attendance[tutor.attendance.length - 1];

    res.status(200).json({
      message: 'Attendance marked successfully',
      attendance: savedRecord
    });

  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ message: 'Error marking attendance', errorDetails: error.message });
  }
};


export const todayAttendance=async(req,res)=>{
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  try{
    if(req.role=='admin'){
      const today = await Attendance.find({
        createdAt: {
          $gte: startOfToday,
          $lte: endOfToday
        },
      }).sort({ createdAt: -1 })
        .limit(20)
        .populate('tutor', 'name')
        .populate('center', 'name');
      return res.json(today);
    }
    else{
      return res.json("unauthorized");
    }
  }
  catch(err){
    console.error('Error fetching today\'s attendance:', err);
    res.status(500).json({ message: 'Failed to fetch today\'s attendance', error: err.message }); 
}
}
// Get attendance report for a specific month
// Get recent attendance records (latest 20)
export const getRecentAttendance = async (req, res) => {
  try {
    if (req.role === 'admin') {
      // Admin: return latest 20 attendance records for all tutors (excluding archived)
      const recent = await Attendance.find({ isArchived: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('tutor', 'name')
        .populate('center', 'name');
      return res.json(recent);
    } else if (req.role === 'tutor') {
      // Tutor: return only today's attendance for this tutor
      const tutorId = req.user._id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const recent = await Attendance.find({
        tutor: tutorId,
        date: { $gte: today, $lt: tomorrow }
      })
        .sort({ createdAt: -1 })
        .limit(1)
        .populate('tutor', 'name')
        .populate('center', 'name');
      return res.json(recent);
    } else {
      return res.status(403).json({ message: 'Unauthorized' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch recent attendance', error: err.message });
  }
};

// Clear recent attendance (for admin dashboard)
export const clearRecentAttendance = async (req, res) => {
  try {
    // Only admins can clear recent activity
    if (req.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized: Only admins can clear recent activity' });
    }

    // Get records from the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    // Soft delete by setting a flag rather than actually removing records
    const result = await Attendance.updateMany(
      { createdAt: { $gte: oneDayAgo } },
      { $set: { isArchived: true } }
    );

    console.log(`Cleared ${result.modifiedCount} recent attendance records`);

    res.status(200).json({
      message: 'Recent activity cleared successfully',
      clearedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error clearing recent attendance:', error);
    res.status(500).json({ 
      message: 'Error clearing recent attendance', 
      errorDetails: error.message 
    });
  }
};

export const getAttendanceReport = async (req, res) => {
  try {
    const { month, year, centerId } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year are required query parameters.' });
    }

    const numericMonth = parseInt(month, 10);
    const numericYear = parseInt(year, 10);

    if (isNaN(numericMonth) || isNaN(numericYear) || numericMonth < 1 || numericMonth > 12) {
      return res.status(400).json({ message: 'Invalid month or year format.' });
    }

    // Define the start and end of the month for filtering and iteration
    const monthStartDate = startOfMonth(new Date(numericYear, numericMonth - 1, 1));
    const monthEndDate = endOfMonth(new Date(numericYear, numericMonth - 1, 1));
    
    // Get all tutors for the selected center (or all centers), filtering by active status
    const tutorQuery = centerId ? { assignedCenter: centerId, status: { $in: ['active', 'pending'] } } : { status: { $in: ['active', 'pending'] } };
    const tutors = await Tutor.find(tutorQuery).populate('assignedCenter', 'name');
    // console.log(`Found ${tutors.length} tutors for centerId: ${centerId || 'all centers'}`);

    // Generate all calendar days in the selected month
    const allDaysInMonth = eachDayOfInterval({ start: monthStartDate, end: monthEndDate });

    // Build report for all tutors
    const report = tutors.map(tutor => {
      const dailyAttendance = {};

      // Create a quick lookup for the tutor's existing attendance records for the month
      const tutorMonthlyAttendance = {};
      tutor.attendance.forEach(record => {
        const recordDate = new Date(record.date);
        if (recordDate >= monthStartDate && recordDate <= monthEndDate) {
          tutorMonthlyAttendance[format(recordDate, 'yyyy-MM-dd')] = record.status === 'present';
        }
      });

      // Populate dailyAttendance for all days in the month
      allDaysInMonth.forEach(dayInMonth => {
        const dayString = format(dayInMonth, 'yyyy-MM-dd');
        dailyAttendance[dayString] = tutorMonthlyAttendance[dayString] || false; // false if not present or no record
      });

      let centerInfo = { name: 'N/A' };
      if (tutor.assignedCenter && tutor.assignedCenter.name) {
        centerInfo = { _id: tutor.assignedCenter._id, name: tutor.assignedCenter.name };
      }

      return {
        tutor: { _id: tutor._id, name: tutor.name, phone: tutor.phone },
        center: centerInfo,
        attendance: dailyAttendance // Map of 'yyyy-MM-dd': true (present) or false (absent/not marked)
      };
    });

    res.status(200).json(report);
  } catch (error) {
    console.error('Error fetching attendance report:', error);
    res.status(500).json({ message: 'Error fetching attendance report', errorDetails: error.message });
  }
};

// Get monthly attendance coordinates for tutors (all or specific tutor)
// @route GET /api/attendance/tutor-coordinates?month=MM&year=YYYY[&tutorId=...][&centerId=...]
// @access Private/Admin
export const getTutorMonthlyCoordinates = async (req, res) => {
  try {
    const { month, year, tutorId, centerId } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year are required query parameters.' });
    }

    const numericMonth = parseInt(month, 10);
    const numericYear = parseInt(year, 10);

    if (isNaN(numericMonth) || isNaN(numericYear) || numericMonth < 1 || numericMonth > 12) {
      return res.status(400).json({ message: 'Invalid month or year format.' });
    }

    // Only admins for now
    if (req.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const monthStartDate = startOfMonth(new Date(numericYear, numericMonth - 1, 1));
    const monthEndDate = endOfMonth(new Date(numericYear, numericMonth - 1, 1));

    const query = { status: { $in: ['active', 'pending'] } };
    if (centerId) {
      query.assignedCenter = centerId;
    }
    if (tutorId) {
      query._id = tutorId;
    }

    const tutors = await Tutor.find(query).populate('assignedCenter', 'name');

    const data = tutors.map(tutor => {
      const points = [];
      tutor.attendance.forEach(record => {
        const recordDate = new Date(record.date);
        if (recordDate >= monthStartDate && recordDate <= monthEndDate && record.status === 'present' && record.location && Array.isArray(record.location.coordinates)) {
          const [lng, lat] = record.location.coordinates; // GeoJSON order is [lng, lat]
          points.push({
            date: format(recordDate, 'yyyy-MM-dd'),
            time: format(recordDate, 'HH:mm'),
            lat,
            lng,
            status: record.status
          });
        }
      });

      let centerInfo = { name: 'N/A' };
      if (tutor.assignedCenter && tutor.assignedCenter.name) {
        centerInfo = { _id: tutor.assignedCenter._id, name: tutor.assignedCenter.name };
      }

      return {
        tutor: { _id: tutor._id, name: tutor.name, phone: tutor.phone },
        center: centerInfo,
        month: numericMonth,
        year: numericYear,
        points
      };
    });

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching tutor monthly coordinates:', error);
    res.status(500).json({ message: 'Error fetching tutor monthly coordinates', errorDetails: error.message });
  }
};