import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  tutor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tutor',
    required: true
  },
  center: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent'],
    required: true
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// One attendance record per tutor per center per day (a tutor can teach at several centers)
attendanceSchema.index({ tutor: 1, center: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance; 