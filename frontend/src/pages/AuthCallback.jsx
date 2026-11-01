
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

export default function AuthCallback() {
  const navigate = useNavigate();
  const { loginUser, refreshUser } = useAuth();

  const [message, setMessage] = useState(
    "Completing your sign-in..."
  );

  useEffect(() => {
    let active = true;

    async function checkLogin() {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Could not complete sign-in.");
        }

        const data = await response.json();
        const user = data.user;

        if (!user?.role) {
          throw new Error("User role not found.");
        }

        if (!active) return;

        // Update the shared authentication state.
        if (loginUser) {
          loginUser(user);
        }
        await refreshUser();

        if (!active) return;

        switch (user.role) {
          case "CUSTOMER":
            navigate("/customer/dashboard", { replace: true });
            break;

          case "PROFESSIONAL":
            navigate("/professional/dashboard", {
              replace: true,
            });
            break;

          case "ADMIN":
            navigate("/admin/dashboard", { replace: true });
            break;

          default:
            throw new Error(`Invalid user role: ${user.role}`);
        }
      } catch (error) {
        console.error("Google sign-in failed:", error);

        if (active) {
          setMessage(
            "Sign-in could not be completed. Please try again."
          );
        }
      }
    }

    checkLogin();

    return () => {
      active = false;
    };
  }, [navigate, refreshUser]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <p className="text-lg font-semibold text-slate-800">
          {message}
        </p>

        {message.startsWith("Sign-in could") && (
          <button
            onClick={() => navigate("/login")}
            className="mt-4 rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
          >
            Back to Sign in
          </button>
        )}
      </div>
    </div>
  );
}
