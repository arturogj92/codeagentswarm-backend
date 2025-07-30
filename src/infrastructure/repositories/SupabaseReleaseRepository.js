const ReleaseRepository = require('../../domain/repositories/ReleaseRepository');
const Release = require('../../domain/entities/Release');
const supabase = require('../../config/supabase');

class SupabaseReleaseRepository extends ReleaseRepository {
  async getLatestRelease(platform, arch) {
    const { data, error } = await supabase
      .from('releases')
      .select('*')
      .eq('platform', platform)
      .eq('arch', arch)
      .eq('is_active', true)
      .eq('is_prerelease', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    if (!data) return null;

    return new Release({
      id: data.id,
      version: data.version,
      platform: data.platform,
      arch: data.arch,
      fileName: data.file_name,
      fileUrl: data.file_url,
      fileSize: data.file_size,
      sha512: data.sha512,
      releaseNotes: data.release_notes,
      isPrerelease: data.is_prerelease,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    });
  }

  async getAllReleases() {
    const { data, error } = await supabase
      .from('releases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(item => new Release({
      id: item.id,
      version: item.version,
      platform: item.platform,
      arch: item.arch,
      fileName: item.file_name,
      fileUrl: item.file_url,
      fileSize: item.file_size,
      sha512: item.sha512,
      releaseNotes: item.release_notes,
      isPrerelease: item.is_prerelease,
      isActive: item.is_active,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    }));
  }

  async createRelease(releaseData) {
    const { data, error } = await supabase
      .from('releases')
      .insert({
        version: releaseData.version,
        platform: releaseData.platform,
        arch: releaseData.arch,
        file_name: releaseData.fileName,
        file_url: releaseData.fileUrl,
        file_size: releaseData.fileSize,
        sha512: releaseData.sha512,
        release_notes: releaseData.releaseNotes,
        is_prerelease: releaseData.isPrerelease,
        is_active: releaseData.isActive
      })
      .select()
      .single();

    if (error) throw error;

    return new Release({
      id: data.id,
      version: data.version,
      platform: data.platform,
      arch: data.arch,
      fileName: data.file_name,
      fileUrl: data.file_url,
      fileSize: data.file_size,
      sha512: data.sha512,
      releaseNotes: data.release_notes,
      isPrerelease: data.is_prerelease,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    });
  }

  async updateRelease(id, updateData) {
    const { data, error } = await supabase
      .from('releases')
      .update({
        ...updateData,
        updated_at: new Date()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return new Release({
      id: data.id,
      version: data.version,
      platform: data.platform,
      arch: data.arch,
      fileName: data.file_name,
      fileUrl: data.file_url,
      fileSize: data.file_size,
      sha512: data.sha512,
      releaseNotes: data.release_notes,
      isPrerelease: data.is_prerelease,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    });
  }

  async deleteRelease(id) {
    const { error } = await supabase
      .from('releases')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

module.exports = SupabaseReleaseRepository;