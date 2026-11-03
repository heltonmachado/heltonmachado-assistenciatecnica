import { useEffect, useState, type FormEvent } from 'react'
import { apiRequest } from '../services/api'

type ModuleView = 'clients' | 'inventory' | 'finance' | 'users'

interface User {
  id: number
  name: string
  email: string
  is_admin: boolean
  is_active: boolean
  created_at: string
}

interface Client {
  id: number
  name: string
  email: string | null
  phone: string | null
  document: string | null
  address: string | null
  notes: string | null
  tickets_count: number
}

interface Product {
  id: number
  name: string
  sku: string
  category: string | null
  stock: number
  minimum_stock: number
  unit_cost: string
  unit_price: string
}

interface FinanceEntry {
  id: number
  type: 'income' | 'expense'
  description: string
  category: string | null
  amount: string
  due_date: string | null
  paid_at: string | null
  notes: string | null
}

interface StockMovement {
  id: number
  type: 'in' | 'out'
  quantity: number
  reason: string
  created_at: string
  user: { name: string } | null
}

interface ModuleProps {
  view: ModuleView
  user: Pick<User, 'id' | 'is_admin'>
}

interface PageMeta {
  current_page: number
  last_page: number
  total: number
}

interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
}

const money = (amount: string | number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(amount))

function BusinessModules({ view, user }: ModuleProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [entries, setEntries] = useState<FinanceEntry[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [summary, setSummary] = useState({ income: 0, expenses: 0, pending: 0 })
  const [meta, setMeta] = useState<PageMeta | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [clientForm, setClientForm] = useState({ name: '', email: '', phone: '', document: '' })
  const [productForm, setProductForm] = useState({ name: '', sku: '', category: '', stock: '0', minimum_stock: '0', unit_cost: '', unit_price: '' })
  const [financeForm, setFinanceForm] = useState({ type: 'income' as FinanceEntry['type'], description: '', category: '', amount: '', due_date: '', paid: true })
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', is_admin: false })
  const [stockForm, setStockForm] = useState<{ product: Product; type: 'in' | 'out' } | null>(null)
  const [stockQuantity, setStockQuantity] = useState('')
  const [stockReason, setStockReason] = useState('')
  const [movementProduct, setMovementProduct] = useState<Product | null>(null)
  const [movements, setMovements] = useState<StockMovement[]>([])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        if (view === 'clients') {
          const params = new URLSearchParams({ page: String(page), per_page: '15', search })
          const result = await apiRequest<Paginated<Client>>(`/clients?${params}`)
          if (active) {
            setClients(result.data)
            setMeta(result)
          }
        } else if (view === 'inventory') {
          const params = new URLSearchParams({ page: String(page), per_page: '15', search })
          const result = await apiRequest<Paginated<Product>>(`/products?${params}`)
          if (active) {
            setProducts(result.data)
            setMeta(result)
          }
        } else if (view === 'finance') {
          const params = new URLSearchParams({ page: String(page), per_page: '15', search })
          const result = await apiRequest<Paginated<FinanceEntry> & { summary: typeof summary }>(`/finance?${params}`)
          if (active) {
            setEntries(result.data)
            setSummary(result.summary)
            setMeta(result)
          }
        } else if (view === 'users' && user.is_admin) {
          const result = await apiRequest<{ data: User[] }>('/users')
          if (active) setUsers(result.data)
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados.')
      }
    }
    void load()
    return () => { active = false }
  }, [page, reload, search, user.is_admin, view])

  async function runAction(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      setNotice(success)
      setShowForm(false)
      setEditingId(null)
      setStockForm(null)
      setPage(1)
      setReload((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar as alterações.')
    } finally {
      setBusy(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>, action: () => Promise<unknown>, success: string) {
    event.preventDefault()
    void runAction(action, success)
  }

  const config = {
    clients: { eyebrow: 'RELACIONAMENTO', title: 'Clientes', subtitle: 'Cadastre clientes e acompanhe os chamados vinculados.' },
    inventory: { eyebrow: 'OPERAÇÃO', title: 'Estoque', subtitle: 'Controle produtos, níveis mínimos e movimentações.' },
    finance: { eyebrow: 'GESTÃO', title: 'Financeiro', subtitle: 'Acompanhe receitas, despesas e lançamentos pendentes.' },
    users: { eyebrow: 'ADMINISTRAÇÃO', title: 'Usuários', subtitle: 'Gerencie acessos e permissões da equipe.' },
  }[view]

  return (
    <section className="page-content module-content">
      <div className="page-heading">
        <div><p className="eyebrow">{config.eyebrow}</p><h1>{config.title}</h1><p className="subtitle">{config.subtitle}</p></div>
        <button className="button button-primary" type="button" onClick={() => { setShowForm((value) => !value); setEditingId(null); setError(''); setNotice('') }}>
          <span aria-hidden="true">{showForm ? '×' : '＋'}</span> {showForm ? 'Fechar' : view === 'clients' ? 'Novo cliente' : view === 'inventory' ? 'Novo produto' : view === 'finance' ? 'Novo lançamento' : 'Novo usuário'}
        </button>
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}

      {view === 'clients' && showForm && <form className="module-form" onSubmit={(event) => void submit(event, () => apiRequest(editingId ? `/clients/${editingId}` : '/clients', { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(clientForm) }), editingId ? 'Cliente atualizado.' : 'Cliente cadastrado.')}>
        <label>Nome completo<input required maxLength={120} value={clientForm.name} onChange={(event) => setClientForm({ ...clientForm, name: event.target.value })} /></label>
        <label>E-mail<input type="email" maxLength={254} value={clientForm.email} onChange={(event) => setClientForm({ ...clientForm, email: event.target.value })} /></label>
        <label>Telefone<input maxLength={30} value={clientForm.phone} onChange={(event) => setClientForm({ ...clientForm, phone: event.target.value })} /></label>
        <label>CPF/CNPJ<input maxLength={30} value={clientForm.document} onChange={(event) => setClientForm({ ...clientForm, document: event.target.value })} /></label>
        <button className="button button-primary" disabled={busy}>{busy ? 'Salvando...' : editingId ? 'Atualizar cliente' : 'Salvar cliente'}</button>
      </form>}

      {view === 'inventory' && showForm && <form className="module-form" onSubmit={(event) => void submit(event, () => apiRequest(editingId ? `/products/${editingId}` : '/products', { method: editingId ? 'PUT' : 'POST', body: JSON.stringify({ ...productForm, ...(editingId ? {} : { stock: Number(productForm.stock) }), minimum_stock: Number(productForm.minimum_stock), unit_cost: Number(productForm.unit_cost), unit_price: Number(productForm.unit_price) }) }), editingId ? 'Produto atualizado.' : 'Produto cadastrado.')}>
        <label>Produto<input required maxLength={120} value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></label>
        <label>SKU<input required maxLength={60} value={productForm.sku} onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })} /></label>
        <label>Categoria<input maxLength={80} value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} /></label>
        {!editingId && <label>Estoque inicial<input type="number" min="0" required value={productForm.stock} onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })} /></label>}
        <label>Estoque mínimo<input type="number" min="0" required value={productForm.minimum_stock} onChange={(event) => setProductForm({ ...productForm, minimum_stock: event.target.value })} /></label>
        <label>Custo unitário<input type="number" min="0" step="0.01" required value={productForm.unit_cost} onChange={(event) => setProductForm({ ...productForm, unit_cost: event.target.value })} /></label>
        <label>Preço unitário<input type="number" min="0" step="0.01" required value={productForm.unit_price} onChange={(event) => setProductForm({ ...productForm, unit_price: event.target.value })} /></label>
        <button className="button button-primary" disabled={busy}>{busy ? 'Salvando...' : editingId ? 'Atualizar produto' : 'Salvar produto'}</button>
      </form>}

      {view === 'finance' && showForm && <form className="module-form" onSubmit={(event) => void submit(event, () => apiRequest(editingId ? `/finance/${editingId}` : '/finance', { method: editingId ? 'PUT' : 'POST', body: JSON.stringify({ type: financeForm.type, description: financeForm.description, category: financeForm.category || null, amount: Number(financeForm.amount), due_date: financeForm.due_date || null, paid_at: financeForm.paid ? new Date().toISOString() : null }) }), editingId ? 'Lançamento atualizado.' : 'Lançamento financeiro criado.')}>
        <label>Tipo<select value={financeForm.type} onChange={(event) => setFinanceForm({ ...financeForm, type: event.target.value as FinanceEntry['type'] })}><option value="income">Receita</option><option value="expense">Despesa</option></select></label>
        <label>Descrição<input required maxLength={160} value={financeForm.description} onChange={(event) => setFinanceForm({ ...financeForm, description: event.target.value })} /></label>
        <label>Categoria<input maxLength={80} value={financeForm.category} onChange={(event) => setFinanceForm({ ...financeForm, category: event.target.value })} /></label>
        <label>Valor (R$)<input type="number" min="0.01" step="0.01" required value={financeForm.amount} onChange={(event) => setFinanceForm({ ...financeForm, amount: event.target.value })} /></label>
        <label>Vencimento<input type="date" value={financeForm.due_date} onChange={(event) => setFinanceForm({ ...financeForm, due_date: event.target.value })} /></label>
        <label className="checkbox-field"><input type="checkbox" checked={financeForm.paid} onChange={(event) => setFinanceForm({ ...financeForm, paid: event.target.checked })} /> Já foi pago/recebido</label>
        <button className="button button-primary" disabled={busy}>{busy ? 'Salvando...' : editingId ? 'Atualizar lançamento' : 'Salvar lançamento'}</button>
      </form>}

      {view === 'users' && user.is_admin && showForm && <form className="module-form" onSubmit={(event) => void submit(event, () => apiRequest('/users', { method: 'POST', body: JSON.stringify(userForm) }), 'Usuário criado.')}>
        <label>Nome<input required maxLength={120} value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} /></label>
        <label>E-mail<input type="email" required maxLength={254} value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} /></label>
        <label>Senha inicial<input type="password" required minLength={8} maxLength={128} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s])\S{8,128}" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} /><small>Use maiúscula, minúscula, número e símbolo.</small></label>
        <label className="checkbox-field"><input type="checkbox" checked={userForm.is_admin} onChange={(event) => setUserForm({ ...userForm, is_admin: event.target.checked })} /> Administrador</label>
        <button className="button button-primary" disabled={busy}>{busy ? 'Salvando...' : 'Criar usuário'}</button>
      </form>}

      {view === 'clients' && <section className="module-panel">
        <div className="module-panel-header"><div><h2>Base de clientes</h2><p>{meta?.total ?? clients.length} clientes cadastrados</p></div><label className="module-search"><span className="sr-only">Buscar cliente</span><input value={search} placeholder="Buscar cliente..." onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></label></div>
        <div className="module-table-wrap"><table className="module-table"><thead><tr><th>Cliente</th><th>Contato</th><th>Documento</th><th>Chamados</th><th>Ações</th></tr></thead><tbody>
          {clients.map((client) => <tr key={client.id}><td><strong>{client.name}</strong></td><td>{client.email || '—'}<small>{client.phone || 'Sem telefone'}</small></td><td>{client.document || '—'}</td><td>{client.tickets_count}</td><td><button className="text-action" type="button" onClick={() => { setClientForm({ name: client.name, email: client.email || '', phone: client.phone || '', document: client.document || '' }); setEditingId(client.id); setShowForm(true); setError(''); setNotice('') }}>Editar</button><button className="text-action danger-text" type="button" onClick={() => { if (window.confirm(`Excluir ${client.name}? Chamados existentes serão mantidos.`)) void runAction(() => apiRequest(`/clients/${client.id}`, { method: 'DELETE' }), 'Cliente excluído.') }}>Excluir</button></td></tr>)}
          {clients.length === 0 && <tr><td className="module-empty" colSpan={5}>Nenhum cliente cadastrado ainda.</td></tr>}
        </tbody></table></div>
        {meta && <div className="pagination"><span>Página {meta.current_page} de {meta.last_page} · {meta.total} clientes</span><div><button type="button" disabled={meta.current_page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</button><button type="button" disabled={meta.current_page >= meta.last_page} onClick={() => setPage((value) => value + 1)}>Próxima</button></div></div>}
      </section>}

      {view === 'inventory' && <section className="module-panel">
        <div className="module-panel-header"><div><h2>Produtos e peças</h2><p>{meta?.total ?? products.length} itens no catálogo</p></div><label className="module-search"><span className="sr-only">Buscar produto</span><input value={search} placeholder="Buscar produto ou SKU..." onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></label><span className="stock-warning">{products.filter((product) => product.stock <= product.minimum_stock).length} com estoque baixo nesta página</span></div>
        <div className="module-table-wrap"><table className="module-table"><thead><tr><th>Produto</th><th>SKU</th><th>Estoque</th><th>Custo</th><th>Preço</th><th>Ações</th></tr></thead><tbody>
          {products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><small>{product.category || 'Sem categoria'}</small></td><td>{product.sku}</td><td><span className={product.stock <= product.minimum_stock ? 'stock-low' : 'stock-ok'}>{product.stock}</span><small>Mínimo: {product.minimum_stock}</small></td><td>{money(product.unit_cost)}</td><td>{money(product.unit_price)}</td><td><button className="text-action" type="button" onClick={() => { setProductForm({ name: product.name, sku: product.sku, category: product.category || '', stock: String(product.stock), minimum_stock: String(product.minimum_stock), unit_cost: product.unit_cost, unit_price: product.unit_price }); setEditingId(product.id); setShowForm(true); setError(''); setNotice('') }}>Editar</button><button className="text-action" type="button" onClick={() => { setStockForm({ product, type: 'in' }); setStockQuantity(''); setStockReason('') }}>Entrada</button><button className="text-action danger-text" type="button" onClick={() => { setStockForm({ product, type: 'out' }); setStockQuantity(''); setStockReason('') }}>Saída</button><button className="text-action" type="button" onClick={async () => { setMovementProduct(product); setError(''); try { const result = await apiRequest<{ data: StockMovement[] }>(`/products/${product.id}/movements`); setMovements(result.data) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o histórico.') } }}>Histórico</button></td></tr>)}
          {products.length === 0 && <tr><td className="module-empty" colSpan={6}>Nenhum produto cadastrado.</td></tr>}
        </tbody></table></div>
        {meta && <div className="pagination"><span>Página {meta.current_page} de {meta.last_page} · {meta.total} produtos</span><div><button type="button" disabled={meta.current_page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</button><button type="button" disabled={meta.current_page >= meta.last_page} onClick={() => setPage((value) => value + 1)}>Próxima</button></div></div>}
        {stockForm && <form className="stock-adjust-form" onSubmit={(event) => void submit(event, () => apiRequest(`/products/${stockForm.product.id}/stock`, { method: 'POST', body: JSON.stringify({ type: stockForm.type, quantity: Number(stockQuantity), reason: stockReason }) }), 'Movimentação de estoque registrada.')}>
          <strong>{stockForm.type === 'in' ? 'Entrada' : 'Saída'}: {stockForm.product.name}</strong>
          <label>Quantidade<input type="number" min="1" required value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} /></label>
          <label>Motivo<input required maxLength={160} value={stockReason} onChange={(event) => setStockReason(event.target.value)} /></label>
          <button className="button button-primary" disabled={busy}>{busy ? 'Salvando...' : 'Registrar'}</button>
        </form>}
        {movementProduct && <div className="stock-adjust-form"><div><strong>Histórico: {movementProduct.name}</strong><button className="text-action" type="button" onClick={() => setMovementProduct(null)}>Fechar</button></div><div className="module-table-wrap"><table className="module-table"><thead><tr><th>Data</th><th>Movimento</th><th>Quantidade</th><th>Motivo</th><th>Responsável</th></tr></thead><tbody>{movements.map((movement) => <tr key={movement.id}><td>{new Date(movement.created_at).toLocaleString('pt-BR')}</td><td>{movement.type === 'in' ? 'Entrada' : 'Saída'}</td><td>{movement.quantity}</td><td>{movement.reason}</td><td>{movement.user?.name || 'Usuário removido'}</td></tr>)}{movements.length === 0 && <tr><td className="module-empty" colSpan={5}>Nenhuma movimentação registrada.</td></tr>}</tbody></table></div></div>}
      </section>}

      {view === 'finance' && <>
        <div className="metrics finance-metrics">
          <article className="metric-card"><span className="metric-icon icon-green">↗</span><div><span className="metric-label">Receitas recebidas</span><strong>{money(summary.income)}</strong></div></article>
          <article className="metric-card"><span className="metric-icon icon-amber">↙</span><div><span className="metric-label">Despesas pagas</span><strong>{money(summary.expenses)}</strong></div></article>
          <article className="metric-card"><span className="metric-icon icon-violet">◷</span><div><span className="metric-label">Lançamentos pendentes</span><strong>{summary.pending}</strong></div></article>
        </div>
        <section className="module-panel"><div className="module-panel-header"><div><h2>Movimentações financeiras</h2><p>{meta?.total ?? entries.length} lançamentos</p></div><label className="module-search"><span className="sr-only">Buscar lançamento</span><input value={search} placeholder="Buscar lançamento..." onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></label></div>
          <div className="module-table-wrap"><table className="module-table"><thead><tr><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Vencimento</th><th>Valor</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
            {entries.map((entry) => <tr key={entry.id}><td><strong>{entry.description}</strong></td><td>{entry.category || '—'}</td><td><span className={entry.type === 'income' ? 'finance-income' : 'finance-expense'}>{entry.type === 'income' ? 'Receita' : 'Despesa'}</span></td><td>{entry.due_date ? new Date(`${entry.due_date}T12:00:00`).toLocaleDateString('pt-BR') : '—'}</td><td>{money(entry.amount)}</td><td><span className={`status ${entry.paid_at ? 'status-completed' : 'status-open'}`}>{entry.paid_at ? 'Pago' : 'Pendente'}</span></td><td><button className="text-action" type="button" onClick={() => { setFinanceForm({ type: entry.type, description: entry.description, category: entry.category || '', amount: entry.amount, due_date: entry.due_date || '', paid: Boolean(entry.paid_at) }); setEditingId(entry.id); setShowForm(true); setError(''); setNotice('') }}>Editar</button><button className="text-action" type="button" onClick={() => void runAction(() => apiRequest(`/finance/${entry.id}`, { method: 'PUT', body: JSON.stringify({ paid_at: entry.paid_at ? null : new Date().toISOString() }) }), entry.paid_at ? 'Lançamento marcado como pendente.' : 'Lançamento confirmado.')}>{entry.paid_at ? 'Reabrir' : 'Confirmar'}</button><button className="text-action danger-text" type="button" onClick={() => { if (window.confirm(`Excluir o lançamento "${entry.description}"?`)) void runAction(() => apiRequest(`/finance/${entry.id}`, { method: 'DELETE' }), 'Lançamento excluído.') }}>Excluir</button></td></tr>)}
            {entries.length === 0 && <tr><td className="module-empty" colSpan={7}>Nenhum lançamento financeiro.</td></tr>}
          </tbody></table></div>
          {meta && <div className="pagination"><span>Página {meta.current_page} de {meta.last_page} · {meta.total} lançamentos</span><div><button type="button" disabled={meta.current_page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</button><button type="button" disabled={meta.current_page >= meta.last_page} onClick={() => setPage((value) => value + 1)}>Próxima</button></div></div>}
        </section>
      </>}

      {view === 'users' && user.is_admin && <section className="module-panel">
        <div className="module-panel-header"><div><h2>Acessos da equipe</h2><p>{users.length} usuários</p></div></div>
        <div className="module-table-wrap"><table className="module-table"><thead><tr><th>Usuário</th><th>Perfil</th><th>Status</th><th>Ação</th></tr></thead><tbody>
          {users.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.email}</small></td><td>{item.is_admin ? 'Administrador' : 'Equipe'}</td><td><span className={`status ${item.is_active ? 'status-completed' : 'status-cancelled'}`}>{item.is_active ? 'Ativo' : 'Inativo'}</span></td><td>{item.id === user.id ? 'Sua conta' : <><button className="text-action" type="button" onClick={() => void runAction(() => apiRequest(`/users/${item.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !item.is_active }) }), item.is_active ? 'Usuário desativado.' : 'Usuário ativado.')}>{item.is_active ? 'Desativar' : 'Ativar'}</button><button className="text-action" type="button" onClick={() => void runAction(() => apiRequest(`/users/${item.id}`, { method: 'PATCH', body: JSON.stringify({ is_admin: !item.is_admin }) }), item.is_admin ? 'Permissão de administrador removida.' : 'Usuário promovido a administrador.')}>{item.is_admin ? 'Remover admin' : 'Tornar admin'}</button></>}</td></tr>)}
        </tbody></table></div>
      </section>}
      <footer className="page-footer">Assistência Técnica <span>·</span> Gestão de serviços</footer>
    </section>
  )
}

export default BusinessModules
