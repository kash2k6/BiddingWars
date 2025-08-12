# Sound Effects for Bidding Wars

This directory contains sound effects for the Bidding Wars application.

## Required Sound Files

1. **bomb-explosion.mp3** - Played when placing a bid (explosion/bomb sound)
2. **dramatic-entrance.mp3** - Played when entering auction detail pages (dramatic/military sound)
3. **victory-fanfare.mp3** - Played when winning an auction (triumphant sound)
4. **alert-warning.mp3** - Played when outbid (warning/alert sound)
5. **button-click.mp3** - Played for general button interactions (click sound)

## Sound Specifications

- **Format**: MP3
- **Quality**: 128kbps or higher
- **Duration**: 1-3 seconds for most effects
- **Volume**: Normalized to -12dB for consistent levels

## Military Theme Suggestions

- **bomb-explosion.mp3**: Deep explosion with echo
- **dramatic-entrance.mp3**: Military drum roll or trumpet fanfare
- **victory-fanfare.mp3**: Triumphant military march
- **alert-warning.mp3**: Radar ping or military alert
- **button-click.mp3**: Mechanical click or gear sound

## Implementation

The sounds are managed by the `SoundManager` class in `src/lib/sound-effects.ts` and are automatically preloaded when the app starts.

## Fallback

If sound files are not available, the app will continue to function normally without audio effects.
