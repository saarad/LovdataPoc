import { Fragment, StrictMode, useCallback, useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

/* ---------------------------------------------------------------- types --- */

type Tenant = {
  id: string
  name: string
  industry: string
  description: string
  units: string[]
  lawListCount: number
  questionCount: number
  answeredCount: number
  openDeviations: number
  compliance: number | null
}

type Overview = {
  tenants: Tenant[]
  selectedTenantIds: string[]
  totalCompliance: number | null
  controlledRequirements: number
  answered: number
  questions: number
  openDeviations: number
  notRelevant: number
  legalChanges: number
}

type DemoUser = {
  id: string
  tenantId: string
  tenantName?: string
  name: string
  role: string
  unit: string
  email: string
  accessLevel?: string
  permissions?: string[]
  active?: boolean
  openDeviations?: number
  answeredQuestions?: number
}

type TenantUnit = { name: string; users: number; respondents: number; openDeviations: number; deviations: number; score: number | null }

type TenantDetail = {
  id: string
  name: string
  industry: string
  description: string
  units: string[]
  compliance: number | null
  questionCount: number
  answeredCount: number
  openDeviations: number
  openActions: number
  userCount: number
  lckCount: number
  accessLevels: string[]
  permissionOptions: string[]
  unitRows: TenantUnit[]
  users: DemoUser[]
  lcks: LckSummary[]
  legalChangesToHandle: number
}

type RegisterEntry = {
  id: string
  area: string
  lawName: string
  dokId: string
  refId: string
  paragraph: string
  requirementText: string
  changeStatus: string
  changeSummary?: string | null
  changeEffectiveDate?: string | null
  changeDetectedDate?: string | null
  changePreviousText?: string | null
  changeNewText?: string | null
  changeBusinessImpact?: string | null
  changeAiGenerated?: boolean
}

type RequirementQuestion = { id: string; text: string }

type LawListRow = RegisterEntry & {
  impact: string
  measures: string
  status: string
  questions: RequirementQuestion[]
  compliance: number | null
  openDeviations: number
}

type LawListSummary = {
  id: string
  name: string
  description: string
  requirementIds: string[]
  requirementCount: number
  compliance: number | null
  areas: string[]
}

type LawScore = {
  lawName: string
  dokId: string
  paragraphs: number
  areas: string[]
  hasLegalChange: boolean
  score: number | null
  questionCount: number
  answeredCount: number
  openDeviations: number
  lckCount: number
}

type Dashboard = {
  tenantIds: string[]
  tenantNames: string[]
  isGlobal: boolean
  totalCompliance: number | null
  controlledRequirements: number
  notRelevant: number
  partiallyCompliant: number
  nonCompliant: number
  openDeviations: number
  unansweredQuestions: number
  legalChangesToReview: number
  byTenant: { tenantId: string; name: string; score: number | null }[]
  byArea: { name: string; score: number | null }[]
  byLawList: { id: string; name: string; score: number | null }[]
  byLaw: LawScore[]
}

type LckQuestion = {
  id: string
  text: string
  responderId: string | null
  answer: string | null
  deviationCause: string | null
  action: string | null
  responsibleId: string | null
  plannedCompletionDate: string | null
  actionComment: string | null
  closedDate: string | null
  documentation: string | null
  registeredById: string | null
  answeredAt: string | null
  deviationId: string | null
  actions: ActionItem[]
}

type LckItem = {
  id: string
  tenantId: string
  requirementId: string
  index: string
  documentName: string
  paragraphs: string
  requirementSummary: string
  compliance: string
  questions: LckQuestion[]
}

type LckSettings = {
  requireCommentOnNo: boolean
  requireCommentOnPartial: boolean
  requireReasonOnNotRelevant: boolean
  allowAttachments: boolean
  sendReminders: boolean
  createDeviationOnNo: boolean
  createDeviationOnPartial: boolean
}

type ActionItem = {
  id: string
  tenantId: string
  tenantName: string
  sourceType: string
  sourceId: string | null
  requirementId: string | null
  law: string | null
  paragraph: string | null
  description: string
  responsibleId: string | null
  responsibleName: string | null
  dueDate: string | null
  status: string
  documentation: string | null
  comment: string | null
  createdAt: string
}

type Deviation = {
  id: string
  tenantId: string
  tenantName: string
  lckId: string
  lckName: string | null
  requirementId: string
  law: string | null
  paragraph: string | null
  area: string | null
  questionText: string | null
  answer: string
  respondentId: string | null
  respondentName: string | null
  unit: string
  comment: string | null
  documentation: string | null
  registeredDate: string
  responsibleId: string | null
  responsibleName: string | null
  dueDate: string | null
  status: string
  createdAutomatically: boolean
  actions: ActionItem[]
}

type LegalChangeHandling = { tenantId: string; status: string; note: string | null; handledAt: string | null }

type LegalChange = {
  id: string
  requirementId: string
  law: string | null
  paragraph: string | null
  area: string | null
  refId: string | null
  detectedDate: string
  effectiveDate: string
  previousText: string
  newText: string
  summary: string
  businessImpact: string
  example: string
  recommendedAction: string
  aiGenerated: boolean
  lawLists: string[]
  handlings: { tenantId: string; tenantName: string; handling: LegalChangeHandling }[]
}

type ReportRow = {
  tenantName: string
  law: string | null
  paragraph: string | null
  question: string
  respondent: string | null
  comment: string | null
  actionComment: string | null
  documentation: string | null
}

type AnswerCounts = { yes: number; partial: number; no: number; notRelevant: number; unanswered: number }

type OverviewReportLck = {
  id: string
  name: string
  status: string
  dueDate: string
  periodFrom: string
  periodTo: string
  tenantNames: string[]
  questionCount: number
  answeredCount: number
  responseRate: number
  compliance: number | null
  deviations: number
}

type OverviewReport = {
  tenantIds: string[]
  tenantNames: string[]
  isGlobal: boolean
  totalCompliance: number | null
  questionCount: number
  answeredCount: number
  responseRate: number
  controlledRequirements: number
  openDeviations: number
  closedDeviations: number
  answers: AnswerCounts
  byTenant: { tenantId: string; name: string; score: number | null }[]
  byArea: { name: string; score: number | null }[]
  lcks: OverviewReportLck[]
}

type LckReport = {
  id: string
  name: string
  status: string
  dueDate: string
  closedAt: string | null
  periodFrom: string
  periodTo: string
  respondents: { id: string; name: string; role: string; unit: string; tenant: string | null }[]
  questionCount: number
  answeredCount: number
  responseRate: number
  totalCompliance: number | null
  answers: AnswerCounts
  deviationsByStatus: { status: string; count: number }[]
  byTenant: { tenantId: string; name: string; score: number | null }[]
  byArea: { name: string; score: number | null }[]
  byRequirement: { requirementId: string; law: string | null; paragraph: string | null; score: number | null }[]
  partial: ReportRow[]
  nonCompliant: ReportRow[]
  notRelevant: ReportRow[]
  deviations: Deviation[]
}

type LckDetail = {
  id: string
  name: string
  status: string
  dueDate: string
  closedAt: string | null
  closedComment: string | null
  isClosed: boolean
  isOverdue: boolean
  statusOptions: string[]
  actionStatusOptions: string[]
  lawListId: string | null
  tenantIds: string[]
  assigneeIds: string[]
  settings: LckSettings
  answerOptions: string[]
  totalCompliance: number | null
  groups: { tenantId: string; tenantName: string; score: number | null; items: LckItem[] }[]
}

type LckSummary = {
  id: string
  name: string
  status: string
  dueDate: string
  isOverdue: boolean
  tenantIds: string[]
  tenantNames: string[]
  assigneeIds: string[]
  requirementCount: number
  questionCount: number
  answeredCount: number
  deviationCount: number
  compliance: number | null
}

/* ------------------------------------------------------------ constants --- */

// Spec §44
const REQUIREMENT_STATUSES = [
  'Ikke vurdert',
  'Relevant',
  'Ikke relevant',
  'Under vurdering',
  'Samsvar',
  'Delvis samsvar',
  'Ikke samsvar',
  'Lovendring til vurdering'
]

// Spec §45
const LIST_FILTERS = [
  'Alle',
  'Compliance under 80 %',
  'Åpne avvik',
  'Lovendringer',
  'Mangler vurdering',
  'Mangler tiltak',
  'Mangler LCK-spørsmål',
  'Ikke relevant'
]

const NAV = [
  { label: 'Virksomheter', path: '/virksomheter' },
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Lovregister', path: '/lovregister' },
  { label: 'Lovlister', path: '/lovlister' },
  { label: 'LCK', path: '/lck' },
  { label: 'Avvik og tiltak', path: '/avvik' },
  { label: 'Lovendringer', path: '/lovendringer' },
  { label: 'Rapporter', path: '/rapporter' }
]

// Demo stand-in for the signed-in administrator.
const ADMIN_USER_ID = 'ingrid'

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init?.headers } : init?.headers
  })
  if (!response.ok) throw new Error(`Forespørselen feilet (${response.status})`)
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

const percent = (value: number | null) => (value === null ? '–' : `${value} %`)

const ACTION_STATE_ORDER = ['overdue', 'ongoing', 'done', 'stale'] as const

function actionState(action: ActionItem): (typeof ACTION_STATE_ORDER)[number] {
  if (action.status === 'Fullført' || action.status === 'Verifisert') return 'done'
  if (action.dueDate && action.dueDate < new Date().toISOString().slice(0, 10)) return 'overdue'
  if(action.status === 'Planlagt') return 'stale'
  return 'ongoing'
}

/* --------------------------------------------------------------- router --- */

function href(path: string, params: Record<string, string | undefined>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value)
  const suffix = query.toString()
  return suffix ? `${path}?${suffix}` : path
}

function useRouter() {
  const [location, setLocation] = useState(() => window.location.pathname + window.location.search)

  useEffect(() => {
    const onPopState = () => setLocation(window.location.pathname + window.location.search)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((to: string) => {
    if (to === window.location.pathname + window.location.search) return
    window.history.pushState({}, '', to)
    setLocation(to)
  }, [])

  const url = new URL(location, window.location.origin)
  const [segment = '', detailId] = url.pathname.split('/').filter(Boolean)
  const page = NAV.some(item => item.path === `/${segment}`) ? `/${segment}` : '/virksomheter'

  return {
    page,
    detailId,
    tenantId: url.searchParams.get('tenant') ?? '',
    lawFilter: url.searchParams.get('lov') ?? undefined,
    navigate
  }
}

/* ------------------------------------------------------------------ app --- */

function App() {
  const { page, detailId, tenantId, lawFilter, navigate } = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [users, setUsers] = useState<DemoUser[]>([])
  const [register, setRegister] = useState<RegisterEntry[]>([])
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  const reload = useCallback(() => setVersion(value => value + 1), [])

  useEffect(() => {
    void (async () => {
      try {
        const [tenantList, userList, registerList] = await Promise.all([
          api<Tenant[]>('/api/tenants'),
          api<DemoUser[]>('/api/users'),
          api<RegisterEntry[]>('/api/law-register')
        ])
        setTenants(tenantList)
        setUsers(userList)
        setRegister(registerList)
        setError('')
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Kunne ikke laste demoen')
      }
    })()
  }, [version])

  const tenant = tenants.find(item => item.id === tenantId)
  const go = (path: string, params: Record<string, string | undefined> = {}) => navigate(href(path, { tenant: tenantId, ...params }))

  return (
    <div className="shell">
      <aside>
        <div className="brand">◆ Norm</div>
        <label className="tenant-switch">
          <span>Visning</span>
          <select value={tenantId} onChange={event => navigate(href(page, { tenant: event.target.value }))}>
            <option value="">Alle virksomheter (globalt)</option>
            {tenants.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <nav>
          {NAV.map(item => (
            <button key={item.path} className={page === item.path ? 'active' : ''} onClick={() => go(item.path)}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="profile">
          Systemadministrator
          <strong>Ingrid Hansen</strong>
        </div>
      </aside>

      <main>
        {error && <p className="error">{error}</p>}

        {page === '/virksomheter' &&
          (detailId ? (
            <TenantDetailPage
              tenantId={detailId}
              version={version}
              reload={reload}
              onBack={() => navigate('/virksomheter')}
              onOpenDashboard={() => navigate(href('/dashboard', { tenant: detailId }))}
              onOpenLck={id => navigate(href(`/lck/${id}`, { tenant: detailId }))}
              onOpenDeviations={() => navigate(href('/avvik', { tenant: detailId }))}
            />
          ) : (
            <TenantOverviewPage
              tenants={tenants}
              users={users}
              register={register}
              reload={reload}
              onOpenTenant={id => navigate(href('/virksomheter/' + id, { tenant: id }))}
              onOpenLck={id => go(`/lck/${id}`)}
            />
          ))}

        {page === '/dashboard' && (
          <DashboardPage
            tenantId={tenantId}
            tenantName={tenant?.name}
            version={version}
            onOpenLists={() => go('/lovlister')}
            onOpenLaw={lawName => go('/lck', { lov: lawName })}
          />
        )}

        {page === '/lovregister' && <RegisterPage register={register} />}

        {page === '/lovlister' &&
          (detailId ? (
            <LawListDetailPage
              listId={detailId}
              tenants={tenants}
              users={users}
              register={register}
              reload={reload}
              onBack={() => go('/lovlister')}
              onOpenLck={id => go(`/lck/${id}`)}
            />
          ) : (
            <LawListsPage register={register} version={version} reload={reload} onOpen={id => go(`/lovlister/${id}`)} />
          ))}

        {page === '/lck' &&
          (detailId ? (
            <LckDetailPage lckId={detailId} users={users} onBack={() => go('/lck')} />
          ) : (
            <LckOverviewPage
              tenantId={tenantId}
              tenantName={tenant?.name}
              lawName={lawFilter}
              onClearLaw={() => go('/lck')}
              tenants={tenants}
              users={users}
              register={register}
              version={version}
              reload={reload}
              onOpen={id => go(`/lck/${id}`, { lov: lawFilter })}
            />
          ))}

        {page === '/avvik' && <DeviationsPage tenantId={tenantId} tenants={tenants} users={users} version={version} reload={reload} />}
        {page === '/lovendringer' && <LegalChangesPage tenantId={tenantId} users={users} version={version} reload={reload} />}
        {page === '/rapporter' && <ReportsPage tenantId={tenantId} version={version} />}
      </main>
    </div>
  )
}

/* --------------------------------------------------- cross-tenant overview - */

function TenantOverviewPage({
  tenants,
  users,
  register,
  reload,
  onOpenTenant,
  onOpenLck
}: {
  tenants: Tenant[]
  users: DemoUser[]
  register: RegisterEntry[]
  reload: () => void
  onOpenTenant: (id: string) => void
  onOpenLck: (id: string) => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [overview, setOverview] = useState<Overview>()
  const [creating, setCreating] = useState(false)

  const ids = selected.length > 0 ? selected : tenants.map(tenant => tenant.id)

  useEffect(() => {
    if (tenants.length === 0) return
    void api<Overview>(`/api/overview?tenantIds=${ids.join(',')}`).then(setOverview)
  }, [tenants, selected.join(',')])

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Systemadministrator</p>
          <h1>Alle virksomheter</h1>
          <p className="subtle">Velg virksomheter for å se samlet compliance, og opprett en LCK som gjelder flere virksomheter.</p>
        </div>
        <button className="primary" onClick={() => setCreating(value => !value)}>
          {creating ? 'Avbryt' : '+ Ny LCK for valgte'}
        </button>
      </header>

      {overview && (
        <section className="cards">
          <Metric label="Samlet compliance" value={percent(overview.totalCompliance)} />
          <Metric label="Kontrollerte krav" value={overview.controlledRequirements} />
          <Metric label="Åpne avvik" value={overview.openDeviations} />
          <Metric label="Ubesvarte spørsmål" value={overview.questions - overview.answered} />
        </section>
      )}

      {creating && (
        <CreateLckForm
          tenants={tenants}
          users={users}
          register={register}
          initialTenantIds={ids}
          onCancel={() => setCreating(false)}
          onCreated={id => {
            setCreating(false)
            reload()
            onOpenLck(id)
          }}
        />
      )}

      <section className="table-panel">
        <div className="panel-head">
          <h2>Virksomheter</h2>
          <span>{selected.length === 0 ? 'Alle virksomheter inngår i totalen' : `${selected.length} valgt`} · klikk en rad for virksomhetskort</span>
        </div>
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th style={{ width: 40 }} />
                <th>Virksomhet</th>
                <th style={{ width: 180 }}>Bransje</th>
                <th style={{ width: 220 }}>Enheter</th>
                <th style={{ width: 110 }}>Lovlister</th>
                <th style={{ width: 140 }}>Besvart</th>
                <th style={{ width: 110 }}>Åpne avvik</th>
                <th style={{ width: 130 }}>Compliance</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(tenant => (
                <tr key={tenant.id} className="clickable" onClick={() => onOpenTenant(tenant.id)}>
                  <td onClick={event => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.includes(tenant.id)}
                      onChange={event => setSelected(event.target.checked ? [...selected, tenant.id] : selected.filter(id => id !== tenant.id))}
                    />
                  </td>
                  <td>
                    <strong>{tenant.name}</strong>
                    <small>{tenant.description}</small>
                  </td>
                  <td>{tenant.industry}</td>
                  <td>{tenant.units.join(', ')}</td>
                  <td>{tenant.lawListCount}</td>
                  <td>
                    {tenant.answeredCount} / {tenant.questionCount}
                  </td>
                  <td>{tenant.openDeviations > 0 ? <span className="bad">{tenant.openDeviations}</span> : <span className="muted">0</span>}</td>
                  <td>
                    <Score value={tenant.compliance} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

/* ------------------------------------------------------- tenant detail --- */

// Virksomhetskort: organisasjon (avdelinger), tilhørende brukere og tilganger som kan endres.
function TenantDetailPage({
  tenantId,
  version,
  reload,
  onBack,
  onOpenDashboard,
  onOpenLck,
  onOpenDeviations
}: {
  tenantId: string
  version: number
  reload: () => void
  onBack: () => void
  onOpenDashboard: () => void
  onOpenLck: (id: string) => void
  onOpenDeviations: () => void
}) {
  const [data, setData] = useState<TenantDetail>()
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<string>()

  const refresh = useCallback(async () => {
    try {
      setData(await api<TenantDetail>(`/api/tenants/${tenantId}`))
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kunne ikke laste virksomheten')
    }
  }, [tenantId])

  useEffect(() => {
    void refresh()
  }, [refresh, version])

  if (error) return <p className="error">{error}</p>
  if (!data) return <p className="subtle">Laster virksomhet…</p>

  const saveUser = async (userId: string, body: Record<string, unknown>) => {
    await api(`/api/users/${userId}`, { method: 'PATCH', body: JSON.stringify(body) })
    await refresh()
    reload()
  }

  const togglePermission = (user: DemoUser, permission: string) => {
    const current = user.permissions ?? []
    const next = current.includes(permission) ? current.filter(item => item !== permission) : [...current, permission]
    return saveUser(user.id, { permissions: next })
  }

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Virksomhet</p>
          <h1>{data.name}</h1>
          <p className="subtle">
            {data.industry} · {data.description}
          </p>
        </div>
        <div className="header-actions">
          <button className="ghost" onClick={onBack}>
            ← Alle virksomheter
          </button>
          <button className="primary" onClick={onOpenDashboard}>
            Åpne dashbord
          </button>
        </div>
      </header>

      <section className="cards">
        <Metric label="Compliance" value={percent(data.compliance)} />
        <Metric label="Avdelinger" value={data.units.length} />
        <Metric label="Brukere" value={data.userCount} />
        <Metric label="Besvarte spørsmål" value={`${data.answeredCount} / ${data.questionCount}`} />
        <Metric label="Åpne avvik" value={data.openDeviations} />
        <Metric label="Tiltak ikke fullført" value={data.openActions} />
        <Metric label="Kontroller (LCK)" value={data.lckCount} />
        <Metric label="Lovendringer til behandling" value={data.legalChangesToHandle} />
      </section>

      <section className="table-panel">
        <div className="panel-head">
          <h2>Organisasjon</h2>
          <span>Avdelinger og enheter i {data.name}</span>
        </div>
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>Avdeling / enhet</th>
                <th style={{ width: 120 }}>Brukere</th>
                <th style={{ width: 130 }}>Respondenter</th>
                <th style={{ width: 130 }}>Avvik totalt</th>
                <th style={{ width: 120 }}>Åpne avvik</th>
                <th style={{ width: 200 }}>Compliance</th>
              </tr>
            </thead>
            <tbody>
              {data.unitRows.map(unit => (
                <tr key={unit.name}>
                  <td>
                    <strong>{unit.name}</strong>
                  </td>
                  <td>{unit.users}</td>
                  <td>{unit.respondents}</td>
                  <td>{unit.deviations}</td>
                  <td>{unit.openDeviations > 0 ? <span className="bad">{unit.openDeviations}</span> : <span className="muted">0</span>}</td>
                  <td>
                    <Score value={unit.score} />
                  </td>
                </tr>
              ))}
              {data.unitRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    Ingen avdelinger registrert.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="table-panel">
        <div className="panel-head">
          <h2>Brukere og tilganger</h2>
          <span>Klikk en rad for å endre tilgangsnivå og rettigheter</span>
        </div>
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>Bruker</th>
                <th style={{ width: 170 }}>Rolle</th>
                <th style={{ width: 150 }}>Avdeling</th>
                <th style={{ width: 200 }}>Tilgangsnivå</th>
                <th style={{ width: 110 }}>Besvart</th>
                <th style={{ width: 110 }}>Åpne avvik</th>
                <th style={{ width: 110 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map(user => (
                <Fragment key={user.id}>
                  <tr className="clickable" onClick={() => setEditing(editing === user.id ? undefined : user.id)}>
                    <td>
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </td>
                    <td>{user.role}</td>
                    <td>{user.unit}</td>
                    <td onClick={event => event.stopPropagation()}>
                      <select value={user.accessLevel ?? ''} onChange={event => void saveUser(user.id, { accessLevel: event.target.value })}>
                        {data.accessLevels.map(option => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                    <td>{user.answeredQuestions ?? 0}</td>
                    <td>{(user.openDeviations ?? 0) > 0 ? <span className="bad">{user.openDeviations}</span> : <span className="muted">0</span>}</td>
                    <td onClick={event => event.stopPropagation()}>
                      <button className={user.active === false ? 'chip-filter' : 'chip-filter active'} onClick={() => void saveUser(user.id, { active: user.active === false })}>
                        {user.active === false ? 'Deaktivert' : 'Aktiv'}
                      </button>
                    </td>
                  </tr>
                  {editing === user.id && (
                    <tr className="expanded">
                      <td colSpan={7}>
                        <div className="access-editor">
                          <div className="field">
                            <span>Avdeling / enhet</span>
                            <select value={user.unit} onChange={event => void saveUser(user.id, { unit: event.target.value })}>
                              {data.units.map(unit => (
                                <option key={unit}>{unit}</option>
                              ))}
                            </select>
                          </div>
                          <div className="field wide">
                            <span>Rettigheter</span>
                            <div className="filter-bar">
                              {data.permissionOptions.map(permission => (
                                <button
                                  key={permission}
                                  className={(user.permissions ?? []).includes(permission) ? 'chip-filter active' : 'chip-filter'}
                                  onClick={() => void togglePermission(user, permission)}
                                >
                                  {permission}
                                </button>
                              ))}
                            </div>
                            <small className="muted">Rettighetene styrer hvilke moduler brukeren ser. Endringer lagres umiddelbart.</small>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {data.users.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    Ingen brukere registrert.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="table-panel">
        <div className="panel-head">
          <h2>Kontroller (LCK)</h2>
          <button className="link-button" onClick={onOpenDeviations}>
            Se avvik og tiltak →
          </button>
        </div>
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>Kontroll</th>
                <th style={{ width: 150 }}>Status</th>
                <th style={{ width: 120 }}>Frist</th>
                <th style={{ width: 130 }}>Besvart</th>
                <th style={{ width: 110 }}>Avvik</th>
                <th style={{ width: 130 }}>Compliance</th>
              </tr>
            </thead>
            <tbody>
              {data.lcks.map(lck => (
                <tr key={lck.id} className="clickable" onClick={() => onOpenLck(lck.id)}>
                  <td>
                    <strong>{lck.name}</strong>
                  </td>
                  <td>
                    <span className="pill">{lck.status}</span>
                  </td>
                  <td>{lck.dueDate}</td>
                  <td>
                    {lck.answeredCount} / {lck.questionCount}
                  </td>
                  <td>{lck.deviationCount > 0 ? <span className="bad">{lck.deviationCount}</span> : <span className="muted">0</span>}</td>
                  <td>
                    <Score value={lck.compliance} />
                  </td>
                </tr>
              ))}
              {data.lcks.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    Ingen kontroller for denne virksomheten.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

/* ------------------------------------------------------------ dashboard --- */

function DashboardPage({
  tenantId,
  tenantName,
  version,
  onOpenLists,
  onOpenLaw
}: {
  tenantId: string
  tenantName?: string
  version: number
  onOpenLists: () => void
  onOpenLaw: (lawName: string) => void
}) {
  const [data, setData] = useState<Dashboard>()

  useEffect(() => {
    setData(undefined)
    void api<Dashboard>(`/api/dashboard?tenantIds=${encodeURIComponent(tenantId)}`).then(setData)
  }, [tenantId, version])

  if (!data) return <p className="subtle">Laster dashboard…</p>

  const global = !tenantId

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">{global ? 'Globalt compliance dashboard' : 'Compliance dashboard'}</p>
          <h1>{global ? 'Alle virksomheter' : (tenantName ?? 'Virksomhet')}</h1>
          <p className="subtle">
            {global
              ? `Samlet score for ${data.tenantNames.length} virksomheter. Ja = 100, Delvis = 50, Nei = 0. «Ikke relevant» holdes utenfor grunnlaget.`
              : 'Score beregnes som Ja = 100, Delvis = 50, Nei = 0. «Ikke relevant» holdes utenfor grunnlaget.'}
          </p>
        </div>
        <button className="primary" onClick={onOpenLists}>
          Åpne lovlistene
        </button>
      </header>

      <section className="cards">
        <Metric label="Total compliance" value={percent(data.totalCompliance)} />
        <Metric label="Kontrollerte krav" value={data.controlledRequirements} />
        <Metric label="Ikke relevant" value={data.notRelevant} />
        <Metric label="Delvis samsvar" value={data.partiallyCompliant} />
        <Metric label="Ikke samsvar" value={data.nonCompliant} />
        <Metric label="Åpne avvik" value={data.openDeviations} />
        <Metric label="Ubesvarte LCK-spørsmål" value={data.unansweredQuestions} />
        <Metric label="Lovendringer til vurdering" value={data.legalChangesToReview} />
      </section>

      <div className="split">
        {global && (
          <section className="table-panel">
            <div className="panel-head">
              <h2>Compliance per virksomhet</h2>
            </div>
            <BarList rows={data.byTenant.map(row => ({ name: row.name, score: row.score }))} />
          </section>
        )}
        <section className="table-panel">
          <div className="panel-head">
            <h2>Compliance per lovområde</h2>
          </div>
          <BarList rows={data.byArea.map(row => ({ name: row.name, score: row.score }))} />
        </section>
        <section className="table-panel">
          <div className="panel-head">
            <h2>Compliance per lovliste</h2>
          </div>
          <BarList rows={data.byLawList.map(row => ({ name: row.name, score: row.score }))} />
        </section>
      </div>

      <section className="table-panel">
        <div className="panel-head">
          <h2>Compliance per lov</h2>
          <span>Klikk en lov for å se kontrollene som dekker den</span>
        </div>
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>Lov/forskrift</th>
                <th style={{ width: 220 }}>Områder</th>
                <th style={{ width: 110 }}>Paragrafer</th>
                <th style={{ width: 130 }}>Besvart</th>
                <th style={{ width: 110 }}>Åpne avvik</th>
                <th style={{ width: 100 }}>LCK-er</th>
                <th style={{ width: 200 }}>Compliance</th>
              </tr>
            </thead>
            <tbody>
              {data.byLaw.map(row => (
                <tr key={row.lawName} className="clickable" onClick={() => onOpenLaw(row.lawName)}>
                  <td>
                    <strong>{row.lawName}</strong>
                    <small>
                      {row.dokId}
                      {row.hasLegalChange && ' · Ny lovendring'}
                    </small>
                  </td>
                  <td>{row.areas.join(', ')}</td>
                  <td>{row.paragraphs}</td>
                  <td>
                    {row.answeredCount} / {row.questionCount}
                  </td>
                  <td>{row.openDeviations > 0 ? <span className="bad">{row.openDeviations}</span> : <span className="muted">0</span>}</td>
                  <td>{row.lckCount}</td>
                  <td>
                    <div className="score-cell">
                      <div className="bar-track">
                        <div
                          className={`bar-fill ${row.score === null ? 'none' : row.score >= 80 ? 'good' : row.score >= 60 ? 'warn' : 'bad'}`}
                          style={{ width: `${row.score ?? 0}%` }}
                        />
                      </div>
                      <strong>{percent(row.score)}</strong>
                    </div>
                  </td>
                </tr>
              ))}
              {data.byLaw.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    Ingen lover i lovlistene ennå.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

function BarList({ rows }: { rows: { name: string; score: number | null }[] }) {
  return (
    <div className="bar-list">
      {rows.map(row => (
        <div className="bar-row" key={row.name}>
          <span>{row.name}</span>
          <div className="bar-track">
            <div className={`bar-fill ${row.score === null ? 'none' : row.score >= 80 ? 'good' : row.score >= 60 ? 'warn' : 'bad'}`} style={{ width: `${row.score ?? 0}%` }} />
          </div>
          <strong>{percent(row.score)}</strong>
        </div>
      ))}
      {rows.length === 0 && <p className="empty">Ingen data ennå.</p>}
    </div>
  )
}

/* --------------------------------------------------------- law register --- */

function RegisterPage({ register }: { register: RegisterEntry[] }) {
  const [search, setSearch] = useState('')
  const [area, setArea] = useState('Alle')
  const [onlyChanges, setOnlyChanges] = useState(false)
  const [expanded, setExpanded] = useState<string>()

  const areas = useMemo(() => ['Alle', ...Array.from(new Set(register.map(item => item.area)))], [register])
  const filtered = register.filter(
    item =>
      (area === 'Alle' || item.area === area) &&
      (!onlyChanges || item.changeStatus === 'Ny lovendring') &&
      `${item.lawName} ${item.paragraph} ${item.requirementText} ${item.area}`.toLowerCase().includes(search.toLowerCase())
  )
  const changeCount = register.filter(item => item.changeStatus === 'Ny lovendring').length

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Lovregister</p>
          <h1>Lover og forskrifter fra Lovdata</h1>
          <p className="subtle">
            Registeret er felles og skrivebeskyttet. Klikk en rad for lovtekst – paragrafer med «Ny lovendring» viser en kort endringstekst.
          </p>
        </div>
      </header>

      <section className="table-panel">
        <div className="panel-head wrap">
          <input className="search" placeholder="Søk i lov, forskrift, paragraf eller lovkrav…" value={search} onChange={event => setSearch(event.target.value)} />
          <div className="filter-bar">
            {areas.map(option => (
              <button key={option} className={option === area ? 'chip-filter active' : 'chip-filter'} onClick={() => setArea(option)}>
                {option}
              </button>
            ))}
            <button className={onlyChanges ? 'chip-filter active' : 'chip-filter'} onClick={() => setOnlyChanges(value => !value)}>
              Kun lovendringer ({changeCount})
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th style={{ width: 150 }}>Område</th>
                <th style={{ width: 220 }}>Lov/forskrift</th>
                <th style={{ width: 100 }}>Paragraf</th>
                <th>Lovkrav</th>
                <th style={{ width: 160 }}>Endringsstatus</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <Fragment key={item.id}>
                  <tr className={expanded === item.id ? 'clickable selected' : 'clickable'} onClick={() => setExpanded(expanded === item.id ? undefined : item.id)}>
                    <td>{item.area}</td>
                    <td>
                      <strong>{item.lawName}</strong>
                    </td>
                    <td>{item.paragraph}</td>
                    <td className="clamp">{item.requirementText}</td>
                    <td>
                      {item.changeStatus === 'Ny lovendring' ? (
                        <>
                          <span className="pill change">Ny lovendring</span>
                          {item.changeSummary && <small className="change-teaser">{item.changeSummary}</small>}
                        </>
                      ) : (
                        <span className="muted">Ingen endring</span>
                      )}
                    </td>
                  </tr>
                  {expanded === item.id && (
                    <tr className="expanded">
                      <td colSpan={5}>
                        <div className="rule-info">
                          <p className="eyebrow">Gjeldende lovtekst · Lovdata</p>
                          <h3>
                            {item.lawName} {item.paragraph}
                          </h3>
                          <p>{item.requirementText}</p>
                          {item.changeStatus === 'Ny lovendring' && (
                            <div className="change-note">
                              <div className="change-note-head">
                                <span className="pill change">Ny lovendring</span>
                                {item.changeEffectiveDate && <small>Trer i kraft {item.changeEffectiveDate}</small>}
                                {item.changeDetectedDate && <small>Oppdaget {item.changeDetectedDate}</small>}
                                {item.changeAiGenerated && <span className="ai-badge">AI-oppsummert</span>}
                              </div>
                              <p className="change-note-summary">{item.changeSummary ?? 'Paragrafen er endret i Lovdata. Se lovendringer for detaljer.'}</p>
                              {item.changeBusinessImpact && <p className="change-note-impact">{item.changeBusinessImpact}</p>}
                              {(item.changePreviousText || item.changeNewText) && (
                                <div className="change-diff">
                                  <p className="cell-text old">{item.changePreviousText}</p>
                                  <p className="cell-text new">{item.changeNewText}</p>
                                </div>
                              )}
                            </div>
                          )}
                          <a href={`/api/lovdata/render?refId=${encodeURIComponent(item.refId)}`} target="_blank" rel="noreferrer">
                            Åpne detaljert paragraftekst ↗
                          </a>
                          <p className="readonly-note">Skrivebeskyttet. Legg paragrafen i en lovliste for å registrere virksomhetens vurdering og tiltak.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    Ingen treff.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

/* ------------------------------------------------------------ law lists --- */

function LawListsPage({
  register,
  version,
  reload,
  onOpen
}: {
  register: RegisterEntry[]
  version: number
  reload: () => void
  onOpen: (id: string) => void
}) {
  const [lists, setLists] = useState<LawListSummary[]>([])
  const [creating, setCreating] = useState(false)

  const refresh = useCallback(async () => setLists(await api<LawListSummary[]>('/api/law-lists')), [])

  useEffect(() => {
    void refresh()
  }, [refresh, version])

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Lovlister · globale</p>
          <h1>Lovlister</h1>
          <p className="subtle">En lovliste er et globalt utvalg paragrafer fra lovregisteret, for eksempel «Norway Bus». Kontroller opprettes fra listen og tildeles virksomheter.</p>
        </div>
        <button className="primary" onClick={() => setCreating(value => !value)}>
          {creating ? 'Avbryt' : '+ Ny lovliste'}
        </button>
      </header>

      {creating && (
        <LawListForm
          register={register}
          onCancel={() => setCreating(false)}
          onSubmit={async payload => {
            const created = await api<{ id: string }>('/api/law-lists', { method: 'POST', body: JSON.stringify(payload) })
            setCreating(false)
            await refresh()
            reload()
            onOpen(created.id)
          }}
        />
      )}

      <section className="table-panel">
        <div className="panel-head">
          <h2>Oversikt</h2>
          <span>{lists.length} lister · klikk en rad for å åpne</span>
        </div>
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th style={{ width: 220 }}>Navn</th>
                <th>Beskrivelse</th>
                <th style={{ width: 240 }}>Områder</th>
                <th style={{ width: 110 }}>Paragrafer</th>
                <th style={{ width: 130 }}>Compliance</th>
                <th style={{ width: 170 }} />
              </tr>
            </thead>
            <tbody>
              {lists.map(list => (
                <tr key={list.id} className="clickable" onClick={() => onOpen(list.id)}>
                  <td>
                    <strong>{list.name}</strong>
                  </td>
                  <td className="clamp">{list.description || <span className="muted">Ingen beskrivelse</span>}</td>
                  <td>{list.areas.join(', ')}</td>
                  <td>{list.requirementCount}</td>
                  <td>
                    <Score value={list.compliance} />
                  </td>
                  <td className="right" onClick={event => event.stopPropagation()}>
                    <button className="primary small" onClick={() => onOpen(list.id)}>
                      Åpne
                    </button>{' '}
                    <button
                      className="ghost danger"
                      onClick={async () => {
                        if (!confirm(`Slette lovlisten «${list.name}»?`)) return
                        await api(`/api/law-lists/${list.id}`, { method: 'DELETE' })
                        await refresh()
                        reload()
                      }}
                    >
                      Slett
                    </button>
                  </td>
                </tr>
              ))}
              {lists.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    Ingen lovlister er opprettet ennå.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

function LawListForm({
  register,
  initialName = '',
  initialDescription = '',
  initialRequirementIds = [],
  submitLabel = 'Opprett lovliste',
  onCancel,
  onSubmit
}: {
  register: RegisterEntry[]
  initialName?: string
  initialDescription?: string
  initialRequirementIds?: string[]
  submitLabel?: string
  onCancel: () => void
  onSubmit: (payload: { name: string; description: string; requirementIds: string[] }) => Promise<void>
}) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [requirementIds, setRequirementIds] = useState<string[]>(initialRequirementIds)
  const [saving, setSaving] = useState(false)

  return (
    <section className="wizard">
      <div className="wizard-head">
        <h2>{submitLabel === 'Opprett lovliste' ? 'Ny lovliste' : 'Endre lovliste'}</h2>
        <p className="subtle">Søk i lovregisteret og velg paragrafene som skal inngå.</p>
      </div>

      <div className="wizard-grid">
        <label className="field">
          <span>Navn</span>
          <input value={name} placeholder="For eksempel Norway Bus" onChange={event => setName(event.target.value)} />
        </label>
        <label className="field wide">
          <span>Beskrivelse</span>
          <input value={description} onChange={event => setDescription(event.target.value)} />
        </label>
      </div>

      <PickerList
        title="Paragrafer fra lovregisteret"
        options={register.map(item => ({
          id: item.id,
          group: item.area,
          primary: `${item.lawName} ${item.paragraph}`,
          secondary: item.requirementText
        }))}
        selected={requirementIds}
        onChange={setRequirementIds}
        searchPlaceholder="Søk etter lov, forskrift, paragraf eller lovkrav…"
      />

      <div className="editor-actions">
        <button className="ghost" onClick={onCancel}>
          Avbryt
        </button>
        <button
          className="primary"
          disabled={saving || !name.trim() || requirementIds.length === 0}
          onClick={async () => {
            setSaving(true)
            try {
              await onSubmit({ name, description, requirementIds })
            } finally {
              setSaving(false)
            }
          }}
        >
          {saving ? 'Lagrer…' : submitLabel}
        </button>
      </div>
    </section>
  )
}

function LawListDetailPage({
  listId,
  tenants,
  users,
  register,
  reload,
  onBack,
  onOpenLck
}: {
  listId: string
  tenants: Tenant[]
  users: DemoUser[]
  register: RegisterEntry[]
  reload: () => void
  onBack: () => void
  onOpenLck: (id: string) => void
}) {
  const [data, setData] = useState<{ list: LawListSummary; rows: LawListRow[] }>()
  const [editing, setEditing] = useState(false)
  const [creatingLck, setCreatingLck] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Alle')
  const [expanded, setExpanded] = useState<string>()

  const refresh = useCallback(async () => setData(await api<{ list: LawListSummary; rows: LawListRow[] }>(`/api/law-lists/${listId}`)), [listId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (!data) return <p className="subtle">Laster lovliste…</p>

  const matchesFilter = (row: LawListRow) => {
    switch (filter) {
      case 'Compliance under 80 %':
        return row.compliance !== null && row.compliance < 80
      case 'Åpne avvik':
        return row.openDeviations > 0
      case 'Lovendringer':
        return row.changeStatus === 'Ny lovendring'
      case 'Mangler vurdering':
        return !row.impact.trim()
      case 'Mangler tiltak':
        return !row.measures.trim()
      case 'Mangler LCK-spørsmål':
        return row.questions.length === 0
      case 'Ikke relevant':
        return row.status === 'Ikke relevant'
      default:
        return true
    }
  }

  const rows = data.rows.filter(
    row => matchesFilter(row) && `${row.lawName} ${row.paragraph} ${row.requirementText} ${row.impact} ${row.measures}`.toLowerCase().includes(search.toLowerCase())
  )

  const save = async (requirementId: string, body: Record<string, unknown>) => {
    await api(`/api/requirements/${requirementId}/content`, { method: 'PATCH', body: JSON.stringify(body) })
    await refresh()
    reload()
  }

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Lovliste · global</p>
          <h1>{data.list.name}</h1>
          <p className="subtle">{data.list.description || 'Dobbeltklikk i en celle for rask redigering, eller klikk raden for full paragrafdetalj.'}</p>
        </div>
        <div className="header-actions">
          <button className="primary" disabled={selected.length === 0} onClick={() => setCreatingLck(value => !value)}>
            {creatingLck ? 'Avbryt LCK' : `Opprett LCK av valgte (${selected.length})`}
          </button>
          <button className="ghost" onClick={() => setEditing(value => !value)}>
            {editing ? 'Avbryt' : 'Endre utvalg'}
          </button>
          <button className="warn" onClick={onBack}>
            Tilbake til lovlistene
          </button>
        </div>
      </header>

      {creatingLck && (
        <CreateLckForm
          tenants={tenants}
          users={users}
          register={register}
          lawListId={data.list.id}
          lawListName={data.list.name}
          initialRequirementIds={selected}
          initialTenantIds={[]}
          onCancel={() => setCreatingLck(false)}
          onCreated={async id => {
            setCreatingLck(false)
            setSelected([])
            reload()
            onOpenLck(id)
          }}
        />
      )}

      {editing && (
        <LawListForm
          register={register}
          initialName={data.list.name}
          initialDescription={data.list.description}
          initialRequirementIds={data.list.requirementIds}
          submitLabel="Lagre lovliste"
          onCancel={() => setEditing(false)}
          onSubmit={async payload => {
            await api(`/api/law-lists/${listId}`, { method: 'PATCH', body: JSON.stringify(payload) })
            setEditing(false)
            await refresh()
            reload()
          }}
        />
      )}

      <section className="table-panel">
        <div className="panel-head wrap">
          <input className="search" placeholder="Søk i lovlisten…" value={search} onChange={event => setSearch(event.target.value)} />
          <div className="filter-bar">
            {LIST_FILTERS.map(option => (
              <button key={option} className={option === filter ? 'chip-filter active' : 'chip-filter'} onClick={() => setFilter(option)}>
                {option}
              </button>
            ))}
          </div>
        </div>
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th className="col-check">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && rows.every(row => selected.includes(row.id))}
                    onChange={event => setSelected(event.target.checked ? rows.map(row => row.id) : [])}
                  />
                </th>
                <th style={{ width: 190 }}>Lov/forskrift</th>
                <th style={{ width: 90 }}>Paragraf</th>
                <th>Lovkrav</th>
                <th>Hvordan påvirker dette oss?</th>
                <th>Våre tiltak/handlinger</th>
                <th style={{ width: 110 }}>LCK</th>
                <th style={{ width: 170 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <Fragment key={row.id}>
                  <tr className={expanded === row.id ? 'selected' : ''} onClick={() => setExpanded(expanded === row.id ? undefined : row.id)}>
                    <td className="col-check" onClick={event => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.includes(row.id)}
                        onChange={event => setSelected(event.target.checked ? [...selected, row.id] : selected.filter(id => id !== row.id))}
                      />
                    </td>
                    <td>
                      <strong>{row.lawName}</strong>
                      <small>{row.area}</small>
                    </td>
                    <td>{row.paragraph}</td>
                    <td className="clamp">{row.requirementText}</td>
                    <td className="clamp">
                      <EditableCell value={row.impact} multiline onSave={value => save(row.id, { impact: value })} />
                    </td>
                    <td className="clamp">
                      <EditableCell value={row.measures} multiline onSave={value => save(row.id, { measures: value })} />
                    </td>
                    <td>{row.questions.length} spørsmål</td>
                    <td>
                      <span className="pill">{row.status}</span>
                      <small>
                        Compliance {percent(row.compliance)}
                        {row.changeStatus === 'Ny lovendring' && ' · Ny lovendring'}
                      </small>
                    </td>
                  </tr>
                  {expanded === row.id && (
                    <tr className="expanded">
                      <td colSpan={8}>
                        <RequirementDetail row={row} onSave={body => save(row.id, body)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted">
                    Ingen paragrafer matcher søket eller filteret.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

// Spec §13/§48: lovtekst, vurdering, tiltak, LCK-spørsmål, compliance og lovendringer på én skjerm.
function RequirementDetail({ row, onSave }: { row: LawListRow; onSave: (body: Record<string, unknown>) => Promise<void> }) {
  const [impact, setImpact] = useState(row.impact)
  const [measures, setMeasures] = useState(row.measures)
  const [status, setStatus] = useState(row.status)
  const [questions, setQuestions] = useState(row.questions)
  const [saving, setSaving] = useState(false)

  return (
    <div className="expanded-editor" onClick={event => event.stopPropagation()}>
      <div className="rule-info">
        <p className="eyebrow">Gjeldende lovtekst · Lovdata</p>
        <h3>
          {row.lawName} {row.paragraph}
        </h3>
        <p>{row.requirementText}</p>
        <a href={`/api/lovdata/render?refId=${encodeURIComponent(row.refId)}`} target="_blank" rel="noreferrer">
          Åpne detaljert paragraftekst ↗
        </a>
        <p className="detail-meta">
          Compliance-status: <strong>{percent(row.compliance)}</strong> · Åpne avvik: <strong>{row.openDeviations}</strong> · Lovendring:{' '}
          <strong>{row.changeStatus}</strong>
        </p>
      </div>

      <div className="edit-grid">
        <label className="field">
          <span>Hvordan påvirker dette virksomheten?</span>
          <textarea rows={6} value={impact} onChange={event => setImpact(event.target.value)} />
        </label>
        <label className="field">
          <span>Våre tiltak/handlinger</span>
          <textarea rows={6} value={measures} onChange={event => setMeasures(event.target.value)} />
        </label>
        <div className="field">
          <span>Status</span>
          <select value={status} onChange={event => setStatus(event.target.value)}>
            {REQUIREMENT_STATUSES.map(option => (
              <option key={option}>{option}</option>
            ))}
          </select>

          <span className="field-heading">LCK-spørsmål</span>
          {questions.map((question, position) => (
            <div className="question-edit" key={question.id}>
              <input
                value={question.text}
                placeholder="Skriv kontrollspørsmål"
                onChange={event => setQuestions(questions.map((current, index) => (index === position ? { ...current, text: event.target.value } : current)))}
              />
              <button className="icon danger" title="Fjern spørsmål" onClick={() => setQuestions(questions.filter((_, index) => index !== position))}>
                ×
              </button>
            </div>
          ))}
          <button className="link-button" onClick={() => setQuestions([...questions, { id: '', text: '' }])}>
            + Legg til kontrollspørsmål
          </button>
        </div>
      </div>

      <div className="editor-actions">
        <button
          className="primary"
          disabled={saving}
          onClick={async () => {
            setSaving(true)
            try {
              await onSave({ impact, measures, status, questions: questions.filter(question => question.text.trim()) })
            } finally {
              setSaving(false)
            }
          }}
        >
          {saving ? 'Lagrer…' : 'Lagre endringer'}
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ lck --- */

function LckOverviewPage({
  tenantId,
  tenantName,
  lawName,
  onClearLaw,
  tenants,
  users,
  register,
  version,
  reload,
  onOpen
}: {
  tenantId: string
  tenantName?: string
  lawName?: string
  onClearLaw: () => void
  tenants: Tenant[]
  users: DemoUser[]
  register: RegisterEntry[]
  version: number
  reload: () => void
  onOpen: (id: string) => void
}) {
  const [lcks, setLcks] = useState<LckSummary[]>([])
  const [creating, setCreating] = useState(false)

  const refresh = useCallback(async () => {
    const query = new URLSearchParams()
    if (tenantId) query.set('tenantId', tenantId)
    if (lawName) query.set('lawName', lawName)
    setLcks(await api<LckSummary[]>(`/api/lcks?${query}`))
  }, [tenantId, lawName])

  useEffect(() => {
    void refresh()
  }, [refresh, version])

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">LCK{lawName ? ` · ${lawName}` : ''}</p>
          <h1>Law Compliance Check</h1>
          <p className="subtle">
            {lawName
              ? `Kontroller som dekker ${lawName}. Tallene gjelder kun paragrafene i denne loven.`
              : tenantId
                ? `Kontroller som omfatter ${tenantName ?? 'valgt virksomhet'}.`
                : 'Alle kontroller på tvers av virksomhetene.'}
          </p>
        </div>
        <div className="header-actions">
          {lawName && (
            <button className="ghost" onClick={onClearLaw}>
              Fjern lovfilter
            </button>
          )}
          <button className="primary" onClick={() => setCreating(value => !value)}>
            {creating ? 'Avbryt' : '+ Ny LCK'}
          </button>
        </div>
      </header>

      {creating && (
        <CreateLckForm
          tenants={tenants}
          users={users}
          register={register}
          initialTenantIds={tenantId ? [tenantId] : []}
          onCancel={() => setCreating(false)}
          onCreated={async id => {
            setCreating(false)
            await refresh()
            reload()
            onOpen(id)
          }}
        />
      )}
      <section className="table-panel">
        <div className="panel-head">
          <h2>Kontroller</h2>
          <span>{lcks.length} aktive · klikk en rad for å åpne</span>
        </div>
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>Navn</th>
                <th style={{ width: 220 }}>Virksomheter</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 110 }}>Frist</th>
                <th style={{ width: 100 }}>Krav</th>
                <th style={{ width: 120 }}>Besvart</th>
                <th style={{ width: 100 }}>Avvik</th>
                <th style={{ width: 120 }}>Compliance</th>
                <th style={{ width: 100 }} />
              </tr>
            </thead>
            <tbody>
              {lcks.map(lck => (
                <tr key={lck.id} className="clickable" onClick={() => onOpen(lck.id)}>
                  <td>
                    <strong>{lck.name}</strong>
                  </td>
                  <td className="clamp">{lck.tenantNames.join(', ')}</td>
                  <td>
                    <span className="pill">{lck.status}</span>
                  </td>
                  <td>
                    {lck.dueDate}
                    {lck.isOverdue && <small className="bad">Forfalt</small>}
                  </td>
                  <td>{lck.requirementCount}</td>
                  <td>
                    {lck.answeredCount} / {lck.questionCount}
                  </td>
                  <td>{lck.deviationCount > 0 ? <span className="bad">{lck.deviationCount}</span> : <span className="muted">0</span>}</td>
                  <td>
                    <Score value={lck.compliance} />
                  </td>
                  <td className="right" onClick={event => event.stopPropagation()}>
                    <button className="primary small" onClick={() => onOpen(lck.id)}>
                      Åpne
                    </button>
                  </td>
                </tr>
              ))}
              {lcks.length === 0 && (
                <tr>
                  <td colSpan={9} className="muted">
                    Ingen kontroller ennå.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

// Spec §21: navn → lovliste → paragrafer → virksomheter → respondenter → frist → innstillinger.
function CreateLckForm({
  tenants,
  users,
  register,
  initialTenantIds,
  initialRequirementIds = [],
  lawListId: fixedLawListId,
  lawListName,
  onCancel,
  onCreated
}: {
  tenants: Tenant[]
  users: DemoUser[]
  register: RegisterEntry[]
  initialTenantIds: string[]
  initialRequirementIds?: string[]
  lawListId?: string
  lawListName?: string
  onCancel: () => void
  onCreated: (id: string) => void | Promise<void>
}) {
  const [name, setName] = useState(lawListName ? `LCK ${lawListName}` : 'Ny LCK')
  const [tenantIds, setTenantIds] = useState<string[]>(initialTenantIds)
  const [lawLists, setLawLists] = useState<LawListSummary[]>([])
  const [lawListId, setLawListId] = useState(fixedLawListId ?? '')
  const [requirementIds, setRequirementIds] = useState<string[]>(initialRequirementIds)
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10))
  const [settings, setSettings] = useState<LckSettings>({
    requireCommentOnNo: true,
    requireCommentOnPartial: true,
    requireReasonOnNotRelevant: false,
    allowAttachments: true,
    sendReminders: true,
    createDeviationOnNo: true,
    createDeviationOnPartial: false
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (fixedLawListId) return
    void (async () => setLawLists(await api<LawListSummary[]>('/api/law-lists')))()
  }, [fixedLawListId])

  const listRequirementIds = lawListId ? (lawLists.find(list => list.id === lawListId)?.requirementIds ?? null) : null
  const scopedRegister = fixedLawListId
    ? register.filter(item => initialRequirementIds.includes(item.id))
    : listRequirementIds
      ? register.filter(item => listRequirementIds.includes(item.id))
      : register
  const options = scopedRegister.map(item => ({
    id: item.id,
    group: item.area,
    primary: `${item.lawName} ${item.paragraph}`,
    secondary: item.requirementText
  }))

  const respondents = users.filter(user => tenantIds.includes(user.tenantId))

  return (
    <section className="wizard">
      <div className="wizard-head">
        <h2>Ny LCK</h2>
        <p className="subtle">
          {fixedLawListId
            ? `Utvalget kommer fra lovlisten «${lawListName}». Velg hvilke virksomheter som skal svare – kontrollen opprettes for alle valgte.`
            : 'Kontrollen opprettes per valgt virksomhet, med forhåndsutfylte vurderinger og kontrollspørsmål fra lovlisten.'}
        </p>
      </div>

      <div className="wizard-grid">
        <label className="field">
          <span>1 · Navn</span>
          <input value={name} onChange={event => setName(event.target.value)} />
        </label>
        {!fixedLawListId && (
          <label className="field">
            <span>2 · Lovliste</span>
            <select
              value={lawListId}
              onChange={event => {
                setLawListId(event.target.value)
                setRequirementIds([])
              }}
            >
              <option value="">Hele lovregisteret</option>
              {lawLists.map(list => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.requirementCount})
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          <span>5 · Frist</span>
          <input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} />
        </label>
      </div>

      <PickerList
        title="3 · Virksomheter som skal svare"
        options={tenants.map(tenant => ({ id: tenant.id, primary: tenant.name, secondary: `${tenant.industry} · ${tenant.units.join(', ')}` }))}
        selected={tenantIds}
        onChange={setTenantIds}
        searchPlaceholder="Søk etter virksomhet…"
      />

      <div className="wizard-columns">
        <PickerList
          title="4 · Paragrafer"
          options={options}
          selected={requirementIds}
          onChange={setRequirementIds}
          searchPlaceholder="Søk etter lov, forskrift eller paragraf…"
        />
        <PickerList
          title="5 · Respondenter"
          options={respondents.map(user => ({
            id: user.id,
            group: tenants.find(tenant => tenant.id === user.tenantId)?.name,
            primary: user.name,
            secondary: `${user.role} · ${user.unit}`
          }))}
          selected={assigneeIds}
          onChange={setAssigneeIds}
          searchPlaceholder="Søk etter navn, rolle eller enhet…"
        />
      </div>

      <div className="settings">
        <span className="field-heading">6 · Innstillinger</span>
        {(
          [
            ['requireCommentOnNo', 'Krev kommentar ved «Nei»'],
            ['requireCommentOnPartial', 'Krev kommentar ved «Delvis»'],
            ['requireReasonOnNotRelevant', 'Krev begrunnelse ved «Ikke relevant»'],
            ['allowAttachments', 'Tillat vedlegg'],
            ['sendReminders', 'Send påminnelser'],
            ['createDeviationOnNo', 'Opprett avvik automatisk ved «Nei»'],
            ['createDeviationOnPartial', 'Opprett avvik automatisk ved «Delvis»']
          ] as [keyof LckSettings, string][]
        ).map(([key, label]) => (
          <label key={key} className={settings[key] ? 'tag active' : 'tag'}>
            <input type="checkbox" checked={settings[key]} onChange={event => setSettings({ ...settings, [key]: event.target.checked })} />
            {label}
          </label>
        ))}
      </div>

      <div className="editor-actions">
        <button className="ghost" onClick={onCancel}>
          Avbryt
        </button>
        <button
          className="primary"
          disabled={saving || requirementIds.length === 0 || tenantIds.length === 0}
          onClick={async () => {
            setSaving(true)
            try {
              const created = await api<{ id: string }>('/api/lcks', {
                method: 'POST',
                body: JSON.stringify({ name, lawListId: lawListId || null, tenantIds, requirementIds, assigneeIds, dueDate, settings })
              })
              await onCreated(created.id)
            } finally {
              setSaving(false)
            }
          }}
        >
          {saving ? 'Oppretter…' : '7 · Opprett og send LCK'}
        </button>
      </div>
    </section>
  )
}

function LckDetailPage({ lckId, users, onBack }: { lckId: string; users: DemoUser[]; onBack: () => void }) {
  const [lck, setLck] = useState<LckDetail>()
  const [expanded, setExpanded] = useState<string>()

  const refresh = useCallback(async () => setLck(await api<LckDetail>(`/api/lcks/${lckId}`)), [lckId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (!lck) return <p className="subtle">Laster kontroll…</p>

  const questions = lck.groups.flatMap(group => group.items).flatMap(item => item.questions)
  const counts = {
    unanswered: questions.filter(question => !question.answer).length,
    deviation: questions.filter(question => question.answer === 'Nei' && !question.closedDate).length,
    partial: questions.filter(question => question.answer === 'Delvis' && !question.closedDate).length,
    compliant: questions.filter(question => question.answer === 'Ja').length,
    notRelevant: questions.filter(question => question.answer === 'Ikke relevant').length
  }

  const patchQuestion = async (itemId: string, questionId: string, patch: Partial<LckQuestion>) => {
    await api(`/api/lcks/${lck.id}/items/${itemId}/questions/${questionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...patch, registeredById: ADMIN_USER_ID })
    })
    await refresh()
  }

  const setStatus = async (status: string, comment?: string) => {
    await api(`/api/lcks/${lck.id}/status`, { method: 'POST', body: JSON.stringify({ status, comment: comment ?? null }) })
    await refresh()
  }

  return (
    <>
      <div className="lck-toolbar">
        <div className="toolbar-left">
          <label className="inline-field">
            <span>Status</span>
            <select value={lck.status} onChange={event => void setStatus(event.target.value)}>
              {lck.statusOptions.map(option => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          {lck.isClosed ? (
            <button className="ghost" onClick={() => void setStatus('Pågår')}>
              Gjenåpne kontroll
            </button>
          ) : (
            <button
              className="ghost"
              onClick={() => {
                const comment = prompt('Kommentar ved lukking (valgfritt)') ?? undefined
                void setStatus('Lukket', comment)
              }}
            >
              Lukk kontroll
            </button>
          )}
          {lck.isOverdue && (
            <button className="ghost" onClick={() => void setStatus('Besvart')}>
              Marker som besvart
            </button>
          )}
        </div>
        <div className="toolbar-right">
          <div className="status-chips" title="Ubesvart · Nei · Delvis · Ja · Ikke relevant">
            <span className="chip chip-dark">{counts.unanswered}</span>
            <span className="chip chip-red">{counts.deviation}</span>
            <span className="chip chip-orange">{counts.partial}</span>
            <span className="chip chip-green">{counts.compliant}</span>
            <span className="chip chip-grey">{counts.notRelevant}</span>
          </div>
          <button className="ghost" disabled={lck.isClosed} onClick={() => void setStatus('Sendt')}>
            Send til respondenter
          </button>
          <button className="warn" onClick={onBack}>
            Tilbake til LCK-oversikten
          </button>
        </div>
      </div>

      <section className="lck-meta">
        <div>
          <h1>{lck.name}</h1>
          <p className="subtle">
            Frist {lck.dueDate} · Status {lck.status} · Samlet compliance {percent(lck.totalCompliance)}
          </p>
          {lck.isClosed && (
            <p className="closed-note">
              Lukket {lck.closedAt?.slice(0, 10)}. Svar er låst til kontrollen gjenåpnes.
              {lck.closedComment ? ` «${lck.closedComment}»` : ''}
            </p>
          )}
          {lck.isOverdue && (
            <p className="overdue-note">
              Forfalt – fristen {lck.dueDate} har passert og {counts.unanswered} spørsmål er fortsatt ubesvart. Bruk «Marker som besvart» hvis svarene er
              mottatt utenfor systemet.
            </p>
          )}
          <p className="subtle">Administrator kan registrere svar på vegne av respondenter når korrespondansen skjer på e-post.</p>
        </div>
        <div className="assignee-list">
          {lck.assigneeIds.map(id => (
            <span className="tag active" key={id}>
              {users.find(user => user.id === id)?.name ?? id}
            </span>
          ))}
        </div>
      </section>

      {lck.groups.map(group => (
        <section className="legacy-panel" key={group.tenantId}>
          <div className="group-head">
            <strong>{group.tenantName}</strong>
            <span>Compliance {percent(group.score)}</span>
          </div>
          <table className="legacy-grid">
            <thead>
              <tr>
                <th className="col-index">Indeks</th>
                <th>Dokumentnavn</th>
                <th>Sammendrag</th>
                <th>Slik oppfyller vi kravene</th>
                <th>Kontrollspørsmål</th>
              </tr>
            </thead>
            {group.items.map(item => {
              const open = expanded === item.id
              return (
                <tbody key={item.id} className={open ? 'open' : ''}>
                  <tr className={`legacy-row ${rowState(item)}`} onClick={() => setExpanded(open ? undefined : item.id)}>
                    <td className="col-index">{item.index}</td>
                    <td>
                      <strong>{item.documentName}</strong>
                      <p className="cell-text">{item.paragraphs}</p>
                    </td>
                    <td>
                      <p className="cell-text">{item.requirementSummary}</p>
                    </td>
                    <td>
                      <p className="cell-text">{item.compliance}</p>
                    </td>
                    <td>
                      {item.questions.map(question => (
                        <p key={question.id} className="question-preview">
                          {question.text || <span className="muted">Uten tekst</span>}
                          <small>
                            {users.find(user => user.id === question.responderId)?.name ?? 'Ingen respondent valgt'}
                            {question.answer ? ` · ${question.answer}` : ' · ubesvart'}
                          </small>
                        </p>
                      ))}
                    </td>
                  </tr>
                  {open && (
                    <tr className="legacy-expanded">
                      <td colSpan={5}>
                        <div className="question-stack">
                          {item.questions.map(question => (
                            <QuestionPanel
                              key={question.id}
                              question={question}
                              settings={lck.settings}
                              answerOptions={lck.answerOptions}
                              actionStatusOptions={lck.actionStatusOptions}
                              tenantId={group.tenantId}
                              locked={lck.isClosed}
                              users={users.filter(user => user.tenantId === group.tenantId)}
                              onPatch={patch => patchQuestion(item.id, question.id, patch)}
                              onActionsChanged={refresh}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              )
            })}
          </table>
        </section>
      ))}
    </>
  )
}

function QuestionPanel({
  question,
  settings,
  answerOptions,
  actionStatusOptions,
  tenantId,
  users,
  locked,
  onPatch,
  onActionsChanged
}: {
  question: LckQuestion
  settings: LckSettings
  answerOptions: string[]
  actionStatusOptions: string[]
  tenantId: string
  users: DemoUser[]
  locked: boolean
  onPatch: (patch: Partial<LckQuestion>) => Promise<void>
  onActionsChanged: () => Promise<void>
}) {
  const commentRequired =
    (question.answer === 'Nei' && settings.requireCommentOnNo) ||
    (question.answer === 'Delvis' && settings.requireCommentOnPartial) ||
    (question.answer === 'Ikke relevant' && settings.requireReasonOnNotRelevant)

  return (
    <fieldset className="question-panel" disabled={locked} onClick={event => event.stopPropagation()}>
      <div className="question-left">
        <span className="field-heading">Spørsmål</span>
        <p className="question-text">{question.text || <span className="muted">Uten tekst</span>}</p>
        <label className="field">
          <span>Skal svare</span>
          <select value={question.responderId ?? ''} onChange={event => void onPatch({ responderId: event.target.value })}>
            <option value="">Ikke valgt</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} · {user.unit}
              </option>
            ))}
          </select>
        </label>
        {question.registeredById && (
          <small className="muted">
            Registrert av {question.registeredById === ADMIN_USER_ID ? 'administrator' : question.registeredById}
            {question.answeredAt ? ` · ${question.answeredAt.slice(0, 10)}` : ''}
          </small>
        )}
      </div>

      <div className="question-answer">
        <span className="field-heading">Lov-compliant</span>
        {answerOptions.map(option => (
          <label key={option} className="radio">
            <input type="radio" checked={question.answer === option} onChange={() => void onPatch({ answer: option })} />
            {option}
          </label>
        ))}
        <small className="muted">Ja 100 · Delvis 50 · Nei 0 · Ikke relevant utenfor</small>
      </div>

      <div className="question-followup">
        <label className="field">
          <span>Avvik/Årsak {commentRequired && <em className="required">påkrevd</em>}</span>
          <textarea rows={2} defaultValue={question.deviationCause ?? ''} onBlur={event => void onPatch({ deviationCause: event.target.value })} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Ansvarlig</span>
            <select value={question.responsibleId ?? ''} onChange={event => void onPatch({ responsibleId: event.target.value })}>
              <option value="">Ikke valgt</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Planlagt sluttdato</span>
            <input type="date" defaultValue={question.plannedCompletionDate ?? ''} onBlur={event => void onPatch({ plannedCompletionDate: event.target.value || null })} />
          </label>
          <label className="field">
            <span>Stengedato</span>
            <input type="date" defaultValue={question.closedDate ?? ''} onBlur={event => void onPatch({ closedDate: event.target.value || null })} />
          </label>
        </div>
        <label className="field">
          <span>Kommentar til tiltak</span>
          <textarea rows={2} defaultValue={question.actionComment ?? ''} onBlur={event => void onPatch({ actionComment: event.target.value })} />
        </label>
        {settings.allowAttachments && (
          <label className="field">
            <span>Dokumentasjon (lenke eller filnavn)</span>
            <input defaultValue={question.documentation ?? ''} placeholder="Brannøvelse_2027.pdf" onBlur={event => void onPatch({ documentation: event.target.value })} />
          </label>
        )}

        <ActionPanel
          tenantId={tenantId}
          sourceType={question.deviationId ? 'Avvik' : 'LCK-svar'}
          sourceId={question.deviationId ?? question.id}
          requirementId={null}
          actions={question.actions}
          statusOptions={actionStatusOptions}
          users={users}
          onChanged={onActionsChanged}
        />
      </div>
    </fieldset>
  )
}

/* ---------------------------------------------------- avvik og tiltak --- */

// Spec §30-32
type DeviationSortKey = 'law' | 'question' | 'tenant' | 'unit' | 'answer' | 'respondent' | 'registered' | 'responsible' | 'due' | 'status'

const DEVIATION_SORT: Record<DeviationSortKey, (item: Deviation) => string> = {
  law: item => `${item.law ?? ''} ${item.paragraph ?? ''}`,
  question: item => item.questionText ?? '',
  tenant: item => item.tenantName,
  unit: item => item.unit || 'ø',
  answer: item => item.answer,
  respondent: item => item.respondentName ?? 'ø',
  registered: item => item.registeredDate,
  responsible: item => item.responsibleName ?? 'ø',
  due: item => item.dueDate ?? '9999-12-31',
  status: item => item.status
}

function DeviationsPage({
  tenantId,
  tenants,
  users,
  version,
  reload
}: {
  tenantId: string
  tenants: Tenant[]
  users: DemoUser[]
  version: number
  reload: () => void
}) {
  const [data, setData] = useState<{ statusOptions: string[]; items: Deviation[] }>()
  const [actions, setActions] = useState<{ statusOptions: string[]; items: ActionItem[] }>()
  const [filter, setFilter] = useState('Alle')
  const [search, setSearch] = useState('')
  const [tenantFilter, setTenantFilter] = useState('')
  const [unitFilter, setUnitFilter] = useState('')
  const [respondentFilter, setRespondentFilter] = useState('')
  const [responsibleFilter, setResponsibleFilter] = useState('')
  const [lawFilter, setLawFilter] = useState('')
  const [answerFilter, setAnswerFilter] = useState('')
  const [sort, setSort] = useState<{ key: DeviationSortKey; dir: 1 | -1 }>({ key: 'due', dir: 1 })
  const [expanded, setExpanded] = useState<string>()

  const refresh = useCallback(async () => {
    const query = `tenantIds=${encodeURIComponent(tenantId)}`
    const [deviations, actionList] = await Promise.all([
      api<{ statusOptions: string[]; items: Deviation[] }>(`/api/deviations?${query}`),
      api<{ statusOptions: string[]; items: ActionItem[] }>(`/api/actions?${query}`)
    ])
    setData(deviations)
    setActions(actionList)
  }, [tenantId])

  useEffect(() => {
    void refresh()
  }, [refresh, version])

  if (!data || !actions) return <p className="subtle">Laster avvik…</p>

  const unique = (values: (string | null)[]) => Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort()
  const tenantOptions = unique(data.items.map(item => item.tenantName))
  const unitOptions = unique(data.items.map(item => item.unit))
  const respondentOptions = unique(data.items.map(item => item.respondentName))
  const responsibleOptions = unique(data.items.map(item => item.responsibleName))
  const lawOptions = unique(data.items.map(item => item.law))
  const answerOptions = unique(data.items.map(item => item.answer))

  const items = data.items
    .filter(item => filter === 'Alle' || item.status === filter)
    .filter(item => !tenantFilter || item.tenantName === tenantFilter)
    .filter(item => !unitFilter || item.unit === unitFilter)
    .filter(item => !respondentFilter || item.respondentName === respondentFilter)
    .filter(item => !responsibleFilter || item.responsibleName === responsibleFilter)
    .filter(item => !lawFilter || item.law === lawFilter)
    .filter(item => !answerFilter || item.answer === answerFilter)
    .filter(item =>
      !search ||
      `${item.law ?? ''} ${item.paragraph ?? ''} ${item.questionText ?? ''} ${item.tenantName} ${item.unit} ${item.respondentName ?? ''} ${item.comment ?? ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .slice()
    .sort((left, right) => DEVIATION_SORT[sort.key](left).localeCompare(DEVIATION_SORT[sort.key](right), 'nb') * sort.dir)

  const toggleSort = (key: DeviationSortKey) => setSort(current => ({ key, dir: current.key === key && current.dir === 1 ? -1 : 1 }))

  const SortHeader = ({ column, label, width }: { column: DeviationSortKey; label: string; width?: number }) => (
    <th style={width ? { width } : undefined} className={sort.key === column ? 'sortable sorted' : 'sortable'} onClick={() => toggleSort(column)} title={`Sorter på ${label}`}>
      {label}
      <span className="sort-arrow">{sort.key === column ? (sort.dir === 1 ? '▲' : '▼') : '↕'}</span>
    </th>
  )

  const activeFilters = [tenantFilter, unitFilter, respondentFilter, responsibleFilter, lawFilter, answerFilter].filter(Boolean).length
  const clearFilters = () => {
    setTenantFilter('')
    setUnitFilter('')
    setRespondentFilter('')
    setResponsibleFilter('')
    setLawFilter('')
    setAnswerFilter('')
    setSearch('')
    setFilter('Alle')
  }

  const changeActions = [...actions.items.filter(action => action.sourceType === 'Lovendring')].sort(
    (left, right) => ACTION_STATE_ORDER.indexOf(actionState(left)) - ACTION_STATE_ORDER.indexOf(actionState(right))
  )

  const patch = async (id: string, body: Record<string, unknown>) => {
    await api(`/api/deviations/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
    await refresh()
    reload()
  }

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Avvik og tiltak</p>
          <h1>{tenantId ? (tenants.find(item => item.id === tenantId)?.name ?? 'Virksomhet') : 'Alle virksomheter'}</h1>
          <p className="subtle">Avvik opprettes automatisk fra «Nei» – og fra «Delvis» når kontrollen er satt opp for det. Klikk en kolonneoverskrift for å sortere.</p>
        </div>
      </header>

      <section className="cards">
        <Metric label="Åpne avvik" value={data.items.filter(item => item.status !== 'Lukket').length} />
        <Metric label="Lukkede avvik" value={data.items.filter(item => item.status === 'Lukket').length} />
        <Metric label="Tiltak totalt" value={actions.items.length} />
        <Metric label="Tiltak ikke fullført" value={actions.items.filter(item => item.status !== 'Fullført' && item.status !== 'Verifisert').length} />
      </section>

      <section className="table-panel">
        <div className="panel-head wrap">
          <h2>Avvik og tiltak</h2>
          <div className="filter-bar">
            {['Alle', ...data.statusOptions].map(option => (
              <button key={option} className={option === filter ? 'chip-filter active' : 'chip-filter'} onClick={() => setFilter(option)}>
                {option}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-row">
          <input className="search" placeholder="Søk i avvik, lov, spørsmål eller kommentar…" value={search} onChange={event => setSearch(event.target.value)} />
          <label className="inline-field">
            <span>Virksomhet</span>
            <select value={tenantFilter} onChange={event => setTenantFilter(event.target.value)}>
              <option value="">Alle</option>
              {tenantOptions.map(option => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="inline-field">
            <span>Enhet</span>
            <select value={unitFilter} onChange={event => setUnitFilter(event.target.value)}>
              <option value="">Alle</option>
              {unitOptions.map(option => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="inline-field">
            <span>Respondent</span>
            <select value={respondentFilter} onChange={event => setRespondentFilter(event.target.value)}>
              <option value="">Alle</option>
              {respondentOptions.map(option => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="inline-field">
            <span>Ansvarlig</span>
            <select value={responsibleFilter} onChange={event => setResponsibleFilter(event.target.value)}>
              <option value="">Alle</option>
              {responsibleOptions.map(option => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="inline-field">
            <span>Lov</span>
            <select value={lawFilter} onChange={event => setLawFilter(event.target.value)}>
              <option value="">Alle</option>
              {lawOptions.map(option => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="inline-field">
            <span>Svar</span>
            <select value={answerFilter} onChange={event => setAnswerFilter(event.target.value)}>
              <option value="">Alle</option>
              {answerOptions.map(option => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <button className="ghost" onClick={clearFilters} disabled={activeFilters === 0 && !search && filter === 'Alle'}>
            Nullstill
          </button>
          <span className="filter-count">
            {items.length} av {data.items.length} avvik
          </span>
        </div>
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <SortHeader column="law" label="Lov / paragraf" width={170} />
                <SortHeader column="question" label="LCK-spørsmål" />
                <SortHeader column="tenant" label="Virksomhet / enhet" width={170} />
                <SortHeader column="answer" label="Svar" width={90} />
                <SortHeader column="respondent" label="Respondent" width={140} />
                <SortHeader column="registered" label="Registrert" width={120} />
                <SortHeader column="responsible" label="Ansvarlig" width={170} />
                <SortHeader column="due" label="Frist" width={140} />
                <SortHeader column="status" label="Status" width={170} />
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <Fragment key={item.id}>
                  <tr className="clickable" onClick={() => setExpanded(expanded === item.id ? undefined : item.id)}>
                    <td>
                      <strong>{item.law}</strong>
                      <small>{item.paragraph}</small>
                    </td>
                    <td className="clamp">{item.questionText}</td>
                    <td>
                      {item.tenantName}
                      <small>{item.unit || '–'}</small>
                    </td>
                    <td>
                      <span className={item.answer === 'Nei' ? 'bad' : 'warn'}>{item.answer}</span>
                    </td>
                    <td>{item.respondentName ?? <span className="muted">–</span>}</td>
                    <td>{item.registeredDate}</td>
                    <td onClick={event => event.stopPropagation()}>
                      <select value={item.responsibleId ?? ''} onChange={event => void patch(item.id, { responsibleId: event.target.value })}>
                        <option value="">Ikke valgt</option>
                        {users
                          .filter(user => user.tenantId === item.tenantId)
                          .map(user => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td onClick={event => event.stopPropagation()}>
                      <input type="date" defaultValue={item.dueDate ?? ''} onBlur={event => void patch(item.id, { dueDate: event.target.value || null })} />
                    </td>
                    <td onClick={event => event.stopPropagation()}>
                      <select value={item.status} onChange={event => void patch(item.id, { status: event.target.value })}>
                        {data.statusOptions.map(option => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  {expanded === item.id && (
                    <tr className="expanded">
                      <td colSpan={9}>
                        <div className="deviation-detail">
                          <div className="field">
                            <span>Kommentar fra respondent</span>
                            <p className="cell-text">{item.comment || <span className="muted">Ingen kommentar</span>}</p>
                            <span className="field-heading">Dokumentasjon</span>
                            <p className="cell-text">{item.documentation || <span className="muted">Ingen dokumentasjon</span>}</p>
                            <small className="muted">
                              Fra {item.lckName} · {item.createdAutomatically ? 'opprettet automatisk' : 'opprettet manuelt'}
                            </small>
                          </div>
                          <ActionPanel
                            tenantId={item.tenantId}
                            sourceType="Avvik"
                            sourceId={item.id}
                            requirementId={item.requirementId}
                            actions={item.actions}
                            statusOptions={actions.statusOptions}
                            users={users.filter(user => user.tenantId === item.tenantId)}
                            onChanged={async () => {
                              await refresh()
                              reload()
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={9} className="muted">
                    Ingen avvik i dette utvalget.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {changeActions.length > 0 && (
        <section className="table-panel">
          <div className="panel-head">
            <h2>Tiltak lovendring</h2>
            <span>
              {changeActions.filter(action => actionState(action) === 'overdue').length} forfalt ·{' '}
              {changeActions.filter(action => actionState(action) === 'ongoing').length} pågår ·{' '}
              {changeActions.filter(action => actionState(action) === 'done').length} fullført
            </span>
          </div>
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th style={{ width: 190 }}>Lov / paragraf</th>
                  <th>Beskrivelse</th>
                  <th style={{ width: 160 }}>Virksomhet</th>
                  <th style={{ width: 150 }}>Ansvarlig</th>
                  <th style={{ width: 120 }}>Frist</th>
                  <th style={{ width: 150 }}>Status</th>
                  <th style={{ width: 60 }} />
                </tr>
              </thead>
              <tbody>
                {changeActions.map(action => (
                  <tr key={action.id} className={`action-state ${actionState(action)}`}>
                    <td>
                      {action.law ?? <span className="muted">–</span>}
                      <small>{action.paragraph}</small>
                    </td>
                    <td className="clamp">{action.description}</td>
                    <td>{action.tenantName}</td>
                    <td>
                      <select
                        value={action.responsibleId ?? ''}
                        onChange={async event => {
                          await api(`/api/actions/${action.id}`, { method: 'PATCH', body: JSON.stringify({ responsibleId: event.target.value }) })
                          await refresh()
                        }}
                      >
                        <option value="">Ikke valgt</option>
                        {users
                          .filter(user => user.tenantId === action.tenantId)
                          .map(user => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="date"
                        defaultValue={action.dueDate ?? ''}
                        onBlur={async event => {
                          await api(`/api/actions/${action.id}`, { method: 'PATCH', body: JSON.stringify({ dueDate: event.target.value || null }) })
                          await refresh()
                        }}
                      />
                    </td>
                    <td>
                      <select
                        value={action.status}
                        onChange={async event => {
                          await api(`/api/actions/${action.id}`, { method: 'PATCH', body: JSON.stringify({ status: event.target.value }) })
                          await refresh()
                        }}
                      >
                        {actions.statusOptions.map(option => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                    <td className="right">
                      <button
                        className="icon danger"
                        title="Fjern tiltak"
                        onClick={async () => {
                          await api(`/api/actions/${action.id}`, { method: 'DELETE' })
                          await refresh()
                          reload()
                        }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}

function ActionPanel({
  tenantId,
  sourceType,
  sourceId,
  requirementId,
  actions,
  statusOptions,
  users,
  onChanged
}: {
  tenantId: string
  sourceType: string
  sourceId: string
  requirementId: string | null
  actions: ActionItem[]
  statusOptions: string[]
  users: DemoUser[]
  onChanged: () => Promise<void>
}) {
  const [description, setDescription] = useState('')
  const [responsibleId, setResponsibleId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  const create = async () => {
    setSaving(true)
    try {
      await api('/api/actions', {
        method: 'POST',
        body: JSON.stringify({ tenantId, sourceType, sourceId, requirementId, description, responsibleId: responsibleId || null, dueDate: dueDate || null })
      })
      setDescription('')
      setResponsibleId('')
      setDueDate('')
      await onChanged()
    } finally {
      setSaving(false)
    }
  }

  const patch = async (id: string, body: Record<string, unknown>) => {
    await api(`/api/actions/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
    await onChanged()
  }

  return (
    <div className="action-panel">
      <span className="field-heading">Tiltak</span>
      {[...actions]
        .sort((left, right) => ACTION_STATE_ORDER.indexOf(actionState(left)) - ACTION_STATE_ORDER.indexOf(actionState(right)))
        .map(action => (
          <div className={`action-row action-state ${actionState(action)}`} key={action.id}>
            <div className="action-main">
              <input
                key={`${action.id}-description`}
                defaultValue={action.description}
                placeholder="Beskrivelse"
                onBlur={event => event.target.value !== action.description && void patch(action.id, { description: event.target.value })}
              />
              <textarea
                key={`${action.id}-comment`}
                rows={2}
                defaultValue={action.comment ?? ''}
                placeholder="Kommentar"
                onBlur={event => event.target.value !== (action.comment ?? '') && void patch(action.id, { comment: event.target.value })}
              />
              <small>{action.sourceType}</small>
            </div>
            <div className="action-controls">
              <label className="field">
                <span>Ansvarlig</span>
                <select value={action.responsibleId ?? ''} onChange={event => void patch(action.id, { responsibleId: event.target.value })}>
                  <option value="">Ikke valgt</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Frist</span>
                <input
                  key={`${action.id}-due`}
                  type="date"
                  defaultValue={action.dueDate ?? ''}
                  onBlur={event => event.target.value !== (action.dueDate ?? '') && void patch(action.id, { dueDate: event.target.value || null })}
                />
              </label>
              <label className="field">
                <span>Status</span>
                <select value={action.status} onChange={event => void patch(action.id, { status: event.target.value })}>
                  {statusOptions.map(option => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <button
                className="icon danger"
                title="Fjern tiltak"
                onClick={async () => {
                  await api(`/api/actions/${action.id}`, { method: 'DELETE' })
                  await onChanged()
                }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      {actions.length === 0 && <p className="muted">Ingen tiltak opprettet.</p>}

      <div className="action-form">
        <input placeholder="Nytt tiltak…" value={description} onChange={event => setDescription(event.target.value)} />
        <select value={responsibleId} onChange={event => setResponsibleId(event.target.value)}>
          <option value="">Ansvarlig</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        <input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} />
        <button className="primary small" disabled={saving || !description.trim()} onClick={() => void create()}>
          Legg til
        </button>
      </div>
    </div>
  )
}

/* --------------------------------------------------------- lovendringer --- */

// Spec §33-37
function LegalChangesPage({
  tenantId,
  users,
  version,
  reload
}: {
  tenantId: string
  users: DemoUser[]
  version: number
  reload: () => void
}) {
  const [data, setData] = useState<{ statusOptions: string[]; items: LegalChange[] }>()
  const [actionFor, setActionFor] = useState<LegalChange>()
  const [expanded, setExpanded] = useState<string>()

  const refresh = useCallback(async () => {
    setData(await api<{ statusOptions: string[]; items: LegalChange[] }>(`/api/legal-changes?tenantIds=${encodeURIComponent(tenantId)}`))
  }, [tenantId])

  useEffect(() => {
    void refresh()
  }, [refresh, version])

  if (!data) return <p className="subtle">Laster lovendringer…</p>

  const pending = data.items.filter(change => change.handlings.some(row => row.handling.status === 'Ikke vurdert')).length

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Lovendringer</p>
          <h1>Endringer i regelverk</h1>
          <p className="subtle">Endringer oppdages i paragrafene som inngår i lovlistene. Vurderingen gjøres per virksomhet.</p>
        </div>
      </header>

      <section className="table-panel">
        <div className="panel-head">
          <h2>Registrerte endringer</h2>
          <span>
            {data.items.length} endringer · {pending} venter på vurdering · klikk en rad for detaljer
          </span>
        </div>
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th style={{ width: 32 }} />
                <th style={{ width: 260 }}>Lov / paragraf</th>
                <th style={{ width: 120 }}>Oppdaget</th>
                <th style={{ width: 120 }}>I kraft</th>
                <th>Hva er endret?</th>
                <th style={{ width: 200 }}>Behandling</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(change => {
                const open = expanded === change.id
                const unhandled = change.handlings.filter(row => row.handling.status === 'Ikke vurdert').length
                return (
                  <Fragment key={change.id}>
                    <tr className={open ? 'clickable selected' : 'clickable'} onClick={() => setExpanded(open ? undefined : change.id)}>
                      <td className="caret">{open ? '▾' : '▸'}</td>
                      <td>
                        <strong>
                          {change.law} {change.paragraph}
                        </strong>
                        <small>{change.area}</small>
                      </td>
                      <td>{change.detectedDate}</td>
                      <td>{change.effectiveDate}</td>
                      <td className="clamp">{change.summary}</td>
                      <td>
                        {unhandled > 0 ? (
                          <span className="warn">{unhandled} ikke vurdert</span>
                        ) : (
                          <span className="good">Ferdig fordelt</span>
                        )}
                        <small>{change.handlings.length} virksomheter</small>
                      </td>
                    </tr>

                    {open && (
                      <tr className="expanded">
                        <td colSpan={6}>
                          <div className="change-detail">
                            <div className="change-detail-head">
                              <p className="subtle">Inngår i lovlistene: {change.lawLists.join(', ') || 'ingen'}</p>
                              <div className="header-actions">
                                <a
                                  className="ghost"
                                  href={`/api/lovdata/render?refId=${encodeURIComponent(change.refId ?? '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Åpne paragraf ↗
                                </a>
                                <button className="primary" onClick={() => setActionFor(change)}>
                                  Opprett tiltak
                                </button>
                              </div>
                            </div>

                            <Collapsible title="Regeltekst før og etter">
                              <div className="change-diff">
                                <div>
                                  <span className="field-heading">Tidligere tekst</span>
                                  <p className="cell-text old">{change.previousText}</p>
                                </div>
                                <div>
                                  <span className="field-heading">Ny tekst</span>
                                  <p className="cell-text new">{change.newText}</p>
                                </div>
                              </div>
                            </Collapsible>

                            <Collapsible title="AI-analyse" badge={change.aiGenerated ? 'AI-generert' : undefined} defaultOpen>
                              <div className="change-ai-grid">
                                <div>
                                  <span className="field-heading">Hva er endret?</span>
                                  <p>{change.summary}</p>
                                </div>
                                <div>
                                  <span className="field-heading">Hva betyr dette for virksomheten?</span>
                                  <p>{change.businessImpact}</p>
                                </div>
                                <div>
                                  <span className="field-heading">Eksempel</span>
                                  <p>{change.example}</p>
                                </div>
                                <div>
                                  <span className="field-heading">Anbefalt handling</span>
                                  <p>{change.recommendedAction}</p>
                                </div>
                              </div>
                            </Collapsible>

                            <Collapsible title={`Behandling per virksomhet (${change.handlings.length})`} defaultOpen>
                              <table className="grid">
                                <thead>
                                  <tr>
                                    <th style={{ width: 200 }}>Virksomhet</th>
                                    <th style={{ width: 210 }}>Behandling</th>
                                    <th>Notat</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {change.handlings.map(row => (
                                    <tr key={row.tenantId}>
                                      <td>
                                        <strong>{row.tenantName}</strong>
                                        {row.handling.handledAt && <small>Behandlet {row.handling.handledAt.slice(0, 10)}</small>}
                                      </td>
                                      <td>
                                        <select
                                          value={row.handling.status}
                                          onChange={async event => {
                                            await api(`/api/legal-changes/${change.id}/handling/${row.tenantId}`, {
                                              method: 'PATCH',
                                              body: JSON.stringify({ status: event.target.value })
                                            })
                                            await refresh()
                                            reload()
                                          }}
                                        >
                                          {data.statusOptions.map(option => (
                                            <option key={option}>{option}</option>
                                          ))}
                                        </select>
                                      </td>
                                      <td>
                                        <EditableCell
                                          value={row.handling.note ?? ''}
                                          multiline
                                          placeholder="Legg til notat"
                                          onSave={async value => {
                                            await api(`/api/legal-changes/${change.id}/handling/${row.tenantId}`, {
                                              method: 'PATCH',
                                              body: JSON.stringify({ note: value })
                                            })
                                            await refresh()
                                          }}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </Collapsible>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    Ingen registrerte lovendringer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {actionFor && (
        <LegalChangeActionDialog
          change={actionFor}
          users={users}
          onClose={() => setActionFor(undefined)}
          onCreated={async () => {
            setActionFor(undefined)
            await refresh()
            reload()
          }}
        />
      )}
    </>
  )
}

function Collapsible({ title, badge, defaultOpen, children }: { title: string; badge?: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(Boolean(defaultOpen))

  return (
    <div className={open ? 'collapsible open' : 'collapsible'}>
      <button className="collapsible-head" onClick={() => setOpen(value => !value)}>
        <span className="caret">{open ? '▾' : '▸'}</span>
        <strong>{title}</strong>
        {badge && <span className="ai-badge">{badge}</span>}
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  )
}

// Spec §37: tiltak fra lovendring, prefylt med AI-forslaget og fordelt per virksomhet.
function LegalChangeActionDialog({
  change,
  users,
  onClose,
  onCreated
}: {
  change: LegalChange
  users: DemoUser[]
  onClose: () => void
  onCreated: () => Promise<void>
}) {
  const [description, setDescription] = useState(change.recommendedAction)
  const [comment, setComment] = useState(change.businessImpact)
  const [dueDate, setDueDate] = useState(() => change.effectiveDate)
  const [responsibleIds, setResponsibleIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const tenantIds = change.handlings.map(row => row.tenantId)
  const options = users
    .filter(user => tenantIds.includes(user.tenantId))
    .map(user => ({
      id: user.id,
      group: change.handlings.find(row => row.tenantId === user.tenantId)?.tenantName,
      primary: user.name,
      secondary: `${user.role} · ${user.unit}`
    }))

  const submit = async () => {
    setSaving(true)
    setError('')
    try {
      for (const responsibleId of responsibleIds) {
        const user = users.find(candidate => candidate.id === responsibleId)
        if (!user) continue

        await api('/api/actions', {
          method: 'POST',
          body: JSON.stringify({
            tenantId: user.tenantId,
            sourceType: 'Lovendring',
            sourceId: change.id,
            requirementId: change.requirementId,
            description,
            comment,
            responsibleId,
            dueDate: dueDate || null
          })
        })

        const handling = change.handlings.find(row => row.tenantId === user.tenantId)?.handling
        if (handling?.status === 'Ikke vurdert') {
          await api(`/api/legal-changes/${change.id}/handling/${user.tenantId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'Krever tiltak' })
          })
        }
      }
      await onCreated()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kunne ikke opprette tiltak')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={event => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">
              {change.law} {change.paragraph}
            </p>
            <h2>Opprett tiltak fra lovendring</h2>
            <p className="subtle">Forslaget er AI-generert og kan redigeres før det opprettes. Det opprettes ett tiltak per valgt ansvarlig.</p>
          </div>
          <button className="icon" title="Lukk" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {error && <p className="error">{error}</p>}

          <label className="field">
            <span>Beskrivelse</span>
            <textarea rows={4} value={description} onChange={event => setDescription(event.target.value)} />
          </label>
          <label className="field">
            <span>Kommentar / bakgrunn</span>
            <textarea rows={3} value={comment} onChange={event => setComment(event.target.value)} />
          </label>
          <label className="field">
            <span>Frist</span>
            <input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} />
          </label>

          <PickerList
            title="Ansvarlige"
            options={options}
            selected={responsibleIds}
            onChange={setResponsibleIds}
            searchPlaceholder="Søk etter navn, rolle eller enhet…"
          />
        </div>

        <div className="editor-actions">
          <button className="ghost" onClick={onClose}>
            Avbryt
          </button>
          <button className="primary" disabled={saving || !description.trim() || responsibleIds.length === 0} onClick={() => void submit()}>
            {saving ? 'Oppretter…' : `Opprett ${responsibleIds.length || ''} tiltak`.trim()}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ rapporter --- */

// Spec §28-29: kort hovedrapport for alle virksomheter, detaljene kommer per valgt LCK.
const ANSWER_TONES = [
  { key: 'yes', label: 'Ja', tone: 'green' },
  { key: 'partial', label: 'Delvis', tone: 'orange' },
  { key: 'no', label: 'Nei', tone: 'red' },
  { key: 'notRelevant', label: 'Ikke relevant', tone: 'yellow' },
  { key: 'unanswered', label: 'Ubesvart', tone: 'grey' }
] as const

function AnswerSummary({ answers, title }: { answers: AnswerCounts; title: string }) {
  const total = answers.yes + answers.partial + answers.no + answers.notRelevant + answers.unanswered
  return (
    <section className="table-panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <span>{total} spørsmål</span>
      </div>
      <div className="answer-summary">
        {ANSWER_TONES.map(item => (
          <div className={`answer-tile tone-${item.tone}`} key={item.key}>
            <span>{item.label}</span>
            <strong>{answers[item.key]}</strong>
            <small>{total === 0 ? '0 %' : `${Math.round((100 * answers[item.key]) / total)} %`}</small>
          </div>
        ))}
      </div>
    </section>
  )
}

function ReportsPage({ tenantId, version }: { tenantId: string; version: number }) {
  const [overview, setOverview] = useState<OverviewReport>()
  const [lcks, setLcks] = useState<LckSummary[]>([])
  const [selected, setSelected] = useState('')
  const [report, setReport] = useState<LckReport>()

  useEffect(() => {
    void (async () => {
      const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ''
      const [list, summary] = await Promise.all([
        api<LckSummary[]>(`/api/lcks${query}`),
        api<OverviewReport>(`/api/reports/overview?tenantIds=${encodeURIComponent(tenantId)}`)
      ])
      setLcks(list)
      setOverview(summary)
    })()
  }, [tenantId, version])

  useEffect(() => {
    if (!selected) {
      setReport(undefined)
      return
    }
    void api<LckReport>(`/api/reports/lcks/${selected}?tenantIds=${encodeURIComponent(tenantId)}`).then(setReport)
  }, [selected, tenantId, version])

  const exportCsv = () => {
    if (!report) return
    const rows = [
      ['Kategori', 'Virksomhet', 'Lov', 'Paragraf', 'Spørsmål', 'Respondent', 'Kommentar', 'Dokumentasjon'],
      ...(['Delvis', 'Nei', 'Ikke relevant'] as const).flatMap(label =>
        (label === 'Delvis' ? report.partial : label === 'Nei' ? report.nonCompliant : report.notRelevant).map(row => [
          label,
          row.tenantName,
          row.law ?? '',
          row.paragraph ?? '',
          row.question,
          row.respondent ?? '',
          row.comment ?? '',
          row.documentation ?? ''
        ])
      )
    ]
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${report.name}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Rapporter</p>
          <h1>{report ? report.name : 'Hovedrapport'}</h1>
          <p className="subtle">
            {report
              ? 'Detaljert rapport for kontrollen: svarfordeling, avvik og alle «Delvis», «Nei» og «Ikke relevant».'
              : 'Kort samlerapport for utvalget. Velg en gjennomført kontroll for score per paragraf og svarene fra LCK-en.'}
          </p>
        </div>
        <div className="header-actions">
          <label className="inline-field">
            <span>Rapport</span>
            <select value={selected} onChange={event => setSelected(event.target.value)}>
              <option value="">Hovedrapport – {overview?.isGlobal === false ? 'valgt virksomhet' : 'alle virksomheter'}</option>
              {lcks.map(lck => (
                <option key={lck.id} value={lck.id}>
                  {lck.name}
                </option>
              ))}
            </select>
          </label>
          <button className="primary" disabled={!report} onClick={exportCsv}>
            Eksporter CSV
          </button>
        </div>
      </header>

      {!selected ? (
        !overview ? (
          <p className="subtle">Laster rapport…</p>
        ) : (
          <>
            <section className="cards">
              <Metric label="Samlet compliance" value={percent(overview.totalCompliance)} />
              <Metric label="Svarprosent" value={`${overview.responseRate} %`} />
              <Metric label="Kontrollerte krav" value={overview.controlledRequirements} />
              <Metric label="Åpne avvik" value={overview.openDeviations} />
            </section>

            <div className="split">
              <section className="table-panel">
                <div className="panel-head">
                  <h2>Compliance per virksomhet</h2>
                </div>
                <BarList rows={overview.byTenant.map(row => ({ name: row.name, score: row.score }))} />
              </section>
              <section className="table-panel">
                <div className="panel-head">
                  <h2>Compliance per lovområde</h2>
                </div>
                <BarList rows={overview.byArea.map(row => ({ name: row.name, score: row.score }))} />
              </section>
            </div>

            <section className="table-panel">
              <div className="panel-head">
                <h2>Gjennomførte kontroller</h2>
                <span>Klikk en kontroll for detaljert rapport</span>
              </div>
              <div className="table-wrap">
                <table className="grid">
                  <thead>
                    <tr>
                      <th>Kontroll</th>
                      <th style={{ width: 200 }}>Virksomheter</th>
                      <th style={{ width: 190 }}>Periode</th>
                      <th style={{ width: 130 }}>Status</th>
                      <th style={{ width: 130 }}>Svarprosent</th>
                      <th style={{ width: 100 }}>Avvik</th>
                      <th style={{ width: 130 }}>Compliance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.lcks.map(lck => (
                      <tr key={lck.id} className="clickable" onClick={() => setSelected(lck.id)}>
                        <td>
                          <strong>{lck.name}</strong>
                          <small>
                            {lck.answeredCount} / {lck.questionCount} besvart
                          </small>
                        </td>
                        <td>{lck.tenantNames.join(', ')}</td>
                        <td>
                          {lck.periodFrom} – {lck.periodTo}
                        </td>
                        <td>
                          <span className="pill">{lck.status}</span>
                        </td>
                        <td>{lck.responseRate} %</td>
                        <td>{lck.deviations > 0 ? <span className="bad">{lck.deviations}</span> : <span className="muted">0</span>}</td>
                        <td>
                          <Score value={lck.compliance} />
                        </td>
                      </tr>
                    ))}
                    {overview.lcks.length === 0 && (
                      <tr>
                        <td colSpan={7} className="muted">
                          Ingen kontroller i dette utvalget.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )
      ) : !report ? (
        <p className="subtle">Laster rapport…</p>
      ) : (
        <>
          <section className="cards">
            <Metric label="Samlet compliance" value={percent(report.totalCompliance)} />
            <Metric label="Svarprosent" value={`${report.responseRate} %`} />
            <Metric label="Besvarte spørsmål" value={`${report.answeredCount} / ${report.questionCount}`} />
            <Metric label="Registrerte avvik" value={report.deviations.length} />
          </section>

          <section className="table-panel">
            <div className="panel-head">
              <h2>{report.name}</h2>
              <span>
                Periode {report.periodFrom} – {report.periodTo} · status {report.status}
              </span>
            </div>
            <div className="report-respondents">
              {report.respondents.map(person => (
                <span className="tag active" key={person.id}>
                  {person.name} · {person.role} · {person.tenant}
                </span>
              ))}
              {report.respondents.length === 0 && <span className="muted">Ingen respondenter valgt.</span>}
            </div>
          </section>

          <AnswerSummary answers={report.answers} title="Svarfordeling" />

          <section className="table-panel">
            <div className="panel-head">
              <h2>Avvik per status</h2>
              <span>{report.deviations.length} avvik totalt</span>
            </div>
            <div className="answer-summary">
              {report.deviationsByStatus.map(row => (
                <div className={`answer-tile ${row.status === 'Lukket' ? 'tone-green' : 'tone-red'}`} key={row.status}>
                  <span>{row.status}</span>
                  <strong>{row.count}</strong>
                </div>
              ))}
            </div>
          </section>

          <div className="split">
            <section className="table-panel">
              <div className="panel-head">
                <h2>Score per virksomhet</h2>
              </div>
              <BarList rows={report.byTenant.map(row => ({ name: row.name, score: row.score }))} />
            </section>
            <section className="table-panel">
              <div className="panel-head">
                <h2>Score per lovområde</h2>
              </div>
              <BarList rows={report.byArea.map(row => ({ name: row.name, score: row.score }))} />
            </section>
            <section className="table-panel">
              <div className="panel-head">
                <h2>Score per paragraf</h2>
              </div>
              <BarList rows={report.byRequirement.map(row => ({ name: `${row.law} ${row.paragraph}`, score: row.score }))} />
            </section>
          </div>

          <section className="table-panel tone-red">
            <div className="panel-head">
              <h2>Registrerte avvik</h2>
              <span>{report.deviations.length} avvik</span>
            </div>
            <div className="table-wrap">
              <table className="grid">
                <thead>
                  <tr>
                    <th style={{ width: 180 }}>Lov / paragraf</th>
                    <th>Spørsmål</th>
                    <th style={{ width: 160 }}>Virksomhet</th>
                    <th style={{ width: 150 }}>Ansvarlig</th>
                    <th style={{ width: 120 }}>Frist</th>
                    <th style={{ width: 150 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.deviations.map(deviation => (
                    <tr key={deviation.id}>
                      <td>
                        <strong>{deviation.law}</strong>
                        <small>{deviation.paragraph}</small>
                      </td>
                      <td className="clamp">{deviation.questionText}</td>
                      <td>{deviation.tenantName}</td>
                      <td>{deviation.responsibleName ?? <span className="muted">–</span>}</td>
                      <td>{deviation.dueDate ?? <span className="muted">–</span>}</td>
                      <td>
                        <span className="pill">{deviation.status}</span>
                      </td>
                    </tr>
                  ))}
                  {report.deviations.length === 0 && (
                    <tr>
                      <td colSpan={6} className="muted">
                        Ingen avvik registrert for denne kontrollen.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <ReportRows title="Svar: Nei" tone="red" rows={report.nonCompliant} />
          <ReportRows title="Svar: Delvis" tone="orange" rows={report.partial} />
          <ReportRows title="Svar: Ikke relevant (utenfor compliance-scoren)" tone="yellow" rows={report.notRelevant} />
        </>
      )}
    </>
  )
}

function ReportRows({ title, rows, tone }: { title: string; rows: ReportRow[]; tone?: 'red' | 'orange' | 'yellow' }) {
  return (
    <section className={tone ? `table-panel tone-${tone}` : 'table-panel'}>
      <div className="panel-head">
        <h2>{title}</h2>
        <span>{rows.length} svar</span>
      </div>
      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th style={{ width: 180 }}>Lov / paragraf</th>
              <th>Spørsmål</th>
              <th style={{ width: 160 }}>Virksomhet</th>
              <th style={{ width: 140 }}>Respondent</th>
              <th>Kommentar</th>
              <th style={{ width: 170 }}>Dokumentasjon</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.question}-${index}`}>
                <td>
                  <strong>{row.law}</strong>
                  <small>{row.paragraph}</small>
                </td>
                <td className="clamp">{row.question}</td>
                <td>{row.tenantName}</td>
                <td>{row.respondent ?? <span className="muted">–</span>}</td>
                <td className="clamp">{row.comment ?? row.actionComment ?? <span className="muted">–</span>}</td>
                <td>{row.documentation ?? <span className="muted">–</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Ingen svar i denne kategorien.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------- building --- */

type PickOption = { id: string; primary: string; secondary?: string; group?: string }

function PickerList({
  title,
  options,
  selected,
  onChange,
  searchPlaceholder
}: {
  title: string
  options: PickOption[]
  selected: string[]
  onChange: (next: string[]) => void
  searchPlaceholder: string
}) {
  const [search, setSearch] = useState('')
  const term = search.toLowerCase()
  const visible = options.filter(option => `${option.primary} ${option.secondary ?? ''} ${option.group ?? ''}`.toLowerCase().includes(term))
  const visibleIds = visible.map(option => option.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selected.includes(id))
  const groups = Array.from(new Set(visible.map(option => option.group ?? '')))

  return (
    <div className="picker">
      <div className="picker-head">
        <strong>
          {title} ({selected.length} valgt)
        </strong>
        <button
          className="link-button"
          disabled={visibleIds.length === 0}
          onClick={() => onChange(allVisibleSelected ? selected.filter(id => !visibleIds.includes(id)) : Array.from(new Set([...selected, ...visibleIds])))}
        >
          {allVisibleSelected ? 'Fjern treffene' : 'Velg alle treff'}
        </button>
      </div>
      <div className="picker-search">
        <input className="search" placeholder={searchPlaceholder} value={search} onChange={event => setSearch(event.target.value)} />
      </div>
      <div className="picker-body">
        {groups.map(group => (
          <div key={group}>
            {group && <div className="picker-group">{group}</div>}
            {visible
              .filter(option => (option.group ?? '') === group)
              .map(option => (
                <label className="picker-row" key={option.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(option.id)}
                    onChange={() => onChange(selected.includes(option.id) ? selected.filter(id => id !== option.id) : [...selected, option.id])}
                  />
                  <span>
                    <strong>{option.primary}</strong>
                    {option.secondary && <small>{option.secondary}</small>}
                  </span>
                </label>
              ))}
          </div>
        ))}
        {visible.length === 0 && <p className="empty">Ingen treff.</p>}
      </div>
    </div>
  )
}

function EditableCell({
  value,
  onSave,
  multiline,
  placeholder
}: {
  value: string
  onSave: (value: string) => Promise<void> | void
  multiline?: boolean
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => setDraft(value), [value])

  const commit = () => {
    setEditing(false)
    if (draft !== value) void onSave(draft)
  }

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === 'Escape') {
      setDraft(value)
      setEditing(false)
    }
    if (event.key === 'Enter' && !multiline) commit()
  }

  const stop = (event: ReactMouseEvent) => event.stopPropagation()

  if (editing) {
    return multiline ? (
      <textarea className="cell-input" rows={4} autoFocus value={draft} onBlur={commit} onKeyDown={onKeyDown} onClick={stop} onChange={event => setDraft(event.target.value)} />
    ) : (
      <input className="cell-input" autoFocus value={draft} onBlur={commit} onKeyDown={onKeyDown} onClick={stop} onChange={event => setDraft(event.target.value)} />
    )
  }

  return (
    <div
      className="cell-value"
      title="Dobbeltklikk for å redigere"
      onClick={stop}
      onDoubleClick={event => {
        event.stopPropagation()
        setEditing(true)
      }}
    >
      {value || <span className="muted">{placeholder ?? 'Dobbeltklikk for å fylle ut'}</span>}
    </div>
  )
}

function rowState(item: LckItem) {
  if (item.questions.some(question => question.answer === 'Nei' && !question.closedDate)) return 'state-deviation'
  if (item.questions.length > 0 && item.questions.every(question => question.answer)) return 'state-done'
  return 'state-open'
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function Score({ value }: { value: number | null }) {
  if (value === null) return <span className="muted">–</span>
  return <span className={value >= 80 ? 'good' : value >= 60 ? 'warn' : 'bad'}>{value} %</span>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
