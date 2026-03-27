/**
 * Demo seed script
 * Usage: npm run seed
 * Creates a demo user + workspace + 3 projects + 19 tasks for prototype presentation
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.model.js';
import Workspace from '../models/Workspace.model.js';
import Project from '../models/Project.model.js';
import Task from '../models/Task.model.js';

const DEMO = {
  user: { name: 'Demo User', email: 'demo@coordo.app', password: 'Demo1234!' },
  workspace: { name: 'Acme Corp', description: 'Main product workspace', slug: 'acme-corp' },
};

const PROJECTS = [
  {
    name: 'Website Redesign', color: '#6366f1', priority: 'high', status: 'active',
    description: 'Complete overhaul of marketing website with new brand identity',
    daysUntilDue: 14,
  },
  {
    name: 'Mobile App v2', color: '#f59e0b', priority: 'critical', status: 'active',
    description: 'Native iOS + Android app with offline-first architecture',
    daysUntilDue: 30,
  },
  {
    name: 'API Platform', color: '#10b981', priority: 'medium', status: 'on_hold',
    description: 'RESTful API platform for third-party developer integrations',
    daysUntilDue: 60,
  },
];

const TASK_SETS = [
  [
    { title: 'Design system tokens in Figma', status: 'done', priority: 'high', description: 'Define color, spacing, and typography tokens used across all components' },
    { title: 'Homepage hero section', status: 'done', priority: 'high', description: 'Build responsive hero with animated CTA and gradient background', tags: ['frontend', 'design'] },
    { title: 'Navigation component', status: 'in_progress', priority: 'medium', description: 'Sticky top nav with mobile hamburger, smooth scroll links', tags: ['frontend'] },
    { title: 'Product features page', status: 'in_progress', priority: 'high', description: 'Showcase all product features with SVG illustrations and animations', tags: ['frontend', 'design'] },
    { title: 'SEO meta tags + structured data', status: 'in_review', priority: 'medium', description: 'Add OG tags, Twitter cards, and JSON-LD structured data to all pages' },
    { title: 'Pricing page with toggle', status: 'todo', priority: 'medium', description: 'Three-tier pricing with monthly/annual billing toggle', tags: ['frontend'] },
    { title: 'Blog section + CMS integration', status: 'todo', priority: 'low', description: 'Markdown-based blog with category filtering and search', tags: ['fullstack'] },
    { title: 'Lighthouse performance audit', status: 'todo', priority: 'high', description: 'All pages must score 90+ on Lighthouse performance metrics' },
  ],
  [
    { title: 'Biometric authentication flow', status: 'done', priority: 'critical', description: 'FaceID/TouchID + PIN fallback + email OTP login flows', tags: ['security', 'mobile'] },
    { title: 'Onboarding screens (5 steps)', status: 'done', priority: 'high', description: '5-step animated onboarding with skip option and progress dots' },
    { title: 'Dashboard main screen', status: 'in_progress', priority: 'high', description: 'Home screen with stats, recent activity, and quick action buttons', tags: ['mobile'] },
    { title: 'FCM push notifications', status: 'in_progress', priority: 'high', description: 'Firebase Cloud Messaging integration for task reminders', tags: ['backend', 'mobile'] },
    { title: 'Offline mode with sync queue', status: 'todo', priority: 'critical', description: 'Local SQLite cache + background sync when reconnected', tags: ['mobile'] },
    { title: 'Dark mode support', status: 'in_review', priority: 'medium', description: 'Dynamic theme switching respecting system preference', tags: ['design'] },
    { title: 'App Store screenshots + metadata', status: 'todo', priority: 'low', description: 'Promotional screenshots, preview video, and store description copy' },
  ],
  [
    { title: 'OpenAPI 3.0 specification', status: 'done', priority: 'high', description: 'Complete API spec with all endpoints, schemas, and error codes documented' },
    { title: 'Redis-backed rate limiting', status: 'in_progress', priority: 'high', description: 'Per-API-key rate limiter with sliding window and 429 responses', tags: ['backend'] },
    { title: 'Outbound webhook system', status: 'todo', priority: 'medium', description: 'Event-driven webhooks with HMAC signing and exponential retry logic', tags: ['backend'] },
    { title: 'SDK generation (Node + Python)', status: 'todo', priority: 'low', description: 'Auto-generate typed SDKs from OpenAPI spec using openapi-generator' },
  ],
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Check if demo data already exists
  const existing = await User.findOne({ email: DEMO.user.email });
  if (existing) {
    console.log('\n⚠️  Demo data already exists.');
    console.log('   To reseed, first run: npm run seed:reset');
    console.log(`\n   Login: ${DEMO.user.email} / ${DEMO.user.password}`);
    process.exit(0);
  }

  // Create demo user
  const user = await User.create(DEMO.user);
  console.log(`✅ Created user: ${user.email}`);

  // Create workspace
  const workspace = await Workspace.create({
    ...DEMO.workspace,
    owner: user._id,
    members: [{ user: user._id, role: 'admin' }],
  });
  console.log(`✅ Created workspace: ${workspace.name}`);

  // Create projects + tasks
  for (let i = 0; i < PROJECTS.length; i++) {
    const { daysUntilDue, ...projData } = PROJECTS[i];
    const dueDate = new Date(Date.now() + daysUntilDue * 24 * 60 * 60 * 1000);

    const project = await Project.create({
      ...projData,
      workspace: workspace._id,
      owner: user._id,
      dueDate,
      members: [{ user: user._id, role: 'project_manager' }],
    });

    const taskDefs = TASK_SETS[i];
    const tasks = taskDefs.map((t, idx) => ({
      ...t,
      project: project._id,
      workspace: workspace._id,
      createdBy: user._id,
      assignees: [user._id],
      order: idx,
      dueDate: new Date(Date.now() + (idx + 1) * 2 * 24 * 60 * 60 * 1000),
      estimatedHours: Math.floor(Math.random() * 12) + 2,
    }));

    await Task.insertMany(tasks);
    console.log(`✅ Created project "${project.name}" (${tasks.length} tasks)`);
  }

  console.log('\n🎉 Seed complete!\n');
  console.log('══════════════════════════════════════');
  console.log(' Demo login credentials:');
  console.log(` Email:    ${DEMO.user.email}`);
  console.log(` Password: ${DEMO.user.password}`);
  console.log('══════════════════════════════════════\n');
  process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });
