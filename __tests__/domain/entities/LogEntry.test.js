const LogEntry = require('../../../src/domain/entities/LogEntry');

describe('LogEntry Entity', () => {
  describe('constructor', () => {
    it('should create a LogEntry instance with all required properties', () => {
      const logData = {
        id: 'log-123',
        userId: 'user-456',
        supportTicketId: 'ticket-789',
        appVersion: '1.2.3',
        platform: 'darwin',
        arch: 'x64',
        logContent: 'Error: Something went wrong\n  at function()',
        metadata: { 
          severity: 'error',
          component: 'renderer',
          timestamp: 1234567890
        }
      };

      const logEntry = new LogEntry(logData);

      expect(logEntry.id).toBe('log-123');
      expect(logEntry.userId).toBe('user-456');
      expect(logEntry.supportTicketId).toBe('ticket-789');
      expect(logEntry.appVersion).toBe('1.2.3');
      expect(logEntry.platform).toBe('darwin');
      expect(logEntry.arch).toBe('x64');
      expect(logEntry.logContent).toBe('Error: Something went wrong\n  at function()');
      expect(logEntry.metadata).toEqual({
        severity: 'error',
        component: 'renderer',
        timestamp: 1234567890
      });
    });

    it('should set default values for optional properties', () => {
      const logData = {
        id: 'log-minimal',
        userId: 'user-001',
        supportTicketId: 'ticket-001',
        appVersion: '2.0.0',
        platform: 'win32',
        arch: 'x64',
        logContent: 'Application started successfully'
      };

      const logEntry = new LogEntry(logData);

      expect(logEntry.metadata).toEqual({});
      expect(logEntry.createdAt).toBeInstanceOf(Date);
    });

    it('should use provided createdAt when given', () => {
      const customDate = new Date('2024-03-15T14:30:00Z');
      
      const logData = {
        id: 'log-with-date',
        userId: 'user-002',
        supportTicketId: 'ticket-002',
        appVersion: '1.5.0',
        platform: 'linux',
        arch: 'arm64',
        logContent: 'Debug information',
        metadata: { debug: true },
        createdAt: customDate
      };

      const logEntry = new LogEntry(logData);

      expect(logEntry.createdAt).toBe(customDate);
      expect(logEntry.metadata).toEqual({ debug: true });
    });

    it('should handle different log content types', () => {
      const logContents = [
        'Simple log message',
        'Multi\nline\nlog\nmessage',
        JSON.stringify({ error: 'JSON formatted log', code: 500 }),
        'Log with special chars: @#$%^&*()',
        '',
        '   Whitespace padded log   ',
        'Very long log content: ' + 'a'.repeat(10000)
      ];

      logContents.forEach((content, index) => {
        const logEntry = new LogEntry({
          id: `log-content-${index}`,
          userId: 'user-test',
          supportTicketId: 'ticket-test',
          appVersion: '1.0.0',
          platform: 'darwin',
          arch: 'x64',
          logContent: content
        });

        expect(logEntry.logContent).toBe(content);
      });
    });

    it('should handle various metadata structures', () => {
      const metadataExamples = [
        { simple: 'value' },
        { nested: { level1: { level2: 'deep' } } },
        { array: [1, 2, 3] },
        { mixed: { str: 'text', num: 123, bool: true, arr: [1, 2], obj: {} } },
        { empty: {} },
        null,
        undefined
      ];

      metadataExamples.forEach((metadata, index) => {
        const logEntry = new LogEntry({
          id: `log-meta-${index}`,
          userId: 'user-meta',
          supportTicketId: 'ticket-meta',
          appVersion: '1.0.0',
          platform: 'win32',
          arch: 'x64',
          logContent: 'Test metadata',
          metadata
        });

        expect(logEntry.metadata).toEqual(metadata || {});
      });
    });
  });

  describe('toJSON', () => {
    it('should return a plain object representation of the log entry', () => {
      const logData = {
        id: 'log-json-1',
        userId: 'user-json',
        supportTicketId: 'ticket-json',
        appVersion: '3.2.1',
        platform: 'linux',
        arch: 'x64',
        logContent: 'Application log for JSON test',
        metadata: { 
          test: true,
          environment: 'production'
        }
      };

      const logEntry = new LogEntry(logData);
      const json = logEntry.toJSON();

      expect(json).toEqual({
        id: logData.id,
        userId: logData.userId,
        supportTicketId: logData.supportTicketId,
        appVersion: logData.appVersion,
        platform: logData.platform,
        arch: logData.arch,
        logContent: logData.logContent,
        metadata: logData.metadata,
        createdAt: logEntry.createdAt
      });
    });

    it('should include dates in JSON output', () => {
      const createdAt = new Date('2024-02-20T10:15:30Z');
      
      const logEntry = new LogEntry({
        id: 'log-date-test',
        userId: 'user-date',
        supportTicketId: 'ticket-date',
        appVersion: '1.0.0',
        platform: 'darwin',
        arch: 'arm64',
        logContent: 'Date test log',
        createdAt
      });

      const json = logEntry.toJSON();

      expect(json.createdAt).toBe(createdAt);
      expect(json.createdAt).toEqual(createdAt);
    });

    it('should handle stack traces in log content', () => {
      const stackTrace = `Error: Database connection failed
  at connect (db.js:45:15)
  at async initialize (app.js:23:5)
  at async main (index.js:10:3)
  at processTicksAndRejections (internal/process/task_queues.js:95:5)`;

      const logEntry = new LogEntry({
        id: 'log-stack',
        userId: 'user-error',
        supportTicketId: 'ticket-error',
        appVersion: '2.1.0',
        platform: 'win32',
        arch: 'x64',
        logContent: stackTrace,
        metadata: {
          errorCode: 'DB_CONN_FAIL',
          timestamp: Date.now()
        }
      });

      const json = logEntry.toJSON();
      expect(json.logContent).toBe(stackTrace);
      expect(json.logContent).toContain('Database connection failed');
      expect(json.logContent).toContain('db.js:45:15');
    });

    it('should preserve all properties when converting to JSON and back', () => {
      const logEntry = new LogEntry({
        id: 'full-test-log',
        userId: 'user-full',
        supportTicketId: 'ticket-full',
        appVersion: '5.4.3-beta.2',
        platform: 'linux',
        arch: 'x64',
        logContent: 'Complete log entry test with all fields',
        metadata: {
          session: 'abc123',
          tags: ['error', 'database', 'critical'],
          metrics: {
            cpu: 85.3,
            memory: 1024,
            disk: 45.6
          }
        }
      });

      const json = logEntry.toJSON();
      const jsonString = JSON.stringify(json);
      const parsed = JSON.parse(jsonString);

      expect(parsed.id).toBe(logEntry.id);
      expect(parsed.userId).toBe(logEntry.userId);
      expect(parsed.supportTicketId).toBe(logEntry.supportTicketId);
      expect(parsed.appVersion).toBe(logEntry.appVersion);
      expect(parsed.platform).toBe(logEntry.platform);
      expect(parsed.arch).toBe(logEntry.arch);
      expect(parsed.logContent).toBe(logEntry.logContent);
      expect(parsed.metadata).toEqual(logEntry.metadata);
    });
  });

  describe('edge cases', () => {
    it('should handle null and undefined values appropriately', () => {
      const logEntry = new LogEntry({
        id: null,
        userId: undefined,
        supportTicketId: null,
        appVersion: '1.0.0',
        platform: 'darwin',
        arch: 'x64',
        logContent: undefined
      });

      expect(logEntry.id).toBeNull();
      expect(logEntry.userId).toBeUndefined();
      expect(logEntry.supportTicketId).toBeNull();
      expect(logEntry.logContent).toBeUndefined();
    });

    it('should handle very large metadata objects', () => {
      const largeMetadata = {};
      for (let i = 0; i < 1000; i++) {
        largeMetadata[`key${i}`] = {
          value: `value${i}`,
          nested: {
            data: Math.random(),
            timestamp: Date.now()
          }
        };
      }

      const logEntry = new LogEntry({
        id: 'log-large-meta',
        userId: 'user-large',
        supportTicketId: 'ticket-large',
        appVersion: '1.0.0',
        platform: 'linux',
        arch: 'x64',
        logContent: 'Large metadata test',
        metadata: largeMetadata
      });

      expect(Object.keys(logEntry.metadata)).toHaveLength(1000);
      const json = logEntry.toJSON();
      expect(Object.keys(json.metadata)).toHaveLength(1000);
    });

    it('should handle Unicode and emoji in log content', () => {
      const unicodeContent = '日本語 中文 한국어 🚀 🎉 ⚡ Error: Failed to parse 你好';
      
      const logEntry = new LogEntry({
        id: 'log-unicode',
        userId: 'user-unicode',
        supportTicketId: 'ticket-unicode',
        appVersion: '1.0.0',
        platform: 'darwin',
        arch: 'x64',
        logContent: unicodeContent,
        metadata: {
          locale: 'ja-JP',
          emoji: '🔥'
        }
      });

      expect(logEntry.logContent).toBe(unicodeContent);
      expect(logEntry.metadata.emoji).toBe('🔥');
      
      const json = logEntry.toJSON();
      expect(json.logContent).toBe(unicodeContent);
      expect(json.metadata.emoji).toBe('🔥');
    });

    it('should handle different platform and architecture combinations', () => {
      const combinations = [
        { platform: 'darwin', arch: 'x64' },
        { platform: 'darwin', arch: 'arm64' },
        { platform: 'win32', arch: 'x64' },
        { platform: 'win32', arch: 'ia32' },
        { platform: 'linux', arch: 'x64' },
        { platform: 'linux', arch: 'arm64' },
        { platform: 'linux', arch: 'arm' }
      ];

      combinations.forEach(({ platform, arch }) => {
        const logEntry = new LogEntry({
          id: `log-${platform}-${arch}`,
          userId: 'user-platform',
          supportTicketId: 'ticket-platform',
          appVersion: '1.0.0',
          platform,
          arch,
          logContent: `Log from ${platform}/${arch}`
        });

        expect(logEntry.platform).toBe(platform);
        expect(logEntry.arch).toBe(arch);
      });
    });

    it('should handle version strings in various formats', () => {
      const versions = [
        '1.0.0',
        '2.3.4-beta.1',
        '3.0.0-rc.2',
        '0.0.1',
        '10.20.30',
        'v1.2.3',
        '1.2.3+build.123',
        '1.0.0-alpha.1+build.456'
      ];

      versions.forEach(version => {
        const logEntry = new LogEntry({
          id: `log-version-${version}`,
          userId: 'user-version',
          supportTicketId: 'ticket-version',
          appVersion: version,
          platform: 'linux',
          arch: 'x64',
          logContent: `Version ${version} log`
        });

        expect(logEntry.appVersion).toBe(version);
      });
    });
  });
});