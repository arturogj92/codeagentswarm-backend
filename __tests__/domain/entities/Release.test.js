const Release = require('../../../src/domain/entities/Release');

describe('Release Entity', () => {
  describe('constructor', () => {
    it('should create a Release instance with all required properties', () => {
      const releaseData = {
        id: 'release-123',
        version: '1.2.3',
        platform: 'darwin',
        arch: 'x64',
        fileName: 'app-1.2.3-mac.dmg',
        fileUrl: 'https://example.com/releases/app-1.2.3-mac.dmg',
        fileSize: 104857600,
        sha512: 'abc123def456',
        releaseNotes: 'Bug fixes and improvements'
      };

      const release = new Release(releaseData);

      expect(release.id).toBe('release-123');
      expect(release.version).toBe('1.2.3');
      expect(release.platform).toBe('darwin');
      expect(release.arch).toBe('x64');
      expect(release.fileName).toBe('app-1.2.3-mac.dmg');
      expect(release.fileUrl).toBe('https://example.com/releases/app-1.2.3-mac.dmg');
      expect(release.fileSize).toBe(104857600);
      expect(release.sha512).toBe('abc123def456');
      expect(release.releaseNotes).toBe('Bug fixes and improvements');
    });

    it('should set default values for optional properties', () => {
      const releaseData = {
        id: 'release-456',
        version: '2.0.0',
        platform: 'win32',
        arch: 'x64',
        fileName: 'app-2.0.0-win.exe',
        fileUrl: 'https://example.com/releases/app-2.0.0-win.exe',
        fileSize: 52428800,
        sha512: 'xyz789',
        releaseNotes: 'Major update'
      };

      const release = new Release(releaseData);

      expect(release.isPrerelease).toBe(false);
      expect(release.isActive).toBe(true);
      expect(release.createdAt).toBeInstanceOf(Date);
      expect(release.updatedAt).toBeInstanceOf(Date);
    });

    it('should use provided values for optional properties when given', () => {
      const now = new Date('2024-01-15T10:00:00Z');
      const later = new Date('2024-01-15T12:00:00Z');
      
      const releaseData = {
        id: 'release-789',
        version: '3.0.0-beta.1',
        platform: 'linux',
        arch: 'x64',
        fileName: 'app-3.0.0-beta.1-linux.AppImage',
        fileUrl: 'https://example.com/releases/app-3.0.0-beta.1-linux.AppImage',
        fileSize: 78643200,
        sha512: 'def456ghi789',
        releaseNotes: 'Beta release',
        isPrerelease: true,
        isActive: false,
        createdAt: now,
        updatedAt: later
      };

      const release = new Release(releaseData);

      expect(release.isPrerelease).toBe(true);
      expect(release.isActive).toBe(false);
      expect(release.createdAt).toBe(now);
      expect(release.updatedAt).toBe(later);
    });

    it('should handle different platforms correctly', () => {
      const platforms = ['darwin', 'win32', 'linux'];
      const architectures = ['x64', 'arm64', 'ia32'];

      platforms.forEach(platform => {
        architectures.forEach(arch => {
          const release = new Release({
            id: `release-${platform}-${arch}`,
            version: '1.0.0',
            platform,
            arch,
            fileName: `app-${platform}-${arch}`,
            fileUrl: `https://example.com/app-${platform}-${arch}`,
            fileSize: 1024,
            sha512: 'hash',
            releaseNotes: 'Notes'
          });

          expect(release.platform).toBe(platform);
          expect(release.arch).toBe(arch);
        });
      });
    });
  });

  describe('toJSON', () => {
    it('should return a plain object representation of the release', () => {
      const releaseData = {
        id: 'release-json-1',
        version: '1.5.0',
        platform: 'darwin',
        arch: 'arm64',
        fileName: 'app-1.5.0-mac-arm64.dmg',
        fileUrl: 'https://example.com/releases/app-1.5.0-mac-arm64.dmg',
        fileSize: 134217728,
        sha512: 'sha512hash',
        releaseNotes: 'Performance improvements',
        isPrerelease: false,
        isActive: true
      };

      const release = new Release(releaseData);
      const json = release.toJSON();

      expect(json).toEqual({
        id: releaseData.id,
        version: releaseData.version,
        platform: releaseData.platform,
        arch: releaseData.arch,
        fileName: releaseData.fileName,
        fileUrl: releaseData.fileUrl,
        fileSize: releaseData.fileSize,
        sha512: releaseData.sha512,
        releaseNotes: releaseData.releaseNotes,
        isPrerelease: releaseData.isPrerelease,
        isActive: releaseData.isActive,
        createdAt: release.createdAt,
        updatedAt: release.updatedAt
      });
    });

    it('should include dates in JSON output', () => {
      const createdAt = new Date('2024-01-01T00:00:00Z');
      const updatedAt = new Date('2024-01-02T00:00:00Z');
      
      const release = new Release({
        id: 'release-date-test',
        version: '1.0.0',
        platform: 'win32',
        arch: 'x64',
        fileName: 'app.exe',
        fileUrl: 'https://example.com/app.exe',
        fileSize: 1024,
        sha512: 'hash',
        releaseNotes: 'Notes',
        createdAt,
        updatedAt
      });

      const json = release.toJSON();

      expect(json.createdAt).toBe(createdAt);
      expect(json.updatedAt).toBe(updatedAt);
    });

    it('should handle prerelease versions correctly', () => {
      const prereleaseVersions = [
        '1.0.0-alpha',
        '2.0.0-beta.1',
        '3.0.0-rc.2',
        '4.0.0-preview'
      ];

      prereleaseVersions.forEach(version => {
        const release = new Release({
          id: `release-${version}`,
          version,
          platform: 'linux',
          arch: 'x64',
          fileName: `app-${version}.AppImage`,
          fileUrl: `https://example.com/app-${version}.AppImage`,
          fileSize: 67108864,
          sha512: `hash-${version}`,
          releaseNotes: `Prerelease ${version}`,
          isPrerelease: true
        });

        const json = release.toJSON();
        expect(json.version).toBe(version);
        expect(json.isPrerelease).toBe(true);
      });
    });

    it('should preserve all properties when converting to JSON', () => {
      const release = new Release({
        id: 'full-test',
        version: '5.4.3',
        platform: 'darwin',
        arch: 'x64',
        fileName: 'app-5.4.3.dmg',
        fileUrl: 'https://cdn.example.com/app-5.4.3.dmg',
        fileSize: 209715200,
        sha512: 'a'.repeat(128),
        releaseNotes: '# Release Notes\n\n- Feature 1\n- Feature 2\n- Bug fixes',
        isPrerelease: false,
        isActive: true
      });

      const json = release.toJSON();
      const jsonString = JSON.stringify(json);
      const parsed = JSON.parse(jsonString);

      // Dates need special handling for comparison
      expect(parsed.id).toBe(release.id);
      expect(parsed.version).toBe(release.version);
      expect(parsed.platform).toBe(release.platform);
      expect(parsed.arch).toBe(release.arch);
      expect(parsed.fileName).toBe(release.fileName);
      expect(parsed.fileUrl).toBe(release.fileUrl);
      expect(parsed.fileSize).toBe(release.fileSize);
      expect(parsed.sha512).toBe(release.sha512);
      expect(parsed.releaseNotes).toBe(release.releaseNotes);
      expect(parsed.isPrerelease).toBe(release.isPrerelease);
      expect(parsed.isActive).toBe(release.isActive);
    });
  });

  describe('edge cases', () => {
    it('should handle very large file sizes', () => {
      const release = new Release({
        id: 'large-file',
        version: '1.0.0',
        platform: 'win32',
        arch: 'x64',
        fileName: 'large-app.exe',
        fileUrl: 'https://example.com/large-app.exe',
        fileSize: Number.MAX_SAFE_INTEGER,
        sha512: 'hash',
        releaseNotes: 'Large file test'
      });

      expect(release.fileSize).toBe(Number.MAX_SAFE_INTEGER);
      expect(release.toJSON().fileSize).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle empty strings appropriately', () => {
      const release = new Release({
        id: '',
        version: '1.0.0',
        platform: 'linux',
        arch: 'x64',
        fileName: '',
        fileUrl: '',
        fileSize: 0,
        sha512: '',
        releaseNotes: ''
      });

      expect(release.id).toBe('');
      expect(release.fileName).toBe('');
      expect(release.fileUrl).toBe('');
      expect(release.sha512).toBe('');
      expect(release.releaseNotes).toBe('');
      expect(release.fileSize).toBe(0);
    });

    it('should handle special characters in strings', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;\':",./<>?`~';
      const release = new Release({
        id: 'special-chars',
        version: '1.0.0',
        platform: 'darwin',
        arch: 'x64',
        fileName: `app-${specialChars}.dmg`,
        fileUrl: `https://example.com/app?chars=${encodeURIComponent(specialChars)}`,
        fileSize: 1024,
        sha512: specialChars,
        releaseNotes: `Release with special chars: ${specialChars}`
      });

      expect(release.fileName).toContain(specialChars);
      expect(release.sha512).toBe(specialChars);
      expect(release.releaseNotes).toContain(specialChars);
    });
  });
});