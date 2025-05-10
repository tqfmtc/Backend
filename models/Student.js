import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
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
    match: [/^[0-9]{4}\s[0-9]{4}\s[0-9]{4}$/, 'Please add a valid Aadhar number']
  },
  assignedCenter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    required: [true, 'Please assign a center']
  },
  attendance: [{
    month: {
      type: String,
      required: true
    },
    presentDays: {
      type: Number,
      required: true
    },
    totalDays: {
      type: Number,
      required: true
    }
  }],
  remarks: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Student = mongoose.model('Student', studentSchema);

export default Student;