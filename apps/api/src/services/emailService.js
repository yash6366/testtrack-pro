import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email, verificationToken) {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;

  try {
    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: email,
      subject: 'Verify your email address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to TestTrack Pro!</h2>
          <p>Please verify your email address to complete your signup.</p>
          <p>
            <a href="${verificationUrl}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email
            </a>
          </p>
          <p>Or copy this link: ${verificationUrl}</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This verification link expires in 24 hours.
          </p>
        </div>
      `,
    });

    return response;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

export function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function getVerificationTokenExpiry() {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24); // 24 hours from now
  return expiry;
}

// ============================================
// PASSWORD RESET & ACCOUNT SECURITY EMAILS
// ============================================

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email, name, resetToken) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

  try {
    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: email,
      subject: 'Reset Your Password - TestTrack Pro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1f2937;">Password Reset Request</h2>
          <p>Hello ${name},</p>
          <p>We received a request to reset your password for your TestTrack Pro account.</p>
          <p>Click the button below to reset your password:</p>
          <p style="margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Reset Password</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">${resetUrl}</p>
          <p style="color: #ef4444; font-weight: 600; margin-top: 20px;">⚠️ This link will expire in 1 hour.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you didn't request this password reset, please ignore this email or contact support if you have concerns.
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            For security reasons, never share this link with anyone.
          </p>
        </div>
      `,
    });

    return response;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

/**
 * Send account locked notification email
 */
export async function sendAccountLockedEmail(email, name, lockoutDurationMinutes) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/forgot-password`;

  try {
    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: email,
      subject: '🔒 Account Locked - TestTrack Pro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626;">🔒 Account Locked</h2>
          <p>Hello ${name},</p>
          <p>Your TestTrack Pro account has been temporarily locked due to multiple failed login attempts.</p>
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b;"><strong>Security Notice:</strong></p>
            <p style="margin: 10px 0 0 0; color: #991b1b;">Your account will be automatically unlocked in ${lockoutDurationMinutes} minutes.</p>
          </div>
          <p><strong>What you can do:</strong></p>
          <ul style="color: #374151;">
            <li>Wait ${lockoutDurationMinutes} minutes for automatic unlock</li>
            <li>Reset your password immediately using the button below</li>
            <li>Contact your administrator if you didn't attempt to login</li>
          </ul>
          <p style="margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Reset Password Now</a>
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you suspect unauthorized access to your account, please contact your administrator immediately.
          </p>
        </div>
      `,
    });

    return response;
  } catch (error) {
    console.error('Failed to send account locked email:', error);
    throw new Error('Failed to send account locked email');
  }
}

/**
 * Send password changed confirmation email
 */
export async function sendPasswordChangedEmail(email, name) {
  const supportUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/support`;

  try {
    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: email,
      subject: '✅ Password Changed Successfully - TestTrack Pro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #059669;">✅ Password Changed Successfully</h2>
          <p>Hello ${name},</p>
          <p>This email confirms that your password for TestTrack Pro was successfully changed.</p>
          <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #065f46;"><strong>Change Details:</strong></p>
            <p style="margin: 10px 0 0 0; color: #065f46;">Date: ${new Date().toLocaleString()}</p>
          </div>
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;"><strong>⚠️ Didn't change your password?</strong></p>
            <p style="margin: 10px 0 0 0; color: #92400e;">If you did not make this change, your account may be compromised. Please contact your administrator immediately.</p>
          </div>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            You can now use your new password to login to TestTrack Pro.
          </p>
        </div>
      `,
    });

    return response;
  } catch (error) {
    console.error('Failed to send password changed email:', error);
    throw new Error('Failed to send password changed email');
  }
}

// ============================================
// NOTIFICATION EMAILS
// ============================================

/**
 * Send bug created notification email
 */
export async function sendBugCreatedEmail(recipientEmail, bugData, reporterName) {
  const bugUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/bugs/${bugData.id}`;

  try {
    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: recipientEmail,
      subject: `🐛 New Bug Reported: ${bugData.bugNumber} - ${bugData.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
            <h2 style="margin: 0; font-size: 24px;">🐛 New Bug Report</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Reported by ${reporterName}</p>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 10px 0; font-weight: bold; width: 30%; color: #666;">Bug ID:</td>
                <td style="padding: 10px 0;">${bugData.bugNumber}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 10px 0; font-weight: bold; color: #666;">Title:</td>
                <td style="padding: 10px 0;">${bugData.title}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 10px 0; font-weight: bold; color: #666;">Severity:</td>
                <td style="padding: 10px 0;">
                  <span style="background: ${getSeverityColor(bugData.severity)}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                    ${bugData.severity}
                  </span>
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 10px 0; font-weight: bold; color: #666;">Priority:</td>
                <td style="padding: 10px 0;">${bugData.priority}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #666;">Environment:</td>
                <td style="padding: 10px 0;">${bugData.environment}</td>
              </tr>
            </table>
          </div>

          <div style="padding: 20px; background: white; border: 1px solid #e0e0e0; border-top: none;">
            <h4 style="margin-top: 0; color: #667eea;">Description:</h4>
            <p style="line-height: 1.6; margin: 0; word-break: break-word;">${bugData.description}</p>

            <div style="margin-top: 20px; text-align: center;">
              <a href="${bugUrl}" style="background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Bug Details
              </a>
            </div>
          </div>

          <div style="padding: 15px; background: #f0f0f0; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; text-align: center;">
            <p style="margin: 0;">You received this email because a new bug was reported in your project.</p>
            <p style="margin: 5px 0 0 0;">
              <a href="${process.env.FRONTEND_URL}/notifications/preferences" style="color: #667eea; text-decoration: none;">Manage preferences</a>
            </p>
          </div>
        </div>
      `,
    });

    return response;
  } catch (error) {
    console.error('Failed to send bug created email:', error);
    throw new Error('Failed to send bug created email');
  }
}

/**
 * Send bug assigned notification email
 */
export async function sendBugAssignedEmail(recipientEmail, bugData, assignerName) {
  const bugUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/bugs/${bugData.id}`;

  try {
    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: recipientEmail,
      subject: `👤 Bug Assigned to You: ${bugData.bugNumber} - ${bugData.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
            <h2 style="margin: 0; font-size: 24px;">👤 Bug Assigned to You</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">by ${assignerName}</p>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 10px 0; font-weight: bold; width: 30%; color: #666;">Bug ID:</td>
                <td style="padding: 10px 0;">${bugData.bugNumber}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 10px 0; font-weight: bold; color: #666;">Title:</td>
                <td style="padding: 10px 0;">${bugData.title}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 10px 0; font-weight: bold; color: #666;">Severity:</td>
                <td style="padding: 10px 0;">
                  <span style="background: ${getSeverityColor(bugData.severity)}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                    ${bugData.severity}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #666;">Priority:</td>
                <td style="padding: 10px 0;">${bugData.priority}</td>
              </tr>
            </table>
          </div>

          <div style="padding: 20px; background: white; border: 1px solid #e0e0e0; border-top: none;">
            <h4 style="margin-top: 0; color: #f5576c;">You are assigned to fix this bug</h4>
            <p style="line-height: 1.6; margin: 0 0 20px 0;">${bugData.description}</p>

            <div style="margin-top: 20px; text-align: center;">
              <a href="${bugUrl}" style="background-color: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Start Working on Bug
              </a>
            </div>
          </div>

          <div style="padding: 15px; background: #f0f0f0; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; text-align: center;">
            <p style="margin: 0;">You received this email because a bug was assigned to you.</p>
          </div>
        </div>
      `,
    });

    return response;
  } catch (error) {
    console.error('Failed to send bug assigned email:', error);
    throw new Error('Failed to send bug assigned email');
  }
}

/**
 * Send bug status changed notification email
 */
export async function sendBugStatusChangedEmail(recipientEmail, bugData, oldStatus, newStatus, changedByName) {
  const bugUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/bugs/${bugData.id}`;

  try {
    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: recipientEmail,
      subject: `📊 Bug Status Changed: ${bugData.bugNumber} - ${oldStatus} → ${newStatus}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
            <h2 style="margin: 0; font-size: 24px;">📊 Status Update</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">by ${changedByName}</p>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 10px 0; font-weight: bold; width: 30%; color: #666;">Bug ID:</td>
                <td style="padding: 10px 0;">${bugData.bugNumber}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 10px 0; font-weight: bold; color: #666;">Title:</td>
                <td style="padding: 10px 0;">${bugData.title}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 10px 0; font-weight: bold; color: #666;">Previous Status:</td>
                <td style="padding: 10px 0;">
                  <span style="background: #ccc; color: white; padding: 3px 10px; border-radius: 12px; font-size: 12px;">
                    ${oldStatus}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #666;">New Status:</td>
                <td style="padding: 10px 0;">
                  <span style="background: ${getStatusColor(newStatus)}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 12px;">
                    ${newStatus}
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <div style="padding: 20px; background: white; border: 1px solid #e0e0e0; border-top: none;">
            <h4 style="margin-top: 0; color: #4facfe;">Bug Details:</h4>
            <p style="line-height: 1.6; margin: 0 0 20px 0; color: #666;">${bugData.title}</p>

            <div style="text-align: center;">
              <a href="${bugUrl}" style="background-color: #4facfe; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Full Details
              </a>
            </div>
          </div>

          <div style="padding: 15px; background: #f0f0f0; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; text-align: center;">
            <p style="margin: 0;">You received this email because a bug you're involved with was updated.</p>
          </div>
        </div>
      `,
    });

    return response;
  } catch (error) {
    console.error('Failed to send bug status changed email:', error);
    throw new Error('Failed to send bug status changed email');
  }
}

/**
 * Helper function to get severity color
 */
function getSeverityColor(severity) {
  const colors = {
    CRITICAL: '#dc2626',
    MAJOR: '#f97316',
    MINOR: '#eab308',
    TRIVIAL: '#22c55e',
  };
  return colors[severity] || '#6b7280';
}

/**
 * Helper function to get status color
 */
function getStatusColor(status) {
  const colors = {
    NEW: '#6366f1',
    ASSIGNED: '#f59e0b',
    IN_PROGRESS: '#3b82f6',
    FIXED: '#8b5cf6',
    VERIFIED_FIXED: '#10b981',
    REOPENED: '#ef4444',
    CLOSED: '#6b7280',
    CANNOT_REPRODUCE: '#64748b',
    DUPLICATE: '#94a3b8',
  };
  return colors[status] || '#6b7280';
}