import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/AppLayout';
import { MapPageLayout } from '@/app/layouts/MapPageLayout';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PointsPage } from '@/pages/PointsPage';
import { AMapPage } from '@/pages/maps/AMapPage';
import { BaiduMapPage } from '@/pages/maps/BaiduMapPage';
import { TiandituPage } from '@/pages/maps/TiandituPage';

export const appRoutes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'points',
        element: <PointsPage />,
      },
      {
        path: 'map',
        element: <MapPageLayout />,
        children: [
          {
            path: 'amap',
            element: <AMapPage />,
          },
          {
            path: 'baidu',
            element: <BaiduMapPage />,
          },
          {
            path: 'tianditu',
            element: <TiandituPage />,
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
];

export const appRouter = createBrowserRouter(appRoutes);
