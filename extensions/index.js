import cairn from './cairn.js';
import sidekick from './sidekick.js';

export default function piToolkitExtension(pi) {
  try {
    cairn(pi);
  } catch (err) {
    console.error('[pi-toolkit-bundle] Failed to load Cairn extension:', err);
  }

  try {
    sidekick(pi);
  } catch (err) {
    console.error('[pi-toolkit-bundle] Failed to load Sidekick extension:', err);
  }
}
