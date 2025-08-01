const semver = require('semver');

class CheckForUpdateUseCase {
  constructor(releaseRepository) {
    this.releaseRepository = releaseRepository;
  }

  async execute({ currentVersion, platform, arch }) {
    console.log(`CheckForUpdateUseCase - Input: currentVersion=${currentVersion}, platform=${platform}, arch=${arch}`);
    
    // Get the latest release for the platform and architecture
    const latestRelease = await this.releaseRepository.getLatestRelease(platform, arch);

    console.log('CheckForUpdateUseCase - Latest release:', JSON.stringify(latestRelease, null, 2));

    if (!latestRelease) {
      console.log('CheckForUpdateUseCase - No release found');
      return null;
    }

    console.log(`CheckForUpdateUseCase - Version comparison: ${latestRelease.version} > ${currentVersion} = ${semver.gt(latestRelease.version, currentVersion)}`);

    // Check if update is needed
    if (semver.gt(latestRelease.version, currentVersion)) {
      return {
        version: latestRelease.version,
        files: [
          {
            url: latestRelease.fileUrl,
            sha512: latestRelease.sha512,
            size: latestRelease.fileSize
          }
        ],
        path: latestRelease.fileName,
        sha512: latestRelease.sha512,
        releaseDate: latestRelease.createdAt,
        releaseNotes: latestRelease.releaseNotes
      };
    }

    return null;
  }
}

module.exports = CheckForUpdateUseCase;