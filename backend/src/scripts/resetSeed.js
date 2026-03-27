import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.model.js';
import Workspace from '../models/Workspace.model.js';
import Project from '../models/Project.model.js';
import Task from '../models/Task.model.js';

async function reset() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ email: 'demo@coordo.app' });
  if (!user) { console.log('No demo data found.'); process.exit(0); }

  const workspace = await Workspace.findOne({ owner: user._id });
  if (workspace) {
    const projects = await Project.find({ workspace: workspace._id });
    for (const p of projects) await Task.deleteMany({ project: p._id });
    await Project.deleteMany({ workspace: workspace._id });
    await workspace.deleteOne();
  }
  await user.deleteOne();
  console.log('✅ Demo data removed. Run npm run seed to recreate.');
  process.exit(0);
}
reset().catch(err => { console.error(err.message); process.exit(1); });
