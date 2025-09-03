  import express from "express";
  import cors from "cors";
  import bodyParser from "body-parser";
  import fs from "fs";
  import path from "path";
  import dotenv from "dotenv";
  import { fileURLToPath } from "url";
  // Optional: OpenAI (placeholder). Comment out if not using yet.
  import OpenAI from "openai";

  dotenv.config();
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(bodyParser.json());

  // Load menu data (keep it in /data folder)
  const DATA_PATH = path.join(__dirname, "data", "menu_completo.json");
  let MENU = {};
  function loadMenu() {
    try {
      const raw = fs.readFileSync(DATA_PATH, "utf-8");
      MENU = JSON.parse(raw);
      console.log("[OK] menu_completo.json cargado");
    } catch (e) {
      console.error("[ERROR] No pude cargar menu_completo.json:", e.message);
      MENU = {};
    }
  }
  loadMenu();

  // Optional: initialize OpenAI (if you want true LLM answers)
  const openaiKey = process.env.OPENAI_API_KEY || "";
  const useLLM = !!openaiKey;
  const client = useLLM ? new OpenAI({ apiKey: openaiKey }) : null;

  // Helper: simple rule-based responder if you don't enable LLM yet
  function simpleResponder(userText) {
    const t = (userText || "").toLowerCase();

    if (t.includes("menú") || t.includes("menu")) {
      const pizzas = (MENU.pizzas || []).slice(0, 6).map(p => {
        const p30 = p.precio_30cm ? `$${p.precio_30cm}` : "";
        const pf  = p.precio_familiar ? `$${p.precio_familiar}` : "";
        let tail = "";
        if (p30 && pf) tail = ` (30cm ${p30} / familiar ${pf})`;
        else if (p30) tail = ` (30cm ${p30})`;
        else if (pf) tail = ` (familiar ${pf})`;
        return `• ${p.nombre}${tail}`;
      }).join("\n");
      return `🍕 Menú rápido (muestra):\n${pizzas}\n\nEscribe el nombre de la pizza que te interesa o di "promos".`;
    }

    if (t.includes("promo") || t.includes("promoción") || t.includes("promocion")) {
      const promos = (MENU.promos || []).map(p => `• ${p.nombre} - $${p.precio}`).join("\n");
      return promos ? `🎉 Promos vigentes:\n${promos}` : "Por ahora no tenemos promociones activas.";
    }

    if (t.includes("bebida") || t.includes("refresco") || t.includes("agua")) {
      const bebidas = (MENU.bebidas || []).slice(0, 5).map(b => `• ${b.nombre} - $${b.precio}`).join("\n");
      return bebidas ? `🥤 Bebidas:\n${bebidas}` : "No encuentro bebidas en el menú.";
    }

    // try to match by pizza name
    const found = (MENU.pizzas || []).find(p => t.includes(p.nombre.split(" ")[1]?.toLowerCase() || ""));
    if (found) {
      const p30 = found.precio_30cm ? `$${found.precio_30cm}` : "N/D";
      const pf  = found.precio_familiar ? `$${found.precio_familiar}` : "N/D";
      return `🍕 ${found.nombre}\n• 30 cm: ${p30}\n• Familiar: ${pf}\n¿Qué tamaño te gustaría?`;
    }

    // fallback
    return "¡Hola! Soy el agente de La Pinche Rebanada 🍕. Escribe 'menú', 'promos' o el nombre de una pizza para comenzar.";
  }

  async function llmResponder(userText, from) {
    // If you enable LLM, we send MENU as grounded context.
    const system = `Eres el agente de La Pinche Rebanada.
- Responde breve, claro y amable en español.
- Usa SOLO estos datos para precios y opciones.
- Si piden una pizza, pregunta tamaño (30 cm o familiar), bebida, forma de pago y dirección.
- Cuando tengas todo, di done=true y resume el pedido en JSON.
MENU: ${JSON.stringify(MENU)}`;

    const user = `Cliente (${from}) dice: "${userText}"`;
    try {
      const resp = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });
      // Expect a JSON object with { reply, done, order? }
      const content = resp.choices?.[0]?.message?.content || "{}";
      let parsed = {};
      try { parsed = JSON.parse(content); } catch { parsed = { reply: content }; }
      if (!parsed.reply) parsed.reply = "Disculpa, no entendí. ¿Quieres ver el *menú* o nuestras *promos*?";
      if (typeof parsed.done !== "boolean") parsed.done = false;
      return parsed;
    } catch (e) {
      console.error("LLM error:", e.message);
      return { reply: simpleResponder(userText), done: false };
    }
  }

  // Healthcheck
  app.get("/health", (req, res) => res.json({ ok: true }));

  // Debug: ver menú
  app.get("/menu", (req, res) => res.json(MENU));

  // Main webhook for Twilio Studio: POST /bot
  app.post("/bot", async (req, res) => {
    const { from, body, channel } = req.body || {};
    console.log("[IN]", from, channel, body);

    // Decide whether to use LLM || the simple responder
    let result;
    if (useLLM) {
      result = await llmResponder(body || "", from || "anon");
    } else {
      result = { reply: simpleResponder(body || ""), done: false };
    }

    // Response format expected by Studio
    return res.json({
      reply: result.reply,
      done: !!result.done,
      order: result.order || null
    });
  });

  // Hot-reload menu (optional admin route)
  app.post("/admin/reload-menu", (req, res) => {
    loadMenu();
    res.json({ ok: true, message: "Menú recargado" });
  });

  app.listen(PORT, () => {
    console.log(`🍕 Endpoint escuchando en http://localhost:${PORT}`);
  });
