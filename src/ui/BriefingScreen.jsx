// src/ui/BriefingScreen.jsx
import React, { useState } from 'react';
import GameInfoModal from './GameInfoModal.jsx';

const LEVEL_BRIEFINGS = {
  1: {
    rank: 'CADET MISSION',
    title: 'Level 1: Power Basics',
    sols: 14,
    accent: '#fbbf24',
    summary:
      'Welcome to Moonbase Shackleton! Your goal is to survive 14 Days on the Moon. Collect sunlight to charge your base batteries, and turn ON your Shield Dome whenever dangerous space storms hit!',
    toolsTitle: '🛠️ YOUR BASE TOOLS',
    includes: [
      {
        icon: '☀️',
        name: 'Solar Panels',
        key: '1 / P',
        desc: 'Open in sunlight to charge batteries. Close during space storms!',
      },
      {
        icon: '🛡️',
        name: 'Shield Dome',
        key: '2 / S',
        desc: 'Turn ON to block dangerous radiation from NASA solar flares!',
      },
      {
        icon: '🫧',
        name: 'Oxygen Core',
        key: '3 / O',
        desc: 'Pumps clean, fresh air so your astronauts stay breathing.',
      },
    ],
    objectives: [
      'Survive all 14 Days (Sols) until your mission is complete!',
      'Close Solar Panels and raise Shield Dome before solar storms hit.',
      'Keep Crew Health and Oxygen safely above 0%!',
    ],
  },
  2: {
    rank: 'PILOT MISSION',
    title: 'Level 2: Life Support & Greenhouse',
    sols: 21,
    accent: '#38bdf8',
    summary:
      'Welcome to Level 2! Keep your moonbase alive for 21 Days. As your crew breathes, cabin CO₂ builds up — water your greenhouse to grow yummy space crops and make clean oxygen!',
    toolsTitle: '🛠️ YOUR BASE TOOLS',
    includes: [
      {
        icon: '🌱',
        name: 'Hydroponic Greenhouse',
        key: '4 / G',
        desc: 'Grows dwarf-wheat to scrub bad air and boost +9 extra Oxygen!',
      },
      {
        icon: '🫧',
        name: 'CO₂ Scrubber',
        key: '3 / O',
        desc: 'Balances stale cabin air so your astronauts stay energetic.',
      },
      {
        icon: '⚡',
        name: 'Long Solar Storms',
        key: '2 / S',
        desc: 'Bigger flares that test your battery power and shield timing.',
      },
    ],
    objectives: [
      'Survive all 21 Days (Sols) through lunar day and night.',
      'Water the Greenhouse [4/G] to clean bad air and boost Oxygen (+9/Sol).',
      'Shield your astronauts safely through multi-day solar storms.',
    ],
  },
  3: {
    rank: 'COMMANDER MISSION',
    title: 'Level 3: Deep Space Comms',
    sols: 28,
    accent: '#a855f7',
    summary:
      'The ultimate commander challenge! Take full charge of the base for 28 Days. Giant solar storms disrupt radio waves — align your satellite dish and beam emergency signals back to Earth!',
    toolsTitle: '🛠️ YOUR BASE TOOLS',
    includes: [
      {
        icon: '📡',
        name: 'Earth Radio Beam',
        key: '5 / C',
        desc: 'Send emergency weather data bursts back home to Earth!',
      },
      {
        icon: '🛰️',
        name: 'High-Gain Antenna',
        key: 'Auto',
        desc: 'Earn awesome science bonus points directly from Mission Control.',
      },
      {
        icon: '🌪️',
        name: 'Extreme Space Weather',
        key: '1–5',
        desc: 'Balance all 5 base stations at the same time like a true Commander.',
      },
    ],
    objectives: [
      'Survive all 28 Days (Sols) until the rescue shuttle arrives!',
      'Queue Earth Comms [5/C] whenever the space skies are clear.',
      'Keep power, oxygen, shields, and greenhouse balanced!',
    ],
  },
};

export const CREW_ROSTER = [
  {
    id: 'nova',
    name: 'Commander Nova',
    role: 'Captain',
    vibe: 'Shield Expert',
    avatar: '👩‍🚀',
    suitColor: '#f8fafc',
    visorColor: '#f59e0b',
    accent: '#fbbf24',
    perk: '⭐ +15% Stronger Shield',
    bio: 'Calm leader! Strengthens your shield dome against solar flares.',
  },
  {
    id: 'kip',
    name: 'Kip Vance',
    role: 'Chief Engineer',
    vibe: 'Battery Whiz',
    avatar: '🧑‍🔧',
    suitColor: '#fed7aa',
    visorColor: '#38bdf8',
    accent: '#fb923c',
    perk: '⚡ +20% Battery Charging',
    bio: 'Funny mechanic who loves gadgets and charges batteries extra fast.',
  },
  {
    id: 'mei',
    name: 'Dr. Mei Lin',
    role: 'Flight Doctor',
    vibe: 'Oxygen Saver',
    avatar: '👩‍⚕️',
    suitColor: '#e0f2fe',
    visorColor: '#34d399',
    accent: '#38bdf8',
    perk: '❤️ Uses Less Oxygen',
    bio: 'Gentle space medic who keeps crew fit so oxygen lasts longer.',
  },
  {
    id: 'soli',
    name: 'Soli Patel',
    role: 'Space Botanist',
    vibe: 'Plant Grower',
    avatar: '🧑‍🌾',
    suitColor: '#dcfce7',
    visorColor: '#a3e635',
    accent: '#4ade80',
    perk: '🌱 +3 Extra Air from Crops',
    bio: 'Loves plants and grows delicious dwarf-wheat for fresh air.',
  },
  {
    id: 'juno',
    name: 'Juno Reyes',
    role: 'Rover Pilot',
    vibe: 'Speedy Comms',
    avatar: '🛰️',
    suitColor: '#f3e8ff',
    visorColor: '#c084fc',
    accent: '#c084fc',
    perk: '📡 2x Faster Radio to Earth',
    bio: 'Bold rover driver who sends emergency signals back home fast.',
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
        {/* Top Outpost Pill & Level Title */}
        <header className="briefing-header">
          <div>
            <div className="outpost-pill" style={{ borderColor: briefing.accent, color: briefing.accent }}>
              🌙 MOONBASE SHACKLETON • {briefing.rank}
            </div>
            <h1 className="briefing-title">{briefing.title}</h1>
          </div>
          <div className="sol-target-badge" style={{ borderColor: briefing.accent }}>
            <span>MISSION LENGTH</span>
            <strong style={{ color: briefing.accent }}>{briefing.sols} Sols</strong>
            <small style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>
              ({briefing.sols} Lunar Days)
            </small>
          </div>
        </header>

        <p className="briefing-summary">{briefing.summary}</p>

        {/* Two-Column Visual Breakdown: What's Included + Primary Objectives */}
        <div className="briefing-details-grid">
          <div className="briefing-box tools-box">
            <div className="briefing-box-title">🛠️ YOUR BASE TOOLS</div>
            <div className="includes-list">
              {briefing.includes.map((item) => (
                <div key={item.name} className="include-item">
                  <span className="include-icon">{item.icon}</span>
                  <div className="include-text">
                    <div className="include-header">
                      <strong className="include-name">{item.name}</strong>
                      <kbd className="key-cap-mini">{item.key}</kbd>
                    </div>
                    <small className="include-desc">{item.desc}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="briefing-box objectives-box" style={{ borderLeftColor: briefing.accent }}>
            <div className="briefing-box-title">🏆 HOW TO WIN THIS MISSION</div>
            <ul className="objectives-list-kid">
              {briefing.objectives.map((obj, i) => (
                <li key={obj}>
                  <span className="objective-badge" style={{ background: briefing.accent }}>
                    {i + 1}
                  </span>
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Character / Crew Roster Selector */}
        <div className="roster-header">
          <span>🧑‍🚀 CHOOSE YOUR ASTRONAUT HERO</span>
          <span style={{ color: activeCrew.accent }}>
            Hero Selected: <strong>{activeCrew.name}</strong> ({activeCrew.perk})
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
                  {isSelected ? (
                    <span className="crew-picked">✓ READY</span>
                  ) : (
                    <span className="crew-pick-hint">Select</span>
                  )}
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
              ❓ How to Play Guide
            </button>
            <button
              type="button"
              className="start-mission-btn"
              onClick={onStartGame}
            >
              🚀 Launch Sol 1 →
            </button>
          </div>
        </footer>
      </div>

      {/* Kid-Friendly Quick Tutorial & Game Info Popup */}
      {showTutorial && (
        <GameInfoModal
          activeTab="TUTORIAL"
          onSelectTab={() => {}}
          onClose={() => setShowTutorial(false)}
          onStartMission={() => setShowTutorial(false)}
          currentHero={activeCrew}
        />
      )}
    </div>
  );
}
