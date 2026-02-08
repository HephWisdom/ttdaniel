import { Link, useParams } from "react-router-dom";
import Container from "../components/ui/Container";
import { getBibleStudyByKey } from "../data/bibleStudies";

export default function BibleStudyDetails() {
  const { studyKey } = useParams();
  const study = getBibleStudyByKey(studyKey);

  if (!study) {
    return (
      <section className="bg-white">
        <Container className="py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/50">
              Bible Study Details
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-black md:text-4xl">
              Study not found
            </h1>
            <p className="mt-4 text-sm text-black/70 md:text-base">
              The study you are looking for does not exist or has been moved.
            </p>
            <Link
              to="/#bible_studies"
              className="mt-8 inline-flex items-center justify-center rounded-full border border-black px-6 py-3 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
            >
              Back to Bible studies
            </Link>
          </div>
        </Container>
      </section>
    );
  }

  return (
    <section className="bg-white">
      <Container className="py-14 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/#bible_studies"
            className="inline-flex items-center text-sm font-semibold text-black/70 transition hover:text-black"
          >
            Back to Bible studies
          </Link>

          <div className="mt-6 overflow-hidden rounded-3xl border border-black/10">
            <img
              src={study.image}
              alt={study.title}
              className="h-64 w-full object-cover md:h-80"
            />
          </div>

          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-black/50">
            Bible Study Details
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-black md:text-5xl">
            {study.title}
          </h1>

          <div className="mt-8 rounded-2xl border border-black/10 bg-[#fafafa] p-6 md:p-8">
            <p className="text-base text-black/80 md:text-lg">{study.summary}</p>
            <p className="mt-5 text-sm leading-relaxed text-black/80 md:text-base">
              {study.details}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
