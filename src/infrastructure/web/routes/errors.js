const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const SendErrorReportUseCase = require('../../../application/usecases/SendErrorReportUseCase');

// Initialize use case
const sendErrorReportUseCase = new SendErrorReportUseCase();

// Rate limiting map (simple in-memory for now, use Redis in production)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // Max 10 errors per minute per client

// Middleware to validate app signature
const validateAppSignature = (req, res, next) => {
  const signature = req.headers['x-app-signature'];
  const timestamp = req.headers['x-timestamp'];
  const appVersion = req.headers['x-app-version'];
  
  // Check required headers
  if (!signature || !timestamp || !appVersion) {
    return res.status(401).json({ 
      error: 'Missing authentication headers' 
    });
  }

  // Check timestamp (prevent replay attacks)
  const requestTime = parseInt(timestamp);
  const currentTime = Date.now();
  const timeDiff = Math.abs(currentTime - requestTime);
  
  if (timeDiff > 300000) { // 5 minutes
    return res.status(401).json({ 
      error: 'Request timestamp too old' 
    });
  }

  // Verify signature
  const secret = process.env.APP_SECRET || 'codeagentswarm-secret-2024';
  const payload = `${timestamp}:${appVersion}:${JSON.stringify(req.body)}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).json({ 
      error: 'Invalid signature' 
    });
  }

  next();
};

// Rate limiting middleware
const rateLimit = (req, res, next) => {
  const clientId = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  
  // Clean old entries
  for (const [key, data] of rateLimitMap.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(key);
    }
  }
  
  // Check rate limit
  if (rateLimitMap.has(clientId)) {
    const clientData = rateLimitMap.get(clientId);
    
    if (now - clientData.windowStart < RATE_LIMIT_WINDOW) {
      if (clientData.count >= RATE_LIMIT_MAX) {
        return res.status(429).json({ 
          error: 'Too many requests. Please try again later.' 
        });
      }
      clientData.count++;
    } else {
      // Reset window
      clientData.windowStart = now;
      clientData.count = 1;
    }
  } else {
    rateLimitMap.set(clientId, {
      windowStart: now,
      count: 1
    });
  }
  
  next();
};

// POST /api/errors/report
router.post('/report', validateAppSignature, rateLimit, async (req, res) => {
  try {
    const {
      error,
      level,
      tags,
      context,
      user,
      breadcrumbs,
      environment
    } = req.body;

    // Get app info from headers
    const appVersion = req.headers['x-app-version'];
    const platform = req.headers['x-platform'] || 'unknown';

    // Validate required fields
    if (!error) {
      return res.status(400).json({ 
        error: 'Error data is required' 
      });
    }

    // Send to Sentry through use case
    const result = await sendErrorReportUseCase.execute({
      error,
      level,
      tags,
      context,
      user,
      breadcrumbs,
      appVersion,
      platform,
      environment
    });

    if (result.success) {
      res.json({ 
        success: true, 
        message: result.message 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: result.message 
      });
    }
  } catch (error) {
    console.error('[Errors API] Error:', error);
    res.status(500).json({ 
      error: 'Failed to process error report' 
    });
  }
});

// GET /api/errors/health
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    sentryEnabled: !!process.env.SENTRY_DSN,
    rateLimit: {
      window: RATE_LIMIT_WINDOW,
      maxRequests: RATE_LIMIT_MAX
    }
  });
});

module.exports = router;