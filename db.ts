export default async function handler(req, res) {

  const GAS_URL = process.env.GAS_URL;

  // GET DATABASE
  if (req.method === 'GET') {

    try {

      const response =
        await fetch(GAS_URL);

      const data =
        await response.json();

      return res.status(200).json(data);

    } catch (error) {

      return res.status(500).json({
        error: String(error)
      });

    }
  }

  // SAVE DATABASE
  if (req.method === 'POST') {

    try {

      await fetch(GAS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body)
      });

      return res.status(200).json({
        success: true
      });

    } catch (error) {

      return res.status(500).json({
        error: String(error)
      });

    }
  }

  return res.status(405).json({
    error: 'Method Not Allowed'
  });
}