const { v4: uuidv4 } = require('uuid');
const LogEntry = require('../../domain/entities/LogEntry');

class SaveLogUseCase {
  constructor(logRepository, storagePort) {
    this.logRepository = logRepository;
    this.storagePort = storagePort;
  }

  async execute({ userId, appVersion, platform, arch, logContent, metadata }) {
    // Generate support ticket ID
    const supportTicketId = `SUP-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Save log content to storage
    const logFileName = `${supportTicketId}_${Date.now()}.log`;
    const logPath = `logs/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${logFileName}`;
    
    await this.storagePort.uploadFile(
      process.env.LOGS_BUCKET || 'logs',
      logPath,
      Buffer.from(logContent, 'utf-8'),
      { contentType: 'text/plain' }
    );

    // Create log entry
    const logEntry = new LogEntry({
      userId,
      supportTicketId,
      appVersion,
      platform,
      arch,
      logContent: logPath, // Store path reference instead of content
      metadata
    });

    // Save to database
    await this.logRepository.saveLog(logEntry);

    return {
      supportTicketId,
      message: 'Log saved successfully'
    };
  }
}

module.exports = SaveLogUseCase;