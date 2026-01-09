import Subject from '../models/Subject.js';
import Student from '../models/Student.js';
import Tutor from '../models/Tutor.js';
import StudentSubject from '../models/StudentSubject.js';

// Add new subject
export const addSubject = async (req, res) => {
    try {
        const { subjectName, students, tutors } = req.body; // Changed from 'subject' to 'subjectName'
        if (!subjectName) {
            return res.status(400).json("Subject name is required");
        }
        
        // Create subject with the data from request
        const subjectData = { subjectName };
        if (students && students.length > 0) {
            subjectData.students = students;
        }
        if (tutors && tutors.length > 0) {
            subjectData.tutors = tutors;
        }
        
        const newSubject = await Subject.create(subjectData);
        res.status(201).json(newSubject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update subject
export const updateSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { subjectName, students, tutors } = req.body; // Changed from 'subject' to 'subjectName'

        const updateData = {};
        if (subjectName) updateData.subjectName = subjectName;
        if (students) updateData.students = students;
        if (tutors) updateData.tutors = tutors;

        const updatedSubject = await Subject.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!updatedSubject) {
            return res.status(404).json("Subject not found");
        }

        res.status(200).json(updatedSubject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const addStudentsToSubject = async (req, res, next) => {
  try {
    const { subjectId, studentIds } = req.body;
    if (!subjectId || !Array.isArray(studentIds)) {
      return res.status(400).json("subjectId and studentIds(array) are required");
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json("Subject not found");
    }

    // Validate all students exist
    for (const studentId of studentIds) {
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json(`Student with ID ${studentId} not found`);
      }
    }

    // Add students (avoid duplicates)
    subject.students = [...new Set([...(subject.students || []), ...studentIds])];
    await subject.save();

    // Pass data to next controller via req object
    req.body.studentIds = studentIds;
    req.body.subjectId = subjectId;

    next();

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createStudentSubjectRecord = async (req, res) => {
  try {
    const studentIds = req.body.studentIds;
    const subjectId = req.body.subjectId;

    if (!studentIds || !subjectId) {
      return res.status(400).json("studentIds and subjectId are required");
    }

    // Create StudentSubject records for each student
    await Promise.all(studentIds.map(async (studentId) => {
      const existingRecord = await StudentSubject.findOne({ student: studentId, subject: subjectId });
      if (!existingRecord) {
        await StudentSubject.create({ student: studentId, subject: subjectId });
      }
    }));

    res.status(200).json("Students added to subject and student-subject records created successfully");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeStudentFromSubject= async (req, res) => {
    try {
        const { id } = req.params; // Subject ID
        const { studentIds } = req.body; // Student ID to be removed
        if (!studentIds || !Array.isArray(studentIds)) {
            return res.status(400).json("studentIds(array) is required");
        }
        const subject = await Subject.findById(id);
        if (!subject) {
            return res.status(404).json("Subject not found");
        }
        // Remove students
        subject.students = subject.students.filter(studentId => !studentIds.includes(studentId.toString()));
        await subject.save();
        res.status(200).json("Students removed from subject successfully");
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Add tutors to a subject
export const addTutorsToSubject = async (req, res) => {
    try {
        const { subjectId, tutorIds } = req.body;
        if (!subjectId || !Array.isArray(tutorIds)) {
            return res.status(400).json("subjectId and tutorIds(array) are required");
        }

        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(404).json("Subject not found");
        }

        // Validate all tutors exist
        for (const tutorId of tutorIds) {
            const tutor = await Tutor.findById(tutorId);
            if (!tutor) {
                return res.status(404).json(`Tutor with ID ${tutorId} not found`);
            }
        }

        // Add tutors (avoid duplicates)
        subject.tutors = [...new Set([...(subject.tutors || []), ...tutorIds])];
        await subject.save();

        res.status(200).json("Tutors added to subject successfully");
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all subjects
export const getAllSubjects = async (req, res) => {
    try {
        // Fetch all subjects with populated students and tutors
        const subjects = await Subject.find()
            .populate('students', 'name email')
            .populate('tutors', 'name email')
            .select('subjectName students tutors isActive createdAt')
            .lean();
        
        res.status(200).json(subjects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getByCenter = async (req, res) => {
    try {
        const { id, centerId } = req.params;
        
        const subject = await Subject.findById(id).populate({
            path: 'students',
            match: { assignedCenter: centerId },
            select: 'name email phone assignedCenter'
        });

        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        return res.status(200).json(subject);
    } catch (error) {
        console.error('Error fetching subject by center:', error);
        return res.status(500).json({ 
            message: 'Error fetching subject', 
            error: error.message 
        });
    }
};

// Get subject by ID
export const getSubjectById = async (req, res) => {
    try {
        const { id } = req.params;
        const subject = await Subject.findById(id).populate('students').populate('tutors');
        if (!subject) {
            return res.status(404).json("Subject not found");
        }
        res.status(200).json(subject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Toggle subject active status
export const toggleSubjectStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const subject = await Subject.findById(id);
        
        if (!subject) {
            return res.status(404).json({ message: "Subject not found" });
        }
        
        // Toggle the isActive status
        subject.isActive = !subject.isActive;
        await subject.save();
        
        const status = subject.isActive ? 'activated' : 'deactivated';
        res.status(200).json({ 
            message: `Subject ${status} successfully`,
            subject 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete subject
export const deleteSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Subject.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json("Subject not found");
        }
        res.status(200).json("Subject deleted successfully");
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
