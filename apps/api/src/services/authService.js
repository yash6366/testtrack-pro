import bcrypt from 'bcryptjs';
import { getPrismaClient } from '../lib/prisma.js';
import { SignupSchema, LoginSchema } from '../schemas/auth.js';
import { sendVerificationEmail, generateVerificationToken, getVerificationTokenExpiry } from './emailService.js';
import { ensureUserInUniversalChannel } from './channelService.js';

const prisma = getPrismaClient();
const MAIN_ADMIN_EMAIL = 'admin@gmail.com';

function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toUpperCase() : role;
}

function isMainAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === MAIN_ADMIN_EMAIL;
}

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
    },
    message: isMainAdmin
      ? 'Signup successful. Admin account verified.'
      : 'Signup successful. Please check your email to verify your account.',
  };
}

export async function login(fastify, { email, password }) {
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

  // Check if user is verified
  if (!user.isVerified) {
    throw new Error('Please verify your email before logging in');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(validated.password, user.password);

  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Generate token
  const token = fastify.jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: normalizeRole(user.role),
      tokenVersion: user.tokenVersion,
    },
    { expiresIn: '7d' }
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
    },
    token,
  };
}

export async function logout(userId) {
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

export async function logoutAll(userId) {
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
