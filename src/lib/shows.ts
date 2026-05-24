export interface Show {
  id: string;
  title: string;
  genre: string;
  episodes: number;
  cover: string; // gradient colors
  description: string;
}

const grad = (a: string, b: string) => `linear-gradient(135deg, ${a}, ${b})`;

export const SHOWS: Show[] = [
  { id: "attack-on-titan", title: "Attack on Titan", genre: "Action", episodes: 75, cover: grad("#7c2d12", "#1c1917"), description: "Humanity's last stand against the Titans." },
  { id: "demon-slayer", title: "Demon Slayer", genre: "Action", episodes: 55, cover: grad("#0c4a6e", "#0f172a"), description: "A boy becomes a demon slayer to save his sister." },
  { id: "one-piece", title: "One Piece", genre: "Adventure", episodes: 1100, cover: grad("#f59e0b", "#7c2d12"), description: "Pirates chasing the ultimate treasure." },
  { id: "jujutsu-kaisen", title: "Jujutsu Kaisen", genre: "Action", episodes: 47, cover: grad("#581c87", "#0f172a"), description: "Cursed spirits, cursed energy, cursed life." },
  { id: "my-hero-academia", title: "My Hero Academia", genre: "Shonen", episodes: 138, cover: grad("#16a34a", "#052e16"), description: "Quirkless boy becomes the next hero." },
  { id: "chainsaw-man", title: "Chainsaw Man", genre: "Action", episodes: 12, cover: grad("#dc2626", "#1c1917"), description: "Devil-hunter with chainsaws for limbs." },
  { id: "spy-x-family", title: "Spy x Family", genre: "Comedy", episodes: 37, cover: grad("#ec4899", "#1e1b4b"), description: "Spy + assassin + telepath = family." },
  { id: "frieren", title: "Frieren: Beyond Journey's End", genre: "Fantasy", episodes: 28, cover: grad("#22d3ee", "#0c4a6e"), description: "An elf mage reflects on mortal lives." },
  { id: "dandadan", title: "Dandadan", genre: "Supernatural", episodes: 12, cover: grad("#a855f7", "#1c1917"), description: "Aliens vs ghosts, who wins?" },
  { id: "solo-leveling", title: "Solo Leveling", genre: "Action", episodes: 25, cover: grad("#3b82f6", "#0f172a"), description: "Weakest hunter levels up alone." },
  { id: "vinland-saga", title: "Vinland Saga", genre: "Historical", episodes: 48, cover: grad("#475569", "#0f172a"), description: "A young Viking's tale of revenge and peace." },
  { id: "mob-psycho", title: "Mob Psycho 100", genre: "Supernatural", episodes: 37, cover: grad("#f97316", "#1c1917"), description: "An esper kid just wants a normal life." },
];

export const EPISODE_MINUTES = 24;

export const getShow = (id: string) => SHOWS.find((s) => s.id === id);

export const searchShows = (q: string) => {
  const t = q.toLowerCase().trim();
  if (!t) return SHOWS;
  return SHOWS.filter((s) => s.title.toLowerCase().includes(t));
};
