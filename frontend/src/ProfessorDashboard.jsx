import { keccak256, toUtf8Bytes } from 'ethers'

import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import './ProfessorDashboard.css'
import { connectMaterialRegistry } from './lib/materialRegistry'
import { registerMaterialWithCompellio } from './lib/compellio'

function ProfessorDashboard({ profile, onSignOut }) {
  const [section, setSection] = useState('materials')
  const [user, setUser] = useState(null)
  const [materials, setMaterials] = useState([])
  const [exams, setExams] = useState([])
  const [editingExam, setEditingExam] = useState(null)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [walletAddress, setWalletAddress] = useState('')
  const [registryContract, setRegistryContract] = useState(null)
  const [compellioLoadingId, setCompellioLoadingId] = useState(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    setErrorMessage('')

    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      setErrorMessage('Nuk u gjet përdoruesi i kyçur. Hyr përsëri.')
      setLoading(false)
      return
    }

    setUser(data.user)

    const [materialsResult, examsResult] = await Promise.all([
      supabase
        .from('materials')
        .select('*')
        .eq('professor_id', data.user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('exams')
        .select('*')
        .eq('professor_id', data.user.id)
        .order('exam_date', { ascending: true }),
    ])

    if (materialsResult.error) {
      setErrorMessage(materialsResult.error.message)
    } else {
      setMaterials(materialsResult.data)
    }

    if (examsResult.error) {
      setErrorMessage(examsResult.error.message)
    } else {
      setExams(examsResult.data)
    }

    setLoading(false)
  }

  async function handleMaterialSubmit(event) {
    event.preventDefault()
    setMessage('')
    setErrorMessage('')

    if (!user) {
      setErrorMessage('Nuk u gjet përdoruesi i kyçur.')
      return
    }
    if (!registryContract) {
  setErrorMessage('Lidh MetaMask para se të publikosh materialin.')
  return
}

    const form = event.currentTarget
    const formData = new FormData(form)
    const file = formData.get('file')

    if (!file || file.size === 0) {
      setErrorMessage('Zgjidh një PDF për ngarkim.')
      return
    }

    if (file.type !== 'application/pdf') {
      setErrorMessage('Lejohet vetëm skedari PDF.')
      return
    }

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${user.id}/${Date.now()}-${safeFileName}`

    const { error: uploadError } = await supabase.storage
      .from('materials')
      .upload(filePath, file, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      setErrorMessage(uploadError.message)
      return
    }

   const title = String(formData.get('title')).trim()
const description = String(formData.get('description') || '').trim()

const { data: savedMaterial, error: insertError } = await supabase
  .from('materials')
  .insert({
    professor_id: user.id,
    title,
    description,
    file_path: filePath,
  })
  .select('id')
  .single()

if (insertError) {
  await supabase.storage.from('materials').remove([filePath])
  setErrorMessage(insertError.message)
  return
}

const materialId = keccak256(toUtf8Bytes(String(savedMaterial.id)))
const contentHash = keccak256(new Uint8Array(await file.arrayBuffer()))
let transactionHash = ''
let blockchainErrorText = ''

try {
  const transaction = await registryContract.registerMaterial(
    materialId,
    title,
    contentHash
  )

  await transaction.wait()
  transactionHash = transaction.hash
} catch (blockchainError) {
  blockchainErrorText = blockchainError.shortMessage || blockchainError.message
}

form.reset()
await loadDashboard()

if (blockchainErrorText) {
  setErrorMessage(
    `Materiali u ruajt në Supabase, por regjistrimi në blockchain dështoi: ${blockchainErrorText}`
  )
} else {
  setMessage(
    `Materiali u ngarkua dhe u regjistrua në blockchain. Transaksioni: ${transactionHash.slice(0, 10)}...`
  )
}
  }

  async function downloadMaterial(material) {
  setMessage('')
  setErrorMessage('')

  const { data, error } = await supabase.storage
    .from('materials')
    .download(material.file_path)

  if (error) {
    setErrorMessage(error.message)
    return
  }

  const fileUrl = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = fileUrl
  link.download = material.file_path.split('/').pop()
  link.click()
  URL.revokeObjectURL(fileUrl)
}

async function registerWithCompellio(material) {
  setMessage('')
  setErrorMessage('')
  setCompellioLoadingId(material.id)

  try {
    const result = await registerMaterialWithCompellio(material)

    setMessage(
      `Materiali u regjistrua në Compellio. Hash SHA-256: ${result.sha256}`,
    )

    await loadDashboard()
  } catch (error) {
    setErrorMessage(
      error.message || 'Regjistrimi me Compellio dështoi.',
    )
  } finally {
    setCompellioLoadingId(null)
  }
}

  async function deleteMaterial(material) {
    setMessage('')
    setErrorMessage('')

    const { error: fileError } = await supabase.storage
      .from('materials')
      .remove([material.file_path])

    if (fileError) {
      setErrorMessage(fileError.message)
      return
    }

    const { error: rowError } = await supabase
      .from('materials')
      .delete()
      .eq('id', material.id)

    if (rowError) {
      setErrorMessage(rowError.message)
      return
    }

    setMessage('Materiali u fshi.')
    await loadDashboard()
  }

  async function handleExamSubmit(event) {
    event.preventDefault()
    setMessage('')
    setErrorMessage('')

    if (!user) {
      setErrorMessage('Nuk u gjet përdoruesi i kyçur.')
      return
    }

    const form = event.currentTarget
    const formData = new FormData(form)
    const examValues = {
      subject_name: String(formData.get('subject_name')).trim(),
      exam_date: formData.get('exam_date'),
      exam_time: formData.get('exam_time'),
      exam_location: String(formData.get('exam_location')).trim(),
      description: String(formData.get('description') || '').trim(),
    }
    const wasEditing = Boolean(editingExam)

    let result
    if (wasEditing) {
      result = await supabase
        .from('exams')
        .update(examValues)
        .eq('id', editingExam.id)
        .eq('professor_id', user.id)
        .select('id')
        .maybeSingle()
    } else {
      result = await supabase
        .from('exams')
        .insert({ professor_id: user.id, ...examValues })
    }

    if (result.error) {
      setErrorMessage(result.error.message)
      return
    }

    if (wasEditing && !result.data) {
      setErrorMessage('Provimi nuk u ndryshua. Kontrollo lejet RLS në Supabase.')
      return
    }

    form.reset()
    setEditingExam(null)

    if (wasEditing) {
      setExams((currentExams) =>
        currentExams.map((exam) =>
          exam.id === editingExam.id ? { ...exam, ...examValues } : exam
        )
      )
      setMessage('Provimi u ndryshua me sukses.')
    } else {
      setMessage('Njoftimi i provimit u publikua.')
      await loadDashboard()
    }
  }

  function handleEditExam(exam) {
    setMessage('')
    setErrorMessage('')
    setEditingExam(exam)
    document.querySelector('.exam-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function handleDeleteExam(exam) {
    setMessage('')
    setErrorMessage('')

    if (!user) {
      setErrorMessage('Nuk u gjet përdoruesi i kyçur.')
      return
    }

    const confirmed = window.confirm(`A dëshiron ta fshish provimin "${exam.subject_name}"?`)
    if (!confirmed) return

    const { data, error } = await supabase
      .from('exams')
      .delete()
      .eq('id', exam.id)
      .eq('professor_id', user.id)
      .select('id')
      .maybeSingle()

    if (error) {
      setErrorMessage(error.message)
      return
    }

    if (!data) {
      setErrorMessage('Provimi nuk u fshi. Kontrollo lejet RLS në Supabase.')
      return
    }

    setExams((currentExams) => currentExams.filter((item) => item.id !== exam.id))
    if (editingExam?.id === exam.id) setEditingExam(null)
    setMessage('Provimi u fshi me sukses.')
  }
  async function handleConnectWallet() {
  setMessage('')
  setErrorMessage('')

  try {
    const { contract, address } = await connectMaterialRegistry()
setRegistryContract(contract)
setWalletAddress(address)
    setMessage('MetaMask u lidh me Polygon Amoy Testnet.')
  } catch (error) {
    setErrorMessage(error.message || 'Lidhja me MetaMask dështoi.')
  }
}
  async function handleSignOut() {
    await supabase.auth.signOut()
    onSignOut()
  }

  return (
    <div className="professor-layout">
      <aside className="professor-sidebar">
        <a className="professor-brand" href="/">
          <span className="professor-brand-icon">S</span>
          SEMS
        </a>

        <p className="professor-sidebar-label">PANELI I PROFESORIT</p>

        <button
          className={section === 'materials' ? 'sidebar-link active' : 'sidebar-link'}
          onClick={() => setSection('materials')}
          type="button"
        >
          Materialet
        </button>

        <button
          className={section === 'exams' ? 'sidebar-link active' : 'sidebar-link'}
          onClick={() => setSection('exams')}
          type="button"
        >
          Provimet
        </button>

        <div className="professor-sidebar-footer">
          <span>{profile.full_name}</span>
          <button className="signout-button" onClick={handleSignOut} type="button">
            Dil nga llogaria
          </button>
        </div>
      </aside>

      <main className="professor-main">
        <header className="professor-header">
          <div>
            <p className="professor-kicker">SEMS / PROFESOR</p>
            <h1>{section === 'materials' ? 'Materialet mësimore' : 'Njoftimet e provimeve'}</h1>
          </div>
          <span className="role-badge">Profesor</span>
          <button
  className="dashboard-primary-button"
  onClick={handleConnectWallet}
  type="button"
>
  {walletAddress
    ? `Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : 'Lidh MetaMask'}
</button>
        </header>

        {message && <p className="dashboard-message">{message}</p>}
        {errorMessage && <p className="dashboard-error">{errorMessage}</p>}
        {loading && <p className="dashboard-hint">Duke ngarkuar të dhënat...</p>}

        {!loading && section === 'materials' && (
          <>
            <section className="dashboard-panel">
              <h2>Ngarko material</h2>
              <p className="dashboard-hint">Zgjidh PDF-në dhe plotëso të dhënat.</p>

              <form className="dashboard-form" onSubmit={handleMaterialSubmit}>
                <label>
                  Titulli
                  <input name="title" required />
                </label>

                <label>
                  Përshkrimi
                  <textarea name="description" rows="3" />
                </label>

                <label>
                  Skedari PDF
                  <input name="file" type="file" accept="application/pdf,.pdf" required />
                </label>

                <button className="dashboard-primary-button" type="submit">
                  Ngarko PDF
                </button>
              </form>
            </section>

           <section className="dashboard-panel">
  <h2>Materialet e publikuara</h2>

  {materials.length === 0 ? (
    <p className="dashboard-hint">
      Nuk ke publikuar ende materiale.
    </p>
  ) : (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Titulli</th>
            <th>Data</th>
            <th>Compellio</th>
            <th>Veprimet</th>
          </tr>
        </thead>

        <tbody>
          {materials.map((material) => (
            <tr key={material.id}>
              <td>
                <strong>{material.title}</strong>
                <span className="table-description">
                  {material.description}
                </span>
              </td>

              <td>
                {new Date(material.created_at).toLocaleDateString('sq-AL')}
              </td>

              <td>
                {material.compellio_status === 'registered'
                  ? `Regjistruar (${
                      material.registry_tar_id ||
                      material.registry_receipt_id ||
                      'ID e ruajtur'
                    })`
                  : 'Në pritje'}

                {material.compellio_sha256 && (
                  <span className="table-description">
                    SHA-256: {material.compellio_sha256}
                  </span>
                )}

                {material.compellio_status !== 'registered' && (
                  <button
                    className="table-button"
                    type="button"
                    disabled={compellioLoadingId === material.id}
                    onClick={() => registerWithCompellio(material)}
                  >
                    {compellioLoadingId === material.id
                      ? 'Duke regjistruar…'
                      : 'Regjistro me Compellio'}
                  </button>
                )}
              </td>

              <td className="table-actions">
                <button
                  className="table-button"
                  onClick={() => downloadMaterial(material)}
                  type="button"
                >
                  Shkarko
                </button>

                <button
                  className="table-button danger"
                  onClick={() => deleteMaterial(material)}
                  type="button"
                >
                  Fshi
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</section>
          </>
        )}

        {!loading && section === 'exams' && (
          <>
            <section className="dashboard-panel">
              <h2>Shto njoftim provimi</h2>

              <form
                key={editingExam?.id ?? 'new'}
                className="dashboard-form exam-form"
                onSubmit={handleExamSubmit}
              >
                <label>
                  Lënda
                  <input
                    name="subject_name"
                    defaultValue={editingExam?.subject_name ?? ''}
                    required
                  />
                </label>

                <label>
                  Data
                  <input
                    name="exam_date"
                    type="date"
                    defaultValue={editingExam?.exam_date ?? ''}
                    required
                  />
                </label>

                <label>
                  Ora
                  <input
                    name="exam_time"
                    type="time"
                    defaultValue={editingExam?.exam_time?.slice(0, 5) ?? ''}
                    required
                  />
                </label>

                <label>
                  Lokacioni
                  <input
                    name="exam_location"
                    defaultValue={editingExam?.exam_location ?? ''}
                    required
                  />
                </label>

                <label className="full-width">
                  Përshkrimi
                  <textarea
                    name="description"
                    rows="3"
                    defaultValue={editingExam?.description ?? ''}
                  />
                </label>

                <div className="exam-form-actions">
                  <button className="dashboard-primary-button" type="submit">
                    {editingExam ? 'Ruaj ndryshimet' : 'Publiko njoftimin'}
                  </button>
                  {editingExam && (
                    <button
                      className="dashboard-secondary-button"
                      onClick={() => {
                        setEditingExam(null)
                        setMessage('')
                        setErrorMessage('')
                      }}
                      type="button"
                    >
                      Anulo
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="dashboard-panel">
              <h2>Njoftimet e publikuara</h2>

              {exams.length === 0 ? (
                <p className="dashboard-hint">Nuk ke publikuar ende njoftime.</p>
              ) : (
                <div className="dashboard-table-wrap">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>Lënda</th>
                        <th>Data dhe ora</th>
                        <th>Lokacioni</th>
                        <th>Përshkrimi</th>
                        <th>Veprimet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exams.map((exam) => (
                        <tr key={exam.id}>
                          <td>{exam.subject_name}</td>
                          <td>{exam.exam_date} · {exam.exam_time}</td>
                          <td>{exam.exam_location}</td>
                          <td>{exam.description}</td>
                          <td className="table-actions">
                            <button
                              className="table-button"
                              onClick={() => handleEditExam(exam)}
                              type="button"
                            >
                              Ndrysho
                            </button>
                            <button
                              className="table-button danger"
                              onClick={() => handleDeleteExam(exam)}
                              type="button"
                            >
                              Fshi
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default ProfessorDashboard