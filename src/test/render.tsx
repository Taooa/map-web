import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { appRoutes } from '@/app/router';
import { AntdProvider } from '@/app/AntdProvider';

export function renderRoute(path: string) {
  const router = createMemoryRouter(appRoutes, {
    initialEntries: [path],
  });

  return {
    router,
    ...render(
      <AntdProvider>
        <RouterProvider router={router} />
      </AntdProvider>,
    ),
  };
}
