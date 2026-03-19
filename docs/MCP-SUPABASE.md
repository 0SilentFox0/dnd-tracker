# Підключення Supabase MCP у Cursor

Якщо з’являється помилка **"Resource must be a valid MCP endpoint"**, зазвичай вказано неправильний тип сервера або URL.

## Правильна конфігурація

1. **Cursor → Settings (Cmd+,) → Tools & MCP**
2. Знайди сервер **Supabase** (або додай новий).
3. Переконайся:
   - **Тип:** **Streamable HTTP** або **HTTP** (не "Resource" і не "Resource URL").
   - **URL** — саме цей endpoint (без пробілів, один рядок):
     ```
     https://mcp.supabase.com/mcp?project_ref=agchqmfrtgfzzshadbdq
     ```
   - Якщо є поле "Resource" — воно має бути **порожнім** або не використовуватись; важливий саме **URL** MCP-сервера.

4. Збережи. При першому зверненні до інструментів Cursor відкриє браузер для логіну в Supabase — увійди і дай доступ.

## Перевірка

Після збереження перезапусти Cursor. Далі в чаті можна написати: «Використай Supabase MCP: list_tables» — агент викличе інструмент і покаже таблиці в БД.

## Якщо налаштування через UI не підходить

Можна задати MCP через JSON (глобально для Cursor):

1. Відкрий або створи файл **`~/.cursor/mcp.json`** (у домашній директорії).
2. Додай (або онови блок `supabase`):

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=agchqmfrtgfzzshadbdq"
    }
  }
}
```

3. Збережи файл і повністю перезапусти Cursor.

Після цього endpoint буде валідним, і помилка "Resource must be a valid MCP endpoint" не повинна з’являтись.
