const path = require("path");
const PptxGenJS = require("pptxgenjs");
const {
  calcTextBox,
  safeOuterShadow,
  warnIfSlideHasOverlaps,
  warnIfSlideElementsOutOfBounds,
} = require("./pptxgenjs_helpers");

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "OpenAI Codex";
pptx.company = "HKU COMP3278";
pptx.subject = "HKUgram final presentation";
pptx.title = "HKUgram - COMP3278 Final Presentation";
pptx.lang = "en-US";
pptx.theme = {
  headFontFace: "Georgia",
  bodyFontFace: "Aptos",
  lang: "en-US",
};

const OUT = path.resolve(__dirname, "..", "HKUgram_Final_Presentation.pptx");
const W = 13.333;
const H = 7.5;

const COLORS = {
  bg: "0A0A0A",
  card: "141414",
  gold: "D4AF37",
  cream: "F2F0E4",
  muted: "A7A094",
  blue: "1E3D59",
  line: "6E5920",
  pale: "F2E8C4",
};

function addChrome(slide, slideNo, section, title, subtitle = "") {
  slide.background = { color: COLORS.bg };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.2,
    y: 0.18,
    w: 12.93,
    h: 7.08,
    line: { color: COLORS.gold, pt: 1.25 },
    fill: { color: COLORS.bg, transparency: 100 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.32,
    y: 0.3,
    w: 12.69,
    h: 6.84,
    line: { color: COLORS.line, pt: 0.6, dash: "dash" },
    fill: { color: COLORS.bg, transparency: 100 },
  });

  for (let i = 0; i < 9; i += 1) {
    slide.addShape(pptx.ShapeType.line, {
      x: -0.3 + i * 1.7,
      y: 0.18,
      w: 2.2,
      h: 2.2,
      rotate: 45,
      line: { color: COLORS.line, pt: 0.35, transparency: 78 },
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 11.5 - i * 1.5,
      y: 5.2,
      w: 2.1,
      h: 2.1,
      rotate: 45,
      line: { color: COLORS.line, pt: 0.35, transparency: 82 },
    });
  }

  slide.addText(section.toUpperCase(), {
    x: 0.62,
    y: 0.46,
    w: 2.9,
    h: 0.24,
    fontFace: "Aptos",
    fontSize: 10,
    bold: true,
    color: COLORS.gold,
    charSpace: 3.5,
    margin: 0,
  });
  slide.addText(title.toUpperCase(), {
    x: 0.62,
    y: 0.73,
    w: 8.7,
    h: 0.52,
    fontFace: "Georgia",
    fontSize: 22,
    bold: false,
    color: COLORS.cream,
    charSpace: 2.8,
    margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.62,
      y: 1.19,
      w: 7.8,
      h: 0.34,
      fontFace: "Aptos",
      fontSize: 10.5,
      color: COLORS.muted,
      margin: 0,
    });
  }
  slide.addText(`0${slideNo}`, {
    x: 11.9,
    y: 0.46,
    w: 0.55,
    h: 0.26,
    fontFace: "Georgia",
    fontSize: 13,
    color: COLORS.gold,
    align: "right",
    margin: 0,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 0.62,
    y: 1.55,
    w: 12.0,
    h: 0,
    line: { color: COLORS.line, pt: 0.8, transparency: 22 },
  });
}

function addCard(slide, x, y, w, h, title, bodyLines, opts = {}) {
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: opts.fill || COLORS.card },
    line: { color: opts.line || COLORS.line, pt: opts.linePt || 0.8 },
    shadow: safeOuterShadow("000000", 0.2, 45, 1, 0.5),
  });
  slide.addShape(pptx.ShapeType.line, {
    x: x + 0.18,
    y: y + 0.18,
    w: 0.26,
    h: 0,
    line: { color: COLORS.gold, pt: 1.1 },
  });
  slide.addShape(pptx.ShapeType.line, {
    x: x + 0.18,
    y: y + 0.18,
    w: 0,
    h: 0.22,
    line: { color: COLORS.gold, pt: 1.1 },
  });
  slide.addShape(pptx.ShapeType.line, {
    x: x + w - 0.44,
    y: y + h - 0.18,
    w: 0.26,
    h: 0,
    line: { color: COLORS.gold, pt: 1.1 },
  });
  slide.addShape(pptx.ShapeType.line, {
    x: x + w - 0.18,
    y: y + h - 0.4,
    w: 0,
    h: 0.22,
    line: { color: COLORS.gold, pt: 1.1 },
  });
  slide.addText(title.toUpperCase(), {
    x: x + 0.24,
    y: y + 0.18,
    w: w - 0.48,
    h: 0.3,
    fontFace: "Georgia",
    fontSize: 11.5,
    color: COLORS.gold,
    charSpace: 1.8,
    bold: false,
    margin: 0,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: x + 0.22,
    y: y + 0.55,
    w: w - 0.44,
    h: 0,
    line: { color: COLORS.line, pt: 0.6, transparency: 28 },
  });

  const bodyText = Array.isArray(bodyLines) ? bodyLines.join("\n") : String(bodyLines);
  const bodyBox = calcTextBox(11, {
    text: bodyText,
    w: w - 0.54,
    fontFace: "Aptos",
    margin: 0,
    breakLine: false,
  });

  slide.addText(bodyText, {
    x: x + 0.27,
    y: y + 0.68,
    w: w - 0.54,
    h: Math.min(h - 0.85, bodyBox.h + 0.1),
    fontFace: "Aptos",
    fontSize: 11,
    color: COLORS.cream,
    valign: "top",
    breakLine: false,
    margin: 0,
    bullet: opts.bullets ? { indent: 14 } : undefined,
  });
}

function addRoman(slide, numeral, x, y) {
  slide.addShape(pptx.ShapeType.diamond, {
    x,
    y,
    w: 0.5,
    h: 0.5,
    fill: { color: COLORS.bg },
    line: { color: COLORS.gold, pt: 1 },
  });
  slide.addText(numeral, {
    x: x + 0.06,
    y: y + 0.1,
    w: 0.38,
    h: 0.18,
    fontFace: "Georgia",
    fontSize: 10,
    color: COLORS.gold,
    align: "center",
    margin: 0,
  });
}

function addBulletStack(slide, items, x, y, w, gap = 0.62) {
  items.forEach((item, idx) => {
    addRoman(slide, item.tag, x, y + idx * gap);
    slide.addText(item.text, {
      x: x + 0.68,
      y: y + idx * gap + 0.03,
      w,
      h: 0.34,
      fontFace: "Aptos",
      fontSize: 11,
      color: COLORS.cream,
      margin: 0,
    });
  });
}

function addSvg(slide, assetPath, x, y, w, h) {
  slide.addImage({
    path: assetPath,
    x,
    y,
    w,
    h,
  });
}

function validate(slide) {
  if (process.env.SLIDE_VALIDATE === "1") {
    warnIfSlideHasOverlaps(slide, pptx);
    warnIfSlideElementsOutOfBounds(slide, pptx);
  }
}

function addTitleSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.bg };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.25,
    y: 0.25,
    w: 12.83,
    h: 7.0,
    line: { color: COLORS.gold, pt: 1.4 },
    fill: { color: COLORS.bg, transparency: 100 },
  });
  slide.addText("COMP3278 DATABASE PROJECT", {
    x: 0.8,
    y: 0.72,
    w: 3.8,
    h: 0.26,
    fontFace: "Aptos",
    fontSize: 11,
    color: COLORS.gold,
    charSpace: 3.5,
    margin: 0,
  });
  slide.addText("HKUGRAM", {
    x: 0.8,
    y: 1.18,
    w: 5.8,
    h: 0.78,
    fontFace: "Georgia",
    fontSize: 30,
    color: COLORS.cream,
    charSpace: 4.2,
    margin: 0,
  });
  slide.addText("SOCIAL MEDIA APPLICATION WITH RELATIONAL DESIGN, TEXT-TO-SQL, VISUAL ANALYTICS, AND LOCAL DEPLOYMENT", {
    x: 0.82,
    y: 2.05,
    w: 6.1,
    h: 0.8,
    fontFace: "Aptos",
    fontSize: 13,
    color: COLORS.muted,
    breakLine: false,
    margin: 0,
  });

  slide.addShape(pptx.ShapeType.line, {
    x: 7.85,
    y: 1.1,
    w: 3.6,
    h: 0,
    line: { color: COLORS.line, pt: 1.2, transparency: 35 },
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 7.85,
    y: 1.1,
    w: 0,
    h: 2.9,
    line: { color: COLORS.line, pt: 1.2, transparency: 35 },
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 11.45,
    y: 1.1,
    w: 0,
    h: 2.9,
    line: { color: COLORS.line, pt: 1.2, transparency: 35 },
  });

  addCard(slide, 7.35, 1.42, 4.8, 3.2, "Project Scope", [
    "Relational tables for users, posts, likes, comments, follows, and view history",
    "Read-only SQL endpoint plus guided text-to-SQL prompts",
    "Art Deco React UI for feed, profile, publishing, and analytics",
    "Docker Compose deployment with frontend, backend, and MySQL",
  ], { bullets: true });

  addBulletStack(slide, [
    { tag: "I", text: "Scenario 2: Social Media Application" },
    { tag: "II", text: "Core requirement coverage with bonus concurrency support" },
    { tag: "III", text: "Presentation deck under the 10-slide limit" },
  ], 0.86, 5.2, 5.8, 0.62);

  slide.addText("Team member names and final workload split can be inserted on Slide 8 before submission.", {
    x: 0.82,
    y: 6.64,
    w: 7,
    h: 0.22,
    fontFace: "Aptos",
    fontSize: 9.5,
    color: COLORS.muted,
    italic: true,
    margin: 0,
  });
  validate(slide);
}

function addRequirementSlide() {
  const slide = pptx.addSlide();
  addChrome(slide, 2, "Requirements", "Course Requirement Mapping", "Assignment brief: relational tables, SQL/Text-to-SQL, UI visualization, and deployment.");

  const reqs = [
    ["Relational database tables", "6 MySQL tables with foreign keys, uniqueness rules, and timestamps"],
    ["SQL / Text-to-SQL", "Read-only /query/sql and mapped /query/text-to-sql prompts for live demos"],
    ["UI for visualization", "React pages for feed, profile, history, analytics, and publishing"],
    ["Website deployment", "Docker Compose launches frontend, backend, and MySQL locally"],
    ["Bonus scope", "Image upload, comments, follow graph, popularity ranking, and concurrency-safe intents"],
  ];
  reqs.forEach(([left, right], index) => {
    const y = 1.95 + index * 0.78;
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.82,
      y,
      w: 2.9,
      h: 0.58,
      fill: { color: index === 0 ? COLORS.blue : COLORS.card },
      line: { color: COLORS.gold, pt: 0.8 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 3.82,
      y,
      w: 8.73,
      h: 0.58,
      fill: { color: COLORS.card },
      line: { color: COLORS.line, pt: 0.8 },
    });
    slide.addText(left, {
      x: 0.98,
      y: y + 0.15,
      w: 2.5,
      h: 0.18,
      fontFace: "Georgia",
      fontSize: 11,
      color: COLORS.cream,
      margin: 0,
      align: "center",
    });
    slide.addText(right, {
      x: 4.02,
      y: y + 0.14,
      w: 8.3,
      h: 0.2,
      fontFace: "Aptos",
      fontSize: 10.8,
      color: COLORS.cream,
      margin: 0,
    });
  });
  slide.addText("The current repo already satisfies the technical scope, so the remaining work is presentation polish, team attribution, and demo capture.", {
    x: 0.92,
    y: 5.94,
    w: 11.2,
    h: 0.45,
    fontFace: "Aptos",
    fontSize: 12,
    color: COLORS.pale,
    bold: true,
    margin: 0,
  });
  slide.addText("• Frontend production build passed locally\n• Backend source compiles successfully\n• Compose file resolves into a valid 3-service stack", {
    x: 0.94,
    y: 6.28,
    w: 5.6,
    h: 0.72,
    fontFace: "Aptos",
    fontSize: 10.8,
    color: COLORS.cream,
    breakLine: false,
    margin: 0,
  });
  validate(slide);
}

function addArchitectureSlide() {
  const slide = pptx.addSlide();
  addChrome(slide, 3, "Architecture", "System Architecture", "The frontend and backend are separated cleanly and communicate through REST APIs.");
  addSvg(slide, path.resolve(__dirname, "assets", "architecture.svg"), 0.9, 1.95, 11.5, 3.95);
  addBulletStack(slide, [
    { tag: "I", text: "React handles client routing, page composition, and interaction state" },
    { tag: "II", text: "FastAPI exposes auth, user, post, analytics, and query services" },
    { tag: "III", text: "MySQL stores normalized social data with foreign-key constraints" },
  ], 0.98, 6.1, 5.3, 0.37);
  validate(slide);
}

function addErSlide() {
  const slide = pptx.addSlide();
  addChrome(slide, 4, "ER Design", "Entity Relationship Design", "The schema supports both social interactions and analytics queries.");

  addCard(slide, 0.86, 1.95, 2.05, 1.28, "Users", [
    "PK id",
    "username UNIQUE",
    "display_name",
    "password_hash",
  ]);
  addCard(slide, 3.18, 1.95, 2.1, 1.28, "Posts", [
    "PK id, FK user_id",
    "category, description",
    "image_url + size",
    "created_at",
  ]);
  addCard(slide, 5.56, 1.95, 1.82, 1.28, "Likes", [
    "FK user_id",
    "FK post_id",
    "UNIQUE pair",
  ]);
  addCard(slide, 7.64, 1.95, 2.04, 1.28, "Comments", [
    "FK user_id",
    "FK post_id",
    "body, created_at",
  ]);
  addCard(slide, 9.94, 1.95, 2.32, 1.28, "View History", [
    "FK user_id",
    "FK post_id",
    "viewed_at",
  ]);
  addCard(slide, 4.58, 4.05, 2.3, 1.28, "Follows", [
    "follower_id",
    "followee_id",
    "UNIQUE pair",
  ]);

  const lines = [
    [2.91, 2.59, 3.18, 2.59],
    [5.28, 2.59, 5.56, 2.59],
    [7.38, 2.59, 7.64, 2.59],
    [9.68, 2.59, 9.94, 2.59],
    [1.88, 3.23, 5.72, 4.05],
    [4.23, 3.23, 5.72, 4.05],
  ];
  lines.forEach(([x1, y1, x2, y2]) => {
    slide.addShape(pptx.ShapeType.line, {
      x: x1,
      y: y1,
      w: x2 - x1,
      h: y2 - y1,
      line: { color: COLORS.gold, pt: 1.1 },
    });
  });

  slide.addText("Key constraints: username is unique; like/follow/history tables prevent duplicate user-post or user-user pairs; timestamps support sorting and analytics.", {
    x: 0.96,
    y: 5.72,
    w: 11.3,
    h: 0.5,
    fontFace: "Aptos",
    fontSize: 11.5,
    color: COLORS.cream,
    margin: 0,
  });
  addBulletStack(slide, [
    { tag: "I", text: "1-to-many: users to posts, likes, comments" },
    { tag: "II", text: "many-to-many resolved through likes and follows" },
    { tag: "III", text: "history table supports personalized browsing record" },
  ], 0.96, 6.24, 5.6, 0.3);
  validate(slide);
}

function addQuerySlide() {
  const slide = pptx.addSlide();
  addChrome(slide, 5, "Query System", "SQL And Text-To-SQL", "The course requires database querying; HKUgram supports both direct SQL and guided natural language prompts.");

  addSvg(slide, path.resolve(__dirname, "assets", "query-flow.svg"), 0.84, 1.9, 11.7, 2.7);
  addCard(slide, 0.9, 4.95, 4.1, 1.7, "Supported Demo Prompts", [
    "most liked posts",
    "most active users",
    "recent posts",
    "comments for post 1",
    "posts by user tianxing",
  ]);
  addCard(slide, 5.18, 4.95, 3.3, 1.7, "Safety Rules", [
    "single statement only",
    "SELECT only",
    "blocked SQL patterns rejected",
    "parameterized execution",
  ]);
  addCard(slide, 8.66, 4.95, 3.6, 1.7, "Why It Matters", [
    "shows direct SQL understanding",
    "adds a simple NL interface",
    "feeds the analytics demo",
  ]);
  validate(slide);
}

function addUiSlide() {
  const slide = pptx.addSlide();
  addChrome(slide, 6, "UI Design", "Art Deco Interface Design", "The frontend follows the project prompt: geometric frames, gold-on-black contrast, and responsive cards.");

  const panels = [
    { x: 0.95, title: "Feed", lines: ["Recent / Popular sorting", "Category tabs", "Image-first social cards", "Like and thread drawer"] },
    { x: 4.48, title: "Create", lines: ["Image upload form", "Caption + category", "Immediate feed refresh", "Stored dimensions reduce layout shift"] },
    { x: 8.01, title: "Analytics", lines: ["Platform metrics", "Top posts", "Most active creators", "Admin-style ranking view"] },
  ];
  panels.forEach((panel) => {
    slide.addShape(pptx.ShapeType.rect, {
      x: panel.x,
      y: 2.08,
      w: 2.95,
      h: 3.65,
      fill: { color: COLORS.card },
      line: { color: COLORS.gold, pt: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: panel.x + 0.18,
      y: 2.28,
      w: 2.59,
      h: 0.34,
      fill: { color: COLORS.blue },
      line: { color: COLORS.line, pt: 0.8 },
    });
    slide.addText(panel.title.toUpperCase(), {
      x: panel.x + 0.3,
      y: 2.36,
      w: 2.2,
      h: 0.16,
      fontFace: "Georgia",
      fontSize: 11,
      color: COLORS.cream,
      charSpace: 1.6,
      margin: 0,
      align: "center",
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: panel.x + 0.34,
      y: 2.86,
      w: 2.26,
      h: 1.12,
      fill: { color: COLORS.bg },
      line: { color: COLORS.line, pt: 0.8 },
    });
    slide.addShape(pptx.ShapeType.line, {
      x: panel.x + 0.44,
      y: 3.02,
      w: 2.06,
      h: 0,
      line: { color: COLORS.gold, pt: 0.6, transparency: 45 },
    });
    slide.addShape(pptx.ShapeType.line, {
      x: panel.x + 0.44,
      y: 3.2,
      w: 1.6,
      h: 0,
      line: { color: COLORS.gold, pt: 0.6, transparency: 60 },
    });
    slide.addShape(pptx.ShapeType.line, {
      x: panel.x + 0.44,
      y: 3.38,
      w: 1.9,
      h: 0,
      line: { color: COLORS.gold, pt: 0.6, transparency: 60 },
    });
    addBulletStack(
      slide,
      panel.lines.map((text, idx) => ({ tag: ["I", "II", "III", "IV"][idx], text })),
      panel.x + 0.28,
      4.22,
      2.15,
      0.34,
    );
  });

  slide.addText("Design tokens", {
    x: 0.98,
    y: 6.06,
    w: 1.6,
    h: 0.2,
    fontFace: "Georgia",
    fontSize: 11.5,
    color: COLORS.gold,
    margin: 0,
  });
  slide.addText("Obsidian black background, metallic gold borders, champagne body text, uppercase display headers, sharp rectangular framing, and subtle geometric line texture.", {
    x: 2.05,
    y: 6.05,
    w: 10.0,
    h: 0.28,
    fontFace: "Aptos",
    fontSize: 11,
    color: COLORS.cream,
    margin: 0,
  });
  validate(slide);
}

function addDeploymentSlide() {
  const slide = pptx.addSlide();
  addChrome(slide, 7, "Deployment", "Deployment, Validation, And Bonus Robustness", "The project can be run locally as a website, which satisfies the assignment requirement.");
  addCard(slide, 0.9, 1.92, 3.75, 2.35, "Docker Stack", [
    "db: mysql:8.4",
    "backend: FastAPI + SQLAlchemy",
    "frontend: Vite dev server",
    "ports 3306 / 8000 / 5173",
  ]);
  addCard(slide, 4.82, 1.92, 3.75, 2.35, "Local Verification", [
    "python -m compileall backend/app backend/scripts",
    "npm run build",
    "docker compose config",
  ]);
  addCard(slide, 8.74, 1.92, 3.7, 2.35, "Bonus Engineering", [
    "explicit like/unlike and follow/unfollow intents",
    "repeatable concurrency check script",
    "image dimension persistence for smoother rendering",
  ]);

  slide.addShape(pptx.ShapeType.chevron, {
    x: 1.3,
    y: 5.0,
    w: 2.2,
    h: 0.72,
    fill: { color: COLORS.blue },
    line: { color: COLORS.gold, pt: 0.8 },
  });
  slide.addText("1. Start Compose", {
    x: 1.48,
    y: 5.23,
    w: 1.55,
    h: 0.18,
    fontFace: "Aptos",
    fontSize: 11,
    color: COLORS.cream,
    margin: 0,
    bold: true,
  });
  slide.addShape(pptx.ShapeType.chevron, {
    x: 4.05,
    y: 5.0,
    w: 2.2,
    h: 0.72,
    fill: { color: COLORS.card },
    line: { color: COLORS.gold, pt: 0.8 },
  });
  slide.addText("2. Open Web UI", {
    x: 4.3,
    y: 5.23,
    w: 1.4,
    h: 0.18,
    fontFace: "Aptos",
    fontSize: 11,
    color: COLORS.cream,
    margin: 0,
    bold: true,
  });
  slide.addShape(pptx.ShapeType.chevron, {
    x: 6.8,
    y: 5.0,
    w: 2.2,
    h: 0.72,
    fill: { color: COLORS.card },
    line: { color: COLORS.gold, pt: 0.8 },
  });
  slide.addText("3. Run Demo Flow", {
    x: 7.04,
    y: 5.23,
    w: 1.55,
    h: 0.18,
    fontFace: "Aptos",
    fontSize: 11,
    color: COLORS.cream,
    margin: 0,
    bold: true,
  });
  slide.addShape(pptx.ShapeType.chevron, {
    x: 9.55,
    y: 5.0,
    w: 2.2,
    h: 0.72,
    fill: { color: COLORS.blue },
    line: { color: COLORS.gold, pt: 0.8 },
  });
  slide.addText("4. Record Video", {
    x: 9.82,
    y: 5.23,
    w: 1.4,
    h: 0.18,
    fontFace: "Aptos",
    fontSize: 11,
    color: COLORS.cream,
    margin: 0,
    bold: true,
  });
  slide.addText("Suggested live demo: register/login, publish a post, like/comment, open profile, show browsing history, then show analytics and a text-to-SQL prompt.", {
    x: 1.0,
    y: 6.14,
    w: 11.2,
    h: 0.34,
    fontFace: "Aptos",
    fontSize: 11,
    color: COLORS.pale,
    margin: 0,
  });
  validate(slide);
}

function addCollabSlide() {
  const slide = pptx.addSlide();
  addChrome(slide, 8, "Collaboration", "Collaboration And Work Distribution", "This slide is ready for the team to finalize with real names before submission.");

  addCard(slide, 0.9, 1.9, 5.35, 3.95, "How The Group Worked", [
    "Git-based workflow with version updates recorded in VERSION",
    "Backend and frontend delivered one core function at a time",
    "Documentation and testing artifacts stored under document/",
    "Deployment kept reproducible through Docker Compose",
    "Final presentation artifacts generated from repository state",
  ], { bullets: true });

  const members = [
    ["Member A", "Database schema, ER model, seed data"],
    ["Member B", "Backend API and SQL/Text-to-SQL"],
    ["Member C", "Frontend UI and user flows"],
    ["Member D", "Deployment, testing, and demo video"],
    ["Member E", "Slides, presentation script, and polish"],
  ];
  slide.addText("FILL WITH REAL NAMES", {
    x: 6.68,
    y: 1.98,
    w: 3.2,
    h: 0.22,
    fontFace: "Georgia",
    fontSize: 12,
    color: COLORS.gold,
    charSpace: 1.8,
    margin: 0,
  });
  members.forEach(([name, work], index) => {
    const y = 2.35 + index * 0.66;
    slide.addShape(pptx.ShapeType.rect, {
      x: 6.58,
      y,
      w: 1.48,
      h: 0.48,
      fill: { color: index % 2 === 0 ? COLORS.blue : COLORS.card },
      line: { color: COLORS.gold, pt: 0.8 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 8.2,
      y,
      w: 4.18,
      h: 0.48,
      fill: { color: COLORS.card },
      line: { color: COLORS.line, pt: 0.8 },
    });
    slide.addText(name, {
      x: 6.74,
      y: y + 0.14,
      w: 1.12,
      h: 0.16,
      fontFace: "Aptos",
      fontSize: 10.5,
      color: COLORS.cream,
      margin: 0,
      align: "center",
      bold: true,
    });
    slide.addText(work, {
      x: 8.38,
      y: y + 0.14,
      w: 3.82,
      h: 0.16,
      fontFace: "Aptos",
      fontSize: 10.2,
      color: COLORS.cream,
      margin: 0,
    });
  });
  addBulletStack(slide, [
    { tag: "I", text: "Replace Member A-E with the actual names" },
    { tag: "II", text: "Adjust contribution split to match real work done" },
    { tag: "III", text: "Keep this slide concise during the 8-minute talk" },
  ], 6.75, 6.02, 4.8, 0.32);
  validate(slide);
}

async function main() {
  pptx.defineLayout({ name: "LAYOUT_WIDE", width: W, height: H });
  const builders = [
    addTitleSlide,
    addRequirementSlide,
    addArchitectureSlide,
    addErSlide,
    addQuerySlide,
    addUiSlide,
    addDeploymentSlide,
    addCollabSlide,
  ];
  const selected = new Set(
    (process.env.ONLY_SLIDES || "")
      .split(",")
      .map((value) => parseInt(value.trim(), 10))
      .filter((value) => Number.isInteger(value) && value >= 1 && value <= builders.length),
  );
  builders.forEach((builder, index) => {
    if (!selected.size || selected.has(index + 1)) {
      builder();
    }
  });
  await pptx.writeFile({ fileName: OUT });
  console.log(`Wrote ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
