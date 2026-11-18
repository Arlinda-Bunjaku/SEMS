
import { useState } from 'react'
import AuthForm from './AuthForm'
import { useState } from 'react'
import ProfessorDashboard from './ProfessorDashboard'

import './App.css'

function App() {
  const [showAuth, setShowAuth] = useState(false)
  const [professorProfile, setProfessorProfile] = useState(null)

if (professorProfile) {
  return (
    <ProfessorDashboard
      profile={professorProfile}
      onSignOut={() => setProfessorProfile(null)}
    />
  )
}
  return (
    <main className="home-page">
      <header className="site-header">
        <a className="brand" href="/">
          <span className="brand-icon">S</span>
          <span>SEMS</span>
        </a>

        <nav className="main-nav" aria-label="Navigimi kryesor">
          <a href="#about">Rreth sistemit</a>
          <a href="#features">Funksionet</a>
          <button className="button button-outline" type="button" onClick={() => setShowAuth(true)}>
            Hyr 
        
                  </button>
        </nav>
      </header>

      <section className="hero" id="about">
        <div className="hero-copy">
          <p className="eyebrow">SISTEM PËR MENAXHIMIN E STUDIMEVE</p>
          <h1>
            Mësimi dhe
            <br />
            informatat, <span>në një vend.</span>
          </h1>
          <p className="hero-description">
            SEMS i ndihmon studentët dhe profesorët të gjejnë materialet
            mësimore dhe informatat për provime, thjesht dhe shpejt.
          </p>

          <div className="hero-actions">
            <button className="button button-primary" type="button" onClick={() => setShowAuth(true)}>
              Hyr në sistem  
              
            </button>
            <a className="text-link" href="#features">
              Mëso më shumë <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className="hero-note">
            <span className="status-dot" />
            Platformë e thjeshtë për studentë dhe profesorë
          </div>
        </div>

        <div className="hero-card" aria-label="Pamje shembull e panelit">
          <div className="card-top">
            <div>
              <p className="card-label">PANELI AKADEMIK</p>
              <h2>Përmbledhje</h2>
            </div>
            <span className="card-icon">✦</span>
          </div>

          <div className="welcome-box">
            <span className="welcome-icon">📚</span>
            <div>
              <strong>Mirë se erdhe në SEMS</strong>
              <p>Materialet dhe njoftimet e tua, në një vend.</p>
            </div>
          </div>

          <div className="preview-row">
            <span className="preview-icon blue">▤</span>
            <div className="preview-text">
              <strong>Materialet mësimore</strong>
              <span>PDF të organizuara për studim</span>
            </div>
            <span className="preview-arrow">→</span>
          </div>

          <div className="preview-row">
            <span className="preview-icon green">◷</span>
            <div className="preview-text">
              <strong>Orari i provimeve</strong>
              <span>Datat, koha dhe lokacioni</span>
            </div>
            <span className="preview-arrow">→</span>
          </div>

          <div className="card-footer">
            <span className="footer-check">✓</span>
            Informata të qarta, kur të duhen
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="section-heading">
          <p className="eyebrow">ÇFARË OFRON SEMS</p>
          <h2>Gjithçka e rëndësishme për studimet</h2>
        </div>

        <div className="feature-grid">
          <article className="feature-card">
            <span className="feature-icon blue">▤</span>
            <h3>Materialet mësimore</h3>
            <p>Gjej dhe shkarko PDF-të e publikuara nga profesorët.</p>
          </article>

          <article className="feature-card">
            <span className="feature-icon green">◷</span>
            <h3>Orari i provimeve</h3>
            <p>Kontrollo datën, kohën dhe lokacionin e provimeve.</p>
          </article>

          <article className="feature-card">
            <span className="feature-icon purple">✓</span>
            <h3>Verifikimi i dokumenteve</h3>
            <p>Kontrollo nëse materiali përputhet me dokumentin e regjistruar.</p>
          </article>
        </div>
      </section>

      <footer className="site-footer">
        <span>SEMS</span>
        <span>Sistem i thjeshtë për komunitetin akademik</span>
      </footer>
      {showAuth && (
  <AuthForm
    onClose={() => setShowAuth(false)}
    onLogin={(profile) => setProfessorProfile(profile)}
  />
)}
    </main>
  )
}

export default App