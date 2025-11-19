const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY

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

  const { email, limit = 10 } = req.query
  const parsedLimit = Math.min(parseInt(limit) || 10, 100)

  if (!email) {
    return res.status(400).json({ error: 'Email requis' })
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('Supabase credentials missing')
      return res.status(500).json({ error: 'Configuration serveur manquante' })
    }

    // Récupérer les transactions de points depuis points_transactions
    const pointsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/points_transactions?customer_email=eq.${email}&order=created_at.desc&limit=${parsedLimit}`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        }
      }
    )

    // Récupérer les transactions de cartes cadeaux depuis loyalty_transactions
    const giftCardsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/loyalty_transactions?customer_email=eq.${email}&order=created_at.desc&limit=${parsedLimit}`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        }
      }
    )

    let pointsTransactions = []
    let giftCardTransactions = []

    if (pointsResponse.ok) {
      pointsTransactions = await pointsResponse.json()
    }

    if (giftCardsResponse.ok) {
      giftCardTransactions = await giftCardsResponse.json()
    }

    // Fusionner et trier par date
    const allTransactions = [...pointsTransactions, ...giftCardTransactions]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, parsedLimit)

    return res.status(200).json(allTransactions)
  } catch (error) {
    console.error('Error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
