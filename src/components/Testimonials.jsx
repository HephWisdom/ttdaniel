import Container from "./ui/Container";
import MotionReveal from "./ui/MotionReveal";
import bookTestimonyOne from "../assets/testimonials/1.mp4";
import bookTestimonyTwo from "../assets/testimonials/2.mp4";
import bookTestimonyThree from "../assets/testimonials/3.mp4";
import bookTestimonyFour from "../assets/testimonials/4.mp4";

const BOOK_VIDEO_TESTIMONIALS = [
  {
    id: "book-testimony-1",
    video: bookTestimonyOne,
    title: "Reader Reflection",
  },
  {
    id: "book-testimony-2",
    video: bookTestimonyTwo,
    title: "Life-Giving Insight",
  },
  {
    id: "book-testimony-3",
    video: bookTestimonyThree,
    title: "Faith in Practice",
  },
  {
    id: "book-testimony-4",
    video: bookTestimonyFour,
    title: "Transformation Story",
  },
];

function VideoCard({ item, index }) {
  return (
    <MotionReveal
      as="article"
      delay={90 + index * 80}
      distance={28}
      className="group mx-auto flex w-full max-w-[320px] flex-col overflow-hidden rounded-[28px] border border-[#cfb284]/65 bg-[#17110c] text-[#f8eed8] shadow-[0_28px_70px_-42px_rgba(0,0,0,0.7)] sm:max-w-none"
    >
      <div className="relative aspect-[9/16] overflow-hidden bg-black">
        <video
          src={item.video}
          controls
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-lg font-extrabold uppercase tracking-[0.02em] text-[#fff6e8]">
          {item.title}
        </h3>
      </div>
    </MotionReveal>
  );
}

export function BookTestimonials() {
  return (
    <section className="relative overflow-hidden border-t border-black/10 bg-[#ece2cf] text-[#1f1811]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-[#f8f0df] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#d4b06f]/25 blur-3xl" />
      </div>

      <Container className="relative py-14 md:py-18">
        <MotionReveal delay={40} distance={24}>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#806747]">
              Reader Voices
            </p>
            <h2 className="mt-3 text-[34px] font-black uppercase tracking-tight md:text-[40px]">
              Book Testimonials
            </h2>
          </div>
        </MotionReveal>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {BOOK_VIDEO_TESTIMONIALS.map((item, index) => (
            <VideoCard key={item.id} item={item} index={index} />
          ))}
        </div>
      </Container>
    </section>
  );
}
