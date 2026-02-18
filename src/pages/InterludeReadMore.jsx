import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Container from "../components/ui/Container";
import founderImage from "../assets/gallery/IMG-20260208-WA0015.jpg";

const aboutSections = [
  {
    id: "life",
    label: "LIFE",
    paragraphs: [
      "Apostle Dr. Nene Tettey Tsokpor Daniel, is known in ministry as Rev. TT Daniel - The Revivalist. He is the founder and the first President of the Pleasant Pentecostal Church (PPC) headquartered in Ghana. He was installed the tribal Chief of the Dangme community in the State of Minnesota, in the United States of America in the leap year of 2024.",
      "Having been born again around age 13 while in basic school, he started worshipping at the St. Dominic Catholic Church at Dawhenya, a town in the Ningo-Prampram District of the Greater Accra Region of the Republic of Ghana. During his Senior High School education, he encountered the Holy Spirit, and was radically transformed. From thence, he became passionate about the Charismatic and Pentecostal movement, and having prayerfully sought counsel, he joined the then Miracle Life Gospel Church (now Life International Church) under the highly esteemed Bishop Dr. Gordon Kisseih in 2007. He worshiped at Faith Chapel, Tema Community 5, until he was advised by the Bishop to connect to Emmanuel Chapel, a branch of the Church in his hometown, Prampram where he began serving his way upwards.",
    ],
  },
  {
    id: "MINISTRY",
    label: "Ministry",
    paragraphs: [
      "TT Daniel was commissioned a Pastor in 2014, and in less than three years, he was called and ordained as a Reverend Minister, instead of the usual five years policy between Commissioning and Ordination. He served as a Pastor at Life International Church, Emmanuel Chapel until the leap year 2020, where he relocated his family from town, and subsequently travelled to Dubai in the United Arab Emirates in October that same year. It was in Dubai that the Lord called him to return to Ghana to start the Pleasant Pentecostal Church.",
    ],
  },
  {
    id: "LEADERSHIP",
    label: "Leadership",
    paragraphs: [
      "Apostle Dr. Nene TT Daniel is a very enterprising leader who also founded Life Path Center, a non-profit social enterprise which provides a life changing experience for single and teenage mothers to acquire self-starter skills for income generation. He's also the owner of Job Daddy Consult Ltd. in Ghana. In 2016, TT Daniel's leadership prowess was recognized, and he was subsequently selected among the top 100 young prolific world leaders by IREX - a US based research organization with full funding from the United States government under President Barack Obama's administration for a four month international fellowship in Boston, Massachusetts.",
    ],
  },
  {
    id: "EDUCATION",
    label: "Education",
    paragraphs: [
      "TT Daniel holds an Honorary Doctorate Degree (Doctor of Divinity, Japan Bible Institute), a Master's Degree in Leadership and Innovation for Ministry (Luther Seminary, USA), a Bachelor's Degree in Business Administration, majoring in Banking and Finance (Valley View University, Ghana), a Diploma in Strategic Marketing Management (ICM - UK), a Continuing Education Certificate in Community Development (George Mason University - USA) among other educational credentials. He is an International Certified Manager (jointly recognized by the Oxford Training Center - UK, and the Saad Allah Management and Training Consultant - Dubai). TT Daniel is a Fellow of IREX Community Solutions Program, and an Alum of the US Department of States. He is a published author of many books, several articles and has been a preferred conference speaker both locally and internationally. The esteemed Apostle Dr. Nene TT Daniel is a born leader, a healing Revivalist, operates in the prophetic gift, and one who understands his mandate as to \"reach out to the world; influence leaders and transform society through the power of the gospel of Jesus Christ.\"",
    ],
  },
  {
    id: "FAMILY",
    label: "Family",
    paragraphs: [
      "He is married to Elizabeth, a professional nurse, and blessed with children; Jayson Nii Tettey Tsokpor-Pardie being their firstborn.",
    ],
  },
];

export default function InterludeReadMore() {
  const [activeSection, setActiveSection] = useState("all");
  const [visibleSectionIds, setVisibleSectionIds] = useState(() =>
    aboutSections.map((section) => section.id)
  );
  const sectionRefs = useRef({});

  const visibleSections = useMemo(() => {
    if (activeSection === "all") return aboutSections;
    return aboutSections.filter((section) => section.id === activeSection);
  }, [activeSection]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const newlyVisible = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target.getAttribute("data-section-id"))
          .filter(Boolean);

        if (newlyVisible.length === 0) return;

        setVisibleSectionIds((prev) => {
          const merged = new Set(prev);
          newlyVisible.forEach((id) => merged.add(id));
          return Array.from(merged);
        });
      },
      { threshold: 0.22, rootMargin: "0px 0px -8% 0px" }
    );

    visibleSections.forEach((section) => {
      const node = sectionRefs.current[section.id];
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [visibleSections]);

  return (
    <main className="scroll-smooth bg-[#e5e7eb] text-[#1f1810]">
      <section className="relative overflow-hidden border-b border-[#cfbb98]/60 bg-[#000000] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_460px_at_15%_0%,rgba(255,255,255,0.12),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_300px_at_90%_0%,rgba(255,255,255,0.08),transparent_58%)]" />

        <Container className="relative py-14 md:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/70">
            About The Founder/President
          </p>
          <h1 className="mt-4 max-w-5xl font-serif text-4xl font-bold leading-tight text-white md:text-6xl">
            Apostle Dr. Nene Tettey Tsokpor Daniel
          </h1>
          <p className="mt-6 max-w-4xl text-sm leading-relaxed text-white/80 md:text-base">
            Known in ministry as Rev. TT Daniel - The Revivalist.
          </p>
        </Container>
      </section>

      <section className="sticky top-16 z-30 border-b border-[#d2bf9e]/70 bg-black backdrop-blur-xl">
        <Container className="py-4">
          <nav aria-label="About sections" className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveSection("all");
                setVisibleSectionIds(aboutSections.map((section) => section.id));
              }}
              className={`inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all duration-300 ${
                activeSection === "all"
                  ? "border-[#f2ddad] bg-[#000000] text-[#f2ddad] shadow-[0_10px_24px_-12px_rgba(242,221,173,0.55)]"
                  : "border-[#d8c193] bg-gradient-to-b from-[#fffdf7] to-[#f1e3c3] text-[#2b1d0c] shadow-[0_10px_24px_-16px_rgba(0,0,0,0.55)] hover:-translate-y-0.5 hover:border-[#f2ddad] hover:from-[#8f6b32] hover:to-[#5d4320] hover:text-[#fff7e3] hover:shadow-[0_16px_34px_-16px_rgba(143,107,50,0.9)]"
              }`}
            >
              All
            </button>
            {aboutSections.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveSection(item.id);
                  setVisibleSectionIds([item.id]);
                }}
                className={`inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all duration-300 ${
                  activeSection === item.id
                    ? "border-[#f2ddad] bg-[#000000] text-[#f2ddad] shadow-[0_10px_24px_-12px_rgba(242,221,173,0.55)]"
                    : "border-[#d8c193] bg-gradient-to-b from-[#fffdf7] to-[#f1e3c3] text-[#2b1d0c] shadow-[0_10px_24px_-16px_rgba(0,0,0,0.55)] hover:-translate-y-0.5 hover:border-[#f2ddad] hover:from-[#8f6b32] hover:to-[#5d4320] hover:text-[#fff7e3] hover:shadow-[0_16px_34px_-16px_rgba(143,107,50,0.9)]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </Container>
      </section>

      <section className="border-b border-[#d2bf9e]/70 bg-[#e5e7eb]">
        <Container className="py-10 md:py-14">
          <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="space-y-4">
              {visibleSections.map((section) => (
                <section
                  key={section.id}
                  ref={(node) => {
                    sectionRefs.current[section.id] = node;
                  }}
                  data-section-id={section.id}
                  className={`rounded-2xl border border-[#d0bc98] bg-[#fffdf8] p-7 shadow-[0_30px_60px_-42px_rgba(41,27,10,0.35)] transition-all duration-700 ease-out hover:-translate-y-1.5 hover:border-[#b99354] hover:shadow-[0_38px_78px_-36px_rgba(41,27,10,0.48)] md:p-10 ${
                    visibleSectionIds.includes(section.id)
                      ? "translate-y-0 opacity-100"
                      : "translate-y-4 opacity-0"
                  }`}
                >
                  <h2 className="font-serif text-2xl font-semibold leading-tight text-[#23180f] md:text-3xl">
                    {section.label}
                  </h2>
                  {section.paragraphs.map((paragraph, index) => (
                    <p
                      key={`${section.id}-${index}`}
                      className="mt-5 text-sm leading-8 text-[#4d3f30] md:text-[15px]"
                    >
                      {paragraph}
                    </p>
                  ))}
                </section>
              ))}
            </article>

            <figure className="overflow-hidden lg:sticky lg:top-28 lg:min-h-[900px]">
              <img
                src={founderImage}
                alt="TT Daniel portrait"
                className="h-full min-h-[560px] w-full object-cover object-top lg:min-h-[900px]"
                loading="lazy"
              />
            </figure>
          </div>
        </Container>
      </section>

      <section className="bg-[#e5e7eb]">
        <Container className="py-10 md:py-14">
            <div>
              <Link
                to="/#about"
                className="inline-flex items-center justify-center border border-[#8f6b32] bg-[#000000] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f2ddb4] transition hover:border-[#1e150d] hover:bg-[#000000] hover:text-white"
              >
                Back to Interlude
              </Link>
            </div>
        </Container>
      </section>
    </main>
  );
}
