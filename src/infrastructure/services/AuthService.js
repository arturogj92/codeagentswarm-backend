const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class AuthService {
    constructor() {
        // Initialize Supabase client
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
            throw new Error('Supabase credentials are required. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables');
        }
        
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );

        // JWT configuration
        this.jwtConfig = {
            access: {
                secret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'dev-secret-change-in-production',
                expiresIn: '15m'
            },
            refresh: {
                secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev-secret-change-in-production',
                expiresIn: '30d'
            }
        };
    }


    /**
     * Find or create user from OAuth provider data
     */
    async findOrCreateUser(profile, provider) {
        if (!this.supabase) {
            throw new Error('Supabase client not initialized. Please configure SUPABASE_URL and SUPABASE_SERVICE_KEY');
        }

        try {
            // Check if user exists with this provider
            let { data: existingUser, error: findError } = await this.supabase
                .from('users')
                .select('*')
                .eq('provider', provider)
                .eq('provider_id', profile.id)
                .single();

            if (existingUser && !findError) {
                // Update last login
                await this.supabase
                    .from('users')
                    .update({ 
                        last_login: new Date().toISOString(),
                        avatar_url: profile.avatar_url || profile.picture,
                        name: profile.name
                    })
                    .eq('id', existingUser.id);

                return existingUser;
            }

            // Check if user exists with same email (for account linking)
            let { data: emailUser } = await this.supabase
                .from('users')
                .select('*')
                .eq('email', profile.email)
                .single();

            if (emailUser) {
                // Link this provider to existing account
                console.log(`Linking ${provider} to existing account for ${profile.email}`);
                return emailUser;
            }

            // Create new user
            const newUser = {
                email: profile.email,
                name: profile.name || profile.username || profile.email.split('@')[0],
                username: profile.username || profile.login || null,
                avatar_url: profile.avatar_url || profile.picture || profile.image,
                provider: provider,
                provider_id: String(profile.id),
                provider_data: profile
            };

            const { data: createdUser, error: createError } = await this.supabase
                .from('users')
                .insert([newUser])
                .select()
                .single();

            if (createError) {
                console.error('Error creating user:', createError);
                throw new Error(`Failed to create user: ${createError.message}`);
            }

            return createdUser;
        } catch (error) {
            console.error('Error in findOrCreateUser:', error);
            throw error;
        }
    }

    /**
     * Generate JWT tokens
     */
    generateTokens(user) {
        const payload = {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar_url: user.avatar_url,
            provider: user.provider
        };

        const accessToken = jwt.sign(
            payload,
            this.jwtConfig.access.secret,
            { 
                expiresIn: this.jwtConfig.access.expiresIn,
                issuer: 'codeagentswarm',
                audience: 'codeagentswarm-desktop'
            }
        );

        const refreshToken = jwt.sign(
            { id: user.id },
            this.jwtConfig.refresh.secret,
            { 
                expiresIn: this.jwtConfig.refresh.expiresIn,
                issuer: 'codeagentswarm'
            }
        );

        return { accessToken, refreshToken };
    }

    /**
     * Create session in database
     */
    async createSession(userId, tokens, metadata = {}) {
        try {
            // Hash tokens for storage
            const tokenHash = await bcrypt.hash(tokens.accessToken, 10);
            const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);

            const session = {
                user_id: userId,
                token_hash: tokenHash,
                refresh_token_hash: refreshTokenHash,
                device_info: metadata.device_info || {},
                ip_address: metadata.ip_address || null,
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
            };

            const { data, error } = await this.supabase
                .from('sessions')
                .insert([session])
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error creating session:', error);
            throw error;
        }
    }

    /**
     * Verify JWT token
     */
    verifyAccessToken(token) {
        try {
            return jwt.verify(token, this.jwtConfig.access.secret, {
                issuer: 'codeagentswarm',
                audience: 'codeagentswarm-desktop'
            });
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token expired');
            }
            throw new Error('Invalid token');
        }
    }

    /**
     * Refresh access token
     */
    async refreshAccessToken(refreshToken) {
        try {
            // Verify refresh token
            const decoded = jwt.verify(refreshToken, this.jwtConfig.refresh.secret);

            // Get user from database
            const { data: user, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', decoded.id)
                .single();

            if (error || !user) {
                throw new Error('User not found');
            }

            // Generate new access token
            const payload = {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar_url: user.avatar_url,
                provider: user.provider
            };

            const newAccessToken = jwt.sign(
                payload,
                this.jwtConfig.access.secret,
                { 
                    expiresIn: this.jwtConfig.access.expiresIn,
                    issuer: 'codeagentswarm',
                    audience: 'codeagentswarm-desktop'
                }
            );

            return { accessToken: newAccessToken, user };
        } catch (error) {
            throw new Error('Invalid refresh token');
        }
    }

    /**
     * Logout - invalidate session
     */
    async logout(token) {
        try {
            const tokenHash = await bcrypt.hash(token, 10);
            
            const { error } = await this.supabase
                .from('sessions')
                .delete()
                .eq('token_hash', tokenHash);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Error during logout:', error);
            throw error;
        }
    }
}

module.exports = AuthService;