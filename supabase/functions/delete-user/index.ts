import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

serve(async (req) => {
  try {
    const { user_id } = await req.json()

    if (!user_id) {
      console.error('❌ user_id não informado')
      return new Response(JSON.stringify({ error: 'Parâmetro user_id é obrigatório' }), {
        status: 400,
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error } = await supabase.auth.admin.deleteUser(user_id)

    if (error) {
      console.error('❌ Erro ao excluir usuário do Auth:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    console.log('✅ Usuário excluído com sucesso do Auth:', user_id)
    return new Response(JSON.stringify({ success: true }), { status: 200 })

  } catch (err) {
    console.error('❌ Erro inesperado na função delete-user:', err)
    return new Response(JSON.stringify({ error: 'Erro inesperado na função delete-user' }), {
      status: 500,
    })
  }
})