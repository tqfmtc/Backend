import mongoose from 'mongoose';

const tutorApplicationSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  qualifications: { type: String, required: true },
  certificates: { type: String },
  memos: { type: String },
  resume: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const TutorApplication = mongoose.model('TutorApplication', tutorApplicationSchema);
export default TutorApplication; 