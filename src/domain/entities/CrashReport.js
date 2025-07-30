class CrashReport {
  constructor({
    id,
    userId,
    appVersion,
    platform,
    arch,
    crashDumpUrl,
    errorMessage,
    stackTrace,
    metadata,
    createdAt
  }) {
    this.id = id;
    this.userId = userId;
    this.appVersion = appVersion;
    this.platform = platform;
    this.arch = arch;
    this.crashDumpUrl = crashDumpUrl;
    this.errorMessage = errorMessage;
    this.stackTrace = stackTrace;
    this.metadata = metadata || {};
    this.createdAt = createdAt || new Date();
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      appVersion: this.appVersion,
      platform: this.platform,
      arch: this.arch,
      crashDumpUrl: this.crashDumpUrl,
      errorMessage: this.errorMessage,
      stackTrace: this.stackTrace,
      metadata: this.metadata,
      createdAt: this.createdAt
    };
  }
}

module.exports = CrashReport;