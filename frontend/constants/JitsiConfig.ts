/**
 * Jitsi Meet Configuration
 * 
 * Uses the free public Jitsi Meet server (meet.jit.si).
 * No API keys required for basic usage.
 */

// Jitsi domain — public and free
export const JITSI_DOMAIN = 'meet.jit.si';

// Default Jitsi interface config
export const JITSI_INTERFACE_CONFIG = {
    DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
    MOBILE_APP_PROMO: false,
    SHOW_CHROME_EXTENSION_BANNER: false,
};

// Default Jitsi config overrides
export const JITSI_CONFIG = {
    startWithAudioMuted: false,
    startWithVideoMuted: false,
    disableDeepLinking: true,
    prejoinPageEnabled: false,
};

/**
 * Build a Jitsi Meet URL for a given room name
 */
export function getJitsiMeetUrl(roomName: string, domain?: string): string {
    const d = domain || JITSI_DOMAIN;
    return `https://${d}/${roomName}`;
}

/**
 * Get room name from live class ID
 */
export function getRoomName(classId: number | string): string {
    return `mentiq_live_class_${classId}`;
}

/**
 * Validate Jitsi configuration
 */
export function validateJitsiConfig(): boolean {
    if (!JITSI_DOMAIN) {
        console.warn('Jitsi domain not configured.');
        return false;
    }
    return true;
}
