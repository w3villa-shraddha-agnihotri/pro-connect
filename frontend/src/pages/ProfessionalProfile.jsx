import { useEffect, useState, useRef } from "react";

import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";



const API_URL = (

  import.meta.env.VITE_API_URL || "http://localhost:5000"

).replace(/\/+$/, "");



const DOMAINS = [

  "Web Development",

  "Graphic Design",

  "Video Editing",

  "Digital Marketing",

  "Content Writing",

  "UI/UX Design",

];



const SUGGESTED_SKILLS = {

  "Web Development": ["React.js", "Node.js", "JavaScript", "TypeScript", "Next.js", "MySQL", "Tailwind CSS", "MongoDB"],

  "Graphic Design": ["Photoshop", "Illustrator", "Figma", "Logo Design", "Branding", "Canva", "Typography"],

  "Video Editing": ["Premiere Pro", "After Effects", "DaVinci Resolve", "Color Grading", "Sound Design", "Motion Graphics"],

  "Digital Marketing": ["SEO", "Google Ads", "Social Media Marketing", "Content Strategy", "Email Marketing", "Analytics"],

  "Content Writing": ["Copywriting", "Blog Writing", "SEO Writing", "Technical Writing", "Creative Writing", "Proofreading"],

  "UI/UX Design": ["Figma", "Wireframing", "Prototyping", "User Research", "Adobe XD", "Design Systems", "Usability Testing"],

};



const INITIAL_FORM = {

  name: "",

  email: "",

  phone: "",

  street: "",

  city: "",

  state: "",

  pincode: "",

  latitude: null,

  longitude: null,

  domain: "",

  bio: "",

  experience_years: "",

  portfolio_url: "",

  profile_image: "",

  skills: [],

};



export default function ProfessionalProfile() {

  const { refreshUser } = useAuth();



  // Mode: "manual" (Fill by yourself) or "resume" (Parse from resume)

  const [entryMode, setEntryMode] = useState("manual");



  const [form, setForm] = useState(INITIAL_FORM);

  const [skillInput, setSkillInput] = useState("");



  const [resumeFile, setResumeFile] = useState(null);

  const [resumeName, setResumeName] = useState("");

  const [parsingResume, setParsingResume] = useState(false);

  const [extractedNotice, setExtractedNotice] = useState("");

  const [extractedFieldsList, setExtractedFieldsList] = useState([]);



  const [locating, setLocating] = useState(false);

  const [locationStatus, setLocationStatus] = useState("");



  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [showConfirmModal, setShowConfirmModal] = useState(false);



  const fileInputRef = useRef(null);



  // Load existing professional profile from backend

  useEffect(() => {

    const controller = new AbortController();



    async function loadProfile() {

      try {

        setLoading(true);

        setError("");



        const response = await fetch(`${API_URL}/api/professional-profile`, {

          method: "GET",

          credentials: "include",

          signal: controller.signal,

        });



        const data = await response.json();



        if (!response.ok) {

          throw new Error(data.message || "Unable to load your profile.");

        }



        const user = data.user || {};

        const profile = data.profile || {};



        let userStreet = user.street || "";

        let userCity = user.city || "";

        let userState = user.state || "";

        let userPincode = user.pincode || "";



        // Parse stored address if individual parts aren't separate

        if (!userStreet && !userCity && !userState && user.address) {

          const raw = user.address.trim();

          const pinMatch = raw.match(/[-,\s]+(\b\d{5,6}\b)$/);

          let withoutPin = raw;

          if (pinMatch) {

            userPincode = pinMatch[1];

            withoutPin = raw.slice(0, pinMatch.index).trim();

          }



          const parts = withoutPin.split(",").map((s) => s.trim()).filter(Boolean);

          if (parts.length === 1) {

            userCity = parts[0];

          } else if (parts.length === 2) {

            userCity = parts[0];

            userState = parts[1];

          } else if (parts.length >= 3) {

            userState = parts[parts.length - 1];

            userCity = parts[parts.length - 2];

            userStreet = parts.slice(0, parts.length - 2).join(", ");

          }

        }



        setForm({

          name: user.name || "",

          email: user.email || "",

          phone: user.phone || "",

          street: userStreet,

          city: userCity,

          state: userState,

          pincode: userPincode,

          latitude: user.latitude ?? null,

          longitude: user.longitude ?? null,

          profile_image: user.profile_image || "",

          domain: profile.domain || "",

          bio: profile.bio || "",

          experience_years:

            profile.experience_years == null

              ? ""

              : String(profile.experience_years),

          portfolio_url: profile.portfolio_url || "",

          skills: Array.isArray(profile.skills) ? profile.skills : [],

        });

      } catch (err) {

        if (err.name !== "AbortError") {

          setError(err.message || "Failed to load profile details.");

        }

      } finally {

        if (!controller.signal.aborted) {

          setLoading(false);

        }

      }

    }



    loadProfile();



    return () => controller.abort();

  }, []);



  function handleInputChange(event) {

    const { name, value } = event.target;

    setForm((prev) => ({

      ...prev,

      [name]: value,

    }));

    setError("");

    setSuccess("");

  }

  // Get current location using browser GPS

  function handleGetCurrentLocation() {

    setError("");

    setLocationStatus("");



    if (!navigator.geolocation) {

      setLocationStatus("Location is not supported by this browser.");

      return;

    }



    setLocating(true);

    setLocationStatus("Detecting your current location...");



    navigator.geolocation.getCurrentPosition(

      (position) => {

        const latitude = position.coords.latitude;

        const longitude = position.coords.longitude;



        setForm((prev) => ({

          ...prev,

          latitude,

          longitude,

        }));



        setLocationStatus(

          "Location detected successfully. Save your profile to update coordinates."

        );



        setLocating(false);

      },

      (error) => {

        let message = "Unable to detect your location.";



        if (error.code === error.PERMISSION_DENIED) {

          message = "Location permission denied. Please allow location access.";

        } else if (error.code === error.POSITION_UNAVAILABLE) {

          message = "Your current location is unavailable.";

        } else if (error.code === error.TIMEOUT) {

          message = "Location request timed out. Please try again.";

        }



        setLocationStatus(message);

        setLocating(false);

      },

      {

        enableHighAccuracy: true,

        timeout: 15000,

        maximumAge: 0,

      }

    );

  }

  // Add a skill

  function handleAddSkill(newSkill) {

    const clean = (newSkill || skillInput).trim();

    if (!clean) return;



    if (form.skills.some((s) => s.toLowerCase() === clean.toLowerCase())) {

      setSkillInput("");

      return;

    }



    if (form.skills.length >= 25) {

      setError("You can add a maximum of 25 skills.");

      return;

    }



    setForm((prev) => ({

      ...prev,

      skills: [...prev.skills, clean],

    }));

    setSkillInput("");

    setError("");

  }



  function handleSkillKeyDown(event) {

    if (event.key === "Enter" || event.key === ",") {

      event.preventDefault();

      handleAddSkill();

    }

  }



  // Remove a skill

  function handleRemoveSkill(skillToRemove) {

    setForm((prev) => ({

      ...prev,

      skills: prev.skills.filter((s) => s !== skillToRemove),

    }));

  }



  // Upload and parse resume

  async function handleResumeUpload(file) {

    if (!file) return;



    const validExtensions = [".pdf", ".doc", ".docx", ".txt"];

    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

    if (!validExtensions.includes(ext)) {

      setError("Please upload a PDF, DOC, DOCX or TXT file.");

      return;

    }



    if (file.size > 10 * 1024 * 1024) {

      setError("Resume file size cannot exceed 10 MB.");

      return;

    }



    setError("");

    setSuccess("");

    setExtractedNotice("");

    setResumeFile(file);

    setResumeName(file.name);



    try {

      setParsingResume(true);

      const formData = new FormData();

      formData.append("resume", file);



      const response = await fetch(

        `${API_URL}/api/professional-profile/parse-resume`,

        {

          method: "POST",

          credentials: "include",

          body: formData,

        }

      );



      const data = await response.json();



      if (!response.ok) {

        throw new Error(data.message || "Failed to parse resume details.");

      }



      const extracted = data.extracted || {};

      const updated = [];



      setForm((prev) => {

        const next = { ...prev };



        if (extracted.name && (!prev.name || prev.name === "Professional")) {

          next.name = extracted.name;

          updated.push("Full Name");

        }



        if (extracted.email) {

          next.email = extracted.email;

          updated.push("Email");

        }



        if (extracted.phone) {

          next.phone = extracted.phone;

          updated.push("Phone No");

        }



        if (extracted.city) {

          next.city = extracted.city;

          updated.push("City");

        }



        if (extracted.state) {

          next.state = extracted.state;

          updated.push("State");

        }



        if (Array.isArray(extracted.skills) && extracted.skills.length > 0) {

          const combined = [

            ...new Set([...prev.skills, ...extracted.skills]),

          ];

          next.skills = combined;

          updated.push(`Skills (${extracted.skills.length} detected)`);

        }



        if (extracted.bio) {

          next.bio = extracted.bio;

          updated.push("Brief Intro");

        }



        if (extracted.domain && !prev.domain) {

          next.domain = extracted.domain;

          updated.push("Domain");

        }



        if (extracted.experience_years && !prev.experience_years) {

          next.experience_years = extracted.experience_years;

          updated.push("Experience");

        }



        return next;

      });



      setExtractedFieldsList(updated);

      if (updated.length > 0) {

        setExtractedNotice(

          `Resume parsed successfully! Auto-filled: ${updated.join(", ")}.`

        );

      } else {

        setExtractedNotice(

          "Resume attached! Please review and complete your profile information below."

        );

      }

    } catch (err) {

      console.warn("Resume parsing error:", err.message);

      setError(

        err.message ||

          "Could not automatically extract info from the resume. You can still fill details manually."

      );

    } finally {

      setParsingResume(false);

    }

  }



  function handleFileDrop(e) {

    e.preventDefault();

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {

      handleResumeUpload(e.dataTransfer.files[0]);

    }

  }



  // Pre-validate mandatory fields and open confirmation popup

  function handleOpenReviewPopup(event) {

    if (event) event.preventDefault();

    setError("");

    setSuccess("");



    // 1. Name validation

    if (!form.name.trim()) {

      setError("Full name is required.");

      return;

    }



    // 2. Email validation (Mandatory)

    if (!form.email.trim()) {

      setError("Email address is mandatory.");

      return;

    }

   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {

      setError("Please provide a valid email address (e.g. name@example.com).");

      return;

    }



    // 3. Phone validation (Mandatory)

    if (!form.phone.trim()) {

      setError("Phone number is mandatory.");

      return;

    }

    if (

      !/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,16}$/.test(form.phone.trim()) ||

      form.phone.trim().replace(/\D/g, "").length < 7

    ) {

      setError(

        "Please provide a valid phone number (at least 7 to 15 digits)."

      );

      return;

    }



    // 4. Address (City, State) validation (Mandatory)

    if (!form.city.trim()) {

      setError("City is mandatory in address.");

      return;

    }

    if (!form.state.trim()) {

      setError("State is mandatory in address.");

      return;

    }



    // 5. Domain validation

    if (!form.domain) {

      setError("Please select your primary professional domain.");

      return;

    }



    // 6. Skills validation (Mandatory)

    if (!form.skills || form.skills.length === 0) {

      setError("Skills is a mandatory field. Please enter at least one skill.");

      return;

    }



    // 7. Brief Intro validation (Mandatory)

    if (!form.bio.trim()) {

      setError("Brief intro is mandatory. Please write a short overview of your services and expertise.");

      return;

    }

    if (form.bio.trim().length < 10) {

      setError("Brief intro must be at least 10 characters long.");

      return;

    }



    // Everything is valid -> open review popup!

    setShowConfirmModal(true);

  }



  // Execute save to backend

  async function handleConfirmSave() {

    setError("");

    setSuccess("");



    try {

      setSaving(true);



      const payload = {

        name: form.name.trim(),

        email: form.email.trim().toLowerCase(),

        phone: form.phone.trim(),

        city: form.city.trim(),

        state: form.state.trim(),

        address: `${form.city.trim()}, ${form.state.trim()}`,
        latitude: form.latitude,
        longitude: form.longitude,

        domain: form.domain,

        bio: form.bio.trim(),

        experience_years: form.experience_years ? form.experience_years : null,

        portfolio_url: form.portfolio_url.trim(),

        profile_image: form.profile_image.trim(),

        skills: form.skills,

      };



      const response = await fetch(`${API_URL}/api/professional-profile`, {

        method: "PUT",

        credentials: "include",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify(payload),

      });



      const data = await response.json();



      if (!response.ok) {

        throw new Error(data.message || "Failed to update profile.");

      }



      setSuccess("Your professional profile has been successfully saved!");

      setShowConfirmModal(false);



      if (typeof refreshUser === "function") {

        await refreshUser();

      }



      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (err) {

      setError(err.message || "Something went wrong while saving your profile.");

      setShowConfirmModal(false);

    } finally {

      setSaving(false);

    }

  }



  const inputClass =

    "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";



  const labelClass = "text-sm font-semibold text-slate-700 flex items-center gap-1";



  if (loading) {

    return (

      <div className="min-h-screen bg-slate-50 px-4 py-12">

        <div className="mx-auto max-w-4xl animate-pulse rounded-2xl bg-white p-8 shadow-sm">

          <div className="h-6 w-48 rounded bg-slate-200" />

          <div className="mt-4 h-4 w-72 rounded bg-slate-100" />

          <div className="mt-8 space-y-6">

            <div className="h-14 rounded-xl bg-slate-100" />

            <div className="h-28 rounded-xl bg-slate-100" />

            <div className="h-28 rounded-xl bg-slate-100" />

          </div>

        </div>

      </div>

    );

  }



  return (

    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:py-12">

      <div className="mx-auto max-w-4xl">

        {/* Navigation breadcrumb */}

        <div className="flex items-center justify-between">

          <Link

            to="/professional/dashboard"

            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-blue-600"

          >

            <span aria-hidden="true">←</span>

            Back to dashboard

          </Link>

          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">

            Professional Account

          </span>

        </div>



        {/* Main Card */}

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Header Banner */}

          <div className="border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8 text-white sm:px-10">

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">

              Edit Professional Profile

            </h1>

            <p className="mt-2 max-w-2xl text-sm text-blue-100">

              Provide your mandatory contact details (Email, Phone, City & State), skills, and brief intro.

              You can fill details manually or parse them automatically from your resume.

            </p>

          </div>



          {/* Form Content */}

          <div className="p-6 sm:p-10">

            {/* Global Alert Messages */}

            {error && (

              <div

                role="alert"

                className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3"

              >

                <span className="text-lg">⚠️</span>

                <div>

                  <p className="font-semibold">Please check the details</p>

                  <p className="mt-0.5">{error}</p>

                </div>

              </div>

            )}



            {success && (

              <div

                role="status"

                className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-start gap-3"

              >

                <span className="text-lg">✓</span>

                <div>

                  <p className="font-semibold">Success</p>

                  <p className="mt-0.5">{success}</p>

                </div>

              </div>

            )}



            {extractedNotice && (

              <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900 flex items-start gap-3">

                <span className="text-lg">📄</span>

                <div>

                  <p className="font-semibold">Resume Auto-Extraction</p>

                  <p className="mt-0.5 text-xs text-indigo-800">{extractedNotice}</p>

                  {extractedFieldsList.length > 0 && (

                    <div className="mt-2 flex flex-wrap gap-1.5">

                      {extractedFieldsList.map((item, idx) => (

                        <span

                          key={idx}

                          className="rounded-md bg-indigo-200/70 px-2 py-0.5 text-[11px] font-medium text-indigo-900"

                        >

                          ✓ {item}

                        </span>

                      ))}

                    </div>

                  )}

                </div>

              </div>

            )}



            {/* TWO OPTIONS: Mode Selector */}

            <div className="mb-8">

              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">

                Choose how you want to update your profile:

              </label>



              <div className="mt-3 grid gap-4 sm:grid-cols-2">

                {/* Option 1: Fill by Yourself */}

                <button

                  type="button"

                  onClick={() => setEntryMode("manual")}

                  className={`flex items-start gap-4 rounded-xl border p-4 text-left transition ${

                    entryMode === "manual"

                      ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm"

                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"

                  }`}

                >

                  <div

                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${

                      entryMode === "manual"

                        ? "bg-blue-600 text-white"

                        : "bg-slate-100 text-slate-600"

                    }`}

                  >

                    ✍️

                  </div>

                  <div className="flex-1">

                    <div className="flex items-center justify-between">

                      <span className="text-sm font-bold text-slate-900">

                        Fill by Yourself

                      </span>

                      {entryMode === "manual" && (

                        <span className="text-xs font-semibold text-blue-600">

                          Active

                        </span>

                      )}

                    </div>

                    <p className="mt-1 text-xs text-slate-500">

                      Manually type and edit each required field (Email, Phone, City, State, Skills, Brief Intro).

                    </p>

                  </div>

                </button>



                {/* Option 2: Parse from Resume */}

                <button

                  type="button"

                  onClick={() => setEntryMode("resume")}

                  className={`flex items-start gap-4 rounded-xl border p-4 text-left transition ${

                    entryMode === "resume"

                      ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm"

                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"

                  }`}

                >

                  <div

                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${

                      entryMode === "resume"

                        ? "bg-blue-600 text-white"

                        : "bg-slate-100 text-slate-600"

                    }`}

                  >

                    📄

                  </div>

                  <div className="flex-1">

                    <div className="flex items-center justify-between">

                      <span className="text-sm font-bold text-slate-900">

                        Parse from Resume

                      </span>

                      {entryMode === "resume" && (

                        <span className="text-xs font-semibold text-blue-600">

                          Active

                        </span>

                      )}

                    </div>

                    <p className="mt-1 text-xs text-slate-500">

                      Upload your resume to automatically extract contact info, location, skills, and summary.

                    </p>

                  </div>

                </button>

              </div>

            </div>



            {/* Resume Upload Box (Prominent if Option 2 selected, or collapsible) */}

            {entryMode === "resume" && (

              <div className="mb-8 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/40 p-6 transition sm:p-8">

                <div

                  onDragOver={(e) => e.preventDefault()}

                  onDrop={handleFileDrop}

                  className="flex flex-col items-center justify-center text-center"

                >

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl text-white shadow-md">

                    📄

                  </div>



                  <h3 className="mt-3 text-base font-bold text-slate-900">

                    Upload Resume to Extract Information

                  </h3>

                  <p className="mt-1 max-w-md text-xs text-slate-600">

                    Supported formats: PDF, DOC, DOCX, TXT (Max 10 MB). We will extract your email, phone, location (city, state), skills, and brief intro.

                  </p>



                  <input

                    ref={fileInputRef}

                    type="file"

                    id="resume-file-input"

                    accept=".pdf,.doc,.docx,.txt"

                    onChange={(e) => {

                      if (e.target.files?.[0]) {

                        handleResumeUpload(e.target.files[0]);

                      }

                    }}

                    className="hidden"

                  />



                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3">

                    <button

                      type="button"

                      disabled={parsingResume}

                      onClick={() => fileInputRef.current?.click()}

                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"

                    >

                      {parsingResume ? (

                        <>

                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />

                          Extracting details...

                        </>

                      ) : (

                        <>📁 Choose Resume File</>

                      )}

                    </button>



                    {resumeName && (

                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 border border-slate-200">

                        <span>📄 {resumeName}</span>

                        <button

                          type="button"

                          onClick={() => {

                            setResumeFile(null);

                            setResumeName("");

                          }}

                          className="ml-1 text-slate-400 hover:text-red-500"

                          title="Remove file"

                        >

                          ✕

                        </button>

                      </span>

                    )}

                  </div>

                </div>

              </div>

            )}



            {/* FORM FIELDS */}

<form
  noValidate
  onSubmit={handleOpenReviewPopup}
  className="space-y-8"
>
              {/* SECTION 1: Personal & Contact Details (Mandatory) */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">

                <div className="border-b border-slate-100 pb-3">

                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">

                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">

                      1

                    </span>

                    Personal & Contact Information

                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">

                    Mandatory details for customer communication and verification.

                  </p>

                </div>



                <div className="mt-5 grid gap-5 sm:grid-cols-2">

                  {/* Full Name */}

                  <div>

                    <label className={labelClass} htmlFor="name">

                      Full Name <span className="text-red-500">*</span>

                    </label>

                    <input

                      id="name"

                      name="name"

                      value={form.name}

                      onChange={handleInputChange}

                      className={inputClass}

                      required

                      placeholder="e.g. Shraddha Agnihotri"

                    />

                  </div>



                  {/* Email (Mandatory) */}

                  <div>

                    <label className={labelClass} htmlFor="email">

                      Email Address <span className="text-red-500">*</span>

                      <span className="text-[11px] font-normal text-slate-400">

                        (Mandatory)

                      </span>

                    </label>

                    <input

                      id="email"

                      name="email"

                      type="email"

                      value={form.email}

                      onChange={handleInputChange}

                      className={inputClass}

                      required

                      placeholder="e.g. professional@example.com"

                    />

                  </div>



                  {/* Phone No (Mandatory) */}

                  <div>

                    <label className={labelClass} htmlFor="phone">

                      Phone Number <span className="text-red-500">*</span>

                      <span className="text-[11px] font-normal text-slate-400">

                        (Mandatory)

                      </span>

                    </label>

                    <input

                      id="phone"

                      name="phone"

                      type="tel"

                      value={form.phone}

                      onChange={handleInputChange}

                      className={inputClass}

                      required

                      placeholder="e.g. +91 9876543210 or 9876543210"

                    />

                    <p className="mt-1 text-[11px] text-slate-500">

                      Required for booking updates and direct customer coordination.

                    </p>

                  </div>



                  {/* Profile Image URL */}

                  <div>

                    <label className={labelClass} htmlFor="profile_image">

                      Profile Image URL

                      <span className="text-[11px] font-normal text-slate-400">

                        (Optional)

                      </span>

                    </label>

                    <input

                      id="profile_image"

                      name="profile_image"

                      type="url"

                      value={form.profile_image}

                      onChange={handleInputChange}

                      className={inputClass}

                      placeholder="https://example.com/avatar.jpg"

                    />

                  </div>

                </div>

<div className="mb-4">

  <button

    type="button"

    onClick={handleGetCurrentLocation}

    disabled={locating}

    className="inline-flex items-center gap-2 rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"

  >

    {locating ? "Detecting Location..." : "Use Current Location"}

  </button>



  {locationStatus && (

    <p className="mt-2 text-sm text-slate-600">

      {locationStatus}

    </p>

  )}

</div>

                {/* Address (City, State) - Mandatory */}

                <div className="mt-5 border-t border-slate-100 pt-5">

                  <div className="flex items-center justify-between">

                    <label className={labelClass}>

                      Address (City, State) <span className="text-red-500">*</span>

                      <span className="text-[11px] font-normal text-slate-400">

                        (Mandatory)

                      </span>

                    </label>

                  </div>



                  <div className="mt-2 grid gap-4 sm:grid-cols-2">

                    <div>

                      <input

                        id="city"

                        name="city"

                        value={form.city}

                        onChange={handleInputChange}

                        className={inputClass}

                        required

                        placeholder="City (e.g. Mumbai, New Delhi, Pune)"

                      />

                      <p className="mt-1 text-[11px] text-slate-500">City *</p>

                    </div>



                    <div>

                      <input

                        id="state"

                        name="state"

                        value={form.state}

                        onChange={handleInputChange}

                        className={inputClass}

                        required

                        placeholder="State (e.g. Maharashtra, Karnataka)"

                      />

                      <p className="mt-1 text-[11px] text-slate-500">State *</p>

                    </div>

                  </div>

                </div>

              </div>



              {/* SECTION 2: Professional Details (Domain, Skills, Experience) */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">

                <div className="border-b border-slate-100 pb-3">

                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">

                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">

                      2

                    </span>

                    Professional Domain & Skills

                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">

                    Showcase your industry and technical skills to matching clients.

                  </p>

                </div>



                <div className="mt-5 space-y-5">

                  {/* Primary Domain */}

                  <div>

                    <label className={labelClass} htmlFor="domain">

                      Primary Domain <span className="text-red-500">*</span>

                    </label>

                    <select

                      id="domain"

                      name="domain"

                      value={form.domain}

                      onChange={handleInputChange}

                      className={inputClass}

                      required

                    >

                      <option value="">Select your domain</option>

                      {DOMAINS.map((domain) => (

                        <option key={domain} value={domain}>

                          {domain}

                        </option>

                      ))}

                    </select>

                  </div>



                  {/* Skills (Mandatory) */}

                  <div>

                    <label className={labelClass} htmlFor="skills-input">

                      Skills <span className="text-red-500">*</span>

                      <span className="text-[11px] font-normal text-slate-400">

                        (Mandatory - Add at least one)

                      </span>

                    </label>



                    {/* Skill Tags Container */}

                    <div className="mt-2 flex min-h-[46px] flex-wrap items-center gap-2 rounded-xl border border-slate-300 bg-white p-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">

                      {form.skills.map((skill) => (

                        <span

                          key={skill}

                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200"

                        >

                          {skill}

                          <button

                            type="button"

                            onClick={() => handleRemoveSkill(skill)}

                            className="text-blue-500 hover:text-blue-800"

                            aria-label={`Remove skill ${skill}`}

                          >

                            ×

                          </button>

                        </span>

                      ))}



                      <input

                        id="skills-input"

                        value={skillInput}

                        onChange={(e) => setSkillInput(e.target.value)}

                        onKeyDown={handleSkillKeyDown}

                        placeholder={

                          form.skills.length === 0

                            ? "Type a skill and press Enter or click Add (e.g. React.js, UI Design)"

                            : "Add another skill..."

                        }

                        className="flex-1 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-slate-400"

                      />



                      {skillInput.trim() && (

                        <button

                          type="button"

                          onClick={() => handleAddSkill()}

                          className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"

                        >

                          Add

                        </button>

                      )}

                    </div>



                    {/* Suggested skills based on selected domain */}

                    {form.domain && SUGGESTED_SKILLS[form.domain] && (

                      <div className="mt-2.5">

                        <p className="text-[11px] font-medium text-slate-500">

                          Popular for {form.domain} (click to add):

                        </p>

                        <div className="mt-1 flex flex-wrap gap-1.5">

                          {SUGGESTED_SKILLS[form.domain]

                            .filter((s) => !form.skills.includes(s))

                            .slice(0, 8)

                            .map((suggestion) => (

                              <button

                                key={suggestion}

                                type="button"

                                onClick={() => handleAddSkill(suggestion)}

                                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition"

                              >

                                + {suggestion}

                              </button>

                            ))}

                        </div>

                      </div>

                    )}

                  </div>



                  {/* Experience and Portfolio */}

                  <div className="grid gap-5 sm:grid-cols-2">

                    <div>

                      <label className={labelClass} htmlFor="experience_years">

                        Years of Experience

                        <span className="text-[11px] font-normal text-slate-400">

                          (Optional)

                        </span>

                      </label>

                      <input

                        id="experience_years"

                        name="experience_years"

                        type="number"

                        min="0"

                        max="80"

                        value={form.experience_years}

                        onChange={handleInputChange}

                        className={inputClass}

                        placeholder="e.g. 4"

                      />

                    </div>



                    <div>

                      <label className={labelClass} htmlFor="portfolio_url">

                        Portfolio / Website URL

                        <span className="text-[11px] font-normal text-slate-400">

                          (Optional)

                        </span>

                      </label>

                      <input

                        id="portfolio_url"

                        name="portfolio_url"

                        type="url"

                        value={form.portfolio_url}

                        onChange={handleInputChange}

                        className={inputClass}

                        placeholder="https://myportfolio.com"

                      />

                    </div>

                  </div>

                </div>

              </div>



              {/* SECTION 3: Brief Intro (Mandatory) */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">

                <div className="border-b border-slate-100 pb-3">

                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">

                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">

                      3

                    </span>

                    Brief Intro <span className="text-red-500">*</span>

                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">

                    Mandatory introduction describing your background, specialty, and services.

                  </p>

                </div>



                <div className="mt-5">

                  <label className={labelClass} htmlFor="bio">

                    Professional Bio / Introduction <span className="text-red-500">*</span>

                  </label>

                  <textarea

                    id="bio"

                    name="bio"

                    value={form.bio}

                    onChange={handleInputChange}

                    className={inputClass}

                    rows={4}

                    maxLength={2000}

                    required

                    placeholder="Provide a brief intro about yourself, your experience, what makes your services unique, and how you help clients achieve their goals..."

                  />

                  <div className="mt-1 flex items-center justify-between text-xs text-slate-400">

                    <span>Minimum 10 characters required.</span>

                    <span

                      className={

                        form.bio.length < 10

                          ? "text-red-500 font-medium"

                          : "text-slate-500"

                      }

                    >

                      {form.bio.length}/2000 characters

                    </span>

                  </div>

                </div>

              </div>



              {/* Save / Review Action Buttons */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-end">

                <Link

                  to="/professional/dashboard"

                  className="rounded-xl border border-slate-300 px-6 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"

                >

                  Cancel

                </Link>



                <button

                  type="submit"

                  disabled={saving || parsingResume}

                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"

                >

                  <span>Review & Save Profile</span>

                  <span aria-hidden="true">→</span>

                </button>

              </div>

            </form>

          </div>

        </div>

      </div>



      {/* POPUP MODAL: Check all details once before saving */}

      {showConfirmModal && (

        <div

          role="dialog"

          aria-modal="true"

          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"

        >

          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8 animate-in fade-in zoom-in-95 duration-150">

            {/* Modal Header */}

            <div className="border-b border-slate-100 pb-4">

              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">

                <span className="h-2 w-2 rounded-full bg-blue-600" />

                Confirmation & Review

              </div>

              <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">

                Check All Details Once

              </h2>

              <p className="mt-1 text-xs text-slate-500">

                Please verify all mandatory details below before finalizing and saving your profile.

              </p>

            </div>



            {/* Modal Details Scrollable Body */}

            <div className="mt-4 max-h-[60vh] space-y-3.5 overflow-y-auto pr-1 text-sm">

              {/* Full Name & Domain */}

              <div className="grid grid-cols-2 gap-3">

                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">

                  <p className="text-[11px] font-semibold text-slate-500 uppercase">

                    Full Name

                  </p>

                  <p className="mt-1 font-bold text-slate-900 truncate">

                    {form.name}

                  </p>

                </div>

                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">

                  <p className="text-[11px] font-semibold text-slate-500 uppercase">

                    Domain

                  </p>

                  <p className="mt-1 font-bold text-blue-700 truncate">

                    {form.domain}

                  </p>

                </div>

              </div>



              {/* Email (Mandatory) */}

              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">

                <div className="flex items-center justify-between">

                  <p className="text-[11px] font-semibold text-slate-500 uppercase">

                    Email Address

                  </p>

                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">

                    Mandatory

                  </span>

                </div>

                <p className="mt-1 font-medium text-slate-900">{form.email}</p>

              </div>



              {/* Phone No (Mandatory) */}

              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">

                <div className="flex items-center justify-between">

                  <p className="text-[11px] font-semibold text-slate-500 uppercase">

                    Phone Number

                  </p>

                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">

                    Mandatory

                  </span>

                </div>

                <p className="mt-1 font-medium text-slate-900">{form.phone}</p>

              </div>



              {/* Address (City, State) (Mandatory) */}

              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">

                <div className="flex items-center justify-between">

                  <p className="text-[11px] font-semibold text-slate-500 uppercase">

                    Address (City, State)

                  </p>

                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">

                    Mandatory

                  </span>

                </div>

                <p className="mt-1 font-medium text-slate-900">

                  📍 {form.city}, {form.state}

                </p>

              </div>



              {/* Skills (Mandatory) */}

              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">

                <div className="flex items-center justify-between">

                  <p className="text-[11px] font-semibold text-slate-500 uppercase">

                    Skills ({form.skills.length})

                  </p>

                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">

                    Mandatory

                  </span>

                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">

                  {form.skills.map((skill, index) => (

                    <span

                      key={index}

                      className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800"

                    >

                      {skill}

                    </span>

                  ))}

                </div>

              </div>



              {/* Brief Intro (Mandatory) */}

              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">

                <div className="flex items-center justify-between">

                  <p className="text-[11px] font-semibold text-slate-500 uppercase">

                    Brief Intro

                  </p>

                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">

                    Mandatory

                  </span>

                </div>

                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">

                  {form.bio}

                </p>

              </div>



              {/* Optional details: Experience & Portfolio */}

              {(form.experience_years || form.portfolio_url) && (

                <div className="grid grid-cols-2 gap-3">

                  {form.experience_years && (

                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">

                      <p className="text-[11px] font-semibold text-slate-500 uppercase">

                        Experience

                      </p>

                      <p className="mt-1 text-xs font-medium text-slate-900">

                        {form.experience_years} years

                      </p>

                    </div>

                  )}



                  {form.portfolio_url && (

                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">

                      <p className="text-[11px] font-semibold text-slate-500 uppercase">

                        Portfolio

                      </p>

                      <p className="mt-1 truncate text-xs font-medium text-blue-600">

                        {form.portfolio_url}

                      </p>

                    </div>

                  )}

                </div>

              )}



              {/* Resume Status */}

              {resumeName && (

                <div className="rounded-xl bg-indigo-50/70 p-3 border border-indigo-100 text-xs">

                  <span className="font-semibold text-indigo-900">

                    📄 Resume Attached:

                  </span>{" "}

                  <span className="text-indigo-700">{resumeName}</span>

                </div>

              )}

            </div>



            {/* Modal Actions */}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">

              <button

                type="button"

                onClick={() => setShowConfirmModal(false)}

                disabled={saving}

                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"

              >

                Back to Edit

              </button>



              <button

                type="button"

                onClick={handleConfirmSave}

                disabled={saving}

                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-60"

              >

                {saving ? (

                  <>

                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />

                    Saving Profile...

                  </>

                ) : (

                  <>✓ Confirm & Save</>

                )}

              </button>

            </div>

          </div>

        </div>

      )}

    </main>

  );

}
