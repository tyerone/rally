// Design tokens ported verbatim from the design handoff README's "Design Tokens" section.

export const color = {
  bg: "#15161B",
  surface: "#1b1e2b",
  surfaceAlt: "#191a22",
  surfaceRaised: "#23273B",
  highlightCard: "#272727",

  border: "#2a3047",
  borderAlt: "#343A56",
  borderMuted: "#37464F",

  teal: "#4FCBBB",
  tealLip: "#37948A",
  tealHover: "#6fded0",

  purple: "#7F60DC",
  purpleLight: "#9B82E6",
  purpleLighter: "#B9A6F0",
  purpleLightest: "#D0C4FF",

  gold: "#F8C949",
  goldAlt: "#F2C842",
  goldBright: "#FED84D",

  tierRookie: "#FF6B6B",
  tierRanger: "#E0A46B",
  tierStar: "#FED84D",
  tierDdluv: "#7F60DC",

  up: "#4FCBBB",
  down: "#E0576B",

  navInactive: "#5b6178",

  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,.55)",
  textSecondaryLo: "rgba(255,255,255,.5)",
  textTertiary: "rgba(255,255,255,.4)",
} as const;

export const teamColors = [
  "#E0576B", "#F0A500", "#7F60DC", "#4C9BE0", "#4FCBBB",
  "#E08A3C", "#9B6BD6", "#5BC0A8", "#C7566B", "#6E86C7",
];

export const radius = {
  pill: 22,
  buttonSm: 12,
  buttonLg: 16,
  cardSm: 16,
  cardLg: 20,
  sheetTop: 26,
  avatar: "50%",
  tierIcon: 14,
} as const;

export const shadow = {
  primaryLip: `0 4px 0 ${color.tealLip}`,
  primaryLipPressed: `0 1px 0 ${color.tealLip}`,
  whiteLip: "0 3px 0 rgba(127,96,220,.55)",
  whiteLipPressed: "0 1px 0 rgba(127,96,220,.55)",
  sheet: "0 -20px 60px rgba(0,0,0,.5)",
  drop: "drop-shadow(0 8px 14px rgba(0,0,0,.35))",
} as const;

export const spacing = {
  xxs: 4, xs: 8, sm: 12, md: 14, lg: 16, xl: 18, xxl: 20, xxxl: 22, xxxxl: 24, xxxxxl: 26,
} as const;

export const font = {
  family: "Nunito, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
} as const;

export const easing = {
  sheet: "cubic-bezier(.2,.8,.2,1)",
  entrance: "cubic-bezier(.2,.7,.2,1)",
} as const;
