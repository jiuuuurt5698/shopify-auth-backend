import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN

// Ratio: 10 points = 1€ de réduction
const POINTS_TO_EURO_RATIO = 10

// 🎯 FONCTION D'ENVOI D'EMAIL - DESIGN FINAL ALOHA
const sendDiscountEmail = async (email, firstName, discountCode, pointsUsed, discountValue, expirationDate) => {
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
              <h2 style="margin: 0 0 6px 0 !important; color: #FAF9F9 !important; font-size: 28px !important; font-weight: 700 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">Ton code est prêt !</h2>
              <p style="margin: 0 !important; color: #FAF9F9 !important; opacity: 0.85 !important; font-size: 16px !important; font-family: 'Archivo', -apple-system, sans-serif !important;">Merci de ta fidélité ✨</p>
            </td>
          </tr>

          <!-- CONTENU PRINCIPAL -->
          <tr>
            <td class="content-section" style="padding: 48px 40px 24px 40px !important; background-color: #FAF9F9 !important;">
              <p class="text-dark" style="margin: 0 0 20px 0 !important; color: #22192E !important; font-size: 17px !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                Salut <strong style="font-weight: 700 !important; color: #BC6170 !important;">${firstName || 'cher client'}</strong> 👋
              </p>
              <p class="text-gray" style="margin: 0 0 24px 0 !important; color: #4a5568 !important; font-size: 16px !important; line-height: 1.6 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                Tu as utilisé <strong style="color: #BC6170 !important;">${pointsUsed} points</strong> pour obtenir ton code de réduction de <strong style="color: #BC6170 !important;">${discountValue}€</strong>. Il est maintenant prêt à être utilisé !
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
                      Ton code de réduction
                    </p>
                    <p style="margin: 0 0 12px 0 !important; color: #FAF9F9 !important; font-size: 40px !important; font-weight: 700 !important; font-family: 'Archivo', -apple-system, sans-serif !important; letter-spacing: 3px !important;">
                      ${discountCode}
                    </p>
                    <p style="margin: 0 0 8px 0 !important; color: #FAF9F9 !important; font-size: 18px !important; font-weight: 600 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                      ${discountValue}€ de réduction
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
                      💡 Comment l'utiliser ?
                    </p>
                    <p style="margin: 0 0 20px 0 !important; color: #4a5568 !important; font-size: 14px !important; line-height: 1.6 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                      Copie ton code et colle-le lors de ta prochaine commande pour bénéficier de ta réduction immédiatement !
                    </p>
                    
                    <!-- BOUTON INTÉGRÉ -->
                    <table role="presentation" style="width: 100% !important; border-collapse: collapse !important;">
                      <tr>
                        <td align="center" style="padding: 8px 0 0 0 !important;">
                          <a href="https://aloha-cbd.fr/collections/all" style="display: inline-block !important; background: #FE7BFF !important; color: #22192E !important; text-decoration: none !important; padding: 16px 40px !important; border-radius: 14px !important; font-size: 16px !important; font-weight: 700 !important; font-family: 'Archivo', -apple-system, sans-serif !important; box-shadow: 0 4px 14px rgba(254, 123, 255, 0.4) !important;">
                            Utiliser mon code
                          </a>
                        </td>
                      </tr>
                    </table>
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
      from: 'Équipe Aloha <contact@noreply.aloha-cbd.fr>',
      to: email,
      subject: `🎁 Ton code de réduction ${discountValue}€ est prêt !`,
      html: emailHtml
    })
    console.log('✅ Email de confirmation envoyé à:', email)
  } catch (error) {
    console.error('❌ Erreur envoi email:', error)
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

  try {
    const { email, pointsToUse } = req.body

    if (!email || !pointsToUse) {
      return res.status(400).json({ error: 'Email et points requis' })
    }

    if (pointsToUse < 10) {
      return res.status(400).json({ error: 'Minimum 10 points requis (1€)' })
    }

    // 1. Vérifier le solde du client
    const { data: customerPoints, error: pointsError } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('customer_email', email)
      .single()

    if (pointsError || !customerPoints) {
      return res.status(404).json({ error: 'Client non trouvé' })
    }

    if (customerPoints.points_balance < pointsToUse) {
      return res.status(400).json({ 
        error: 'Solde insuffisant',
        available: customerPoints.points_balance,
        requested: pointsToUse
      })
    }

    // 2. Récupérer le prénom du client pour l'email (optionnel)
    let firstName = ''
    try {
      const { data: customerData } = await supabase
        .from('customers')
        .select('first_name')
        .eq('email', email)
        .single()
      
      if (customerData) {
        firstName = customerData.first_name
      }
    } catch (error) {
      console.log('Prénom non trouvé, email envoyé sans prénom')
    }

    // 3. Calculer le montant de réduction
    const discountAmount = Math.floor((pointsToUse / POINTS_TO_EURO_RATIO) * 100) / 100

    // 4. Générer un code unique
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const discountCode = `ALOHA${Math.floor(discountAmount)}-${randomCode}`

    // 5. Créer la règle de prix dans Shopify
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 90)

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
    }

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
    )

    if (!priceRuleResponse.ok) {
      const errorText = await priceRuleResponse.text()
      console.error('Shopify price rule error:', errorText)
      throw new Error('Erreur création règle de prix Shopify')
    }

    const priceRuleData = await priceRuleResponse.json()
    const priceRuleId = priceRuleData.price_rule.id

    // 6. Créer le code promo dans Shopify
    const discountCodePayload = {
      discount_code: {
        code: discountCode
      }
    }

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
    )

    if (!discountCodeResponse.ok) {
      const errorText = await discountCodeResponse.text()
      console.error('Shopify discount code error:', errorText)
      throw new Error('Erreur création code promo Shopify')
    }

    const discountCodeData = await discountCodeResponse.json()

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
      })

    if (insertError) throw insertError

    // 8. Déduire les points du solde (mais pas du total_points_earned!)
    const { error: updateError } = await supabase
      .from('loyalty_points')
      .update({
        points_balance: customerPoints.points_balance - pointsToUse,
        total_points_spent: customerPoints.total_points_spent + pointsToUse
      })
      .eq('customer_email', email)

    if (updateError) throw updateError

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
      })

    console.log(`✅ Code généré pour ${email}: ${discountCode} (${discountAmount}€)`)

    // 🎯 10. ENVOYER L'EMAIL DE CONFIRMATION
    const expirationDateFormatted = expiresAt.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    await sendDiscountEmail(
      email,
      firstName,
      discountCode,
      pointsToUse,
      discountAmount,
      expirationDateFormatted
    )

    return res.status(200).json({
      success: true,
      code: discountCode,
      discount_amount: discountAmount,
      points_used: pointsToUse,
      expires_at: expiresAt.toISOString(),
      new_balance: customerPoints.points_balance - pointsToUse
    })

  } catch (error) {
    console.error('❌ Erreur génération code:', error)
    return res.status(500).json({
      error: 'Erreur lors de la génération du code',
      details: error.message
    })
  }
}
