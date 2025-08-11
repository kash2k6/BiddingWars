// Gamified bid terminology for Bidding Wars
export interface BidTerminology {
  term: string
  emoji: string
  color: string
  description: string
}

export function getBidTerminology(amount: number, previousAmount: number): BidTerminology {
  const increment = amount - previousAmount
  const incrementPercent = (increment / previousAmount) * 100

  // Nuclear strikes (massive bids)
  if (incrementPercent >= 100) {
    return {
      term: "NUCLEAR STRIKE",
      emoji: "☢️",
      color: "from-red-600 to-red-800",
      description: "Massive overkill! You've obliterated the competition!"
    }
  }

  // Heavy artillery (big bids)
  if (incrementPercent >= 50) {
    return {
      term: "HEAVY ARTILLERY",
      emoji: "💥",
      color: "from-orange-500 to-red-600",
      description: "Heavy firepower deployed! The battlefield is yours!"
    }
  }

  // Tank drop (significant bids)
  if (incrementPercent >= 25) {
    return {
      term: "TANK DROP",
      emoji: "🛡️",
      color: "from-yellow-500 to-orange-600",
      description: "Tank deployed! You're rolling over the competition!"
    }
  }

  // Big guns (moderate bids)
  if (incrementPercent >= 15) {
    return {
      term: "BIG GUNS",
      emoji: "🔫",
      color: "from-blue-500 to-purple-600",
      description: "Big guns blazing! You mean business!"
    }
  }

  // Standard shot (normal bids)
  if (incrementPercent >= 5) {
    return {
      term: "STANDARD SHOT",
      emoji: "🎯",
      color: "from-green-500 to-blue-600",
      description: "Precise shot fired! Target acquired!"
    }
  }

  // Minimum bid
  return {
    term: "MINIMUM BID",
    emoji: "⚡",
    color: "from-gray-500 to-gray-600",
    description: "Minimum firepower deployed. Every shot counts!"
  }
}

export function getBidSuccessMessage(terminology: BidTerminology): string {
  const messages = [
    `${terminology.emoji} ${terminology.term} DEPLOYED! ${terminology.emoji}`,
    `${terminology.emoji} MISSION ACCOMPLISHED! ${terminology.emoji}`,
    `${terminology.emoji} TARGET ELIMINATED! ${terminology.emoji}`,
    `${terminology.emoji} VICTORY SECURED! ${terminology.emoji}`,
    `${terminology.emoji} BATTLEFIELD DOMINATED! ${terminology.emoji}`
  ]
  
  return messages[Math.floor(Math.random() * messages.length)]
}

export function getBidAmountDescription(amount: number): string {
  if (amount >= 10000) return "EPIC WAR CHEST"
  if (amount >= 5000) return "MASSIVE ARSENAL"
  if (amount >= 1000) return "HEAVY FIREPOWER"
  if (amount >= 500) return "SERIOUS WEAPONRY"
  if (amount >= 100) return "STANDARD GEAR"
  return "BASIC EQUIPMENT"
}
