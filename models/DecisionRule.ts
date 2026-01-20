import mongoose from 'mongoose';

const conditionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  field: { type: String, required: true },
  operator: {
    type: String,
    required: true,
    enum: ['==', '!=', '>', '<', '>=', '<=', 'contains', 'startsWith', 'endsWith', 'in', 'notIn']
  },
  value: { type: mongoose.Schema.Types.Mixed, required: true }
}, { _id: false });

const actionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true, enum: ['assign', 'notify', 'approve', 'reject', 'custom'] },
  value: { type: String, required: true },
  targetField: { type: String },
  description: { type: String }
}, { _id: false });

const ruleItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  conditions: [conditionSchema],
  logicOperator: { type: String, enum: ['AND', 'OR'], default: 'AND' },
  actions: [actionSchema],
  priority: { type: Number, default: 0 }
}, { _id: false });

const decisionRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: { type: String, trim: true },
  rules: [ruleItemSchema],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true
  },
  createdBy: { type: String, required: true, index: true },
  associatedBpmnProcesses: [{ type: String }],
  version: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  readPreference: 'primaryPreferred',
  collection: 'decisionrules'
});

// Compound indexes for common queries
decisionRuleSchema.index({ createdBy: 1, status: 1 });
decisionRuleSchema.index({ createdAt: -1 });

const DecisionRule = mongoose.models.DecisionRule || mongoose.model('DecisionRule', decisionRuleSchema, 'decisionrules');

export default DecisionRule;

