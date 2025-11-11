// api/signup.js
const fetch = require('node-fetch');

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

// REST API pour créer le client avec mot de passe
const ADMIN_REST_URL = `https://${SHOPIFY_DOMAIN}/admin/api/2024-10/customers.json`;
const STOREFRONT_API_URL = `https://${SHOPIFY_DOMAIN}/api/2024-10/graphql.json`;

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, firstName, lastName } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    if (password.length < 5) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 5 caractères' });
    }

    // 1. Créer le client via REST API (avec mot de passe et email vérifié)
    const createResponse = await fetch(ADMIN_REST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ADMIN_API_TOKEN,
      },
      body: JSON.stringify({
        customer: {
          email,
          first_name: firstName,
          last_name: lastName,
          password,
          password_confirmation: password,
          verified_email: true, // ✅ Pas d'email de confirmation
          send_email_welcome: false, // Pas d'email de bienvenue
        }
      })
    });

    const createData = await createResponse.json();

    // Vérifier les erreurs
    if (!createResponse.ok || createData.errors) {
      const errorMessage = createData.errors 
        ? Object.entries(createData.errors).map(([key, value]) => `${key}: ${value.join(', ')}`).join('; ')
        : 'Erreur lors de la création du compte';
      return res.status(400).json({ error: errorMessage });
    }

    // 2. Connecter le client via Storefront API pour obtenir un token
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
    `;

    // Petit délai pour que Shopify traite la création
    await new Promise(resolve => setTimeout(resolve, 1000));

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
    });

    const loginData = await loginResponse.json();

    if (loginData.errors || loginData.data.customerAccessTokenCreate.customerUserErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Compte créé mais erreur de connexion. Essayez de vous connecter manuellement.' 
      });
    }

    const accessToken = loginData.data.customerAccessTokenCreate.customerAccessToken.accessToken;

    // 3. Récupérer les infos du client avec le token
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
    `;

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
    });

    const customerData = await customerResponse.json();
    const customer = customerData.data.customer;

    // Retourner les données du client avec le token
    return res.status(200).json({
      success: true,
      user: {
        ...customer,
        loyaltyPoints: parseInt(customer.metafield?.value || "0"),
        accessToken
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Erreur serveur', 
      details: error.message 
    });
  }
};
