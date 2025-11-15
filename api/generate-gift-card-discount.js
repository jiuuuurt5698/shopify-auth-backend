// api/generate-gift-card-discount.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, palierNom, montant } = req.body;

  if (!email || !palierNom || !montant) {
    return res.status(400).json({ error: 'Email, palierNom et montant requis' });
  }

  try {
    // Vérifier que l'utilisateur existe
    const { data: userData, error: userError } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Générer un code unique
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `GIFT${palierNom.substring(0, 3).toUpperCase()}${randomPart}`;

    // Calculer la date d'expiration (1 an)
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);

    // Créer le code promo sur Shopify via l'API Admin
    const shopifyResponse = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2024-10/price_rules.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        },
        body: JSON.stringify({
          price_rule: {
            title: `Carte Cadeau ${palierNom} - ${email}`,
            target_type: 'line_item',
            target_selection: 'all',
            allocation_method: 'across',
            value_type: 'fixed_amount',
            value: `-${montant}`,
            customer_selection: 'all',
            once_per_customer: true,
            usage_limit: 1,
            starts_at: new Date().toISOString(),
            ends_at: expirationDate.toISOString(),
          },
        }),
      }
    );

    if (!shopifyResponse.ok) {
      const errorData = await shopifyResponse.json();
      console.error('Shopify API Error:', errorData);
      return res.status(500).json({ error: 'Erreur lors de la création du code promo sur Shopify' });
    }

    const priceRuleData = await shopifyResponse.json();
    const priceRuleId = priceRuleData.price_rule.id;

    // Créer le discount code associé
    const discountCodeResponse = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2024-10/price_rules/${priceRuleId}/discount_codes.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        },
        body: JSON.stringify({
          discount_code: {
            code: code,
          },
        }),
      }
    );

    if (!discountCodeResponse.ok) {
      const errorData = await discountCodeResponse.json();
      console.error('Shopify Discount Code Error:', errorData);
      return res.status(500).json({ error: 'Erreur lors de la création du code de réduction' });
    }

    // Enregistrer dans Supabase
    const { data: discountData, error: discountError } = await supabase
      .from('discount_codes')
      .insert([
        {
          customer_email: email,
          code: code,
          discount_amount: montant,
          discount_type: 'gift_card',
          palier_name: palierNom,
          shopify_price_rule_id: priceRuleId.toString(),
          status: 'active',
          expires_at: expirationDate.toISOString(),
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (discountError) {
      console.error('Supabase Error:', discountError);
      return res.status(500).json({ error: 'Erreur lors de l\'enregistrement du code' });
    }

    // Log de l'activité
    await supabase.from('loyalty_transactions').insert([
      {
        customer_email: email,
        points: 0,
        type: 'gift_card_redeemed',
        description: `Carte cadeau ${palierNom} de ${montant}€ récupérée`,
        created_at: new Date().toISOString(),
      },
    ]);

    return res.status(200).json({
      success: true,
      code: code,
      discount_amount: montant,
      expires_at: expirationDate.toISOString(),
      palier: palierNom,
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
