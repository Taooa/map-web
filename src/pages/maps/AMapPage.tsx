import { MapPrototypePage } from '@/components/MapPrototypePage';

export function AMapPage() {
  return (
    <MapPrototypePage
      coordinateSystem="GCJ02"
      credentialName="Key"
      shortName="AM"
      title="高德地图"
      tone="amber"
    />
  );
}
