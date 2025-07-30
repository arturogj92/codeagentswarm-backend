const { v4: uuidv4 } = require('uuid');
const CrashReport = require('../../domain/entities/CrashReport');

class SaveCrashReportUseCase {
  constructor(crashReportRepository, storagePort) {
    this.crashReportRepository = crashReportRepository;
    this.storagePort = storagePort;
  }

  async execute({ userId, appVersion, platform, arch, crashDump, errorMessage, stackTrace, metadata }) {
    let crashDumpUrl = null;

    // Upload crash dump if provided
    if (crashDump) {
      const crashDumpFileName = `crash_${uuidv4()}_${Date.now()}.dmp`;
      const crashDumpPath = `crash-reports/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${crashDumpFileName}`;
      
      await this.storagePort.uploadFile(
        process.env.CRASH_REPORTS_BUCKET || 'crash-reports',
        crashDumpPath,
        crashDump,
        { contentType: 'application/octet-stream' }
      );

      crashDumpUrl = crashDumpPath;
    }

    // Create crash report
    const crashReport = new CrashReport({
      userId,
      appVersion,
      platform,
      arch,
      crashDumpUrl,
      errorMessage,
      stackTrace,
      metadata
    });

    // Save to database
    const savedReport = await this.crashReportRepository.saveCrashReport(crashReport);

    return {
      reportId: savedReport.id,
      message: 'Crash report saved successfully'
    };
  }
}

module.exports = SaveCrashReportUseCase;