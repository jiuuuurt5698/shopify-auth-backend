const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, limit = 10 } = req.query;
  const parsedLimit = Math.min(parseInt(limit) || 10, 100);

  if (!email) {
    return res.status(400).json({ error: 'Email requis' });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('Supabase credentials missing');
      return res.status(500).json({ error: 'Configuration serveur manquante' });
    }

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/loyalty_transactions?customer_email=eq.${email}&order=created_at.desc&limit=${parsedLimit}`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        }
      }
    );

    if (!response.ok) {
      console.error('Supabase error:', response.status);
      return res.status(500).json({ error: 'Erreur lors de la récupération des transactions' });
    }

    const transactions = await response.json();

    return res.status(200).json(transactions);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
