const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

  try {
    const { email, limit = 10 } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Récupérer l'historique des transactions
    const { data, error } = await supabase
      .from('points_transactions')
      .select('*')
      .eq('customer_email', email)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    return res.status(200).json(data || []);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
