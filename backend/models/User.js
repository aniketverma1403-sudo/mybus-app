const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['admin', 'driver', 'parent', 'student'], required: true },
    phone: { type: String, trim: true, default: '' },
    licenseNumber: { type: String, trim: true, uppercase: true, default: '' },
    assignedBusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', default: null },
    className: { type: String, trim: true, default: '' },
    section: { type: String, trim: true, default: '' },
    guardianUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    schoolId: { type: String, default: null }
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

module.exports = mongoose.model('User', userSchema);
