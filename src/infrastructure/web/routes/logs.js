const express = require('express');
const router = express.Router();
const multer = require('multer');
const SaveLogUseCase = require('../../../application/usecases/SaveLogUseCase');
const SupabaseLogRepository = require('../../repositories/SupabaseLogRepository');
const SupabaseStorageAdapter = require('../../services/SupabaseStorageAdapter');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const logRepository = new SupabaseLogRepository();
const storageAdapter = new SupabaseStorageAdapter();
const saveLogUseCase = new SaveLogUseCase(logRepository, storageAdapter);

// Submit logs
router.post('/submit', upload.single('logFile'), async (req, res) => {
  try {
    const { userId, appVersion, platform, arch, metadata } = req.body;
    let logContent;

    if (req.file) {
      logContent = req.file.buffer.toString('utf-8');
    } else if (req.body.logContent) {
      logContent = req.body.logContent;
    } else {
      return res.status(400).json({ error: 'No log content provided' });
    }

    const result = await saveLogUseCase.execute({
      userId: userId || 'anonymous',
      appVersion,
      platform,
      arch,
      logContent,
      metadata: metadata ? JSON.parse(metadata) : {}
    });

    res.json(result);
  } catch (error) {
    console.error('Log submission error:', error);
    res.status(500).json({ error: 'Failed to save log' });
  }
});

// Get logs by support ticket
router.get('/ticket/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const logs = await logRepository.getLogsByTicket(ticketId);
    res.json(logs);
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

module.exports = router;