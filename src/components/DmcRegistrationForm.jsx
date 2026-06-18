import { useState } from "react";
import { createMinistryClassRegistration } from "../lib/ministryClassRegistrations";
import CountryCombobox from "./ui/CountryCombobox";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  country: "",
  ministryInvolvement: "",
  discernmentFocus: "",
  contactConsent: false,
  website: "",
};

const inputClassName =
  "mt-2 h-12 w-full rounded-lg border border-black/10 bg-[#fbfaf7] px-4 text-sm text-black outline-none transition placeholder:text-black/35 hover:border-black/20 focus:border-[#8f6b32] focus:bg-white focus:ring-4 focus:ring-[#8f6b32]/10";
const countryInputClassName = inputClassName.replace("mt-2 ", "");
const labelClassName = "block text-sm font-semibold text-[#26231f]";

export default function DmcRegistrationForm() {
  const [form, setForm] = useState(initialForm);
  const [selectedDialCode, setSelectedDialCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateCountry = (countryName, country) => {
    const nextDialCode = country?.dialCode || "";

    setForm((current) => {
      const currentPhone = current.phone.trim();
      let nextPhone = current.phone;

      if (nextDialCode && !currentPhone) {
        nextPhone = `${nextDialCode} `;
      } else if (
        nextDialCode &&
        selectedDialCode &&
        currentPhone.startsWith(selectedDialCode)
      ) {
        nextPhone = `${nextDialCode}${currentPhone.slice(selectedDialCode.length)}`;
      }

      return {
        ...current,
        country: countryName,
        phone: nextPhone,
      };
    });

    if (nextDialCode) {
      setSelectedDialCode(nextDialCode);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const submissionForm = {
        ...form,
        phone: form.phone.trim() === selectedDialCode ? "" : form.phone,
      };
      const submission = await createMinistryClassRegistration(submissionForm);
      setResult(submission);
      setForm(initialForm);
      setSelectedDialCode("");
    } catch (submissionError) {
      setError(submissionError.message || "Unable to submit your pre-registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    return (
      <div
        className="rounded-lg border border-[#7d9b70]/45 bg-[#f3faef] p-6 text-[#24441f] md:p-8"
        role="status"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em]">
          {result.alreadyRegistered ? "Already pre-registered" : "Pre-registration received"}
        </p>
        <h2 className="mt-3 text-2xl font-extrabold text-black">
          {result.alreadyRegistered ? "You are already on the DMC list." : "Thank you for registering."}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-black/70">
          {result.confirmationEmailSent
            ? "A confirmation email has been sent. We will contact you with class dates and participation details when they are available."
            : result.message ||
              "Your registration was saved. We will contact you with class dates and participation details when they are available."}
        </p>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg border border-black bg-black px-5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:border-[#8f6b32] hover:bg-[#8f6b32]"
        >
          Register another person
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-7" noValidate>
      <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="dmc-website">Website</label>
        <input
          id="dmc-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(event) => updateField("website", event.target.value)}
        />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6b32]">
          Your details
        </p>
        <p className="mt-1 text-sm text-black/50">
          Tell us how to reach you when the class schedule is released.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClassName}>
          Full name
          <input
            type="text"
            value={form.fullName}
            onChange={(event) => updateField("fullName", event.target.value)}
            className={inputClassName}
            placeholder="Your full name"
            autoComplete="name"
            minLength={2}
            maxLength={100}
            required
          />
        </label>

        <label className={labelClassName}>
          Email address
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            className={inputClassName}
            placeholder="you@example.com"
            autoComplete="email"
            maxLength={160}
            required
          />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="dmc-country" className={labelClassName}>
            Country
          </label>
          <CountryCombobox
            id="dmc-country"
            value={form.country}
            onChange={updateCountry}
            className={countryInputClassName}
          />
        </div>

        <label className={labelClassName}>
          Phone or WhatsApp
          <input
            type="tel"
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            className={inputClassName}
            placeholder="Phone number"
            autoComplete="tel"
            maxLength={30}
          />
        </label>
      </div>

      <div className="border-t border-black/10 pt-1">
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6b32]">
          Your discernment journey
        </p>
        <p className="mt-1 text-sm text-black/50">
          A little context will help us prepare the class well.
        </p>
      </div>

      <label className={labelClassName}>
        Where are you in your ministry journey?
        <select
          value={form.ministryInvolvement}
          onChange={(event) => updateField("ministryInvolvement", event.target.value)}
          className={inputClassName}
          required
        >
          <option value="">Select one</option>
          <option value="exploring">I am exploring my purpose</option>
          <option value="sensing-a-call">I sense a call to ministry</option>
          <option value="currently-serving">I currently serve in ministry</option>
          <option value="ministry-leader">I lead a ministry</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label className={labelClassName}>
        What would you like clarity about? <span className="normal-case text-black/40">(Optional)</span>
        <textarea
          value={form.discernmentFocus}
          onChange={(event) => updateField("discernmentFocus", event.target.value)}
          className="mt-2 min-h-36 w-full resize-y rounded-lg border border-black/10 bg-[#fbfaf7] px-4 py-3 text-sm leading-relaxed text-black outline-none transition placeholder:text-black/35 hover:border-black/20 focus:border-[#8f6b32] focus:bg-white focus:ring-4 focus:ring-[#8f6b32]/10"
          placeholder="Share a brief note about the questions you are discerning."
          maxLength={1000}
        />
      </label>

      <label className="flex items-start gap-3 rounded-lg border border-black/10 bg-[#f6f6f3] p-4 text-sm leading-relaxed text-black/70">
        <input
          type="checkbox"
          checked={form.contactConsent}
          onChange={(event) => updateField("contactConsent", event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#8f6b32]"
          required
        />
        <span>
          I agree to be contacted by email or phone with DMC class dates and registration details.
        </span>
      </label>

      {error ? (
        <div className="rounded-lg border border-[#b54c3b]/30 bg-[#fff3ef] px-4 py-3 text-sm text-[#8f1e1c]" role="alert">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 border-t border-black/10 pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-[52px] w-full items-center justify-center rounded-lg border border-black bg-black px-6 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-[0_14px_30px_-18px_rgba(0,0,0,0.8)] transition hover:border-[#8f6b32] hover:bg-[#8f6b32] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Submitting..." : "Submit pre-registration"}
        </button>
        <p className="text-center text-xs leading-relaxed text-black/45">
          Your information will only be used for Discerning Ministry Class updates.
        </p>
      </div>
    </form>
  );
}
