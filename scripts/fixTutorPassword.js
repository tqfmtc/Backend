import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Tutor from '../models/Tutor.js';

// Load environment variables
dotenv.config();

// Use the MONGODB_URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

console.log('Connecting to MongoDB...');
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB Connected:', mongoose.connection.host);
    fixTutorPassword();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function fixTutorPassword() {
  try {
    const phone = '9396904344';
    const newPassword = '***REMOVED***';
    
    console.log(`Looking for tutor with phone: ${phone}`);
    const tutor = await Tutor.findOne({ phone });
    
    if (!tutor) {
      console.log('Tutor not found');
      process.exit(1);
    }
    
    console.log(`Tutor found: ${tutor.name}`);
    
    // Manually hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update the password directly in the database to bypass any hooks
    const result = await Tutor.updateOne(
      { _id: tutor._id },
      { $set: { password: hashedPassword } }
    );
    
    console.log('Update result:', result);
    console.log('Password updated successfully!');
    console.log('Phone:', phone);
    console.log('New password:', newPassword);
    
    // Verify the password works
    const updatedTutor = await Tutor.findOne({ phone }).select('+password');
    const isMatch = await bcrypt.compare(newPassword, updatedTutor.password);
    console.log('Verification test:', isMatch ? 'PASSED' : 'FAILED');
    
    process.exit(0);
  } catch (error) {
    console.error('Error fixing password:', error);
    process.exit(1);
  }
}
