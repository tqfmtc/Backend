import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AdminActivity from '../models/AdminActivity.js';

dotenv.config();

const testAdminActivity = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test creating an admin activity record
    const testActivity = new AdminActivity({
      adminId: new mongoose.Types.ObjectId(),
      adminName: 'Test Admin',
      adminEmail: 'test@admin.com',
      action: 'CREATE_ADMIN',
      targetType: 'Admin',
      targetId: new mongoose.Types.ObjectId(),
      targetName: 'New Test Admin',
      details: {
        test: 'This is a test activity'
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Test Script'
    });

    await testActivity.save();
    console.log('Test activity created successfully:', testActivity);

    // Test fetching activities
    const activities = await AdminActivity.find().limit(5).sort({ timestamp: -1 });
    console.log('Recent activities:', activities.length);

    // Clean up test data
    await AdminActivity.findByIdAndDelete(testActivity._id);
    console.log('Test activity cleaned up');

    console.log('Admin Activity system test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

testAdminActivity();