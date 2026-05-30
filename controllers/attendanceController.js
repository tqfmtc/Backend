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
    else{
      button.status=status;
      button.lastChangedBy=req.user._id;
      button.lastChangedAt=new Date();
    }
    await button.save();
    res.status(200).json({message:"Attendance button status updated",button});
  }
  catch(err){
    console.error('Error toggling attendance button:', err);
    res.status(500).json({message:"Error toggling attendance button",errorDetails:err.message});
  }
}

//get status of attendance button
export const buttonStatus=async(req,res)=>{
  try{
    let button=await AttendanceButton.findOne();
    if(!button){
      return res.status(200).json({status:false,message:"Button not set, defaulting to false"});
    }
    res.status(200).json({status:button.status});
  }
  catch(err){
    console.error('Error fetching attendance button status:', err);
    res.status(500).json({message:"Error fetching attendance button status",errorDetails:err.message});
  }
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
    const { month, year, fromMonth, fromYear, toMonth, toYear, centerId } = req.query;

    // Support both single-month (month/year) and full range (fromMonth/fromYear/toMonth/toYear)
    let startMonth, startYear, endMonth, endYear;

    if (fromMonth && fromYear && toMonth && toYear) {
      startMonth = parseInt(fromMonth, 10);
      startYear  = parseInt(fromYear,  10);
      endMonth   = parseInt(toMonth,   10);
      endYear    = parseInt(toYear,    10);
    } else if (month && year) {
      startMonth = endMonth = parseInt(month, 10);
      startYear  = endYear  = parseInt(year,  10);
    } else {
      return res.status(400).json({ message: 'Provide month+year or fromMonth+fromYear+toMonth+toYear.' });
    }

    if (
      isNaN(startMonth) || isNaN(startYear) || isNaN(endMonth) || isNaN(endYear) ||
      startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12
    ) {
      return res.status(400).json({ message: 'Invalid month or year format.' });
    }

    // Define the full date range
    const rangeStartDate = startOfMonth(new Date(startYear, startMonth - 1, 1));
    const rangeEndDate   = endOfMonth(new Date(endYear, endMonth - 1, 1));

    // Get all tutors (optionally filtered by center)
    const tutorQuery = centerId
      ? { assignedCenter: centerId, status: { $in: ['active', 'pending'] } }
      : { status: { $in: ['active', 'pending'] } };
    const tutors = await Tutor.find(tutorQuery).populate('assignedCenter', 'name');

    // Fetch Attendance docs for the full range to get real createdAt timestamps
    const attendanceDocsQuery = { date: { $gte: rangeStartDate, $lte: rangeEndDate } };
    if (centerId) attendanceDocsQuery.center = centerId;
    const attendanceDocs = await Attendance.find(attendanceDocsQuery);

    // Build lookup: tutorId -> dateString -> 12h time string
    const timestampMap = {};
    attendanceDocs.forEach(doc => {
      const tutorId = doc.tutor.toString();
      const dateStr = format(new Date(doc.date), 'yyyy-MM-dd');
      if (!timestampMap[tutorId]) timestampMap[tutorId] = {};
      if (doc.createdAt) {
        const h = doc.createdAt.getHours();
        const m = doc.createdAt.getMinutes();
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        timestampMap[tutorId][dateStr] = `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
      }
    });

    // Generate every calendar day in the range
    const allDaysInRange = eachDayOfInterval({ start: rangeStartDate, end: rangeEndDate });

    // Helpers for avgMarkTime calculation
    const parseTimeToMinutes = (t) => {
      const match = t && t.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return null;
      let h = parseInt(match[1]);
      const m = parseInt(match[2]);
      const ap = match[3].toUpperCase();
      if (ap === 'PM' && h !== 12) h += 12;
      if (ap === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };

    const minutesToTimeStr = (mins) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
    };

    // Build report for each tutor
    const report = tutors.map(tutor => {
      const tutorIdStr = tutor._id.toString();

      // Quick lookup from embedded attendance records
      const tutorAttendanceLookup = {};
      tutor.attendance.forEach(record => {
        const recordDate = new Date(record.date);
        if (recordDate >= rangeStartDate && recordDate <= rangeEndDate) {
          tutorAttendanceLookup[format(recordDate, 'yyyy-MM-dd')] = record.status === 'present';
        }
      });

      // Build dailyAttendance map for every day in the range
      const dailyAttendance = {};
      allDaysInRange.forEach(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const present = tutorAttendanceLookup[dayStr] || false;
        const time = present && timestampMap[tutorIdStr]?.[dayStr]
          ? timestampMap[tutorIdStr][dayStr]
          : null;
        dailyAttendance[dayStr] = { present, time };
      });

      // Average mark time across all present days in the range
      const allTimes = Object.values(timestampMap[tutorIdStr] || {});
      let avgMarkTime = null;
      if (allTimes.length > 0) {
        const minuteVals = allTimes.map(parseTimeToMinutes).filter(v => v !== null);
        if (minuteVals.length > 0) {
          const avg = Math.round(minuteVals.reduce((s, v) => s + v, 0) / minuteVals.length);
          avgMarkTime = minutesToTimeStr(avg);
        }
      }

      let centerInfo = { name: 'N/A' };
      if (tutor.assignedCenter?.name) {
        centerInfo = { _id: tutor.assignedCenter._id, name: tutor.assignedCenter.name };
      }

      return {
        tutor: { _id: tutor._id, name: tutor.name, phone: tutor.phone },
        center: centerInfo,
        attendance: dailyAttendance,
        avgMarkTime
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

    // Fetch Attendance docs for timestamps
    const attQuery = { date: { $gte: monthStartDate, $lte: monthEndDate } };
    if (tutorId) attQuery.tutor = tutorId;
    if (centerId) attQuery.center = centerId;
    const attendanceDocs = await Attendance.find(attQuery);

    // Build timestamp lookup: tutorId -> dateStr -> 12h time string
    const tsMap = {};
    attendanceDocs.forEach(doc => {
      const tid = doc.tutor.toString();
      const dStr = format(new Date(doc.date), 'yyyy-MM-dd');
      if (!tsMap[tid]) tsMap[tid] = {};
      if (doc.createdAt) {
        const createdAt = doc.createdAt;
        const hours = createdAt.getHours();
        const minutes = createdAt.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const h12 = hours % 12 || 12;
        tsMap[tid][dStr] = `${h12}:${String(minutes).padStart(2, '0')} ${ampm}`;
      }
    });

    const data = tutors.map(tutor => {
      const tutorIdStr = tutor._id.toString();
      const points = [];
      tutor.attendance.forEach(record => {
        const recordDate = new Date(record.date);
        if (recordDate >= monthStartDate && recordDate <= monthEndDate && record.status === 'present' && record.location && Array.isArray(record.location.coordinates)) {
          const [lng, lat] = record.location.coordinates; // GeoJSON order is [lng, lat]
          const dateStr = format(recordDate, 'yyyy-MM-dd');
          const timeStr = (tsMap[tutorIdStr] && tsMap[tutorIdStr][dateStr]) ? tsMap[tutorIdStr][dateStr] : null;
          points.push({
            date: dateStr,
            time: timeStr,
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

/**
 * Get consolidated tutor coordinates across a date range (multiple months)
 * @route POST /api/attendance/tutor-coordinates-range
 * @access Private/Admin
 * @description Retrieves all attendance coordinates for tutors between a 'from' month/year and 'to' month/year
 * @body {
 *   fromMonth: number (1-12),
 *   fromYear: number,
 *   toMonth: number (1-12),
 *   toYear: number,
 *   tutorId?: string (optional - filter by specific tutor),
 *   centerId?: string (optional - filter by specific center)
 * }
 * @returns Array of objects containing tutor info, center info, and consolidated points across the date range
 */
export const getTutorCoordinatesRange = async (req, res) => {
  try {
    const { fromMonth, fromYear, toMonth, toYear, tutorId, centerId } = req.body;

    // Validate required fields
    if (!fromMonth || !fromYear || !toMonth || !toYear) {
      return res.status(400).json({ 
        message: 'Missing required fields: fromMonth, fromYear, toMonth, toYear.' 
      });
    }

    // Validate month and year values
    const fromNumMonth = parseInt(fromMonth, 10);
    const fromNumYear = parseInt(fromYear, 10);
    const toNumMonth = parseInt(toMonth, 10);
    const toNumYear = parseInt(toYear, 10);

    if (
      isNaN(fromNumMonth) || isNaN(fromNumYear) || isNaN(toNumMonth) || isNaN(toNumYear) ||
      fromNumMonth < 1 || fromNumMonth > 12 || toNumMonth < 1 || toNumMonth > 12
    ) {
      return res.status(400).json({ 
        message: 'Invalid month or year format. Months must be 1-12.' 
      });
    }

    // Only admins allowed
    if (req.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Calculate the start date (first day of fromMonth) and end date (last day of toMonth)
    const rangeStartDate = startOfMonth(new Date(fromNumYear, fromNumMonth - 1, 1));
    const rangeEndDate = endOfMonth(new Date(toNumYear, toNumMonth - 1, 1));

    // Build query for tutors
    const query = { status: { $in: ['active', 'pending'] } };
    if (centerId) {
      query.assignedCenter = centerId;
    }
    if (tutorId) {
      query._id = tutorId;
    }

    const tutors = await Tutor.find(query).populate('assignedCenter', 'name');

    // Fetch Attendance docs for timestamps in the range
    const rangeAttQuery = {
      date: { $gte: rangeStartDate, $lte: rangeEndDate }
    };
    if (tutorId) rangeAttQuery.tutor = tutorId;
    if (centerId) rangeAttQuery.center = centerId;
    const rangeAttendanceDocs = await Attendance.find(rangeAttQuery);

    // Build timestamp lookup: tutorId -> dateStr -> 12h time string
    const rangeTimestampMap = {};
    rangeAttendanceDocs.forEach(doc => {
      const tid = doc.tutor.toString();
      const dStr = format(new Date(doc.date), 'yyyy-MM-dd');
      if (!rangeTimestampMap[tid]) rangeTimestampMap[tid] = {};
      if (doc.createdAt) {
        const createdAt = doc.createdAt;
        const hours = createdAt.getHours();
        const minutes = createdAt.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const h12 = hours % 12 || 12;
        rangeTimestampMap[tid][dStr] = `${h12}:${String(minutes).padStart(2, '0')} ${ampm}`;
      }
    });

    // Build consolidated data for all tutors in the date range
    const data = tutors.map(tutor => {
      const tutorIdStr = tutor._id.toString();
      const points = [];
      tutor.attendance.forEach(record => {
        const recordDate = new Date(record.date);
        // Include records that fall within the date range and have valid location data
        if (
          recordDate >= rangeStartDate &&
          recordDate <= rangeEndDate &&
          record.status === 'present' &&
          record.location &&
          Array.isArray(record.location.coordinates)
        ) {
          const [lng, lat] = record.location.coordinates; // GeoJSON order is [lng, lat]
          const dateStr = format(recordDate, 'yyyy-MM-dd');
          const timeStr = (rangeTimestampMap[tutorIdStr] && rangeTimestampMap[tutorIdStr][dateStr])
            ? rangeTimestampMap[tutorIdStr][dateStr]
            : null;
          points.push({
            date: dateStr,
            time: timeStr,
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
        dateRange: {
          from: { month: fromNumMonth, year: fromNumYear },
          to: { month: toNumMonth, year: toNumYear }
        },
        totalPoints: points.length,
        points
      };
    });

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching tutor coordinates range:', error);
    res.status(500).json({ 
      message: 'Error fetching tutor coordinates range', 
      errorDetails: error.message 
    });
  }
};

