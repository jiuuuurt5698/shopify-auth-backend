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

    // 1. CRÉER LE CLIENT DANS SHOPIFY (REST API)
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
      
      // Vérifier si c'est un doublon d'email
      if (errorData.errors?.email) {
        return res.status(400).json({ 
          error: 'Cet email est déjà utilisé sur Shopify' 
        })
      }
      
      return res.status(400).json({ 
        error: 'Erreur lors de la création du compte Shopify',
        details: errorData.errors
      })
    }

    const shopifyData = await shopifyResponse.json()
    console.log('✅ Client Shopify créé:', shopifyData.customer.id)

    const shopifyCustomerId = shopifyData.customer.id.toString()

  // 2. CRÉER LE CLIENT DANS SUPABASE
console.log('💾 Création client Supabase...')

const hashedPassword = await bcrypt.hash(password, 10)

const { data: newUser, error: insertError } = await supabase
  .from('customers')
  .insert([
    {
      email,
      password_hash: hashedPassword,  // ✅ Correct
      first_name: firstName,
      last_name: lastName,
      shopify_customer_id: shopifyCustomerId
    }
  ])
  .select()
  .single()

if (insertError) {
  console.error('❌ Erreur Supabase:', insertError)
  
  // Gérer le cas d'email en double (code PostgreSQL 23505)
  if (insertError.code === '23505') {
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
      console.log('🗑️ Client Shopify supprimé (rollback)')
    } catch (deleteError) {
      console.error('❌ Erreur lors du rollback:', deleteError)
    }
    
    return res.status(400).json({ 
      error: 'Cet email est déjà utilisé'
    })
  }
  
  // Autres erreurs - rollback aussi
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
    console.log('🗑️ Client Shopify supprimé (rollback)')
  } catch (deleteError) {
    console.error('❌ Erreur lors du rollback:', deleteError)
  }
  
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
