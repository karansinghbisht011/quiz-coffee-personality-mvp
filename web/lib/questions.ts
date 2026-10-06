// The nine questions from REQUIREMENTS.md section 5.
// `tags` keeps the bracket order: the first tag earns 2 points, the others 1.

export interface Answer {
  emoji: string;
  label: string;
  note: string;
  tags: string[];
}

export interface Question {
  group: string;
  q: string;
  answers: Answer[];
}

export const QUESTIONS: Question[] = [
  {
    group: "Pop culture",
    q: "Which Netflix night are you?",
    answers: [
      { emoji: "🕵️", label: "A gripping thriller", note: "No pausing. No snacks. Just stakes.", tags: ["strong", "bold"] },
      { emoji: "🛋️", label: "A cozy comfort rewatch", note: "You know every line already.", tags: ["milk", "sweet", "familiar", "chain"] },
      { emoji: "🌏", label: "A wild new foreign series", note: "Subtitles on, expectations off.", tags: ["curious", "fruity"] },
      { emoji: "📺", label: "Reality TV with friends", note: "The commentary is louder than the show.", tags: ["lively", "social"] },
    ],
  },
  {
    group: "Pop culture",
    q: "Pick your Hogwarts house.",
    answers: [
      { emoji: "🦁", label: "Gryffindor", note: "Brave first, plan later.", tags: ["bold", "strong"] },
      { emoji: "🦡", label: "Hufflepuff", note: "Warm, loyal, always feeding people.", tags: ["cozy", "sweet", "milk"] },
      { emoji: "🦅", label: "Ravenclaw", note: "Curious about everything.", tags: ["curious", "black"] },
      { emoji: "🐍", label: "Slytherin", note: "Ambitious, sharp, stylish.", tags: ["strong", "caramel", "aesthetic"] },
    ],
  },
  {
    group: "Pop culture",
    q: "Your movie genre?",
    answers: [
      { emoji: "💥", label: "Action", note: "Explosions and strong opinions.", tags: ["strong", "bold"] },
      { emoji: "💕", label: "Rom-com", note: "A meet-cute at a cafe, naturally.", tags: ["sweet", "cozy"] },
      { emoji: "🎞️", label: "Indie or arthouse", note: "Long silences, deep meaning.", tags: ["curious"] },
      { emoji: "😂", label: "Comedy", note: "Laughs first, plot later.", tags: ["lively", "familiar", "medium"] },
    ],
  },
  {
    group: "Lifestyle",
    q: "Your ideal Saturday morning?",
    answers: [
      { emoji: "🚶", label: "A long walk and breakfast", note: "A slow start, no screens.", tags: ["cozy", "familiar", "quiet"] },
      { emoji: "💻", label: "Working on a side project", note: "Just one more commit.", tags: ["work-friendly", "strong"] },
      { emoji: "🥞", label: "Brunch with friends", note: "Table for six, arriving in waves.", tags: ["social", "sweet", "lively"] },
      { emoji: "🧭", label: "Wandering into somewhere new", note: "No plan, just a lane you haven't tried.", tags: ["curious"] },
    ],
  },
  {
    group: "Lifestyle",
    q: "How do you like your coffee in Bengaluru weather?",
    answers: [
      { emoji: "♨️", label: "Piping hot", note: "Steam on your glasses.", tags: ["hot", "classic"] },
      { emoji: "🧊", label: "Iced, always", note: "Hot city, cold cup.", tags: ["iced"] },
      { emoji: "🏃", label: "A quick one on the go", note: "Standing counts as sitting.", tags: ["medium", "quick stop"] },
      { emoji: "🎲", label: "Surprise me", note: "Barista's choice, no questions.", tags: ["curious"] },
    ],
  },
  {
    group: "Lifestyle",
    q: "Which Bengaluru moment is most you?",
    answers: [
      { emoji: "🌧️", label: "Rain at 5 pm", note: "Windows fogged, second cup ordered.", tags: ["cozy", "sweet", "hot"] },
      { emoji: "🚗", label: "A traffic jam on ORR", note: "You've made peace with it. Mostly.", tags: ["strong", "bold"] },
      { emoji: "🌳", label: "Sunday in Cubbon Park", note: "Birdsong, bamboo, zero rush.", tags: ["quiet", "mild"] },
      { emoji: "🍻", label: "Friday night in Indiranagar", note: "The queue is part of the plan.", tags: ["lively", "social", "pub or brewery"] },
    ],
  },
  {
    group: "Abstract and quirky",
    q: "Pick a colour.",
    answers: [
      { emoji: "⚫", label: "Deep black", note: "Nothing added, nothing hidden.", tags: ["black", "strong", "none"] },
      { emoji: "🟤", label: "Warm caramel", note: "Golden hour in a cup.", tags: ["caramel", "sweet"] },
      { emoji: "🌲", label: "Forest green", note: "Quiet, leafy, a little earthy.", tags: ["plant milk", "quiet", "nutty"] },
      { emoji: "🟠", label: "Sunset orange", note: "Loud in the best way.", tags: ["fruity", "bold"] },
    ],
  },
  {
    group: "Abstract and quirky",
    q: "Desert island, one item.",
    answers: [
      { emoji: "🛏️", label: "A hammock", note: "Sway, sip, repeat.", tags: ["cozy", "mild", "light"] },
      { emoji: "🎸", label: "A guitar", note: "Campfire songs, nobody asked.", tags: ["lively", "spiced", "chocolate"] },
      { emoji: "📚", label: "A library", note: "Silence with a lot of shelves.", tags: ["quiet", "black"] },
      { emoji: "🚤", label: "A speedboat", note: "You'd rather leave the island.", tags: ["bold", "strong"] },
    ],
  },
  {
    group: "Abstract and quirky",
    q: "A friend describes you as...",
    answers: [
      { emoji: "⚡", label: "\"Always on\"", note: "Replies at 11 pm. Sometimes 3 am.", tags: ["strong", "work-friendly"] },
      { emoji: "🍬", label: "\"Sweet\"", note: "Remembers every birthday.", tags: ["sweet", "milk"] },
      { emoji: "🕶️", label: "\"Mysterious\"", note: "Nobody knows your coffee order.", tags: ["curious", "black"] },
      { emoji: "🎉", label: "\"The life of the party\"", note: "You are the plus-one everyone wants.", tags: ["lively", "social", "dessert"] },
    ],
  },
];
