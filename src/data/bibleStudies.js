import opendoor1 from "../assets/opendoor1.webp";
import opendoor2 from "../assets/opendoor2.webp";
import feb26 from "../assets/26feb.webp";

export const bibleStudies = [
  {
    key: "pray-together",
    title: "Pray Together",
    groups: "24 groups subscribed",
    image: opendoor1,
    summary:
      "A prayer-focused community study for building consistency, faith, and mutual support.",
    details:
      "This study helps participants build a practical prayer rhythm, learn how to pray with Scripture, and support each other through focused weekly prayer points. Sessions include short teaching, guided prayer moments, and testimonies from group members.",
  },
  {
    key: "salvation-army",
    title: "Salvation Army: Standing Together",
    groups: "4 groups subscribed",
    image: opendoor2,
    summary:
      "A study on standing firm in faith, unity, and Christian identity in everyday life.",
    details:
      "This track focuses on spiritual discipline, conviction, and community. Participants explore what it means to stand for Christ in family, work, and society while staying rooted in grace and truth. Each session ends with reflection questions and practical action steps.",
  },
  {
    key: "church-news",
    title: "Church News",
    groups: "18 groups subscribed",
    image: feb26,
    summary:
      "Weekly updates and themed Bible reflections connected to ministry direction.",
    details:
      "Church News brings together important ministry updates and Bible-based teaching for the current season. It is designed to keep everyone aligned with church vision, ongoing projects, and special prayer burdens while growing deeper in the Word together.",
  },
];

export function getBibleStudyByKey(key) {
  return bibleStudies.find((study) => study.key === key);
}
