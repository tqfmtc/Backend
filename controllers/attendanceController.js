import Attendance from '../models/Attendance.js';
import AttendanceButton from '../models/AttendanceButton.js';
import Tutor from '../models/Tutor.js';
import Center from '../models/Center.js';
import { startOfMonth, endOfMonth, format, eachDayOfInterval } from 'date-fns';
import { istToday, istTodayBounds, formatIstTime } from '../utils/istTime.js';

// Reports have one row per tutor per center: each center the tutor is assigned to, plus any
// other center they have attendance at in the range (e.g. one they were moved away from).
// Returns [{ _id, name }], filtered to centerId when given.
const reportCenters = (tutor, inRange, centerId) => {
  const centers = new Map();
  for (const a of tutor.assignments || []) {
    if (a.center) centers.set(String(a.center._id ?? a.center), a.center.name || 'N/A');
  }
  for (const r of tutor.attendance || []) {
    const id = r.center && String(r.center);
    if (id && !centers.has(id) && inRange(new Date(r.date))) centers.set(id, r.centerName || 'N/A');
  }
  let rows = [...centers].map(([_id, name]) => ({ _id, name }));
  if (centerId) rows = rows.filter(c => c._id === String(centerId));
  // Keep tutors with no center visible in the unfiltered report
  if (!rows.length && !centerId) rows = [{ name: 'N/A' }];
  return rows;
};

// Tutors for a report: those assigned to centerId or with attendance there
const reportTutorQuery = (centerId) => {
  const query = { status: { $in: ['active', 'pending'] } };
  if (centerId) query.$or = [{ 'assignments.center': centerId }, { 'attendance.center': centerId }];
  return query;
};

// "tutorId:centerId" -> 'yyyy-MM-dd' -> IST "h:mm AM/PM" of when the record was created
const buildTimestampMap = (attendanceDocs) => {
  const map = {};
  attendanceDocs.forEach(doc => {
    if (!doc.createdAt) return;
    const key = `${doc.tutor}:${doc.center}`;
    if (!map[key]) map[key] = {};
    map[key][format(new Date(doc.date), 'yyyy-MM-dd')] = formatIstTime(doc.createdAt);
  });
  return map;
};

// Present attendance points for one tutor at one center within the range
const attendancePoints = (tutor, center, inRange, times) => {
  const points = [];
  tutor.attendance.forEach(record => {
    const recordDate = new Date(record.date);
    if (
      inRange(recordDate) &&
      String(record.center) === String(center._id) &&
      record.status === 'present' &&
      record.location &&
      Array.isArray(record.location.coordinates)
    ) {
      const [lng, lat] = record.location.coordinates; // GeoJSON order is [lng, lat]
      const dateStr = format(recordDate, 'yyyy-MM-dd');
      points.push({ date: dateStr, time: times[dateStr] || null, lat, lng, status: record.status });
    }
  });
  return points;
};

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
      // Match the schema default and submitAttendance: no document means enabled
      return res.status(200).json({status:true,message:"Button not set, defaulting to enabled"});
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
    // Upsert: there is a unique index on (tutor, center, date), so re-marking a day must
    // correct the existing record instead of creating a second one
    const attendanceDoc = await Attendance.findOneAndUpdate(
      { tutor: tutor._id, center: center._id, date: recordDate },
      { $set: { status: status, markedBy: adminId } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    // Keep the embedded copy in sync: update that day's entry for this center, or add it
    const existingIndex = tutor.attendance.findIndex(
      r => r.date && r.date.getTime() === recordDate.getTime() && String(r.center) === String(center._id)
    );
    if (existingIndex === -1) {
      tutor.attendance.push({ ...attendanceRecord, createdAt: attendanceDoc.createdAt });
    } else {
      const existing = tutor.attendance[existingIndex];
      existing.status = status;
      existing.centerName = center.name;
      existing.markedBy = adminId;
    }
    await tutor.save();

    const savedRecord = tutor.attendance[existingIndex === -1 ? tutor.attendance.length - 1 : existingIndex];

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
  const { start: startOfToday, end: endOfToday } = istTodayBounds();
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
      // Tutor: return only today's attendance for this tutor (one record per center)
      const tutorId = req.user._id;
      const today = istToday();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const recent = await Attendance.find({
        tutor: tutorId,
        date: { $gte: today, $lt: tomorrow }
      })
        .sort({ createdAt: -1 })
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
    const tutors = await Tutor.find(reportTutorQuery(centerId)).populate('assignments.center', 'name');
    const inRange = (d) => d >= rangeStartDate && d <= rangeEndDate;

    // Fetch Attendance docs for the full range to get real createdAt timestamps
    const attendanceDocsQuery = { date: { $gte: rangeStartDate, $lte: rangeEndDate } };
    if (centerId) attendanceDocsQuery.center = centerId;
    const timestampMap = buildTimestampMap(await Attendance.find(attendanceDocsQuery));

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

    // Build report rows: one per tutor per center
    const report = tutors.flatMap(tutor => reportCenters(tutor, inRange, centerId).map(center => {
      const times = timestampMap[`${tutor._id}:${center._id}`] || {};

      // Quick lookup from embedded attendance records at this center
      const tutorAttendanceLookup = {};
      tutor.attendance.forEach(record => {
        const recordDate = new Date(record.date);
        if (inRange(recordDate) && String(record.center) === String(center._id)) {
          tutorAttendanceLookup[format(recordDate, 'yyyy-MM-dd')] = record.status === 'present';
        }
      });

      // Build dailyAttendance map for every day in the range
      const dailyAttendance = {};
      allDaysInRange.forEach(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const present = tutorAttendanceLookup[dayStr] || false;
        const time = present && times[dayStr] ? times[dayStr] : null;
        dailyAttendance[dayStr] = { present, time };
      });

      // Average mark time across all present days in the range
      const allTimes = Object.values(times);
      let avgMarkTime = null;
      if (allTimes.length > 0) {
        const minuteVals = allTimes.map(parseTimeToMinutes).filter(v => v !== null);
        if (minuteVals.length > 0) {
          const avg = Math.round(minuteVals.reduce((s, v) => s + v, 0) / minuteVals.length);
          avgMarkTime = minutesToTimeStr(avg);
        }
      }

      return {
        tutor: { _id: tutor._id, name: tutor.name, phone: tutor.phone },
        center,
        attendance: dailyAttendance,
        avgMarkTime
      };
    }));

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

    const query = reportTutorQuery(centerId);
    if (tutorId) {
      query._id = tutorId;
    }

    const tutors = await Tutor.find(query).populate('assignments.center', 'name');
    const inRange = (d) => d >= monthStartDate && d <= monthEndDate;

    // Fetch Attendance docs for timestamps
    const attQuery = { date: { $gte: monthStartDate, $lte: monthEndDate } };
    if (tutorId) attQuery.tutor = tutorId;
    if (centerId) attQuery.center = centerId;
    const tsMap = buildTimestampMap(await Attendance.find(attQuery));

    // One entry per tutor per center
    const data = tutors.flatMap(tutor => reportCenters(tutor, inRange, centerId).map(center => ({
      tutor: { _id: tutor._id, name: tutor.name, phone: tutor.phone },
      center,
      month: numericMonth,
      year: numericYear,
      points: attendancePoints(tutor, center, inRange, tsMap[`${tutor._id}:${center._id}`] || {})
    })));

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
    const query = reportTutorQuery(centerId);
    if (tutorId) {
      query._id = tutorId;
    }

    const tutors = await Tutor.find(query).populate('assignments.center', 'name');
    const inRange = (d) => d >= rangeStartDate && d <= rangeEndDate;

    // Fetch Attendance docs for timestamps in the range
    const rangeAttQuery = {
      date: { $gte: rangeStartDate, $lte: rangeEndDate }
    };
    if (tutorId) rangeAttQuery.tutor = tutorId;
    if (centerId) rangeAttQuery.center = centerId;
    const rangeTimestampMap = buildTimestampMap(await Attendance.find(rangeAttQuery));

    // Consolidated points across the date range, one entry per tutor per center
    const data = tutors.flatMap(tutor => reportCenters(tutor, inRange, centerId).map(center => {
      const points = attendancePoints(tutor, center, inRange, rangeTimestampMap[`${tutor._id}:${center._id}`] || {});
      return {
        tutor: { _id: tutor._id, name: tutor.name, phone: tutor.phone },
        center,
        dateRange: {
          from: { month: fromNumMonth, year: fromNumYear },
          to: { month: toNumMonth, year: toNumYear }
        },
        totalPoints: points.length,
        points
      };
    }));

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching tutor coordinates range:', error);
    res.status(500).json({ 
      message: 'Error fetching tutor coordinates range', 
      errorDetails: error.message 
    });
  }
};

