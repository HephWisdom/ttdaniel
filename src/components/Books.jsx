import React from "react";
import Container from "./ui/Container";
// fallback/demo image (already present)
import before_prayer from "../assets/books/before_prayer.jpeg";
import christianhomeculture from "../assets/books/christian_home_culture.jpeg";
import intro_to_faith_energy from "../assets/books/introduction_to_faith_energy.jpeg";
import courtship_companion from "../assets/books/courtship_companionship.jpeg";
import new_lives_in_christ from "../assets/books/40_lives.jpeg";
import sweetful_sin from "../assets/books/sweetful_sin.jpeg";

const events = [
    {
        title: "BEFORE PRAYER",
        price: "$12.00",
        image: before_prayer,
        amazon: "https://www.amazon.com/BEFORE-PRAYER-Decrypting-Ancient-Prayer/dp/B0CVTLS6KD/ref=sr_1_1?crid=28ROHEI467216&dib=eyJ2IjoiMSJ9._MTQJancXYiTlohAn_wYR0tCdL_0kEXxGRV8NKebMcw.rNHKACYQVa6UILaJ1ag-Y0HHL66auE4fEdTX7EdQ1ow&dib_tag=se&keywords=Before+Prayer+by+TT+Daniel&qid=1769883200&sprefix=before+prayer+by+tt+daniel%2Caps%2C190&sr=8-1",
        ebook: "https://your-site.com/ebooks/you-and-the-holyspirit.pdf",
    },
    {
        title: "CHRISTIAN HOME CULTURE",
        price: "$10.00",
        image: christianhomeculture,
        amazon: "https://www.amazon.com/CHRISTIAN-HOME-CULTURE-Pleasant-Introductions/dp/B0B92RGYT4/ref=sr_1_1?dib=eyJ2IjoiMSJ9.aO22zUmfbIGmk7jEJb4-_w.eAXr8C3_c-l9PixK22wk4ztWXmZkoQQ8fqLqI5qWpgU&dib_tag=se&keywords=Christian+Home+Culture+-+TT+Daniel&qid=1769883547&sr=8-1",
        ebook: "https://your-site.com/ebooks/financial-model-precision.pdf",
    },
    {
        title: "NTRODUCTION TO FAITH ENERGY",
        price: "$7.00",
        image: intro_to_faith_energy,
        amazon: "//www.amazon.com/INTRODUCTION-FAITH-ENERGY-Things-Possible/dp/B0CW29MYBG/ref=sr_1_1?crid=2U86FXX2DI4WO&dib=eyJ2IjoiMSJ9.1dsTMOXyF2rXqt5Eqh0bcQ.8wV7larg0jnd9-Wmo53QXnXCLttaw4nmj4oxlUMo9Oc&dib_tag=se&keywords=Introduction+to+Faith+Energy+-+TT+Daniel&qid=1769883614&sprefix=introduction+to+faith+energy+-+tt+daniel%2Caps%2C142&sr=8-1",
        ebook: "https://your-site.com/ebooks/all-hands-on-deck.pdf",
    },
    {
        title: "Courtship\nCompanion",
        price: "$15.00",
        image: courtship_companion,
        amazon: null,
        ebook: "https://your-site.com/ebooks/strategic-blueprint.pdf",
    },
    {
        title: "THE 40 NEW LIVES \nIN CHRIST",
        price: "$2.99.00",
        image: new_lives_in_christ,
        amazon: "https://www.amazon.com/40-New-Lives-Christ-Which-ebook/dp/B07Z52CJW3/ref=sr_1_1?crid=26SJ02YBAYMRK&dib=eyJ2IjoiMSJ9.EYyM2sl7e5DcDBduTf_dl0UkwGD4Nsq_c1vN4aL8MsY.AQdKTMns54njVJ1Dc3SPDht4cSfSuFvGopAHocEzQxc&dib_tag=se&keywords=40+new+lives+in+Christ+-+TT+Daniel&nsdOptOutParam=true&qid=1769883746&sprefix=40+new+lives+in+christ+-+tt+daniel%2Caps%2C148&sr=8-1",
        ebook: "https://your-site.com/ebooks/mastering-leadership.pdf",
    },
    {
        title: "Sinful\nSweets",
        price: "€6.99.00",
        image: sweetful_sin,
        amazon: null,
        ebook: "https://your-site.com/ebooks/innovation-playbook.pdf",
    },
];

export default function Books() {
    return (
        <section id="books" className="bg-gray-50 text-black">
            <Container className="py-24">
                {/* SECTION TITLE */}
                <h2 className="text-[35px] font-extrabold uppercase tracking-tight text-center">
                    Books
                </h2>

                {/* CARDS GRID */}
                <div className="mt-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {events.map((pkg, idx) => (
                            <article
                                key={pkg.title + idx}
                                className="
                  group
                  relative
                  flex flex-col h-full bg-white
                  shadow-sm
                  overflow-hidden
                  rounded-3xl
                  transform transition-transform duration-300 ease-out
                  shadow-[0_20px_40px_-20px_rgba(0,0,0,0.45)]
                  hover:-translate-y-2 hover:scale-[1.02] hover:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]
                "
                            >
                                {/* IMAGE */}
                                <div className="w-full h-56 bg-gray-100 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={pkg.image}
                                        alt={pkg.title.replace(/\n/g, " ")}
                                        onError={(e) => { e.currentTarget.src = before_prayer; }}
                                        className="w-full h-full object-cover blur-[2px] transition-all duration-300 group-hover:scale-105 group-hover:blur-0"
                                    />
                                </div>

                                {/* CENTERED CONTENT */}
                                <div className="p-5 flex-1 flex flex-col items-center text-center">
                                    <h3 className="text-[18px] md:text-[20px] font-extrabold uppercase leading-tight whitespace-pre-line">
                                        {pkg.title}
                                    </h3>

                                    <p className="mt-3 text-sm font-mono text-gray-700">{pkg.price}</p>

                                    <div className="mt-6 w-full flex gap-3 justify-center">
                                        <a
                                            href={pkg.amazon || "#"}
                                            onClick={(e) => { if (!pkg.amazon) e.preventDefault(); }}
                                            className={`flex-1 inline-flex items-center justify-center h-11 border border-black text-[14px] uppercase transition-colors ${
                                                pkg.amazon
                                                    ? "bg-transparent hover:bg-black hover:text-white"
                                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                            }`}
                                            target={pkg.amazon ? "_blank" : undefined}
                                            rel={pkg.amazon ? "noopener noreferrer" : undefined}
                                            aria-disabled={!pkg.amazon}
                                            tabIndex={pkg.amazon ? undefined : -1}
                                            aria-label={`${pkg.title.replace(/\n/g, " ")} on Amazon`}
                                        >
                                            Amazon
                                        </a>
                                        <a
                                            href={pkg.ebook || "#"}
                                            onClick={(e) => { if (!pkg.ebook) e.preventDefault(); }}
                                            className="flex-1 inline-flex items-center justify-center h-11 border border-black text-[14px] uppercase bg-transparent hover:bg-black hover:text-white transition-colors"
                                            target={pkg.ebook ? "_blank" : undefined}
                                            rel={pkg.ebook ? "noopener noreferrer" : undefined}
                                            aria-label={`${pkg.title.replace(/\n/g, " ")} e-book`}
                                        >
                                            E-book
                                        </a>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </Container>
        </section>
    );
}
