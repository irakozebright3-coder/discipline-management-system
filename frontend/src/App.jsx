import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext.jsx';
import { OrgProvider } from './hooks/useOrg.jsx';
import ProtectedRoute from './lib/ProtectedRoute.jsx';
import PlatformOwnerRoute from './lib/PlatformOwnerRoute.jsx';
import PageNotFound from './lib/PageNotFound.jsx';
import PublicNavbar from './components/PublicNavbar.jsx';
import PublicFooter from './components/PublicFooter.jsx';
import AuthLayout from './components/AuthLayout.jsx';
import Layout from './components/Layout.jsx';
import PlatformLayout from './components/PlatformLayout.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import Landing from './pages/Landing.jsx';
import TrackPage from './pages/TrackPage.jsx';
import About from './pages/About.jsx';
import Community from './pages/Community.jsx';
import HelpCenter from './pages/HelpCenter.jsx';
import Contact from './pages/Contact.jsx';
import Faqs from './pages/Faqs.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Setup from './pages/Setup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import People from './pages/People.jsx';
import StudentScoreCard from './pages/StudentScoreCard.jsx';
import Incidents from './pages/Incidents.jsx';
import Categories from './pages/Categories.jsx';
import Structure from './pages/Structure.jsx';
import History from './pages/History.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import OwnerDashboard from './pages/platform/OwnerDashboard.jsx';
import Organizations from './pages/platform/Organizations.jsx';
import PlatformUsers from './pages/platform/Users.jsx';
import AuditLogs from './pages/platform/AuditLogs.jsx';
import Contributors from './pages/platform/Contributors.jsx';
import CreatorProfileManage from './pages/platform/CreatorProfileManage.jsx';
import HelpCenterManage from './pages/platform/HelpCenterManage.jsx';
import SystemControl from './pages/platform/SystemControl.jsx';

function PublicPage({ children }) {
  return <div className="dm-public-page flex min-h-screen flex-col"><PublicNavbar /><div className="dm-public-content flex-1">{children}</div><PublicFooter /></div>;
}

export default function App() {
  return (
    <AuthProvider>
      <OrgProvider>
        <ScrollToTop />
        <Routes>
          {/* Public */}
          <Route path="/" element={<PublicPage><Landing /></PublicPage>} />
          <Route path="/about" element={<PublicPage><About /></PublicPage>} />
          <Route path="/tracks/:track" element={<PublicPage><TrackPage /></PublicPage>} />
          <Route path="/community" element={<PublicPage><Community /></PublicPage>} />
          <Route path="/help" element={<PublicPage><HelpCenter /></PublicPage>} />
          <Route path="/faqs" element={<PublicPage><Faqs /></PublicPage>} />
          <Route path="/contact" element={<PublicPage><Contact /></PublicPage>} />

          {/* Auth */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>

          {/* App (organization-scoped) */}
          <Route path="/setup" element={<ProtectedRoute><Setup /></ProtectedRoute>} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/people" element={<People />} />
            <Route path="/people/:personId" element={<StudentScoreCard />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/structure" element={<Structure />} />
            <Route path="/history" element={<History />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Platform owner console */}
          <Route path="/platform" element={<PlatformOwnerRoute><PlatformLayout /></PlatformOwnerRoute>}>
            <Route index element={<OwnerDashboard />} />
            <Route path="organizations" element={<Organizations />} />
            <Route path="users" element={<PlatformUsers />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="contributors" element={<Contributors />} />
            <Route path="creator-profile" element={<CreatorProfileManage />} />
            <Route path="help-center" element={<HelpCenterManage />} />
            <Route path="system-control" element={<SystemControl />} />
          </Route>

          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </OrgProvider>
    </AuthProvider>
  );
}
