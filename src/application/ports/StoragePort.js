class StoragePort {
  async uploadFile(bucket, path, file, options = {}) {
    throw new Error('Method not implemented');
  }

  async deleteFile(bucket, path) {
    throw new Error('Method not implemented');
  }

  async getPublicUrl(bucket, path) {
    throw new Error('Method not implemented');
  }

  async getSignedUrl(bucket, path, expiresIn = 3600) {
    throw new Error('Method not implemented');
  }
}

module.exports = StoragePort;