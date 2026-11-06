import type { DataSource } from './DataSource'
import { createDemoSource } from './demoSource'
import { createSupabaseSource } from './supabaseSource'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Supabase when configured, otherwise the localStorage demo. */
export const dataSource: DataSource =
  url && key ? createSupabaseSource(url, key) : createDemoSource()

export const isDemo = dataSource.kind === 'demo'

export type { DataSource, Session, ChangeEvent } from './DataSource'
export { resetDemoData } from './demoSource'
