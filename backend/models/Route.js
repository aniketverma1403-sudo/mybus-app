const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema(
  {
    stopName: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    orderIndex: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const routeSchema = new mongoose.Schema(
  {
    routeName: { type: String, required: true, trim: true },
    schoolId: { type: String, required: true },
    stops: { type: [stopSchema], default: [] }
  },
  { timestamps: true }
);

routeSchema.index({ routeName: 1, schoolId: 1 }, { unique: true });

module.exports = mongoose.model('Route', routeSchema);
