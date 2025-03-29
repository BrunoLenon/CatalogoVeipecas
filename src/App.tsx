import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './lib/auth';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Settings from './pages/Settings';
import MyAccount from './pages/MyAccount';
import SystemCustomization from './pages/SystemCustomization';
import useAutoLogout from './hooks/useAutoLogout';

function App() {
  useAutoLogout(10);

  return (
    <Router future={{ 
      v7_startTransition: true, 
      v7_relativeSplatPath: true 
    }}>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/inicio"
            element={
              <PrivateRoute>
                <Layout>
                  <Home />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/produtos"
            element={
              <PrivateRoute>
                <Layout>
                  <Products />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/categorias"
            element={
              <PrivateRoute>
                <Layout>
                  <Categories />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/carrinho"
            element={
              <PrivateRoute>
                <Layout>
                  <Cart />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/pedidos"
            element={
              <PrivateRoute>
                <Layout>
                  <Orders />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/configuracoes"
            element={
              <PrivateRoute>
                <Layout>
                  <Settings />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/minha-conta"
            element={
              <PrivateRoute>
                <Layout>
                  <MyAccount />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/sistema"
            element={
              <PrivateRoute>
                <Layout>
                  <SystemCustomization />
                </Layout>
              </PrivateRoute>
            }
          />
                  <Route path="/home" element={<Navigate to="/inicio" replace />} />

          <Route
            path="/personalizacao"
            element={
              <PrivateRoute>
                <Layout>
                  <SystemCustomization />
                </Layout>
              </PrivateRoute>
            }
          />
</Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
