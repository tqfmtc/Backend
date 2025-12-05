 import StudentSubject from '../models/StudentSubject.js';
import Student from '../models/Student.js';
import Subject from '../models/Subject.js';
import mongoose from 'mongoose';

export const createStudentSubjectRecord = async (req, res) => {
  try {
    const { studentId, subjectId } = req.body;
    if (!studentId || !subjectId) {
      return res.status(400).json("studentId and subjectId are required");
    }
    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const subjectObjectId = new mongoose.Types.ObjectId(subjectId);

    const student = await Student.findById(studentObjectId);
    if (!student) {
      return res.status(404).json("Student not found");
    }
    const subject = await Subject.findById(subjectObjectId);
    if (!subject) {
      return res.status(404).json("Subject not found");
    }
    const existingRecord = await StudentSubject.findOne({ student: studentObjectId, subject: subjectObjectId });
    if (existingRecord) {
      return res.status(400).json("Record for this student and subject already exists");
    }
    const newRecord = await StudentSubject.create({ student: studentObjectId, subject: subjectObjectId });
    res.status(201).json(newRecord);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addMarksToStudentSubject = async (req, res) => {
  try {
   console.log("entering admarks")
    const { subjectId } = req.params; // new param: the studentsubject document _id
    const { marksPercentage, examDate } = req.body;
    console.log("subjectId:",subjectId)
    if (!subjectId || marksPercentage === undefined) {
      return res.status(400).json("subjectId and marksPercentage are required");
    }

    const ssObjectId = new mongoose.Types.ObjectId(subjectId);
    console.log(ssObjectId)
    // Find by the document's own _id
    const record = await StudentSubject.findById(ssObjectId);

    if (!record) {
      return res.status(404).json("StudentSubject record not found");
    }

    // Push new marks and save
    record.marksPercentage.push({ percentage: marksPercentage, examDate: examDate });
    await record.save();

    res.status(200).json("Marks percentage added successfully");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentSubjectRecord = async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    if (!studentId || !subjectId) {
      return res.status(400).json("studentId and subjectId are required");
    }
    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const subjectObjectId = new mongoose.Types.ObjectId(subjectId);

    const record = await StudentSubject.findOne({
      student: studentObjectId,
      subject: subjectObjectId,
    });
    if (!record) {
      return res.status(404).json("StudentSubject record not found");
    }
    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllStudentSubjectRecords = async (req, res) => {
  try {
    const records = await StudentSubject.find();
    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateStudentSubjectRecord = async (req, res) => {
  try {
    const { studentId, subjectId } = req.params; // keep semantics

    if (!studentId || !subjectId) {
      return res.status(400).json("studentId and subjectId are required");
    }

    // Use subjectId as the studentsubject document _id
    const ssObjectId = new mongoose.Types.ObjectId(subjectId);

    const record = await StudentSubject.findById(ssObjectId);
    if (!record) {
      return res.status(404).json("StudentSubject record not found");
    }

    const { marksPercentage } = req.body;
    if (marksPercentage !== undefined) {
      record.marksPercentage.push({ percentage: marksPercentage });
    }
    await record.save();

    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMarksFromStudentSubject = async (req, res) => {
  try {
    const { subjectId, markId } = req.params;
    if (!subjectId || !markId) {
      return res.status(400).json("subjectId and markId are required");
    }
    const subjectObjectId = new mongoose.Types.ObjectId(subjectId);
    const markObjectId = new mongoose.Types.ObjectId(markId);
    const record = await StudentSubject.findById(subjectObjectId);
    if (!record) {
      return res.status(404).json("StudentSubject record not found");
    }
    // Remove the mark entry by its _id
    record.marksPercentage = record.marksPercentage.filter(mark => mark._id.toString() !== markObjectId.toString());
    await record.save();
    res.status(200).json("Mark entry deleted successfully");
  }
    catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// export const deleteStudentSubjectRecord = async (req, res) => {
//   try {
//     const { studentId, subjectId } = req.params; // keep semantics

//     if (!studentId || !subjectId) {
//       return res.status(400).json("studentId and subjectId are required");
//     }

//     // Use subjectId as the studentsubject document _id
//     const ssObjectId = new mongoose.Types.ObjectId(subjectId);

//     const record = await StudentSubject.findByIdAndDelete(ssObjectId);
//     if (!record) {
//       return res.status(404).json("StudentSubject record not found");
//     }
//     res.status(200).json("StudentSubject record deleted successfully");
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

export const getSubjectsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json("studentId is required");
    }
    const studentObjectId = new mongoose.Types.ObjectId(studentId);

    const records = await StudentSubject.find({ student: studentObjectId })
      .populate('subject', 'subjectName')
      .populate('student', 'name');
    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    if (!subjectId) {
      return res.status(400).json("subjectId is required");
    }
    const subjectObjectId = new mongoose.Types.ObjectId(subjectId);

    const records = await StudentSubject.find({ subject: subjectObjectId }).populate('student');
    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
