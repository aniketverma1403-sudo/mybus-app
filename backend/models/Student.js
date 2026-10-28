const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    admissionNumber: { type: String, trim: true, default: '' },
    className: { type: String, required: true, trim: true },
    section: { type: String, trim: true, default: '' },
    schoolId: { type: String, required: true, index: true },
    guardianIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
    busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', default: null },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
    pickupStop: { type: String, trim: true, default: '' },
    dropStop: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

studentSchema.index({ schoolId: 1, admissionNumber: 1 }, { unique: true, sparse: true });
module.exports = mongoose.model('Student', studentSchema);
