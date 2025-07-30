const StoragePort = require('../../application/ports/StoragePort');
const supabase = require('../../config/supabase');

class SupabaseStorageAdapter extends StoragePort {
  async uploadFile(bucket, path, file, options = {}) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: options.contentType || 'application/octet-stream',
        upsert: options.upsert || false
      });

    if (error) throw error;

    return data;
  }

  async deleteFile(bucket, path) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
  }

  async getPublicUrl(bucket, path) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async getSignedUrl(bucket, path, expiresIn = 3600) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;

    return data.signedUrl;
  }
}

module.exports = SupabaseStorageAdapter;