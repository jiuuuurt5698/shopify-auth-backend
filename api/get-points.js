import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email } = req.query

    if (!email) {
      return res.status(400).json({ error: 'Email required' })
    }

    // Récupérer les points du client
    const { data, error } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('customer_email', email)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        // Client pas encore dans le système
        return res.status(200).json({
          points_balance: 0,
          total_points_earned: 0,
          total_points_spent: 0
        })
      }
      throw error
    }

    return res.status(200).json(data || {
      points_balance: 0,
      total_points_earned: 0,
      total_points_spent: 0
    })
  } catch (error) {
    console.error('Error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
