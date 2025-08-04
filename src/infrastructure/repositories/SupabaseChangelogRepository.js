const ChangelogRepository = require('../../domain/repositories/ChangelogRepository');
const supabase = require('../../config/supabase');

class SupabaseChangelogRepository extends ChangelogRepository {
  constructor() {
    super();
    this.tableName = 'changelogs';
  }

  /**
   * Get changelog for a specific version
   * @param {string} version 
   * @returns {Promise<Object|null>}
   */
  async getByVersion(version) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('version', version)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null;
      }
      throw error;
    }

    return data;
  }

  /**
   * Get all changelogs between two versions
   * @param {string} fromVersion 
   * @param {string} toVersion 
   * @returns {Promise<Array>}
   */
  async getBetweenVersions(fromVersion, toVersion) {
    // Convert version strings to comparable numbers
    const versionToNumber = (v) => {
      const parts = v.split('.').map(n => parseInt(n, 10));
      return parts[0] * 10000 + parts[1] * 100 + parts[2];
    };

    const fromNum = versionToNumber(fromVersion);
    const toNum = versionToNumber(toVersion);

    // Get all changelogs
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // Filter versions in range
    const filtered = data.filter(changelog => {
      const vNum = versionToNumber(changelog.version);
      return vNum > fromNum && vNum <= toNum;
    });

    // Sort by version number
    filtered.sort((a, b) => {
      const aNum = versionToNumber(a.version);
      const bNum = versionToNumber(b.version);
      return aNum - bNum;
    });

    return filtered;
  }

  /**
   * Save a new changelog
   * @param {Object} changelog 
   * @returns {Promise<Object>}
   */
  async save(changelog) {
    const { data, error } = await supabase
      .from(this.tableName)
      .upsert({
        version: changelog.version,
        previous_version: changelog.previousVersion,
        changelog: changelog.changelog,
        commit_count: changelog.commitCount,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'version'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Get all changelogs
   * @param {number} limit 
   * @param {number} offset 
   * @returns {Promise<Array>}
   */
  async getAll(limit = 10, offset = 0) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Get combined changelog for multiple versions
   * @param {string} fromVersion 
   * @param {string} toVersion 
   * @returns {Promise<string>}
   */
  async getCombinedChangelog(fromVersion, toVersion) {
    const changelogs = await this.getBetweenVersions(fromVersion, toVersion);
    
    if (changelogs.length === 0) {
      return null;
    }

    // Combine changelogs
    const combined = changelogs
      .map(cl => cl.changelog)
      .join('\n\n---\n\n');

    return combined;
  }
}

module.exports = SupabaseChangelogRepository;