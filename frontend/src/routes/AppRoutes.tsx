import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { EntreCaminosIntro } from "../components/intro/EntreCaminosIntro";
import { AdminLayout } from "../layouts/AdminLayout";
import { UserAccountLayout } from "../layouts/UserAccountLayout";
import { PublicLayout } from "../layouts/PublicLayout";
import { LandingPage } from "../pages/LandingPage";
import { AuthPage } from "../pages/AuthPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { VerifyEmailPage } from "../pages/VerifyEmailPage";
import { OAuthCallbackPage } from "../pages/OAuthCallbackPage";
import { ChangePasswordPage } from "../pages/ChangePasswordPage";
import { OnboardingCatalogGuard } from "../components/onboarding/OnboardingCatalogGuard";
import { OnboardingLayout } from "../components/onboarding/OnboardingLayout";
import { OnboardingPage } from "../pages/onboarding/OnboardingPage";
import { ExplorePage } from "../pages/ExplorePage";
import { ExperienceDetailPage } from "../pages/ExperienceDetailPage";
import { DashboardPage } from "../pages/admin/DashboardPage";
import { AdminProfilePage } from "../pages/admin/AdminProfilePage";
import { AdministratorsPage } from "../pages/admin/AdministratorsPage";
import { RolesPage } from "../pages/admin/RolesPage";
import { PermissionsPage } from "../pages/admin/PermissionsPage";
import { CategoriesPage } from "../pages/admin/CategoriesPage";
import { ExperiencesPage } from "../pages/admin/ExperiencesPage";
import { FeaturedExperiencesPage } from "../pages/admin/FeaturedExperiencesPage";
import { ExperienceFormPage } from "../pages/admin/ExperienceFormPage";
import { ExperiencePreviewPage } from "../pages/admin/ExperiencePreviewPage";
import { GuideHost } from "../components/guide/GuideHost";
import { GuideProvider } from "../components/guide/GuideProvider";
import { ProtectedRoute } from "./ProtectedRoute";

const PAGE_TITLES: Record<string, string> = {
  "/login": "Iniciar sesión | Entre Caminos",
  "/register": "Registrarse | Entre Caminos",
  "/forgot-password": "Recuperar contraseña | Entre Caminos",
  "/reset-password": "Restablecer contraseña | Entre Caminos",
  "/verify-email": "Verificar correo | Entre Caminos",
  "/onboarding": "Personaliza tu experiencia | Entre Caminos",
  "/onboarding/preferencias": "Personaliza tu experiencia | Entre Caminos",
  "/onboarding/listo": "Personaliza tu experiencia | Entre Caminos",
};

const INTRO_SEEN_KEY = "ec-intro-seen";

function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = PAGE_TITLES[pathname] ?? "Entre Caminos";
  }, [pathname]);

  return null;
}

function LandingIntro() {
  const { pathname } = useLocation();
  const [done, setDone] = useState(() => {
    try {
      return sessionStorage.getItem(INTRO_SEEN_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (done || pathname !== "/") {
    return null;
  }

  return (
    <EntreCaminosIntro
      onFinish={() => {
        try {
          sessionStorage.setItem(INTRO_SEEN_KEY, "1");
        } catch {
          /* private mode */
        }
        setDone(true);
      }}
    />
  );
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <DocumentTitle />
      <LandingIntro />
      <GuideProvider>
        <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<AuthPage />}>
          <Route path="/register" element={<></>} />
          <Route path="/login" element={<></>} />
        </Route>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<UserAccountLayout />}>
            <Route path="/cambiar-contrasena" element={<ChangePasswordPage />} />
          </Route>
          <Route element={<OnboardingLayout />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/onboarding/preferencias" element={<Navigate to="/onboarding" replace />} />
            <Route path="/onboarding/listo" element={<Navigate to="/onboarding" replace />} />
          </Route>
        </Route>
        <Route element={<OnboardingCatalogGuard />}>
          <Route element={<PublicLayout />}>
            <Route path="/explorar" element={<ExplorePage />} />
            <Route path="/explorar/:id" element={<ExperienceDetailPage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute admin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="perfil" element={<AdminProfilePage />} />
            <Route path="profile" element={<AdminProfilePage />} />
            <Route path="administrators" element={<AdministratorsPage />} />
            <Route path="administradores" element={<AdministratorsPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="permissions" element={<PermissionsPage />} />
            <Route path="permisos" element={<PermissionsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="categorias" element={<CategoriesPage />} />
            <Route path="experiences" element={<ExperiencesPage />} />
            <Route path="experiencias" element={<ExperiencesPage />} />
            <Route path="destacadas" element={<FeaturedExperiencesPage />} />
            <Route path="experiencias/nueva" element={<ExperienceFormPage />} />
            <Route path="experiencias/:id/ver" element={<ExperiencePreviewPage />} />
            <Route path="experiencias/:id" element={<ExperienceFormPage />} />
            <Route path="experiences/nueva" element={<ExperienceFormPage />} />
            <Route path="experiences/:id/ver" element={<ExperiencePreviewPage />} />
            <Route path="experiences/:id" element={<ExperienceFormPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <GuideHost />
      </GuideProvider>
    </BrowserRouter>
  );
}
