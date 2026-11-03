// Records when a user's password changes so auth can reject tokens issued before it.
// Covers both doc.save() and query updates (updateOne/findByIdAndUpdate), since
// controllers change passwords both ways.
// Stamped 1s in the past: JWT iat has second precision, and a token issued right
// after the change (e.g. the login that upgrades a plaintext password) must stay valid.
const stamp = () => new Date(Date.now() - 1000);

export default function passwordChangedAt(schema) {
  schema.add({ passwordChangedAt: { type: Date } });

  schema.pre('save', function (next) {
    if (!this.isNew && this.isModified('password')) {
      this.passwordChangedAt = stamp();
    }
    next();
  });

  schema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
    const update = this.getUpdate() || {};
    if (update.password !== undefined || update.$set?.password !== undefined) {
      this.set('passwordChangedAt', stamp());
    }
    next();
  });
}
