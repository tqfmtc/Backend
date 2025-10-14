import mongoose from "mongoose";

const attendanceButtonSchema = new mongoose.Schema({
  status: { type: Boolean, default: true },,
  lastChangedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  lastChangedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const AttendanceButton = mongoose.model('AttendanceButton', attendanceButtonSchema);

export default AttendanceButton;