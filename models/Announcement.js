import mongoose from 'mongoose';

const AnnouncementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  body: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  priority: {
    // Higher number indicates higher priority. Default 0 (normal)
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

export default mongoose.model('Announcement', AnnouncementSchema);
