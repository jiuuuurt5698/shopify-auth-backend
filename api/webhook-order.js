const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

// Ratio: 1€ = 0.5 points
const POINTS_PER_EURO = 0.5;

// Définition des paliers
const TIERS = [
  { name: 'Bronze', threshold: 0, bonus_euros: 0, bonus_points: 0 },
  { name: 'Argent', threshold: 25, bonus_euros: 5, bonus_points: 10 },
  { name: 'Or', threshold: 100, bonus_euros: 15, bonus_points: 30 },
  { name: 'Diamant', threshold: 300, bonus_euros: 30, bonus_points: 60 },
  { name: 'Maître', threshold: 750, bonus_euros: 75, bonus_points: 150 }
];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function getCurrentTier(totalPoints) {
  return TIERS.filter(t => totalPoints >= t.threshold).pop() || TIERS[0];
}

async function checkAndAwardTierBonus(email, oldTotalPoints, newTotalPoints) {
  const oldTier = getCurrentTier(oldTotalPoints);
  const newTier = getCurrentTier(newTotalPoints);

  if (newTier.name !== oldTier.name && newTier.bonus_points > 0) {
    console.log(`🎉 ${email} a atteint le palier ${newTier.name} !`);

    const { data: existingBonus } = await supabase
      .from('tier_bonuses')
      .select('*')
      .eq('customer_email', email)
      .eq('tier_name', newTier.name)
      .single();

    if (existingBonus) {
      console.log(`ℹ️ Bonus ${newTier.name} déjà attribué`);
      return null;
    }

    const { error: bonusError } = await supabase
      .from('tier_bonuses')
      .insert({
        customer_email: email,
        tier_name: newTier.name,
        bonus_amount: newTier.bonus_euros,
        bonus_points: newTier.bonus_points,
        claimed: true,
        claimed_at: new Date().toISOString()
      });

    if (bonusError) {
      console.error('Erreur enregistrement bonus:', bonusError);
      return null;
    }

    const { data: customer } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('customer_email', email)
      .single();

    if (customer) {
      await supabase
        .from('loyalty_points')
        .update({
          points_balance: customer.points_balance + newTier.bonus_points
        })
        .eq('customer_email', email);

      await supabase
        .from('points_transactions')
        .insert({
          customer_email: email,
          points: newTier.bonus_points,
          transaction_type: 'tier_bonus',
          description: `Bonus palier ${newTier.name} : +${newTier.bonus_euros}€ (${newTier.bonus_points} points)`,
          metadata: {
            tier: newTier.name,
            bonus_euros: newTier.bonus_euros
          }
        });

      console.log(`✅ Bonus ajouté : +${newTier.bonus_points} points`);
      return newTier;
    }
  }

  return null;
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

    const tierBonus = await checkAndAwardTierBonus(order.email, oldTotalPoints, newTotalPoints);

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

    if (tierBonus) {
      response.tier_bonus = {
        tier: tierBonus.name,
        bonus_points: tierBonus.bonus_points,
        bonus_euros: tierBonus.bonus_euros
      };
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Erreur webhook:', error);
    return res.status(500).json({
      error: 'Erreur lors du traitement',
      details: error.message
    });
  }
};
