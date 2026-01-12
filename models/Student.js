import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  status: { 
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  fatherName: {
    type: String,
    required: [true, 'Please add father\'s name']
  },
  contact: {
    type: String,
    required: [true, 'Please add a contact number'],
    match: [/^[0-9]{10}$/, 'Please add a valid phone number']
  },
  homeAddress: {
    type: String,
    // required: [true, 'Please add home address'],
    trim: true,
    maxlength: 200
  },
  isOrphan: {
    type: Boolean,
    default: false
  },
  guardianInfo: {
    name: String,
    contact: String
  },
  isNonSchoolGoing: {
    type: Boolean,
    default: false
  },
  schoolInfo: {
    name: String,
    class: String
  },
  schoolAddress: {
    type: String,
    trim: true,
    maxlength: 200
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
    required: [true, 'Please specify gender']
  },
  medium: {
    type: String,
    enum: ['English', 'Hindi', 'Urdu'],
    required: [true, 'Please specify medium']
  },
  aadharNumber: {
    type: String,
    required: [true, 'Please add Aadhar number'],
    match: [/^[0-9]{4}\s[0-9]{4}\s[0-9]{4}$/, 'Please add a valid Aadhar number'],
    unique: true
  },
  assignedCenter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    required: [true, 'Please assign a center']
  },
  assignedTutor:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tutor'
  },
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentSubject'
  }],
  attendance: [
  {
    month: "2026-01",
    days: [
      { date: "2026-01-10", status: "Present" }
    ],
    presentDays: 1,
    totalDays: 1
  }
],
  remarks: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Student = mongoose.model('Student', studentSchema);

export default Student;