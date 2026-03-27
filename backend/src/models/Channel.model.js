import mongoose from 'mongoose';

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Channel name is required'],
    trim: true,
    minlength: [2, 'Channel name must be at least 2 characters'],
    maxlength: [50, 'Channel name cannot exceed 50 characters'],
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

channelSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export default mongoose.model('Channel', channelSchema);
