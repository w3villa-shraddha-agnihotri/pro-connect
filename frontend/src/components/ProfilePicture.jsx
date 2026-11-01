
import { useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function ProfilePicture({
  size = "lg",
  editable = true,
  showRemove = true,
  className = "",
}) {
  const { user, refreshUser, updateProfilePicture } = useAuth();

  const fileInputRef = useRef(null);

  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-24 w-24",
    xl: "h-32 w-32",
  };

  const imageSize = sizeClasses[size] || sizeClasses.lg;

  const imageUrl = preview || user?.profile_image_url || null;

  const handleSelect = (event) => {
    const file = event.target.files?.[0];

    setError("");
    setSuccess("");

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPG, PNG and WebP images are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Image size must not exceed 5 MB.");
      event.target.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    handleUpload(file, objectUrl);
  };

  const handleUpload = async (file, objectUrl) => {
    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("profileImage", file);

      const response = await fetch(
        `${API_URL}/api/profile/upload`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to upload profile picture."
        );
      }

      // Update global AuthContext
      updateProfilePicture({
        profile_image: data.user.profile_image,
        profile_image_url: data.user.profile_image_url,
      });

      // Refresh user data
      await refreshUser();

      setSuccess("Profile picture updated successfully.");
    } catch (err) {
      console.error("Profile picture upload failed:", err);

      setPreview(null);
      URL.revokeObjectURL(objectUrl);

      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    if (!window.confirm("Are you sure you want to remove your profile picture?")) {
      return;
    }

    setRemoving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/profile/remove`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to remove profile picture."
        );
      }

      setPreview(null);

      updateProfilePicture({
        profile_image: null,
        profile_image_url: null,
      });

      await refreshUser();

      setSuccess("Profile picture removed successfully.");
    } catch (err) {
      console.error("Profile picture removal failed:", err);
      setError(err.message || "Unable to remove picture.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Profile image */}
      <div className="relative">
        <div
          className={`${imageSize} overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md`}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Profile"
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-indigo-100 text-indigo-600">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-1/2 w-1/2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
                />
              </svg>
            </div>
          )}
        </div>

        {editable && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || removing}
            title="Change profile picture"
            className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-white shadow transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {uploading ? (
              <span className="text-xs">...</span>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleSelect}
        disabled={uploading || removing}
      />

      {/* Upload status */}
      {uploading && (
        <p className="text-sm font-medium text-indigo-600">
          Uploading picture...
        </p>
      )}

      {removing && (
        <p className="text-sm font-medium text-indigo-600">
          Removing picture...
        </p>
      )}

      {/* Upload and remove buttons */}
      {editable && (
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || removing}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : imageUrl ? "Change Picture" : "Upload Picture"}
          </button>

          {showRemove && user?.profile_image && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading || removing}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {removing ? "Removing..." : "Remove"}
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      {error && (
        <p role="alert" className="max-w-xs text-center text-sm text-red-600">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="max-w-xs text-center text-sm text-green-600">
          {success}
        </p>
      )}

      <p className="text-xs text-slate-400">
        JPG, PNG or WebP · Maximum 5 MB
      </p>
    </div>
  );
}
