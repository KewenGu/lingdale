// 练习页画界面用的几个小工具。没有规则。

import { SaveData, gameDay } from '../core/index';

export type Child = Node | string | null | false;

export function h(tag: string, attrs: Record<string, string> = {}, children: Child[] = []): HTMLElement {
  const node = document.createElement(tag);
  for (const key of Object.keys(attrs)) {
    if (key === 'class') node.className = attrs[key];
    else node.setAttribute(key, attrs[key]);
  }
  for (const child of children) {
    if (child === null || child === false) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function byId(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`页面上没有 #${id}`);
  return node;
}

export function fill(node: HTMLElement, children: Child[]): void {
  node.textContent = '';
  for (const child of children) {
    if (child === null || child === false) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

export function clockText(at: number): string {
  const date = new Date(at);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** 把一个时间说成"今天 16:00""明天 04:00""5 天后"。 */
export function whenText(at: number, now: number, save: SaveData): string {
  const days = Math.floor(gameDay(at, save.tzOffsetMs) / 2) - Math.floor(gameDay(now, save.tzOffsetMs) / 2);
  if (days <= 0) return `今天 ${clockText(at)}`;
  if (days === 1) return `明天 ${clockText(at)}`;
  return `${days} 天后`;
}

/** 游戏日说成现实里的时间:2 个游戏日是 1 天。前面带一个空格,好直接接在汉字后面。 */
export function daysText(gameDays: number): string {
  if (gameDays <= 0) return ' 0 天';
  const days = gameDays / 2;
  return days === Math.floor(days) ? ` ${days} 天` : ` ${days.toFixed(1)} 天`;
}

export function button(label: string, attrs: Record<string, string>, onClick: () => void): HTMLButtonElement {
  const node = h('button', Object.assign({ type: 'button' }, attrs), [label]) as HTMLButtonElement;
  node.addEventListener('click', onClick);
  return node;
}

/**
 * 点两下才生效的按钮:第一下把字换成确认的问话,第二下才做。
 * 这个页面所在的地方弹不出系统的确认框,卖牛这样收不回来的事要在页面里自己问一遍。
 */
export function confirmButton(
  label: string,
  question: string,
  attrs: Record<string, string>,
  onConfirm: () => void,
): HTMLButtonElement {
  let armed = false;
  const node = h('button', Object.assign({ type: 'button' }, attrs), [label]) as HTMLButtonElement;
  node.addEventListener('click', () => {
    if (armed) {
      onConfirm();
      return;
    }
    armed = true;
    node.textContent = question;
    node.classList.add('is-armed');
    window.setTimeout(() => {
      armed = false;
      node.textContent = label;
      node.classList.remove('is-armed');
    }, 4000);
  });
  return node;
}
