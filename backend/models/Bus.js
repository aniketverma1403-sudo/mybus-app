const mongoose = require('mongoose');

const busSchema = new mongoose.Schema(
  {
    busNumber: { type: String, required: true, unique: true, trim: true },
    schoolId: { type: String, required: true, trim: true, index: true },
    capacity: { type: Number, required: true, min: 1 },
    licensePlate: { type: String, trim: true, uppercase: true, default: '' },
    insuranceExpiry: { type: Date, default: null },
    fitnessExpiry: { type: Date, default: null },
    studentCount: { type: Number, default: 0, min: 0 },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
    status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'inactive' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bus', busSchema);
