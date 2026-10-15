import type { Collection, Resource } from "@ntumie/types";

// Fictional, presentation-only collection drawn on home and About. Identities
// are simulated and never link to record routes; every link opens a real page
// (verified 14 October 2026). Link titles and descriptions come from each
// page's own metadata; section descriptions and the note are the curator's words.
const updatedAt = "2026-10-14T09:00:00.000Z";
const amina = { userId: "019a0000-0000-7000-8000-000000000021", username: "amina" };

export const kitchenGarden = {
  id: "019a0000-0000-7000-8000-000000000022",
  hubId: "019a0000-0000-7000-8000-000000000023",
  hub: {
    id: "019a0000-0000-7000-8000-000000000023",
    name: "Kitchen garden notes",
    handle: "kitchen-garden",
    owner: amina,
  },
  creator: amina,
  title: "Starting a kitchen garden",
  description:
    "What to grow, where, and how to keep it growing, in the order a first season needs.",
  tags: ["gardening", "vegetables", "compost"],
  published: true,
  linkSharingEnabled: false,
  commentsEnabled: true,
  version: 1,
  createdAt: updatedAt,
  updatedAt,
} satisfies Collection;

const common = {
  collectionId: kitchenGarden.id,
  linkedCollectionId: null,
  siteName: null,
  addedBy: amina,
  note: null,
  version: 1,
  createdAt: updatedAt,
  updatedAt,
};
const id = (n: number) => `019a0000-0000-7000-8000-0000000000${30 + n}`;
const section = (n: number, title: string, description: string): Resource => ({
  ...common,
  id: id(n),
  kind: "heading",
  title,
  description,
  tags: [],
  position: n,
});
const link = (
  n: number,
  url: string,
  title: string,
  description: string,
  tags: string[],
  note: string | null = null,
): Resource => ({
  ...common,
  id: id(n),
  kind: "external_link",
  url,
  title,
  description,
  tags,
  note,
  position: n,
});

export const kitchenGardenItems: Resource[] = [
  section(
    0,
    "Choosing a spot",
    "Where the sun falls and what the soil is like decide most of what follows.",
  ),
  link(
    1,
    "https://www.rhs.org.uk/advice/beginners-guide/vegetable-basics/seed-sowing-techniques/positioning-vegetables",
    "Positioning vegetables",
    "Find the best place for your vegetable plants so that your growing is more successful.",
    ["gardening"],
    "Read this before you dig anything; it saves moving beds later.",
  ),
  link(
    2,
    "https://hgic.clemson.edu/factsheet/soil-texture-analysis-the-jar-test/",
    "Soil Texture Analysis “The Jar Test”",
    "Discover how to identify sand, silt, and clay in your soil using the simple jar test for better garden management.",
    ["soil"],
  ),
  section(
    3,
    "Preparing beds",
    "Build the beds and start the compost early; both take longer than you expect.",
  ),
  link(
    4,
    "https://blogs.ifas.ufl.edu/leonco/2022/11/17/tips-on-building-raised-bed-gardens/",
    "Tips on Building Raised Bed Gardens",
    "Raised bed gardens give you the ability to put a garden anywhere you have at least six hours of sunlight and access to water, regardless of your native soil type.",
    ["beds"],
  ),
  link(
    5,
    "https://www.rhs.org.uk/soil-composts-mulches/composting",
    "Composting",
    "Recycle garden waste into nutrient-rich compost easily with our guide to making this valuable soil improver.",
    ["compost"],
  ),
  section(6, "Planting", "Sow on time, then give seedlings a week to get used to the outdoors."),
  link(
    7,
    "https://www.rhs.org.uk/vegetables/seeds-sowing",
    "Vegetable Seeds: Sowing Guide",
    "Plan your sowing schedule for a steady supply of vegetables all season long with expert advice.",
    ["seeds"],
  ),
  link(
    8,
    "https://extension.umd.edu/resource/hardening-vegetable-seedlings-home-garden",
    "Hardening Off Vegetable Seedlings for the Home Garden",
    "Hardening off seedlings is a necessary step to prepare your plants for outdoor conditions before they are planted in the garden.",
    ["seeds"],
  ),
  section(9, "Caring and harvesting", "Water deeply and less often, and pick at the right moment."),
  link(
    10,
    "https://wilkes.ces.ncsu.edu/news/watering-wisely-how-much-your-summer-vegetable-garden-really-needs/",
    "Watering Wisely: How Much Your Summer Vegetable Garden Really Needs",
    "How much water does a vegetable garden really need in the summer? Summer gardening comes with its share of challenges, which include heat, pests, weeds, and most of all, water.",
    ["watering"],
  ),
  link(
    11,
    "https://extension.illinois.edu/blogs/good-growing/2024-06-28-harvesting-vegetables-when-and-how-pick-your-vegetables-best-quality",
    "Harvesting Vegetables: When and how to pick your vegetables for best quality",
    "There aren’t many things more satisfying than going out to your garden and harvesting your produce.",
    ["harvest"],
  ),
];
