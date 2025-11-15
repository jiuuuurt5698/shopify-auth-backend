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

  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email requis' });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(200).json({ redeemed: [] });
    }

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/gift_cards_redeemed?customer_email=eq.${email}&select=palier_name`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        }
      }
    );

    if (!response.ok) {
      return res.status(200).json({ redeemed: [] });
    }

    const data = await response.json();
    const redeemedNames = data.map(item => item.palier_name);

    return res.status(200).json({ redeemed: redeemedNames });

  } catch (error) {
    console.error('Error:', error);
    return res.status(200).json({ redeemed: [] });
  }
};
