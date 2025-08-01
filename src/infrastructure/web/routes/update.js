const express = require('express');
const router = express.Router();
const CheckForUpdateUseCase = require('../../../application/usecases/CheckForUpdateUseCase');
const SupabaseReleaseRepository = require('../../repositories/SupabaseReleaseRepository');

const releaseRepository = new SupabaseReleaseRepository();
const checkForUpdateUseCase = new CheckForUpdateUseCase(releaseRepository);

// Generic update endpoint for electron-updater
router.get('/', async (req, res) => {
  try {
    // Extract info from headers sent by electron-updater
    const userAgent = req.headers['user-agent'] || '';
    const acceptHeader = req.headers['accept'] || '';
    
    // Parse platform and version from user-agent or query params
    let platform = process.platform;
    let version = '0.0.0';
    let arch = process.arch;
    
    // Try to get from query params first (if electron-updater sends them)
    if (req.query.platform) platform = req.query.platform;
    if (req.query.version) version = req.query.version;
    if (req.query.arch) arch = req.query.arch;
    
    // Try to parse from user-agent
    // electron-updater sends something like: "electron-updater/6.6.2 (darwin-arm64) electron/27.0.0"
    const uaMatch = userAgent.match(/electron-updater\/[\d.]+ \(([^-]+)-([^)]+)\)/);
    if (uaMatch) {
      platform = uaMatch[1];
      arch = uaMatch[2];
    }
    
    console.log(`Generic update check: platform=${platform}, version=${version}, arch=${arch}, UA=${userAgent}`);
    
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

// Electron updater YAML endpoints for different platforms
router.get('/:platform/:version/latest-mac.yml', async (req, res) => {
  try {
    const { platform, version } = req.params;
    const arch = req.query.arch || 'x64';

    console.log(`macOS YAML update check: platform=${platform}, version=${version}, arch=${arch}`);
    console.log('Request params:', req.params);
    console.log('Request query:', req.query);

    const updateInfo = await checkForUpdateUseCase.execute({
      currentVersion: version,
      platform,
      arch
    });

    console.log('UpdateInfo result:', JSON.stringify(updateInfo, null, 2));

    if (!updateInfo) {
      console.log('No update found - returning 404');
      return res.status(404).json({ error: 'No update available' });
    }

    // Generate electron-updater YAML format for macOS
    const yamlContent = `version: ${updateInfo.version}
files:
  - url: ${updateInfo.files[0].url}
    sha512: ${updateInfo.files[0].sha512}
    size: ${updateInfo.files[0].size}
path: ${updateInfo.path}
sha512: ${updateInfo.sha512}
releaseDate: '${updateInfo.releaseDate}'`;

    res.setHeader('Content-Type', 'text/yaml');
    res.send(yamlContent);
  } catch (error) {
    console.error('macOS YAML update check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Electron updater JSON endpoint (fallback)
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