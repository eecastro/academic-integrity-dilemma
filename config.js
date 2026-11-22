// Class settings. Once the site is on GitHub Pages this file is public,
// so put nothing secret here. The teacher passcode lives only in Apps Script.
window.DILEMMA_CONFIG = {
  // Paste the Web app URL from Apps Script (it ends in /exec).
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwvSvXNmkJtNE37R853fC5GkJFJ9vXZSXgPl3Cx8Ps3n_hhLzNxw7RjVGyg3XmnuB0GLA/exec",

  // Show the points table to students (set to false to hide it).
  SHOW_POINTS: true,

  SCENARIO:
    "You and your partner sit next to each other in a class with a tough midterm. " +
    "During the test, the two of you quietly share a few answers. " +
    "When grading, your teacher notices that your tests match on several unusual wrong answers. " +
    "She suspects one of you copied from the other, but she can't prove who, or whether you were both involved. " +
    "She calls each of you in separately. You can't talk to each other before your meeting. " +
    "When she asks what happened, you have two options. " +
    "Stay silent: deny that anything happened. " +
    "Blame your partner: say your partner was looking at your paper. " +
    "Your partner faces the same choice. Your outcome depends on what both of you decide, " +
    "and it determines the extra credit points you earn today.",

  ROUND_NOTES: {
    1: "Round 1: you cannot talk to your partner before your meeting with the teacher.",
    2: "Round 2: you can talk to your partner before your meeting with the teacher."
  },

  // Keys must match CHOICES in apps-script/Code.gs.
  CHOICES: [
    { key: "silent", label: "Stay silent", detail: "deny that anything happened" },
    { key: "blame", label: "Blame your partner", detail: "say your partner was looking at your paper" }
  ],

  // Keys must match MATTERED in apps-script/Code.gs.
  MATTERED: [
    { key: "protecting", label: "Protecting myself" },
    { key: "loyalty", label: "Loyalty to my partner" },
    { key: "guessing", label: "Guessing what my partner would do" },
    { key: "fair", label: "What's fair or right" },
    { key: "other", label: "Other" }
  ],

  // Must match PAIR_COUNT in apps-script/Code.gs.
  PAIR_COUNT: 15
};
