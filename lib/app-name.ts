export function displayAppName(name: string) {
  if (/^(?:https?:\/\/|\S+\.\S+)/i.test(name)) return name;
  return name.replace(/(^|[\s-])(\p{L})/gu, (_, separator: string, letter: string) => separator + letter.toUpperCase());
}

export function displayGuideTitle(title: string) {
  const [name, ...description] = title.split(' — ');
  return [displayAppName(name), ...description].join(' — ');
}
