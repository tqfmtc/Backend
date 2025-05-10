import Student from '../models/Student.js';
import Center from '../models/Center.js';
import Tutor from '../models/Tutor.js';

// @desc    Get all students
// @route   GET /api/students
// @access  Private/Admin & Private/Tutor
export const getStudents = async (req, res) => {
  try {
    // No need to filter by tutor anymore since students are only linked to centers
    // All tutors assigned to a center can view all students from that center
    let query = {};
    
    // If tutor is requesting, only show students from their center
    if (req.role === 'tutor') {
      const tutor = await Tutor.findById(req.user._id);
      if (tutor && tutor.assignedCenter) {
        query.assignedCenter = tutor.assignedCenter;
      }
    }

    const students = await Student.find(query)
      .populate('assignedCenter', 'name location');
    
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Private/Admin & Private/Tutor from same center
export const getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('assignedCenter', 'name location');
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if tutor belongs to the same center as the student
    if (req.role === 'tutor') {
      const tutor = await Tutor.findById(req.user._id);
      if (!tutor || !tutor.assignedCenter || 
          (student.assignedCenter && tutor.assignedCenter.toString() !== student.assignedCenter.toString())) {
        return res.status(403).json({ message: 'Not authorized to access this student' });
      }
    }
    
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create student
// @route   POST /api/students
// @access  Private/Admin & Private/Tutor
export const createStudent = async (req, res) => {
  try {
    const {
      name,
      fatherName,
      contact,
      isOrphan,
      guardianInfo,
      isNonSchoolGoing,
      schoolInfo,
      gender,
      medium,
      aadharNumber,
      assignedCenter,
      remarks
    } = req.body;

    console.log('Received student data:', req.body); // Debug log

    // Check if center exists
    const center = await Center.findById(assignedCenter);
    if (!center) {
      return res.status(404).json({ message: 'Center not found' });
    }

    // If user is a tutor, they can only add students to their assigned center
    if (req.role === 'tutor') {
      // Verify that the tutor belongs to the selected center
      const tutor = await Tutor.findById(req.user._id);
      if (!tutor) {
        return res.status(404).json({ message: 'Tutor not found' });
      }
      if (!tutor.assignedCenter || tutor.assignedCenter.toString() !== assignedCenter) {
        return res.status(403).json({ message: 'You can only add students to your assigned center' });
      }
    }

    // Create student with proper data structure
    const studentData = {
      name,
      fatherName,
      contact,
      isOrphan,
      guardianInfo: isOrphan ? guardianInfo : undefined,
      isNonSchoolGoing,
      schoolInfo: !isNonSchoolGoing ? schoolInfo : undefined,
      gender,
      medium,
      aadharNumber,
      assignedCenter,
      remarks,
      attendance: [] // Initialize empty attendance array
    };

    console.log('Creating student with data:', studentData); // Debug log

    const student = await Student.create(studentData);

    // Add student to center's students array (use $addToSet for safety)
    await Center.findByIdAndUpdate(student.assignedCenter, { $addToSet: { students: student._id } });

    // Populate the response with center details
    const populatedStudent = await Student.findById(student._id)
      .populate('assignedCenter', 'name location');

    res.status(201).json(populatedStudent);
  } catch (error) {
    console.error('Error creating student:', error); // Debug log
    res.status(500).json({ 
      message: 'Error creating student',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private/Admin & Private/Tutor from same center
export const updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // If tutor is updating, they must belong to the same center as the student
    if (req.role === 'tutor') {
      const tutor = await Tutor.findById(req.user._id);
      if (!tutor || !tutor.assignedCenter || 
          student.assignedCenter.toString() !== tutor.assignedCenter.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this student' });
      }
    }

    // If center is being changed
    if (req.body.assignedCenter && req.body.assignedCenter !== student.assignedCenter.toString()) {
      // Remove student from old center
      const oldCenter = await Center.findById(student.assignedCenter);
      if (oldCenter) {
        oldCenter.students = oldCenter.students.filter(id => id.toString() !== student._id.toString());
        await oldCenter.save();
      }

      // Add student to new center
      const newCenter = await Center.findById(req.body.assignedCenter);
      if (!newCenter) {
        return res.status(404).json({ message: 'New center not found' });
      }
      newCenter.students.push(student._id);
      await newCenter.save();
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json(updatedStudent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private/Admin
export const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Remove student from center's students array
    await Center.findByIdAndUpdate(student.assignedCenter, { $pull: { students: student._id } });

    await student.deleteOne();
    res.json({ message: 'Student removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark student attendance
// @route   POST /api/students/:id/attendance
// @access  Private/Admin & Private/Tutor from same center
export const markAttendance = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if tutor belongs to the same center as the student
    if (req.role === 'tutor') {
      const tutor = await Tutor.findById(req.user._id);
      if (!tutor || !tutor.assignedCenter || 
          student.assignedCenter.toString() !== tutor.assignedCenter.toString()) {
        return res.status(403).json({ message: 'Not authorized to mark attendance for this student' });
      }
    }

    const { month, presentDays, totalDays } = req.body;

    // Validate attendance data
    if (presentDays > totalDays) {
      return res.status(400).json({ message: 'Present days cannot exceed total days' });
    }

    // Update or add attendance record
    const attendanceIndex = student.attendance.findIndex(a => a.month === month);
    if (attendanceIndex > -1) {
      student.attendance[attendanceIndex] = { month, presentDays, totalDays };
    } else {
      student.attendance.push({ month, presentDays, totalDays });
    }

    await student.save();
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get student attendance report
// @route   GET /api/students/:id/attendance-report
// @access  Private/Admin & Private/Tutor from same center
export const getStudentAttendanceReport = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if tutor belongs to the same center as the student
    if (req.role === 'tutor') {
      const tutor = await Tutor.findById(req.user._id);
      if (!tutor || !tutor.assignedCenter || 
          student.assignedCenter.toString() !== tutor.assignedCenter.toString()) {
        return res.status(403).json({ message: 'Not authorized to access this student\'s attendance' });
      }
    }

    const { startDate, endDate } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const attendanceReport = student.attendance.filter(record => {
      const recordDate = new Date(record.month);
      return recordDate >= start && recordDate <= end;
    });

    const totalPresent = attendanceReport.reduce((sum, record) => sum + record.presentDays, 0);
    const totalDays = attendanceReport.reduce((sum, record) => sum + record.totalDays, 0);
    const attendancePercentage = totalDays > 0 ? (totalPresent / totalDays) * 100 : 0;

    res.json({
      studentName: student.name,
      attendanceRecords: attendanceReport,
      summary: {
        totalPresent,
        totalDays,
        attendancePercentage: attendancePercentage.toFixed(2)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get monthly attendance report for all students
// @route   GET /api/students/reports/monthly
// @access  Private/Admin
export const getMonthlyAttendanceReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const students = await Student.find()
      .populate('assignedCenter', 'name')
      .populate('assignedTutor', 'name');

    const report = students.map(student => {
      const attendanceRecords = student.attendance.filter(record => {
        const recordDate = new Date(record.month);
        return recordDate >= start && recordDate <= end;
      });

      const totalPresent = attendanceRecords.reduce((sum, record) => sum + record.presentDays, 0);
      const totalDays = attendanceRecords.reduce((sum, record) => sum + record.totalDays, 0);
      const attendancePercentage = totalDays > 0 ? (totalPresent / totalDays) * 100 : 0;

      return {
        studentId: student._id,
        studentName: student.name,
        center: student.assignedCenter?.name || 'Not Assigned',
        tutor: student.assignedTutor?.name || 'Not Assigned',
        attendanceRecords,
        summary: {
          totalPresent,
          totalDays,
          attendancePercentage: attendancePercentage.toFixed(2)
        }
      };
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get student progress report
// @route   GET /api/students/:id/progress
// @access  Private/Admin & Private/Tutor from same center
export const getStudentProgress = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('assignedCenter', 'name');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Check if tutor belongs to the same center as the student
    if (req.role === 'tutor') {
      const tutor = await Tutor.findById(req.user._id);
      if (!tutor || !tutor.assignedCenter || 
          student.assignedCenter.toString() !== tutor.assignedCenter.toString()) {
        return res.status(403).json({ message: 'Not authorized to access this student\'s progress' });
      }
    }

    // Calculate attendance trends
    const attendanceTrend = student.attendance
      .sort((a, b) => new Date(a.month) - new Date(b.month))
      .map(record => ({
        month: record.month,
        percentage: ((record.presentDays / record.totalDays) * 100).toFixed(2)
      }));

    // Calculate overall statistics
    const totalRecords = student.attendance.length;
    const averageAttendance = totalRecords > 0
      ? (student.attendance.reduce((sum, record) => 
          sum + ((record.presentDays / record.totalDays) * 100), 0) / totalRecords).toFixed(2)
      : 0;

    res.json({
      studentInfo: {
        name: student.name,
        center: student.assignedCenter?.name,
        class: student.schoolInfo?.class,
        medium: student.medium
      },
      attendanceTrend,
      statistics: {
        averageAttendance,
        totalMonthsRecorded: totalRecords
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};