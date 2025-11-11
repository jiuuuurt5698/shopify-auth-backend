const fetch = require('node-fetch');

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

const ADMIN_API_URL = `https://${SHOPIFY_DOMAIN}/admin/api/2024-10/graphql.json`;
const STOREFRONT_API_URL = `https://${SHOPIFY_DOMAIN}/api/2024-10/graphql.json`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    if (password.length < 5) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 5 caractères' });
    }

    // Créer le client via Admin API (pas d'email de confirmation)
    const createCustomerQuery = `
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
    `;

    const createResponse = await fetch(ADMIN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ADMIN_API_TOKEN,
      },
      body: JSON.stringify({
        query: createCustomerQuery,
        variables: {
          input: {
            email,
            firstName,
            lastName,
            password,
            passwordConfirmation: password,
            verifiedEmail: true,
          }
        }
      })
    });

    const createData = await createResponse.json();

    if (createData.errors || createData.data.customerCreate.userErrors.length > 0) {
      const errorMessage = createData.errors 
        ? createData.errors[0].message 
        : createData.data.customerCreate.userErrors[0].message;
      return res.status(400).json({ error: errorMessage });
    }

    // Connecter le client
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
      return res.status(400).json({ error: 'Compte créé mais erreur de connexion' });
    }

    const accessToken = loginData.data.customerAccessTokenCreate.customerAccessToken.accessToken;

    // Récupérer les infos du client
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
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};
