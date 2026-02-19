// file: src/app/routes.tsx

import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { CompaniesPage } from "../pages/CompaniesPage";
import { CompanyFilesPage } from "../pages/CompanyFilesPage";
import { FilePreviewPage } from "../pages/FilePreviewPage";
import { HealthCheckPage } from "../pages/HealthCheckPage";
import { LandingPage } from "../pages/LandingPage";
import { NotFoundPage } from "../pages/NotFoundPage.tsx";

export function AppRoutes() {
	return (
		<Routes>
			<Route element={<AppShell />}>
				<Route path="/" element={<LandingPage />} />
				<Route path="/companies" element={<CompaniesPage />} />
				<Route path="/companies/:company" element={<CompanyFilesPage />} />
				<Route path="/preview" element={<FilePreviewPage />} />
				<Route path="/health" element={<HealthCheckPage />} />
				<Route path="/home" element={<Navigate to="/" replace />} />
				<Route path="*" element={<NotFoundPage />} />
			</Route>
		</Routes>
	);
}
