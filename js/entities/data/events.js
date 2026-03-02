/**
 * events.js
 * Limited-time in-game event definitions.
 *
 * startTs / endTs are Unix milliseconds.
 * Set both to null to keep an event inactive (always-off).
 * Populate startTs/endTs to schedule or activate an event.
 *
 * effects: map of resourceType → production multiplier (multiplicative).
 *   e.g. { iron: 2.0 } doubles iron perSec for the event duration.
 *
 * objectives: optional list of { id, description, target } tracked by EventManager.
 * reward:     resources/diamonds granted when objectives are fully met.
 */

export const EVENTS_CONFIG = [
  {
    id:          'double_iron_weekend',
    name:        'Double Iron Weekend',
    icon:        '⛏️',
    description: 'Iron mines are working overtime! Iron production is doubled for the duration of this event.',
    startTs:     null, // populate to activate, e.g. Date.now()
    endTs:       null, // populate to set expiry, e.g. Date.now() + 48 * 3600 * 1000
    effects:     { iron: 2.0 },
    objectives: [
      {
        id:          'produce_iron',
        description: 'Mine 10,000 iron during the event',
        target:      10_000,
      },
    ],
    reward: { iron: 2000, diamond: 10 },
  },

  {
    id:          'forest_bounty',
    name:        'Forest Bounty',
    icon:        '🌳',
    description: 'Ancient spirits bless your woodcutters and quarry workers. Wood and stone production is doubled.',
    startTs:     null,
    endTs:       null,
    effects:     { wood: 2.0, stone: 2.0 },
    objectives: [
      {
        id:          'gather_wood',
        description: 'Gather 20,000 wood during the event',
        target:      20_000,
      },
    ],
    reward: { wood: 5000, stone: 3000 },
  },

  {
    id:          'festival_of_heroes',
    name:        'Festival of Heroes',
    icon:        '🦸',
    description: 'A great festival fills your realm with energy! All resource production is increased by 50%.',
    startTs:     null,
    endTs:       null,
    effects:     { wood: 1.5, stone: 1.5, iron: 1.5, food: 1.5, water: 1.5 },
    objectives: [
      {
        id:          'win_battles',
        description: 'Win 5 battles during the festival',
        target:      5,
      },
    ],
    reward: { diamond: 25, money: 1000 },
  },
];
