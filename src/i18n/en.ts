/**
 * 英文是基準語系：zh / ko 必須有完全相同的 key，少一個 tsc 就會報錯。
 * {name} 是參數，由 t(key, { name }) 代入。
 */
export const en = {
  'menu.subtitle': 'The veggie army is coming. Survive!',
  'menu.start': 'Start',
  'menu.startHint': 'Press Enter / Space to start',
  'menu.tip.move': 'WASD / Arrow keys to move',
  'menu.tip.mouse': 'Hold the mouse to walk',
  'menu.tip.attack': 'Attacks are automatic',
  'menu.tip.mute': 'M to mute',

  'hud.status': 'Lv.{level}   {time}   Kills {kills}   HP {hp}/{maxHp}',

  'levelUp.title': 'Level up! Pick one',
  'levelUp.titleMore': 'Level up! Pick one  ({count} more)',
  'levelUp.hint': '← → Select　Space / Enter Confirm\nOr click a card, or press 1 / 2 / 3',
  'levelUp.rare': 'RARE',

  'stat.survived': 'Survived',
  'stat.clearTime': 'Clear time',
  'stat.level': 'Level',
  'stat.kills': 'Kills',
  'result.backHint': 'Space / Enter: back to title',

  'gameOver.headline': 'Hate them all you want, you still have to eat them!',
  'gameOver.retry': 'Try again',

  'clear.line1': 'Job done!',
  'clear.line2': 'Home for some meat',
  'clear.again': 'Play again',

  'upgrade.dmg.name': 'Sharpen',
  'upgrade.dmg.desc': 'Damage +25%',
  'upgrade.hp.name': 'Full Belly',
  'upgrade.hp.desc': 'Max HP +25 and fully heal',
  'upgrade.rate.name': 'Quick Hands',
  'upgrade.rate.desc': 'Attack interval -12%',
  'upgrade.range.name': 'Long Handle',
  'upgrade.range.desc': 'Attack range +20%',
  'upgrade.arc.name': 'Wide Swing',
  'upgrade.arc.desc': 'Swing angle +25° (max 300°)',
  'upgrade.speed.name': 'Sneakers',
  'upgrade.speed.desc': 'Move speed +12%',
  'upgrade.magnet.name': 'Hungry',
  'upgrade.magnet.desc': 'XP pickup range +45%',
  'upgrade.blade.name': 'Dual Wield',
  'upgrade.blade.desc': 'Swing one extra blade',
  'upgrade.knock.name': 'Shove',
  'upgrade.knock.desc': 'Knockback +60%, pushes nearby enemies away',
  'upgrade.regen.name': 'Self-Heal',
  'upgrade.regen.desc': 'Regenerate 0.6 HP per second',
  'upgrade.heal.name': 'Second Wind',
  'upgrade.heal.desc': 'Instantly restore 40% of max HP',
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
