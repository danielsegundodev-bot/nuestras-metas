import { toISODate } from '../lib/dates'
import { toMXN } from '../lib/money'
import type { Contribution, Goal, Profile } from '../lib/types'
import { byNewest, type ChangeEvent, type DataSource, type Session } from './DataSource'
import { buildDemoData, DEMO_DANIEL, type DemoData } from './demoSeed'

export const DEMO_STORAGE_KEY = 'nuestras-metas:demo:v1'

const SESSION: Session = { userId: DEMO_DANIEL, email: 'daniel@demo.local' }

/** Small artificial latency so loading/optimistic states are visible in demo mode. */
const tick = () => new Promise<void>((r) => setTimeout(r, 120))

function load(): DemoData {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as DemoData
  } catch {
    /* corrupted or unavailable: reseed */
  }
  const fresh = buildDemoData()
  save(fresh)
  return fresh
}

function save(data: DemoData) {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* storage unavailable: keep in memory only */
  }
}

const listeners = new Set<(e: ChangeEvent) => void>()
const emit = (e: ChangeEvent) => listeners.forEach((l) => l(e))

let memory: DemoData | null = null
const db = (): DemoData => (memory ??= load())
const commit = (table: ChangeEvent['table']) => {
  save(db())
  emit({ table })
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`

/** Wipes demo data and reseeds it. */
export function resetDemoData() {
  memory = buildDemoData()
  save(memory)
  emit({ table: 'contributions' })
  emit({ table: 'goals' })
  emit({ table: 'settings' })
  emit({ table: 'profiles' })
}

function notFound(what: string): never {
  throw new Error(`${what} no encontrado`)
}

export function createDemoSource(): DataSource {
  // Cross-tab sync: another tab wrote demo data.
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== DEMO_STORAGE_KEY) return
      memory = null
      emit({ table: 'contributions' })
      emit({ table: 'goals' })
    })
  }

  return {
    kind: 'demo',

    async getSession() {
      return SESSION
    },
    onAuthChange() {
      return () => {}
    },
    async signInWithEmail() {},
    async signOut() {
      // Demo is always signed in as Daniel.
    },
    async isAllowed() {
      return true
    },

    async getProfile() {
      return db().profiles.find((p) => p.user_id === SESSION.userId) ?? null
    },
    async updateProfile(patch) {
      await tick()
      const d = db()
      const i = d.profiles.findIndex((p) => p.user_id === SESSION.userId)
      if (i < 0) notFound('Perfil')
      const next: Profile = { ...d.profiles[i]!, ...patch }
      d.profiles[i] = next
      commit('profiles')
      return next
    },
    async listProfiles() {
      return [...db().profiles]
    },

    async listGoals() {
      return [...db().goals].sort((a, b) => a.sort - b.sort)
    },
    async createGoal(goal) {
      await tick()
      const d = db()
      const next: Goal = {
        id: uid(),
        target_date: null,
        archived: false,
        sort: Math.max(-1, ...d.goals.map((g) => g.sort)) + 1,
        created_at: new Date().toISOString(),
        ...goal,
      }
      d.goals.push(next)
      commit('goals')
      return next
    },
    async updateGoal(id, patch) {
      await tick()
      const d = db()
      const i = d.goals.findIndex((g) => g.id === id)
      if (i < 0) notFound('Meta')
      const next: Goal = { ...d.goals[i]!, ...patch }
      d.goals[i] = next
      commit('goals')
      return next
    },

    async listContributions() {
      return [...db().contributions].sort(byNewest)
    },
    async addContribution(c) {
      await tick()
      const next: Contribution = {
        id: uid(),
        user_id: SESSION.userId,
        date: c.date ?? toISODate(new Date()),
        note: c.note ?? null,
        goal_id: c.goal_id,
        amount: c.amount,
        currency: c.currency,
        fx_usd_mxn: c.fx_usd_mxn,
        amount_mxn: toMXN(c.amount, c.currency, c.fx_usd_mxn),
        created_at: new Date().toISOString(),
      }
      db().contributions.push(next)
      commit('contributions')
      return next
    },
    async updateContribution(id, patch) {
      await tick()
      const d = db()
      const i = d.contributions.findIndex((x) => x.id === id)
      const cur = d.contributions[i] ?? notFound('Movimiento')
      if (cur.user_id !== SESSION.userId) throw new Error('Solo puedes editar tus movimientos')
      const merged = { ...cur, ...patch }
      const next: Contribution = {
        ...merged,
        amount_mxn: toMXN(merged.amount, merged.currency, merged.fx_usd_mxn),
      }
      d.contributions[i] = next
      commit('contributions')
      return next
    },
    async deleteContribution(id) {
      await tick()
      const d = db()
      const cur = d.contributions.find((x) => x.id === id) ?? notFound('Movimiento')
      if (cur.user_id !== SESSION.userId) throw new Error('Solo puedes borrar tus movimientos')
      d.contributions = d.contributions.filter((x) => x.id !== id)
      commit('contributions')
    },

    async getSettings() {
      return { ...db().settings }
    },
    async updateSettings(patch) {
      await tick()
      const d = db()
      d.settings = { ...d.settings, ...patch }
      commit('settings')
      return { ...d.settings }
    },

    subscribe(onChange) {
      listeners.add(onChange)
      return () => {
        listeners.delete(onChange)
      }
    },
  }
}
