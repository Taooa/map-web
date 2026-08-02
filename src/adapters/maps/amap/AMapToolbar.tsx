import { useState } from 'react';
import { readPlatformSettings } from '../platform-settings';

const KEY = 'map-tools.amap-settings';
interface Settings { base: 'standard' | 'satellite'; traffic: boolean }
const fallback: Settings = { base: 'standard', traffic: false };

export function AMapToolbar() {
  const [settings, setSettings] = useState(() => readPlatformSettings(KEY, fallback));
  function update(next: Settings) { setSettings(next); localStorage.setItem(KEY, JSON.stringify(next)); }
  return <section className="platform-toolbar"><strong>高德专属设置</strong>
    <label>底图<select value={settings.base} onChange={(e) => update({ ...settings, base: e.target.value as Settings['base'] })}><option value="standard">标准</option><option value="satellite">卫星</option></select></label>
    <label className="toolbar-check"><input type="checkbox" checked={settings.traffic} onChange={(e) => update({ ...settings, traffic: e.target.checked })} />显示路况</label>
  </section>;
}
