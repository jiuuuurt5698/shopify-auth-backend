import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN
const ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY

// 🎯 FONCTION D'ENVOI D'EMAIL CARTE CADEAU - DESIGN FINAL ALOHA
const sendGiftCardEmail = async (email, firstName, discountCode, palierNom, montant, expirationDate) => {
  const emailHtml = `
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&display=swap');
    
    /* Force light mode */
    :root {
      color-scheme: light only !important;
      supported-color-schemes: light !important;
    }
    
    /* Protection dark mode pour tous les clients */
    @media (prefers-color-scheme: dark) {
      .email-container { background-color: #EACDC2 !important; }
      .email-card { background-color: #FAF9F9 !important; }
      .header-section { background: linear-gradient(135deg, #BC6170 0%, #9d5260 100%) !important; }
      .content-section { background-color: #FAF9F9 !important; color: #22192E !important; }
      .footer-section { background-color: #EFEDEE !important; }
      .text-dark { color: #22192E !important; }
      .text-gray { color: #4a5568 !important; }
      .text-light-gray { color: #718096 !important; }
    }
  </style>
</head>
<body style="margin: 0 !important; padding: 0 !important; font-family: 'Archivo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important; background-color: #EACDC2 !important; color-scheme: light only !important;">
  <table role="presentation" class="email-container" style="width: 100% !important; border-collapse: collapse !important; background-color: #EACDC2 !important;">
    <tr>
      <td align="center" style="padding: 40px 20px !important;">
        <table role="presentation" class="email-card" style="max-width: 600px !important; width: 100% !important; border-collapse: collapse !important; background: #FAF9F9 !important; border-radius: 24px !important; overflow: hidden !important; box-shadow: 0 10px 40px rgba(34, 25, 46, 0.12) !important;">
          
          <!-- HEADER AVEC SMILEY -->
          <tr>
            <td class="header-section" style="background: linear-gradient(135deg, #BC6170 0%, #9d5260 100%) !important; padding: 24px 40px !important; text-align: center !important;">
              <img src="https://xdkdxtrlldghcwymbttt.supabase.co/storage/v1/object/public/email-assets/SMILEY%202.png" alt="Aloha" style="width: 140px !important; height: 140px !important; margin: 0 auto 12px !important; display: block !important;" />
              <h2 style="margin: 0 0 6px 0 !important; color: #FAF9F9 !important; font-size: 28px !important; font-weight: 700 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">Carte cadeau débloquée</h2>
              <p style="margin: 0 !important; color: #FAF9F9 !important; opacity: 0.85 !important; font-size: 16px !important; font-family: 'Archivo', -apple-system, sans-serif !important;">Palier ${palierNom}</p>
            </td>
          </tr>

          <!-- CONTENU PRINCIPAL -->
          <tr>
            <td class="content-section" style="padding: 48px 40px 24px 40px !important; background-color: #FAF9F9 !important;">
              <p class="text-dark" style="margin: 0 0 20px 0 !important; color: #22192E !important; font-size: 17px !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                Salut <strong style="font-weight: 700 !important; color: #BC6170 !important;">${firstName || 'cher client'}</strong> 👋
              </p>
              <p class="text-gray" style="margin: 0 0 24px 0 !important; color: #4a5568 !important; font-size: 16px !important; line-height: 1.6 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                Félicitations ! Tu as atteint le palier <strong style="color: #BC6170 !important;">${palierNom}</strong> et débloqué ta carte cadeau de <strong style="color: #BC6170 !important;">${montant}€</strong>.
              </p>
            </td>
          </tr>

          <!-- CARTE CODE PROMO -->
          <tr>
            <td style="padding: 0 24px 24px 24px !important; background-color: #FAF9F9 !important;">
              <table role="presentation" style="width: 100% !important; background: #22192E !important; border-radius: 16px !important;">
                <tr>
                  <td style="padding: 32px 24px !important; text-align: center !important;">
                    <p style="margin: 0 0 16px 0 !important; color: #FAF9F9 !important; font-size: 15px !important; font-weight: 600 !important; font-family: 'Archivo', -apple-system, sans-serif !important; text-transform: uppercase !important; letter-spacing: 1px !important; opacity: 0.9 !important;">
                      Ta carte cadeau ${palierNom}
                    </p>
                    <p style="margin: 0 0 12px 0 !important; color: #FAF9F9 !important; font-size: 40px !important; font-weight: 700 !important; font-family: 'Archivo', -apple-system, sans-serif !important; letter-spacing: 3px !important;">
                      ${discountCode}
                    </p>
                    <p style="margin: 0 0 8px 0 !important; color: #FAF9F9 !important; font-size: 18px !important; font-weight: 600 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                      ${montant}€ de réduction
                    </p>
                    <p style="margin: 0 !important; color: #FAF9F9 !important; font-size: 13px !important; font-family: 'Archivo', -apple-system, sans-serif !important; opacity: 0.85 !important;">
                      Valable jusqu'au ${expirationDate}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BOX ASTUCE -->
          <tr>
            <td style="padding: 0 24px 24px 24px !important; background-color: #FAF9F9 !important;">
              <table role="presentation" style="width: 100% !important; background: #EFEDEE !important; border-radius: 16px !important;">
                <tr>
                  <td style="padding: 24px !important;">
                    <p style="margin: 0 0 12px 0 !important; color: #22192E !important; font-size: 16px !important; font-weight: 700 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                      Comment l'utiliser ?
                    </p>
                    <p style="margin: 0 !important; color: #4a5568 !important; font-size: 14px !important; line-height: 1.6 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                      Copie ton code et colle-le lors de ta prochaine commande pour bénéficier de ta carte cadeau immédiatement.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- IMAGE SOCIAL PREVIEW AVEC BOUTON CENTRÉ -->
          <tr>
            <td style="padding: 0 24px 24px 24px !important; background-color: #FAF9F9 !important;">
              <table role="presentation" style="width: 100% !important; border-collapse: collapse !important; background-image: url('https://xdkdxtrlldghcwymbttt.supabase.co/storage/v1/object/public/email-assets/SOCIAL%20PREVIEW.png') !important; background-size: cover !important; background-position: center !important; border-radius: 16px !important; height: 300px !important;">
                <tr>
                  <td align="center" valign="middle" style="height: 300px !important;">
                    <a href="https://aloha-cbd.fr" style="display: inline-block !important; background: #22192E !important; color: #FAF9F9 !important; text-decoration: none !important; padding: 16px 40px !important; border-radius: 14px !important; font-size: 16px !important; font-weight: 700 !important; font-family: 'Archivo', -apple-system, sans-serif !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;">
                      Continuer mes achats
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td class="footer-section" style="padding: 32px 40px !important; text-align: center !important; background: #EFEDEE !important;">
              <p class="text-dark" style="margin: 0 0 16px 0 !important; color: #22192E !important; font-size: 16px !important; font-weight: 600 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">L'équipe Aloha</p>
              <p style="margin: 0 0 16px 0 !important; font-size: 14px !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                <a href="https://aloha-cbd.fr/mon-compte" style="color: #22192E !important; text-decoration: none !important; margin: 0 10px !important; font-weight: 500 !important;">Mon compte</a>
                <span style="color: #BC6170 !important;">•</span>
                <a href="https://aloha-cbd.fr/contact" style="color: #22192E !important; text-decoration: none !important; margin: 0 10px !important; font-weight: 500 !important;">Support</a>
              </p>
              <p class="text-light-gray" style="margin: 0 !important; color: #718096 !important; font-size: 12px !important; font-family: 'Archivo', -apple-system, sans-serif !important;">© ${new Date().getFullYear()} Aloha CBD. Tous droits réservés.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  try {
    await resend.emails.send({
      from: 'ALOHA CBD <hello@noreply.aloha-cbd.fr>',
      to: email,
      subject: `Ta carte cadeau ${palierNom} de ${montant}€ est disponible`,
      html: emailHtml
    })
    console.log('✅ Email carte cadeau envoyé à:', email)
  } catch (error) {
    console.error('❌ Erreur envoi email carte cadeau:', error)
    // On ne bloque pas l'API si l'email échoue
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, palierNom, montant } = req.body

  if (!email || !palierNom || !montant) {
    return res.status(400).json({ error: 'Email, palierNom et montant requis' })
  }

  try {
    // Récupérer le prénom du client pour l'email (optionnel)
    let firstName = ''
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const customerResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/customers?email=eq.${email}&select=first_name`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
            }
          }
        )
        if (customerResponse.ok) {
          const customerData = await customerResponse.json()
          if (customerData && customerData.length > 0) {
            firstName = customerData[0].first_name
          }
        }
      } catch (error) {
        console.log('Prénom non trouvé, email envoyé sans prénom')
      }
    }

    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase()
    const code = `GIFT${palierNom.substring(0, 3).toUpperCase()}${randomPart}`

    const expirationDate = new Date()
    expirationDate.setFullYear(expirationDate.getFullYear() + 1)

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
    )

    if (!shopifyResponse.ok) {
      const errorData = await shopifyResponse.json()
      console.error('Shopify API Error:', errorData)
      return res.status(500).json({ error: 'Erreur lors de la création du code promo sur Shopify' })
    }

    const priceRuleData = await shopifyResponse.json()
    const priceRuleId = priceRuleData.price_rule.id

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
    )

    if (!discountCodeResponse.ok) {
      const errorData = await discountCodeResponse.json()
      console.error('Shopify Discount Code Error:', errorData)
      return res.status(500).json({ error: 'Erreur lors de la création du code de réduction' })
    }

    // Enregistrer la transaction dans Supabase
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
        })
      } catch (supabaseError) {
        console.error('Supabase transaction error:', supabaseError)
      }
    }

    // Enregistrer que la carte a été récupérée
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/gift_cards_redeemed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            customer_email: email,
            palier_name: palierNom,
            redeemed_at: new Date().toISOString(),
          })
        })
      } catch (error) {
        console.error('Error saving redeemed gift card:', error)
      }
    }

    // 🎯 ENVOYER L'EMAIL DE CARTE CADEAU
    const expirationDateFormatted = expirationDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    await sendGiftCardEmail(
      email,
      firstName,
      code,
      palierNom,
      montant,
      expirationDateFormatted
    )

    return res.status(200).json({
      success: true,
      code: code,
      discount_amount: montant,
      expires_at: expirationDate.toISOString(),
      palier: palierNom,
    })

  } catch (error) {
    console.error('Error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
