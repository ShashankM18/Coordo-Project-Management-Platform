import nodemailer from 'nodemailer';

let testAccount = null;

const createTransporter = async () => {
  // Use a free temporary inbox (Ethereal) if you don't have .env SMTP configured
  if (!process.env.EMAIL_HOST) {
    if (!testAccount) {
      testAccount = await nodemailer.createTestAccount();
    }
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  // If using Gmail, use the native service parameter instead of raw host/port
  // This heavily reduces the chance of Google blocking the connection from a cloud server
  if (process.env.EMAIL_HOST && process.env.EMAIL_HOST.includes('gmail')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Inter, Arial, sans-serif; color: #1f2937; margin: 0; padding: 0; background: #f9fafb; }
    .container { max-width: 560px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
    .header { background: #6366f1; padding: 28px 32px; }
    .header h1 { color: white; margin: 0; font-size: 20px; font-weight: 600; }
    .body { padding: 32px; }
    .btn { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px; margin: 16px 0; }
    .footer { padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
    p { line-height: 1.6; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Coordo</h1>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>This email was sent by Coordo. If you didn't request this, you can safely ignore it.</p>
    </div>
  </div>
</body>
</html>`;

export const sendEmail = async ({ to, subject, html }) => {
  const transporter = await createTransporter();
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"Coordo" <noreply@coordo.app>',
    to,
    subject,
    html,
  });
  
  // If we are using the free Ethereal test inbox, print the URL to view the email!
  if (!process.env.EMAIL_HOST) {
    console.log(`\n================= 📧 MOCK EMAIL SENT =================`);
    console.log(`View the actual email visually in your browser here:`);
    console.log(nodemailer.getTestMessageUrl(info));
    console.log(`========================================================\n`);
  }
};

export const sendWelcomeEmail = async (user) => {
  await sendEmail({
    to: user.email,
    subject: 'Welcome to Coordo!',
    html: baseTemplate(`
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Welcome to Coordo — your AI-enhanced project management workspace.</p>
      <p>Get started by creating your first workspace and inviting your team.</p>
      <a href="${process.env.CLIENT_URL}/dashboard" class="btn">Go to Dashboard</a>
    `),
  });
};

export const sendPasswordResetEmail = async (user, resetUrl) => {
  await sendEmail({
    to: user.email,
    subject: 'Reset your Coordo password',
    html: baseTemplate(`
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>You requested a password reset. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
      <a href="${resetUrl}" class="btn">Reset Password</a>
      <p style="font-size:12px;color:#9ca3af;margin-top:16px">If you didn't request this, ignore this email — your password won't change.</p>
    `),
  });
};

export const sendWorkspaceInviteEmail = async ({ to, inviterName, workspaceName, inviteUrl }) => {
  await sendEmail({
    to,
    subject: `${inviterName} invited you to ${workspaceName} on Coordo`,
    html: baseTemplate(`
      <p>Hi there,</p>
      <p><strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace on Coordo.</p>
      <p>Click the button below to accept the invite. This link expires in 48 hours.</p>
      <a href="${inviteUrl}" class="btn">Accept Invitation</a>
    `),
  });
};

export const sendTaskAssignedEmail = async ({ to, assigneeName, taskTitle, projectName, taskUrl }) => {
  await sendEmail({
    to,
    subject: `You've been assigned: "${taskTitle}"`,
    html: baseTemplate(`
      <p>Hi <strong>${assigneeName}</strong>,</p>
      <p>You've been assigned a new task in <strong>${projectName}</strong>:</p>
      <p style="font-size:16px;font-weight:600;color:#6366f1">${taskTitle}</p>
      <a href="${taskUrl}" class="btn">View Task</a>
    `),
  });
};
