import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const isServer = typeof window === 'undefined'

const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey)

if (!hasSupabaseEnv) {
  console.warn(
    '[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local'
  )
}

export const supabase: SupabaseClient | null = hasSupabaseEnv
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        ...(isServer
          ? {
              autoRefreshToken: false,
              persistSession: false,
              detectSessionInUrl: false,
            }
          : {
              storage: AsyncStorage,
              autoRefreshToken: true,
              persistSession: true,
              detectSessionInUrl: true,
            }),
      },
    })
  : null
