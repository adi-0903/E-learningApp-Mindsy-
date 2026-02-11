/**
 * Jitsi Meet Service
 * 
 * Provides Jitsi integration for live classes.
 * Uses WebView-based embedding via the Jitsi Meet URL.
 * No native SDK required — works via URL launch or WebView.
 */

import { Linking } from 'react-native';
import { JITSI_DOMAIN, JITSI_CONFIG, getJitsiMeetUrl } from '@/constants/JitsiConfig';

export interface JitsiMeetConfig {
  roomName: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  isHost?: boolean;
  domain?: string;
}

export interface JitsiMeetInfo {
  domain: string;
  roomName: string;
  meetingUrl: string;
  isHost: boolean;
}

class JitsiMeetService {
  private currentRoom: string | null = null;
  private isActive = false;

  /**
   * Build meeting info for a room
   */
  getMeetingInfo(config: JitsiMeetConfig): JitsiMeetInfo {
    const domain = config.domain || JITSI_DOMAIN;
    return {
      domain,
      roomName: config.roomName,
      meetingUrl: getJitsiMeetUrl(config.roomName, domain),
      isHost: config.isHost || false,
    };
  }

  /**
   * Open Jitsi meeting in external browser
   */
  async openInBrowser(config: JitsiMeetConfig): Promise<void> {
    const info = this.getMeetingInfo(config);

    // Build URL with config params
    const params = new URLSearchParams();
    if (config.displayName) {
      params.set('userInfo.displayName', config.displayName);
    }
    if (config.email) {
      params.set('userInfo.email', config.email);
    }
    if (JITSI_CONFIG.startWithAudioMuted) {
      params.set('config.startWithAudioMuted', 'true');
    }
    if (JITSI_CONFIG.startWithVideoMuted) {
      params.set('config.startWithVideoMuted', 'true');
    }

    const separator = info.meetingUrl.includes('?') ? '&' : '#';
    const fullUrl = `${info.meetingUrl}${separator}${params.toString()}`;

    const canOpen = await Linking.canOpenURL(fullUrl);
    if (canOpen) {
      await Linking.openURL(fullUrl);
      this.currentRoom = config.roomName;
      this.isActive = true;
    } else {
      throw new Error('Cannot open Jitsi Meet URL');
    }
  }

  /**
   * Get the WebView URL for embedding Jitsi
   */
  getWebViewUrl(config: JitsiMeetConfig): string {
    const info = this.getMeetingInfo(config);
    const params: string[] = [];

    if (config.displayName) {
      params.push(`userInfo.displayName="${encodeURIComponent(config.displayName)}"`);
    }
    if (config.email) {
      params.push(`userInfo.email="${encodeURIComponent(config.email)}"`);
    }
    if (JITSI_CONFIG.prejoinPageEnabled === false) {
      params.push('config.prejoinPageEnabled=false');
    }

    return params.length > 0
      ? `${info.meetingUrl}#${params.join('&')}`
      : info.meetingUrl;
  }

  /**
   * Leave the current meeting
   */
  leave(): void {
    this.currentRoom = null;
    this.isActive = false;
  }

  /**
   * Check if currently in a meeting
   */
  isInMeeting(): boolean {
    return this.isActive;
  }

  /**
   * Get current room name
   */
  getCurrentRoom(): string | null {
    return this.currentRoom;
  }
}

// Export singleton instance
export const jitsiMeetService = new JitsiMeetService();
