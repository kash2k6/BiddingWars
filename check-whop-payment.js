// Using built-in fetch

const WHOP_API_KEY = 'uywAI0dSirBxNpE0mp46gz-aw03o4e2QaNfODac5hS0'

async function checkWhopPayment(planId) {
  console.log(`🔍 Checking Whop payment status for plan: ${planId}`)
  
  try {
    // First, get payments for this plan
    const paymentsResponse = await fetch(`https://api.whop.com/v5/app/payments?plan_id=${planId}&in_app_payments=true`, {
      headers: {
        'Authorization': `Bearer ${WHOP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!paymentsResponse.ok) {
      console.error(`Failed to fetch payments for plan ${planId}: ${paymentsResponse.status}`)
      return
    }
    
    const paymentsData = await paymentsResponse.json()
    console.log(`Payments for plan ${planId}:`, JSON.stringify(paymentsData, null, 2))
    
    if (paymentsData.data && paymentsData.data.length > 0) {
      const payment = paymentsData.data[0]
      console.log(`\nPayment ID: ${payment.id}`)
      console.log(`Status: ${payment.status}`)
      console.log(`Paid at: ${payment.paid_at}`)
      console.log(`Amount: $${payment.amount_cents / 100}`)
      console.log(`Refunded: ${payment.refunded_at ? 'Yes' : 'No'}`)
    } else {
      console.log(`No payments found for plan ${planId}`)
    }
    
  } catch (error) {
    console.error(`Error checking payment for plan ${planId}:`, error)
  }
}

async function checkAllPayments() {
  console.log('🔍 Checking all Whop payments...\n')
  
  const planIds = [
    'plan_Eylml6KOsAbWD',
    'plan_gEecES03lj9QP'
  ]
  
  for (const planId of planIds) {
    await checkWhopPayment(planId)
    console.log('---')
  }
}

checkAllPayments()
