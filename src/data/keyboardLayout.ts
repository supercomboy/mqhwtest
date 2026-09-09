export interface KeyDef {
  code: string;
  label: string;
  subLabel?: string;
  icon?: 'windows' | 'menu' | string;
  width?: number; // relative width unit (1 = standard 1U key)
  height?: number; // relative height unit (1 = standard 1U height, 2 = 2U tall)
  isNumpad?: boolean;
  isNav?: boolean;
  isMedia?: boolean;
  isMouse?: boolean;
  group?: string;
  title?: string;
}

export interface MediaButtonDef {
  code: string;
  label?: string;
  iconName: string;
  title: string;
  group: 'fn' | 'audio' | 'browser' | 'apps';
}

// Top row media & special function capsules matching the exact uploaded image
export const TOP_MEDIA_KEYS: MediaButtonDef[] = [
  // Fn capsule
  { code: 'Fn', label: 'Fn + 🔊', iconName: 'fn', title: 'Fn / Media Trigger', group: 'fn' },

  // Audio / Playback controls group
  { code: 'AudioVolumeMute', iconName: 'volume-mute', title: 'Mute Audio', group: 'audio' },
  { code: 'AudioVolumeDown', iconName: 'volume-down', title: 'Volume Down', group: 'audio' },
  { code: 'AudioVolumeUp', iconName: 'volume-up', title: 'Volume Up', group: 'audio' },
  { code: 'MediaTrackPrevious', iconName: 'track-prev', title: 'Previous Track', group: 'audio' },
  { code: 'MediaStop', iconName: 'media-stop', title: 'Stop Playback', group: 'audio' },
  { code: 'MediaPlayPause', iconName: 'play-pause', title: 'Play / Pause', group: 'audio' },
  { code: 'MediaTrackNext', iconName: 'track-next', title: 'Next Track', group: 'audio' },
  { code: 'MediaSelect', iconName: 'music', title: 'Launch Media Player', group: 'audio' },

  // Browser navigation controls group
  { code: 'BrowserHome', iconName: 'globe', title: 'Browser Home', group: 'browser' },
  { code: 'BrowserBack', iconName: 'arrow-back', title: 'Browser Back', group: 'browser' },
  { code: 'BrowserForward', iconName: 'arrow-forward', title: 'Browser Forward', group: 'browser' },
  { code: 'BrowserRefresh', iconName: 'refresh', title: 'Browser Refresh', group: 'browser' },
  { code: 'BrowserStop', iconName: 'close-circle', title: 'Stop Loading', group: 'browser' },
  { code: 'BrowserSearch', iconName: 'search', title: 'Browser Search', group: 'browser' },
  { code: 'BrowserFavorites', iconName: 'star', title: 'Browser Favorites', group: 'browser' },

  // Application launchers group
  { code: 'LaunchMail', iconName: 'mail', title: 'Mail App', group: 'apps' },
  { code: 'LaunchApp2', iconName: 'calculator', title: 'Calculator', group: 'apps' },
  { code: 'LaunchApp1', iconName: 'folder', title: 'My Computer / Files', group: 'apps' },
];

export interface KeyboardLayoutDef {
  row1: KeyDef[];
  row2: KeyDef[];
  row3: KeyDef[];
  row4: KeyDef[];
  row5: KeyDef[];
  row6: KeyDef[];
  row7: {
    mouseLeft: KeyDef;
    mouseRight: KeyDef;
    arrowLeft: KeyDef;
    arrowDown: KeyDef;
    arrowRight: KeyDef;
  };
}

// Exact full PC layout matching the uploaded screenshot:
// - Top F-row with Esc, F1-F12, PrtSc, ScrLk, Pause, Home, End
// - Row 2 with ~..Backspace, PgUp, NumLock, /, *, -
// - Row 3 with Tab..\, PgDn, 7, 8, 9, + (2U tall)
// - Row 4 with Caps..Enter, Ins, 4, 5, 6
// - Row 5 with Shift..Shift, Del, 1, 2, 3, Enter (2U tall)
// - Row 6 with Ctrl, Win, Alt, Spacebar, Alt, Menu, Ctrl, ▲, 0 (2U wide), .
// - Row 7 with Mouse buttons under Spacebar, and ◄, ▼, ► directly beneath ▲
export const EXACT_KEYBOARD_LAYOUT: KeyboardLayoutDef = {
  row1: [
    { code: 'Escape', label: 'Esc' },
    { code: 'F1', label: 'F1' },
    { code: 'F2', label: 'F2' },
    { code: 'F3', label: 'F3' },
    { code: 'F4', label: 'F4' },
    { code: 'F5', label: 'F5' },
    { code: 'F6', label: 'F6' },
    { code: 'F7', label: 'F7' },
    { code: 'F8', label: 'F8' },
    { code: 'F9', label: 'F9' },
    { code: 'F10', label: 'F10' },
    { code: 'F11', label: 'F11' },
    { code: 'F12', label: 'F12' },
    { code: 'PrintScreen', label: 'Prt Sc', isNav: true },
    { code: 'ScrollLock', label: 'Scr Lk', isNav: true },
    { code: 'Pause', label: 'Pause', isNav: true },
    { code: 'Home', label: 'Home', isNav: true },
    { code: 'End', label: 'End', isNav: true },
  ],
  row2: [
    { code: 'Backquote', label: '`', subLabel: '~' },
    { code: 'Digit1', label: '1', subLabel: '!' },
    { code: 'Digit2', label: '2', subLabel: '@' },
    { code: 'Digit3', label: '3', subLabel: '#' },
    { code: 'Digit4', label: '4', subLabel: '$' },
    { code: 'Digit5', label: '5', subLabel: '%' },
    { code: 'Digit6', label: '6', subLabel: '^' },
    { code: 'Digit7', label: '7', subLabel: '&' },
    { code: 'Digit8', label: '8', subLabel: '*' },
    { code: 'Digit9', label: '9', subLabel: '(' },
    { code: 'Digit0', label: '0', subLabel: ')' },
    { code: 'Minus', label: '-', subLabel: '_' },
    { code: 'Equal', label: '=', subLabel: '+' },
    { code: 'Backspace', label: 'Backspace', width: 2 },
    { code: 'PageUp', label: 'Pg Up', isNav: true },
    { code: 'NumLock', label: 'Num Lock', isNumpad: true },
    { code: 'NumpadDivide', label: '/', isNumpad: true },
    { code: 'NumpadMultiply', label: '*', isNumpad: true },
    { code: 'NumpadSubtract', label: '-', isNumpad: true },
  ],
  row3: [
    { code: 'Tab', label: 'Tab', width: 1.5 },
    { code: 'KeyQ', label: 'Q' },
    { code: 'KeyW', label: 'W' },
    { code: 'KeyE', label: 'E' },
    { code: 'KeyR', label: 'R' },
    { code: 'KeyT', label: 'T' },
    { code: 'KeyY', label: 'Y' },
    { code: 'KeyU', label: 'U' },
    { code: 'KeyI', label: 'I' },
    { code: 'KeyO', label: 'O' },
    { code: 'KeyP', label: 'P' },
    { code: 'BracketLeft', label: '[', subLabel: '{' },
    { code: 'BracketRight', label: ']', subLabel: '}' },
    { code: 'Backslash', label: '\\', subLabel: '|', width: 1.5 },
    { code: 'PageDown', label: 'Pg Dn', isNav: true },
    { code: 'Numpad7', label: '7', isNumpad: true },
    { code: 'Numpad8', label: '8', isNumpad: true },
    { code: 'Numpad9', label: '9', isNumpad: true },
    { code: 'NumpadAdd', label: '+', isNumpad: true, height: 2 },
  ],
  row4: [
    { code: 'CapsLock', label: 'Caps', width: 1.75 },
    { code: 'KeyA', label: 'A' },
    { code: 'KeyS', label: 'S' },
    { code: 'KeyD', label: 'D' },
    { code: 'KeyF', label: 'F' },
    { code: 'KeyG', label: 'G' },
    { code: 'KeyH', label: 'H' },
    { code: 'KeyJ', label: 'J' },
    { code: 'KeyK', label: 'K' },
    { code: 'KeyL', label: 'L' },
    { code: 'Semicolon', label: ';', subLabel: ':' },
    { code: 'Quote', label: '\'', subLabel: '"' },
    { code: 'Enter', label: 'Enter', width: 2.25 },
    { code: 'Insert', label: 'Ins', isNav: true },
    { code: 'Numpad4', label: '4', isNumpad: true },
    { code: 'Numpad5', label: '5', isNumpad: true },
    { code: 'Numpad6', label: '6', isNumpad: true },
  ],
  row5: [
    { code: 'ShiftLeft', label: 'Shift', width: 2.25 },
    { code: 'KeyZ', label: 'Z' },
    { code: 'KeyX', label: 'X' },
    { code: 'KeyC', label: 'C' },
    { code: 'KeyV', label: 'V' },
    { code: 'KeyB', label: 'B' },
    { code: 'KeyN', label: 'N' },
    { code: 'KeyM', label: 'M' },
    { code: 'Comma', label: ',', subLabel: '<' },
    { code: 'Period', label: '.', subLabel: '>' },
    { code: 'Slash', label: '/', subLabel: '?' },
    { code: 'ShiftRight', label: 'Shift', width: 2.75 },
    { code: 'Delete', label: 'Del', isNav: true },
    { code: 'Numpad1', label: '1', isNumpad: true },
    { code: 'Numpad2', label: '2', isNumpad: true },
    { code: 'Numpad3', label: '3', isNumpad: true },
    { code: 'NumpadEnter', label: 'Enter', isNumpad: true, height: 2 },
  ],
  row6: [
    { code: 'ControlLeft', label: 'Ctrl', width: 1.25 },
    { code: 'MetaLeft', label: 'Win', icon: 'windows', width: 1.25 },
    { code: 'AltLeft', label: 'Alt', width: 1.25 },
    { code: 'Space', label: '', width: 6.25 },
    { code: 'AltRight', label: 'Alt', width: 1.25 },
    { code: 'ContextMenu', label: 'Menu', icon: 'menu', width: 1.25 },
    { code: 'ControlRight', label: 'Ctrl', width: 1.25 },
    { code: 'ArrowUp', label: '▲', isNav: true },
    { code: 'Numpad0', label: '0', isNumpad: true, width: 2 },
    { code: 'NumpadDecimal', label: '.', isNumpad: true },
  ],
  row7: {
    mouseLeft: { code: 'MouseLeft', label: 'Left Click', isMouse: true },
    mouseRight: { code: 'MouseRight', label: 'Right Click', isMouse: true },
    arrowLeft: { code: 'ArrowLeft', label: '◄', isNav: true },
    arrowDown: { code: 'ArrowDown', label: '▼', isNav: true },
    arrowRight: { code: 'ArrowRight', label: '►', isNav: true },
  },
};

// Calculate total testable keys
export const getTotalKeysInExactLayout = (): number => {
  let count = TOP_MEDIA_KEYS.length;
  count += EXACT_KEYBOARD_LAYOUT.row1.length;
  count += EXACT_KEYBOARD_LAYOUT.row2.length;
  count += EXACT_KEYBOARD_LAYOUT.row3.length;
  count += EXACT_KEYBOARD_LAYOUT.row4.length;
  count += EXACT_KEYBOARD_LAYOUT.row5.length;
  count += EXACT_KEYBOARD_LAYOUT.row6.length;
  count += 5; // 2 mouse buttons + 3 bottom arrow keys
  return count;
};
