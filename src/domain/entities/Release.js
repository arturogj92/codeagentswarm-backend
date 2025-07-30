class Release {
  constructor({
    id,
    version,
    platform,
    arch,
    fileName,
    fileUrl,
    fileSize,
    sha512,
    releaseNotes,
    isPrerelease = false,
    isActive = true,
    createdAt,
    updatedAt
  }) {
    this.id = id;
    this.version = version;
    this.platform = platform;
    this.arch = arch;
    this.fileName = fileName;
    this.fileUrl = fileUrl;
    this.fileSize = fileSize;
    this.sha512 = sha512;
    this.releaseNotes = releaseNotes;
    this.isPrerelease = isPrerelease;
    this.isActive = isActive;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  toJSON() {
    return {
      id: this.id,
      version: this.version,
      platform: this.platform,
      arch: this.arch,
      fileName: this.fileName,
      fileUrl: this.fileUrl,
      fileSize: this.fileSize,
      sha512: this.sha512,
      releaseNotes: this.releaseNotes,
      isPrerelease: this.isPrerelease,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Release;