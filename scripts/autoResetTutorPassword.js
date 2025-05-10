import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

import Tutor from '../models/Tutor.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/yourdbname';

async function autoResetTutorPassword() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const phone = '9347887085';
  const newPassword = 'tutor@123';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const result = await Tutor.updateOne(
    { phone },
    { $set: { password: hashedPassword } }
  );

  if (result.matchedCount === 0) {
    console.log('Tutor not found for phone:', phone);
  } else {
    console.log(`Password for tutor ${phone} has been reset to '${newPassword}'.`);
  }
  await mongoose.disconnect();
}

autoResetTutorPassword().catch(err => {
  console.error('Error resetting tutor password:', err);
  process.exit(1);
}); 