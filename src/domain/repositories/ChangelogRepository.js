class ChangelogRepository {
  /**
   * Get changelog for a specific version
   * @param {string} version 
   * @returns {Promise<Object|null>}
   */
  async getByVersion(version) {
    throw new Error('Method not implemented');
  }

  /**
   * Get all changelogs between two versions
   * @param {string} fromVersion 
   * @param {string} toVersion 
   * @returns {Promise<Array>}
   */
  async getBetweenVersions(fromVersion, toVersion) {
    throw new Error('Method not implemented');
  }

  /**
   * Save a new changelog
   * @param {Object} changelog 
   * @returns {Promise<Object>}
   */
  async save(changelog) {
    throw new Error('Method not implemented');
  }

  /**
   * Get all changelogs
   * @param {number} limit 
   * @param {number} offset 
   * @returns {Promise<Array>}
   */
  async getAll(limit = 10, offset = 0) {
    throw new Error('Method not implemented');
  }
}

module.exports = ChangelogRepository;