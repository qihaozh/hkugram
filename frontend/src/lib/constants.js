export const CATEGORIES = [
  "All",
  "Photography",
  "Cafe",
  "Inspiration",
  "Nightlife",
  "Campus",
  "Fashion",
  "Travel",
];

export const NAV_ITEMS = [
  { id: "home", label: "Discover" },
  { id: "create", label: "Create" },
  { id: "profile", label: "Profile" },
  { id: "history", label: "History" },
  { id: "analytics", label: "Ranking" },
  { id: "settings", label: "Settings" },
];

export const blankRegistration = { username: "", password: "", display_name: "", bio: "" };
export const blankLogin = { username: "", password: "" };
export const blankPost = {
  category: "Inspiration",
  description: "",
  imageSource: "upload",
  imageFile: null,
  imageUrl: "",
};
export const blankSettings = { display_name: "", bio: "", password: "" };
