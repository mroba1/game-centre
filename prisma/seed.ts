import { PrismaClient, Role } from "@prisma/client";
import { hash } from "argon2";

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: "Software Development", icon: "code" },
  { name: "Cybersecurity", icon: "shield" },
];

const SETTINGS: Array<{ key: string; value: string; description: string }> = [
  { key: "PLATFORM_FEE_PERCENT", value: "5", description: "Platform commission taken from each match's prize pool." },
  { key: "STAKE_TIERS_KOBO", value: "50000,100000,250000,500000", description: "Allowed stake amounts in kobo (₦500 / ₦1,000 / ₦2,500 / ₦5,000)." },
  { key: "DEFAULT_QUESTION_COUNT", value: "10", description: "Number of questions per match." },
  { key: "MATCH_APPROVAL_SLA_MINUTES", value: "10", description: "Minutes a match may wait for admin approval before auto-cancel + refund." },
  { key: "FORFEIT_GRACE_SECONDS", value: "60", description: "Seconds a disconnected player has to reconnect before auto-forfeit." },
  { key: "DISPUTE_WINDOW_MINUTES", value: "15", description: "Minutes after match completion a player may raise a dispute." },
  { key: "LOSER_REFUND_PERCENT", value: "10", description: "Percent of their own stake refunded to the losing player." },
  { key: "MAX_CONCURRENT_MATCHES_PER_USER", value: "3", description: "Max in-progress matches + 1 open lobby per user." },
  { key: "QUESTION_TIME_LIMIT_SECONDS", value: "15", description: "Seconds each player has to answer a revealed question." },
];

const QUESTIONS: Array<{
  category: string;
  topic: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  prompt: string;
  explanation: string;
  tags: string[];
  options: Array<{ label: string; isCorrect: boolean }>;
}> = [
  {
    category: "Software Development",
    topic: "JavaScript",
    difficulty: "EASY",
    prompt: "What does `typeof null` evaluate to in JavaScript?",
    explanation: "This is a long-standing language quirk kept for backwards compatibility.",
    tags: ["javascript", "types"],
    options: [
      { label: "'object'", isCorrect: true },
      { label: "'null'", isCorrect: false },
      { label: "'undefined'", isCorrect: false },
      { label: "'number'", isCorrect: false },
    ],
  },
  {
    category: "Software Development",
    topic: "Algorithms",
    difficulty: "MEDIUM",
    prompt: "What is the time complexity of binary search on a sorted array of n elements?",
    explanation: "Binary search halves the search space each iteration.",
    tags: ["algorithms", "complexity"],
    options: [
      { label: "O(log n)", isCorrect: true },
      { label: "O(n)", isCorrect: false },
      { label: "O(n log n)", isCorrect: false },
      { label: "O(1)", isCorrect: false },
    ],
  },
  {
    category: "Software Development",
    topic: "Databases",
    difficulty: "MEDIUM",
    prompt: "Which SQL isolation level prevents both dirty reads and non-repeatable reads but still allows phantom reads?",
    explanation: "Repeatable Read locks the rows it has read, but new rows can still appear.",
    tags: ["sql", "transactions"],
    options: [
      { label: "Repeatable Read", isCorrect: true },
      { label: "Read Uncommitted", isCorrect: false },
      { label: "Read Committed", isCorrect: false },
      { label: "Serializable", isCorrect: false },
    ],
  },
  {
    category: "Cybersecurity",
    topic: "Web Security",
    difficulty: "EASY",
    prompt: "Which HTTP header helps mitigate clickjacking attacks?",
    explanation: "X-Frame-Options (or the frame-ancestors CSP directive) controls whether a page can be embedded in a frame.",
    tags: ["web", "headers"],
    options: [
      { label: "X-Frame-Options", isCorrect: true },
      { label: "X-Powered-By", isCorrect: false },
      { label: "Content-Length", isCorrect: false },
      { label: "Accept-Encoding", isCorrect: false },
    ],
  },
  {
    category: "Cybersecurity",
    topic: "Cryptography",
    difficulty: "MEDIUM",
    prompt: "Why is Argon2id generally preferred over bcrypt for new password-hashing systems?",
    explanation: "Argon2id is memory-hard, making GPU/ASIC-accelerated cracking significantly more expensive.",
    tags: ["crypto", "passwords"],
    options: [
      { label: "It is memory-hard, resisting GPU/ASIC cracking", isCorrect: true },
      { label: "It runs faster than bcrypt", isCorrect: false },
      { label: "It doesn't require a salt", isCorrect: false },
      { label: "It produces shorter hashes", isCorrect: false },
    ],
  },
  {
    category: "Cybersecurity",
    topic: "Network Security",
    difficulty: "HARD",
    prompt: "In a TLS 1.3 handshake, how many round trips are typically required before application data can be sent (without 0-RTT)?",
    explanation: "TLS 1.3 reduced the standard handshake to a single round trip, down from two in TLS 1.2.",
    tags: ["tls", "networking"],
    options: [
      { label: "1", isCorrect: true },
      { label: "2", isCorrect: false },
      { label: "3", isCorrect: false },
      { label: "0", isCorrect: false },
    ],
  },
];

async function main() {
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
  }

  for (const s of SETTINGS) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: s,
    });
  }

  for (const q of QUESTIONS) {
    const category = await prisma.category.findUniqueOrThrow({ where: { name: q.category } });
    const existing = await prisma.question.findFirst({ where: { prompt: q.prompt } });
    if (existing) continue;

    await prisma.question.create({
      data: {
        categoryId: category.id,
        topic: q.topic,
        difficulty: q.difficulty,
        prompt: q.prompt,
        explanation: q.explanation,
        tags: q.tags,
        options: {
          create: q.options.map((o, i) => ({
            label: o.label,
            isCorrect: o.isCorrect,
            sortOrder: i,
          })),
        },
      },
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@wavworkshop.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        username: "admin",
        passwordHash: await hash(adminPassword),
        role: Role.ADMIN,
        emailVerified: new Date(),
        adminProfile: { create: {} },
        wallet: { create: {} },
      },
    });
    console.log(`Seeded admin user: ${admin.email} / (password set via SEED_ADMIN_PASSWORD)`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
