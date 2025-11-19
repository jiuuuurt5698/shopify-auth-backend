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

  const { email } = req.query

  if (!email) {
    return res.status(400).json({ error: "Email required" })
  }

  try {
    console.log("📊 Récupération des stats pour:", email)

    // 1. Récupérer le total dépensé depuis Shopify
    const SHOPIFY_DOMAIN = "f8bnjk-2f.myshopify.com"
    const ADMIN_API_URL = `https://${SHOPIFY_DOMAIN}/admin/api/2024-10/graphql.json`
    
    const shopifyQuery = `
      query getCustomerOrders($email: String!) {
        customers(first: 1, query: $email) {
          edges {
            node {
              orders(first: 250) {
                edges {
                  node {
                    totalPriceSet {
                      shopMoney {
                        amount
                      }
                    }
                    createdAt
                  }
                }
              }
            }
          }
        }
      }
    `

    const shopifyResponse = await fetch(ADMIN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_API_TOKEN,
      },
      body: JSON.stringify({
        query: shopifyQuery,
        variables: {
          email: `email:${email}`,
        },
      }),
    })

    const shopifyData = await shopifyResponse.json()
    const customer = shopifyData.data?.customers?.edges[0]?.node
    const orders = customer?.orders?.edges || []

    console.log("📦 Nombre de commandes trouvées:", orders.length)

    // Calcul total dépensé et nombre de commandes
    const totalSpent = orders.reduce((sum, { node }) => {
      return sum + parseFloat(node.totalPriceSet.shopMoney.amount)
    }, 0)
    const orderCount = orders.length
    const averageBasket = orderCount > 0 ? totalSpent / orderCount : 0

    console.log("💰 Total dépensé:", totalSpent)
    console.log("📊 Panier moyen:", averageBasket)

    // Date de première commande
    const firstOrderDate = orders.length > 0 
      ? new Date(orders[orders.length - 1].node.createdAt)
      : null

    // 2. Récupérer les CODES PROMO utilisés (via points_transactions)
    const { data: pointsRedemptions, error: pointsError } = await supabase
      .from('points_transactions')
      .select('*')
      .eq('customer_email', email)
      .eq('transaction_type', 'redemption')

    if (pointsError) {
      console.error("❌ Erreur points_transactions:", pointsError)
    }

    console.log("🎫 Codes promo utilisés:", pointsRedemptions?.length || 0)

    // Calculer les économies depuis les points échangés
    const savingsFromCodes = pointsRedemptions?.reduce((sum, t) => {
      // Points sont négatifs (ex: -100), on prend la valeur absolue
      // 10 points = 1€
      const euros = Math.abs(t.points) / 10
      console.log(`💸 Code promo: ${Math.abs(t.points)} points = ${euros}€`)
      return sum + euros
    }, 0) || 0

    console.log("💸 Économies codes promo:", savingsFromCodes)

    // 3. Récupérer les CARTES CADEAUX (via loyalty_transactions)
    const { data: giftCardsTransactions, error: giftCardsError } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('customer_email', email)
      .eq('type', 'gift_card_redeemed')

    if (giftCardsError) {
      console.error("❌ Erreur gift cards:", giftCardsError)
    }

    console.log("🎁 Cartes cadeaux récupérées:", giftCardsTransactions?.length || 0)

    // Récupérer les montants réels des cartes cadeaux depuis leur description
    const savingsFromGiftCards = giftCardsTransactions?.reduce((sum, t) => {
      // Extraire le montant depuis la description
      // Format: "Carte cadeau Argent de 10€ récupérée (CODE)"
      const match = t.description?.match(/de (\d+)€/)
      const amount = match ? parseFloat(match[1]) : 0
      console.log(`🎁 Carte cadeau: ${amount}€`)
      return sum + amount
    }, 0) || 0

    console.log("💸 Économies cartes cadeaux:", savingsFromGiftCards)

    const totalSavings = savingsFromCodes + savingsFromGiftCards

    console.log("💰 TOTAL ÉCONOMIES:", totalSavings)

    // 4. Récupérer le total de points gagnés
    const { data: pointsData, error: loyaltyPointsError } = await supabase
      .from('loyalty_points')
      .select('total_points_earned')
      .eq('customer_email', email)
      .single()

    if (loyaltyPointsError) {
      console.error("❌ Erreur loyalty_points:", loyaltyPointsError)
    }

    console.log("⭐ Points gagnés:", pointsData?.total_points_earned || 0)

   const stats = {
  totalSpent: totalSpent.toFixed(2),
  orderCount,
  averageBasket: averageBasket.toFixed(2),
  totalSavings: totalSavings.toFixed(2),
  savingsFromCodes: savingsFromCodes.toFixed(2),        // ⬅️ DOIT ÊTRE LÀ
  savingsFromGiftCards: savingsFromGiftCards.toFixed(2), // ⬅️ DOIT ÊTRE LÀ
  codesPromoCount: pointsRedemptions?.length || 0,
  giftCardsCount: giftCardsTransactions?.length || 0,
  totalPointsEarned: pointsData?.total_points_earned || 0,
  memberSince: firstOrderDate 
    ? firstOrderDate.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric"
    })
    : "Nouveau membre"
}

    console.log("✅ Stats finales:", stats)

    return res.status(200).json(stats)
  } catch (error) {
    console.error("❌ Erreur get-customer-stats:", error)
    return res.status(500).json({ 
      error: "Internal server error",
      details: error.message 
    })
  }
}
