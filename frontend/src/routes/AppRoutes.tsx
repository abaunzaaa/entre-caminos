import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "../layouts/AdminLayout";
import { PublicLayout } from "../layouts/PublicLayout";
import { LandingPage } from "../pages/LandingPage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { VerifyEmailPage } from "../pages/VerifyEmailPage";
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
import { ProtectedRoute } from "./ProtectedRoute";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/onboarding" element={<OnboardingWelcomePage />} />
        <Route path="/onboarding/preferencias" element={<OnboardingPreferencesPage />} />
        <Route path="/onboarding/listo" element={<OnboardingReadyPage />} />
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
            <Route path="experiencias/:id" element={<ExperienceFormPage />} />
            <Route path="experiences/nueva" element={<ExperienceFormPage />} />
            <Route path="experiences/:id" element={<ExperienceFormPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
