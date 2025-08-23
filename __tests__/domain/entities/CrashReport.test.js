const CrashReport = require('../../../src/domain/entities/CrashReport');

describe('CrashReport Entity', () => {
  describe('constructor', () => {
    it('should create a CrashReport instance with all required properties', () => {
      const crashData = {
        id: 'crash-123',
        userId: 'user-456',
        appVersion: '1.2.3',
        platform: 'darwin',
        arch: 'x64',
        crashDumpUrl: 'https://storage.example.com/crashes/dump-123.dmp',
        errorMessage: 'Uncaught TypeError: Cannot read property of undefined',
        stackTrace: 'at Object.handleClick (renderer.js:145:23)\n  at HTMLButtonElement.<anonymous>',
        metadata: {
          memoryUsage: 524288000,
          cpuUsage: 45.2,
          uptime: 3600
        }
      };

      const crashReport = new CrashReport(crashData);

      expect(crashReport.id).toBe('crash-123');
      expect(crashReport.userId).toBe('user-456');
      expect(crashReport.appVersion).toBe('1.2.3');
      expect(crashReport.platform).toBe('darwin');
      expect(crashReport.arch).toBe('x64');
      expect(crashReport.crashDumpUrl).toBe('https://storage.example.com/crashes/dump-123.dmp');
      expect(crashReport.errorMessage).toBe('Uncaught TypeError: Cannot read property of undefined');
      expect(crashReport.stackTrace).toBe('at Object.handleClick (renderer.js:145:23)\n  at HTMLButtonElement.<anonymous>');
      expect(crashReport.metadata).toEqual({
        memoryUsage: 524288000,
        cpuUsage: 45.2,
        uptime: 3600
      });
    });

    it('should set default values for optional properties', () => {
      const crashData = {
        id: 'crash-minimal',
        userId: 'user-001',
        appVersion: '2.0.0',
        platform: 'win32',
        arch: 'x64',
        crashDumpUrl: 'https://storage.example.com/crashes/dump-minimal.dmp',
        errorMessage: 'Application crashed',
        stackTrace: 'No stack trace available'
      };

      const crashReport = new CrashReport(crashData);

      expect(crashReport.metadata).toEqual({});
      expect(crashReport.createdAt).toBeInstanceOf(Date);
    });

    it('should use provided createdAt when given', () => {
      const customDate = new Date('2024-04-10T08:45:00Z');
      
      const crashData = {
        id: 'crash-with-date',
        userId: 'user-002',
        appVersion: '1.5.0',
        platform: 'linux',
        arch: 'arm64',
        crashDumpUrl: 'https://storage.example.com/crashes/dump-date.dmp',
        errorMessage: 'Segmentation fault',
        stackTrace: 'Core dumped',
        metadata: { signal: 11 },
        createdAt: customDate
      };

      const crashReport = new CrashReport(crashData);

      expect(crashReport.createdAt).toBe(customDate);
      expect(crashReport.metadata).toEqual({ signal: 11 });
    });

    it('should handle different error message types', () => {
      const errorMessages = [
        'Simple error',
        'Error: Multi\nline\nerror\nmessage',
        'RangeError: Maximum call stack size exceeded',
        'SyntaxError: Unexpected token < in JSON at position 0',
        'TypeError: Cannot convert undefined or null to object',
        'ReferenceError: window is not defined',
        '',
        null,
        undefined
      ];

      errorMessages.forEach((errorMessage, index) => {
        const crashReport = new CrashReport({
          id: `crash-error-${index}`,
          userId: 'user-test',
          appVersion: '1.0.0',
          platform: 'darwin',
          arch: 'x64',
          crashDumpUrl: `https://storage.example.com/crashes/dump-${index}.dmp`,
          errorMessage,
          stackTrace: 'Stack trace here'
        });

        expect(crashReport.errorMessage).toBe(errorMessage);
      });
    });

    it('should handle complex stack traces', () => {
      const complexStackTrace = `Error: Connection timeout
  at Timeout._onTimeout (/app/src/network/connection.js:234:19)
  at listOnTimeout (internal/timers.js:554:17)
  at processTimers (internal/timers.js:497:7)
  at async NetworkManager.connect (/app/src/network/manager.js:45:5)
  at async Application.initialize (/app/src/app.js:123:3)
  at async main (/app/src/index.js:10:3)
  --- Previous error ---
  at Socket.<anonymous> (/app/src/network/socket.js:78:15)
  at Socket.emit (events.js:315:20)
  at TCP.<anonymous> (net.js:673:12)`;

      const crashReport = new CrashReport({
        id: 'crash-complex-stack',
        userId: 'user-stack',
        appVersion: '3.0.0',
        platform: 'linux',
        arch: 'x64',
        crashDumpUrl: 'https://storage.example.com/crashes/complex.dmp',
        errorMessage: 'Connection timeout',
        stackTrace: complexStackTrace
      });

      expect(crashReport.stackTrace).toBe(complexStackTrace);
      expect(crashReport.stackTrace).toContain('Connection timeout');
      expect(crashReport.stackTrace).toContain('Previous error');
      expect(crashReport.stackTrace).toContain('/app/src/network/connection.js:234:19');
    });

    it('should handle various metadata structures', () => {
      const metadataExamples = [
        { 
          systemInfo: {
            os: 'Darwin 21.6.0',
            nodeVersion: '16.14.0',
            electronVersion: '22.0.0'
          }
        },
        {
          performance: {
            memoryUsage: { rss: 104857600, heapTotal: 52428800, heapUsed: 26214400 },
            cpuUsage: { user: 1234567, system: 987654 }
          }
        },
        {
          userActions: ['click:button', 'navigate:page', 'submit:form'],
          timestamp: Date.now(),
          sessionId: 'sess-abc-123'
        },
        {},
        null,
        undefined
      ];

      metadataExamples.forEach((metadata, index) => {
        const crashReport = new CrashReport({
          id: `crash-meta-${index}`,
          userId: 'user-meta',
          appVersion: '1.0.0',
          platform: 'win32',
          arch: 'x64',
          crashDumpUrl: `https://storage.example.com/crashes/meta-${index}.dmp`,
          errorMessage: 'Test crash',
          stackTrace: 'Test stack',
          metadata
        });

        expect(crashReport.metadata).toEqual(metadata || {});
      });
    });
  });

  describe('toJSON', () => {
    it('should return a plain object representation of the crash report', () => {
      const crashData = {
        id: 'crash-json-1',
        userId: 'user-json',
        appVersion: '3.2.1',
        platform: 'linux',
        arch: 'x64',
        crashDumpUrl: 'https://storage.example.com/crashes/json-1.dmp',
        errorMessage: 'Test error for JSON',
        stackTrace: 'at testFunction()',
        metadata: { 
          test: true,
          environment: 'production'
        }
      };

      const crashReport = new CrashReport(crashData);
      const json = crashReport.toJSON();

      expect(json).toEqual({
        id: crashData.id,
        userId: crashData.userId,
        appVersion: crashData.appVersion,
        platform: crashData.platform,
        arch: crashData.arch,
        crashDumpUrl: crashData.crashDumpUrl,
        errorMessage: crashData.errorMessage,
        stackTrace: crashData.stackTrace,
        metadata: crashData.metadata,
        createdAt: crashReport.createdAt
      });
    });

    it('should include dates in JSON output', () => {
      const createdAt = new Date('2024-05-15T16:20:45Z');
      
      const crashReport = new CrashReport({
        id: 'crash-date-test',
        userId: 'user-date',
        appVersion: '1.0.0',
        platform: 'darwin',
        arch: 'arm64',
        crashDumpUrl: 'https://storage.example.com/crashes/date.dmp',
        errorMessage: 'Date test crash',
        stackTrace: 'Stack trace',
        createdAt
      });

      const json = crashReport.toJSON();

      expect(json.createdAt).toBe(createdAt);
      expect(json.createdAt).toEqual(createdAt);
    });

    it('should preserve all properties when converting to JSON and back', () => {
      const crashReport = new CrashReport({
        id: 'full-test-crash',
        userId: 'user-full',
        appVersion: '5.4.3-beta.2',
        platform: 'win32',
        arch: 'ia32',
        crashDumpUrl: 'https://storage.example.com/crashes/full-test.dmp',
        errorMessage: 'Complete crash report test with all fields',
        stackTrace: 'Full stack trace here',
        metadata: {
          session: 'xyz789',
          flags: ['debug', 'verbose'],
          system: {
            totalMemory: 8589934592,
            freeMemory: 2147483648,
            cpuCores: 8
          }
        }
      });

      const json = crashReport.toJSON();
      const jsonString = JSON.stringify(json);
      const parsed = JSON.parse(jsonString);

      expect(parsed.id).toBe(crashReport.id);
      expect(parsed.userId).toBe(crashReport.userId);
      expect(parsed.appVersion).toBe(crashReport.appVersion);
      expect(parsed.platform).toBe(crashReport.platform);
      expect(parsed.arch).toBe(crashReport.arch);
      expect(parsed.crashDumpUrl).toBe(crashReport.crashDumpUrl);
      expect(parsed.errorMessage).toBe(crashReport.errorMessage);
      expect(parsed.stackTrace).toBe(crashReport.stackTrace);
      expect(parsed.metadata).toEqual(crashReport.metadata);
    });
  });

  describe('edge cases', () => {
    it('should handle null and undefined values appropriately', () => {
      const crashReport = new CrashReport({
        id: null,
        userId: undefined,
        appVersion: '1.0.0',
        platform: 'darwin',
        arch: 'x64',
        crashDumpUrl: null,
        errorMessage: undefined,
        stackTrace: null
      });

      expect(crashReport.id).toBeNull();
      expect(crashReport.userId).toBeUndefined();
      expect(crashReport.crashDumpUrl).toBeNull();
      expect(crashReport.errorMessage).toBeUndefined();
      expect(crashReport.stackTrace).toBeNull();
    });

    it('should handle very long stack traces', () => {
      const longStackLines = [];
      for (let i = 0; i < 500; i++) {
        longStackLines.push(`  at function${i} (/path/to/file${i}.js:${i}:${i % 50})`);
      }
      const longStackTrace = longStackLines.join('\n');

      const crashReport = new CrashReport({
        id: 'crash-long-stack',
        userId: 'user-long',
        appVersion: '1.0.0',
        platform: 'linux',
        arch: 'x64',
        crashDumpUrl: 'https://storage.example.com/crashes/long.dmp',
        errorMessage: 'Stack overflow',
        stackTrace: longStackTrace
      });

      expect(crashReport.stackTrace).toBe(longStackTrace);
      expect(crashReport.stackTrace.split('\n')).toHaveLength(500);
    });

    it('should handle various URL formats for crash dumps', () => {
      const urlFormats = [
        'https://storage.example.com/crashes/dump.dmp',
        'http://localhost:3000/dumps/test.dmp',
        's3://bucket-name/path/to/dump.dmp',
        'file:///var/dumps/crash.dmp',
        '/relative/path/to/dump.dmp',
        'https://cdn.example.com/dumps/2024/04/15/crash-abc123.dmp?signature=xyz',
        ''
      ];

      urlFormats.forEach((url, index) => {
        const crashReport = new CrashReport({
          id: `crash-url-${index}`,
          userId: 'user-url',
          appVersion: '1.0.0',
          platform: 'win32',
          arch: 'x64',
          crashDumpUrl: url,
          errorMessage: 'URL test',
          stackTrace: 'Stack'
        });

        expect(crashReport.crashDumpUrl).toBe(url);
      });
    });

    it('should handle different platform and architecture combinations', () => {
      const combinations = [
        { platform: 'darwin', arch: 'x64' },
        { platform: 'darwin', arch: 'arm64' },
        { platform: 'win32', arch: 'x64' },
        { platform: 'win32', arch: 'ia32' },
        { platform: 'win32', arch: 'arm64' },
        { platform: 'linux', arch: 'x64' },
        { platform: 'linux', arch: 'arm64' },
        { platform: 'linux', arch: 'arm' },
        { platform: 'freebsd', arch: 'x64' }
      ];

      combinations.forEach(({ platform, arch }) => {
        const crashReport = new CrashReport({
          id: `crash-${platform}-${arch}`,
          userId: 'user-platform',
          appVersion: '1.0.0',
          platform,
          arch,
          crashDumpUrl: `https://storage.example.com/crashes/${platform}-${arch}.dmp`,
          errorMessage: `Crash on ${platform}/${arch}`,
          stackTrace: 'Platform specific stack'
        });

        expect(crashReport.platform).toBe(platform);
        expect(crashReport.arch).toBe(arch);
      });
    });

    it('should handle error messages with special characters and encoding', () => {
      const specialErrorMessages = [
        'Error with "quotes" and \'apostrophes\'',
        'Error with\ttabs\nand\rnewlines',
        'Error with Unicode: 你好世界 🌍 ñ é ü',
        'Error with HTML: <script>alert("XSS")</script>',
        'Error with regex chars: [a-z]+ (.*) \\d{3}',
        'Error with JSON: {"error": "nested", "code": 500}',
        'Error with backslashes: C:\\Windows\\System32\\error.dll'
      ];

      specialErrorMessages.forEach((errorMessage, index) => {
        const crashReport = new CrashReport({
          id: `crash-special-${index}`,
          userId: 'user-special',
          appVersion: '1.0.0',
          platform: 'linux',
          arch: 'x64',
          crashDumpUrl: 'https://storage.example.com/crashes/special.dmp',
          errorMessage,
          stackTrace: 'Stack trace'
        });

        expect(crashReport.errorMessage).toBe(errorMessage);
        const json = crashReport.toJSON();
        expect(json.errorMessage).toBe(errorMessage);
      });
    });
  });
});