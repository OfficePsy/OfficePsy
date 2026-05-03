import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://ypfenswdgihyudfkveuw.supabase.co',
  'sb_publishable_qb5RF4WAQ6vdabkLL8KaxA_GUr7KgK5'
)

export const CLINIC_ID = 'a1b2c3d4-0000-0000-0000-000000000001'
