import mongoose from 'mongoose';

const projectMemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['project_manager', 'member', 'viewer'],
      default: 'member',
    },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [projectMemberSchema],
    status: {
      type: String,
      enum: ['active', 'on_hold', 'completed', 'archived'],
      default: 'active',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    color: {
      type: String,
      default: '#6366f1',
      match: [/^#[0-9A-Fa-f]{6}$/, 'Please provide a valid hex color'],
    },
    startDate: Date,
    dueDate: Date,
    completedAt: Date,

    // AI-generated health score — updated via BullMQ job
    healthScore: {
      score: { type: Number, min: 0, max: 100, default: null },
      status: {
        type: String,
        enum: ['green', 'yellow', 'red', null],
        default: null,
      },
      summary: String,
      risks: [String],
      lastAnalyzedAt: Date,
    },

    tags: [{ type: String, trim: true }],
    isArchived: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
projectSchema.index({ workspace: 1, status: 1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ dueDate: 1 });

// ── Virtual: is overdue ────────────────────────────────────────────────────────
projectSchema.virtual('isOverdue').get(function () {
  return this.dueDate && this.dueDate < new Date() && this.status !== 'completed';
});

// ── Virtual: days remaining ────────────────────────────────────────────────────
projectSchema.virtual('daysRemaining').get(function () {
  if (!this.dueDate) return null;
  const diff = this.dueDate - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// ── Instance helpers ──────────────────────────────────────────────────────────
projectSchema.methods.isMember = function (userId) {
  const ownerId = this.owner?._id || this.owner;
  return (
    ownerId.toString() === userId.toString() ||
    this.members.some((m) => {
      const uId = m.user?._id || m.user;
      return uId.toString() === userId.toString();
    })
  );
};

const Project = mongoose.model('Project', projectSchema);
export default Project;
