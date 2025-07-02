import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Tutor from '../models/Tutor.js';

// Load environment variables
dotenv.config();

// Use the MONGODB_URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mtc';

console.log('Connecting to MongoDB...');
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB Connected:', mongoose.connection.host);
    resetPassword();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function resetPassword() {
  try {
    const phone = '9347887085'.trim();
    const newPassword = '***REMOVED***'.trim();
    
    console.log(`Looking for tutor with phone: ${phone}`);
    const tutor = await Tutor.findOne({ phone });
    
    if (!tutor) {
      console.log('Tutor not found');
      process.exit(1);
    }
    
    console.log(`Tutor found: ${tutor.name}`);
    
    // Manually hash the password to ensure it's done correctly
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update with the hashed password directly
    tutor.password = hashedPassword;
    await tutor.save();
    
    console.log('Password reset successfully!');
    console.log('Phone:', phone);
    console.log('New password:', newPassword);
    console.log('Hash in DB:', hashedPassword);
    
    // Verify the password works with bcrypt.compare
    const isMatch = await bcrypt.compare(newPassword, hashedPassword);
    console.log('Verification test:', isMatch ? 'PASSED' : 'FAILED');
    
    process.exit(0);
  } catch (error) {
    console.error('Error resetting password:', error);
    process.exit(1);
  }
}