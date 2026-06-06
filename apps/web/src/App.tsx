import { Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Layout } from './components/Layout';
import { Feed } from './pages/Feed';
import { NewsDetail } from './pages/NewsDetail';
import { Live } from './pages/Live';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Editor } from './pages/Editor';
import { Manage } from './pages/Manage';
import { MediaLab } from './pages/MediaLab';
import { Admin } from './pages/Admin';
import { useAuth } from './lib/auth';

function Protected({ roles, children }: { roles?: string[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="container muted">A carregar…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Feed />} />
        <Route path="/noticia/:slug" element={<NewsDetail />} />
        <Route path="/ao-vivo" element={<Live />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registar" element={<Register />} />
        <Route
          path="/gerir"
          element={
            <Protected roles={['EDITOR', 'ADMIN']}>
              <Manage />
            </Protected>
          }
        />
        <Route
          path="/gerir/nova"
          element={
            <Protected roles={['EDITOR', 'ADMIN']}>
              <Editor />
            </Protected>
          }
        />
        <Route
          path="/gerir/editar/:id"
          element={
            <Protected roles={['EDITOR', 'ADMIN']}>
              <Editor />
            </Protected>
          }
        />
        <Route
          path="/media"
          element={
            <Protected roles={['EDITOR', 'ADMIN']}>
              <MediaLab />
            </Protected>
          }
        />
        <Route
          path="/admin"
          element={
            <Protected roles={['ADMIN']}>
              <Admin />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
