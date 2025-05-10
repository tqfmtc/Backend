import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

import Tutor from '../models/Tutor.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/yourdbname';

async function hashAllTutorPasswords() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const tutors = await Tutor.find();
  let updated = 0;

  for (const tutor of tutors) {
    // Only hash if not already a bcrypt hash
    if (!tutor.password.startsWith('$2') || tutor.password.length !== 60) {
      tutor.password = await bcrypt.hash(tutor.password, 10);
      await tutor.save();
      updated++;
      console.log(`Hashed password for tutor: ${tutor.phone}`);
    }
  }
  console.log(`Done. Updated ${updated} tutor(s).`);
  await mongoose.disconnect();
}

// This script will only hash plain text passwords, not already-hashed ones.
hashAllTutorPasswords().catch(err => {
  console.error('Error hashing tutor passwords:', err);
  process.exit(1);
}); 