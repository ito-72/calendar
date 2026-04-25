import { GAS_URL } from "./config.js";

export default async function handler(req, res) {
  const payload = req.method === "POST" ? req.body : req.query;
  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    try { res.status(200).json(JSON.parse(text)); } catch { res.status(200).send(text); }
  } catch (err) { res.status(500).json({ error: err.message }); }
}