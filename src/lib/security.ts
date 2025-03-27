import xss from 'xss';
import zxcvbn from 'zxcvbn';

// Sanitização de inputs
export const sanitizeInput = (input: string): string => {
  return xss(input.trim());
};

// Validação de força de senha
export const validatePassword = (password: string): {
  score: number;
  feedback: {
    warning: string;
    suggestions: string[];
  };
} => {
  const result = zxcvbn(password);
  return {
    score: result.score, // 0-4 (0 = muito fraca, 4 = muito forte)
    feedback: result.feedback,
  };
};

// Validação de imagem
export const validateImage = async (file: File): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Validar dimensões
      if (img.width > 2000 || img.height > 2000) {
        reject(new Error('Imagem muito grande. Máximo: 2000x2000px'));
      }
      // Validar proporção
      const ratio = img.width / img.height;
      if (ratio > 3 || ratio < 0.3) {
        reject(new Error('Proporção inválida. Deve estar entre 1:3 e 3:1'));
      }
      resolve(true);
    };
    img.onerror = () => reject(new Error('Arquivo inválido'));
    img.src = URL.createObjectURL(file);
  });
};

// Rate limiting
const rateLimits = new Map<string, { count: number; timestamp: number }>();

export const checkRateLimit = (
  key: string,
  limit: number = 5,
  windowMs: number = 15 * 60 * 1000
): boolean => {
  const now = Date.now();
  const record = rateLimits.get(key) || { count: 0, timestamp: now };

  // Resetar contador se passou o tempo da janela
  if (now - record.timestamp > windowMs) {
    record.count = 0;
    record.timestamp = now;
  }

  // Verificar limite
  if (record.count >= limit) {
    return false;
  }

  // Incrementar contador
  record.count++;
  rateLimits.set(key, record);

  return true;
};

// Limpeza periódica do rate limiting
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimits.entries()) {
    if (now - record.timestamp > 30 * 60 * 1000) { // 30 minutos
      rateLimits.delete(key);
    }
  }
}, 5 * 60 * 1000); // Limpar a cada 5 minutos