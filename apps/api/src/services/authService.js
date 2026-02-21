import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getPrismaClient } from '../lib/prisma.js';
import { SignupSchema, LoginSchema } from '../schemas/auth.js';
import { 
  sendVerificationEmail, 
  generateVerificationToken, 
  getVerificationTokenExpiry,
  sendPasswordResetEmail,
  sendAccountLockedEmail,
  sendPasswordChangedEmail
} from './emailService.js';
import { ensureUserInUniversalChannel } from './channelService.js';
import { autoJoinRoleChannels } from '../routes/channels.js';

const prisma = getPrismaClient();
const MAIN_ADMIN_EMAIL = 'admin@gmail.com';

// Account Security Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
const PASSWORD_HISTORY_COUNT = 5;
const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 1;
const REFRESH_TOKEN_TTL_DAYS = 30;

function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toUpperCase() : role;
}

function isMainAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === MAIN_ADMIN_EMAIL;
}

function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getRefreshTokenExpiry() {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Register a new user account
 * @param {Object} fastify - Fastify instance
 * @param {Object} userData - User registration data
 * @param {string} userData.name - User's full name
 * @param {string} userData.email - User's email address (must be unique)
 * @param {string} userData.password - User's password (min 8 characters)
 * @param {string} [userData.role='DEVELOPER'] - User role (ADMIN, TESTER, DEVELOPER, GUEST)
 * @returns {Promise<Object>} Object containing created user and message
 * @throws {Error} If user already exists or validation fails
 */
export async function signup(fastify, { name, email, password, role = 'DEVELOPER' }) {
  // Validate input
  const validated = SignupSchema.parse({ name, email, password, role });
  const isMainAdmin = isMainAdminEmail(validated.email);

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email: validated.email },
  });

  if (existingUser) {
    throw new Error('User already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(validated.password, 10);

  // Generate verification token
  const verificationToken = isMainAdmin ? null : generateVerificationToken();
  const verificationTokenExpiry = isMainAdmin ? null : getVerificationTokenExpiry();

  // Create user with verification token
  const user = await prisma.user.create({
    data: {
      name: validated.name,
      email: validated.email,
      password: hashedPassword,
      role: isMainAdmin ? 'ADMIN' : validated.role,
      isVerified: isMainAdmin ? true : false,
      verificationToken,
      verificationTokenExpiry,
    },
  });

  await ensureUserInUniversalChannel(user.id);

  // Send verification email
  if (!isMainAdmin) {
    await sendVerificationEmail(user.email, verificationToken);
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
      isVerified: user.isVerified,
      isMuted: user.isMuted,
      mutedUntil: user.mutedUntil,
      muteReason: user.muteReason,
    },
    message: isMainAdmin
      ? 'Signup successful. Admin account verified.'
      : 'Signup successful. Please check your email to verify your account.',
  };
}

/**
 * Authenticate user and generate JWT tokens
 * @param {Object} fastify - Fastify instance
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.email - User's email address
 * @param {string} credentials.password - User's password
 * @returns {Promise<Object>} Object containing access token, refresh token, and user data
 * @throws {Error} If credentials are invalid, account is locked, or email not verified
 */
export async function login(fastify, { email, password }, context = {}) {
  // Validate input
  const validated = LoginSchema.parse({ email, password });

  // Find user
  let user = await prisma.user.findUnique({
    where: { email: validated.email },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Ensure main admin is always admin and verified
  if (isMainAdminEmail(user.email) && (!user.isVerified || user.role !== 'ADMIN')) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'ADMIN',
        isVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });
  }

  if (!user.isActive) {
    throw new Error('Account is deactivated. Please contact an administrator.');
  }

  // Check if account is locked
  if (user.lockedUntil && new Date() < user.lockedUntil) {
    const remainingMinutes = Math.ceil((user.lockedUntil - new Date()) / 60000);
    throw new Error(`Account is locked due to too many failed login attempts. Please try again in ${remainingMinutes} minute(s) or reset your password.`);
  }

  // If lock period has passed, reset failed attempts
  if (user.lockedUntil && new Date() >= user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });
    user.lockedUntil = null;
    user.failedLoginAttempts = 0;
  }

  // Check if user is verified
  if (!user.isVerified) {
    throw new Error('Please verify your email before logging in');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(validated.password, user.password);

  if (!isPasswordValid) {
    // Increment failed login attempts
    const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
    const updateData = {
      failedLoginAttempts: newFailedAttempts,
    };

    // Lock account if max attempts reached
    if (newFailedAttempts >= MAX_LOGIN_ATTEMPTS) {
      const lockoutTime = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60000);
      updateData.lockedUntil = lockoutTime;
      
      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      // Send account locked email
      try {
        await sendAccountLockedEmail(user.email, user.name, LOCKOUT_DURATION_MINUTES);
      } catch (err) {
        // Email failure is non-critical, log but don't block the operation
      }

      throw new Error(`Account locked due to ${MAX_LOGIN_ATTEMPTS} failed login attempts. Please try again in ${LOCKOUT_DURATION_MINUTES} minutes or reset your password.`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    const remainingAttempts = MAX_LOGIN_ATTEMPTS - newFailedAttempts;
    throw new Error(`Invalid credentials. ${remainingAttempts} attempt(s) remaining before account lockout.`);
  }

  // Successful login - reset failed attempts and update last login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  // Generate access token
  const token = fastify.jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: normalizeRole(user.role),
      tokenVersion: user.tokenVersion,
    },
    { expiresIn: '7d' }
  );

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);

  await prisma.userSession.create({
    data: {
      userId: user.id,
      refreshTokenHash,
      ipAddress: context.ipAddress || null,
      userAgent: context.userAgent || null,
      deviceLabel: context.deviceLabel || null,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  // Auto-join user to role-based channels
  await autoJoinRoleChannels(user.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
      isMuted: user.isMuted,
      mutedUntil: user.mutedUntil,
      muteReason: user.muteReason,
    },
    token,
    refreshToken,
  };
}

/**
 * Logout user and invalidate current session
 * @param {number} userId - User ID to logout
 * @returns {Promise<Object>} Success message and user data
 */
export async function logout(userId, refreshToken = null) {
  if (refreshToken) {
    const refreshTokenHash = hashRefreshToken(refreshToken);
    await prisma.userSession.updateMany({
      where: {
        userId,
        refreshTokenHash,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  // Increment tokenVersion to invalidate all tokens for this user
  // This immediately rejects any requests using old JWT tokens
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      tokenVersion: { increment: 1 },
    },
    select: {
      id: true,
      email: true,
    },
  });

  return {
    message: 'Logged out successfully',
    user,
  };
}

/**
 * Logout user from all devices/sessions
 * @param {number} userId - User ID to logout from all sessions
 * @returns {Promise<Object>} Success message and user data
 */
export async function logoutAll(userId) {
  await prisma.userSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  // Same as logout - increment tokenVersion to invalidate ALL sessions
  // Since we use a single tokenVersion per user, incrementing it revokes all tokens
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      tokenVersion: { increment: 1 },
    },
    select: {
      id: true,
      email: true,
    },
  });

  return {
    message: 'All sessions invalidated',
    user,
  };
}

/**
 * Refresh access token using a refresh token (rotating)
 * @param {Object} fastify - Fastify instance
 * @param {string} refreshToken - Refresh token
 * @param {Object} context - Request context
 * @returns {Promise<Object>} New access/refresh tokens and user data
 */
export async function refreshSession(fastify, refreshToken, context = {}) {
  if (!refreshToken) {
    throw new Error('Refresh token is required');
  }

  const refreshTokenHash = hashRefreshToken(refreshToken);
  const session = await prisma.userSession.findUnique({
    where: { refreshTokenHash },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isVerified: true,
          isActive: true,
          tokenVersion: true,
          isMuted: true,
          mutedUntil: true,
          muteReason: true,
        },
      },
    },
  });

  if (!session || session.revokedAt) {
    throw new Error('Invalid refresh token');
  }

  if (session.expiresAt && new Date() > session.expiresAt) {
    throw new Error('Refresh token has expired');
  }

  if (!session.user?.isVerified || !session.user?.isActive) {
    throw new Error('User is not active');
  }

  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

  await prisma.userSession.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: newRefreshTokenHash,
      rotatedAt: new Date(),
      lastUsedAt: new Date(),
      ipAddress: context.ipAddress || session.ipAddress,
      userAgent: context.userAgent || session.userAgent,
      deviceLabel: context.deviceLabel || session.deviceLabel,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  const accessToken = fastify.jwt.sign(
    {
      id: session.user.id,
      email: session.user.email,
      role: normalizeRole(session.user.role),
      tokenVersion: session.user.tokenVersion,
    },
    { expiresIn: '7d' }
  );

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: normalizeRole(session.user.role),
      isMuted: session.user.isMuted,
      mutedUntil: session.user.mutedUntil,
      muteReason: session.user.muteReason,
    },
    token: accessToken,
    refreshToken: newRefreshToken,
  };
}

/**
 * Verify user's email address using verification token
 * @param {string} verificationToken - Email verification token sent to user
 * @returns {Promise<Object>} Verified user data and success message
 * @throws {Error} If token is invalid or expired
 */
export async function verifyEmail(verificationToken) {
  // Find user with verification token
  const user = await prisma.user.findFirst({
    where: {
      verificationToken,
    },
  });

  if (!user) {
    throw new Error('Invalid verification token');
  }

  // Check if token is expired
  if (new Date() > user.verificationTokenExpiry) {
    throw new Error('Verification token has expired');
  }

  // Update user to mark as verified
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    },
  });

  return {
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: normalizeRole(updatedUser.role),
      isVerified: updatedUser.isVerified,
    },
    message: 'Email verified successfully',
  };
}

// Password Reset Functions
/**
 * Request password reset link via email
 * @param {string} email - User's email address
 * @returns {Promise<Object>} Success message (doesn't reveal if user exists)
 */
export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Don't reveal if user exists for security
  if (!user) {
    return {
      message: 'If an account exists with that email, a password reset link has been sent.',
    };
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expiryDate = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  // Save token to database
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashedToken,
      passwordResetTokenExpiry: expiryDate,
    },
  });

  // Send reset email
  await sendPasswordResetEmail(user.email, user.name, resetToken).catch(err => {
    // Email failure is non-critical
  });

  return {
    message: 'If an account exists with that email, a password reset link has been sent.',
  };
}

/**
 * Reset user password using reset token
 * @param {string} token - Password reset token from email
 * @param {string} newPassword - New password (must meet strength requirements)
 * @returns {Promise<Object>} Success message
 * @throws {Error} If token is invalid/expired or password doesn't meet requirements
 */
export async function resetPassword(token, newPassword) {
  // Hash the token to compare with database
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with this token
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: hashedToken,
      passwordResetTokenExpiry: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new Error('Invalid or expired reset token');
  }

  // Validate password strength
  validatePasswordStrength(newPassword);

  // Check password history
  await validatePasswordHistory(user, newPassword);

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password history (keep last 5)
  const updatedHistory = [hashedPassword, ...user.passwordHistory].slice(0, PASSWORD_HISTORY_COUNT);

  // Update user
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetTokenExpiry: null,
      passwordHistory: updatedHistory,
      lastPasswordChange: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  // Send confirmation email
  await sendPasswordChangedEmail(user.email, user.name).catch(err => {
    console.error('Failed to send password changed email:', err);
  });

  return {
    message: 'Password reset successful. You can now login with your new password.',
  };
}

// Password Validation Functions
function validatePasswordStrength(password) {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain at least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    throw new Error('Password must contain at least one special character');
  }
}

async function validatePasswordHistory(user, newPassword) {
  // Check against previous passwords
  for (const oldHash of user.passwordHistory || []) {
    const isMatch = await bcrypt.compare(newPassword, oldHash);
    if (isMatch) {
      throw new Error(`Password cannot be the same as your last ${PASSWORD_HISTORY_COUNT} passwords`);
    }
  }
}

/**
 * Change user password (requires current password verification)
 * @param {number} userId - User ID
 * @param {string} currentPassword - Current password for verification
 * @param {string} newPassword - New password (must meet strength requirements)
 * @returns {Promise<Object>} Success message
 * @throws {Error} If current password is incorrect or new password doesn't meet requirements
 */
export async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }

  // Validate new password strength
  validatePasswordStrength(newPassword);

  // Check password history
  await validatePasswordHistory(user, newPassword);

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password history
  const updatedHistory = [hashedPassword, ...user.passwordHistory].slice(0, PASSWORD_HISTORY_COUNT);

  // Update user
  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      passwordHistory: updatedHistory,
      lastPasswordChange: new Date(),
    },
  });

  // Send confirmation email
  await sendPasswordChangedEmail(user.email, user.name).catch(err => {
    console.error('Failed to send password changed email:', err);
  });

  return {
    message: 'Password changed successfully',
  };
}

// Admin Functions
/**
 * Unlock a locked user account (admin only)
 * @param {number} adminId - Admin user ID performing the unlock
 * @param {number} targetUserId - User ID to unlock
 * @returns {Promise<Object>} Success message and unlocked user data
 * @throws {Error} If admin doesn't have permission
 */
export async function unlockAccount(adminId, targetUserId) {
  // Verify admin permissions (caller should check this, but double-check)
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
  });

  if (!admin || admin.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  // Unlock the account
  const user = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      lockedUntil: null,
      failedLoginAttempts: 0,
    },
  });

  return {
    message: `Account for ${user.email} has been unlocked`,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}
