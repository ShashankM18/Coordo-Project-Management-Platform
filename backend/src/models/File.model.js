import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true }, // Cloudinary public_id
    mimeType: { type: String, required: true },
    size: { type: Number, required: true }, // bytes
    format: String,

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    // Optional: file attached to a specific task
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },

    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

fileSchema.index({ project: 1, isDeleted: 1 });
fileSchema.index({ task: 1 });

// Virtual: human-readable file size
fileSchema.virtual('sizeFormatted').get(function () {
  const bytes = this.size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
});

// Virtual: file type category
fileSchema.virtual('category').get(function () {
  const mime = this.mimeType || '';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.includes('spreadsheet') || mime.includes('excel')) return 'spreadsheet';
  if (mime.includes('document') || mime.includes('word')) return 'document';
  return 'other';
});

const File = mongoose.model('File', fileSchema);
export default File;
