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
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }

    const { data: codes, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('customer_email', email)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const now = new Date();
    const updatedCodes = codes.map(code => {
      if (code.status === 'active' && new Date(code.expires_at) < now) {
        return { ...code, status: 'expired' };
      }
      return code;
    });

    const expiredCodes = updatedCodes.filter(
      (code, index) => code.status === 'expired' && codes[index].status === 'active'
    );

    if (expiredCodes.length > 0) {
      await supabase
        .from('discount_codes')
        .update({ status: 'expired' })
        .in('id', expiredCodes.map(c => c.id));
    }

    return res.status(200).json({
      codes: updatedCodes,
      active_count: updatedCodes.filter(c => c.status === 'active').length,
      total_count: updatedCodes.length
    });

  } catch (error) {
    console.error('❌ Erreur récupération codes:', error);
    return res.status(500).json({
      error: 'Erreur lors de la récupération des codes',
      details: error.message
    });
  }
};
