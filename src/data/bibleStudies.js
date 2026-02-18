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
    key: "salvation-army",
    title: "Soteriology",
    groups: "4 groups subscribed",
    image: opendoor2,
    summary: "Heaven Mindedness",
    details:
      "This track focuses on spiritual discipline, conviction, and community. Participants explore what it means to stand for Christ in family, work, and society while staying rooted in grace and truth. Each session ends with reflection questions and practical action steps.",
  },
  {
    key: "bible-studies",
    title: "BIBLE STUDIES",
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
