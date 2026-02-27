/**
 * data/story.js
 * Linear narrative chapters triggered by in-game events.
 *
 * triggerCondition types:
 *   { type: 'start' }                                      — fires on first game load
 *   { type: 'quest_completed', questId }                  — fires when a quest finishes
 *   { type: 'building_level', buildingId, level }         — fires when a building reaches level
 *   { type: 'player_level',   level }                     — fires when commander reaches level
 */
export const STORY_CHAPTERS = [
  {
    id: 'ch_beginning',
    title: 'The Abandoned Keep',
    icon: '🏰',
    arc: 'Prologue',
    arcColor: '#9b59b6',
    triggerCondition: { type: 'start' },
    dialogue: [
      { speaker: 'Narrator', text: 'An ancient keep sits upon a forgotten hill, long-abandoned and overgrown with vines. Crows circle in the grey sky above its crumbling walls.' },
      { speaker: 'Scout', text: 'Commander, the walls still hold. The foundations are solid — stone cut by artisans of the old empire. With enough resources and resolve, this place could become a fortress once more.' },
      { speaker: 'Commander', text: 'Then we start today. Lay the foundations and send word: our banner flies here now. Our legend begins at this very stone.' },
    ],
    rewards: { money: 100, wood: 50 },
    unlocksQuestIds: ['first_building'],
  },
  {
    id: 'ch_first_harvest',
    title: 'First Harvest',
    icon: '🌾',
    arc: 'Prologue',
    arcColor: '#9b59b6',
    triggerCondition: { type: 'quest_completed', questId: 'first_building' },
    dialogue: [
      { speaker: 'Steward', text: 'The first stone has been laid, Commander. But a keep without food is just an elaborate tomb.' },
      { speaker: 'Commander', text: 'Order the farmers to clear the southern fields. We need crops and we need them fast.' },
      { speaker: 'Steward', text: 'Wise counsel. Wood and gold will follow where there is will, but food is what feeds an army through a long siege. The people look to you.' },
    ],
    rewards: { food: 150, money: 200 },
    unlocksQuestIds: ['recruit_army'],
  },
  {
    id: 'ch_enemy_advances',
    title: 'The Enemy Advances',
    icon: '⚔️',
    arc: 'Act I — The First War',
    arcColor: '#e74c3c',
    triggerCondition: { type: 'building_level', buildingId: 'barracks', level: 1 },
    dialogue: [
      { speaker: 'Scout', text: 'Commander! Reports from the eastern ridge — goblin war camps have been spotted moving toward our borders. They grow bolder by the day.' },
      { speaker: 'Commander', text: 'Then we shall not wait for them to reach our walls. Train the soldiers. I want every able-bodied fighter ready for march within the week.' },
      { speaker: 'Warlord', text: 'Give me men and I will give you victory, Commander. The goblins will learn to fear this banner — we will carve our name into their memory.' },
    ],
    rewards: { money: 500, food: 100 },
    unlocksQuestIds: ['first_victory'],
  },
  {
    id: 'ch_arcane_awakening',
    title: 'Arcane Awakening',
    icon: '🔮',
    arc: 'Act I — The First War',
    arcColor: '#e74c3c',
    triggerCondition: { type: 'building_level', buildingId: 'workshop', level: 1 },
    dialogue: [
      { speaker: 'Scholar', text: 'Commander, the ley lines beneath this keep are extraordinary — far stronger than anything I have encountered in my travels. The Magic Tower is drinking deep from the earth itself.' },
      { speaker: 'Commander', text: 'Can we harness it for our forces? Turn this raw power into something that wins battles?' },
      { speaker: 'Scholar', text: 'With the right research, absolutely. Battle Mages, arcane amplification, alchemical transmutation — the possibilities are limitless. But it demands time, mana, and brilliant minds willing to push into the unknown.' },
    ],
    rewards: { iron: 100, money: 300 },
    unlocksQuestIds: ['scholar'],
  },
  {
    id: 'ch_scholars_path',
    title: "The Scholar's Path",
    icon: '🔬',
    arc: 'Act II — The Age of Discovery',
    arcColor: '#2980b9',
    triggerCondition: { type: 'quest_completed', questId: 'scholar' },
    dialogue: [
      { speaker: 'Scholar', text: 'The breakthroughs we have achieved these past months surpass anything I had hoped for when I first arrived at your gates, Commander.' },
      { speaker: 'Commander', text: 'And yet I feel we have only scratched the surface. There is an ancient power here that we have barely begun to understand.' },
      { speaker: 'Scholar', text: 'You are correct. There are sealed texts, forgotten technologies, and tactical insights yet to be uncovered. The true potential of this keep — of your empire — has barely stirred from its slumber.' },
    ],
    rewards: { iron: 200, money: 1000, xp: 500 },
    unlocksQuestIds: ['rising_power'],
  },
];
