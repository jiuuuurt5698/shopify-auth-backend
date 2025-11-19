const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN
const STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN
const STOREFRONT_API_URL = `https://${SHOPIFY_DOMAIN}/api/2024-10/graphql.json`

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
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' })
    }

    const loginQuery = `
      mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
        customerAccessTokenCreate(input: $input) {
          customerAccessToken {
            accessToken
            expiresAt
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `

    const loginResponse = await fetch(STOREFRONT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        query: loginQuery,
        variables: {
          input: { email, password }
        }
      })
    })

    const loginData = await loginResponse.json()

    if (loginData.errors || loginData.data.customerAccessTokenCreate.customerUserErrors.length > 0) {
      const errorMessage = loginData.data.customerAccessTokenCreate.customerUserErrors.length > 0
        ? loginData.data.customerAccessTokenCreate.customerUserErrors[0].message
        : 'Erreur de connexion'
      return res.status(401).json({ error: errorMessage })
    }

    const accessToken = loginData.data.customerAccessTokenCreate.customerAccessToken.accessToken

    const customerQuery = `
      query getCustomer($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) {
          id
          email
          firstName
          lastName
          phone
          metafield(namespace: "loyalty", key: "points") {
            value
          }
        }
      }
    `

    const customerResponse = await fetch(STOREFRONT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        query: customerQuery,
        variables: { customerAccessToken: accessToken }
      })
    })

    const customerData = await customerResponse.json()
    const customer = customerData.data.customer

    return res.status(200).json({
      success: true,
      user: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        loyaltyPoints: parseInt(customer.metafield?.value || "0"),
        accessToken: accessToken
      }
    })
  } catch (error) {
    console.error('Signin Error:', error)
    return res.status(500).json({ 
      error: 'Erreur serveur', 
      details: error.message 
    })
  }
}
