import mongoose from 'mongoose';

const wikiPageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    content: {
      type: String,
      default: '',
      maxlength: [50000, 'Content cannot exceed 50000 characters'],
    },
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
    linkedTaskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

wikiPageSchema.index({ projectId: 1, updatedAt: -1 });

export default mongoose.model('WikiPage', wikiPageSchema);
