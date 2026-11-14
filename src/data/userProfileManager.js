/**
 * @fileoverview Astronaut Cadet Account & Progress Management
 * Allows players to create personalized profiles, login with a callsign & PIN,
 * track career stats (Sols survived, missions completed, stars), and switch accounts.
 */

import { useState, useEffect } from 'react';

const STORAGE_KEY_PROFILES = 'moonwatch_player_profiles_v1';
const STORAGE_KEY_ACTIVE_ID = 'moonwatch_active_player_id_v1';

export const AVATAR_OPTIONS = [
  { id: 'astro-female', emoji: '👩‍🚀', label: 'Commander' },
  { id: 'astro-male', emoji: '👨‍🚀', label: 'Navigator' },
  { id: 'astro-cadet', emoji: '🧑‍🚀', label: 'Cadet' },
  { id: 'astro-pilot', emoji: '🛰️', label: 'Pilot' },
  { id: 'astro-ufo', emoji: '🛸', label: 'Explorer' },
  { id: 'astro-alien', emoji: '👾', label: 'Cosmic Scout' },
];

function createDefaultGuest() {
  return {
    id: 'guest-cadet',
    callsign: 'Cadet Explorer',
    avatar: '👩‍🚀',
    pin: '',
    isGuest: true,
    totalSolsSurvived: 0,
    missionsCompleted: 0,
    bestSols: { 1: 0, 2: 0, 3: 0 },
    unlockedLevels: [1],
    stars: 0,
    createdAt: new Date().toISOString(),
    lastPlayed: new Date().toISOString(),
  };
}

/**
 * Loads all stored profiles from localStorage.
 * @returns {Array<Object>}
 */
export function getAllProfiles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[ProfileManager] Failed to load profiles:', err);
    return [];
  }
}

/**
 * Saves the list of profiles to localStorage.
 * @param {Array<Object>} profiles
 */
function saveAllProfiles(profiles) {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
    window.dispatchEvent(new CustomEvent('moonwatch-profile-updated'));
  } catch (err) {
    console.warn('[ProfileManager] Failed to save profiles:', err);
  }
}

/**
 * Gets the currently active cadet profile.
 * @returns {Object}
 */
export function getActiveProfile() {
  try {
    const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
    if (!activeId) return createDefaultGuest();

    const profiles = getAllProfiles();
    const found = profiles.find((p) => p.id === activeId);
    return found || createDefaultGuest();
  } catch (err) {
    return createDefaultGuest();
  }
}

/**
 * Sets the active profile by ID.
 * @param {string} profileId
 */
export function setActiveProfile(profileId) {
  try {
    if (profileId === 'guest-cadet' || !profileId) {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
    } else {
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, profileId);
    }
    window.dispatchEvent(new CustomEvent('moonwatch-profile-updated'));
  } catch (err) {
    console.warn('[ProfileManager] Failed to set active profile:', err);
  }
}

/**
 * Logs in or creates a new cadet account.
 * @param {Object} params
 * @param {string} params.callsign
 * @param {string} params.avatar
 * @param {string} [params.pin]
 * @returns {{ success: boolean, profile?: Object, error?: string, isNew?: boolean }}
 */
export function loginOrCreateAccount({ callsign, avatar = '👩‍🚀', pin = '' }) {
  const cleanName = String(callsign || '').trim();
  if (!cleanName || cleanName.length < 2) {
    return { success: false, error: 'Callsign must be at least 2 characters long!' };
  }

  const cleanPin = String(pin || '').trim();
  const profiles = getAllProfiles();
  const existing = profiles.find(
    (p) => p.callsign.toLowerCase() === cleanName.toLowerCase()
  );

  if (existing) {
    // If account has a PIN set, verify it
    if (existing.pin && existing.pin !== cleanPin) {
      return { success: false, error: 'Incorrect PIN for this Cadet Callsign!' };
    }
    // Update last played & avatar if provided
    existing.lastPlayed = new Date().toISOString();
    if (avatar) existing.avatar = avatar;
    saveAllProfiles(profiles);
    setActiveProfile(existing.id);
    return { success: true, profile: existing, isNew: false };
  }

  // Create new profile
  const newProfile = {
    id: `cadet-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    callsign: cleanName,
    avatar: avatar || '👩‍🚀',
    pin: cleanPin,
    isGuest: false,
    totalSolsSurvived: 0,
    missionsCompleted: 0,
    bestSols: { 1: 0, 2: 0, 3: 0 },
    unlockedLevels: [1],
    stars: 0,
    createdAt: new Date().toISOString(),
    lastPlayed: new Date().toISOString(),
  };

  profiles.push(newProfile);
  saveAllProfiles(profiles);
  setActiveProfile(newProfile.id);
  return { success: true, profile: newProfile, isNew: true };
}

/**
 * Logs out to default guest profile.
 */
export function logoutToGuest() {
  setActiveProfile('guest-cadet');
}

/**
 * Records mission completion or progress for the active profile.
 * @param {Object} results
 * @param {number} results.level
 * @param {number} results.solsSurvived
 * @param {boolean} results.victory
 * @param {number} [results.score]
 */
export function recordMissionProgress({ level = 1, solsSurvived = 0, victory = false, score = 0 }) {
  const active = getActiveProfile();
  if (active.isGuest) return; // Guests don't persist career stats

  const profiles = getAllProfiles();
  const target = profiles.find((p) => p.id === active.id);
  if (!target) return;

  target.totalSolsSurvived = (target.totalSolsSurvived || 0) + solsSurvived;
  target.lastPlayed = new Date().toISOString();

  if (!target.bestSols) target.bestSols = {};
  target.bestSols[level] = Math.max(target.bestSols[level] || 0, solsSurvived);

  if (victory) {
    target.missionsCompleted = (target.missionsCompleted || 0) + 1;
    target.stars = (target.stars || 0) + level;
    if (!target.unlockedLevels) target.unlockedLevels = [1];
    if (level < 3 && !target.unlockedLevels.includes(level + 1)) {
      target.unlockedLevels.push(level + 1);
    }
  }

  saveAllProfiles(profiles);
}

/**
 * React hook to subscribe to active profile changes.
 * @returns {Object}
 */
export function useActiveProfile() {
  const [profile, setProfile] = useState(() => getActiveProfile());

  useEffect(() => {
    const handleUpdate = () => {
      setProfile(getActiveProfile());
    };
    window.addEventListener('moonwatch-profile-updated', handleUpdate);
    return () => window.removeEventListener('moonwatch-profile-updated', handleUpdate);
  }, []);

  return profile;
}

