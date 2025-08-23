const SaveLogUseCase = require('../../../src/application/usecases/SaveLogUseCase');
const LogEntry = require('../../../src/domain/entities/LogEntry');

// Mock uuid module
jest.mock('uuid', () => ({
  v4: jest.fn()
}));

const { v4: uuidv4 } = require('uuid');

describe('SaveLogUseCase', () => {
  let useCase;
  let mockLogRepository;
  let mockStoragePort;
  let originalEnv;

  beforeEach(() => {
    mockLogRepository = {
      saveLog: jest.fn()
    };
    mockStoragePort = {
      uploadFile: jest.fn()
    };
    useCase = new SaveLogUseCase(mockLogRepository, mockStoragePort);
    
    // Store original env and set default
    originalEnv = process.env.LOGS_BUCKET;
    delete process.env.LOGS_BUCKET; // Clear it to use default
    
    // Mock Date methods
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-03-15T10:30:00Z'));
    
    // Mock uuid
    uuidv4.mockReturnValue('12345678-1234-1234-1234-123456789abc');
  });

  afterEach(() => {
    jest.useRealTimers();
    if (originalEnv !== undefined) {
      process.env.LOGS_BUCKET = originalEnv;
    } else {
      delete process.env.LOGS_BUCKET;
    }
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should save log successfully with all required fields', async () => {
      const logData = {
        userId: 'user-123',
        appVersion: '1.2.3',
        platform: 'darwin',
        arch: 'x64',
        logContent: 'Error: Something went wrong\nStack trace here',
        metadata: { severity: 'error', component: 'renderer' }
      };

      const result = await useCase.execute(logData);

      // Check support ticket ID generation
      expect(result.supportTicketId).toBe('SUP-12345678');
      expect(result.message).toBe('Log saved successfully');

      // Check storage upload
      expect(mockStoragePort.uploadFile).toHaveBeenCalledWith(
        'logs',
        'logs/2024/3/SUP-12345678_1710498600000.log',
        Buffer.from(logData.logContent, 'utf-8'),
        { contentType: 'text/plain' }
      );

      // Check database save
      expect(mockLogRepository.saveLog).toHaveBeenCalledWith(
        expect.any(LogEntry)
      );

      const savedLogEntry = mockLogRepository.saveLog.mock.calls[0][0];
      expect(savedLogEntry.userId).toBe('user-123');
      expect(savedLogEntry.supportTicketId).toBe('SUP-12345678');
      expect(savedLogEntry.appVersion).toBe('1.2.3');
      expect(savedLogEntry.platform).toBe('darwin');
      expect(savedLogEntry.arch).toBe('x64');
      expect(savedLogEntry.logContent).toBe('logs/2024/3/SUP-12345678_1710498600000.log');
      expect(savedLogEntry.metadata).toEqual({ severity: 'error', component: 'renderer' });
    });

    it('should use custom LOGS_BUCKET environment variable when set', async () => {
      process.env.LOGS_BUCKET = 'custom-logs-bucket';

      const logData = {
        userId: 'user-456',
        appVersion: '2.0.0',
        platform: 'win32',
        arch: 'x64',
        logContent: 'Application started',
        metadata: {}
      };

      await useCase.execute(logData);

      expect(mockStoragePort.uploadFile).toHaveBeenCalledWith(
        'custom-logs-bucket',
        expect.any(String),
        expect.any(Buffer),
        { contentType: 'text/plain' }
      );
    });

    it('should handle large log content', async () => {
      const largeLogContent = 'a'.repeat(1000000); // 1MB of text

      const logData = {
        userId: 'user-large',
        appVersion: '1.0.0',
        platform: 'linux',
        arch: 'x64',
        logContent: largeLogContent,
        metadata: { size: 'large' }
      };

      const result = await useCase.execute(logData);

      expect(result.supportTicketId).toBe('SUP-12345678');
      expect(mockStoragePort.uploadFile).toHaveBeenCalledWith(
        'logs',
        expect.any(String),
        Buffer.from(largeLogContent, 'utf-8'),
        { contentType: 'text/plain' }
      );
    });

    it('should generate unique support ticket IDs', async () => {
      const mockUuids = [
        'aaaaaaaa-1111-2222-3333-444444444444',
        'bbbbbbbb-5555-6666-7777-888888888888',
        'cccccccc-9999-aaaa-bbbb-cccccccccccc'
      ];

      let uuidIndex = 0;
      uuidv4.mockImplementation(() => mockUuids[uuidIndex++]);

      const logData = {
        userId: 'user-test',
        appVersion: '1.0.0',
        platform: 'darwin',
        arch: 'x64',
        logContent: 'Test log',
        metadata: {}
      };

      const result1 = await useCase.execute(logData);
      const result2 = await useCase.execute(logData);
      const result3 = await useCase.execute(logData);

      expect(result1.supportTicketId).toBe('SUP-AAAAAAAA');
      expect(result2.supportTicketId).toBe('SUP-BBBBBBBB');
      expect(result3.supportTicketId).toBe('SUP-CCCCCCCC');
    });

    it('should organize logs by year and month', async () => {
      const testDates = [
        new Date('2024-01-15T00:00:00Z'),
        new Date('2024-06-30T00:00:00Z'),
        new Date('2024-12-31T23:59:59Z'),
        new Date('2025-01-01T00:00:00Z')
      ];

      for (const date of testDates) {
        jest.setSystemTime(date);
        
        // Reset mocks between iterations
        mockStoragePort.uploadFile.mockClear();
        mockLogRepository.saveLog.mockClear();
        
        const logData = {
          userId: 'user-date',
          appVersion: '1.0.0',
          platform: 'linux',
          arch: 'x64',
          logContent: 'Date test log',
          metadata: {}
        };

        await useCase.execute(logData);

        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        
        expect(mockStoragePort.uploadFile).toHaveBeenCalledWith(
          'logs',
          expect.stringContaining(`logs/${year}/${month}/`),
          expect.any(Buffer),
          { contentType: 'text/plain' }
        );
      }
    });

    it('should handle empty metadata', async () => {
      const logData = {
        userId: 'user-empty',
        appVersion: '1.0.0',
        platform: 'darwin',
        arch: 'arm64',
        logContent: 'Simple log',
        metadata: undefined
      };

      await useCase.execute(logData);

      const savedLogEntry = mockLogRepository.saveLog.mock.calls[0][0];
      // LogEntry constructor sets metadata to {} when undefined
      expect(savedLogEntry.metadata).toEqual({});
    });

    it('should handle complex metadata structures', async () => {
      const complexMetadata = {
        system: {
          os: 'Darwin 21.6.0',
          node: '16.14.0',
          electron: '22.0.0'
        },
        performance: {
          cpu: 45.2,
          memory: {
            used: 1024000000,
            total: 8192000000
          }
        },
        tags: ['error', 'critical', 'database'],
        timestamp: Date.now()
      };

      const logData = {
        userId: 'user-complex',
        appVersion: '3.0.0',
        platform: 'darwin',
        arch: 'x64',
        logContent: 'Complex metadata test',
        metadata: complexMetadata
      };

      await useCase.execute(logData);

      const savedLogEntry = mockLogRepository.saveLog.mock.calls[0][0];
      expect(savedLogEntry.metadata).toEqual(complexMetadata);
    });

    it('should handle Unicode and special characters in log content', async () => {
      const specialContent = '日本語 エラー 🚨\nLine with "quotes"\nTab\there\n<script>alert("XSS")</script>';

      const logData = {
        userId: 'user-unicode',
        appVersion: '1.0.0',
        platform: 'win32',
        arch: 'x64',
        logContent: specialContent,
        metadata: { encoding: 'utf-8' }
      };

      await useCase.execute(logData);

      expect(mockStoragePort.uploadFile).toHaveBeenCalledWith(
        'logs',
        expect.any(String),
        Buffer.from(specialContent, 'utf-8'),
        { contentType: 'text/plain' }
      );
    });

    it('should handle storage upload errors', async () => {
      mockStoragePort.uploadFile.mockRejectedValue(
        new Error('Storage service unavailable')
      );

      const logData = {
        userId: 'user-error',
        appVersion: '1.0.0',
        platform: 'linux',
        arch: 'x64',
        logContent: 'Test log',
        metadata: {}
      };

      await expect(useCase.execute(logData)).rejects.toThrow('Storage service unavailable');
      expect(mockLogRepository.saveLog).not.toHaveBeenCalled();
    });

    it('should handle database save errors', async () => {
      mockLogRepository.saveLog.mockRejectedValue(
        new Error('Database connection failed')
      );

      const logData = {
        userId: 'user-db-error',
        appVersion: '1.0.0',
        platform: 'darwin',
        arch: 'x64',
        logContent: 'Test log',
        metadata: {}
      };

      await expect(useCase.execute(logData)).rejects.toThrow('Database connection failed');
      
      // Storage upload should have been called before database error
      expect(mockStoragePort.uploadFile).toHaveBeenCalled();
    });

    it('should create correct file paths with timestamps', async () => {
      const timestamps = [1710498600000, 1710498600001, 1710498600002];
      let timeIndex = 0;
      
      jest.spyOn(Date, 'now').mockImplementation(() => timestamps[timeIndex++]);

      for (let i = 0; i < 3; i++) {
        // Reset mocks between iterations to check each call separately
        mockStoragePort.uploadFile.mockClear();
        mockLogRepository.saveLog.mockClear();
        
        const logData = {
          userId: `user-${i}`,
          appVersion: '1.0.0',
          platform: 'linux',
          arch: 'x64',
          logContent: `Log ${i}`,
          metadata: {}
        };

        await useCase.execute(logData);

        expect(mockStoragePort.uploadFile).toHaveBeenCalledWith(
          'logs',
          `logs/2024/3/SUP-12345678_${timestamps[i]}.log`,
          expect.any(Buffer),
          { contentType: 'text/plain' }
        );
      }
    });

    it('should handle different platforms and architectures', async () => {
      const combinations = [
        { platform: 'darwin', arch: 'x64' },
        { platform: 'darwin', arch: 'arm64' },
        { platform: 'win32', arch: 'x64' },
        { platform: 'win32', arch: 'ia32' },
        { platform: 'linux', arch: 'x64' },
        { platform: 'linux', arch: 'arm64' }
      ];

      for (const { platform, arch } of combinations) {
        const logData = {
          userId: 'user-platform',
          appVersion: '1.0.0',
          platform,
          arch,
          logContent: `Log from ${platform}/${arch}`,
          metadata: { platform, arch }
        };

        await useCase.execute(logData);

        const savedLogEntry = mockLogRepository.saveLog.mock.calls[mockLogRepository.saveLog.mock.calls.length - 1][0];
        expect(savedLogEntry.platform).toBe(platform);
        expect(savedLogEntry.arch).toBe(arch);
      }
    });
  });

  describe('constructor', () => {
    it('should store the log repository and storage port', () => {
      const repository = { saveLog: jest.fn() };
      const storage = { uploadFile: jest.fn() };
      const useCase = new SaveLogUseCase(repository, storage);
      
      expect(useCase.logRepository).toBe(repository);
      expect(useCase.storagePort).toBe(storage);
    });
  });
});