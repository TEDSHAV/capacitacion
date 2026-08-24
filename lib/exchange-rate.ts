"use server";

const API_URL = "https://v6.exchangerate-api.com/v6";

export async function getUsdToVesRate(): Promise<number | null> {
  const apiKey = process.env.EXCHANGERATE_API_KEY;
  if (!apiKey) {
    console.error("[getUsdToVesRate] EXCHANGERATE_API_KEY is not set");
    return null;
  }

  try {
    const res = await fetch(`${API_URL}/${apiKey}/latest/USD`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error(`[getUsdToVesRate] API returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    const vesRate = data?.conversion_rates?.VES;

    if (typeof vesRate !== "number") {
      console.error("[getUsdToVesRate] VES rate not found in response");
      return null;
    }

    return vesRate;
  } catch (err) {
    console.error("[getUsdToVesRate] Fetch error:", err);
    return null;
  }
}
