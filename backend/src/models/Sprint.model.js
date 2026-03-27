import mongoose from 'mongoose';

const sprintSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Sprint name is required'],
      trim: true,
      maxlength: [120, 'Sprint name cannot exceed 120 characters'],
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    taskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

sprintSchema.index({ projectId: 1, startDate: 1 });

export default mongoose.model('Sprint', sprintSchema);
