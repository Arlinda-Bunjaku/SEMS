import { supabase } from './supabaseClient'

export async function registerMaterialWithCompellio(material) {
  const { data, error } = await supabase.functions.invoke('compellio-register', {
    body: { materialId: material.id },
  })

  if (error) {
    let details
    try {
      details = await error.context?.json()
    } catch {
      // Nëse përgjigjja nuk është JSON, përdorim mesazhin e Supabase.
    }

    throw new Error(
      details?.error ||
        error.message ||
        'Regjistrimi me Compellio dështoi.'
    )
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data
}