import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'project_manager', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const inviteSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true },
    token: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'project_manager', 'member'],
      default: 'member',
    },
    expiresAt: { type: Date, required: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    description: {
      type: String,
      maxlength: [200, 'Description cannot exceed 200 characters'],
      default: '',
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    logo: String,
    logoPublicId: String,
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [memberSchema],
    pendingInvites: [inviteSchema],
    settings: {
      defaultProjectVisibility: {
        type: String,
        enum: ['public', 'private'],
        default: 'private',
      },
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ 'members.user': 1 });

// ── Virtual: member count ─────────────────────────────────────────────────────
workspaceSchema.virtual('memberCount').get(function () {
  return this.members?.length || 0;
});

// ── Instance helpers ──────────────────────────────────────────────────────────
workspaceSchema.methods.getMemberRole = function (userId) {
  const member = this.members.find((m) => {
    const id = m.user?._id || m.user;
    return id.toString() === userId.toString();
  });
  return member?.role || null;
};

workspaceSchema.methods.isMember = function (userId) {
  return this.members.some((m) => {
    const id = m.user?._id || m.user;
    return id.toString() === userId.toString();
  });
};

workspaceSchema.methods.isAdmin = function (userId) {
  const role = this.getMemberRole(userId);
  const ownerId = this.owner?._id || this.owner;
  return role === 'admin' || ownerId.toString() === userId.toString();
};

const Workspace = mongoose.model('Workspace', workspaceSchema);
export default Workspace;
