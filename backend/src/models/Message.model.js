import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
  chatType: { type: String, enum: ['channel', 'direct'], required: true },
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', default: null },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
}, { timestamps: true });

messageSchema.index({ workspaceId: 1, chatType: 1, createdAt: 1 });
messageSchema.index({ channelId: 1, createdAt: 1 });
messageSchema.index({ workspaceId: 1, participants: 1, createdAt: 1 });

export default mongoose.model('Message', messageSchema);
