import { useEffect, useState } from 'react'
import { apiRequest } from '../services/api'

interface OverviewReport {
  period: { from: string; to: string }
  tickets: { total: number; by_status: Record<string, number> }
  finance: { income: number; expenses: number; pending: number }
  inventory: { low_stock: number }
}

const today = new Date()
const localDate = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)

function ReportsDashboard() {
  const [from, setFrom] = useState(localDate(new Date(today.getFullYear(), today.getMonth(), 1)))
  const [to, setTo] = useState(localDate(today))
  const [report, setReport] = useState<OverviewReport | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ from, to })
    apiRequest<OverviewReport>(`/reports/overview?${params}`, { signal: controller.signal })
      .then(setReport)
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o relatório.')
      })
    return () => controller.abort()
  }, [from, to])

  const statusLabels: Record<string, string> = {
    open: 'Abertos',
    in_progress: 'Em andamento',
    completed: 'Concluídos',
    cancelled: 'Cancelados',
  }
  const money = (amount: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)

  return (
    <section className="page-content module-content report-content">
      <div className="page-heading">
        <div><p className="eyebrow">INDICADORES</p><h1>Relatórios</h1><p className="subtitle">Resumo da operação e do financeiro no período selecionado.</p></div>
        <button className="button button-secondary no-print" type="button" onClick={() => window.print()}>Imprimir relatório</button>
      </div>
      <div className="report-filters no-print">
        <label>De<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
        <label>Até<input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} /></label>
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {!report && !error && <p className="report-loading">Carregando indicadores...</p>}
      {report && <>
        <p className="report-period">Período: {new Date(`${report.period.from}T12:00:00`).toLocaleDateString('pt-BR')} a {new Date(`${report.period.to}T12:00:00`).toLocaleDateString('pt-BR')}</p>
        <div className="metrics report-metrics">
          <article className="metric-card"><span className="metric-icon icon-blue">▤</span><div><span className="metric-label">Chamados criados</span><strong>{report.tickets.total}</strong></div></article>
          <article className="metric-card"><span className="metric-icon icon-green">↗</span><div><span className="metric-label">Receitas recebidas</span><strong>{money(report.finance.income)}</strong></div></article>
          <article className="metric-card"><span className="metric-icon icon-amber">↙</span><div><span className="metric-label">Despesas pagas</span><strong>{money(report.finance.expenses)}</strong></div></article>
          <article className="metric-card"><span className="metric-icon icon-violet">◷</span><div><span className="metric-label">Pendências / estoque baixo</span><strong>{report.finance.pending} / {report.inventory.low_stock}</strong></div></article>
        </div>
        <section className="module-panel">
          <div className="module-panel-header"><div><h2>Chamados por status</h2><p>Quantidade de chamados criados no período.</p></div></div>
          <div className="module-table-wrap"><table className="module-table"><thead><tr><th>Status</th><th>Quantidade</th></tr></thead><tbody>
            {Object.entries(statusLabels).map(([status, label]) => <tr key={status}><td>{label}</td><td>{report.tickets.by_status[status] || 0}</td></tr>)}
          </tbody></table></div>
        </section>
      </>}
      <footer className="page-footer">Assistência Técnica <span>·</span> Relatórios</footer>
    </section>
  )
}

export default ReportsDashboard
