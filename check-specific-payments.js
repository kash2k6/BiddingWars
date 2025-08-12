// Using built-in fetch

const WHOP_API_KEY = 'uywAI0dSirBxNpE0mp46gz-aw03o4e2QaNfODac5hS0'

async function checkSpecificPayments() {
  console.log('🔍 Checking specific plan IDs...\n')
  
  const planIds = [
    'plan_Eylml6KOsAbWD',
    'plan_gEecES03lj9QP'
  ]
  
  for (const planId of planIds) {
    console.log(`\n=== Checking plan: ${planId} ===`)
    
    try {
      const response = await fetch(`https://api.whop.com/v5/app/payments?plan_id=${planId}&in_app_payments=true`, {
        headers: {
          'Authorization': `Bearer ${WHOP_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        console.error(`Failed to fetch payments for plan ${planId}: ${response.status}`)
        continue
      }
      
      const data = await response.json()
      
      if (data.data && data.data.length > 0) {
        console.log(`Found ${data.data.length} payments for plan ${planId}:`)
        data.data.forEach((payment, index) => {
          console.log(`\nPayment ${index + 1}:`)
          console.log(`  ID: ${payment.id}`)
          console.log(`  Status: ${payment.status}`)
          console.log(`  User ID: ${payment.user_id}`)
          console.log(`  Amount: $${payment.final_amount / 100}`)
          console.log(`  Paid at: ${payment.paid_at}`)
          console.log(`  Refunded: ${payment.refunded_at ? 'Yes' : 'No'}`)
        })
      } else {
        console.log(`No payments found for plan ${planId}`)
      }
      
    } catch (error) {
      console.error(`Error checking plan ${planId}:`, error)
    }
  }
}

checkSpecificPayments()
