import Avatar from "./Avatar";
import { NAV_ITEMS } from "../lib/constants";
import { icons } from "../lib/icons";
import NotificationButton from "./NotificationButton";

export default function TopNav({ currentView, onChange, currentUser, onProfile, onLogout, onToggleTheme, theme }) {
  const navItems = currentUser
    ? NAV_ITEMS.filter((item) => !["profile", "settings"].includes(item.id))
    : NAV_ITEMS;
  const isDarkTheme = theme === "dark";

  const themeIcon = isDarkTheme ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <header className="app-topbar">
      <div className="brand-block">
        <p className="eyebrow">HKUgram</p>
        <h1>Social Salon</h1>
      </div>
      <nav className="top-nav">
        {navItems.map((item) => (
          <button key={item.id} className={`nav-icon-button ${currentView === item.id ? "nav-icon-button--active" : ""}`} onClick={() => onChange(item.id)} type="button">
            {icons[item.id]}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="topbar-user">
        <button
          className="theme-toggle-button"
          onClick={onToggleTheme}
          type="button"
          title={isDarkTheme ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={isDarkTheme ? "Switch to light mode" : "Switch to dark mode"}
        >
          {themeIcon}
        </button>
        {currentUser ? (
          <>
            <NotificationButton currentUser={currentUser} onProfile={onProfile} />
            <div className="user-menu">
              <button className="user-chip user-menu__trigger" onClick={() => onProfile(currentUser.username)} type="button" aria-haspopup="menu">
                <Avatar username={currentUser.username} size="xs" />
                <span>{currentUser.display_name}</span>
              </button>
              <div className="user-menu__panel" role="menu">
                <button className="user-menu__item" onClick={() => onProfile(currentUser.username)} type="button" role="menuitem">Profile</button>
                <button className="user-menu__item" onClick={() => onChange("settings")} type="button" role="menuitem">Settings</button>
                <button className="user-menu__item" onClick={onLogout} type="button" role="menuitem">Log out</button>
              </div>
            </div>
          </>
        ) : <span className="muted-copy">Guest mode</span>}
      </div>
    </header>
  );
}
