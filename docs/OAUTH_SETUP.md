# OAuth Setup Guide for CodeAgentSwarm

This guide will help you set up OAuth authentication for GitHub, Google, and Discord.

## Prerequisites

1. Backend server URL (for local development: `http://localhost:3001`)
2. Supabase project with users table (already configured)

## GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the form:
   - **Application name**: CodeAgentSwarm
   - **Homepage URL**: http://localhost:3001 (or your production URL)
   - **Authorization callback URL**: http://localhost:3001/api/auth/callback/github
4. Click "Register application"
5. Copy the **Client ID**
6. Generate a new **Client Secret** and copy it
7. Add to your `.env` file:
   ```
   GITHUB_CLIENT_ID=your_client_id_here
   GITHUB_CLIENT_SECRET=your_client_secret_here
   ```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Configure consent screen first if needed
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3001/api/auth/callback/google`
5. Copy the **Client ID** and **Client Secret**
6. Add to your `.env` file:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```

## Discord OAuth Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Enter application name: "CodeAgentSwarm"
4. Go to "OAuth2" in the sidebar
5. Copy the **Client ID**
6. Reset and copy the **Client Secret**
7. Add redirect URL:
   - Click "Add Redirect"
   - Enter: `http://localhost:3001/api/auth/callback/discord`
8. Add to your `.env` file:
   ```
   DISCORD_CLIENT_ID=your_client_id_here
   DISCORD_CLIENT_SECRET=your_client_secret_here
   ```

## Testing the Setup

1. Restart the backend server:
   ```bash
   npm start
   ```

2. Test each provider:
   - GitHub: http://localhost:3001/api/auth/login/github
   - Google: http://localhost:3001/api/auth/login/google
   - Discord: http://localhost:3001/api/auth/login/discord

3. The OAuth flow should:
   - Redirect you to the provider's login page
   - After authorization, redirect back to the callback URL
   - Create/find user in database
   - Generate JWT tokens
   - Redirect to the Electron app via deep link: `codeagentswarm://auth?token=...`

## Production Deployment

When deploying to production, update the callback URLs in each OAuth provider's settings to use your production domain:
- GitHub: `https://yourdomain.com/api/auth/callback/github`
- Google: `https://yourdomain.com/api/auth/callback/google`  
- Discord: `https://yourdomain.com/api/auth/callback/discord`

Also update the `BACKEND_URL` in your `.env` file to match your production URL.

## Troubleshooting

### "OAuth not configured" error
Make sure the CLIENT_ID and CLIENT_SECRET are set in your `.env` file and restart the server.

### "Invalid redirect URI" error
Check that the callback URL in your OAuth app settings exactly matches the one used by the backend.

### "User creation failed" error
Ensure your Supabase database has the users table with the correct schema. Check the migration in `/migrations/001_create_users_table.sql`.