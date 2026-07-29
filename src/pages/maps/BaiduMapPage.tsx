import { MapPrototypePage } from '@/components/MapPrototypePage';

export function BaiduMapPage() {
  return (
    <MapPrototypePage
      coordinateSystem="BD09"
      credentialName="AK"
      shortName="BM"
      title="百度地图"
      tone="blue"
    />
  );
}
