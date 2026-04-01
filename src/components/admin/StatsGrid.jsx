import GeneralResultsCard from "./GeneralResultsCard";
import ImpressionsCard from "./ImpressionsCard";
import TopLocationsCard from "./TopLocationsCard";
import VisitorsCard from "./VisitorsCard";

export default function StatsGrid() {
  return (
    <div className="blog-admin-stats-grid">
      <VisitorsCard />
      <TopLocationsCard />
      <GeneralResultsCard />
      <ImpressionsCard />
    </div>
  );
}
