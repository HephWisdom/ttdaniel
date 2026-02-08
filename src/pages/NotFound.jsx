import { Link } from "react-router-dom";
import Container from "../components/ui/Container";

export default function NotFound() {
  return (
    <section className="bg-white">
      <Container className="py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/50">404</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-black md:text-5xl">
            Page not found
          </h1>
          <p className="mt-4 text-sm text-black/70 md:text-base">
            The page you requested does not exist.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center justify-center rounded-full border border-black px-6 py-3 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
          >
            Back to home
          </Link>
        </div>
      </Container>
    </section>
  );
}
