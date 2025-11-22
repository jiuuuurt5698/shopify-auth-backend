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

// 🎯 FONCTION D'ENVOI D'EMAIL
const sendDiscountEmail = async (email, firstName, discountCode, pointsUsed, discountValue, expirationDate) => {
  const emailHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Archivo', -apple-system, sans-serif; background-color: #FAF9F9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <!-- En-tête -->
          <tr>
            <td style="background: linear-gradient(135deg, #BC6170 0%, #a84d5f 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #FAF9F9; font-size: 28px; font-weight: 700; font-family: 'Archivo', sans-serif;">
                Votre code de réduction ! 🎁
              </h1>
            </td>
          </tr>

          <!-- Contenu principal -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6; font-family: 'Archivo', sans-serif;">
                Bonjour <strong>${firstName || 'cher client'}</strong>,
              </p>
              
              <p style="margin: 0 0 30px 0; color: #4a5568; font-size: 16px; line-height: 1.6; font-family: 'Archivo', sans-serif;">
                Merci de votre fidélité ! Vous avez utilisé <strong style="color: #BC6170;">${pointsUsed} points</strong> pour obtenir votre code de réduction de <strong style="color: #BC6170;">${discountValue}€</strong>.
              </p>

              <!-- Code promo -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 30px 0;">
                <tr>
                  <td style="background: linear-gradient(135deg, #BC6170 0%, #a84d5f 100%); border-radius: 12px; padding: 30px; text-align: center;">
                    <p style="margin: 0 0 12px 0; color: #FAF9F9; font-size: 14px; font-weight: 600; font-family: 'Archivo', sans-serif; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">
                      Votre code de réduction
                    </p>
                    <p style="margin: 0 0 8px 0; color: #FAF9F9; font-size: 32px; font-weight: 700; font-family: 'Archivo', sans-serif; letter-spacing: 3px;">
                      ${discountCode}
                    </p>
                    <p style="margin: 0; color: #FAF9F9; font-size: 12px; font-family: 'Archivo', sans-serif; opacity: 0.85;">
                      Valable jusqu'au ${expirationDate}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Bouton CTA -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://aloha-cbd.fr/collections/all" style="display: inline-block; background: linear-gradient(135deg, #BC6170 0%, #a84d5f 100%); color: #FAF9F9; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; font-family: 'Archivo', sans-serif;">
                      Utiliser mon code
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Info supplémentaire -->
              <div style="background: #FAF9F9; border-left: 4px solid #BC6170; border-radius: 8px; padding: 20px; margin: 0;">
                <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.6; font-family: 'Archivo', sans-serif;">
                  💡 <strong>Astuce :</strong> Copiez votre code et collez-le lors de votre prochaine commande pour bénéficier de votre réduction immédiatement !
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #FAF9F9; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 15px 0; color: #4a5568; font-size: 14px; font-family: 'Archivo', sans-serif;">
                Des questions ? Contactez-nous à <a href="mailto:contact@aloha-cbd.fr" style="color: #BC6170; text-decoration: none;">contact@aloha-cbd.fr</a>
              </p>
              
              <p style="margin: 15px 0 0 0; padding-top: 15px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; font-family: 'Archivo', sans-serif;">
                Vous recevez cet email suite à l'utilisation de vos points fidélité sur aloha-cbd.fr
              </p>
              
              <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 11px; font-family: 'Archivo', sans-serif;">
                Aloha CBD - France
              </p>
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
      subject: `🎁 Votre code de réduction ${discountValue}€ est prêt !`,
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
