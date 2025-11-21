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

// Template email - NOUVEAU DESIGN
const getWelcomeEmailTemplate = (firstName, discountCode, expirationDate) => {
  return `
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
              <h2 style="margin: 0 0 6px 0 !important; color: #FAF9F9 !important; font-size: 28px !important; font-weight: 700 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">Bienvenue chez Aloha</h2>
              <p style="margin: 0 !important; color: #FAF9F9 !important; opacity: 0.85 !important; font-size: 16px !important; font-family: 'Archivo', -apple-system, sans-serif !important;">Ton aventure commence maintenant 🌺</p>
            </td>
          </tr>

          <!-- CONTENU PRINCIPAL -->
          <tr>
            <td class="content-section" style="padding: 48px 40px !important; background-color: #FAF9F9 !important;">
              <p class="text-dark" style="margin: 0 0 20px 0 !important; color: #22192E !important; font-size: 17px !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                Salut <strong style="font-weight: 700 !important; color: #BC6170 !important;">${firstName}</strong> 👋
              </p>
              <p class="text-gray" style="margin: 0 0 24px 0 !important; color: #4a5568 !important; font-size: 16px !important; line-height: 1.6 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                Merci d'avoir rejoint la famille Aloha ! Ton compte a été créé avec succès et tu peux dès maintenant profiter de notre programme de fidélité.
              </p>
              
              <!-- CARTE CODE PROMO -->
              <table role="presentation" style="width: 100% !important; background: linear-gradient(135deg, #FE7BFC 0%, #d946ef 100%) !important; border-radius: 16px !important; margin-bottom: 32px !important;">
                <tr>
                  <td style="padding: 32px 24px !important; text-align: center !important;">
                    <p style="margin: 0 0 16px 0 !important; color: #FAF9F9 !important; font-size: 15px !important; font-weight: 600 !important; font-family: 'Archivo', -apple-system, sans-serif !important; text-transform: uppercase !important; letter-spacing: 1px !important; opacity: 0.9 !important;">
                      🎁 Cadeau de bienvenue
                    </p>
                    <p style="margin: 0 0 12px 0 !important; color: #FAF9F9 !important; font-size: 40px !important; font-weight: 700 !important; font-family: 'Archivo', -apple-system, sans-serif !important; letter-spacing: 3px !important;">
                      ${discountCode}
                    </p>
                    <p style="margin: 0 0 8px 0 !important; color: #FAF9F9 !important; font-size: 18px !important; font-weight: 600 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                      10% de réduction
                    </p>
                    <p style="margin: 0 !important; color: #FAF9F9 !important; font-size: 13px !important; font-family: 'Archivo', -apple-system, sans-serif !important; opacity: 0.85 !important;">
                      Valable jusqu'au ${expirationDate}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- BOX PROGRAMME FIDELITÉ -->
              <table role="presentation" style="width: 100% !important; background: #EFEDEE !important; border-radius: 16px !important; margin-bottom: 32px !important;">
                <tr>
                  <td style="padding: 24px !important;">
                    <p style="margin: 0 0 16px 0 !important; color: #22192E !important; font-size: 16px !important; font-weight: 700 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                      🎁 Ton programme de fidélité
                    </p>
                    <table role="presentation" style="width: 100% !important;">
                      <tr>
                        <td style="padding: 8px 0 !important;">
                          <p style="margin: 0 !important; color: #4a5568 !important; font-size: 14px !important; line-height: 1.6 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                            <span style="color: #BC6170 !important; font-weight: 700 !important;">✓</span> <strong>0,5 point</strong> par euro dépensé
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0 !important;">
                          <p style="margin: 0 !important; color: #4a5568 !important; font-size: 14px !important; line-height: 1.6 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                            <span style="color: #BC6170 !important; font-weight: 700 !important;">✓</span> Convertis tes points en <strong>codes promo</strong>
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0 !important;">
                          <p style="margin: 0 !important; color: #4a5568 !important; font-size: 14px !important; line-height: 1.6 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                            <span style="color: #BC6170 !important; font-weight: 700 !important;">✓</span> Débloque des <strong>cartes cadeaux exclusives</strong>
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0 !important;">
                          <p style="margin: 0 !important; color: #4a5568 !important; font-size: 14px !important; line-height: 1.6 !important; font-family: 'Archivo', -apple-system, sans-serif !important;">
                            <span style="color: #BC6170 !important; font-weight: 700 !important;">✓</span> 5 paliers : Bronze, Argent, Or, Diamant, Maître
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- BOUTON MON COMPTE -->
              <table role="presentation" style="width: 100% !important; border-collapse: collapse !important;">
                <tr>
                  <td align="center" style="padding: 8px 0 24px 0 !important;">
                    <a href="https://aloha-cbd.fr/mon-compte" style="display: inline-block !important; background: #FE7BFF !important; color: #22192E !important; text-decoration: none !important; padding: 18px 48px !important; border-radius: 16px !important; font-size: 17px !important; font-weight: 700 !important; font-family: 'Archivo', -apple-system, sans-serif !important; box-shadow: 0 4px 14px rgba(254, 123, 255, 0.4) !important;">
                      Accéder à mon espace
                    </a>
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
                      Découvrir la boutique
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
