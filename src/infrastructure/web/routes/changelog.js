const express = require('express');
const router = express.Router();
const SupabaseChangelogRepository = require('../../repositories/SupabaseChangelogRepository');

const changelogRepository = new SupabaseChangelogRepository();

// Get changelog for a specific version
router.get('/version/:version', async (req, res) => {
  try {
    const { version } = req.params;
    
    const changelog = await changelogRepository.getByVersion(version);
    
    if (!changelog) {
      return res.status(404).json({ error: 'Changelog not found' });
    }
    
    res.json(changelog);
  } catch (error) {
    console.error('Error fetching changelog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get changelogs between two versions
router.get('/between/:fromVersion/:toVersion', async (req, res) => {
  try {
    const { fromVersion, toVersion } = req.params;
    
    console.log(`Fetching changelogs from ${fromVersion} to ${toVersion}`);
    
    const changelogs = await changelogRepository.getBetweenVersions(fromVersion, toVersion);
    
    res.json({
      fromVersion,
      toVersion,
      count: changelogs.length,
      changelogs
    });
  } catch (error) {
    console.error('Error fetching changelogs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get combined changelog text between versions
router.get('/combined/:fromVersion/:toVersion', async (req, res) => {
  try {
    const { fromVersion, toVersion } = req.params;
    
    const combined = await changelogRepository.getCombinedChangelog(fromVersion, toVersion);
    
    if (!combined) {
      return res.status(404).json({ 
        error: 'No changelogs found between versions',
        fromVersion,
        toVersion
      });
    }
    
    res.json({
      fromVersion,
      toVersion,
      changelog: combined
    });
  } catch (error) {
    console.error('Error fetching combined changelog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all changelogs (with pagination)
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    const changelogs = await changelogRepository.getAll(limit, offset);
    
    res.json({
      limit,
      offset,
      count: changelogs.length,
      changelogs
    });
  } catch (error) {
    console.error('Error fetching changelogs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update a changelog (for internal use)
router.post('/', async (req, res) => {
  try {
    const { version, previousVersion, changelog, commitCount } = req.body;
    
    if (!version || !changelog) {
      return res.status(400).json({ 
        error: 'Missing required fields: version, changelog' 
      });
    }
    
    const saved = await changelogRepository.save({
      version,
      previousVersion,
      changelog,
      commitCount: commitCount || 0
    });
    
    res.status(201).json(saved);
  } catch (error) {
    console.error('Error saving changelog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;