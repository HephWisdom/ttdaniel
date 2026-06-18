import warfareWelfareFlyer from "../assets/warfare-welfare.jpeg";
import opendoor2 from "../assets/salvation.png";
import feb26 from "../assets/news.png";

export const bibleStudies = [
  {
    key: "pray-together",
    title: "WARFARE FOR WELFARE",
    groups: "24 groups subscribed",
    image: warfareWelfareFlyer,
    summary: "Weekly Wednesday Prayers",
    details:
      "This meeting helps participants build a practical prayer rhythm, learn how to pray with Scripture, and support each other through focused weekly prayer points. Sessions include short teaching, guided prayer moments, and testimonies from group members.",
    schedule: "6:00 PM Central Time (Please convert to your local time)",
    zoomUrl:
      "https://us06web.zoom.us/j/6517935609?pwd=NMlOlCOJ9eitIMpn0nGRwGfP0p11Ev.1",
  },
  {
    key: "discerning-ministry-class",
    title: "Discerning Ministry Class (DMC)",
    groups: "Pre-registration open",
    image: opendoor2,
    status: "Coming Soon",
    registrationEnabled: true,
    summary: "Pre-registration is now open for the Discerning Ministry Class.",
    cardSummary:
      "Uncertain about your purpose or calling? DMC will help guide your discernment journey.",
    teaser:
      'Are you still in confusion about what exactly your life on earth is all about? Do you feel "Called" but just not certain? Are you having questions? Then register for the Discerning Ministry Class. DMC will help you in your discernment process. We are accepting pre-registration.',
    details:
      'Are you still in confusion about what exactly your life on earth is all about? Do you feel "Called" but just not certain? Are you having questions? Then register for the Discerning Ministry Class. DMC will help you in your discernment process. We are accepting pre-registration.',
  },
  {
    key: "bible-studies",
    title: "PROPHETIC TEACHINGS",
    groups: "18 groups subscribed",
    image: feb26,
    summary:
      "Weekly study on themed Biblical reflections connected to ministry and practical christian living.",
    details:
      "Church News brings together important ministry updates and Bible-based teaching for the current season. It is designed to keep everyone aligned with church vision, ongoing projects, and special prayer burdens while growing deeper in the Word together.",
  },
];

export function getBibleStudyByKey(key) {
  return bibleStudies.find((study) => study.key === key);
}
