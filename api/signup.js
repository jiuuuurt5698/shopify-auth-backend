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

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Tous les champs sont requis' })
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

    const shopifyData = await shopifyResponse.json()

    if (shopifyData.data?.customerCreate?.userErrors?.length > 0) {
      const error = shopifyData.data.customerCreate.userErrors[0]
      return res.status(400).json({ error: error.message })
    }

    const shopifyCustomer = shopifyData.data?.customerCreate?.customer
    if (!shopifyCustomer) {
      return res.status(500).json({ error: 'Erreur lors de la création du compte Shopify' })
    }

    // Extraire l'ID numérique de Shopify (format: gid://shopify/Customer/123456)
    const shopifyCustomerId = shopifyCustomer.id.split('/').pop()

    console.log('✅ Client créé dans Shopify:', shopifyCustomerId)

    // 2. CRÉER LE CLIENT DANS SUPABASE (pour l'authentification)
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
      console.error('Error inserting user in Supabase:', insertError)
      return res.status(500).json({ error: 'Erreur lors de la création du compte' })
    }

    console.log('✅ Client créé dans Supabase:', newUser.id)

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
    console.error('Error in signup:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
