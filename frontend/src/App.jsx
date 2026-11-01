
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import ActiveRequests from "./pages/ActiveRequests";
import Login from "./pages/Login";
import Professionals from "./pages/Professionals";
import Signup from "./pages/Signup";
import AuthCallback from "./pages/AuthCallback.jsx";
import CustomerDashboard from "./pages/CustomerDashboard.jsx";
import ProfessionalDashboard from "./pages/ProfessionalDashboard.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import PublicLayout from "./layouts/PublicLayout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProfessionalProfile from "./pages/ProfessionalProfile.jsx";
import SubscriptionPlans from "./pages/SubscriptionPlans";
import MySubscription from "./pages/MySubscription";
import MyBookings from "./pages/MyBookings.jsx";
import ProfessionalDetails from "./pages/ProfessionalDetails.jsx";
import ProfessionalRequests from "./pages/ProfessionalRequests.jsx";
import CustomerBookings from "./pages/CustomerBookings.jsx";
import SavedProfessionals from "./pages/SavedProfessionals.jsx";
import ProfessionalRequestDetails from "./pages/ProfessionalRequestDetails.jsx";
import FindCustomers from "./pages/FindCustomers";
import CustomerReceivedRequests from "./pages/CustomerReceivedRequests";
import Connections from "./pages/Connections.jsx";

function CustomerProfileAccess({ children }) {
  const {
    user,
    loading,
    hasActiveSubscription,
    subscriptionLoading,
  } = useAuth();

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const isCustomer = user?.role?.toUpperCase() === "CUSTOMER";

  if (isCustomer && subscriptionLoading) {
    return <div className="p-8 text-center">Checking subscription...</div>;
  }

  if (isCustomer && !hasActiveSubscription) {
    return <Navigate to="/subscription-plans" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Home */}
          <Route path="/" element={<Home />} />

          {/* Public pages */}
          <Route element={<PublicLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/professionals" element={<Professionals />} />
<Route
  path="/professionals/:id"
  element={
    <CustomerProfileAccess>
      <ProfessionalDetails />
    </CustomerProfileAccess>
  }
/>          </Route>
<Route
  path="/subscription-plans"
  element={<SubscriptionPlans />}
/>
<Route
  path="/professional/find-customers"
  element={
    <ProtectedRoute allowedRoles={["PROFESSIONAL"]}>
      <FindCustomers />
    </ProtectedRoute>
  }
/>
<Route
  path="/my-subscription"
  element={<MySubscription />}
/>
          {/* Redirects */}
          <Route
            path="/how-it-works"
            element={<Navigate to="/#how-it-works" replace />}
          />

          <Route
            path="/services"
            element={<Navigate to="/#services" replace />}
          />
{/* Subscription plans */}
<Route
  path="/subscription"
  element={
    <ProtectedRoute allowedRoles={["CUSTOMER", "PROFESSIONAL"]}>
      <PublicLayout>
        <SubscriptionPlans />
      </PublicLayout>
    </ProtectedRoute>
  }
/>
          {/* Professional profile */}
          <Route
            path="/professional/profile"
            element={
              <ProtectedRoute allowedRoles={["PROFESSIONAL"]}>
                <PublicLayout>
                  <ProfessionalProfile />
                </PublicLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/professional/edit-profile"
            element={
              <ProtectedRoute allowedRoles={["PROFESSIONAL"]}>
                <PublicLayout>
                  <ProfessionalProfile />
                </PublicLayout>
              </ProtectedRoute>
            }
          />

          {/* Professional dashboard */}
          <Route
            path="/professional/dashboard"
            element={
              <ProtectedRoute allowedRoles={["PROFESSIONAL", "ADMIN"]}>
                <ProfessionalDashboard />
              </ProtectedRoute>
            }
          />

        
{/* Professional requests with Navbar and Footer */}
<Route
  element={
    <ProtectedRoute allowedRoles={["PROFESSIONAL"]}>
      <PublicLayout />
    </ProtectedRoute>
  }
>
  
  <Route
    path="/professional/requests"
    element={<ProfessionalRequests />}
  />

  <Route
    path="/professional/requests/:id"
    element={<ProfessionalRequestDetails />}
  />
  <Route
    path="/professional/my-bookings"
    element={<MyBookings />}
  />

</Route>


          {/* Customer dashboard */}
          <Route
            path="/customer/dashboard"
            element={
              <ProtectedRoute allowedRoles={["CUSTOMER", "ADMIN"]}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
  path="/customer/bookings"
  element={
    <ProtectedRoute allowedRoles={["CUSTOMER"]}>
      <MyBookings />
    </ProtectedRoute>
  }
/>
<Route
  path="/customer/received-requests"
  element={
    <ProtectedRoute allowedRoles={["CUSTOMER"]}>
      <CustomerReceivedRequests />
    </ProtectedRoute>
  }
/>
          {/* Customer active requests */}
          <Route
            path="/customer/active-requests"
            element={
              <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                <ActiveRequests />
              </ProtectedRoute>
            }
          />

          {/* Customer saved professionals */}
          <Route
            path="/customer/saved-professionals"
            element={
              <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                <SavedProfessionals />
              </ProtectedRoute>
            }
          />

          {/* Unified Connections Page */}
          <Route
            path="/connections"
            element={
              <ProtectedRoute allowedRoles={["CUSTOMER", "PROFESSIONAL", "ADMIN"]}>
                <Connections />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/connections"
            element={
              <ProtectedRoute allowedRoles={["CUSTOMER", "ADMIN"]}>
                <Connections />
              </ProtectedRoute>
            }
          />
          <Route
            path="/professional/connections"
            element={
              <ProtectedRoute allowedRoles={["PROFESSIONAL", "ADMIN"]}>
                <Connections />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
