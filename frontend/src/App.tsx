import { useEffect, useMemo, useState, type FormEvent } from 'react'
import LoginPage from './components/LoginPage'
import BusinessModules from './components/BusinessModules'
import ReportsDashboard from './components/ReportsDashboard'
import { apiRequest, downloadFile } from './services/api'
import './App.css'

const TOKEN_KEY = 'assistencia_access_token'

interface AuthenticatedUser {
  id: number
  name: string
  email: string
  is_admin: boolean
}

interface LoginResponse {
  token: string
  user: AuthenticatedUser
}

interface UserResponse {
  user: AuthenticatedUser
}

type TicketStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'
type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'

interface Ticket {
  id: number
  client_id: number | null
  code: string
  customer_name: string
  phone: string | null
  device: string
  issue: string
  description: string | null
  diagnosis: string | null
  parts_used: string | null
  status: TicketStatus
  priority: TicketPriority
  estimate: string | null
  estimate_approved: boolean | null
  warranty_days: number
  created_at: string
}

interface TicketAttachment {
  id: number
  original_name: string
  mime_type: string
  size: number
  created_at: string
}

interface TicketStatusHistory {
  id: number
  from_status: TicketStatus | null
  to_status: TicketStatus
  created_at: string
  user: { id: number; name: string } | null
}

interface TicketPage {
  data: Ticket[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

interface TicketForm {
  client_id: string
  customer_name: string
  phone: string
  device: string
  issue: string
  description: string
  diagnosis: string
  parts_used: string
  priority: TicketPriority
  estimate: string
  estimate_approved: '' | 'yes' | 'no'
  warranty_days: string
}

const emptyForm: TicketForm = {
  client_id: '',
  customer_name: '',
  phone: '',
  device: '',
  issue: '',
  description: '',
  diagnosis: '',
  parts_used: '',
  priority: 'normal',
  estimate: '',
  estimate_approved: '',
  warranty_days: '0',
}

const statuses: { value: TicketStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'open', label: 'Aberto' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
]

const statusLabels: Record<TicketStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

const priorityLabels: Record<TicketPriority, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
}

function currency(value: string | null): string {
  if (!value) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
}

function TicketDashboard({
  user,
  onLogout,
}: {
  user: AuthenticatedUser
  onLogout: () => void
}) {
  const [clients, setClients] = useState<{ id: number; name: string; phone: string | null }[]>([])
  const [ticketHistory, setTicketHistory] = useState<TicketStatusHistory[]>([])
  const [attachments, setAttachments] = useState<TicketAttachment[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [activeView, setActiveView] = useState<'tickets' | 'kanban' | 'clients' | 'inventory' | 'finance' | 'users' | 'reports'>('tickets')
  const [ticketMode, setTicketMode] = useState<'list' | 'kanban'>('list')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [meta, setMeta] = useState<TicketPage['meta']>()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TicketStatus | ''>('')
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<Ticket | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<TicketForm>(emptyForm)

  useEffect(() => {
    if (!dialogOpen || !editing) {
      return
    }

    const controller = new AbortController()
    apiRequest<{ data: TicketStatusHistory[] }>(`/tickets/${editing.id}/history`, { signal: controller.signal })
      .then((result) => setTicketHistory(result.data))
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o histórico.')
      })
    return () => controller.abort()
  }, [dialogOpen, editing])

  useEffect(() => {
    const ticketId = editing?.id
    if (!dialogOpen || !ticketId) return
    const controller = new AbortController()
    apiRequest<{ data: TicketAttachment[] }>(`/tickets/${ticketId}/attachments`, { signal: controller.signal })
      .then((result) => setAttachments(result.data))
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os anexos.')
      })
    return () => controller.abort()
  }, [dialogOpen, editing?.id])

  useEffect(() => {
    apiRequest<{ data: { id: number; name: string; phone: string | null }[] }>('/clients?per_page=100')
      .then((result) => setClients(result.data))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os clientes.'))
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError('')
      const params = new URLSearchParams({ per_page: '15', page: String(page) })
      if (search.trim()) params.set('search', search.trim())
      if (status) params.set('status', status)

      if (ticketMode === 'kanban') params.set('per_page', '100')
      apiRequest<TicketPage>(`/tickets?${params}`, { signal: controller.signal })
        .then((result) => {
          setTickets(result.data)
          setMeta(result.meta)
        })
        .catch((cause: unknown) => {
          if (cause instanceof Error && cause.name === 'AbortError') return
          setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os chamados.')
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 180)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [page, reload, search, status, ticketMode])

  const openCount = useMemo(
    () => tickets.filter((ticket) => ticket.status === 'open').length,
    [tickets],
  )
  const activeCount = useMemo(
    () => tickets.filter((ticket) => ticket.status === 'in_progress').length,
    [tickets],
  )

  function startCreate() {
    setEditing(null)
    setTicketHistory([])
    setAttachments([])
    setSelectedFiles([])
    setForm({ ...emptyForm })
    setDialogOpen(true)
    setError('')
    setNotice('')
  }

  function startEdit(ticket: Ticket) {
    setEditing(ticket)
    setTicketHistory([])
    setAttachments([])
    setSelectedFiles([])
    setDialogOpen(true)
    setForm({
      client_id: ticket.client_id ? String(ticket.client_id) : '',
      customer_name: ticket.customer_name,
      phone: ticket.phone || '',
      device: ticket.device,
      issue: ticket.issue,
      description: ticket.description || '',
      diagnosis: ticket.diagnosis || '',
      parts_used: ticket.parts_used || '',
      priority: ticket.priority,
      estimate: ticket.estimate || '',
      estimate_approved: ticket.estimate_approved === null ? '' : ticket.estimate_approved ? 'yes' : 'no',
      warranty_days: String(ticket.warranty_days || 0),
    })
    setError('')
    setNotice('')
  }

  async function saveTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      ...form,
      client_id: form.client_id ? Number(form.client_id) : null,
      estimate: form.estimate ? Number(form.estimate) : null,
      estimate_approved: form.estimate_approved === '' ? null : form.estimate_approved === 'yes',
      warranty_days: Number(form.warranty_days),
      ...(editing ? { status: editing.status } : {}),
    }

    try {
      let savedTicket: Ticket
      if (editing) {
        const response = await apiRequest<{ data: Ticket }>(`/tickets/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        savedTicket = response.data
        setNotice('Chamado atualizado.')
      } else {
        const response = await apiRequest<{ data: Ticket }>('/tickets', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        savedTicket = response.data
        setNotice('Chamado criado.')
        setPage(1)
      }
      if (selectedFiles.length > 0) {
        const upload = new FormData()
        selectedFiles.forEach((file) => upload.append('files[]', file))
        try {
          const result = await apiRequest<{ data: TicketAttachment[] }>(`/tickets/${savedTicket.id}/attachments`, {
            method: 'POST',
            body: upload,
          })
          setAttachments((current) => [...result.data, ...current])
          setSelectedFiles([])
        } catch (cause) {
          setEditing(savedTicket)
          setError(cause instanceof Error ? `Chamado salvo, mas os anexos não foram enviados: ${cause.message}` : 'Chamado salvo, mas os anexos não foram enviados.')
          setNotice('')
          setReload((value) => value + 1)
          return
        }
      }
      setEditing(null)
      setDialogOpen(false)
      setReload((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o chamado.')
    } finally {
      setSaving(false)
    }
  }

  async function removeAttachment(ticketId: number, attachment: TicketAttachment) {
    if (!window.confirm(`Remover o anexo "${attachment.original_name}"?`)) return
    try {
      await apiRequest(`/tickets/${ticketId}/attachments/${attachment.id}`, { method: 'DELETE' })
      setAttachments((current) => current.filter((item) => item.id !== attachment.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível remover o anexo.')
    }
  }

  function printTicket(ticket: Ticket) {
    const printableWindow = window.open('', '_blank')
    if (!printableWindow) {
      setError('Permita a abertura de janelas para imprimir a ordem de serviço.')
      return
    }
    const escapeHtml = (value: string | number | null) => String(value ?? '—')
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')
    const approved = ticket.estimate_approved === null ? 'Aguardando aprovação' : ticket.estimate_approved ? 'Aprovado' : 'Não aprovado'
    printableWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Ordem de serviço ${escapeHtml(ticket.code)}</title><style>body{font:14px Arial,sans-serif;color:#222;margin:36px}h1{font-size:22px}h2{font-size:15px;margin-top:24px;border-bottom:1px solid #ccc;padding-bottom:6px}.header{display:flex;justify-content:space-between;border-bottom:2px solid #4169e1;padding-bottom:12px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.field{padding:9px;border:1px solid #ddd;border-radius:4px}.label{display:block;color:#666;font-size:11px;margin-bottom:5px}.text{white-space:pre-wrap;min-height:20px}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:60px;text-align:center}.signatures div{border-top:1px solid #555;padding-top:8px}@media print{body{margin:18mm}}</style></head><body><div class="header"><div><strong>ASSISTÊNCIA TÉCNICA</strong><div>Ordem de serviço</div></div><div><strong>${escapeHtml(ticket.code)}</strong><div>${new Date(ticket.created_at).toLocaleDateString('pt-BR')}</div></div></div><h2>Cliente e equipamento</h2><div class="grid"><div class="field"><span class="label">Cliente</span>${escapeHtml(ticket.customer_name)}</div><div class="field"><span class="label">Telefone</span>${escapeHtml(ticket.phone)}</div><div class="field"><span class="label">Equipamento</span>${escapeHtml(ticket.device)}</div><div class="field"><span class="label">Serviço solicitado</span>${escapeHtml(ticket.issue)}</div></div><h2>Atendimento</h2><div class="field"><span class="label">Descrição</span><div class="text">${escapeHtml(ticket.description)}</div></div><div class="field"><span class="label">Diagnóstico técnico</span><div class="text">${escapeHtml(ticket.diagnosis)}</div></div><div class="field"><span class="label">Peças utilizadas</span><div class="text">${escapeHtml(ticket.parts_used)}</div></div><h2>Orçamento e garantia</h2><div class="grid"><div class="field"><span class="label">Valor estimado</span>${escapeHtml(currency(ticket.estimate))}</div><div class="field"><span class="label">Aprovação do cliente</span>${escapeHtml(approved)}</div><div class="field"><span class="label">Garantia</span>${escapeHtml(ticket.warranty_days)} dias</div><div class="field"><span class="label">Status</span>${escapeHtml(statusLabels[ticket.status])}</div></div><div class="signatures"><div>Assinatura do cliente</div><div>Responsável técnico</div></div><script>window.onload=()=>window.print()</script></body></html>`)
    printableWindow.document.close()
  }

  async function deleteTicket(ticket: Ticket) {
    if (!window.confirm(`Excluir o chamado ${ticket.code}? Esta ação não pode ser desfeita.`)) return

    setError('')
    setNotice('')
    try {
      await apiRequest<void>(`/tickets/${ticket.id}`, { method: 'DELETE' })
      setNotice('Chamado excluído.')
      setReload((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível excluir o chamado.')
    }
  }

  async function changeTicketStatus(ticket: Ticket, nextStatus: TicketStatus) {
    if (ticket.status === nextStatus) return
    setError('')
    try {
      await apiRequest<Ticket>(`/tickets/${ticket.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      })
      setTickets((current) => current.map((item) => item.id === ticket.id ? { ...item, status: nextStatus } : item))
      setNotice(`${ticket.code} movido para ${statusLabels[nextStatus].toLowerCase()}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o status.')
      setReload((value) => value + 1)
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Assistência Técnica, início">
          <span className="brand-mark">AM</span>
          <span><strong>Assistência</strong><small>gestão técnica</small></span>
        </a>
        <div className="nav-caption">OPERAÇÃO</div>
        <button className={`nav-link${activeView === 'tickets' ? ' active' : ''}`} type="button" onClick={() => { setActiveView('tickets'); setTicketMode('list') }}><span aria-hidden="true">▤</span> Chamados</button>
        <button className={`nav-link${activeView === 'kanban' ? ' active' : ''}`} type="button" onClick={() => { setActiveView('kanban'); setTicketMode('kanban') }}><span aria-hidden="true">▦</span> Kanban</button>
        <div className="nav-caption nav-caption-secondary">GESTÃO</div>
        <button className={`nav-link${activeView === 'clients' ? ' active' : ''}`} type="button" onClick={() => setActiveView('clients')}><span aria-hidden="true">♙</span> Clientes</button>
        <button className={`nav-link${activeView === 'inventory' ? ' active' : ''}`} type="button" onClick={() => setActiveView('inventory')}><span aria-hidden="true">▣</span> Estoque</button>
        <button className={`nav-link${activeView === 'finance' ? ' active' : ''}`} type="button" onClick={() => setActiveView('finance')}><span aria-hidden="true">R$</span> Financeiro</button>
        <button className={`nav-link${activeView === 'reports' ? ' active' : ''}`} type="button" onClick={() => setActiveView('reports')}><span aria-hidden="true">▥</span> Relatórios</button>
        {user.is_admin && <button className={`nav-link${activeView === 'users' ? ' active' : ''}`} type="button" onClick={() => setActiveView('users')}><span aria-hidden="true">⚙</span> Usuários</button>}
        <div className="sidebar-footer">
          <span className="online-dot" /> API conectada
        </div>
      </aside>

      <main className="main-content" id="chamados">
        <header className="topbar">
          <div className="breadcrumb">Operação <span>/</span> {activeView === 'tickets' || activeView === 'kanban' ? (activeView === 'kanban' ? 'Kanban' : 'Chamados') : ({ clients: 'Clientes', inventory: 'Estoque', finance: 'Financeiro', users: 'Usuários', reports: 'Relatórios' }[activeView])}</div>
          <div className="user-chip">
            <span className="avatar">{user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
            <span>{user.name}</span>
            <button className="logout-button" type="button" onClick={onLogout}>Sair</button>
          </div>
        </header>

        {activeView === 'tickets' || activeView === 'kanban' ? <section className="page-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">VISÃO GERAL</p>
              <h1>Chamados</h1>
              <p className="subtitle">Acompanhe e organize os atendimentos da assistência técnica.</p>
            </div>
            <div className="heading-actions">
              <button className={`button view-switch${ticketMode === 'list' ? ' selected' : ''}`} type="button" onClick={() => { setTicketMode('list'); setActiveView('tickets') }}>Lista</button>
              <button className={`button view-switch${ticketMode === 'kanban' ? ' selected' : ''}`} type="button" onClick={() => { setTicketMode('kanban'); setActiveView('kanban'); setStatus(''); setPage(1) }}>Kanban</button>
              <button className="button button-primary" type="button" onClick={startCreate}><span aria-hidden="true">＋</span> Novo chamado</button>
            </div>
          </div>

          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {notice && <div className="alert alert-success" role="status">{notice}</div>}

          <div className="metrics">
            <article className="metric-card">
              <span className="metric-icon icon-blue">▤</span>
              <div><span className="metric-label">Total de chamados</span><strong>{meta?.total ?? '—'}</strong></div>
            </article>
            <article className="metric-card">
              <span className="metric-icon icon-amber">◷</span>
              <div><span className="metric-label">Abertos nesta página</span><strong>{openCount}</strong></div>
            </article>
            <article className="metric-card">
              <span className="metric-icon icon-violet">↻</span>
              <div><span className="metric-label">Em andamento nesta página</span><strong>{activeCount}</strong></div>
            </article>
          </div>

          {ticketMode === 'list' ? <section className="ticket-panel">
            <div className="panel-heading">
              <div><h2>Todos os chamados</h2><p>{meta ? `${meta.total} registro(s)` : 'Carregando registros'}</p></div>
              <div className="filters">
                <label className="search-box">
                  <span aria-hidden="true">⌕</span>
                  <input
                    aria-label="Buscar chamado"
                    placeholder="Buscar por cliente, aparelho..."
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setPage(1)
                    }}
                  />
                </label>
                <select
                  aria-label="Filtrar por status"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as TicketStatus | '')
                    setPage(1)
                  }}
                >
                  {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Chamado</th><th>Cliente / aparelho</th><th>Serviço</th><th>Prioridade</th><th>Valor estimado</th><th>Status</th><th><span className="sr-only">Ações</span></th></tr>
                </thead>
                <tbody>
                  {loading && <tr><td className="table-message" colSpan={7}>Carregando chamados...</td></tr>}
                  {!loading && tickets.length === 0 && (
                    <tr><td className="table-message" colSpan={7}>Nenhum chamado encontrado. Crie um novo para começar.</td></tr>
                  )}
                  {!loading && tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td><strong className="ticket-code">{ticket.code}</strong><small>{new Date(ticket.created_at).toLocaleDateString('pt-BR')}</small></td>
                      <td><strong>{ticket.customer_name}</strong><small>{ticket.device}{ticket.phone ? ` · ${ticket.phone}` : ''}</small></td>
                      <td><strong>{ticket.issue}</strong><small>{ticket.description || 'Sem observações'}</small></td>
                      <td><span className={`priority priority-${ticket.priority}`}>{priorityLabels[ticket.priority]}</span></td>
                      <td className="amount">{currency(ticket.estimate)}</td>
                      <td><span className={`status status-${ticket.status}`}>{statusLabels[ticket.status]}</span></td>
                      <td className="row-actions">
                        <button type="button" aria-label={`Editar ${ticket.code}`} onClick={() => startEdit(ticket)}>Editar</button>
                        <button type="button" aria-label={`Imprimir ordem ${ticket.code}`} onClick={() => printTicket(ticket)}>Imprimir</button>
                        <button className="delete-action" type="button" aria-label={`Excluir ${ticket.code}`} onClick={() => void deleteTicket(ticket)}>Excluir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>{meta ? `Página ${meta.current_page} de ${meta.last_page}` : ''}</span>
              <div>
                <button type="button" disabled={!meta || meta.current_page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Anterior</button>
                <button type="button" disabled={!meta || meta.current_page >= meta.last_page || loading} onClick={() => setPage((value) => value + 1)}>Próxima</button>
              </div>
            </div>
          </section> : <section className="kanban-board" aria-label="Quadro Kanban de chamados">
            {statuses.filter((item) => item.value).map((column) => {
              const columnTickets = tickets.filter((ticket) => ticket.status === column.value)
              return <section
                className="kanban-column"
                key={column.value}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  const ticketId = Number(event.dataTransfer.getData('text/plain'))
                  const moved = tickets.find((ticket) => ticket.id === ticketId)
                  if (moved) void changeTicketStatus(moved, column.value as TicketStatus)
                }}
              >
                <header className="kanban-column-heading"><span className={`kanban-dot status-${column.value}`} /><strong>{column.label}</strong><span>{columnTickets.length}</span></header>
                {columnTickets.map((ticket) => <article className="kanban-card" key={ticket.id} draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', String(ticket.id))}>
                  <div className="kanban-card-top"><strong>{ticket.code}</strong><span className={`priority priority-${ticket.priority}`}>{priorityLabels[ticket.priority]}</span></div>
                  <h3>{ticket.issue}</h3>
                  <p>{ticket.customer_name} · {ticket.device}</p>
                  <label className="kanban-status-label">Mover para<select aria-label={`Mover ${ticket.code}`} value={ticket.status} onChange={(event) => void changeTicketStatus(ticket, event.target.value as TicketStatus)}>
                    {statuses.filter((item) => item.value).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select></label>
                </article>)}
                {columnTickets.length === 0 && <p className="kanban-empty">{loading ? 'Carregando...' : 'Nenhum chamado'}</p>}
              </section>
            })}
          </section>}
          <footer className="page-footer">Assistência Técnica <span>·</span> Gestão de serviços</footer>
        </section> : activeView === 'reports' ? <ReportsDashboard /> : <BusinessModules key={activeView} view={activeView} user={user} />}
      </main>

      {dialogOpen && (
        <dialog className="ticket-dialog" open aria-labelledby="dialog-title">
          <form className="ticket-form" onSubmit={(event) => void saveTicket(event)}>
            <div className="dialog-heading">
              <div><p className="eyebrow">{editing ? editing.code : 'NOVO REGISTRO'}</p><h2 id="dialog-title">{editing ? 'Editar chamado' : 'Novo chamado'}</h2></div>
              <button className="close-button" type="button" aria-label="Fechar" onClick={() => setDialogOpen(false)}>×</button>
            </div>
            <label>Cliente cadastrado<select value={form.client_id} onChange={(event) => {
              const client = clients.find((item) => item.id === Number(event.target.value))
              setForm({
                ...form,
                client_id: event.target.value,
                ...(client ? { customer_name: client.name, phone: client.phone || '' } : {}),
              })
            }}><option value="">Selecionar cliente ou informar manualmente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
            {!form.client_id && <label>Nome do cliente<input required maxLength={120} value={form.customer_name} onChange={(event) => setForm({ ...form, customer_name: event.target.value })} /></label>}
            <div className="form-row">
              <label>Telefone<input maxLength={30} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
              <label>Aparelho<input required maxLength={120} value={form.device} onChange={(event) => setForm({ ...form, device: event.target.value })} /></label>
            </div>
            <label>Serviço solicitado<input required maxLength={160} value={form.issue} onChange={(event) => setForm({ ...form, issue: event.target.value })} /></label>
            <label>Descrição do problema<textarea rows={2} maxLength={5000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <label>Diagnóstico técnico<textarea rows={3} maxLength={10000} value={form.diagnosis} onChange={(event) => setForm({ ...form, diagnosis: event.target.value })} /></label>
            <label>Peças utilizadas<textarea rows={2} maxLength={5000} value={form.parts_used} onChange={(event) => setForm({ ...form, parts_used: event.target.value })} /></label>
            <div className="form-row">
              <label>Prioridade<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TicketPriority })}>
                {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select></label>
              <label>Valor estimado (R$)<input type="number" min="0" step="0.01" value={form.estimate} onChange={(event) => setForm({ ...form, estimate: event.target.value })} /></label>
            </div>
            <div className="form-row">
              <label>Aprovação do orçamento<select value={form.estimate_approved} onChange={(event) => setForm({ ...form, estimate_approved: event.target.value as TicketForm['estimate_approved'] })}>
                <option value="">Aguardando aprovação</option><option value="yes">Aprovado</option><option value="no">Não aprovado</option>
              </select></label>
              <label>Garantia (dias)<input type="number" min="0" max="3650" value={form.warranty_days} onChange={(event) => setForm({ ...form, warranty_days: event.target.value })} /></label>
            </div>
            {editing && <label>Status<select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as TicketStatus })}>
              {statuses.filter((item) => item.value).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select></label>}
            <section className="ticket-attachments" aria-label="Anexos da ordem de serviço">
              <strong>Anexos {editing ? `(${attachments.length})` : ''}</strong>
              <small>Fotos JPG/PNG/WebP e PDF, até 10 MB por arquivo. Salve a ordem para enviar os anexos.</small>
              <input aria-label="Selecionar anexos" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" multiple onChange={(event) => {
                const files = Array.from(event.target.files || [])
                if (files.length > 5) {
                  setError('Selecione no máximo 5 arquivos por envio.')
                  event.target.value = ''
                  return
                }
                setSelectedFiles(files)
                setError('')
              }} />
              {selectedFiles.map((file) => <div className="attachment-row" key={`${file.name}-${file.size}`}><span>{file.name} <small>({(file.size / 1024 / 1024).toFixed(1)} MB)</small></span><button className="text-action danger-text" type="button" onClick={() => setSelectedFiles((current) => current.filter((item) => item !== file))}>Remover seleção</button></div>)}
              {attachments.map((attachment) => <div className="attachment-row" key={attachment.id}>
                <span>{attachment.original_name} <small>({(attachment.size / 1024 / 1024).toFixed(1)} MB)</small></span>
                <span><button className="text-action" type="button" onClick={() => void downloadFile(`/tickets/${editing?.id}/attachments/${attachment.id}/download`, attachment.original_name).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Não foi possível baixar o anexo.'))}>Baixar</button><button className="text-action danger-text" type="button" onClick={() => editing && void removeAttachment(editing.id, attachment)}>Excluir</button></span>
              </div>)}
            </section>
            {editing && <section className="ticket-history" aria-label="Histórico de status">
              <strong>Histórico do chamado</strong>
              {ticketHistory.map((item) => <p key={item.id}>
                <span>{item.from_status ? statusLabels[item.from_status] : 'Criado'} → {statusLabels[item.to_status]}</span>
                <small>{item.user?.name || 'Sistema'} · {new Date(item.created_at).toLocaleString('pt-BR')}</small>
              </p>)}
              {ticketHistory.length === 0 && <small>Sem alterações registradas.</small>}
            </section>}
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <div className="dialog-actions">
              <button className="button button-secondary" type="button" onClick={() => setDialogOpen(false)}>Cancelar</button>
              <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar chamado'}</button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  )
}

function App() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [checkingSession, setCheckingSession] = useState(
    () => Boolean(sessionStorage.getItem(TOKEN_KEY)),
  )
  const [loginError, setLoginError] = useState('')

  useEffect(() => {
    function expireSession() {
      sessionStorage.removeItem(TOKEN_KEY)
      setUser(null)
      setLoginError('Sua sessão expirou. Entre novamente para continuar.')
    }

    window.addEventListener('assistencia:auth-expired', expireSession)
    const token = sessionStorage.getItem(TOKEN_KEY)

    if (token) {
      apiRequest<UserResponse>('/auth/me')
        .then((response) => setUser(response.user))
        .catch(() => {
          sessionStorage.removeItem(TOKEN_KEY)
          setLoginError('Não foi possível validar sua sessão. Entre novamente.')
        })
        .finally(() => setCheckingSession(false))
    }

    return () => window.removeEventListener('assistencia:auth-expired', expireSession)
  }, [])

  async function login(email: string, password: string): Promise<void> {
    const response = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    sessionStorage.setItem(TOKEN_KEY, response.token)
    setLoginError('')
    setUser(response.user)
  }

  async function logout(): Promise<void> {
    try {
      await apiRequest<{ message: string }>('/auth/logout', { method: 'POST' })
      setLoginError('')
    } catch {
      setLoginError('A sessão local foi encerrada, mas não foi possível confirmar a revogação no servidor.')
    } finally {
      sessionStorage.removeItem(TOKEN_KEY)
      setUser(null)
    }
  }

  if (checkingSession) {
    return <main className="session-check"><span className="login-spinner" /> Verificando sua sessão...</main>
  }

  if (!user) {
    return <LoginPage onLogin={login} initialError={loginError} />
  }

  return <TicketDashboard user={user} onLogout={() => void logout()} />
}

export default App
