const CheckForUpdateUseCase = require('../../../src/application/usecases/CheckForUpdateUseCase');

describe('CheckForUpdateUseCase', () => {
  let useCase;
  let mockReleaseRepository;
  let consoleLogSpy;

  beforeEach(() => {
    mockReleaseRepository = {
      getLatestRelease: jest.fn()
    };
    useCase = new CheckForUpdateUseCase(mockReleaseRepository);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('execute', () => {
    it('should return update info when a newer version is available', async () => {
      const mockRelease = {
        version: '2.0.0',
        fileUrl: 'https://example.com/releases/app-2.0.0.dmg',
        sha512: 'abc123sha512hash',
        fileSize: 104857600,
        fileName: 'app-2.0.0-mac.dmg',
        createdAt: new Date('2024-03-15T10:00:00Z'),
        releaseNotes: '## New Features\n- Feature 1\n- Feature 2'
      };

      mockReleaseRepository.getLatestRelease.mockResolvedValue(mockRelease);

      const result = await useCase.execute({
        currentVersion: '1.5.0',
        platform: 'darwin',
        arch: 'x64'
      });

      expect(mockReleaseRepository.getLatestRelease).toHaveBeenCalledWith('darwin', 'x64');
      expect(result).toEqual({
        version: '2.0.0',
        files: [{
          url: 'https://example.com/releases/app-2.0.0.dmg',
          sha512: 'abc123sha512hash',
          size: 104857600
        }],
        path: 'app-2.0.0-mac.dmg',
        sha512: 'abc123sha512hash',
        releaseDate: new Date('2024-03-15T10:00:00Z'),
        releaseNotes: '## New Features\n- Feature 1\n- Feature 2'
      });
    });

    it('should return null when current version is up to date', async () => {
      const mockRelease = {
        version: '1.5.0',
        fileUrl: 'https://example.com/releases/app-1.5.0.dmg',
        sha512: 'xyz789sha512hash',
        fileSize: 94371840,
        fileName: 'app-1.5.0-mac.dmg',
        createdAt: new Date('2024-02-10T08:00:00Z'),
        releaseNotes: 'Current version'
      };

      mockReleaseRepository.getLatestRelease.mockResolvedValue(mockRelease);

      const result = await useCase.execute({
        currentVersion: '1.5.0',
        platform: 'darwin',
        arch: 'x64'
      });

      expect(result).toBeNull();
    });

    it('should return null when current version is newer than latest release', async () => {
      const mockRelease = {
        version: '1.0.0',
        fileUrl: 'https://example.com/releases/app-1.0.0.dmg',
        sha512: 'oldhash',
        fileSize: 52428800,
        fileName: 'app-1.0.0-mac.dmg',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        releaseNotes: 'Old version'
      };

      mockReleaseRepository.getLatestRelease.mockResolvedValue(mockRelease);

      const result = await useCase.execute({
        currentVersion: '2.0.0',
        platform: 'darwin',
        arch: 'x64'
      });

      expect(result).toBeNull();
    });

    it('should return null when no release is found', async () => {
      mockReleaseRepository.getLatestRelease.mockResolvedValue(null);

      const result = await useCase.execute({
        currentVersion: '1.0.0',
        platform: 'linux',
        arch: 'arm64'
      });

      expect(mockReleaseRepository.getLatestRelease).toHaveBeenCalledWith('linux', 'arm64');
      expect(result).toBeNull();
      expect(consoleLogSpy).toHaveBeenCalledWith('CheckForUpdateUseCase - No release found');
    });

    it('should handle different platforms correctly', async () => {
      const platforms = ['darwin', 'win32', 'linux'];
      const architectures = ['x64', 'arm64', 'ia32'];

      for (const platform of platforms) {
        for (const arch of architectures) {
          const mockRelease = {
            version: '3.0.0',
            fileUrl: `https://example.com/releases/app-3.0.0-${platform}-${arch}`,
            sha512: `hash-${platform}-${arch}`,
            fileSize: 78643200,
            fileName: `app-3.0.0-${platform}-${arch}`,
            createdAt: new Date(),
            releaseNotes: `Release for ${platform}/${arch}`
          };

          mockReleaseRepository.getLatestRelease.mockResolvedValue(mockRelease);

          const result = await useCase.execute({
            currentVersion: '2.0.0',
            platform,
            arch
          });

          expect(mockReleaseRepository.getLatestRelease).toHaveBeenCalledWith(platform, arch);
          expect(result.version).toBe('3.0.0');
          expect(result.files[0].url).toContain(platform);
          expect(result.files[0].url).toContain(arch);
        }
      }
    });

    it('should handle prerelease versions correctly', async () => {
      const mockRelease = {
        version: '2.0.0-beta.1',
        fileUrl: 'https://example.com/releases/app-2.0.0-beta.1.dmg',
        sha512: 'betahash',
        fileSize: 83886080,
        fileName: 'app-2.0.0-beta.1-mac.dmg',
        createdAt: new Date('2024-04-01T12:00:00Z'),
        releaseNotes: 'Beta release'
      };

      mockReleaseRepository.getLatestRelease.mockResolvedValue(mockRelease);

      const result = await useCase.execute({
        currentVersion: '1.9.9',
        platform: 'darwin',
        arch: 'x64'
      });

      expect(result).not.toBeNull();
      expect(result.version).toBe('2.0.0-beta.1');
    });

    it('should compare semantic versions correctly', async () => {
      const testCases = [
        { current: '1.0.0', latest: '2.0.0', shouldUpdate: true },
        { current: '1.9.9', latest: '2.0.0', shouldUpdate: true },
        { current: '2.0.0', latest: '2.0.0', shouldUpdate: false },
        { current: '2.0.1', latest: '2.0.0', shouldUpdate: false },
        { current: '1.0.0', latest: '1.0.1', shouldUpdate: true },
        { current: '1.0.0', latest: '1.1.0', shouldUpdate: true },
        { current: '0.9.9', latest: '1.0.0', shouldUpdate: true },
        { current: '10.0.0', latest: '9.9.9', shouldUpdate: false }
      ];

      for (const testCase of testCases) {
        const mockRelease = {
          version: testCase.latest,
          fileUrl: `https://example.com/releases/app-${testCase.latest}.dmg`,
          sha512: 'testhash',
          fileSize: 62914560,
          fileName: `app-${testCase.latest}-mac.dmg`,
          createdAt: new Date(),
          releaseNotes: 'Test release'
        };

        mockReleaseRepository.getLatestRelease.mockResolvedValue(mockRelease);

        const result = await useCase.execute({
          currentVersion: testCase.current,
          platform: 'darwin',
          arch: 'x64'
        });

        if (testCase.shouldUpdate) {
          expect(result).not.toBeNull();
          expect(result?.version).toBe(testCase.latest);
        } else {
          expect(result).toBeNull();
        }
      }
    });

    it('should log appropriate messages during execution', async () => {
      const mockRelease = {
        version: '2.5.0',
        fileUrl: 'https://example.com/releases/app-2.5.0.exe',
        sha512: 'winhash',
        fileSize: 73400320,
        fileName: 'app-2.5.0-win.exe',
        createdAt: new Date(),
        releaseNotes: 'Windows release'
      };

      mockReleaseRepository.getLatestRelease.mockResolvedValue(mockRelease);

      await useCase.execute({
        currentVersion: '2.0.0',
        platform: 'win32',
        arch: 'x64'
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'CheckForUpdateUseCase - Input: currentVersion=2.0.0, platform=win32, arch=x64'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'CheckForUpdateUseCase - Latest release:',
        expect.any(String)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'CheckForUpdateUseCase - Version comparison: 2.5.0 > 2.0.0 = true'
      );
    });

    it('should handle repository errors gracefully', async () => {
      mockReleaseRepository.getLatestRelease.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        useCase.execute({
          currentVersion: '1.0.0',
          platform: 'darwin',
          arch: 'x64'
        })
      ).rejects.toThrow('Database connection failed');
    });

    it('should preserve all release properties in the response', async () => {
      const mockRelease = {
        version: '3.1.4',
        fileUrl: 'https://cdn.example.com/releases/v3.1.4/app.AppImage',
        sha512: 'a'.repeat(128), // Realistic SHA512 length
        fileSize: 134217728,
        fileName: 'app-3.1.4-linux.AppImage',
        createdAt: new Date('2024-05-20T14:45:30Z'),
        releaseNotes: '# Release 3.1.4\n\n## Bug Fixes\n- Fixed memory leak\n- Resolved crash on startup\n\n## Improvements\n- Better performance'
      };

      mockReleaseRepository.getLatestRelease.mockResolvedValue(mockRelease);

      const result = await useCase.execute({
        currentVersion: '3.0.0',
        platform: 'linux',
        arch: 'x64'
      });

      expect(result).toMatchObject({
        version: mockRelease.version,
        files: [{
          url: mockRelease.fileUrl,
          sha512: mockRelease.sha512,
          size: mockRelease.fileSize
        }],
        path: mockRelease.fileName,
        sha512: mockRelease.sha512,
        releaseDate: mockRelease.createdAt,
        releaseNotes: mockRelease.releaseNotes
      });
    });
  });

  describe('constructor', () => {
    it('should store the release repository', () => {
      const repository = { getLatestRelease: jest.fn() };
      const useCase = new CheckForUpdateUseCase(repository);
      
      expect(useCase.releaseRepository).toBe(repository);
    });
  });
});