# OAuth Integration Guide

This guide covers setting up OAuth 2.0 authentication with Google and GitHub providers in TestTrack Pro v0.6.2+.

The OAuth integration allows users to sign up and log in using their Google or GitHub accounts. The system:

- Automatically creates user accounts with OAuth provider data
- Links OAuth providers to existing accounts
- Manages multiple OAuth providers per user
- Maintains email verification status
- Stores OAuth provider metadata in the database

**Note:** OAuth setup is independent of the new v0.6.2 features (bug fix documentation, developer analytics, flaky test detection). These features work with both OAuth and traditional email/password authentication.

## Setup Google OAuth

### Prerequisites

- Google Cloud Project
- Active billing enabled
- OAuth 2.0 credentials

### Steps

1. **Go to Google Cloud Console**
   - Visit https://console.cloud.google.com/
   - Create a new project or select an existing one

2. **Enable Google+ API**
   - Search for "Google+ API"
   - Click Enable

3. **Create OAuth 2.0 Credentials**
   - Go to Credentials (left sidebar)
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized JavaScript origins:
     - `http://localhost:3001` (development)
     - `https://yourdomain.com` (production)
   - Add authorized redirect URIs:
     - `http://localhost:3001/api/auth/oauth/google/callback` (development)
     - `https://yourdomain.com/api/auth/oauth/google/callback` (production)
   - Save your Client ID and Client Secret

4. **Update .env**
   ```bash
   GOOGLE_OAUTH_CLIENT_ID=your_client_id_here
   GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret_here
   ```

## Setup GitHub OAuth

### Prerequisites

- GitHub Account
- GitHub Developer Settings access

### Steps

1. **Go to GitHub Developer Settings**
   - Visit https://github.com/settings/developers
   - Click "OAuth Apps" → "New OAuth App"

2. **Fill in Application Details**
   - **Application name**: TestTrack Pro
   - **Homepage URL**: `http://localhost:3001` (development) or `https://yourdomain.com` (production)
   - **Authorization callback URL**: 
     - `http://localhost:3001/api/auth/oauth/github/callback` (development)
     - `https://yourdomain.com/api/auth/oauth/github/callback` (production)

3. **Get Credentials**
   - Copy your Client ID and Client Secret
   - Keep these secure (never commit to git)

4. **Update .env**
   ```bash
   GITHUB_OAUTH_CLIENT_ID=your_client_id_here
   GITHUB_OAUTH_CLIENT_SECRET=your_client_secret_here
   ```

## Environment Configuration

### Required Variables

Create a `.env` file in the `apps/api` directory with:

```bash
# Neon Auth
NEON_AUTH_URL=https://ep-steep-cherry-ak0yrfd.neonauth.c-3.us-west-2.aws.neon.tech/neondb/auth

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth
GITHUB_OAUTH_CLIENT_ID=your_github_client_id
GITHUB_OAUTH_CLIENT_SECRET=your_github_client_secret

# URLs
WEBHOOK_BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173
```

### Important Security Notes

- Never commit `.env` files with real credentials
- Use environment variable management services in production
- Rotate secrets regularly
- Use HTTPS in production
- Keep Client Secrets secure

## API Endpoints

### Start OAuth Flow

**Get Google OAuth Authorization URL**
```
GET /api/auth/oauth/google?redirectUrl=optional_redirect_url

Response:
{
  "authUrl": "https://accounts.google.com/...",
  "state": "random_state_token",
  "provider": "GOOGLE"
}
```

**Get GitHub OAuth Authorization URL**
```
GET /api/auth/oauth/github?redirectUrl=optional_redirect_url

Response:
{
  "authUrl": "https://github.com/login/oauth/...",
  "state": "random_state_token",
  "provider": "GITHUB"
}
```

### Handle OAuth Callback

**Google OAuth Callback**
```
POST /api/auth/oauth/google/callback

Body:
{
  "code": "authorization_code_from_google",
  "redirectUrl": "optional_redirect_url"
}

Response:
{
  "token": "jwt_token",
  "user": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "DEVELOPER",
    "picture": "profile_picture_url",
    "isVerified": true
  },
  "isNewUser": false,
  "provider": "GOOGLE"
}
```

**GitHub OAuth Callback**
```
POST /api/auth/oauth/github/callback

Body:
{
  "code": "authorization_code_from_github",
  "redirectUrl": "optional_redirect_url"
}

Response:
{
  "token": "jwt_token",
  "user": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "DEVELOPER",
    "picture": "profile_picture_url",
    "isVerified": true
  },
  "isNewUser": true,
  "provider": "GITHUB"
}
```

### Link OAuth Provider to Existing User

**Link OAuth Provider**
```
POST /api/auth/oauth/link
Authorization: Bearer jwt_token

Body:
{
  "provider": "GOOGLE",
  "code": "authorization_code",
  "redirectUrl": "optional_redirect_url"
}

Response:
{
  "message": "GOOGLE account linked successfully",
  "oauthIntegration": {
    "id": 456,
    "provider": "GOOGLE",
    "providerId": "google_user_id",
    "email": "john@gmail.com",
    "createdAt": "2024-02-13T10:00:00Z"
  }
}
```

### Get Linked OAuth Providers

**Get All OAuth Providers**
```
GET /api/auth/oauth/providers
Authorization: Bearer jwt_token

Response:
[
  {
    "id": 456,
    "provider": "GOOGLE",
    "email": "john@gmail.com",
    "metadata": {...},
    "createdAt": "2024-02-13T10:00:00Z"
  },
  {
    "id": 789,
    "provider": "GITHUB",
    "email": "john-github@example.com",
    "metadata": {...},
    "createdAt": "2024-02-13T10:05:00Z"
  }
]
```

### Unlink OAuth Provider

**Unlink OAuth Provider**
```
DELETE /api/auth/oauth/unlink/GOOGLE
Authorization: Bearer jwt_token

Response:
{
  "message": "GOOGLE account unlinked successfully"
}
```

## Frontend Integration

### Example: Google Login Button

```javascript
// Get authorization URL
const googleAuthResponse = await fetch('/api/auth/oauth/google');
const { authUrl } = await googleAuthResponse.json();

// Redirect user to Google login
window.location.href = authUrl;

// After user authorizes, handle callback
const callbackResponse = await fetch('/api/auth/oauth/google/callback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: authorizationCode, // from URL params
    redirectUrl: window.location.href
  })
});

const { token, user, isNewUser } = await callbackResponse.json();

// Store token and redirect
localStorage.setItem('authToken', token);
window.location.href = isNewUser ? '/onboarding' : '/dashboard';
```

### Example: GitHub Login Button

```javascript
// Get authorization URL
const githubAuthResponse = await fetch('/api/auth/oauth/github');
const { authUrl } = await githubAuthResponse.json();

// Redirect user to GitHub login
window.location.href = authUrl;

// Handle callback (similar to Google)
const callbackResponse = await fetch('/api/auth/oauth/github/callback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: authorizationCode,
    redirectUrl: window.location.href
  })
});

const { token, user } = await callbackResponse.json();
localStorage.setItem('authToken', token);
```

### Example: Link OAuth Provider

```javascript
// User is already authenticated
const token = localStorage.getItem('authToken');

const linkResponse = await fetch('/api/auth/oauth/link', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    provider: 'GOOGLE',
    code: authorizationCode,
    redirectUrl: window.location.href
  })
});

const result = await linkResponse.json();
console.log('OAuth provider linked:', result);
```

## Production Deployment

### Security Checklist

- [ ] Use HTTPS for all URLs
- [ ] Store secrets in environment variables (not .env)
- [ ] Update authorized redirect URIs for production domain
- [ ] Set up rate limiting for OAuth endpoints
- [ ] Monitor failed OAuth attempts
- [ ] Implement CSRF protection (already done)
- [ ] Validate state tokens properly
- [ ] Keep client secrets secure

### Environment Variables for Production

Set these on your hosting platform:

```bash
NEON_AUTH_URL=production_url
GOOGLE_OAUTH_CLIENT_ID=production_id
GOOGLE_OAUTH_CLIENT_SECRET=production_secret
GITHUB_OAUTH_CLIENT_ID=production_id
GITHUB_OAUTH_CLIENT_SECRET=production_secret
WEBHOOK_BASE_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

## Troubleshooting

### "Invalid client ID"
- Verify Client ID matches your provider configuration
- Check that URL matches authorized origins

### "Redirect URI mismatch"
- Ensure the callback URL exactly matches provider settings
- For development/production, use separate OAuth apps if needed
- Check for trailing slashes and protocol differences

### "User already linked to another account"
- Cannot link an OAuth account that's already linked to a different user
- User must unlink from the other account first

### "Invalid state token"
- State token expired (implement timeout in frontend)
- CSRF attack possible - implement proper state validation

### "No email returned from provider"
- For GitHub, we fetch from the user email endpoint
- Check that user has a public email set on GitHub

## Support

For issues or questions:
1. Check provider documentation (Google OAuth, GitHub OAuth)
2. Review error logs in application
3. Verify environment variables are set correctly
4. Test with provider test tools
