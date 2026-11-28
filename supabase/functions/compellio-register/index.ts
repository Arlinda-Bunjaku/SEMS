import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authorization = request.headers.get('Authorization')

    if (!authorization) {
      throw new Error('Duhet të hysh në llogarinë SEMS.')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authorization },
        },
      },
    )

    const { data: userData, error: userError } =
      await supabase.auth.getUser()

    if (userError || !userData.user) {
      throw new Error('Sesioni i përdoruesit nuk është i vlefshëm.')
    }

    const { materialId } = await request.json()

    if (!materialId) {
      throw new Error('Mungon ID-ja e materialit.')
    }

    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('id, professor_id, title, file_path')
      .eq('id', materialId)
      .single()

    if (materialError || !material) {
      throw new Error('Materiali nuk u gjet.')
    }

    if (material.professor_id !== userData.user.id) {
      throw new Error('Mund të regjistrosh vetëm materialet e tua.')
    }

    const { data: file, error: fileError } = await supabase.storage
      .from('materials')
      .download(material.file_path)

    if (fileError || !file) {
      throw new Error(
        'PDF-ja nuk mund të lexohet nga Supabase Storage.',
      )
    }

    const digest = await crypto.subtle.digest(
      'SHA-256',
      await file.arrayBuffer(),
    )

    const sha256 = Array.from(
      new Uint8Array(digest),
      (byte) => byte.toString(16).padStart(2, '0'),
    ).join('')

    const apiUrl =
      Deno.env.get('COMPELLIO_API_BASE_URL') ||
      Deno.env.get('COMPELLIO_API_URL')

    const email = Deno.env.get('COMPELLIO_EMAIL')
    const password = Deno.env.get('COMPELLIO_PASSWORD')

    if (!apiUrl || !email || !password) {
      throw new Error(
        'Compellio nuk është konfiguruar ende në Supabase Secrets.',
      )
    }

    const form = new FormData()
    form.set('Email', email)
    form.set('PassWord', password)

    const tokenResponse = await fetch(
      `${apiUrl}/api/v1/Token`,
      {
        method: 'POST',
        body: form,
      },
    )

    if (!tokenResponse.ok) {
      throw new Error(
        `Compellio nuk dha token (HTTP ${tokenResponse.status}).`,
      )
    }

    const token = await tokenResponse.json()

    // Dërgojmë vetëm titullin dhe SHA-256.
    // PDF-ja mbetet në Supabase Storage.
    const registerResponse = await fetch(
      `${apiUrl}/api/v1/TAR`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-key': token.access_token,
        },
        body: JSON.stringify({
          title: material.title,
          sha256,
        }),
      },
    )

    const responseText = await registerResponse.text()

    if (!registerResponse.ok) {
      throw new Error(
        `Regjistrimi me Compellio dështoi (HTTP ${registerResponse.status}): ${responseText.slice(0, 300)}`,
      )
    }

    let record: Record<string, unknown>

    try {
      record = JSON.parse(responseText)
    } catch {
      record = { data: responseText }
    }

    const { error: saveError } = await supabase
      .from('materials')
      .update({
        compellio_status: 'registered',
        compellio_sha256: sha256,
        registry_tar_id: record.id ?? null,
        registry_receipt_id: record.receipt ?? null,
        registry_tar_version: record.version ?? null,
        compellio_response: record,
        compellio_registered_at: new Date().toISOString(),
        compellio_error: null,
      })
      .eq('id', material.id)
      .eq('professor_id', userData.user.id)

    if (saveError) {
      throw new Error(
        `TAR u krijua, por ruajtja e rezultatit në SEMS dështoi: ${saveError.message}`,
      )
    }

    return Response.json(
      { status: 'registered', sha256, record },
      { headers: corsHeaders },
    )
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Ndodhi një gabim.'

    return Response.json(
      { error: message },
      {
        status: 400,
        headers: corsHeaders,
      },
    )
  }
})