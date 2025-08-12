// Sound effects utility for Bidding Wars
export class SoundManager {
  private static sounds: Map<string, HTMLAudioElement> = new Map()

  static async preloadSounds() {
    const soundFiles = {
      'bid-explosion': '/sounds/BidClick.wav',
      'page-entrance': '/sounds/Moredetailspageload.wav',
      'auction-won': '/sounds/bidwinner.wav',
      'auction-ending': '/sounds/10seccountdownbid ending.wav',
      'error': '/sounds/error.wav',
      'outbid': '/sounds/error.wav' // Using error sound for outbid alerts
    }

    for (const [name, path] of Object.entries(soundFiles)) {
      try {
        const audio = new Audio(path)
        audio.preload = 'auto'
        audio.volume = 0.6
        this.sounds.set(name, audio)
      } catch (error) {
        console.log(`Could not preload sound ${name}:`, error)
      }
    }
  }

  static async playSound(soundName: string, volume: number = 0.6) {
    try {
      const audio = this.sounds.get(soundName)
      if (audio) {
        audio.currentTime = 0
        audio.volume = volume
        await audio.play()
      }
    } catch (error) {
      console.log(`Could not play sound ${soundName}:`, error)
    }
  }

  static async playBidSound() {
    await this.playSound('bid-explosion', 0.7)
  }

  static async playPageEntrance() {
    await this.playSound('page-entrance', 0.4)
  }

  static async playAuctionWon() {
    await this.playSound('auction-won', 0.8)
  }

  static async playOutbid() {
    await this.playSound('outbid', 0.5)
  }

  static async playButtonClick() {
    await this.playSound('button-click', 0.3)
  }

  static async playAuctionEnding() {
    await this.playSound('auction-ending', 0.6)
  }

  static async playError() {
    await this.playSound('error', 0.4)
  }
}

// Initialize sounds when the module is loaded
if (typeof window !== 'undefined') {
  SoundManager.preloadSounds()
}
