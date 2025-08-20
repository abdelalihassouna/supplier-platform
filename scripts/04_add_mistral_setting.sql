-- Add Mistral API key to system_settings table
INSERT INTO system_settings (setting_key, setting_value) 
VALUES ('mistral_api_key', '"97ZQlsV45YrDusgZRwjArWGbh3nerFPb"')
ON CONFLICT (setting_key) DO NOTHING;
