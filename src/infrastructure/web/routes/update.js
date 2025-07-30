const express = require('express');
const router = express.Router();
const CheckForUpdateUseCase = require('../../../application/usecases/CheckForUpdateUseCase');
const SupabaseReleaseRepository = require('../../repositories/SupabaseReleaseRepository');

const releaseRepository = new SupabaseReleaseRepository();
const checkForUpdateUseCase = new CheckForUpdateUseCase(releaseRepository);

// Electron updater endpoint
router.get('/:platform/:version', async (req, res) => {
  try {
    const { platform, version } = req.params;
    const arch = req.query.arch || 'x64';

    console.log(`Update check: platform=${platform}, version=${version}, arch=${arch}`);

    const updateInfo = await checkForUpdateUseCase.execute({
      currentVersion: version,
      platform,
      arch
    });

    if (!updateInfo) {
      return res.status(204).send(); // No update available
    }

    res.json(updateInfo);
  } catch (error) {
    console.error('Update check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Alternative endpoint for more detailed requests
router.post('/check', async (req, res) => {
  try {
    const { currentVersion, platform, arch } = req.body;

    if (!currentVersion || !platform) {
      return res.status(400).json({ 
        error: 'Missing required fields: currentVersion, platform' 
      });
    }

    const updateInfo = await checkForUpdateUseCase.execute({
      currentVersion,
      platform,
      arch: arch || 'x64'
    });

    if (!updateInfo) {
      return res.json({ 
        updateAvailable: false,
        currentVersion 
      });
    }

    res.json({
      updateAvailable: true,
      ...updateInfo
    });
  } catch (error) {
    console.error('Update check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;