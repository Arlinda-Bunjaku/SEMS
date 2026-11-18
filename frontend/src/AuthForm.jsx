import { useState } from 'react'
import { supabase } from './lib/supabaseClient'
import './AuthForm.css'

function AuthForm({ onClose, onLogin }) {
  const [mode, setMode] = useState('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setErrorMessage('')
    setLoading(true)

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      })

      setLoading(false)

      if (error) {
        setErrorMessage(error.message)
        return
      }

      if (data.session) {
        setMessage('Llogaria u krijua. Roli yt është student.')
      } else {
        setMessage('Regjistrimi u krye. Kontrollo emailin për konfirmim.')
      }

      return
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setLoading(false)
      setErrorMessage(error.message)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', data.user.id)
      .single()

    setLoading(false)

    if (profileError) {
      setErrorMessage('Hyrja u krye, por profili nuk u lexua. Kontrollo SQL/RLS.')
      return
    }

    setMessage(`Mirë se erdhe, ${profile.full_name}! Roli yt: ${profile.role}.`)

    if (profile.role === 'professor') {
  onLogin(profile)
}
  }

  return (
    <div className="auth-backdrop" onClick={onClose}>
      <section
        className="auth-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="auth-close" type="button" onClick={onClose}>
          Mbyll
        </button>

        <p className="auth-eyebrow">SEMS</p>
        <h2 id="auth-title">
          {mode === 'login' ? 'Hyr në llogari' : 'Krijo llogari'}
        </h2>
        <p className="auth-description">
          {mode === 'login'
            ? 'Shkruaj emailin dhe fjalëkalimin.'
            : 'Llogaritë e reja regjistrohen si studentë.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label>
              Emri i plotë
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Fjalëkalimi
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {errorMessage && <p className="auth-error">{errorMessage}</p>}
          {message && <p className="auth-message">{message}</p>}

          <button className="button button-primary auth-submit" type="submit">
            {loading
              ? 'Duke u përpunuar...'
              : mode === 'login'
                ? 'Hyr'
                : 'Regjistrohu'}
          </button>
        </form>

        <button
          className="auth-switch"
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setMessage('')
            setErrorMessage('')
          }}
        >
          {mode === 'login'
            ? 'Nuk ke llogari? Regjistrohu'
            : 'Ke llogari? Hyr'}
        </button>
      </section>
    </div>
  )
}

export default AuthForm