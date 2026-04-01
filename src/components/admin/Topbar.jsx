import { useLocation, useNavigate } from "react-router-dom";
import {
  MenuIcon,
  MessagesIcon,
  NotificationsIcon,
  SearchIcon,
} from "./AdminIcons";
import useAdminBlog from "./useAdminBlog";

const tabs = [
  { label: "Overview", path: "/admin/blog" },
  { label: "Articles", path: "/admin/blog/create" },
  { label: "Analytics", path: "/admin/blog/analytics" },
];

function isTabActive(tabPath, location) {
  if (tabPath === "/admin/blog") {
    return location.pathname === "/admin/blog" || location.pathname === "/admin/blog/";
  }

  return location.pathname.startsWith(tabPath);
}

export default function Topbar({ onMenuToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { adminDisplayName, authEmail } = useAdminBlog();
  const avatarLetter = String(adminDisplayName || "A").trim().charAt(0).toUpperCase() || "A";

  return (
    <header className="blog-admin-topbar">
      <button
        type="button"
        className="blog-admin-menu-toggle"
        aria-label="Open menu"
        onClick={onMenuToggle}
      >
        <MenuIcon />
      </button>

      <nav className="blog-admin-nav-tabs" aria-label="Dashboard navigation">
        {tabs.map((tab) => (
          <button
            key={tab.path}
            type="button"
            className={`blog-admin-nav-tab ${isTabActive(tab.path, location) ? "active" : ""}`}
            onClick={() => navigate(tab.path)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="blog-admin-topbar-right">
        <button type="button" className="blog-admin-topbar-icon" aria-label="Search">
          <SearchIcon />
        </button>
        <button type="button" className="blog-admin-topbar-icon" aria-label="Messages">
          <MessagesIcon />
          <span className="blog-admin-badge" />
        </button>
        <button type="button" className="blog-admin-topbar-icon" aria-label="Notifications">
          <NotificationsIcon />
          <span className="blog-admin-badge" />
        </button>

        <button type="button" className="blog-admin-avatar-wrapper">
          <span className="blog-admin-avatar">{avatarLetter}</span>
          <span className="blog-admin-avatar-meta">
            <span className="blog-admin-avatar-name">{adminDisplayName || "TT DANIEL"}</span>
            {authEmail ? <span className="blog-admin-avatar-email">{authEmail}</span> : null}
          </span>
        </button>
      </div>
    </header>
  );
}
