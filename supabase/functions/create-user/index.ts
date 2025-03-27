import { serve } from 'https://deno.land/std@0.140.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

console.log("🟢 Função create-user inicializada");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    console.log("🔁 Requisição OPTIONS recebida (preflight)");
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.json();
    const { name, email, password, role, cnpj_cpf, seller_id } = body;

    console.log("📥 Dados recebidos:", body);

    if (!name || !email || !password || !role || !cnpj_cpf) {
      return new Response(
        JSON.stringify({ error: { message: 'Todos os campos obrigatórios devem ser preenchidos' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role, cnpj_cpf, seller_id },
    });

    if (authError) {
      console.log("❌ Erro ao criar usuário no Auth:", authError.message);
      return new Response(
        JSON.stringify({ error: { message: authError.message } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: userData, error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        name,
        email,
        role,
        cnpj_cpf,
        seller_id: seller_id || null,
        status: true,
      })
      .select()
      .single();

    if (insertError) {
      console.log("⚠️ Erro ao inserir na tabela users. Realizando rollback...");
      await supabase.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: { message: insertError.message } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("✅ Usuário criado com sucesso!");
    return new Response(
      JSON.stringify({ user: userData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("🔥 Erro interno:", error);
    return new Response(
      JSON.stringify({ error: { message: 'Erro interno ao processar a requisição' } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
