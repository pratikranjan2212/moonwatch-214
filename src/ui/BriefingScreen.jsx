// src/ui/BriefingScreen.jsx
import React, { useState } from 'react';

const LEVEL_BRIEFINGS = {
  1: {
    rank: '🌱 CADET MISSION',
    title: 'Level 1: Power Basics',
    sols: 14,
    accent: '#fbbf24',
    summary:
      'Welcome to Shackleton Rim Outpost! Survive 14 Sols by charging your solar batteries during the day and raising your Shield Dome when solar flares strike.',
    includes: [
      { icon: '☀️', label: 'Solar Panels [1/P]', desc: 'Extend for power, retract during storms' },
      { icon: '🛡️', label: 'Shield Dome [2/S]', desc: 'Blocks radiation from NASA solar flares' },
      { icon: '🫧', label: 'Oxygen Core [3/O]', desc: 'Keep cabin air safe for your crew' },
    ],
    objectives: [
      'Survive 14 Sols across two lunar day-night cycles.',
      'Retract Solar Panels & raise Shield Dome before CME alerts hit.',
      'Keep Crew Health and Oxygen above 0%.',
    ],
  },
  2: {
    rank: '🚀 PILOT MISSION',
    title: 'Level 2: Life Support & Hydroponic Greenhouse',
    sols: 21,
    accent: '#38bdf8',
    summary:
      'Extend operations to 21 Sols! Rising cabin CO₂ drains extra oxygen each Sol. Water and tend Soli’s greenhouse to naturally scrub CO₂ and keep the crew healthy.',
    includes: [
      { icon: '🌱', label: 'Hydroponic Greenhouse [4/G]', desc: 'Grows dwarf-wheat & adds +9 O₂/Sol' },
      { icon: '🫧', label: 'CO₂ Scrubber Control', desc: 'Balances rising cabin carbon dioxide' },
      { icon: '⚡', label: 'Multi-Sol Solar Storms', desc: 'Longer flares requiring smart battery reserves' },
    ],
    objectives: [
      'Survive 21 Sols across three lunar day-night cycles.',
      'Water and tend the Greenhouse [4/G] to offset CO₂ build-up (+9 O₂/Sol).',
      'Protect the crew from multi-Sol CMEs and dust storms.',
    ],
  },
  3: {
    rank: '👑 COMMANDER MISSION',
    title: 'Level 3: Deep Space Comms & Earth Delay',
    sols: 28,
    accent: '#a855f7',
    summary:
      'Take full command for 28 Sols! Severe space weather disrupts radio waves. Aim the High-Gain Dish to beam emergency telemetry back to Earth.',
    includes: [
      { icon: '📡', label: 'Earth Comms Queue [5/C]', desc: 'Send telemetry bursts between solar storms' },
      { icon: '🛰️', label: 'High-Gain Antenna Sync', desc: 'Earn science boosts from Mission Control' },
      { icon: '🌪️', label: 'Extreme Solar Weather', desc: 'Master all 5 base stations simultaneously' },
    ],
    objectives: [
      'Survive all 28 Sols at Shackleton Rim Outpost.',
      'Queue Earth Comms [5/C] during clear space-weather windows.',
      'Keep every base system balanced until rescue arrival on Sol 28.',
    ],
  },
};

export const CREW_ROSTER = [
  {
    id: 'nova',
    name: 'Commander Nova',
    role: 'Mission Commander',
    vibe: 'Calm & Decisive',
    avatar: '👩‍🚀',
    suitColor: '#f8fafc',
    visorColor: '#f59e0b',
    accent: '#fbbf24',
    perk: '⭐ +15% Shield Dome Efficiency',
    bio: 'Leads Shackleton Outpost. Coordinates power, shielding, and crew safety across the lunar day-night cycle.',
  },
  {
    id: 'kip',
    name: 'Kip Vance',
    role: 'Chief Engineer',
    vibe: 'Practical & Funny',
    avatar: '🧑‍🔧',
    suitColor: '#fed7aa',
    visorColor: '#38bdf8',
    accent: '#fb923c',
    perk: '⚡ +20% Solar Battery Charge',
    bio: 'Keeps the solar array and battery bank humming even when lunar dust coats the hinges.',
  },
  {
    id: 'mei',
    name: 'Dr. Mei Lin',
    role: 'Flight Doctor',
    vibe: 'Gentle & Cautious',
    avatar: '👩‍⚕️',
    suitColor: '#e0f2fe',
    visorColor: '#34d399',
    accent: '#38bdf8',
    perk: '❤️ Slower Oxygen Drain',
    bio: 'Monitors cabin oxygen and radiation dosimeters so every crew member stays fit for lunar duty.',
  },
  {
    id: 'soli',
    name: 'Soli Patel',
    role: 'Space Botanist',
    vibe: 'Cheerful & Nature-Loving',
    avatar: '🧑‍🌾',
    suitColor: '#dcfce7',
    visorColor: '#a3e635',
    accent: '#4ade80',
    perk: '🌱 +3 Extra O₂ from Greenhouse',
    bio: 'Tends the hydroponic dwarf-wheat dome that scrubs CO₂ and boosts fresh oxygen.',
  },
  {
    id: 'juno',
    name: 'Juno Reyes',
    role: 'Comms & Rover Pilot',
    vibe: 'Bold & Restless',
    avatar: '🛰️',
    suitColor: '#f3e8ff',
    visorColor: '#c084fc',
    accent: '#c084fc',
    perk: '📡 Faster Earth Comms Sync',
    bio: 'Steers the lunar rover and aligns the high-gain dish to keep Earth telemetry locked.',
  },
];

export default function BriefingScreen({
  selectedLevel = 1,
  selectedCharacter,
  onSelectCharacter,
  onBackToWelcome,
  onStartGame,
}) {
  const [showTutorial, setShowTutorial] = useState(false);
  const briefing = LEVEL_BRIEFINGS[selectedLevel] || LEVEL_BRIEFINGS[1];
  const activeCrew =
    CREW_ROSTER.find((c) => c.id === selectedCharacter?.id) || CREW_ROSTER[0];

  return (
    <div className="welcome-overlay">
      <div className="briefing-card">
        {/* Top Outpost Pill & Level Title (Seed # removed for kid-friendly clarity) */}
        <header className="briefing-header">
          <div>
            <div className="outpost-pill" style={{ borderColor: briefing.accent, color: briefing.accent }}>
              SHACKLETON RIM OUTPOST • {briefing.rank}
            </div>
            <h1 className="briefing-title">{briefing.title}</h1>
          </div>
          <div className="sol-target-badge" style={{ borderColor: briefing.accent }}>
            <span>MISSION LENGTH</span>
            <strong style={{ color: briefing.accent }}>{briefing.sols} Sols</strong>
          </div>
        </header>

        <p className="briefing-summary">{briefing.summary}</p>

        {/* Two-Column Visual Breakdown: What's Included + Primary Objectives */}
        <div className="briefing-details-grid">
          <div className="briefing-box">
            <div className="briefing-box-title">🧰 WHAT THIS LEVEL INCLUDES</div>
            <div className="includes-list">
              {briefing.includes.map((item) => (
                <div key={item.label} className="include-item">
                  <span className="include-icon">{item.icon}</span>
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.desc}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="briefing-box objectives-box" style={{ borderLeftColor: briefing.accent }}>
            <div className="briefing-box-title">🎯 PRIMARY MISSION OBJECTIVES</div>
            <ul className="objectives-list">
              {briefing.objectives.map((obj) => (
                <li key={obj}>{obj}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Character / Crew Roster Selector */}
        <div className="roster-header">
          <span>🧑‍🚀 CHOOSE YOUR ASTRONAUT CHARACTER</span>
          <span style={{ color: activeCrew.accent }}>
            Playing as: {activeCrew.name} ({activeCrew.perk})
          </span>
        </div>

        <div className="crew-grid">
          {CREW_ROSTER.map((member) => {
            const isSelected = activeCrew.id === member.id;
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => onSelectCharacter(member)}
                className={`crew-card ${isSelected ? 'selected' : ''}`}
                style={{ '--crew-accent': member.accent }}
              >
                <div className="crew-top">
                  <span className="crew-avatar">{member.avatar}</span>
                  {isSelected && <span className="crew-picked">✓ SELECTED</span>}
                </div>
                <strong className="crew-name">{member.name}</strong>
                <div className="crew-role" style={{ color: member.accent }}>
                  {member.role} • {member.vibe}
                </div>
                <p className="crew-bio">{member.bio}</p>
                <div className="crew-perk">{member.perk}</div>
              </button>
            );
          })}
        </div>

        {/* Bottom Navigation Bar */}
        <footer className="welcome-footer">
          <button
            type="button"
            className="menu-btn"
            onClick={onBackToWelcome}
          >
            ← Back to Levels
          </button>

          <div className="secondary-actions">
            <button
              type="button"
              className="menu-btn tutorial-btn"
              onClick={() => setShowTutorial(true)}
            >
              ❓ Launch Tutorial
            </button>
            <button
              type="button"
              className="start-mission-btn"
              onClick={onStartGame}
            >
              🚀 Start Sol 1 →
            </button>
          </div>
        </footer>
      </div>

      {/* Quick Tutorial Popup */}
      {showTutorial && (
        <div className="modal-backdrop" onClick={() => setShowTutorial(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2>🕹️ Controls for {activeCrew.name}</h2>
            <ul className="tutorial-list">
              <li><code>1 / P</code> — Toggle Solar Panels (Extended / Retracted)</li>
              <li><code>2 / S</code> — Toggle Shield Dome (On / Off)</li>
              <li><code>3 / O</code> — Cycle Oxygen Level (Low / Normal / High)</li>
              <li><code>4 / G</code> — Water Greenhouse (Level 2+)</li>
              <li><code>5 / C</code> — Queue Earth Comms (Level 3)</li>
              <li><code>Space / Enter</code> — Advance to Next Sol</li>
              <li><code>Esc</code> — Dismiss Solar Flare Alert</li>
            </ul>
            <button
              type="button"
              className="start-mission-btn"
              onClick={() => setShowTutorial(false)}
            >
              Ready for Launch!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
