// System settings utility to fetch configuration from local PostgreSQL
import { query } from '@/lib/db';

export interface SystemSettings {
  notification_email?: string;
  auto_verification_enabled?: boolean;
  jaggaer?: {
    baseUrl?: string;
    clientId?: string;
    clientSecret?: string;
  };
  jaggaer_api_url?: string;
  document_retention_days?: number;
  jaggaer_integration?: {
    selectedComponents?: string[];
    batchSize?: number;
    maxTotal?: number | null;
  };
  mistral_api_key?: string;
}

export class SystemSettingsManager {
  private static cache: Map<string, any> = new Map();
  private static cacheExpiry: Map<string, number> = new Map();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static async getSetting<T = any>(key: string): Promise<T | null> {
    // Check cache first
    const now = Date.now();
    if (this.cache.has(key) && this.cacheExpiry.get(key)! > now) {
      return this.cache.get(key);
    }

    try {
      const { rows } = await query<{ setting_value: any }>(
        'SELECT setting_value FROM system_settings WHERE setting_key = $1 LIMIT 1',
        [key]
      );
      if (!rows.length) return null;

      let value = rows[0].setting_value;
      
      // Try to parse JSON if it's a string
      if (typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch {
          // Keep as string if not valid JSON
        }
      }

      // Cache the result
      this.cache.set(key, value);
      this.cacheExpiry.set(key, now + this.CACHE_TTL);

      return value as T;
    } catch (error) {
      console.error(`Failed to get setting ${key}:`, error);
      return null;
    }
  }

  static async getAllSettings(): Promise<SystemSettings> {
    try {
      const { rows } = await query<{ setting_key: string; setting_value: any }>(
        'SELECT setting_key, setting_value FROM system_settings'
      );

      const settings: SystemSettings = {};
      
      for (const row of rows) {
        let value = row.setting_value;
        
        // Try to parse JSON if it's a string
        if (typeof value === 'string') {
          try {
            value = JSON.parse(value);
          } catch {
            // Keep as string if not valid JSON
          }
        }

        // Type-safe assignment
        switch (row.setting_key) {
          case 'notification_email':
            settings.notification_email = value;
            break;
          case 'auto_verification_enabled':
            settings.auto_verification_enabled = Boolean(value);
            break;
          case 'jaggaer':
            settings.jaggaer = value;
            break;
          case 'jaggaer_api_url':
            settings.jaggaer_api_url = value;
            break;
          case 'document_retention_days':
            settings.document_retention_days = Number(value);
            break;
          case 'jaggaer_integration':
            settings.jaggaer_integration = value;
            break;
          case 'mistral_api_key':
            settings.mistral_api_key = value;
            break;
        }
      }

      return settings;
    } catch (error) {
      console.error('Failed to get all settings:', error);
      return {};
    }
  }

  static async setSetting(key: string, value: any): Promise<boolean> {
    try {
      // Always store as JSONB
      const serializedValue = JSON.stringify(value);
      await query(
        `INSERT INTO system_settings (setting_key, setting_value, created_at, updated_at)
         VALUES ($1, $2::jsonb, NOW(), NOW())
         ON CONFLICT (setting_key)
         DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
        [key, serializedValue]
      );

      // Clear cache for this key
      this.cache.delete(key);
      this.cacheExpiry.delete(key);

      return true;
    } catch (error) {
      console.error(`Failed to set setting ${key}:`, error);
      return false;
    }
  }

  static clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  // Convenience methods for common settings
  static async getMistralApiKey(): Promise<string | null> {
    // First try system_settings, then fallback to environment variable
    const dbKey = await this.getSetting<string>('mistral_api_key');
    // Do not log API keys or sensitive credentials
    if (dbKey) return dbKey;
    
    return process.env.MISTRAL_API_KEY || null;
  }

  static async getJaggaerConfig(): Promise<{
    baseUrl?: string;
    clientId?: string;
    clientSecret?: string;
  } | null> {
    return await this.getSetting('jaggaer');
  }

  static async getJaggaerIntegrationConfig(): Promise<{
    selectedComponents?: string[];
    batchSize?: number;
    maxTotal?: number | null;
  } | null> {
    return await this.getSetting('jaggaer_integration');
  }
}
