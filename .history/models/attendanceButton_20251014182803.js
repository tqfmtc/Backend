import mongoose from "mongoose";

const attendanceButtonSchema = new mongoose.Schema({
  status:{status:Boolean,defualt: True},
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