const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  schoolId: { type: String, required: true, index: true },
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true, index: true },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'TripSession', required: true, index: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['delay', 'sos', 'breakdown'], required: true },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  status: { type: String, enum: ['open', 'acknowledged', 'resolved'], default: 'open', index: true },
  resolvedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Incident', incidentSchema);
