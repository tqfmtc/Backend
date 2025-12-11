import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    unique: true,
    required: [true, 'Please add a phone number'],
    match: [/^[0-9]{10}$/, 'Please add a valid phone number'],
    unique: true
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    default: 'admin'
  },
  // NEW
  superAdmin: {
    type: Boolean,
    default: false
  },

  // NEW - each screen has read & write
  permissions: {
    dashboard: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false }
    },
    tutors: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false }
    },
    hadiyaCenters: {
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
adminSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;