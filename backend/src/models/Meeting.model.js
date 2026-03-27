import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    topic: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 5000 },

    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },

    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],

    googleMeetUrl: { type: String, default: '' },
    googleMeetId: { type: String, default: '' },
    timezone: { type: String, default: 'UTC' },

    // Optional: store conference source details for debugging/auditing.
    providerMeta: {
      calendarId: { type: String, default: '' },
      eventId: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

meetingSchema.index({ workspaceId: 1, startTime: 1 });
meetingSchema.index({ participants: 1, startTime: -1 });

export default mongoose.model('Meeting', meetingSchema);

