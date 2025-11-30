import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET

// Ratio: 1€ = 0.5 points
const POINTS_PER_EURO = 0.5

// ID de la mission "Passer 5 commandes" - REMPLACE PAR TON UUID
const MISSION_5_COMMANDES_ID = "17af0e71-6e26-4ca1-956d-46f72b67d9cc"

// Définition des paliers (nouveaux seuils)
const TIERS = [
  { name: 'Bronze', threshold: 0 },
  { name: 'Argent', threshold: 50 },
  { name: 'Or', threshold: 200 },
  { name: 'Diamant', threshold: 500 },
  { name: 'Maître', threshold: 1300 }
]

function getCurrentTier(totalPoints) {
  return TIERS.filter(t => totalPoints >= t.threshold).pop() || TIERS[0]
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Shopify-Hmac-Sha256, X-Shopify-Topic, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const order = req.body

    console.log('📦 Nouvelle commande reçue:', {
      id: order.id,
      email: order.email,
      total: order.total_price
    })

    if (!order.email) {
      console.log('⚠️ Pas d\'email client')
      return res.status(200).json({ message: 'No customer email' })
    }

    const orderAmount = parseFloat(order.total_price)
    const pointsToAdd = Math.floor(orderAmount * POINTS_PER_EURO)

    console.log(`💰 Montant: ${orderAmount}€ → ${pointsToAdd} points`)

    const { data: existingCustomer, error: fetchError } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('customer_email', order.email)
      .maybeSingle()

    if (fetchError) {
      console.error('❌ Erreur Supabase points:', fetchError)
      throw fetchError
    }

    const oldTotalPoints = existingCustomer ? existingCustomer.total_points_earned : 0
    const newTotalPoints = oldTotalPoints + pointsToAdd

    if (existingCustomer) {
      const { error: updateError } = await supabase
        .from('loyalty_points')
        .update({
          points_balance: existingCustomer.points_balance + pointsToAdd,
          total_points_earned: newTotalPoints,
          customer_first_name: order.customer?.first_name || existingCustomer.customer_first_name,
          customer_last_name: order.customer?.last_name || existingCustomer.customer_last_name,
          customer_shopify_id: order.customer?.id?.toString() || existingCustomer.customer_shopify_id
        })
        .eq('customer_email', order.email)

      if (updateError) throw updateError

      console.log('✅ Points mis à jour pour client existant')
    } else {
      const { error: insertError } = await supabase
        .from('loyalty_points')
        .insert({
          customer_email: order.email,
          customer_shopify_id: order.customer?.id?.toString(),
          customer_first_name: order.customer?.first_name,
          customer_last_name: order.customer?.last_name,
          points_balance: pointsToAdd,
          total_points_earned: pointsToAdd,
          total_points_spent: 0
        })

      if (insertError) throw insertError

      console.log('✅ Nouveau client créé avec points initiaux')
    }

    const { error: transactionError } = await supabase
      .from('points_transactions')
      .insert({
        customer_email: order.email,
        points: pointsToAdd,
        transaction_type: 'purchase',
        description: `Achat de ${orderAmount.toFixed(2)}€`,
        order_id: order.name || order.id?.toString(),
        order_amount: orderAmount,
        metadata: {
          order_number: order.order_number,
          currency: order.currency,
          items_count: order.line_items?.length || 0
        }
      })

    if (transactionError) throw transactionError

    console.log('✅ Transaction enregistrée')

    // ============================================
    // MISE À JOUR PROGRESSION MISSION "5 COMMANDES"
    // ============================================
    
    if (MISSION_5_COMMANDES_ID !== "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx") {
      // Récupérer le customer_id depuis la table customers
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', order.email)
        .maybeSingle()

      if (customer) {
        // Compter le nombre de commandes (transactions de type 'purchase')
        const { count: orderCount } = await supabase
          .from('points_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('customer_email', order.email)
          .eq('transaction_type', 'purchase')

        const currentProgress = orderCount || 1
        const isCompleted = currentProgress >= 5

        console.log(`📊 Progression mission 5 commandes: ${currentProgress}/5`)

        // Vérifier si la mission existe et n'est pas déjà complétée
        const { data: existingMission } = await supabase
          .from('user_missions')
          .select('status, points_awarded')
          .eq('user_id', customer.id)
          .eq('mission_id', MISSION_5_COMMANDES_ID)
          .maybeSingle()

        // Si déjà complétée avec points attribués, ne rien faire
        if (existingMission?.status === 'completed' && existingMission?.points_awarded > 0) {
          console.log('✅ Mission déjà complétée, skip')
        } else {
          // Mettre à jour ou créer la progression
          const { error: missionError } = await supabase
            .from('user_missions')
            .upsert({
              user_id: customer.id,
              mission_id: MISSION_5_COMMANDES_ID,
              status: isCompleted ? 'completed' : 'in_progress',
              current_progress: Math.min(currentProgress, 5),
              completed_at: isCompleted ? new Date().toISOString() : null,
              points_awarded: isCompleted ? 100 : 0
            }, {
              onConflict: 'user_id,mission_id'
            })

          if (missionError) {
            console.error('❌ Erreur mise à jour mission:', missionError)
          } else {
            console.log(`✅ Mission mise à jour: ${currentProgress}/5`)

            // Si mission complétée pour la première fois, ajouter les points bonus
            if (isCompleted && (!existingMission || existingMission.status !== 'completed')) {
              // Récupérer les points actuels pour mise à jour
              const { data: currentPoints } = await supabase
                .from('loyalty_points')
                .select('points_balance, total_points_earned')
                .eq('customer_email', order.email)
                .single()

              if (currentPoints) {
                const { error: bonusError } = await supabase
                  .from('loyalty_points')
                  .update({
                    points_balance: currentPoints.points_balance + 100,
                    total_points_earned: currentPoints.total_points_earned + 100
                  })
                  .eq('customer_email', order.email)

                if (!bonusError) {
                  // Enregistrer la transaction de la mission
                  await supabase
                    .from('points_transactions')
                    .insert({
                      customer_email: order.email,
                      points: 100,
                      transaction_type: 'mission',
                      description: 'Mission complétée : Passer 5 commandes'
                    })

                  console.log('🎉 +100 points bonus mission 5 commandes!')
                }
              }
            }
          }
        }
      } else {
        console.log('⚠️ Client non trouvé dans customers, mission non mise à jour')
      }
    }

    const response = {
      success: true,
      message: `${pointsToAdd} points ajoutés à ${order.email}`,
      points_added: pointsToAdd,
      order_amount: orderAmount,
      new_total_points: newTotalPoints
    }

    return res.status(200).json(response)

  } catch (error) {
    console.error('❌ Erreur webhook:', error)
    return res.status(500).json({
      error: 'Erreur lors du traitement',
      details: error.message
    })
  }
}
