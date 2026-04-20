import { useEffect, useState, useRef } from "react";
import { getNotifications, markNotificationsRead } from "../api/notifications";
import { icons } from "../lib/icons";
import { formatCompactDate } from "../lib/format";
import Avatar from "./Avatar";

export default function NotificationButton({ currentUser, onProfile }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    
    // Fetch notifications
    const fetchNotifs = async () => {
      try {
        const data = await getNotifications();
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };
    
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000); // 30s polling
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    // Click outside to close
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = async () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      try {
        await markNotificationsRead();
        setUnreadCount(0);
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      } catch (err) {
        console.error("Failed to mark notifications read", err);
      }
    }
  };

  const renderMessage = (n) => {
    switch (n.type) {
      case "like":
        return <span>liked your post</span>;
      case "comment":
        return <span>commented on your post</span>;
      case "follow":
        return <span>started following you</span>;
      default:
        return <span>interacted with you</span>;
    }
  };

  return (
    <div ref={dropdownRef} className="notification-menu">
      <button 
        type="button" 
        className={`nav-icon-button ${isOpen ? "nav-icon-button--active" : ""}`}
        onClick={handleToggle}
        title="Notifications"
      >
        <span className="notification-menu__icon">
          🔔
          {unreadCount > 0 && (
            <span className="notification-menu__badge">
              {unreadCount}
            </span>
          )}
        </span>
      </button>

      {isOpen && (
        <div className="notification-menu__panel">
          <div className="notification-menu__header">
            <h3>
              Notifications
            </h3>
          </div>
          {notifications.length === 0 ? (
            <div className="notification-menu__empty">
              No notifications yet
            </div>
          ) : (
            <ul className="notification-menu__list">
              {notifications.map((notif) => (
                <li key={notif.id} className={`notification-menu__item ${notif.is_read ? "notification-menu__item--read" : ""}`}>
                  <button className="notification-menu__avatar" type="button" onClick={() => onProfile(notif.actor_username)}>
                    <Avatar username={notif.actor_username} size="sm" />
                  </button>
                  <div className="notification-menu__copy">
                    <div>
                      <button className="notification-menu__actor" type="button" onClick={() => onProfile(notif.actor_username)}>
                        {notif.actor_display_name}
                      </button>{" "}
                      <span>{renderMessage(notif)}</span>
                    </div>
                    <div className="notification-menu__time">
                      {formatCompactDate(notif.created_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
