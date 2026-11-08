// One-off migration to multi-center tutors:
//  1. Copy each tutor's assignedCenter/sessionType/sessionTiming into assignments[].
//     The old fields are left in place (the schema no longer reads them), so the old
//     code keeps working if this runs before the new code is deployed.
//  2. Replace the Attendance unique index (tutor, date) with (tutor, center, date),
//     so a tutor can be marked at two centers on the same day.
// Safe to run more than once: tutors that already have assignments are skipped.
// Usage: node scripts/migrateTutorAssignments.js            (dry run)
//        node scripts/migrateTutorAssignments.js --apply    (write changes)
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const apply = process.argv.includes('--apply');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const tutorsCol = db.collection('tutors');
  const attendanceCol = db.collection('attendances');

  const tutors = await tutorsCol
    .find({}, { projection: { name: 1, assignedCenter: 1, sessionType: 1, sessionTiming: 1, assignments: 1 } })
    .toArray();

  let migrated = 0;
  const noCenter = [];
  const missingSession = [];

  for (const t of tutors) {
    if (Array.isArray(t.assignments) && t.assignments.length > 0) continue;
    if (!t.assignedCenter) {
      noCenter.push(t);
      continue;
    }
    if (!t.sessionType || !t.sessionTiming) missingSession.push(t);

    migrated++;
    if (apply) {
      await tutorsCol.updateOne(
        { _id: t._id },
        { $set: { assignments: [{ center: t.assignedCenter, sessionType: t.sessionType, sessionTiming: t.sessionTiming }] } }
      );
    }
  }

  console.log(`${migrated} of ${tutors.length} tutors ${apply ? 'migrated' : 'to migrate'}`);
  if (noCenter.length) {
    console.log(`${noCenter.length} tutors have no center (left with no assignments):`);
    noCenter.forEach(t => console.log(`  ${t.name} (${t._id})`));
  }
  if (missingSession.length) {
    console.log(`${missingSession.length} tutors are missing session type/timing (fix these in the admin panel):`);
    missingSession.forEach(t => console.log(`  ${t.name} (${t._id}): ${t.sessionType || '-'} / ${t.sessionTiming || '-'}`));
  }

  const indexes = await attendanceCol.indexes();
  const hasNew = indexes.some(i => i.name === 'tutor_1_center_1_date_1');
  const hasOld = indexes.some(i => i.name === 'tutor_1_date_1');
  console.log(`Attendance index (tutor, center, date): ${hasNew ? 'present' : apply ? 'creating' : 'missing'}`);
  console.log(`Attendance index (tutor, date): ${hasOld ? (apply ? 'dropping' : 'present, will be dropped') : 'already gone'}`);
  if (apply) {
    // Create the new index before dropping the old one, so duplicates stay blocked throughout
    if (!hasNew) await attendanceCol.createIndex({ tutor: 1, center: 1, date: 1 }, { unique: true });
    if (hasOld) await attendanceCol.dropIndex('tutor_1_date_1');
  }

  if (!apply) console.log('Dry run, pass --apply to write');
  await mongoose.disconnect();
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
