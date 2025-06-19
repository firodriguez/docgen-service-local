import db from './db';

export async function createTemplateSession(templateName: string, data: object) {
  // Guarda y retorna el id generado
  return db.one(
    'INSERT INTO template_sessions(template_name, data) VALUES($1, $2) RETURNING id',
    [templateName, data]
  );
}

export async function getTemplateSession(id: string) {
  // Busca por id (sessionId)
  return db.oneOrNone('SELECT * FROM template_sessions WHERE id = $1', [id]);
} 