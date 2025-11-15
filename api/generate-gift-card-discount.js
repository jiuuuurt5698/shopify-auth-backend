const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

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

  const { email, palierNom, montant } = req.body;

  if (!email || !palierNom || !montant) {
    return res.status(400).json({ error: 'Email, palierNom et montant requis' });
  }

  try {
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `GIFT${palierNom.substring(0, 3).toUpperCase()}${randomPart}`;

    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);

    const shopifyResponse = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2024-10/price_rules.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': ADMIN_API_TOKEN,
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

    const discountCodeResponse = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2024-10/price_rules/${priceRuleId}/discount_codes.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': ADMIN_API_TOKEN,
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

    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/loyalty_transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            customer_email: email,
            points: 0,
            type: 'gift_card_redeemed',
            description: `Carte cadeau ${palierNom} de ${montant}€ récupérée (${code})`,
            created_at: new Date().toISOString(),
          })
        });
      } catch (supabaseError) {
        console.error('Supabase transaction error:', supabaseError);
      }
    }

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
