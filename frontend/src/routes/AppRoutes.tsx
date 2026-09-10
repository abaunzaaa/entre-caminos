import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AdminLayout } from "../layouts/AdminLayout";
import { PublicLayout } from "../layouts/PublicLayout";
import { LandingPage } from "../pages/LandingPage";
import { AuthPage } from "../pages/AuthPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { VerifyEmailPage } from "../pages/VerifyEmailPage";
import { OAuthCallbackPage } from "../pages/OAuthCallbackPage";
import { OnboardingWelcomePage } from "../pages/onboarding/OnboardingWelcomePage";
import { OnboardingPreferencesPage } from "../pages/onboarding/OnboardingPreferencesPage";
import { OnboardingReadyPage } from "../pages/onboarding/OnboardingReadyPage";
import { ExplorePage } from "../pages/ExplorePage";
import { ExperienceDetailPage } from "../pages/ExperienceDetailPage";
import { DashboardPage } from "../pages/admin/DashboardPage";
import { AdministratorsPage } from "../pages/admin/AdministratorsPage";
import { RolesPage } from "../pages/admin/RolesPage";
import { PermissionsPage } from "../pages/admin/PermissionsPage";
import { CategoriesPage } from "../pages/admin/CategoriesPage";
import { ExperiencesPage } from "../pages/admin/ExperiencesPage";
import { ExperienceFormPage } from "../pages/admin/ExperienceFormPage";
import { ExperiencePreviewPage } from "../pages/admin/ExperiencePreviewPage";
import { ProtectedRoute } from "./ProtectedRoute";

const PAGE_TITLES: Record<string, string> = {
  "/login": "Iniciar sesión | Entre Caminos",
  "/register": "Registrarse | Entre Caminos",
  "/forgot-password": "Recuperar contraseña | Entre Caminos",
  "/reset-password": "Restablecer contraseña | Entre Caminos",
  "/verify-email": "Verificar correo | Entre Caminos",
};

function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = PAGE_TITLES[pathname] ?? "Entre Caminos";
  }, [pathname]);

  return null;
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <DocumentTitle />
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
          <Route path="/onboarding" element={<OnboardingWelcomePage />} />
          <Route path="/onboarding/preferencias" element={<OnboardingPreferencesPage />} />
          <Route path="/onboarding/listo" element={<OnboardingReadyPage />} />
        </Route>
        <Route element={<PublicLayout />}>
          <Route path="/explorar" element={<ExplorePage />} />
          <Route path="/explorar/:id" element={<ExperienceDetailPage />} />
        </Route>
        <Route element={<ProtectedRoute admin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="administrators" element={<AdministratorsPage />} />
            <Route path="administradores" element={<AdministratorsPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="permissions" element={<PermissionsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="categorias" element={<CategoriesPage />} />
            <Route path="experiences" element={<ExperiencesPage />} />
            <Route path="experiencias" element={<ExperiencesPage />} />
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
    </BrowserRouter>
  );
}
