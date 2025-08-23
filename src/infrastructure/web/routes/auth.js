const express = require('express');
const router = express.Router();
const AuthService = require('../../services/AuthService');

// Create AuthService instance with error handling
let authService;
try {
    authService = new AuthService();
} catch (error) {
    console.error('Failed to initialize AuthService:', error.message);
    // Auth routes will return errors if authService is not initialized
}

/**
 * OAuth login endpoints - redirect to provider
 */
router.get('/login/:provider', async (req, res) => {
    if (!authService) {
        return res.status(503).json({ error: 'Authentication service unavailable. Please check server configuration.' });
    }

    const { provider } = req.params;
    const validProviders = ['github', 'google', 'discord'];
    
    if (!validProviders.includes(provider)) {
        return res.status(400).json({ error: 'Invalid provider' });
    }

    try {
        // Construct OAuth URL based on provider
        let authUrl;
        const state = Buffer.from(JSON.stringify({
            timestamp: Date.now(),
            provider
        })).toString('base64');
        
        // Use fallback URL if BACKEND_URL is not set
        const backendUrl = process.env.BACKEND_URL || 'https://codeagentswarm-backend-production.up.railway.app';

        switch (provider) {
            case 'github':
                if (!process.env.GITHUB_CLIENT_ID) {
                    throw new Error('GitHub OAuth not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET');
                }
                authUrl = `https://github.com/login/oauth/authorize?` +
                    `client_id=${process.env.GITHUB_CLIENT_ID}&` +
                    `redirect_uri=${encodeURIComponent(backendUrl + '/api/auth/callback/github')}&` +
                    `scope=${encodeURIComponent('user:email read:user')}&` +
                    `state=${state}`;
                break;
                
            case 'google':
                if (!process.env.GOOGLE_CLIENT_ID) {
                    throw new Error('Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
                }
                authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
                    `redirect_uri=${encodeURIComponent(backendUrl + '/api/auth/callback/google')}&` +
                    `response_type=code&` +
                    `scope=${encodeURIComponent('email profile')}&` +
                    `state=${state}`;
                break;
                
            case 'discord':
                if (!process.env.DISCORD_CLIENT_ID) {
                    throw new Error('Discord OAuth not configured. Please set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET');
                }
                authUrl = `https://discord.com/api/oauth2/authorize?` +
                    `client_id=${process.env.DISCORD_CLIENT_ID}&` +
                    `redirect_uri=${encodeURIComponent(backendUrl + '/api/auth/callback/discord')}&` +
                    `response_type=code&` +
                    `scope=${encodeURIComponent('identify email')}&` +
                    `state=${state}`;
                break;
        }

        res.redirect(authUrl);
    } catch (error) {
        console.error('Error initiating OAuth:', error);
        res.status(500).json({ error: 'Failed to initiate authentication' });
    }
});

/**
 * OAuth callback endpoints
 */
router.get('/callback/:provider', async (req, res) => {
    if (!authService) {
        return res.status(503).json({ error: 'Authentication service unavailable. Please check server configuration.' });
    }

    const { provider } = req.params;
    const { code, state } = req.query;

    if (!code) {
        return res.status(400).json({ error: 'No authorization code provided' });
    }

    try {
        let profile;
        
        // Exchange code for access token and get user profile
        switch (provider) {
            case 'github':
                profile = await exchangeGitHubCode(code);
                break;
            case 'google':
                profile = await exchangeGoogleCode(code);
                break;
            case 'discord':
                profile = await exchangeDiscordCode(code);
                break;
            default:
                throw new Error('Invalid provider');
        }

        // Find or create user
        const user = await authService.findOrCreateUser(profile, provider);

        // Generate tokens
        const tokens = authService.generateTokens(user);

        // Create session
        await authService.createSession(user.id, tokens, {
            ip_address: req.ip,
            device_info: {
                user_agent: req.headers['user-agent']
            }
        });

        // Redirect to Electron app with deep link
        const redirectUrl = `codeagentswarm://auth?` +
            `token=${tokens.accessToken}&` +
            `refresh=${tokens.refreshToken}&` +
            `user=${encodeURIComponent(JSON.stringify({
                id: user.id,
                email: user.email,
                name: user.name,
                avatar_url: user.avatar_url
            }))}`;

        // For development, also show a page with the tokens
        if (process.env.NODE_ENV === 'development') {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Authentication Successful</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                               display: flex; justify-content: center; align-items: center; 
                               min-height: 100vh; margin: 0; background: #f5f5f5; }
                        .container { background: white; padding: 2rem; border-radius: 8px; 
                                   box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; }
                        h1 { color: #333; }
                        .success { color: #10b981; }
                        .token-box { background: #f9fafb; padding: 1rem; border-radius: 4px; 
                                    margin: 1rem 0; word-break: break-all; font-family: monospace; }
                        button { background: #3b82f6; color: white; border: none; 
                                padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer; }
                        button:hover { background: #2563eb; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1 class="success">✓ Authentication Successful!</h1>
                        <p>You've been logged in with ${provider}.</p>
                        <p><strong>User:</strong> ${user.email}</p>
                        
                        <p>The app should open automatically. If not, click the button below:</p>
                        <button onclick="window.location.href='${redirectUrl}'">
                            Open CodeAgentSwarm
                        </button>
                        
                        <div class="token-box">
                            <small>Debug Info (dev only):</small><br>
                            Token: ${tokens.accessToken.substring(0, 20)}...
                        </div>
                    </div>
                    <script>
                        // Try to open the app automatically
                        setTimeout(() => {
                            window.location.href = '${redirectUrl}';
                        }, 1000);
                    </script>
                </body>
                </html>
            `);
        }

        // Production: just redirect
        res.redirect(redirectUrl);
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head><title>Authentication Failed</title></head>
            <body>
                <h1>Authentication Failed</h1>
                <p>There was an error during authentication. Please try again.</p>
                <p>Error: ${error.message}</p>
            </body>
            </html>
        `);
    }
});

/**
 * Validate token endpoint
 */
router.post('/validate', async (req, res) => {
    if (!authService) {
        return res.status(503).json({ error: 'Authentication service unavailable. Please check server configuration.' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = authService.verifyAccessToken(token);
        res.json({ 
            valid: true, 
            user: decoded 
        });
    } catch (error) {
        res.status(401).json({ 
            valid: false, 
            error: error.message 
        });
    }
});

/**
 * Refresh token endpoint
 */
router.post('/refresh', async (req, res) => {
    if (!authService) {
        return res.status(503).json({ error: 'Authentication service unavailable. Please check server configuration.' });
    }

    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: 'No refresh token provided' });
    }

    try {
        const result = await authService.refreshAccessToken(refreshToken);
        res.json({
            accessToken: result.accessToken,
            user: result.user
        });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

/**
 * Logout endpoint
 */
router.post('/logout', async (req, res) => {
    if (!authService) {
        return res.status(503).json({ error: 'Authentication service unavailable. Please check server configuration.' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(400).json({ error: 'No token provided' });
    }

    try {
        await authService.logout(token);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Logout failed' });
    }
});

/**
 * Helper functions for OAuth providers
 */
async function exchangeGitHubCode(code) {
    const fetch = (await import('node-fetch')).default;
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code: code
        })
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
        throw new Error(tokenData.error_description || 'Failed to exchange code');
    }

    // Get user profile
    const userResponse = await fetch('https://api.github.com/user', {
        headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Accept': 'application/json'
        }
    });

    const userData = await userResponse.json();

    // Get user email if not public
    if (!userData.email) {
        const emailResponse = await fetch('https://api.github.com/user/emails', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Accept': 'application/json'
            }
        });
        const emails = await emailResponse.json();
        const primaryEmail = emails.find(e => e.primary);
        userData.email = primaryEmail?.email;
    }

    return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        username: userData.login,
        avatar_url: userData.avatar_url,
        provider_data: userData
    };
}

async function exchangeGoogleCode(code) {
    const fetch = (await import('node-fetch')).default;
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: process.env.BACKEND_URL + '/api/auth/callback/google'
        })
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
        throw new Error(tokenData.error_description || 'Failed to exchange code');
    }

    // Get user profile
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            'Authorization': `Bearer ${tokenData.access_token}`
        }
    });

    const userData = await userResponse.json();

    return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        avatar_url: userData.picture,
        provider_data: userData
    };
}

async function exchangeDiscordCode(code) {
    const fetch = (await import('node-fetch')).default;
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: process.env.BACKEND_URL + '/api/auth/callback/discord'
        })
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
        throw new Error(tokenData.error_description || 'Failed to exchange code');
    }

    // Get user profile
    const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: {
            'Authorization': `Bearer ${tokenData.access_token}`
        }
    });

    const userData = await userResponse.json();

    return {
        id: userData.id,
        email: userData.email,
        name: userData.global_name || userData.username,
        username: userData.username,
        avatar_url: userData.avatar ? 
            `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : 
            null,
        provider_data: userData
    };
}

module.exports = router;