import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface StorageConfig {
  bucket: string;
  baseUrl: string | null;
}

// Check if Supabase is configured
const isSupabaseConfigured = !!(
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_ANON_KEY &&
  process.env.SUPABASE_BUCKET
);

let supabase: SupabaseClient | null = null;
let storageConfig: StorageConfig = {
  bucket: process.env.SUPABASE_BUCKET || 'rentverse-uploads',
  baseUrl: null,
};

if (isSupabaseConfigured) {
  try {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false
        }
      }
    );

    // Generate base URL for public files
    storageConfig.baseUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${storageConfig.bucket}`;

    console.log('✅ Supabase storage configured successfully');
    console.log(`   Bucket: ${storageConfig.bucket}`);
    console.log(`   URL: ${process.env.SUPABASE_URL}`);
  } catch (error) {
    console.error('❌ Failed to configure Supabase storage:', error);
  }
} else {
  console.warn(
    '⚠️ Supabase storage not configured. File upload features will be disabled.'
  );
  console.warn(
    'Please set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_BUCKET in your .env file'
  );
}

export {
  supabase,
  storageConfig,
  isSupabaseConfigured as isStorageConfigured,
};

export const STORAGE_FOLDER_PREFIX = process.env.STORAGE_FOLDER_PREFIX || 'rentverse';
