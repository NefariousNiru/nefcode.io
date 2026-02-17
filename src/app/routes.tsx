// file: src/app/routes.tsx

import {Navigate, Route, Routes} from "react-router-dom";
import {LandingPage} from "../pages/LandingPage";
import {HealthCheckPage} from "../pages/HealthCheckPage.tsx";

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<LandingPage/>}/>
            <Route path="/health" element={<HealthCheckPage/>}/>
            <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
    );
}
