import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/AppLayout';
import { Navigate } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PointsPage } from '@/pages/PointsPage';
import { MapWorkspacePage } from '@/pages/maps/MapWorkspacePage';

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
        element: <MapWorkspacePage />,
      },
      {
        path: 'map/amap',
        element: <Navigate replace to="/map?platform=amap" />,
      },
      {
        path: 'map/baidu',
        element: <Navigate replace to="/map?platform=baidu" />,
      },
      {
        path: 'map/tianditu',
        element: <Navigate replace to="/map?platform=tianditu" />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
];

export const appRouter = createBrowserRouter(appRoutes);
