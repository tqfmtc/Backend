import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const supervisorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    match: [/^[0-9]{10}$/, 'Please add a valid phone number']
  },
  password: {
    type: String,
    default: '121314',
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    default: 'supervisor'
  },
  permissions: {
    dashboard: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false }
    },
    tutors: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false }
    },
    hadiya: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false }
    },
    centers: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false }
    },
    students: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false }
    },
    tutorAttendance: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false }
    },
    guestTutors: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false }
    },
    announcements: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false }
    },
    supervisors: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false }
    },
    subjects: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false }
    },
    admins: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false }
    }
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
  },
  assignedCenters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}
);

// Encrypt password before saving
supervisorSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match password method
supervisorSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Supervisor = mongoose.model('Supervisor', supervisorSchema);

export default Supervisor;