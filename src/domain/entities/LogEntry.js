class LogEntry {
  constructor({
    id,
    userId,
    supportTicketId,
    appVersion,
    platform,
    arch,
    logContent,
    metadata,
    createdAt
  }) {
    this.id = id;
    this.userId = userId;
    this.supportTicketId = supportTicketId;
    this.appVersion = appVersion;
    this.platform = platform;
    this.arch = arch;
    this.logContent = logContent;
    this.metadata = metadata || {};
    this.createdAt = createdAt || new Date();
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      supportTicketId: this.supportTicketId,
      appVersion: this.appVersion,
      platform: this.platform,
      arch: this.arch,
      logContent: this.logContent,
      metadata: this.metadata,
      createdAt: this.createdAt
    };
  }
}

module.exports = LogEntry;