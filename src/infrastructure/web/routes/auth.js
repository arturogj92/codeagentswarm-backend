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

        // Always show a page with automatic redirect
        // This works better than direct redirects for custom protocol handlers
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Welcome to CodeAgentSwarm</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif; 
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                        min-height: 100vh; 
                        background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%);
                        color: white;
                        overflow: hidden;
                    }
                    
                    /* Animated background */
                    body::before {
                        content: '';
                        position: fixed;
                        width: 200%;
                        height: 200%;
                        top: -50%;
                        left: -50%;
                        background-image: 
                            radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px),
                            radial-gradient(circle, rgba(103, 126, 234, 0.05) 2px, transparent 2px);
                        background-size: 50px 50px, 100px 100px;
                        animation: bgMove 60s linear infinite;
                    }
                    
                    @keyframes bgMove {
                        0% { transform: translate(0, 0); }
                        100% { transform: translate(50px, 50px); }
                    }
                    .container { 
                        background: rgba(30, 30, 40, 0.95);
                        backdrop-filter: blur(20px);
                        padding: 3rem;
                        border-radius: 24px; 
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        box-shadow: 
                            0 20px 60px rgba(0,0,0,0.5),
                            0 0 120px rgba(103, 126, 234, 0.2);
                        max-width: 450px;
                        width: 90%;
                        text-align: center;
                        position: relative;
                        z-index: 1;
                        animation: slideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                    }
                    
                    @keyframes slideUp {
                        from {
                            opacity: 0;
                            transform: translateY(40px) scale(0.95);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0) scale(1);
                        }
                    }
                    h1 { 
                        color: #ffffff;
                        font-size: 2rem;
                        font-weight: 700;
                        margin-bottom: 0.5rem;
                        letter-spacing: -0.02em;
                    }
                    
                    .subtitle {
                        color: #94a3b8;
                        font-size: 1rem;
                        margin-bottom: 2rem;
                    }
                    .user-card {
                        background: linear-gradient(135deg, #1e293b, #334155);
                        border: 1px solid rgba(67, 56, 202, 0.3);
                        padding: 1.5rem;
                        border-radius: 16px;
                        margin: 2rem 0;
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                        animation: cardFloat 3s ease-in-out infinite;
                    }
                    
                    @keyframes cardFloat {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-5px); }
                    }
                    .avatar { 
                        width: 80px; 
                        height: 80px; 
                        border-radius: 50%; 
                        margin: 0 auto 1rem;
                        border: 4px solid rgba(255, 255, 255, 0.3);
                        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                    }
                    
                    .user-name {
                        font-size: 1.25rem;
                        font-weight: 600;
                        margin-bottom: 0.25rem;
                    }
                    
                    .user-email {
                        font-size: 0.9rem;
                        opacity: 0.9;
                    }
                    .btn-primary { 
                        background: linear-gradient(135deg, #4338ca, #5b21b6);
                        color: white; 
                        border: 1px solid rgba(255, 255, 255, 0.1); 
                        padding: 1rem 2.5rem;
                        border-radius: 12px;
                        cursor: pointer; 
                        font-size: 1rem;
                        font-weight: 600;
                        margin-top: 1.5rem;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        box-shadow: 0 4px 15px rgba(67, 56, 202, 0.3);
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .btn-primary::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: left 0.5s ease;
                    }
                    
                    .btn-primary:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(67, 56, 202, 0.5);
                        background: linear-gradient(135deg, #4f46e5, #6d28d9);
                    }
                    
                    .btn-primary:hover::before {
                        left: 100%;
                    }
                    
                    .btn-primary:active {
                        transform: translateY(0);
                    }
                    .loading-container {
                        margin: 2rem 0;
                        height: 60px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .loading-dots {
                        display: flex;
                        gap: 8px;
                        margin-bottom: 1rem;
                    }
                    
                    .dot {
                        width: 12px;
                        height: 12px;
                        background: linear-gradient(135deg, #4338ca, #5b21b6);
                        border-radius: 50%;
                        animation: dotPulse 1.4s ease-in-out infinite;
                    }
                    
                    .dot:nth-child(2) { animation-delay: 0.2s; }
                    .dot:nth-child(3) { animation-delay: 0.4s; }
                    
                    @keyframes dotPulse {
                        0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
                        40% { transform: scale(1.2); opacity: 1; }
                    }
                    .status { 
                        color: #94a3b8;
                        font-size: 0.95rem;
                        transition: all 0.3s ease;
                    }
                    
                    .footer-text {
                        color: #64748b;
                        font-size: 0.85rem;
                        margin-top: 2rem;
                        line-height: 1.5;
                    }
                    
                    /* Logo styles */
                    .logo-container {
                        width: 100px;
                        height: 100px;
                        margin: 0 auto 1.5rem;
                        position: relative;
                        animation: logoFloat 3s ease-in-out infinite;
                    }
                    
                    @keyframes logoFloat {
                        0%, 100% { transform: translateY(0) rotate(0deg); }
                        50% { transform: translateY(-10px) rotate(5deg); }
                    }
                    
                    .logo-image {
                        width: 100%;
                        height: 100%;
                        filter: drop-shadow(0 10px 30px rgba(67, 56, 202, 0.4));
                    }
                    
                    /* Success animation checkmark */
                    .success-icon {
                        width: 80px;
                        height: 80px;
                        margin: 0 auto 1.5rem;
                        background: linear-gradient(135deg, #4338ca, #5b21b6);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        animation: successPulse 2s ease-in-out infinite;
                    }
                    
                    @keyframes successPulse {
                        0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(67, 56, 202, 0.4); }
                        50% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(67, 56, 202, 0); }
                    }
                    
                    .checkmark {
                        display: inline-block;
                        width: 40px;
                        height: 40px;
                        stroke-width: 3;
                        stroke: white;
                        stroke-miterlimit: 10;
                    }
                    
                    .checkmark-circle {
                        stroke-dasharray: 166;
                        stroke-dashoffset: 166;
                        stroke-width: 3;
                        stroke-miterlimit: 10;
                        stroke: white;
                        fill: none;
                        animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
                    }
                    
                    .checkmark-check {
                        transform-origin: 50% 50%;
                        stroke-dasharray: 48;
                        stroke-dashoffset: 48;
                        animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards;
                    }
                    
                    @keyframes stroke {
                        100% { stroke-dashoffset: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo-container">
                        <img class="logo-image" src="/images/logo.png" alt="CodeAgentSwarm Logo" />
                    </div>
                    
                    <h1>Welcome Back!</h1>
                    <p class="subtitle">Authentication successful</p>
                    
                    <div class="user-card">
                        ${user.avatar_url ? `<img src="${user.avatar_url}" alt="Avatar" class="avatar">` : ''}
                        <div class="user-name">${user.name || user.email.split('@')[0]}</div>
                        <div class="user-email">${user.email}</div>
                    </div>
                    
                    <div class="loading-container">
                        <div class="loading-dots">
                            <div class="dot"></div>
                            <div class="dot"></div>
                            <div class="dot"></div>
                        </div>
                        <p class="status">Launching CodeAgentSwarm...</p>
                    </div>
                    
                    <button class="btn-primary" onclick="openApp()">
                        Open CodeAgentSwarm Now
                    </button>
                    
                    <p class="footer-text">
                        The app should open automatically.<br>
                        If it doesn't, click the button above.
                    </p>
                </div>
                <script>
                    function openApp() {
                        // Try to open the deep link
                        window.location.href = '${redirectUrl}';
                        
                        // Also try with a hidden iframe (backup method)
                        setTimeout(() => {
                            const iframe = document.createElement('iframe');
                            iframe.style.display = 'none';
                            iframe.src = '${redirectUrl}';
                            document.body.appendChild(iframe);
                            setTimeout(() => document.body.removeChild(iframe), 1000);
                        }, 500);
                    }
                    
                    // For development: Also save auth data to localStorage for manual retrieval
                    const authData = {
                        token: '${tokens.accessToken}',
                        refreshToken: '${tokens.refreshToken}',
                        user: ${JSON.stringify({
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            avatar_url: user.avatar_url
                        })}
                    };
                    localStorage.setItem('codeagentswarm_auth', JSON.stringify(authData));
                    
                    // Try to open the app automatically once
                    setTimeout(openApp, 1000);
                    
                    // Update status message after a few seconds
                    setTimeout(() => {
                        document.querySelector('.loading-dots').style.display = 'none';
                        document.querySelector('.status').innerHTML = 'CodeAgentSwarm is opening...<br><small style="color: #a0aec0;">If not, click the button below</small>';
                    }, 3000);
                    
                    // Final status update
                    setTimeout(() => {
                        document.querySelector('.status').innerHTML = 'You can close this window<br><small style="color: #a0aec0;">CodeAgentSwarm should be open</small>';
                    }, 5000);
                </script>
            </body>
            </html>
        `);
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