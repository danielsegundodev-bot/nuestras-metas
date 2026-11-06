import { createClient, type Session as SbSession, type SupabaseClient } from '@supabase/supabase-js'
import type {
  Contribution,
  ContributionPatch,
  Currency,
  Goal,
  GoalPatch,
  NewContribution,
  NewGoal,
  Profile,
  ProfilePatch,
  Settings,
} from '../lib/types'
import { byNewest, type ChangeTable, type DataSource, type Session } from './DataSource'

// PostgREST may serialize numeric columns as strings; normalize at the boundary.
type Row = Record<string, unknown>
const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0))

const toGoal = (r: Row): Goal => ({
  id: String(r.id),
  name: String(r.name ?? ''),
  emoji: String(r.emoji ?? ''),
  target_mxn: num(r.target_mxn),
  target_date: (r.target_date as string | null) ?? null,
  color: String(r.color ?? '#34C759'),
  sort: num(r.sort),
  archived: Boolean(r.archived),
  created_at: String(r.created_at ?? ''),
})

const toContribution = (r: Row): Contribution => ({
  id: String(r.id),
  goal_id: String(r.goal_id),
  user_id: String(r.user_id),
  amount: num(r.amount),
  currency: r.currency as Currency,
  fx_usd_mxn: num(r.fx_usd_mxn),
  amount_mxn: num(r.amount_mxn),
  date: String(r.date),
  note: (r.note as string | null) ?? null,
  created_at: String(r.created_at ?? ''),
})

const toProfile = (r: Row): Profile => ({
  user_id: String(r.user_id),
  display_name: String(r.display_name ?? ''),
  currency: (r.currency as Currency) ?? 'MXN',
  color: (r.color as string | null) ?? null,
  created_at: String(r.created_at ?? ''),
})

const toSession = (s: SbSession | null): Session | null =>
  s ? { userId: s.user.id, email: s.user.email ?? null } : null

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

const CONTRIB_COLUMNS =
  'id, goal_id, user_id, amount, currency, fx_usd_mxn, amount_mxn, date, note, created_at'

export function createSupabaseSource(url: string, anonKey: string): DataSource {
  const sb: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })

  async function requireUserId(): Promise<string> {
    const { data } = await sb.auth.getSession()
    const id = data.session?.user.id
    if (!id) throw new Error('No hay sesión')
    return id
  }

  return {
    kind: 'supabase',

    async getSession() {
      const { data } = await sb.auth.getSession()
      return toSession(data.session)
    },

    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => cb(toSession(session)))
      return () => data.subscription.unsubscribe()
    },

    async signInWithPassword(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw new Error(error.message)
    },

    async signOut() {
      const { error } = await sb.auth.signOut()
      if (error) throw new Error(error.message)
    },

    async isAllowed() {
      const data = check(await sb.rpc('is_allowed'))
      return data === true
    },

    async getProfile() {
      const uid = await requireUserId()
      const data = check(await sb.from('profiles').select('*').eq('user_id', uid).maybeSingle())
      return data ? toProfile(data) : null
    },

    async updateProfile(patch: ProfilePatch) {
      const uid = await requireUserId()
      const data = check(
        await sb
          .from('profiles')
          .upsert({ user_id: uid, ...patch })
          .select('*')
          .single(),
      )
      return toProfile(data)
    },

    async listProfiles() {
      const data = check(await sb.from('profiles').select('*').order('created_at'))
      return (data ?? []).map(toProfile)
    },

    async listGoals() {
      const data = check(await sb.from('goals').select('*').order('sort').order('created_at'))
      return (data ?? []).map(toGoal)
    },

    async createGoal(goal: NewGoal) {
      const data = check(await sb.from('goals').insert(goal).select('*').single())
      return toGoal(data)
    },

    async updateGoal(id: string, patch: GoalPatch) {
      const data = check(await sb.from('goals').update(patch).eq('id', id).select('*').single())
      return toGoal(data)
    },

    async listContributions() {
      const data = check(
        await sb
          .from('contributions')
          .select(CONTRIB_COLUMNS)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),
      )
      return (data ?? []).map((r) => toContribution(r as Row)).sort(byNewest)
    },

    async addContribution(c: NewContribution) {
      const data = check(await sb.from('contributions').insert(c).select(CONTRIB_COLUMNS).single())
      return toContribution(data as Row)
    },

    async updateContribution(id: string, patch: ContributionPatch) {
      const data = check(
        await sb.from('contributions').update(patch).eq('id', id).select(CONTRIB_COLUMNS).single(),
      )
      return toContribution(data as Row)
    },

    async deleteContribution(id: string) {
      check(await sb.from('contributions').delete().eq('id', id))
    },

    async getSettings() {
      const data = check(
        await sb.from('settings').select('move_date, return_date').eq('id', 1).maybeSingle(),
      )
      return { move_date: data?.move_date ?? null, return_date: data?.return_date ?? null }
    },

    async updateSettings(patch: Partial<Settings>) {
      const data = check(
        await sb
          .from('settings')
          .update(patch)
          .eq('id', 1)
          .select('move_date, return_date')
          .single(),
      )
      return { move_date: data?.move_date ?? null, return_date: data?.return_date ?? null }
    },

    subscribe(onChange) {
      const tables: ChangeTable[] = ['contributions', 'goals']
      let channel = sb.channel('nuestras-metas-changes')
      for (const table of tables) {
        channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, () =>
          onChange({ table }),
        )
      }
      channel.subscribe()
      return () => {
        void sb.removeChannel(channel)
      }
    },
  }
}
