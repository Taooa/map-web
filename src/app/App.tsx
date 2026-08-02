import { RouterProvider } from 'react-router-dom';
import { appRouter } from '@/app/router';
import { AntdProvider } from '@/app/AntdProvider';

export function App() {
  return (
    <AntdProvider>
      <RouterProvider router={appRouter} />
    </AntdProvider>
  );
}
