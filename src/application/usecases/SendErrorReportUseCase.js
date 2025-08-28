const Sentry = require('@sentry/node');

class SendErrorReportUseCase {
  constructor() {
    // Initialize Sentry for the backend
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'production',
        serverName: 'codeagentswarm-backend',
        beforeSend(event, hint) {
          // Add backend context
          event.tags = {
            ...event.tags,
            source: 'proxy',
          };
          return event;
        },
      });
      this.sentryEnabled = true;
    } else {
      console.warn('[Sentry] No DSN configured, error reporting disabled');
      this.sentryEnabled = false;
    }
  }

  async execute(errorData) {
    if (!this.sentryEnabled) {
      return { 
        success: false, 
        message: 'Error reporting not configured' 
      };
    }

    try {
      const {
        error,
        level = 'error',
        tags = {},
        context = {},
        user = {},
        breadcrumbs = [],
        appVersion,
        platform,
        environment
      } = errorData;

      // Create Sentry scope
      await Sentry.withScope(async (scope) => {
        // Set level
        scope.setLevel(level);

        // Set environment in Sentry
        scope.setTag('environment', environment || 'unknown');
        
        // Set tags
        scope.setTag('app_version', appVersion);
        scope.setTag('platform', platform);
        scope.setTag('app_environment', environment);
        
        // Add special handling for development
        if (environment === 'development' || tags.is_dev) {
          scope.setTag('is_development', true);
          scope.setTag('source', 'dev_machine');
          // Lower level for dev errors to separate them
          if (level === 'error') {
            scope.setLevel('warning');
          }
        }
        
        Object.entries(tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });

        // Set context
        scope.setContext('app_info', {
          version: appVersion,
          platform,
          environment,
          ...context
        });

        // Set user (anonymized)
        if (user.id) {
          scope.setUser({
            id: user.id,
            // Don't send email or other PII unless explicitly needed
          });
        }

        // Add breadcrumbs
        breadcrumbs.forEach(breadcrumb => {
          Sentry.addBreadcrumb(breadcrumb);
        });

        // Capture the error
        if (error.stack) {
          // It's an Error object
          const sentryError = new Error(error.message);
          sentryError.stack = error.stack;
          sentryError.name = error.name;
          Sentry.captureException(sentryError);
        } else if (error.message) {
          // It's a message
          Sentry.captureMessage(error.message, level);
        } else {
          // Generic error
          Sentry.captureException(new Error(JSON.stringify(error)));
        }
      });

      // Ensure events are sent
      await Sentry.flush(2000);

      return { 
        success: true, 
        message: 'Error reported successfully' 
      };
    } catch (error) {
      console.error('[Sentry] Failed to send error report:', error);
      return { 
        success: false, 
        message: 'Failed to send error report',
        error: error.message 
      };
    }
  }
}

module.exports = SendErrorReportUseCase;