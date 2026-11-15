import { Html } from '@react-three/drei';
import SpriteActor from './SpriteActor.jsx';

/**
 * Renders the four companion crew members directly inside the 3D Moon Base
 * courtyard (separate from the player-controlled main character), displaying
 * each crew member's name and live health bar above their helmet.
 * Non-interactive so mid-game character switching is never triggered.
 */
export function CompanionCrew({ companions = [], reducedMotion = false }) {
  if (!Array.isArray(companions) || companions.length === 0) {
    return null;
  }

  return (
    <group name="CompanionCrewGroup">
      {companions.map((member) => {
        const hp = Math.max(0, Math.min(100, Math.round(member.health ?? 100)));
        const tone = hp <= 25 ? 'critical' : hp <= 55 ? 'caution' : 'optimal';

        return (
          <group
            key={member.id}
            name={`Companion_${member.id}`}
            position={member.position || [0, -0.45, 0]}
          >
            <SpriteActor
              id={member.id}
              name={member.name}
              mood={member.mood || 'idle'}
              health={hp}
              position={[0, 0, 0]}
              isWalking={false}
              flipX={Boolean(member.flipX)}
              reducedMotion={reducedMotion}
            />

            <Html
              position={[0, 0.42, 0]}
              center
              zIndexRange={[2, 8]}
              style={{
                pointerEvents: 'none',
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <div
                className={`crew-3d-tag crew-3d-${tone}`}
                style={{ '--crew-accent': member.color || '#35D0E6' }}
                aria-label={`${member.name} health ${hp} percent`}
              >
                <div className="crew-3d-header">
                  <span className="crew-3d-name">{member.name}</span>
                </div>
                <div className="crew-3d-hp-row">
                  <span className="crew-3d-hp-track" aria-hidden="true">
                    <span className="crew-3d-hp-fill" style={{ width: `${hp}%` }} />
                  </span>
                </div>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

export default CompanionCrew;
