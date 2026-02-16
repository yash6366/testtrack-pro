/**
 * OAUTH SERVICE - NEON AUTH Integration
 * Handles OAuth 2.0 authentication with Google and GitHub providers via Neon Auth
 */

import { getPrismaClient } from '../lib/prisma.js';
import crypto from 'crypto';

const prisma = getPrismaClient();

// OAuth configuration
const NEON_AUTH_URL = process.env.NEON_AUTH_URL || 'https://ep-steep-cherry-ak0yrfd.neonauth.c-3.us-west-2.aws.neon.tech/neondb/auth';
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const GITHUB_OAUTH_CLIENT_ID = process.env.GITHUB_OAUTH_CLIENT_ID;
const GITHUB_OAUTH_CLIENT_SECRET = process.env.GITHUB_OAUTH_CLIENT_SECRET;
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || 'http://localhost:3001';

/**
 * Generate Google OAuth authorization URL
 * @param {string} redirectUrl - Callback URL after Google authentication
 * @returns {string} Google OAuth authorization URL
 */
export function getGoogleAuthorizationUrl(redirectUrl = null) {
  const clientId = GOOGLE_OAUTH_CLIENT_ID;
  const scope = encodeURIComponent('openid profile email');
  const redirectUri = encodeURIComponent(redirectUrl || `${WEBHOOK_BASE_URL}/api/auth/oauth/google/callback`);
  const state = crypto.randomBytes(32).toString('hex');
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    state,
    prompt: 'select_account',
  });

  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    state,
  };
}

/**
 * Generate GitHub OAuth authorization URL
 * @param {string} redirectUrl - Callback URL after GitHub authentication
 * @returns {string} GitHub OAuth authorization URL
 */
export function getGitHubAuthorizationUrl(redirectUrl = null) {
  const clientId = GITHUB_OAUTH_CLIENT_ID;
  const scope = encodeURIComponent('read:user user:email');
  const redirectUri = encodeURIComponent(redirectUrl || `${WEBHOOK_BASE_URL}/api/auth/oauth/github/callback`);
  const state = crypto.randomBytes(32).toString('hex');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
    allow_signup: 'true',
  });

  return {
    url: `https://github.com/login/oauth/authorize?${params.toString()}`,
    state,
  };
}

/**
 * Exchange Google OAuth code for tokens and user info
 * @param {string} code - Authorization code from Google
 * @param {string} redirectUrl - Callback URL used in authorization request
 * @returns {Promise<Object>} User data from Google
 */
export async function exchangeGoogleCodeForToken(code, redirectUrl = null) {
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUrl || `${WEBHOOK_BASE_URL}/api/auth/oauth/google/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to exchange code: ${tokenResponse.statusText}`);
    }

    const { access_token, id_token } = await tokenResponse.json();

    // Get user info from Google
    const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user info from Google');
    }

    const userInfo = await userResponse.json();
    return {
      provider: 'GOOGLE',
      providerId: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      accessToken: access_token,
      idToken: id_token,
    };
  } catch (error) {
    throw new Error(`Google OAuth error: ${error.message}`);
  }
}

/**
 * Exchange GitHub OAuth code for tokens and user info
 * @param {string} code - Authorization code from GitHub
 * @param {string} redirectUrl - Callback URL used in authorization request
 * @returns {Promise<Object>} User data from GitHub
 */
export async function exchangeGitHubCodeForToken(code, redirectUrl = null) {
  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_OAUTH_CLIENT_ID,
        client_secret: GITHUB_OAUTH_CLIENT_SECRET,
        code,
        redirect_uri: redirectUrl || `${WEBHOOK_BASE_URL}/api/auth/oauth/github/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to exchange code: ${tokenResponse.statusText}`);
    }

    const { access_token, scope, token_type } = await tokenResponse.json();

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user info from GitHub');
    }

    const userInfo = await userResponse.json();

    // Get user email from GitHub if not in main response
    let email = userInfo.email;
    if (!email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `token ${access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (emailResponse.ok) {
        const emails = await emailResponse.json();
        const primaryEmail = emails.find((e) => e.primary);
        email = primaryEmail?.email || emails[0]?.email;
      }
    }

    return {
      provider: 'GITHUB',
      providerId: userInfo.id.toString(),
      email: email || userInfo.login,
      name: userInfo.name || userInfo.login,
      picture: userInfo.avatar_url,
      username: userInfo.login,
      accessToken: access_token,
    };
  } catch (error) {
    throw new Error(`GitHub OAuth error: ${error.message}`);
  }
}

/**
 * Find or create user from OAuth provider data
 * @param {Object} oauthData - OAuth provider user data
 * @returns {Promise<Object>} User object
 */
export async function findOrCreateOAuthUser(oauthData) {
  const {
    provider,
    providerId,
    email,
    name,
    picture,
  } = oauthData;

  try {
    // Check if OAuth integration already exists
    let oauthIntegration = await prisma.oauthIntegration.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
      include: { user: true },
    });

    // If OAuth integration exists, return the user
    if (oauthIntegration) {
      return {
        user: oauthIntegration.user,
        isNewUser: false,
        oauthIntegration,
      };
    }

    // Check if user with this email already exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    // If user doesn't exist, create new user
    if (!user) {
      user = await prisma.user.create({
        data: {
          name,
          email,
          password: null, // OAuth users don't need password
          role: 'DEVELOPER', // Default role
          isVerified: true, // OAuth users are auto-verified
          picture,
        },
      });
    }

    // Create OAuth integration record
    oauthIntegration = await prisma.oauthIntegration.create({
      data: {
        provider,
        providerId,
        userId: user.id,
        email,
        metadata: {
          name,
          picture,
          provider,
        },
      },
    });

    // Ensure user is in universal channel
    const universalChannel = await prisma.channel.findFirst({
      where: { name: 'UNIVERSAL' },
    });

    if (universalChannel) {
      await prisma.channelMember.upsert({
        where: {
          channelId_userId: {
            channelId: universalChannel.id,
            userId: user.id,
          },
        },
        update: {},
        create: {
          channelId: universalChannel.id,
          userId: user.id,
          role: 'MEMBER',
        },
      });
    }

    return {
      user,
      isNewUser: !user.id,
      oauthIntegration,
    };
  } catch (error) {
    throw new Error(`Failed to create/find OAuth user: ${error.message}`);
  }
}

/**
 * Link OAuth provider to existing user
 * @param {number} userId - User ID
 * @param {Object} oauthData - OAuth provider data
 * @returns {Promise<Object>} Created OAuth integration
 */
export async function linkOAuthProvider(userId, oauthData) {
  const {
    provider,
    providerId,
    email,
    name,
    picture,
  } = oauthData;

  try {
    // Check if this OAuth provider is already linked to a different user
    const existingIntegration = await prisma.oauthIntegration.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
    });

    if (existingIntegration && existingIntegration.userId !== userId) {
      throw new Error(`This ${provider} account is already linked to another user`);
    }

    // Create or update OAuth integration
    const oauthIntegration = await prisma.oauthIntegration.upsert({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
      create: {
        provider,
        providerId,
        userId,
        email,
        metadata: {
          name,
          picture,
          provider,
        },
      },
      update: {
        email,
        metadata: {
          name,
          picture,
          provider,
        },
      },
    });

    return oauthIntegration;
  } catch (error) {
    throw new Error(`Failed to link OAuth provider: ${error.message}`);
  }
}

/**
 * Unlink OAuth provider from user
 * @param {number} userId - User ID
 * @param {string} provider - OAuth provider name (GOOGLE, GITHUB)
 * @returns {Promise<Object>} Deleted OAuth integration
 */
export async function unlinkOAuthProvider(userId, provider) {
  try {
    // Get the OAuth integration
    const oauthIntegration = await prisma.oauthIntegration.findFirst({
      where: {
        userId,
        provider,
      },
    });

    if (!oauthIntegration) {
      throw new Error(`No ${provider} account linked to this user`);
    }

    // Check if user has email/password authentication (at least one auth method)
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user.password) {
      // Count other OAuth providers
      const otherOAuthCount = await prisma.oauthIntegration.count({
        where: {
          userId,
          provider: { not: provider },
        },
      });

      if (otherOAuthCount === 0) {
        throw new Error('Cannot unlink the last authentication method. Please set a password first.');
      }
    }

    // Delete the OAuth integration
    return await prisma.oauthIntegration.delete({
      where: { id: oauthIntegration.id },
    });
  } catch (error) {
    throw new Error(`Failed to unlink OAuth provider: ${error.message}`);
  }
}

/**
 * Get all OAuth providers linked to a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of linked OAuth integrations
 */
export async function getUserOAuthProviders(userId) {
  try {
    return await prisma.oauthIntegration.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        email: true,
        metadata: true,
        createdAt: true,
      },
    });
  } catch (error) {
    throw new Error(`Failed to fetch OAuth providers: ${error.message}`);
  }
}
