import { useState } from 'react';
import { readPlatformSettings } from '../platform-settings';
const KEY = 'map-tools.tianditu-settings';
interface Settings { base: 'vector' | 'image' | 'terrain'; labels: boolean }
const fallback: Settings = { base: 'vector', labels: true };
export function TiandituToolbar() {
  const [settings, setSettings] = useState(() => readPlatformSettings(KEY, fallback));
  function update(next: Settings) { setSettings(next); localStorage.setItem(KEY, JSON.stringify(next)); }
  return <section className="platform-toolbar"><strong>天地图专属设置</strong>
    <label>底图<select value={settings.base} onChange={(e) => update({ ...settings, base: e.target.value as Settings['base'] })}><option value="vector">矢量</option><option value="image">影像</option><option value="terrain">地形</option></select></label>
    <label className="toolbar-check"><input type="checkbox" checked={settings.labels} onChange={(e) => update({ ...settings, labels: e.target.checked })} />显示注记</label>
  </section>;
}
