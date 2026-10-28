const mongoose = require('mongoose');

const tripSessionSchema = new mongoose.Schema(
  {
    busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true, index: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
    currentLocation: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 }
    },
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

tripSessionSchema.index({ busId: 1, status: 1 });

module.exports = mongoose.model('TripSession', tripSessionSchema);
