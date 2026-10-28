export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // Some embedded browsers deny Clipboard API access but support a user-initiated copy.
    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    const focused = document.activeElement as HTMLElement | null;
    document.body.append(input);
    input.select();
    try {
      if (!document.execCommand('copy'))
        throw new Error('Clipboard access was blocked. Allow clipboard access and try again.');
    } finally {
      input.remove();
      focused?.focus();
    }
  }
}
