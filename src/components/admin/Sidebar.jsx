import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AnalyticsIcon,
  ArticleIcon,
  CalendarIcon,
  DonationIcon,
  DraftIcon,
  EbookIcon,
  HomeIcon,
  LogoIcon,
  SubscribersIcon,
} from "./AdminIcons";

function getSidebarItems(location) {
  const isCreateRoute = location.pathname.startsWith("/admin/blog/create");
  const isDraftRoute = location.pathname.startsWith("/admin/blog/drafts");
  const isCalendarView = isCreateRoute && location.hash === "#publish-settings";

  return [
    {
      key: "overview",
      title: "Home",
      active: location.pathname === "/admin/blog" || location.pathname === "/admin/blog/",
      onClickPath: "/admin/blog",
      icon: <HomeIcon />,
    },
    {
      key: "analytics",
      title: "Analytics",
      active: location.pathname.startsWith("/admin/blog/analytics"),
      onClickPath: "/admin/blog/analytics",
      icon: <AnalyticsIcon />,
    },
    {
      key: "subscribers",
      title: "Subscribers",
      active: location.pathname.startsWith("/admin/blog/subscribers"),
      onClickPath: "/admin/blog/subscribers",
      icon: <SubscribersIcon />,
    },
    {
      key: "ebooks",
      title: "E-book Purchases",
      active: location.pathname.startsWith("/admin/blog/ebooks"),
      onClickPath: "/admin/blog/ebooks",
      icon: <EbookIcon />,
    },
    {
      key: "donations",
      title: "Donations",
      active: location.pathname.startsWith("/admin/blog/donations"),
      onClickPath: "/admin/blog/donations",
      icon: <DonationIcon />,
    },
    {
      key: "articles",
      title: "Articles",
      active: isCreateRoute && !isCalendarView,
      onClickPath: "/admin/blog/create",
      icon: <ArticleIcon />,
    },
    {
      key: "drafts",
      title: "Drafts",
      active: isDraftRoute,
      onClickPath: "/admin/blog/drafts",
      icon: <DraftIcon />,
    },
    {
      key: "calendar",
      title: "Calendar",
      active: isCalendarView,
      onClickPath: "/admin/blog/create#publish-settings",
      icon: <CalendarIcon />,
    },
  ];
}

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const items = getSidebarItems(location);

  useEffect(() => {
    onClose?.();
  }, [location.pathname, location.hash, onClose]);

  const handleNavigate = (path) => {
    navigate(path);
    onClose?.();
  };

  return (
    <>
      <button
        type="button"
        className={`blog-admin-sidebar-backdrop ${isOpen ? "is-open" : ""}`}
        aria-label="Close sidebar"
        onClick={onClose}
      />
      <aside className={`blog-admin-sidebar ${isOpen ? "is-open" : ""}`}>
        <div className="blog-admin-sidebar-logo" aria-hidden="true">
          <LogoIcon />
        </div>

        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            title={item.title}
            aria-label={item.title}
            className={`blog-admin-sidebar-icon ${item.active ? "active" : ""}`}
            onClick={() => handleNavigate(item.onClickPath)}
          >
            {item.icon}
          </button>
        ))}
      </aside>
    </>
  );
}
