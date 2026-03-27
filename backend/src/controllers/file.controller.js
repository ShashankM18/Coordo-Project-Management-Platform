import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import File from '../models/File.model.js';
import Project from '../models/Project.model.js';
import Task from '../models/Task.model.js';
import { logActivity } from '../utils/activityLog.utils.js';

// Multer — store in memory for direct Cloudinary stream upload
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (req, file, cb) => {
    const blocked = ['application/x-msdownload', 'application/x-sh'];
    if (blocked.includes(file.mimetype)) {
      return cb(new Error('File type not allowed'), false);
    }
    cb(null, true);
  },
});

// Stream buffer to Cloudinary
const uploadBufferToCloudinary = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    Readable.from(buffer).pipe(stream);
  });

// GET /api/files?project=xxx
export const getProjectFiles = async (req, res, next) => {
  try {
    const { project } = req.query;
    const proj = await Project.findById(project).populate('workspace');
    
    if (!proj) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const userIdStr = req.user._id.toString();
    const isProjectMember = proj.isMember(req.user._id);
    const isWorkspaceMember = proj.workspace && 
      (proj.workspace.isMember(req.user._id) || proj.workspace.owner.toString() === userIdStr);

    if (!isProjectMember && !isWorkspaceMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const files = await File.find({ project, isDeleted: false })
      .populate('uploadedBy', 'name avatar')
      .sort('-createdAt');

    res.json({ success: true, files });
  } catch (err) { next(err); }
};

// POST /api/files?project=xxx  (multipart/form-data, field: file)
export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { project, taskId } = req.query;
    const proj = await Project.findById(project).populate('workspace');
    
    if (!proj) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const userIdStr = req.user._id.toString();
    const isProjectMember = proj.isMember(req.user._id);
    const isWorkspaceMember = proj.workspace && 
      (proj.workspace.isMember(req.user._id) || proj.workspace.owner.toString() === userIdStr);

    if (!isProjectMember && !isWorkspaceMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, {
      folder: `coordo/${project}`,
      resource_type: 'auto',
      public_id: `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`,
    });

    const file = await File.create({
      filename: result.public_id.split('/').pop(),
      originalName: req.file.originalname,
      url: result.secure_url,
      publicId: result.public_id,
      mimeType: req.file.mimetype,
      size: req.file.size,
      format: result.format,
      uploadedBy: req.user._id,
      project,
      workspace: proj.workspace,
      task: taskId || null,
    });

    // If attached to a task, add attachment reference
    if (taskId) {
      await Task.findByIdAndUpdate(taskId, {
        $push: {
          attachments: {
            filename: req.file.originalname,
            url: result.secure_url,
            publicId: result.public_id,
            mimeType: req.file.mimetype,
            size: req.file.size,
            uploadedBy: req.user._id,
          },
        },
      });
    }

    const populated = await file.populate('uploadedBy', 'name avatar');

    logActivity({
      actor: req.user._id, action: 'file_uploaded',
      project, workspace: proj.workspace,
      description: `Uploaded "${req.file.originalname}"`,
    });

    res.status(201).json({ success: true, file: populated });
  } catch (err) { next(err); }
};

// DELETE /api/files/:id
export const deleteFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });
    if (file.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the uploader can delete this file' });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(file.publicId, { resource_type: 'raw' }).catch(() => {});

    file.isDeleted = true;
    file.deletedAt = new Date();
    file.deletedBy = req.user._id;
    await file.save();

    res.json({ success: true, message: 'File deleted' });
  } catch (err) { next(err); }
};
