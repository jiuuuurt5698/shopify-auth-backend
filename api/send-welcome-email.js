import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
  `;
};

async function createShopifyDiscountCode(email, firstName) {
  const shopifyDomain = process.env.SHOPIFY_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  const code = `BIENVENUE${firstName.toUpperCase().replace(/[^A-Z]/g, '')}${Date.now().toString().slice(-4)}`;
  
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 30);

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
  `;

  try {
    const response = await fetch(`https://${shopifyDomain}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query: mutation }),
    });

    const result = await response.json();

    if (result.data?.discountCodeBasicCreate?.userErrors?.length > 0) {
      console.error('Erreur Shopify:', result.data.discountCodeBasicCreate.userErrors);
      throw new Error(result.data.discountCodeBasicCreate.userErrors[0].message);
    }

    return {
      code,
      expirationDate: expirationDate.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
    };
  } catch (error) {
    console.error('Erreur création code Shopify:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { email, firstName, lastName } = req.body;

  if (!email || !firstName) {
    return res.status(400).json({ error: 'Email et prénom requis' });
  }

  try {
    // 1. Créer le code promo Shopify
    const { code, expirationDate } = await createShopifyDiscountCode(email, firstName);

    // 2. Sauvegarder le code dans Supabase
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
    });

    // 3. Envoyer l'email avec Resend
    const emailHtml = getWelcomeEmailTemplate(firstName, code, expirationDate);

    const { data, error } = await resend.emails.send({
      from: 'Aloha 🌺 <noreply@noreply.aloha-cbd.fr>', // Change avec ton domaine vérifié sur Resend
      to: [email],
      subject: `Bienvenue ${firstName} ! Voici 10% de réduction 🎉`,
      html: emailHtml,
    });

    if (error) {
      throw new Error(error.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Email de bienvenue envoyé',
      code: code,
      emailId: data?.id,
    });
  } catch (error) {
    console.error('Erreur envoi email bienvenue:', error);
    return res.status(500).json({
      error: 'Erreur lors de l\'envoi de l\'email',
      details: error.message,
    });
  }
}
