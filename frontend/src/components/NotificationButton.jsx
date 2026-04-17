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
    <div ref={dropdownRef} style={{ position: "relative", zIndex: 9999 }}>
      <button 
        type="button" 
        className={`nav-icon-button ${isOpen ? "nav-icon-button--active" : ""}`}
        onClick={handleToggle}
        title="Notifications"
      >
        <span style={{ position: "relative" }}>
          🔔
          {unreadCount > 0 && (
            <span style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              backgroundColor: "#D4AF37",
              color: "#0A0A0A",
              borderRadius: "50%",
              width: "16px",
              height: "16px",
              fontSize: "10px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              {unreadCount}
            </span>
          )}
        </span>
      </button>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: "100%",
          right: "0",
          width: "320px",
          maxHeight: "400px",
          overflowY: "auto",
          backgroundColor: "#141414",
          border: "1px solid rgba(212, 175, 55, 0.3)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          zIndex: 50,
          marginTop: "8px",
        }}>
          <div style={{ padding: "16px", borderBottom: "1px solid rgba(212, 175, 55, 0.2)" }}>
            <h3 style={{ margin: 0, textTransform: "uppercase", letterSpacing: "1px", color: "#D4AF37" }}>
              Notifications
            </h3>
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "#888" }}>
              No notifications yet
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {notifications.map((notif) => (
                <li key={notif.id} style={{ 
                  padding: "12px 16px", 
                  borderBottom: "1px solid #222",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  opacity: notif.is_read ? 0.7 : 1,
                  backgroundColor: notif.is_read ? "transparent" : "rgba(212, 175, 55, 0.05)"
                }}>
                  <div style={{ cursor: "pointer" }} onClick={() => onProfile(notif.actor_username)}>
    <Avatar username={notif.actor_username} size="sm" />
  </div>
                  <div style={{ flex: 1, fontSize: "14px", lineHeight: "1.4" }}>
                    <div style={{ cursor: "pointer" }}>
                      <strong onClick={() => onProfile(notif.actor_username)} style={{ color: "#F2F0E4" }}>{notif.actor_display_name}</strong>{" "}
                      <span style={{ color: "#888" }}>{renderMessage(notif)}</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
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
