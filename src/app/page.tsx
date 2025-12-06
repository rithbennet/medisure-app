import { getSignUpUrl, withAuth } from "@workos-inc/authkit-nextjs";
import Link from "next/link";

export default async function HomePage() {
  const { user } = await withAuth();
  const signUpUrl = await getSignUpUrl();

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-[#2563eb] text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-lg font-semibold">PreApproval</span>
          </div>
          <h1 className="hidden text-lg font-semibold sm:block">Insurance Preapproval Automation</h1>
          <div className="w-10" /> {/* Spacer for balance */}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg">
          {/* Hero Card */}
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            {/* Icon */}
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-[#2563eb] to-[#1d4ed8] shadow-lg">
                <svg className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
              Welcome to PreApproval
            </h2>
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-amber-400" />
            <p className="mb-8 text-center text-gray-600">
              Streamline your insurance preapproval process with our automated system. 
              Fast, secure, and efficient authorization management.
            </p>

            {user ? (
              /* Logged In State */
              <div className="space-y-6">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                      <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emerald-800">Signed in as</p>
                      <p className="font-semibold text-emerald-900">{user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Link
                    href="/dashboard"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-6 py-3 font-semibold text-white transition hover:bg-[#1d4ed8]"
                  >
                    Go to Dashboard
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Link>
                  <a
                    href="/auth/signout"
                    className="flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Sign out
                  </a>
                </div>
              </div>
            ) : (
              /* Logged Out State */
              <div className="space-y-6">
                {/* Features List */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                      <svg className="h-3.5 w-3.5 text-[#2563eb]" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    Submit preapproval requests in minutes
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                      <svg className="h-3.5 w-3.5 text-[#2563eb]" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    Real-time status tracking
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                      <svg className="h-3.5 w-3.5 text-[#2563eb]" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    Secure document management
                  </div>
                </div>

                <hr className="border-gray-200" />

                {/* Auth Buttons */}
                <div className="space-y-3">
                  <a
                    href={signUpUrl}
                    className="flex w-full items-center justify-center rounded-lg bg-[#2563eb] px-6 py-3 font-semibold text-white transition hover:bg-[#1d4ed8]"
                  >
                    Create an Account
                  </a>
                  <a
                    href="/auth/signin"
                    className="flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Sign In
                  </a>
                </div>

                <p className="text-center text-xs text-gray-500">
                  By signing up, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            )}
          </div>

          {/* Info Cards */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-[#2563eb] hover:shadow-md">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <svg className="h-5 w-5 text-[#2563eb]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mb-1 font-semibold text-gray-900">Fast Processing</h3>
              <p className="text-sm text-gray-600">
                Get preapproval decisions faster with our automated workflow system.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-[#2563eb] hover:shadow-md">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="mb-1 font-semibold text-gray-900">Secure & Compliant</h3>
              <p className="text-sm text-gray-600">
                HIPAA-compliant platform ensuring your medical data stays protected.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-gray-500">
          <p>© 2024 PreApproval. All rights reserved.</p>
          <p className="mt-1">Streamlining healthcare insurance authorization.</p>
        </div>
      </footer>
    </main>
  );
}
