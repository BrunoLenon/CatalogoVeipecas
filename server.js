// server.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 3001; // Porta diferente do Vite (5175)

// Configuração do Supabase com variáveis de ambiente
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware para parsear JSON
app.use(express.json());

// Rota para criar usuário
app.post('/api/create-user', async (req, res) => {
  const { name, email, password, role, cnpj_cpf, seller_id } = req.body;

  try {
    // Criar o usuário usando a API administrativa do Supabase
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirma o email automaticamente
      user_metadata: { name, role, cnpj_cpf, seller_id },
    });

    if (error) throw error;

    // Inserir dados adicionais na tabela 'users'
    const { error: insertError } = await supabase.from('users').insert([
      {
        id: data.user.id,
        name,
        email,
        role,
        cnpj_cpf,
        seller_id: seller_id || null,
        status: true,
      },
    ]);

    if (insertError) throw insertError;

    res.status(200).json({ message: 'Usuário criado com sucesso', user: data.user });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar usuário' });
  }
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});