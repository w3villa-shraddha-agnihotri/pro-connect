import { useEffect, useState } from "react";

import Navbar from "../components/Navbar";

import Footer from "../components/Footer";

import { useAuth } from "../context/AuthContext";

const API_URL = (

  import.meta.env.VITE_API_URL || "http://localhost:5000"

).replace(/\/+$/, "");

export default function FindCustomers() {

  const { user, hasActiveSubscription, subscriptionLoading } = useAuth();

  const isSubscriptionLocked =
    subscriptionLoading || !hasActiveSubscription;

  const [search, setSearch] = useState("");

  const [customers, setCustomers] = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [description, setDescription] = useState("");

  const [attachment, setAttachment] = useState(null);

  const [loading, setLoading] = useState(false);

  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  async function loadCustomers(query = "") {

    try {

      setLoading(true);

      setError("");

      const response = await fetch(

        `${API_URL}/api/connections/customers?search=${encodeURIComponent(query)}`,

        { credentials: "include" }

      );

      const data = await response.json();

      if (!response.ok) {

        throw new Error(data.message || "Unable to load customers.");

      }

      setCustomers(data.customers || []);

    } catch (err) {

      setError(err.message);

    } finally {

      setLoading(false);

    }

  }

  useEffect(() => {

    const timer = setTimeout(() => loadCustomers(search), 300);

    return () => clearTimeout(timer);

  }, [search]);

  async function sendRequest(e) {

    e.preventDefault();

    if (isSubscriptionLocked) {
      setError("Please activate your subscription to send connection requests.");
      return;
    }

    if (!selectedCustomer) return;

    if (description.trim().length < 10) {

      setError("Introduction must contain at least 10 characters.");

      return;

    }

    if (description.trim().length > 2000) {

      setError("Introduction cannot exceed 2000 characters.");

      return;

    }

    try {

      setSending(true);

      setError("");

      setSuccess("");

      const formData = new FormData();

      formData.append("customer_id", selectedCustomer.id);

      formData.append("description", description.trim());

      if (attachment) {

        formData.append("attachment", attachment);

      }

      const response = await fetch(

        `${API_URL}/api/connections/to-customer`,

        {

          method: "POST",

          credentials: "include",

          body: formData,

        }

      );

      const data = await response.json();

      if (!response.ok) {

        if (response.status === 409) {

          // If request already exists, remove customer from list and refresh

          setCustomers((prev) =>

            prev.filter((c) => c.id !== selectedCustomer.id)

          );

          setSelectedCustomer(null);

          loadCustomers(search);

        }

        throw new Error(data.message || "Unable to send request.");

      }

      setSuccess(`Request sent to ${selectedCustomer.name}.`);

      const sentCustomerId = selectedCustomer.id;

      setSelectedCustomer(null);

      setDescription("");

      setAttachment(null);

      // Refresh customers list immediately so the customer disappears from Explore Customers

      setCustomers((prev) => prev.filter((c) => c.id !== sentCustomerId));

      loadCustomers(search);

    } catch (err) {

      setError(err.message);

    } finally {

      setSending(false);

    }

  }

  return (

    <>

      <Navbar user={user} />

      <main className="min-h-screen bg-slate-50 px-4 py-10">

        <div className="mx-auto max-w-6xl">

          <div className="mb-8">

            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">

              ProConnect

            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">

              Find Customers

            </h1>

            <p className="mt-2 text-slate-600">

              Discover customers and introduce your professional services.

            </p>

          </div>

          {isSubscriptionLocked && (
            <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-amber-900">
                  Subscription required to send requests
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  You can search and explore customers, but an active subscription
                  is required to contact them.
                </p>
              </div>
              <a
                href="/subscription-plans"
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                View Plans
              </a>
            </div>
          )}

          <div className="mb-6">

            <input

              type="search"

              value={search}

              onChange={(e) => setSearch(e.target.value)}

              placeholder="Search customers by name or address..."

              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"

            />

          </div>

          {error && (

            <div className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">

              {error}

            </div>

          )}

          {success && (

            <div className="mb-5 rounded-lg bg-green-50 p-3 text-sm text-green-700">

              {success}

            </div>

          )}

          {selectedCustomer && !isSubscriptionLocked && (

            <form

              onSubmit={sendRequest}

              className="mb-8 rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm"

            >

              <div className="mb-5 flex items-center justify-between gap-3">

                <div>

                  <h2 className="text-xl font-semibold text-slate-900">

                    Send Connection Request

                  </h2>

                  <p className="mt-1 text-sm text-slate-500">

                    To: {selectedCustomer.name}

                  </p>

                </div>

                <button

                  type="button"

                  onClick={() => setSelectedCustomer(null)}

                  className="text-sm text-slate-500 hover:text-slate-900"

                >

                  Cancel

                </button>

              </div>

              <label className="mb-2 block text-sm font-medium text-slate-700">

                About Yourself / Introduction *

              </label>

              <textarea

                value={description}

                onChange={(e) => setDescription(e.target.value)}

                rows={5}

                minLength={10}

                maxLength={2000}

                required

                placeholder="Introduce yourself, explain your expertise and how you can help this customer..."

                className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-indigo-500"

              />

              <p className="mt-1 text-right text-xs text-slate-500">

                {description.length}/2000 characters

              </p>

              <div className="mt-5">

                <label className="mb-2 block text-sm font-medium text-slate-700">

                  Attach Document (Optional)

                </label>

                <input

                  type="file"

                  accept=".pdf,.doc,.docx"

                  onChange={(e) => {

                    const file = e.target.files?.[0];

                    if (file && file.size > 5 * 1024 * 1024) {

                      setAttachment(null);

                      setError("File size cannot exceed 5 MB.");

                      e.target.value = "";

                      return;

                    }

                    setError("");

                    setAttachment(file || null);

                  }}

                  className="block w-full rounded-lg border border-slate-200 p-3 text-sm"

                />

                <p className="mt-1 text-xs text-slate-500">

                  PDF, DOC or DOCX. Maximum size: 5 MB.

                </p>

                {attachment && (

                  <p className="mt-2 text-sm text-indigo-600">

                    Selected: {attachment.name}

                  </p>

                )}

              </div>

              <button

                type="submit"

                disabled={isSubscriptionLocked || sending}

                className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"

              >

                {sending ? "Sending..." : "Send Request"}

              </button>

            </form>

          )}

          {loading ? (

            <p className="py-10 text-center text-slate-500">

              Loading customers...

            </p>

          ) : customers.length === 0 ? (

            <div className="rounded-xl bg-white p-10 text-center text-slate-500">

              No customers found.

            </div>

          ) : (

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

              {customers.map((customer) => (

                <div

                  key={customer.id}

                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"

                >

                 <div className="flex items-center gap-3">

  {customer.profile_image_url ? (

    <img

      src={customer.profile_image_url}

      alt={customer.name || "Customer"}

      className="h-12 w-12 rounded-full object-cover"

      loading="lazy"

      onError={(e) => {

        e.currentTarget.style.display = "none";

      }}

    />

  ) : (

    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">

      {customer.name?.charAt(0)?.toUpperCase() || "C"}

    </div>

  )}

  <div className="min-w-0">

    <h3 className="truncate font-semibold text-slate-900">

      {customer.name}

    </h3>

    <p className="text-xs text-slate-500">Customer</p>

  </div>

</div>

                  {customer.address && (

                    <p className="mt-4 text-sm text-slate-600">

                      <span className="font-medium">Location:</span>{" "}

                      {customer.address}

                    </p>

                  )}

                  <button

                    onClick={() => {

                      setSelectedCustomer(customer);

                      setDescription("");

                      setAttachment(null);

                      setError("");

                      setSuccess("");

                      window.scrollTo({ top: 0, behavior: "smooth" });

                    }}

                    className="mt-5 w-full rounded-lg bg-indigo-50 px-4 py-2.5 font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"

                  >

                    Send Connection Request

                  </button>

                </div>

              ))}

            </div>

          )}

        </div>

      </main>

      <Footer />

    </>

  );

}
