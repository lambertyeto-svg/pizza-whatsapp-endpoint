# Pizza WhatsApp Endpoint (Twilio Studio)

Servidor mínimo para conectar Twilio Studio (WhatsApp) con un bot de La Pinche Rebanada.

## 🚀 Rápido
1) Sube esta carpeta a Render o Vercel.
2) Sube tu `OPENAI_API_KEY` como variable de entorno (opcional). Si no lo pones, usa el **respondedor simple** sin IA.
3) Verifica `/health` y `/menu`.
4) En Twilio Studio, usa **Make HTTP Request** a `POST https://TU_DOMINIO/bot` con body JSON:
```json
{
  "from": "{{trigger.message.From}}",
  "body": "{{trigger.message.Body}}",
  "channel": "whatsapp"
}
```

El endpoint devuelve:
```json
{ "reply": "texto para el cliente", "done": false, "order": null }
```

## 🗂 Estructura
- `server.js`: servidor Express
- `data/menu_completo.json`: catálogo de pizzas, bebidas, extras, promos y faqs
- `vercel.json`: config para Vercel
- `Procfile`: config para Render

## 🛠 Desplegar en Vercel
- Instala Vercel CLI: `npm i -g vercel`
- `vercel` (apunta a este folder)
- Configura variable `OPENAI_API_KEY` en el dashboard (opcional)
- Obtén tu URL y úsala en Twilio Studio

## 🛠 Desplegar en Render
- Crea servicio **Web Service** → Node
- Conecta tu repo (o arrastra ZIP)
- Start command: `node server.js`
- Env Var: `OPENAI_API_KEY` (opcional)
- Puerto: Render expone `PORT` automáticamente

## 🔌 Twilio Studio (Make HTTP Request)
- Method: `POST`
- URL: `https://TU_DOMINIO/bot`
- Headers: `Content-Type: application/json`
- Body:
```
{
  "from": "{{trigger.message.From}}",
  "body": "{{trigger.message.Body}}",
  "channel": "whatsapp"
}
```
- Parse JSON: **ON**
- Conecta salida **Success** → `Send Message` con `{{widgets.llamar_bot.parsed.reply}}`

## 🧪 Probar local
```
npm install
npm run dev
```
En otra terminal:
```
curl -X POST http://localhost:3000/bot \
  -H "Content-Type: application/json" \
  -d '{ "from":"+5215555555555", "body":"menú", "channel":"whatsapp" }'
```

## 🔁 Actualizar menú sin redeploy
`POST /admin/reload-menu` recarga `data/menu_completo.json`.

