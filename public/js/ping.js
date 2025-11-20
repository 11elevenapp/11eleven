const API_BASE = "https://one1eleven-backend.onrender.com";

export async function pingServer() {
  try {
    await fetch(`${API_BASE}/ping`);
  } catch (e) {
    console.log("Ping failed");
  }
}
