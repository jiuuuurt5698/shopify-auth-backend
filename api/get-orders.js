export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email } = req.query
  console.log("🔍 Demande de commandes reçue pour:", email)

  if (!email) {
    return res.status(400).json({ error: "Email required" })
  }

  const SHOPIFY_DOMAIN = "f8bnjk-2f.myshopify.com"
  const ADMIN_API_URL = `https://${SHOPIFY_DOMAIN}/admin/api/2024-10/graphql.json`

  const query = `
    query getCustomerOrders($email: String!) {
      customers(first: 1, query: $email) {
        edges {
          node {
            orders(first: 50, reverse: true, sortKey: PROCESSED_AT) {
              edges {
                node {
                  id
                  name
                  processedAt
                  totalPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  displayFulfillmentStatus
                  fulfillments(first: 1) {
                    trackingInfo {
                      number
                      url
                    }
                  }
                  lineItems(first: 10) {
                    edges {
                      node {
                        title
                        quantity
                        variantTitle
                        image {
                          url
                          altText
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `

  try {
    console.log("📡 Appel à Shopify Admin API...")

    const response = await fetch(ADMIN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_API_TOKEN,
      },
      body: JSON.stringify({
        query,
        variables: {
          email: `email:${email}`,
        },
      }),
    })

    const data = await response.json()
    console.log("📦 Réponse Shopify:", JSON.stringify(data, null, 2))

    if (data.errors) {
      console.error("❌ Erreur GraphQL:", data.errors)
      return res.status(400).json({ error: data.errors[0].message })
    }

    const customer = data.data?.customers?.edges[0]?.node
    
    if (!customer) {
      console.log("⚠️ Client introuvable")
      return res.status(200).json({ orders: [] })
    }

    const orders = customer.orders.edges.map(({ node }) => {
      const tracking = node.fulfillments?.[0]?.trackingInfo?.[0]
      
      return {
        id: node.name.replace("#", ""),
        date: new Date(node.processedAt).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        montant: parseFloat(node.totalPriceSet.shopMoney.amount),
        currency: node.totalPriceSet.shopMoney.currencyCode,
        statut:
          node.displayFulfillmentStatus === "FULFILLED"
            ? "Livré"
            : node.displayFulfillmentStatus === "PARTIALLY_FULFILLED"
              ? "Partiellement livré"
              : "En cours",
        produits: node.lineItems.edges
          .map(({ node: item }) => `${item.title} (x${item.quantity})`)
          .join(", "),
        items: node.lineItems.edges.map(({ node: item }) => ({
          title: item.title,
          quantity: item.quantity,
          image: item.image?.url || null,
          variant: item.variantTitle || "Default Title",
        })),
        trackingNumber: tracking?.number || null,
        trackingUrl: tracking?.url || null,
      }
    })

    console.log("✅ Nombre de commandes trouvées:", orders.length)

    return res.status(200).json({ orders })
  } catch (error) {
    console.error("❌ Erreur serveur:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
