import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabase = createClient(
  'https://icwimagyyrqvyxbfybdf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljd2ltYWd5eXJxdnl4YmZ5YmRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjE0NDYwMiwiZXhwIjoyMDU3NzIwNjAyfQ.EG1kYJvX1vI3OmctUJU-EeNrgdTp9Hwsv9of6QsXL0c'
);

// Função para atualizar o metadata do usuário
async function updateUser() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    '37e98de1-a8b4-40ac-a20b-14f456175122', // ID do seu usuário
    {
      user_metadata: { role: 'master' } // Adicionando role: master
    }
  );

  if (error) {
    console.error('Erro ao atualizar metadata:', error);
  } else {
    console.log('Usuário atualizado com sucesso:', data);
  }
}

updateUser();