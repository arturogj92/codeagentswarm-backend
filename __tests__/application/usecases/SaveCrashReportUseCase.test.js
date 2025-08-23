const SaveCrashReportUseCase = require('../../../src/application/usecases/SaveCrashReportUseCase');
const CrashReport = require('../../../src/domain/entities/CrashReport');

// Mock uuid module
jest.mock('uuid', () => ({
  v4: jest.fn()
}));

const { v4: uuidv4 } = require('uuid');

describe('SaveCrashReportUseCase', () => {
  let useCase;
  let mockCrashReportRepository;
  let mockStoragePort;
  let originalEnv;

  beforeEach(() => {
    mockCrashReportRepository = {
      saveCrashReport: jest.fn()
    };
    mockStoragePort = {
      uploadFile: jest.fn()
    };
    useCase = new SaveCrashReportUseCase(mockCrashReportRepository, mockStoragePort);
    
    // Store original env and set default
    originalEnv = process.env.CRASH_REPORTS_BUCKET;
    delete process.env.CRASH_REPORTS_BUCKET; // Clear it to use default
    
    // Mock Date methods
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-04-20T14:30:00Z'));
    
    // Mock Date.now() explicitly
    jest.spyOn(Date, 'now').mockReturnValue(1713622200000);
    
    // Mock uuid
    uuidv4.mockReturnValue('abcdef12-3456-7890-abcd-ef1234567890');
  });

  afterEach(() => {
    jest.useRealTimers();
    if (originalEnv !== undefined) {
      process.env.CRASH_REPORTS_BUCKET = originalEnv;
    } else {
      delete process.env.CRASH_REPORTS_BUCKET;
    }
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should save crash report with crash dump successfully', async () => {
      const crashDumpBuffer = Buffer.from('binary crash dump data');
      const crashData = {
        userId: 'user-123',
        appVersion: '1.2.3',
        platform: 'darwin',
        arch: 'x64',
        crashDump: crashDumpBuffer,
        errorMessage: 'Segmentation fault',
        stackTrace: 'at main() line 42',
        metadata: { signal: 11, pid: 12345 }
      };

      mockCrashReportRepository.saveCrashReport.mockResolvedValue({
        id: 'crash-report-id-123'
      });

      const result = await useCase.execute(crashData);

      // Check result
      expect(result.reportId).toBe('crash-report-id-123');
      expect(result.message).toBe('Crash report saved successfully');

      // Check storage upload
      expect(mockStoragePort.uploadFile).toHaveBeenCalledWith(
        'crash-reports',
        'crash-reports/2024/4/crash_abcdef12-3456-7890-abcd-ef1234567890_1713622200000.dmp',
        crashDumpBuffer,
        { contentType: 'application/octet-stream' }
      );

      // Check database save
      expect(mockCrashReportRepository.saveCrashReport).toHaveBeenCalledWith(
        expect.any(CrashReport)
      );

      const savedCrashReport = mockCrashReportRepository.saveCrashReport.mock.calls[0][0];
      expect(savedCrashReport.userId).toBe('user-123');
      expect(savedCrashReport.appVersion).toBe('1.2.3');
      expect(savedCrashReport.platform).toBe('darwin');
      expect(savedCrashReport.arch).toBe('x64');
      expect(savedCrashReport.crashDumpUrl).toBe('crash-reports/2024/4/crash_abcdef12-3456-7890-abcd-ef1234567890_1713622200000.dmp');
      expect(savedCrashReport.errorMessage).toBe('Segmentation fault');
      expect(savedCrashReport.stackTrace).toBe('at main() line 42');
      expect(savedCrashReport.metadata).toEqual({ signal: 11, pid: 12345 });
    });

    it('should save crash report without crash dump', async () => {
      const crashData = {
        userId: 'user-456',
        appVersion: '2.0.0',
        platform: 'win32',
        arch: 'x64',
        crashDump: null,
        errorMessage: 'Unhandled exception',
        stackTrace: 'at Object.handleError()',
        metadata: { type: 'exception' }
      };

      mockCrashReportRepository.saveCrashReport.mockResolvedValue({
        id: 'crash-report-id-456'
      });

      const result = await useCase.execute(crashData);

      // Check that no storage upload was made
      expect(mockStoragePort.uploadFile).not.toHaveBeenCalled();

      // Check database save
      const savedCrashReport = mockCrashReportRepository.saveCrashReport.mock.calls[0][0];
      expect(savedCrashReport.crashDumpUrl).toBeNull();
      expect(savedCrashReport.errorMessage).toBe('Unhandled exception');
    });

    it('should use custom CRASH_REPORTS_BUCKET environment variable when set', async () => {
      process.env.CRASH_REPORTS_BUCKET = 'custom-crash-bucket';

      const crashData = {
        userId: 'user-env',
        appVersion: '3.0.0',
        platform: 'linux',
        arch: 'x64',
        crashDump: Buffer.from('crash data'),
        errorMessage: 'Core dumped',
        stackTrace: 'Stack trace',
        metadata: {}
      };

      mockCrashReportRepository.saveCrashReport.mockResolvedValue({
        id: 'crash-report-id-env'
      });

      await useCase.execute(crashData);

      expect(mockStoragePort.uploadFile).toHaveBeenCalledWith(
        'custom-crash-bucket',
        expect.any(String),
        expect.any(Buffer),
        { contentType: 'application/octet-stream' }
      );
    });

    it('should handle large crash dumps', async () => {
      const largeCrashDump = Buffer.alloc(10 * 1024 * 1024); // 10MB
      largeCrashDump.fill('A');

      const crashData = {
        userId: 'user-large',
        appVersion: '1.0.0',
        platform: 'darwin',
        arch: 'arm64',
        crashDump: largeCrashDump,
        errorMessage: 'Memory overflow',
        stackTrace: 'Large stack trace',
        metadata: { size: 'large' }
      };

      mockCrashReportRepository.saveCrashReport.mockResolvedValue({
        id: 'crash-report-large'
      });

      const result = await useCase.execute(crashData);

      expect(result.reportId).toBe('crash-report-large');
      expect(mockStoragePort.uploadFile).toHaveBeenCalledWith(
        'crash-reports',
        expect.any(String),
        largeCrashDump,
        { contentType: 'application/octet-stream' }
      );
    });

    it('should generate unique file names for crash dumps', async () => {
      const mockUuids = [
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333'
      ];
      const timestamps = [1713622200001, 1713622200002, 1713622200003];

      let uuidIndex = 0;
      let timeIndex = 0;
      uuidv4.mockImplementation(() => mockUuids[uuidIndex++]);
      jest.spyOn(Date, 'now').mockImplementation(() => timestamps[timeIndex++]);

      for (let i = 0; i < 3; i++) {
        const crashData = {
          userId: `user-${i}`,
          appVersion: '1.0.0',
          platform: 'linux',
          arch: 'x64',
          crashDump: Buffer.from(`dump-${i}`),
          errorMessage: `Error ${i}`,
          stackTrace: `Stack ${i}`,
          metadata: {}
        };

        mockCrashReportRepository.saveCrashReport.mockResolvedValue({
          id: `crash-${i}`
        });

        await useCase.execute(crashData);

        expect(mockStoragePort.uploadFile).toHaveBeenCalledWith(
          'crash-reports',
          `crash-reports/2024/4/crash_${mockUuids[i]}_${timestamps[i]}.dmp`,
          expect.any(Buffer),
          { contentType: 'application/octet-stream' }
        );
      }
    });

    it('should organize crash dumps by year and month', async () => {
      const testDates = [
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-06-15T00:00:00Z'),
        new Date('2024-12-31T23:59:59Z'),
        new Date('2025-02-28T00:00:00Z')
      ];

      for (const date of testDates) {
        jest.setSystemTime(date);
        
        // Reset mocks between iterations
        mockStoragePort.uploadFile.mockClear();
        mockCrashReportRepository.saveCrashReport.mockClear();
        
        const crashData = {
          userId: 'user-date',
          appVersion: '1.0.0',
          platform: 'win32',
          arch: 'x64',
          crashDump: Buffer.from('dump'),
          errorMessage: 'Date test',
          stackTrace: 'Stack',
          metadata: {}
        };

        mockCrashReportRepository.saveCrashReport.mockResolvedValue({
          id: `crash-${date.getTime()}`
        });

        await useCase.execute(crashData);

        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        
        expect(mockStoragePort.uploadFile).toHaveBeenCalledWith(
          'crash-reports',
          expect.stringContaining(`crash-reports/${year}/${month}/`),
          expect.any(Buffer),
          { contentType: 'application/octet-stream' }
        );
      }
    });

    it('should handle complex metadata structures', async () => {
      const complexMetadata = {
        system: {
          os: 'Darwin 21.6.0',
          kernel: '21.6.0',
          cpu: {
            model: 'Apple M1',
            cores: 8,
            speed: 3200
          }
        },
        memory: {
          total: 16777216000,
          free: 4194304000,
          used: 12582912000
        },
        process: {
          pid: 54321,
          ppid: 1,
          uid: 501,
          gid: 20,
          uptime: 3600
        },
        modules: ['module1.so', 'module2.dylib', 'module3.dll']
      };

      const crashData = {
        userId: 'user-complex',
        appVersion: '4.5.6',
        platform: 'darwin',
        arch: 'arm64',
        crashDump: Buffer.from('complex dump'),
        errorMessage: 'Complex crash',
        stackTrace: 'Complex stack',
        metadata: complexMetadata
      };

      mockCrashReportRepository.saveCrashReport.mockResolvedValue({
        id: 'crash-complex'
      });

      await useCase.execute(crashData);

      const savedCrashReport = mockCrashReportRepository.saveCrashReport.mock.calls[0][0];
      expect(savedCrashReport.metadata).toEqual(complexMetadata);
    });

    it('should handle long stack traces', async () => {
      const longStackTrace = Array(1000).fill(null).map((_, i) => 
        `  at function${i} (file${i}.js:${i}:${i % 100})`
      ).join('\n');

      const crashData = {
        userId: 'user-stack',
        appVersion: '1.0.0',
        platform: 'linux',
        arch: 'x64',
        crashDump: null,
        errorMessage: 'Stack overflow',
        stackTrace: longStackTrace,
        metadata: { stackDepth: 1000 }
      };

      mockCrashReportRepository.saveCrashReport.mockResolvedValue({
        id: 'crash-stack'
      });

      await useCase.execute(crashData);

      const savedCrashReport = mockCrashReportRepository.saveCrashReport.mock.calls[0][0];
      expect(savedCrashReport.stackTrace).toBe(longStackTrace);
      expect(savedCrashReport.stackTrace.split('\n')).toHaveLength(1000);
    });

    it('should handle storage upload errors', async () => {
      mockStoragePort.uploadFile.mockRejectedValue(
        new Error('Storage quota exceeded')
      );

      const crashData = {
        userId: 'user-error',
        appVersion: '1.0.0',
        platform: 'darwin',
        arch: 'x64',
        crashDump: Buffer.from('crash'),
        errorMessage: 'Error',
        stackTrace: 'Stack',
        metadata: {}
      };

      await expect(useCase.execute(crashData)).rejects.toThrow('Storage quota exceeded');
      expect(mockCrashReportRepository.saveCrashReport).not.toHaveBeenCalled();
    });

    it('should handle database save errors', async () => {
      mockCrashReportRepository.saveCrashReport.mockRejectedValue(
        new Error('Database connection lost')
      );

      const crashData = {
        userId: 'user-db-error',
        appVersion: '1.0.0',
        platform: 'win32',
        arch: 'ia32',
        crashDump: Buffer.from('dump'),
        errorMessage: 'DB error test',
        stackTrace: 'Stack',
        metadata: {}
      };

      await expect(useCase.execute(crashData)).rejects.toThrow('Database connection lost');
      
      // Storage upload should have been called before database error
      expect(mockStoragePort.uploadFile).toHaveBeenCalled();
    });

    it('should handle undefined and null values appropriately', async () => {
      const crashData = {
        userId: 'user-null',
        appVersion: '1.0.0',
        platform: 'linux',
        arch: 'arm',
        crashDump: undefined,
        errorMessage: null,
        stackTrace: undefined,
        metadata: null
      };

      mockCrashReportRepository.saveCrashReport.mockResolvedValue({
        id: 'crash-null'
      });

      await useCase.execute(crashData);

      expect(mockStoragePort.uploadFile).not.toHaveBeenCalled();
      
      const savedCrashReport = mockCrashReportRepository.saveCrashReport.mock.calls[0][0];
      expect(savedCrashReport.crashDumpUrl).toBeNull();
      expect(savedCrashReport.errorMessage).toBeNull();
      expect(savedCrashReport.stackTrace).toBeUndefined();
      // CrashReport constructor sets metadata to {} when null
      expect(savedCrashReport.metadata).toEqual({});
    });

    it('should handle different platform and architecture combinations', async () => {
      const combinations = [
        { platform: 'darwin', arch: 'x64' },
        { platform: 'darwin', arch: 'arm64' },
        { platform: 'win32', arch: 'x64' },
        { platform: 'win32', arch: 'ia32' },
        { platform: 'win32', arch: 'arm64' },
        { platform: 'linux', arch: 'x64' },
        { platform: 'linux', arch: 'arm64' },
        { platform: 'linux', arch: 'arm' }
      ];

      for (const { platform, arch } of combinations) {
        const crashData = {
          userId: 'user-platform',
          appVersion: '1.0.0',
          platform,
          arch,
          crashDump: null,
          errorMessage: `Crash on ${platform}/${arch}`,
          stackTrace: 'Platform specific stack',
          metadata: { platform, arch }
        };

        mockCrashReportRepository.saveCrashReport.mockResolvedValue({
          id: `crash-${platform}-${arch}`
        });

        await useCase.execute(crashData);

        const savedCrashReport = mockCrashReportRepository.saveCrashReport.mock.calls[
          mockCrashReportRepository.saveCrashReport.mock.calls.length - 1
        ][0];
        expect(savedCrashReport.platform).toBe(platform);
        expect(savedCrashReport.arch).toBe(arch);
      }
    });

    it('should handle error messages with special characters', async () => {
      const specialErrorMessages = [
        'Error with "quotes" and \'apostrophes\'',
        'Error with\ttabs\nand\rnewlines',
        'Error with Unicode: 你好世界 🌍 ñ é ü',
        'Error with <html> tags </html>',
        'Error with regex: [a-z]+ (.*) \\d{3}'
      ];

      for (const errorMessage of specialErrorMessages) {
        const crashData = {
          userId: 'user-special',
          appVersion: '1.0.0',
          platform: 'linux',
          arch: 'x64',
          crashDump: null,
          errorMessage,
          stackTrace: 'Stack',
          metadata: {}
        };

        mockCrashReportRepository.saveCrashReport.mockResolvedValue({
          id: `crash-special-${errorMessage.length}`
        });

        await useCase.execute(crashData);

        const savedCrashReport = mockCrashReportRepository.saveCrashReport.mock.calls[
          mockCrashReportRepository.saveCrashReport.mock.calls.length - 1
        ][0];
        expect(savedCrashReport.errorMessage).toBe(errorMessage);
      }
    });
  });

  describe('constructor', () => {
    it('should store the crash report repository and storage port', () => {
      const repository = { saveCrashReport: jest.fn() };
      const storage = { uploadFile: jest.fn() };
      const useCase = new SaveCrashReportUseCase(repository, storage);
      
      expect(useCase.crashReportRepository).toBe(repository);
      expect(useCase.storagePort).toBe(storage);
    });
  });
});