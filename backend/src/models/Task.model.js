import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: {
      type: String,
      required: true,
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
    isEdited: { type: Boolean, default: false },
    editedAt: Date,
  },
  { timestamps: true }
);

const subtaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    isCompleted: { type: Boolean, default: false },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedAt: Date,
  },
  { timestamps: true }
);

const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    publicId: String,
    mimeType: String,
    size: Number, // bytes
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
      default: '',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    status: {
      type: String,
      enum: ['todo', 'in_progress', 'in_review', 'done'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },

    // Kanban ordering within a column
    order: { type: Number, default: 0 },

    dueDate: Date,
    completedAt: Date,
    startDate: Date,

    estimatedHours: Number,
    actualHours: Number,

    // AI-generated fields
    aiEstimatedHours: Number,
    aiSubtaskSuggestions: [String],
    aiComplexityScore: { type: Number, min: 1, max: 10 },

    tags: [{ type: String, trim: true }],
    comments: [commentSchema],
    subtasks: [subtaskSchema],
    attachments: [attachmentSchema],

    // Linked tasks
    blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    blocks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
taskSchema.index({ project: 1, status: 1, order: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdBy: 1 });

// ── Virtuals ──────────────────────────────────────────────────────────────────
taskSchema.virtual('isOverdue').get(function () {
  return this.dueDate && this.dueDate < new Date() && this.status !== 'done';
});

taskSchema.virtual('subtaskProgress').get(function () {
  if (!this.subtasks?.length) return null;
  const done = this.subtasks.filter((s) => s.isCompleted).length;
  return { done, total: this.subtasks.length, percent: Math.round((done / this.subtasks.length) * 100) };
});

// ── Auto-set completedAt ───────────────────────────────────────────────────────
taskSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'done' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'done') {
      this.completedAt = undefined;
    }
  }
  next();
});

const Task = mongoose.model('Task', taskSchema);
export default Task;
