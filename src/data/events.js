import opendoor1 from "../assets/opendoor1.webp";
import opendoor2 from "../assets/opendoor2.webp";
import ghanaTrainingSeminarPoster from "../assets/events/WhatsApp Image 2026-02-12 at 20.25.49.jpeg";
import holyConvocationPoster from "../assets/events/WhatsApp Image 2026-02-12 at 20.31.35.jpeg";

export const featuredEvent = {
  title: "Open Door Prayer and Prophetic Expo February 2026",
  date: "Register before 26TH FEB, 2026",
  price: "REGISTER FOR FREE",
  venue: "Global Event Online By (Zoom)",
  desc: null,
  img: opendoor1,
  detailsHref: "/event-details",
  deadline: "2026-02-26",
};

export const featuredEvents = [
  featuredEvent,
  {
    title: "EBA Faith Seeking Understanding Ghana Training Seminar",
    date: "Register before 28TH FEB, 2026",
    price: "REGISTER NOW",
    venue: "Trinity Theological Seminary, East Legon, Accra",
    desc: "Ghana, in case you have not yet seen this opportunity, you have not missed it yet. Turn to it now.",
    details:
      "It is the EBA Faith Seeking Understanding Ghana Training Seminar at Trinity Theological Seminary, East Legon, Accra. Registration is officially open and closes when the expected number is attained. Please register today using the form link below, or scan the QR code on the card.",
    img: ghanaTrainingSeminarPoster,
    detailsHref: "https://www.pleasantpentecostal.org/registration",
    isExternal: true,
    deadline: "2026-02-28",
  },
  {
    title: "Annual Holy Convocation (GHA) 2026",
    date: "Register before 25TH MAY, 2026",
    price: "REGISTER NOW",
    venue: "Week-long Holy Services (See poster for details)",
    desc: "Ends with ordination of new pastors, consecration of apostles and bishops with licenses. Attend for spiritual empowerment.",
    details:
      "The Annual Holy Convocation (GHA) 2026 is here. This week-long event ends with ordination of new pastors, consecration of apostles, and bishops with licenses. If you are looking forward to these holy services or want to attend for spiritual empowerment, register before 25th May, 2026. More details are available in the registration form.",
    img: holyConvocationPoster,
    detailsHref:
      "https://docs.google.com/forms/d/1pqLicySzLpO527CJn7VqahWY_3SkpzY93FQL7uiYCIg/preview",
    isExternal: true,
    deadline: "2026-05-25",
  },
];

export const eventDetailSessions = [
  {
    title: "(GENERAL SESSION) Open Door Prayer and Prophetic Expo February 2026",
    date: "26TH FEB 2026",
    price: "REGISTER",
    venue: "Online (Zoom)",
    desc: "Register free to join the general prayer and prophetic session online.",
    img: opendoor1,
    formHref:
      "https://docs.google.com/forms/d/e/1FAIpQLScq-RMZqAfAWAYKQFJ4NPxPA9_10-faI_XswLP4TyP1raHLvw/viewform?usp=publish-editor",
    kind: "free",
  },
  {
    title: "Private Consultation and Counseling",
    date: "By Appointment",
    price: "PAID",
    venue: "Online (Zoom)",
    desc: "Private session with the servants of God for personal counsel and prayer.",
    img: opendoor2,
    formHref:
      "https://docs.google.com/forms/d/e/1FAIpQLSezwZDN0dZST0TKg7WRK_dPrpzDJWYS58VsL17mmh2PAVzGVw/viewform?usp=dialog",
    kind: "one-on-one",
  },
];
