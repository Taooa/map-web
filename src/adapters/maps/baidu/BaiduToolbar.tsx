import { useState } from 'react';
import { readPlatformSettings } from '../platform-settings';
const KEY = 'map-tools.baidu-settings';
interface Settings { base: 'standard' | 'satellite'; navigation: boolean }
const fallback: Settings = { base: 'standard', navigation: true };
export function BaiduToolbar() {
  const [settings, setSettings] = useState(() => readPlatformSettings(KEY, fallback));
  function update(next: Settings) { setSettings(next); localStorage.setItem(KEY, JSON.stringify(next)); }
  return <section className="platform-toolbar"><strong>百度专属设置</strong>
    <label>底图<select value={settings.base} onChange={(e) => update({ ...settings, base: e.target.value as Settings['base'] })}><option value="standard">标准</option><option value="satellite">卫星</option></select></label>
    <label className="toolbar-check"><input type="checkbox" checked={settings.navigation} onChange={(e) => update({ ...settings, navigation: e.target.checked })} />显示导航控件</label>
  </section>;
}
