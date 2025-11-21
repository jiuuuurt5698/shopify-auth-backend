import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN || 'f8bnjk-2f.myshopify.com'
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN

// Template email
const getWelcomeEmailTemplate = (firstName, discountCode, expirationDate) => {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Archivo', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    
                    <tr>
                        <td style="background: linear-gradient(135deg, #22192E 0%, #3d2f52 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #FAF9F9; font-size: 32px; font-weight: 700; font-family: 'Archivo', sans-serif;">
                                🌺 Aloha
                            </h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 16px 0; color: #22192E; font-size: 24px; font-weight: 700; font-family: 'Archivo', sans-serif;">
                                Bienvenue ${firstName} ! 🎉
                            </h2>
                            
                            <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6; font-family: 'Archivo', sans-serif;">
                                Merci d'avoir rejoint la famille Aloha ! Votre compte a été créé avec succès et vous pouvez dès maintenant profiter de notre programme de fidélité.
                            </p>

                            <p style="margin: 0 0 30px 0; color: #4a5568; font-size: 16px; line-height: 1.6; font-family: 'Archivo', sans-serif;">
                                Pour fêter votre arrivée, nous vous offrons <strong style="color: #FE7BFC;">10% de réduction</strong> sur votre première commande avec le code ci-dessous :
                            </p>

                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 30px 0;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #FE7BFC 0%, #d946ef 100%); border-radius: 12px; padding: 30px; text-align: center;">
                                        <p style="margin: 0 0 12px 0; color: #FAF9F9; font-size: 14px; font-weight: 600; font-family: 'Archivo', sans-serif; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">
                                            Votre code promo
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

                            <div style="background: #FAF9F9; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 0 0 30px 0;">
                                <h3 style="margin: 0 0 16px 0; color: #22192E; font-size: 18px; font-weight: 700; font-family: 'Archivo', sans-serif;">
                                    🎁 Votre programme de fidélité
                                </h3>
                                
                                <ul style="margin: 0; padding: 0; list-style: none;">
                                    <li style="margin: 0 0 12px 0; padding-left: 24px; position: relative; color: #4a5568; font-size: 14px; line-height: 1.6; font-family: 'Archivo', sans-serif;">
                                        <span style="position: absolute; left: 0; color: #5938DE;">✓</span>
                                        <strong>0,5 point</strong> par euro dépensé
                                    </li>
                                    <li style="margin: 0 0 12px 0; padding-left: 24px; position: relative; color: #4a5568; font-size: 14px; line-height: 1.6; font-family: 'Archivo', sans-serif;">
                                        <span style="position: absolute; left: 0; color: #5938DE;">✓</span>
                                        Convertissez vos points en <strong>codes promo</strong>
                                    </li>
                                    <li style="margin: 0 0 12px 0; padding-left: 24px; position: relative; color: #4a5568; font-size: 14px; line-height: 1.6; font-family: 'Archivo', sans-serif;">
                                        <span style="position: absolute; left: 0; color: #5938DE;">✓</span>
                                        Débloquez des <strong>cartes cadeaux exclusives</strong>
                                    </li>
                                    <li style="margin: 0; padding-left: 24px; position: relative; color: #4a5568; font-size: 14px; line-height: 1.6; font-family: 'Archivo', sans-serif;">
                                        <span style="position: absolute; left: 0; color: #5938DE;">✓</span>
                                        5 paliers : Bronze, Argent, Or, Diamant, Maître
                                    </li>
                                </ul>
                            </div>

                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="text-align: center; padding: 0 0 20px 0;">
                                        <a href="https://f8bnjk-2f.myshopify.com" style="display: inline-block; background: #22192E; color: #FAF9F9; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 700; font-family: 'Archivo', sans-serif;">
                                            Découvrir la boutique
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="background: #FAF9F9; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 8px 0; color: #718096; font-size: 12px; font-family: 'Archivo', sans-serif;">
                                Questions ? Contactez-nous à <a href="mailto:contact@aloha.com" style="color: #5938DE; text-decoration: none;">contact@aloha.com</a>
                            </p>
                            <p style="margin: 0; color: #a0aec0; font-size: 11px; font-family: 'Archivo', sans-serif;">
                                © 2025 Aloha. Tous droits réservés.
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
}

// Fonction pour créer le code promo Shopify
async function createShopifyDiscountCode(email, firstName) {
  const code = `BIENVENUE${firstName.toUpperCase().replace(/[^A-Z]/g, '')}${Date.now().toString().slice(-4)}`
  
  const expirationDate = new Date()
  expirationDate.setDate(expirationDate.getDate() + 30)

  const mutation = `
    mutation {
      discountCodeBasicCreate(basicCodeDiscount: {
        title: "Code bienvenue - ${email}"
        code: "${code}"
        startsAt: "${new Date().toISOString()}"
        endsAt: "${expirationDate.toISOString()}"
        customerSelection: {
          all: true
        }
        customerGets: {
          value: {
            percentage: 0.10
          }
          items: {
            all: true
          }
        }
        appliesOncePerCustomer: true
      }) {
        codeDiscountNode {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  const response = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-10/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
    },
    body: JSON.stringify({ query: mutation }),
  })

  const result = await response.json()

  if (result.data?.discountCodeBasicCreate?.userErrors?.length > 0) {
    throw new Error(result.data.discountCodeBasicCreate.userErrors[0].message)
  }

  return {
    code,
    expirationDate: expirationDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }),
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password, firstName, lastName } = req.body

    console.log('📝 Tentative création compte:', email)

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Tous les champs sont requis' })
    }

    if (!SHOPIFY_ADMIN_TOKEN) {
      console.error('❌ SHOPIFY_ADMIN_API_TOKEN manquant')
      return res.status(500).json({ error: 'Configuration serveur manquante' })
    }

    // Vérifier email dans Supabase
    console.log('🔍 Vérification email Supabase...')
    const { data: existingUsers } = await supabase
      .from('customers')
      .select('email')
      .eq('email', email)

    if (existingUsers && existingUsers.length > 0) {
      console.log('⚠️ Email déjà utilisé')
      return res.status(400).json({ error: 'Cet email est déjà utilisé' })
    }

    // Créer client Shopify
    console.log('🛍️ Création client Shopify...')
    const shopifyResponse = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2024-10/customers.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
        },
        body: JSON.stringify({
          customer: {
            email,
            first_name: firstName,
            last_name: lastName,
            password,
            password_confirmation: password,
            verified_email: true,
            send_email_welcome: false
          }
        })
      }
    )

    if (!shopifyResponse.ok) {
      const errorData = await shopifyResponse.json()
      console.error('❌ Erreur Shopify:', errorData)
      
      if (errorData.errors?.email) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' })
      }
      
      return res.status(400).json({ 
        error: 'Erreur lors de la création du compte',
        details: errorData.errors
      })
    }

    const shopifyData = await shopifyResponse.json()
    const shopifyCustomerId = shopifyData.customer.id.toString()
    console.log('✅ Client Shopify créé:', shopifyCustomerId)

    // Créer client Supabase
    console.log('💾 Création client Supabase...')
    const hashedPassword = await bcrypt.hash(password, 10)

    const { data: newUser, error: insertError } = await supabase
      .from('customers')
      .insert([
        {
          email,
          password_hash: hashedPassword,
          first_name: firstName,
          last_name: lastName,
          shopify_customer_id: shopifyCustomerId
        }
      ])
      .select()
      .single()

    if (insertError) {
      console.error('❌ Erreur Supabase:', insertError)
      
      // Rollback Shopify
      try {
        await fetch(
          `https://${SHOPIFY_DOMAIN}/admin/api/2024-10/customers/${shopifyCustomerId}.json`,
          {
            method: 'DELETE',
            headers: {
              'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
            }
          }
        )
        console.log('🗑️ Rollback Shopify OK')
      } catch (e) {
        console.error('❌ Erreur rollback:', e)
      }
      
      if (insertError.code === '23505') {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' })
      }
      
      return res.status(500).json({ 
        error: 'Erreur lors de la création du compte',
        details: insertError.message
      })
    }

    console.log('✅ Client Supabase créé:', newUser.id)

    // ✨ NOUVEAU : Créer code promo et envoyer email de bienvenue
    try {
      console.log('🎁 Création code promo...')
      const { code, expirationDate } = await createShopifyDiscountCode(email, firstName)

      console.log('💾 Sauvegarde code dans Supabase...')
      await supabase.from('discount_codes').insert({
        customer_email: email,
        code: code,
        discount_amount: 10,
        discount_type: 'percentage',
        is_welcome_code: true,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        usage_count: 0,
        max_usage: 1,
      })

      console.log('📧 Envoi email de bienvenue...')
      const emailHtml = getWelcomeEmailTemplate(firstName, code, expirationDate)

      await resend.emails.send({
        from: 'Aloha 🌺 <onboarding@noreply.aloha-cbd.fr>', // Change avec ton domaine vérifié
        to: [email],
        subject: `Bienvenue ${firstName} ! Voici 10% de réduction 🎉`,
        html: emailHtml,
      })

      console.log('✅ Email envoyé avec succès')
    } catch (emailError) {
      console.error('⚠️ Erreur email/code promo (non bloquant):', emailError)
      // Ne pas bloquer l'inscription si l'email échoue
    }

    return res.status(200).json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        shopifyId: shopifyCustomerId
      }
    })

  } catch (error) {
    console.error('💥 ERREUR:', error)
    return res.status(500).json({ 
      error: 'Erreur serveur',
      details: error.message
    })
  }
}
