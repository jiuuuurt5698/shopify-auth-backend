const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

// Ratio: 1€ = 0.5 points
const POINTS_PER_EURO = 0.5;

// Définition des paliers
const TIERS = [
  { name: 'Bronze', threshold: 0 },
  { name: 'Argent', threshold: 25 },
  { name: 'Or', threshold: 100 },
  { name: 'Diamant', threshold: 300 },
  { name: 'Maître', threshold: 750 }
];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function getCurrentTier(totalPoints) {
  return TIERS.filter(t => totalPoints >= t.threshold).pop() || TIERS[0];
}

module.exports = async (req, res) => {
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
    const order = req.body;

    console.log('📦 Nouvelle commande reçue:', {
      id: order.id,
      email: order.email,
      total: order.total_price
    });

    if (!order.email) {
      console.log('⚠️ Pas d\'email client');
      return res.status(200).json({ message: 'No customer email' });
    }

    const orderAmount = parseFloat(order.total_price);
    const pointsToAdd = Math.floor(orderAmount * POINTS_PER_EURO * 100) / 100;

    console.log(`💰 Montant: ${orderAmount}€ → ${pointsToAdd} points`);

    const { data: existingCustomer, error: fetchError } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('customer_email', order.email)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    const oldTotalPoints = existingCustomer ? existingCustomer.total_points_earned : 0;
    const newTotalPoints = oldTotalPoints + pointsToAdd;

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
        .eq('customer_email', order.email);

      if (updateError) throw updateError;

      console.log('✅ Points mis à jour pour client existant');
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
        });

      if (insertError) throw insertError;

      console.log('✅ Nouveau client créé avec points initiaux');
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
      });

    if (transactionError) throw transactionError;

    console.log('✅ Transaction enregistrée');

    const response = {
      success: true,
      message: `${pointsToAdd} points ajoutés à ${order.email}`,
      points_added: pointsToAdd,
      order_amount: orderAmount,
      new_total_points: newTotalPoints
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Erreur webhook:', error);
    return res.status(500).json({
      error: 'Erreur lors du traitement',
      details: error.message
    });
  }
};
