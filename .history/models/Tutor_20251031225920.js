import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const tutorSchema = mongoose.Schema(
  {
    // Personal Information - from AddTutorForm
    name: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true,
      unique: true
    },
    phone: {
      type: String,
      required: true,
      unique: true
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    password: {
      type: String,
      required: function() { return this.isNew; },
      select: false
    },
    qualifications: {
      type: String,
      default: ''
    },
    
    // Educational Details - from AddTutorForm
    qualificationType: {
      type: String,
      enum: ['','graduation', 'intermediate', 'ssc', 'alim', 'hafiz', 'others'],
      default: ''
    },
    qualificationOther: {
      type: String,
      default: '',
      maxlength: 50
    },
    qualificationStatus: {
      type: String,
      enum: ['','pursuing', 'completed'],
      default: ''
    },
    yearOfCompletion: {
      type: String,
      default: ''
    },
    madarsahName: {
      type: String,
      default: '',
      maxlength: 50
    },
    collegeName: {
      type: String,
      default: '',
      maxlength: 50
    },
    specialization: {
      type: String,
      default: '',
      maxlength: 50
    },
    
    // Center & Subject Information - from AddTutorForm
    assignedCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Center',
      required: true
    },
    students: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    }],
    subjects: [{
      type: String,
      required: true
    }],
    
    // Session Information - from AddTutorForm
    sessionType: {
      type: String,
      enum: ['arabic', 'tuition'],
      required: true
    },
    sessionTiming: {
      type: String,
      enum: ['after_fajr', 'after_zohar', 'after_asar', 'after_maghrib', 'after_isha'],
      required: true
    },
    
    // Role and Status
    role: {
      type: String,
      default: 'tutor'
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    
    // Hadiya Information - from AddTutorForm
    assignedHadiyaAmount: {
      type: Number,
      required: false,
      default: 0
    },
    
    // Bank Details - from AddTutorForm
    bankName: {
      type: String,
      default: ''
    },
    bankBranch: {
      type: String,
      default: ''
    },
    accountNumber: {
      type: String,
      default: ''
    },
    ifscCode: {
      type: String,
      default: ''
    },
    
    // Identification details - from AddTutorForm
    aadharNumber: {
      type: String,
      default: ''
    },
    
    // Hadiya payment records
    hadiyaRecords: [{
      month: { type: Number, required: true },
      year: { type: Number, required: true },
      amountPaid: { type: Number, required: true },
      datePaid: { type: Date, default: Date.now },
      paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
      notes: { type: String, trim: true, default: '' }
    }],
    attendance: [{
      date: {
        type: Date,
        required: true
      },
      status: {
        type: String,
        enum: ['present', 'absent'],
        required: true
      },
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: {
          type: [Number],
          required: true
        }
      },
      center: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Center',
        required: true
      },
      centerName: {
        type: String,
        required: true
      }
    }]
  },
  {
    timestamps: true
  }
);

// Create indexes for geospatial queries
tutorSchema.index({ 'attendance.location': '2dsphere' });

// Hash password before saving
// We handle password hashing in the controller now
tutorSchema.pre('save', async function(next) {
  // Skip password validation if password hasn't been modified
  if (!this.isModified('password')) {
    return next();
  }
  
  // If this is a new document, ensure password exists
  if (this.isNew && !this.password) {
    next(new Error('Password is required'));
  }
  
  // Verify the password is already hashed (it should be hashed in the controller)
  if (!this.password.startsWith('$2')) {
    next(new Error('Password must be hashed before saving'));
  }
  
  next();
});

// Match password method
tutorSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Tutor = mongoose.model('Tutor', tutorSchema);

export default Tutor;