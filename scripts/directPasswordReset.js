// Direct script to reset a tutor's password
// Run this with: node directPasswordReset.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
console.log('Connecting to MongoDB...');

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB Connected');
    
    try {
      // Direct database operation to update password
      const result = await mongoose.connection.db.collection('tutors').updateOne(
        { phone: '9396904344' },
        { $set: { password: '***REMOVED***' } }
      );
      
      console.log('Update result:', result);
      
      if (result.matchedCount > 0) {
        console.log('Password updated successfully!');
        console.log('Phone: 9396904344');
        console.log('New password: ***REMOVED***');
      } else {
        console.log('No tutor found with that phone number');
      }
    } catch (error) {
      console.error('Error updating password:', error);
    } finally {
      mongoose.disconnect();
      console.log('MongoDB disconnected');
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
