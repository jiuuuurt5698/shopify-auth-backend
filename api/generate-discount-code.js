const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Ratio: 10 points = 1€ de réduction
const POINTS_TO_EURO_RATIO = 10;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, pointsToUse } = req.body;

    if (!email || !pointsToUse) {
      return res.status(400).json({ error: 'Email et points requis' });
    }

    if (pointsToUse < 10) {
      return res.status(400).json({ error: 'Minimum 10 points requis (1€)' });
    }

    // 1. Vérifier le solde du client
    const { data: customerPoints, error: pointsError } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('customer_email', email)
      .single();

    if (pointsError || !customerPoints) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    if (customerPoints.points_balance < pointsToUse) {
      return res.status(400).json({ 
        error: 'Solde insuffisant',
        available: customerPoints.points_balance,
        requested: pointsToUse
      });
    }

    // 2. Vérifier si le client a déjà un code actif
    const { data: existingCode } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('customer_email', email)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingCode) {
      return res.status(400).json({ 
        error: 'Vous avez déjà un code actif',
        code: existingCode.code,
        expires_at: existingCode.expires_at
      });
    }

    // 3. Calculer le montant de réduction
    const discountAmount = Math.floor((pointsToUse / POINTS_TO_EURO_RATIO) * 100) / 100;

    // 4. Générer un code unique
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const discountCode = `ALOHA${Math.floor(discountAmount)}-${randomCode}`;

    // 5. Créer la règle de prix dans Shopify
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    const priceRulePayload = {
      price_rule: {
        title: `Fidélité ${email} - ${discountAmount}€`,
        target_type: 'line_item',
        target_selection: 'all',
        allocation_method: 'across',
        value_type: 'fixed_amount',
        value: `-${discountAmount}`,
        customer_selection: 'prerequisite',
        prerequisite_customer_ids: [],
        starts_at: new Date().toISOString(),
        ends_at: expiresAt.toISOString(),
        once_per_customer: true,
        usage_limit: 1
      }
    };

    const priceRuleResponse = await fetch(
      `https://${SHOPIFY_SHOP}/admin/api/2024-10/price_rules.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
        },
        body: JSON.stringify(priceRulePayload)
      }
    );

    if (!priceRuleResponse.ok) {
      const errorText = await priceRuleResponse.text();
      console.error('Shopify price rule error:', errorText);
      throw new Error('Erreur création règle de prix Shopify');
    }

    const priceRuleData = await priceRuleResponse.json();
    const priceRuleId = priceRuleData.price_rule.id;

    // 6. Créer le code promo dans Shopify
    const discountCodePayload = {
      discount_code: {
        code: discountCode
      }
    };

    const discountCodeResponse = await fetch(
      `https://${SHOPIFY_SHOP}/admin/api/2024-10/price_rules/${priceRuleId}/discount_codes.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
        },
        body: JSON.stringify(discountCodePayload)
      }
    );

    if (!discountCodeResponse.ok) {
      const errorText = await discountCodeResponse.text();
      console.error('Shopify discount code error:', errorText);
      throw new Error('Erreur création code promo Shopify');
    }

    const discountCodeData = await discountCodeResponse.json();

    // 7. Enregistrer le code dans Supabase
    const { error: insertError } = await supabase
      .from('discount_codes')
      .insert({
        customer_email: email,
        shopify_price_rule_id: priceRuleId.toString(),
        shopify_discount_code_id: discountCodeData.discount_code.id.toString(),
        code: discountCode,
        discount_amount: discountAmount,
        points_used: pointsToUse,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        metadata: {
          created_from: 'customer_dashboard'
        }
      });

    if (insertError) throw insertError;

    // 8. Déduire les points du solde (mais pas du total_points_earned!)
    const { error: updateError } = await supabase
      .from('loyalty_points')
      .update({
        points_balance: customerPoints.points_balance - pointsToUse,
        total_points_spent: customerPoints.total_points_spent + pointsToUse
      })
      .eq('customer_email', email);

    if (updateError) throw updateError;

    // 9. Enregistrer la transaction
    await supabase
      .from('points_transactions')
      .insert({
        customer_email: email,
        points: -pointsToUse,
        transaction_type: 'redemption',
        description: `Code promo généré: ${discountCode} (${discountAmount}€)`,
        metadata: {
          discount_code: discountCode,
          discount_amount: discountAmount
        }
      });

    console.log(`✅ Code généré pour ${email}: ${discountCode} (${discountAmount}€)`);

    return res.status(200).json({
      success: true,
      code: discountCode,
      discount_amount: discountAmount,
      points_used: pointsToUse,
      expires_at: expiresAt.toISOString(),
      new_balance: customerPoints.points_balance - pointsToUse
    });

  } catch (error) {
    console.error('❌ Erreur génération code:', error);
    return res.status(500).json({
      error: 'Erreur lors de la génération du code',
      details: error.message
    });
  }
};
