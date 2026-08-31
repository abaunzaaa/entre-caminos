import { Navigate, Route, Routes } from "react-router-dom";
import { PublicLayout } from "../layouts/PublicLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { AdminLayout } from "../layouts/AdminLayout";
import { LandingPage } from "../pages/LandingPage";
import { RegisterPage } from "../pages/RegisterPage";
import { LoginPage } from "../pages/LoginPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { ExplorePage } from "../pages/ExplorePage";
import { ExperienceDetailPage } from "../pages/ExperienceDetailPage";
import { DashboardPage } from "../pages/admin/DashboardPage";
import { AdministratorsPage } from "../pages/admin/AdministratorsPage";
import { RolesPage } from "../pages/admin/RolesPage";
import { CategoriesPage } from "../pages/admin/CategoriesPage";
import { ExperiencesPage } from "../pages/admin/ExperiencesPage";
import { ExperienceFormPage } from "../pages/admin/ExperienceFormPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/explorar" element={<ExplorePage />} />
        <Route path="/explorar/:id" element={<ExperienceDetailPage />} />
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="administradores" element={<AdministratorsPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="categorias" element={<CategoriesPage />} />
        <Route path="experiencias" element={<ExperiencesPage />} />
        <Route path="experiencias/nueva" element={<ExperienceFormPage />} />
        <Route path="experiencias/:id" element={<ExperienceFormPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
