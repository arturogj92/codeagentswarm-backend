const LogRepository = require('../../domain/repositories/LogRepository');
const LogEntry = require('../../domain/entities/LogEntry');
const supabase = require('../../config/supabase');

class SupabaseLogRepository extends LogRepository {
  async saveLog(logData) {
    const { data, error } = await supabase
      .from('logs')
      .insert({
        user_id: logData.userId,
        support_ticket_id: logData.supportTicketId,
        app_version: logData.appVersion,
        platform: logData.platform,
        arch: logData.arch,
        log_content: logData.logContent,
        metadata: logData.metadata
      })
      .select()
      .single();

    if (error) throw error;

    return new LogEntry({
      id: data.id,
      userId: data.user_id,
      supportTicketId: data.support_ticket_id,
      appVersion: data.app_version,
      platform: data.platform,
      arch: data.arch,
      logContent: data.log_content,
      metadata: data.metadata,
      createdAt: new Date(data.created_at)
    });
  }

  async getLogsByUser(userId) {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(item => new LogEntry({
      id: item.id,
      userId: item.user_id,
      supportTicketId: item.support_ticket_id,
      appVersion: item.app_version,
      platform: item.platform,
      arch: item.arch,
      logContent: item.log_content,
      metadata: item.metadata,
      createdAt: new Date(item.created_at)
    }));
  }

  async getLogsByTicket(ticketId) {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .eq('support_ticket_id', ticketId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    return new LogEntry({
      id: data.id,
      userId: data.user_id,
      supportTicketId: data.support_ticket_id,
      appVersion: data.app_version,
      platform: data.platform,
      arch: data.arch,
      logContent: data.log_content,
      metadata: data.metadata,
      createdAt: new Date(data.created_at)
    });
  }

  async getAllLogs(filters = {}) {
    let query = supabase.from('logs').select('*');

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }
    if (filters.platform) {
      query = query.eq('platform', filters.platform);
    }
    if (filters.appVersion) {
      query = query.eq('app_version', filters.appVersion);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return data.map(item => new LogEntry({
      id: item.id,
      userId: item.user_id,
      supportTicketId: item.support_ticket_id,
      appVersion: item.app_version,
      platform: item.platform,
      arch: item.arch,
      logContent: item.log_content,
      metadata: item.metadata,
      createdAt: new Date(item.created_at)
    }));
  }
}

module.exports = SupabaseLogRepository;