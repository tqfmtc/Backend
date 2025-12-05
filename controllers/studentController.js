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
    // Determine status filter: 'active' by default, 'inactive' or 'all' from query
  const statusFilter = req.query.status || 'active';
  let query = {};
  if (statusFilter !== 'all') {
    query.status = statusFilter;
  }
    
    // If tutor is requesting, only show students from their center
    if (req.role === 'tutor') {
      const tutor = await Tutor.findById(req.user._id);
      if (tutor && tutor.assignedCenter) {
        query.assignedCenter = tutor.assignedCenter;
      }
    }

    const students = await Student.find(query)
      .populate('assignedCenter', 'name location')
      .populate('assignedTutor', 'name contact email')
      .populate({
    path: 'subjects',                  // populate StudentSubject
    populate: {                        // nested populate
      path: 'subject',                 // populate Subject inside StudentSubject
      select: 'name'                   // only include the name field
    }
  });
    
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentByCenter = async (req, res) => {
  try {
    const centerId = req.params.centerId;
    const query = { assignedCenter: centerId, status: 'active' };
    const students = await Student.find(query)
      .populate('assignedCenter', 'name location')
      .populate('assignedTutor', 'name contact email');
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
    console.log('--- 🎓 GET STUDENT DEBUG START ---');
    console.log('Requested Student ID:', req.params.id);
    console.log('User Role:', req.role);
    console.log('Authenticated User ID:', req.user?._id?.toString());

    const student = await Student.findOne({ _id: req.params.id, status: 'active' })
      .populate('assignedCenter', 'name location')
      .populate('assignedTutor', 'name contact email')
      .populate({
        path: 'subjects',
        populate: {
          path: 'subject',
          select: 'name',
        },
      });

    if (!student) {
      console.log('❌ Student not found.');
      return res.status(404).json({ message: 'Student not found' });
    }

    console.log('✅ Student found:', student._id.toString());
    console.log('   student.assignedCenter:', student.assignedCenter?._id?.toString() || student.assignedCenter?.toString());

    if (req.role === 'tutor') {
      const tutor = await Tutor.findById(req.user._id);
      console.log('👨‍🏫 Tutor found:', tutor?._id?.toString());
      console.log('   tutor.assignedCenter:', tutor?.assignedCenter?.toString());

      // Handle both populated and raw ObjectId cases
      const studentCenterId = student.assignedCenter?._id
        ? student.assignedCenter._id.toString()
        : student.assignedCenter?.toString();
      const tutorCenterId = tutor?.assignedCenter?.toString();

      const centerMatch = studentCenterId === tutorCenterId;
      console.log('🔍 Comparing centers →', studentCenterId, '===', tutorCenterId, '? →', centerMatch);

      if (!tutor || !tutor.assignedCenter || !centerMatch) {
        console.log('❌ Authorization failed - Not same center');
        return res.status(403).json({ message: 'Not authorized to access this student' });
      }

      console.log('✅ Tutor and student belong to the same center');
    }

    console.log('--- 🎓 GET STUDENT DEBUG END ---');
    res.json(student);
  } catch (error) {
    console.error('💥 getStudent() Error:', error);
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
  let assignedTutor;
  if (req.role === 'tutor') {
    // If the logged-in user is a tutor, assign themselves as the tutor
    assignedTutor = req.user._id;
  } else {
    // Otherwise, get the tutor ID from the request body
    assignedTutor = req.body.assignedTutor;

    // Check if the provided tutor exists
    if (assignedTutor) {
      const tutor = await Tutor.findById(assignedTutor);
      if (!tutor) {
        return res.status(404).json({ message: 'Assigned tutor not found' });
      }
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
      assignedTutor,
      remarks,
      attendance: [], // Initialize empty attendance array
      status: 'active' // Always set status to active on creation
    };

    console.log('Creating student with data:', studentData); // Debug log

    const student = await Student.create(studentData);

    // Add student to center's students array (use $addToSet for safety)
    await Center.findByIdAndUpdate(student.assignedCenter, { $addToSet: { students: student._id } });

    // Populate the response with center details
    const populatedStudent = await Student.findById(student._id)
      .populate('assignedCenter', 'name location')
      .populate('assignedTutor', 'name contact email');

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

    // Handle assignedTutor validation and update
    if (req.body.assignedTutor) {
      // Check if tutor is being changed
      const oldTutorId = student.assignedTutor?.toString();
      const newTutorId = req.body.assignedTutor;
      
      if (oldTutorId !== newTutorId) {
        // Verify new tutor exists
        const newTutor = await Tutor.findById(newTutorId);
        if (!newTutor) {
          return res.status(404).json({ message: 'Assigned tutor not found' });
        }

        // Remove student from old tutor's students array
        if (oldTutorId) {
          await Tutor.findByIdAndUpdate(oldTutorId, { $pull: { students: student._id } });
        }

        // Add student to new tutor's students array
        await Tutor.findByIdAndUpdate(newTutorId, { $addToSet: { students: student._id } });
      }

      student.assignedTutor = newTutorId;
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

    // If student is inactive, make them active on any edit
    if (student.status === 'inactive') {
      req.body.status = 'active';
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('assignedCenter', 'name location').populate('assignedTutor', 'name contact email');

    res.json(updatedStudent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// change assignedTutor
export const changeAssignedTutor = async (req, res) => {
  try {
    const { studentId, tutorId } = req.body;
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const tutor = await Tutor.findById(tutorId);
    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }
    student.assignedTutor = tutorId;
    await student.save();
    
    // Populate the response with tutor details
    const updatedStudent = await Student.findById(student._id)
      .populate('assignedCenter', 'name location')
      .populate('assignedTutor', 'name contact email');
    
    res.json({ message: 'Assigned tutor updated successfully', student: updatedStudent });
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
    if(student.status === 'inactive') { 
    // Remove student from center's students array
    await Center.findByIdAndUpdate(student.assignedCenter, { $pull: { students: student._id } });

    await student.deleteOne();
    res.json({ message: 'Student removed' });
    } else {
      student.status = 'inactive';
      await student.save();
      res.json({ message: 'Student status updated to inactive' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markDailyAttendance = async (req, res) => {
  try{
    const {date,students}=req.body
    if(!date || !students || !Array.isArray(students)){
        return res.status(400).json("date and students array are required")
    }
    const results=[]
    for(const studentAttendance of students){
        const {studentId, status}=studentAttendance
        const student= await Student.findById(studentId)
        if(!student){
            results.push({studentId, status:"Student not found"})
            continue
        }
        // Check if attendance for the date already exists
        const existingRecord= student.dailyAttendance.find(record=> record.date===date)
        if(existingRecord){
            existingRecord.status=status
        } else{
            student.dailyAttendance.push({date, status})
        }
        await student.save()
        results.push({studentId, status:"Attendance marked"})
    }
    res.status(200).json(results)

  }
  catch(error){
    res.status(500).json({message:error.message})
  }
}

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

    const students = await Student.find({ status: 'active' })
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
    const student = await Student.findOne({ _id: req.params.id, status: 'active' })
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

// @desc    Get full report for multiple students with filtered data
// @route   POST /api/students/FullReport/students
// @access  Private/Admin
export const getStudentFullReport = async (req, res) => {
  try {
    const { fromMonth, toMonth, year, studentIds } = req.body;

    // Validate inputs
    if (!fromMonth || !toMonth || !year || !studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({ 
        message: 'fromMonth, toMonth, year, and studentIds array are required' 
      });
    }

    // Convert month names to numbers (e.g., "January" -> 1)
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const fromMonthNum = monthNames.indexOf(fromMonth) + 1;
    const toMonthNum = monthNames.indexOf(toMonth) + 1;

    if (fromMonthNum === 0 || toMonthNum === 0) {
      return res.status(400).json({ message: 'Invalid month names provided' });
    }

    // Create date range for filtering
    const startDate = new Date(year, fromMonthNum - 1, 1);
    const endDate = new Date(year, toMonthNum, 0); // Last day of toMonth

    // Import StudentSubject model dynamically
    const StudentSubject = (await import('../models/StudentSubject.js')).default;

    // Fetch all students with populated fields
    const students = await Student.find({ _id: { $in: studentIds } })
      .populate('assignedCenter', 'name location')
      .populate('assignedTutor', 'name contact email')
      .populate({
        path: 'subjects',
        populate: {
          path: 'subject',
          select: 'name description',
        },
      });

    // Process each student to filter attendance and marks
    const processedStudents = await Promise.all(
      students.map(async (student) => {
        const studentObj = student.toObject();

        // Filter attendance by date range
        studentObj.attendance = studentObj.attendance.filter((att) => {
          // Parse month string (format: "January 2024", "February 2024", etc.)
          const [monthName, attYear] = att.month.split(' ');
          const attMonthNum = monthNames.indexOf(monthName) + 1;
          const attYearNum = parseInt(attYear);

          // Check if attendance falls within the range
          if (attYearNum !== parseInt(year)) return false;
          return attMonthNum >= fromMonthNum && attMonthNum <= toMonthNum;
        });

        // Fetch student subject records for marks filtering
        const subjectRecords = await StudentSubject.find({ 
          student: student._id 
        })
          .populate('subject', 'name description')
          .lean();

        // Filter marks by date range
        const filteredSubjects = subjectRecords.map((record) => {
          const filteredMarks = record.marksPercentage.filter((mark) => {
            const examDate = new Date(mark.examDate);
            return examDate >= startDate && examDate <= endDate;
          });

          return {
            ...record,
            marksPercentage: filteredMarks,
          };
        });

        // Add filtered marks to student object
        studentObj.subjectMarks = filteredSubjects;

        return studentObj;
      })
    );

    res.json({
      success: true,
      count: processedStudents.length,
      dateRange: {
        fromMonth,
        toMonth,
        year,
        startDate,
        endDate,
      },
      students: processedStudents,
    });
  } catch (error) {
    console.error('Error in getStudentFullReport:', error);
    res.status(500).json({ message: error.message });
  }
};