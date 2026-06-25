import { Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { NewsDetail } from './pages/NewsDetail';
import { Saved } from './pages/Saved';
import { Profile } from './pages/Profile';
import { Live } from './pages/Live';
import { Broadcast } from './pages/Broadcast';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Editor } from './pages/Editor';
import { Manage } from './pages/Manage';
import { MediaLab } from './pages/MediaLab';
import { Admin } from './pages/Admin';
import { Device } from './pages/Device';
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
      {/* Página de transmissão do telemóvel — pública e sem o cabeçalho/nav (aberta via QR). */}
      <Route path="/transmitir" element={<Broadcast />} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/noticia/:slug" element={<NewsDetail />} />
        <Route path="/guardadas" element={<Saved />} />
        <Route
          path="/perfil"
          element={
            <Protected>
              <Profile />
            </Protected>
          }
        />
        <Route path="/ao-vivo" element={<Live />} />
        <Route path="/dispositivo" element={<Device />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registar" element={<Register />} />
        <Route
          path="/gerir"
          element={
            <Protected roles={['EDITOR']}>
              <Manage />
            </Protected>
          }
        />
        <Route
          path="/gerir/nova"
          element={
            <Protected roles={['EDITOR']}>
              <Editor />
            </Protected>
          }
        />
        <Route
          path="/gerir/editar/:id"
          element={
            <Protected roles={['EDITOR']}>
              <Editor />
            </Protected>
          }
        />
        <Route
          path="/media"
          element={
            <Protected roles={['EDITOR']}>
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
