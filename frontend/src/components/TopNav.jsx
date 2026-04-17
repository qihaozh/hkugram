import Avatar from "./Avatar";
import { NAV_ITEMS } from "../lib/constants";
import { icons } from "../lib/icons";
import NotificationButton from "./NotificationButton";

export default function TopNav({ currentView, onChange, currentUser, onProfile, onLogout }) {
  const navItems = currentUser
    ? NAV_ITEMS.filter((item) => !["profile", "settings"].includes(item.id))
    : NAV_ITEMS;

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
        {currentUser ? (
          <div className="user-menu">
            <NotificationButton currentUser={currentUser} onProfile={onProfile} />
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
        ) : <span className="muted-copy">Guest mode</span>}
      </div>
    </header>
  );
}
