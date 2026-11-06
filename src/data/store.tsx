import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { toISODate } from '../lib/dates'
import { getUsdMxn, type FxRate } from '../lib/fx'
import { toMXN } from '../lib/money'
import type {
  Contribution,
  ContributionPatch,
  Goal,
  GoalPatch,
  NewContribution,
  NewGoal,
  Profile,
  ProfilePatch,
  Settings,
} from '../lib/types'
import { byNewest, type DataSource, type Session } from './DataSource'
import { dataSource as defaultSource } from './index'
import { resetDemoData } from './demoSource'

export type DataStatus = 'loading' | 'signedOut' | 'denied' | 'ready' | 'error'

export interface DataState {
  status: DataStatus
  error: string | null
  isDemo: boolean
  session: Session | null
  /** Current user's profile. */
  me: Profile | null
  profiles: Profile[]
  /** All goals (including archived), sorted by `sort`. */
  goals: Goal[]
  /** Newest first. Optimistic rows have ids starting with `tmp-`. */
  contributions: Contribution[]
  settings: Settings
  /** Current USD→MXN rate; null until loaded or when unavailable (ask the user). */
  fx: FxRate | null
}

export interface DataActions {
  signIn(email: string): Promise<void>
  signOut(): Promise<void>
  /** Optimistic: the row appears immediately and is rolled back if the save fails. */
  addContribution(c: NewContribution): Promise<Contribution>
  updateContribution(id: string, patch: ContributionPatch): Promise<Contribution>
  deleteContribution(id: string): Promise<void>
  createGoal(g: NewGoal): Promise<Goal>
  updateGoal(id: string, patch: GoalPatch): Promise<Goal>
  updateProfile(patch: ProfilePatch): Promise<Profile>
  updateSettings(patch: Partial<Settings>): Promise<Settings>
  refresh(): Promise<void>
  refreshFx(): Promise<void>
  /** Demo only: reseed local data. */
  resetDemo(): void
}

export type DataContextValue = DataState & DataActions

const EMPTY_SETTINGS: Settings = { move_date: null, return_date: null }

const initialState = (isDemo: boolean): DataState => ({
  status: 'loading',
  error: null,
  isDemo,
  session: null,
  me: null,
  profiles: [],
  goals: [],
  contributions: [],
  settings: EMPTY_SETTINGS,
  fx: null,
})

const DataContext = createContext<DataContextValue | null>(null)

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))
const sortGoals = (gs: Goal[]) => [...gs].sort((a, b) => a.sort - b.sort)

export function DataProvider({
  children,
  source = defaultSource,
}: {
  children: ReactNode
  source?: DataSource
}) {
  const isDemo = source.kind === 'demo'
  const [state, setState] = useState<DataState>(() => initialState(isDemo))
  const patch = useCallback(
    (p: Partial<DataState> | ((s: DataState) => Partial<DataState>)) =>
      setState((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) })),
    [],
  )
  const sessionRef = useRef<Session | null>(null)
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const loadAll = useCallback(async () => {
    const [me, profiles, goals, contributions, settings] = await Promise.all([
      source.getProfile(),
      source.listProfiles(),
      source.listGoals(),
      source.listContributions(),
      source.getSettings(),
    ])
    patch({ me, profiles, goals: sortGoals(goals), contributions, settings })
  }, [source, patch])

  const refreshFx = useCallback(async () => {
    const fx = await getUsdMxn()
    patch({ fx })
  }, [patch])

  // Session gate → allow-list → initial load.
  const bootstrap = useCallback(
    async (session: Session | null) => {
      sessionRef.current = session
      if (!session) {
        setState({ ...initialState(isDemo), status: 'signedOut' })
        return
      }
      patch({ status: 'loading', session, error: null })
      try {
        if (!(await source.isAllowed())) {
          patch({ status: 'denied' })
          return
        }
        await loadAll()
        patch({ status: 'ready' })
      } catch (e) {
        patch({ status: 'error', error: message(e) })
      }
    },
    [source, isDemo, loadAll, patch],
  )

  useEffect(() => {
    let alive = true
    void source.getSession().then((s) => {
      if (alive) void bootstrap(s)
    })
    const off = source.onAuthChange((s) => {
      // Ignore token refreshes for the same user.
      if (s?.userId === sessionRef.current?.userId) return
      void bootstrap(s)
    })
    void getUsdMxn().then((fx) => {
      if (alive) patch({ fx })
    })
    return () => {
      alive = false
      off()
    }
  }, [source, bootstrap, patch])

  // Live updates while ready (debounced reload of the changed table).
  const ready = state.status === 'ready'
  useEffect(() => {
    if (!ready) return
    const pending = new Set<string>()
    let timer: ReturnType<typeof setTimeout> | undefined
    const flush = async () => {
      const tables = [...pending]
      pending.clear()
      try {
        if (tables.includes('contributions'))
          patch({ contributions: await source.listContributions() })
        if (tables.includes('goals')) patch({ goals: sortGoals(await source.listGoals()) })
        if (tables.includes('profiles'))
          patch({ profiles: await source.listProfiles(), me: await source.getProfile() })
        if (tables.includes('settings')) patch({ settings: await source.getSettings() })
      } catch {
        /* transient; next event or refresh will catch up */
      }
    }
    const off = source.subscribe((e) => {
      pending.add(e.table)
      clearTimeout(timer)
      timer = setTimeout(() => void flush(), 250)
    })
    return () => {
      clearTimeout(timer)
      off()
    }
  }, [ready, source, patch])

  const actions = useMemo<DataActions>(
    () => ({
      signIn: (email) => source.signInWithEmail(email),
      signOut: () => source.signOut(),

      async addContribution(c) {
        const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const optimistic: Contribution = {
          id: tmpId,
          user_id: sessionRef.current?.userId ?? '',
          goal_id: c.goal_id,
          amount: c.amount,
          currency: c.currency,
          fx_usd_mxn: c.fx_usd_mxn,
          amount_mxn: toMXN(c.amount, c.currency, c.fx_usd_mxn),
          date: c.date ?? toISODate(new Date()),
          note: c.note ?? null,
          created_at: new Date().toISOString(),
        }
        patch((s) => ({ contributions: [optimistic, ...s.contributions].sort(byNewest) }))
        try {
          const saved = await source.addContribution(c)
          // A realtime reload may already have brought the saved row in; never duplicate it.
          patch((s) => ({
            contributions: [
              saved,
              ...s.contributions.filter((x) => x.id !== tmpId && x.id !== saved.id),
            ].sort(byNewest),
          }))
          return saved
        } catch (e) {
          patch((s) => ({ contributions: s.contributions.filter((x) => x.id !== tmpId) }))
          throw e
        }
      },

      async updateContribution(id, p) {
        const saved = await source.updateContribution(id, p)
        patch((s) => ({
          contributions: s.contributions.map((x) => (x.id === id ? saved : x)).sort(byNewest),
        }))
        return saved
      },

      async deleteContribution(id) {
        const removed = stateRef.current.contributions.find((x) => x.id === id)
        patch((s) => ({ contributions: s.contributions.filter((x) => x.id !== id) }))
        try {
          await source.deleteContribution(id)
        } catch (e) {
          if (removed) {
            const back = removed
            patch((s) => ({ contributions: [back, ...s.contributions].sort(byNewest) }))
          }
          throw e
        }
      },

      async createGoal(g) {
        const saved = await source.createGoal(g)
        patch((s) => ({ goals: sortGoals([...s.goals.filter((x) => x.id !== saved.id), saved]) }))
        return saved
      },

      async updateGoal(id, p) {
        const saved = await source.updateGoal(id, p)
        patch((s) => ({ goals: sortGoals(s.goals.map((x) => (x.id === id ? saved : x))) }))
        return saved
      },

      async updateProfile(p) {
        const saved = await source.updateProfile(p)
        patch((s) => ({
          me: saved,
          profiles: s.profiles.some((x) => x.user_id === saved.user_id)
            ? s.profiles.map((x) => (x.user_id === saved.user_id ? saved : x))
            : [...s.profiles, saved],
        }))
        return saved
      },

      async updateSettings(p) {
        const saved = await source.updateSettings(p)
        patch({ settings: saved })
        return saved
      },

      refresh: loadAll,
      refreshFx,

      resetDemo() {
        if (source.kind === 'demo') resetDemoData()
      },
    }),
    [source, patch, loadAll, refreshFx],
  )

  const value = useMemo<DataContextValue>(() => ({ ...state, ...actions }), [state, actions])
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

/** Data state + actions. Must be used under <DataProvider>. */
export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}
