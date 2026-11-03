// One-off repair: rebuild every Student.subjects array from the StudentSubject collection.
// Older updateStudent code could overwrite Student.subjects with raw Subject ids, which made
// populated subjects come back empty (and the next edit would then delete the records).
// Usage: node scripts/repairStudentSubjects.js            (dry run)
//        node scripts/repairStudentSubjects.js --apply    (write changes)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from '../models/Student.js';
import StudentSubject from '../models/StudentSubject.js';

dotenv.config();

const apply = process.argv.includes('--apply');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const students = await Student.find().select('_id name subjects').lean();
  let changed = 0;

  for (const student of students) {
    const records = await StudentSubject.find({ student: student._id }).select('_id').lean();
    const expected = records.map(r => r._id.toString()).sort();
    const actual = (student.subjects || []).map(id => id.toString()).sort();

    if (expected.join(',') !== actual.join(',')) {
      changed++;
      console.log(`${student.name} (${student._id}): ${actual.length} -> ${expected.length} subject refs`);
      if (apply) {
        await Student.updateOne({ _id: student._id }, { $set: { subjects: records.map(r => r._id) } });
      }
    }
  }

  console.log(`${changed} of ${students.length} students ${apply ? 'repaired' : 'need repair (dry run, pass --apply to write)'}`);
  await mongoose.disconnect();
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
