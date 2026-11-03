// Create a super admin.
// Usage: node scripts/createAdmin.js <name> <email> <phone> <password>
// Connects with MONGODB_URI from .env. The password is bcrypt-hashed by the Admin model.
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/Admin.js';

dotenv.config();

const createAdmin = async () => {
  const [name, email, phone, password] = process.argv.slice(2);
  if (!name || !email || !phone || !password || password.length < 8) {
    console.error('Usage: node scripts/createAdmin.js <name> <email> <phone> <password (min 8 chars)>');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    if (await Admin.findOne({ $or: [{ email }, { phone }] })) {
      console.error('An admin with this email or phone already exists');
      process.exit(1);
    }

    const admin = await Admin.create({ name, email, phone, password, superAdmin: true });
    console.log(`Admin created: ${admin.email} (${admin._id})`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

createAdmin();
