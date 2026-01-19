import mongoose from 'mongoose';

const kpiSchema = new mongoose.Schema({
  typeOfKPI: { type: String, required: true },
  kpi: { type: String, required: true },
  formula: { type: String, required: false },
  kpiDirection: { type: String, required: true, enum: ['up', 'down', 'neutral'] },
  targetValue: { type: String, required: true },
  frequency: { type: String, required: true },
  receiver: { type: String, required: true },
  source: { type: String, required: true },
  active: { type: Boolean, default: false },
  mode: { type: String, required: true },
  tag: { type: String, required: true },
  category: { type: String, required: true },
  parentId: { type: String, default: null },
  level: { type: Number, default: 0 },
  order: { type: Number, required: true },
  associatedBPMNProcesses: [{ type: String, default: [] }],
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for efficient querying
kpiSchema.index({ typeOfKPI: 1 });
kpiSchema.index({ category: 1 });
kpiSchema.index({ active: 1 });
kpiSchema.index({ parentId: 1 });
kpiSchema.index({ createdBy: 1 });
kpiSchema.index({ associatedBPMNProcesses: 1 });

// Update the updatedAt field before saving
kpiSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const KPI = mongoose.models.KPI || mongoose.model('KPI', kpiSchema);

export default KPI;
