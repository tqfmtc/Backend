import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AdminActivity from '../models/AdminActivity.js';

dotenv.config();

const testActivityLogging = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the latest 10 activities
    const activities = await AdminActivity.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    console.log(`\nFound ${activities.length} recent activities:`);
    console.log('='.repeat(80));

    activities.forEach((activity, index) => {
      console.log(`${index + 1}. ${activity.action} on ${activity.targetType}`);
      console.log(`   Admin: ${activity.adminName} (${activity.adminEmail})`);
      console.log(`   Target: ${activity.targetName} (ID: ${activity.targetId})`);
      console.log(`   Time: ${activity.timestamp}`);
      console.log(`   IP: ${activity.ipAddress || 'N/A'}`);
      console.log('-'.repeat(40));
    });

    if (activities.length === 0) {
      console.log('No activities found. Try creating, updating, or deleting an admin/supervisor/center/tutor.');
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

testActivityLogging();