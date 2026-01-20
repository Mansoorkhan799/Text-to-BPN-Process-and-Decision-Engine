import mongoose from 'mongoose';

const decisionExportFileSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  dataBase64: { type: String, required: true },
  createdBy: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true,
  collection: 'decisionexportfiles'
});

decisionExportFileSchema.index({ createdBy: 1, createdAt: -1 });

const DecisionExportFile = mongoose.models.DecisionExportFile || mongoose.model('DecisionExportFile', decisionExportFileSchema);

export default DecisionExportFile;


