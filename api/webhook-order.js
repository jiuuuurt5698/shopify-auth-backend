const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

// Ratio de conversion : 1€ = 10 points (modifiable)
const POINTS_PER_EURO = 10;

// Initialiser Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Shopify-Hmac-Sha256, X-Shopify-Topic');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Récupérer les données de la commande
    const order = req.body;

    console.log('📦 Nouvelle commande reçue:', {
      id: order.id,
      email: order.email,
      total: order.total_price
    });

    // Vérifier que l'email existe
    if (!order.email) {
      console.log('⚠️ Pas d\'email client');
      return res.status(200).json({ message: 'No customer email' });
    }

    // Calculer les points : montant total × ratio
    const orderAmount = parseFloat(order.total_price);
    const pointsToAdd = Math.floor(orderAmount * POINTS_PER_EURO);

    console.log(`💰 Montant: ${orderAmount}€ → ${pointsToAdd} points`);

    // 1. Vérifier si le client existe déjà dans loyalty_points
    const { data: existingCustomer, error: fetchError } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('customer_email', order.email)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = pas trouvé, c'est normal si nouveau client
      throw fetchError;
    }

    if (existingCustomer) {
      // Client existe : mettre à jour ses points
      const { error: updateError } = await supabase
        .from('loyalty_points')
        .update({
          points_balance: existingCustomer.points_balance + pointsToAdd,
          total_points_earned: existingCustomer.total_points_earned + pointsToAdd,
          customer_first_name: order.customer?.first_name || existingCustomer.customer_first_name,
          customer_last_name: order.customer?.last_name || existingCustomer.customer_last_name,
          customer_shopify_id: order.customer?.id?.toString() || existingCustomer.customer_shopify_id
        })
        .eq('customer_email', order.email);

      if (updateError) throw updateError;

      console.log('✅ Points mis à jour pour client existant');
    } else {
      // Nouveau client : créer l'entrée
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
        });

      if (insertError) throw insertError;

      console.log('✅ Nouveau client créé avec points initiaux');
    }

    // 2. Enregistrer la transaction dans l'historique
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
      });

    if (transactionError) throw transactionError;

    console.log('✅ Transaction enregistrée');

    return res.status(200).json({
      success: true,
      message: `${pointsToAdd} points ajoutés à ${order.email}`,
      points_added: pointsToAdd,
      order_amount: orderAmount
    });

  } catch (error) {
    console.error('❌ Erreur webhook:', error);
    return res.status(500).json({
      error: 'Erreur lors du traitement',
      details: error.message
    });
  }
};
