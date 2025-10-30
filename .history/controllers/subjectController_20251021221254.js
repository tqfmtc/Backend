import Subject from '../models/Subject.js';
import Student from '../models/Student.js';
import Tutor from '../models/Tutor.js';

// Add new subject
export const addSubject = async (req, res) => {
    try {
        const { subject } = req.body;
        if (!subject) {
            return res.status(400).json("Subject field is required");
        }
        const newSubject = await Subject.create({ subject });
        res.status(201).json(newSubject);
    } catch (error) {
        console.log()
        res.status(500).json({ message: error.message });
    }
};

// Add students to a subject
export const addStudentsToSubject = async (req, res) => {
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

        res.status(200).json("Students added to subject successfully");
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
        const subjects = await Subject.find().populate('students').populate('tutors');
        res.status(200).json(subjects);
    } catch (error) {
        res.status(500).json({ message: error.message });
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

// Update subject
export const updateSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { subject } = req.body;

        const updatedSubject = await Subject.findByIdAndUpdate(
            id,
            { subject },
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
