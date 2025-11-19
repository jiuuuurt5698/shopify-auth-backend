import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN || 'f8bnjk-2f.myshopify.com'
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN

export default async function handler(req, res) {
  // CORS headers
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

    console.log('📝 Tentative de création de compte:', email)

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Tous les champs sont requis' })
    }

    // Vérifier les variables d'environnement
    if (!SHOPIFY_ADMIN_TOKEN) {
      console.error('❌ SHOPIFY_ADMIN_API_TOKEN manquant')
      return res.status(500).json({ error: 'Configuration serveur manquante' })
    }

    // Vérifier si l'email existe déjà dans Supabase
    const { data: existingUser } = await supabase
      .from('customers')
      .select('email')
      .eq('email', email)
      .single()

    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' })
    }

    // 1. CRÉER LE CLIENT DANS SHOPIFY
    console.log('🛍️ Création client Shopify...')

    const shopifyQuery = `
      mutation customerCreate($input: CustomerInput!) {
        customerCreate(input: $input) {
          customer {
            id
            email
            firstName
            lastName
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    const shopifyResponse = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/2024-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
        },
        body: JSON.stringify({
          query: shopifyQuery,
          variables: {
            input: {
              email,
              firstName,
              lastName,
              password,
            }
          }
        })
      }
    )

    if (!shopifyResponse.ok) {
      console.error('❌ Réponse Shopify non-OK:', shopifyResponse.status)
      const errorText = await shopifyResponse.text()
      console.error('❌ Détails:', errorText)
      return res.status(500).json({ 
        error: 'Erreur lors de la communication avec Shopify',
        details: errorText
      })
    }

    const shopifyData = await shopifyResponse.json()
    console.log('📦 Réponse Shopify:', JSON.stringify(shopifyData, null, 2))

    // Vérifier les erreurs GraphQL
    if (shopifyData.errors) {
      console.error('❌ Erreurs GraphQL:', shopifyData.errors)
      return res.status(400).json({ 
        error: 'Erreur Shopify',
        details: shopifyData.errors[0]?.message || 'Erreur inconnue'
      })
    }

    // Vérifier les userErrors
    if (shopifyData.data?.customerCreate?.userErrors?.length > 0) {
      const userError = shopifyData.data.customerCreate.userErrors[0]
      console.error('❌ User error:', userError)
      return res.status(400).json({ 
        error: userError.message || 'Erreur de validation',
        field: userError.field
      })
    }

    const shopifyCustomer = shopifyData.data?.customerCreate?.customer

    if (!shopifyCustomer) {
      console.error('❌ Pas de customer dans la réponse')
      return res.status(500).json({ 
        error: 'Erreur lors de la création du compte Shopify',
        details: 'Réponse invalide'
      })
    }

    // Extraire l'ID numérique de Shopify
    const shopifyCustomerId = shopifyCustomer.id.split('/').pop()
    console.log('✅ Client Shopify créé:', shopifyCustomerId)

    // 2. CRÉER LE CLIENT DANS SUPABASE
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
      return res.status(500).json({ 
        error: 'Erreur lors de la création du compte',
        details: insertError.message
      })
    }

    console.log('✅ Client Supabase créé:', newUser.id)

    // Retourner l'utilisateur
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
    console.error('💥 ERREUR CRITIQUE:', error)
    console.error('Stack:', error.stack)
    return res.status(500).json({ 
      error: 'Erreur serveur',
      details: error.message
    })
  }
}
