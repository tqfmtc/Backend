// One-off cleanup: remove passwords/tokens that older code stored inside AdminActivity.details.
// Usage: node scripts/scrubActivityPasswords.js            (dry run)
//        node scripts/scrubActivityPasswords.js --apply    (write changes)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AdminActivity from '../models/AdminActivity.js';
import { redactSensitive } from '../middleware/activityLogger.js';

dotenv.config();

const apply = process.argv.includes('--apply');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const activities = await AdminActivity.find({ details: { $exists: true } }).select('_id details').lean();
  let changed = 0;

  for (const activity of activities) {
    const cleaned = redactSensitive(activity.details);
    if (JSON.stringify(cleaned) !== JSON.stringify(activity.details)) {
      changed++;
      if (apply) {
        await AdminActivity.updateOne({ _id: activity._id }, { $set: { details: cleaned } });
      }
    }
  }

  console.log(`${changed} of ${activities.length} activity entries ${apply ? 'scrubbed' : 'contain secrets (dry run, pass --apply to write)'}`);
  await mongoose.disconnect();
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
