import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import './StudentDashboard.css'
import { keccak256, toUtf8Bytes } from 'ethers'
import { connectMaterialRegistry } from './lib/materialRegistry'

function StudentDashboard({ profile, onSignOut }) {
  const [section, setSection] = useState('materials')
  const [materials, setMaterials] = useState([])
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [verifyingMaterialId, setVerifyingMaterialId] = useState(null)
  const [verificationStatus, setVerificationStatus] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setErrorMessage('')

    const [materialsResult, examsResult] = await Promise.all([
      supabase
        .from('materials')
        .select(
          'id, title, description, file_path, created_at, professor:profiles!materials_professor_id_fkey(full_name)'
        )
        .order('created_at', { ascending: false }),
      supabase
        .from('exams')
        .select('*')
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

  async function downloadMaterial(material) {
    setErrorMessage('')

    const { data, error } = await supabase.storage
      .from('materials')
      .download(material.file_path)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = material.file_path.split('/').pop()
    link.click()
    URL.revokeObjectURL(url)
  }
async function verifyMaterial(material) {
  setVerifyingMaterialId(material.id)
  setVerificationStatus((previous) => ({
    ...previous,
    [material.id]: null,
  }))

  try {
    const { contract } = await connectMaterialRegistry()

    const { data: file, error: fileError } = await supabase.storage
      .from('materials')
      .download(material.file_path)

    if (fileError) {
      throw new Error(fileError.message)
    }

    const materialId = keccak256(toUtf8Bytes(String(material.id)))
    const fileHash = keccak256(
      new Uint8Array(await file.arrayBuffer())
    )

    const record = await contract.getMaterial(materialId)

    if (!record[4]) {
      setVerificationStatus((previous) => ({
        ...previous,
        [material.id]: {
          ok: false,
          message: 'Materiali nuk u gjet në blockchain.',
        },
      }))
    } else if (
      String(record[1]) !== material.title ||
      String(record[2]).toLowerCase() !== fileHash.toLowerCase()
    ) {
      setVerificationStatus((previous) => ({
        ...previous,
        [material.id]: {
          ok: false,
          message: 'Materiali nuk përputhet me regjistrimin në blockchain.',
        },
      }))
    } else {
      setVerificationStatus((previous) => ({
        ...previous,
        [material.id]: {
          ok: true,
          message: 'Materiali u verifikua me sukses në blockchain.',
        },
      }))
    }
  } catch (error) {
    setVerificationStatus((previous) => ({
      ...previous,
      [material.id]: {
        ok: false,
        message: error.message || 'Verifikimi dështoi.',
      },
    }))
  } finally {
    setVerifyingMaterialId(null)
  }
}
  async function handleSignOut() {
    await supabase.auth.signOut()
    onSignOut()
  }

  return (
    <div className="student-layout">
      <aside className="student-sidebar">
        <a className="student-brand" href="/">
          <span className="student-brand-icon">S</span>
          SEMS
        </a>

        <p className="student-sidebar-label">PANELI I STUDENTIT</p>

        <button
          className={section === 'materials' ? 'student-nav active' : 'student-nav'}
          onClick={() => setSection('materials')}
          type="button"
        >
          Materialet mësimore
        </button>

        <button
          className={section === 'exams' ? 'student-nav active' : 'student-nav'}
          onClick={() => setSection('exams')}
          type="button"
        >
          Orari i provimeve
        </button>

        <div className="student-sidebar-footer">
          <span>{profile.full_name}</span>
          <button onClick={handleSignOut} type="button">
            Dil nga llogaria
          </button>
        </div>
      </aside>

      <main className="student-main">
        <p className="student-kicker">SEMS / STUDENT</p>
        <h1>
          {section === 'materials'
            ? 'Materialet mësimore'
            : 'Orari i provimeve'}
        </h1>

        {errorMessage && <p className="student-error">{errorMessage}</p>}
        {loading && <p className="student-muted">Duke ngarkuar të dhënat...</p>}

        {!loading && section === 'materials' && (
          <section className="student-panel">
            {materials.length === 0 ? (
              <p className="student-muted">
                Nuk ka ende materiale të publikuara.
              </p>
            ) : (
              <div className="student-table-wrap">
                <table className="student-table">
                  <thead>
                    <tr>
                      <th>Materiali</th>
                      <th>Profesori</th>
                      <th>Data e publikimit</th>
                      <th>Veprimet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((material) => (
                      <tr key={material.id}>
                        <td>
                          <strong>{material.title}</strong>
                          <span>{material.description}</span>
                        </td>
                        <td>{material.professor?.full_name || 'Profesor'}</td>
                        <td>
                          {new Date(material.created_at).toLocaleDateString('sq-AL')}
                        </td>
                        <td>
                          <button
                            className="student-download"
                            onClick={() => downloadMaterial(material)}
                            type="button"
                          >
                            Shkarko PDF

                            <button
  className="student-download"
  onClick={() => verifyMaterial(material)}
  disabled={verifyingMaterialId === material.id}
  type="button"
>
  {verifyingMaterialId === material.id
    ? 'Duke verifikuar...'
    : 'Verifiko në blockchain'}
</button>

{verificationStatus[material.id] && (
  <span
    className={`student-verify-status ${
      verificationStatus[material.id].ok ? 'success' : 'error'
    }`}
  >
    {verificationStatus[material.id].message}
  </span>
)}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {!loading && section === 'exams' && (
          <section className="student-panel">
            {exams.length === 0 ? (
              <p className="student-muted">
                Nuk ka ende provime të publikuara.
              </p>
            ) : (
              <div className="student-table-wrap">
                <table className="student-table">
                  <thead>
                    <tr>
                      <th>Lënda</th>
                      <th>Data</th>
                      <th>Ora</th>
                      <th>Lokacioni</th>
                      <th>Informata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((exam) => (
                      <tr key={exam.id}>
                        <td><strong>{exam.subject_name}</strong></td>
                        <td>{exam.exam_date}</td>
                        <td>{exam.exam_time}</td>
                        <td>{exam.exam_location}</td>
                        <td>{exam.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default StudentDashboard