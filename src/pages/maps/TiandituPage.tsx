import { MapPrototypePage } from '@/components/MapPrototypePage';

export function TiandituPage() {
  return (
    <MapPrototypePage
      coordinateSystem="WGS84 / CGCS2000"
      credentialName="Token"
      shortName="TD"
      title="天地图"
      tone="green"
    />
  );
}
