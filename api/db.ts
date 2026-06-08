export default async function handler(req: any, res: any) {
  const GAS_URL = process.env.GAS_URL;

  if (!GAS_URL) {
    return res.status(500).json({
      error: "GAS_URL missing"
    });
  }

  try {
    if (req.method === "GET") {
      const response = await fetch(GAS_URL);
      const data = await response.json();

      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const response = await fetch(GAS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      });

      const data = await response.json();

      return res.status(200).json(data);
    }

    return res.status(405).json({
      error: "Method Not Allowed"
    });

  } catch (err: any) {
    return res.status(500).json({
      error: err.message
    });
  }
}
