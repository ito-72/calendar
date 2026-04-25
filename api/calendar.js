import { GAS_URL } from "./config.js";

export default async function handler(req, res) {
  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "getRows" }),
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "GASからのデータ取得に失敗しました" });
  }
}