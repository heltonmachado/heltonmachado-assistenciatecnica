import { useState, type FormEvent } from 'react'
import './LoginPage.css'

const EMAIL_PATTERN = /^(?=.{1,254}$)(?=.{1,64}@)[A-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i
const PASSWORD_PATTERN = /^(?=.{8,128}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S+$/

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>
  initialError?: string
}

function BrandMark({ large = false }: { large?: boolean }) {
  return (
    <span className={`login-brand-mark${large ? ' login-brand-mark-large' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M13.2 2.8 5.5 13h5.3l-.5 8.2L18.5 11h-5.3l.0-8.2Z" fill="currentColor" />
      </svg>
    </span>
  )
}

function LoginPage({ onLogin, initialError = '' }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(initialError)

  const emailError = submitted && !EMAIL_PATTERN.test(email.trim())
    ? 'Digite um e-mail válido, como nome@empresa.com.'
    : ''
  const passwordError = submitted && !PASSWORD_PATTERN.test(password)
    ? 'Use 8 a 128 caracteres, incluindo maiúscula, minúscula, número e símbolo.'
    : ''

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    setError('')

    if (!EMAIL_PATTERN.test(email.trim()) || !PASSWORD_PATTERN.test(password)) return

    setLoading(true)
    try {
      await onLogin(email.trim(), password)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-showcase" aria-label="Assistência Técnica">
        <div className="showcase-orb showcase-orb-one" />
        <div className="showcase-orb showcase-orb-two" />
        <a className="login-brand" href="/" aria-label="Assistência Técnica">
          <BrandMark large />
          <span><strong>Assistência</strong><small>gestão técnica</small></span>
        </a>
        <div className="showcase-content">
          <span className="showcase-kicker"><span /> GESTÃO INTELIGENTE</span>
          <h1>Seu trabalho,<br />em boas mãos.</h1>
          <p>Organize atendimentos, acompanhe serviços e mantenha sua operação sempre em movimento.</p>
          <div className="showcase-card">
            <div className="showcase-card-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3.75h7.2L19 8.6v11.65H7a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 4v5h5M9 13h6M9 16.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg></div>
            <div><strong>Operação organizada</strong><span>Do primeiro contato à entrega do serviço.</span></div>
            <span className="showcase-check" aria-label="Ativo">✓</span>
          </div>
        </div>
        <div className="showcase-footer"><span>© 2026 Assistência Técnica</span><span>Simples. Seguro. Eficiente.</span></div>
      </section>

      <section className="login-panel">
        <div className="login-form-wrap">
          <div className="mobile-login-brand"><BrandMark /><span><strong>Assistência</strong><small>gestão técnica</small></span></div>
          <div className="login-heading">
            <span className="login-eyebrow">BEM-VINDO DE VOLTA</span>
            <h2>Acesse sua conta</h2>
            <p>Entre com suas credenciais para continuar.</p>
          </div>

          <form className="login-form" onSubmit={(event) => void submit(event)} noValidate>
            <label htmlFor="login-email">E-mail profissional</label>
            <div className={`login-input-wrap${emailError ? ' has-error' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6"/><path d="m5 7 7 5.5L19 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <input
                autoComplete="username"
                autoCapitalize="none"
                id="login-email"
                inputMode="email"
                maxLength={254}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@empresa.com"
                type="email"
                value={email}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'login-email-error' : undefined}
              />
            </div>
            {emailError && <span className="login-field-error" id="login-email-error">{emailError}</span>}

            <div className="login-password-label">
              <label htmlFor="login-password">Senha</label>
              <span>Protegida e criptografada</span>
            </div>
            <div className={`login-input-wrap${passwordError ? ' has-error' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4.5" y="10" width="15" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.6"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14.5v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              <input
                autoComplete="current-password"
                id="login-password"
                maxLength={128}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha"
                type={showPassword ? 'text' : 'password'}
                value={password}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? 'login-password-error' : undefined}
              />
              <button
                className="password-visibility"
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {passwordError && <span className="login-field-error" id="login-password-error">{passwordError}</span>}
            <p className="password-hint">Mínimo de 8 caracteres, com maiúscula, minúscula, número e símbolo.</p>

            {error && <div className="login-alert" role="alert">{error}</div>}

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? <><span className="login-spinner" /> Verificando acesso...</> : <>Entrar na plataforma <span aria-hidden="true">→</span></>}
            </button>
          </form>

          <div className="login-security"><span className="security-shield">✓</span><span>Conexão segura <i /> Seus dados estão protegidos</span></div>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
