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
  {
    category: "Software Development",
    topic: "Git",
    difficulty: "EASY",
    prompt: "Which command creates a new branch and switches to it in one step?",
    explanation: "`git checkout -b <name>` (or `git switch -c <name>`) creates and checks out a branch in one command.",
    tags: ["git", "version-control"],
    options: [
      { label: "git checkout -b <name>", isCorrect: true },
      { label: "git branch <name>", isCorrect: false },
      { label: "git commit -b <name>", isCorrect: false },
      { label: "git merge -b <name>", isCorrect: false },
    ],
  },
  {
    category: "Software Development",
    topic: "React",
    difficulty: "EASY",
    prompt: "Which React hook lets you run side effects after render?",
    explanation: "useEffect runs after the DOM has been updated, making it the place for side effects like data fetching or subscriptions.",
    tags: ["react", "hooks"],
    options: [
      { label: "useEffect", isCorrect: true },
      { label: "useMemo", isCorrect: false },
      { label: "useReducer", isCorrect: false },
      { label: "useContext", isCorrect: false },
    ],
  },
  {
    category: "Software Development",
    topic: "HTTP",
    difficulty: "EASY",
    prompt: "Which HTTP status code indicates a resource was successfully created?",
    explanation: "201 Created is returned when a request has resulted in the creation of a new resource.",
    tags: ["http", "api"],
    options: [
      { label: "201", isCorrect: true },
      { label: "200", isCorrect: false },
      { label: "204", isCorrect: false },
      { label: "302", isCorrect: false },
    ],
  },
  {
    category: "Software Development",
    topic: "Data Structures",
    difficulty: "MEDIUM",
    prompt: "Which data structure provides O(1) average-case lookup by key?",
    explanation: "A hash table (hash map) provides average O(1) lookup, insertion, and deletion by key.",
    tags: ["data-structures", "complexity"],
    options: [
      { label: "Hash table", isCorrect: true },
      { label: "Linked list", isCorrect: false },
      { label: "Binary search tree", isCorrect: false },
      { label: "Array (unsorted)", isCorrect: false },
    ],
  },
  {
    category: "Software Development",
    topic: "TypeScript",
    difficulty: "MEDIUM",
    prompt: "What does the `never` type in TypeScript represent?",
    explanation: "`never` represents values that never occur — e.g. a function that always throws or an exhaustive switch's unreachable branch.",
    tags: ["typescript", "types"],
    options: [
      { label: "A value that never occurs", isCorrect: true },
      { label: "An optional value", isCorrect: false },
      { label: "Any value at all", isCorrect: false },
      { label: "An empty array", isCorrect: false },
    ],
  },
  {
    category: "Software Development",
    topic: "Concurrency",
    difficulty: "MEDIUM",
    prompt: "In Node.js, what is the primary mechanism that allows non-blocking I/O on a single thread?",
    explanation: "The event loop dispatches completed async I/O callbacks without blocking the single JS execution thread.",
    tags: ["nodejs", "concurrency"],
    options: [
      { label: "The event loop", isCorrect: true },
      { label: "Native OS threads per request", isCorrect: false },
      { label: "Green threads", isCorrect: false },
      { label: "Fork-per-connection", isCorrect: false },
    ],
  },
  {
    category: "Software Development",
    topic: "Databases",
    difficulty: "HARD",
    prompt: "What problem does a database index primarily trade away in exchange for faster reads?",
    explanation: "Indexes speed up reads but slow down writes (insert/update/delete) since the index structure must also be maintained.",
    tags: ["sql", "performance"],
    options: [
      { label: "Write performance", isCorrect: true },
      { label: "Read performance", isCorrect: false },
      { label: "Storage cost only, no trade-off otherwise", isCorrect: false },
      { label: "Query correctness", isCorrect: false },
    ],
  },
  {
    category: "Software Development",
    topic: "Design Patterns",
    difficulty: "MEDIUM",
    prompt: "Which design pattern restricts a class to a single instance and provides a global access point to it?",
    explanation: "The Singleton pattern ensures only one instance of a class exists and provides a single access point.",
    tags: ["design-patterns", "oop"],
    options: [
      { label: "Singleton", isCorrect: true },
      { label: "Factory", isCorrect: false },
      { label: "Observer", isCorrect: false },
      { label: "Decorator", isCorrect: false },
    ],
  },
  {
    category: "Software Development",
    topic: "Algorithms",
    difficulty: "HARD",
    prompt: "What is the worst-case time complexity of quicksort?",
    explanation: "Quicksort degrades to O(n²) in the worst case (e.g. already-sorted input with a naive pivot choice), even though its average case is O(n log n).",
    tags: ["algorithms", "sorting"],
    options: [
      { label: "O(n²)", isCorrect: true },
      { label: "O(n log n)", isCorrect: false },
      { label: "O(n)", isCorrect: false },
      { label: "O(log n)", isCorrect: false },
    ],
  },
  {
    category: "Cybersecurity",
    topic: "Web Security",
    difficulty: "EASY",
    prompt: "What does SQL injection primarily exploit?",
    explanation: "SQL injection exploits improper handling of user input that gets concatenated directly into SQL queries instead of being parameterized.",
    tags: ["web", "injection"],
    options: [
      { label: "Unsanitized input concatenated into queries", isCorrect: true },
      { label: "Weak TLS cipher suites", isCorrect: false },
      { label: "DNS cache poisoning", isCorrect: false },
      { label: "Cross-origin resource sharing misconfiguration", isCorrect: false },
    ],
  },
  {
    category: "Cybersecurity",
    topic: "Authentication",
    difficulty: "EASY",
    prompt: "What does 2FA/MFA add on top of a password?",
    explanation: "Multi-factor authentication requires an additional independent factor (something you have/are) beyond just something you know.",
    tags: ["auth", "mfa"],
    options: [
      { label: "An additional independent verification factor", isCorrect: true },
      { label: "A longer password requirement", isCorrect: false },
      { label: "Automatic password rotation", isCorrect: false },
      { label: "IP allowlisting", isCorrect: false },
    ],
  },
  {
    category: "Cybersecurity",
    topic: "Cryptography",
    difficulty: "MEDIUM",
    prompt: "What is the main difference between symmetric and asymmetric encryption?",
    explanation: "Symmetric encryption uses one shared key for both encryption and decryption; asymmetric uses a public/private key pair.",
    tags: ["crypto", "encryption"],
    options: [
      { label: "Symmetric uses one shared key; asymmetric uses a key pair", isCorrect: true },
      { label: "Symmetric is always more secure", isCorrect: false },
      { label: "Asymmetric doesn't require any key", isCorrect: false },
      { label: "They're the same, just different names", isCorrect: false },
    ],
  },
  {
    category: "Cybersecurity",
    topic: "Web Security",
    difficulty: "MEDIUM",
    prompt: "What does CSRF (Cross-Site Request Forgery) exploit?",
    explanation: "CSRF tricks a victim's browser into submitting an authenticated request to a site they're already logged into, using their existing session cookie.",
    tags: ["web", "csrf"],
    options: [
      { label: "The victim's existing authenticated session", isCorrect: true },
      { label: "A weak password", isCorrect: false },
      { label: "An expired TLS certificate", isCorrect: false },
      { label: "Unpatched OS kernel vulnerability", isCorrect: false },
    ],
  },
  {
    category: "Cybersecurity",
    topic: "Network Security",
    difficulty: "MEDIUM",
    prompt: "What is the purpose of a DMZ (demilitarized zone) in network architecture?",
    explanation: "A DMZ isolates public-facing services from the internal network, limiting the blast radius if a public-facing service is compromised.",
    tags: ["networking", "architecture"],
    options: [
      { label: "Isolate public-facing services from the internal network", isCorrect: true },
      { label: "Encrypt all internal traffic", isCorrect: false },
      { label: "Speed up DNS resolution", isCorrect: false },
      { label: "Replace the need for a firewall", isCorrect: false },
    ],
  },
  {
    category: "Cybersecurity",
    topic: "Malware",
    difficulty: "EASY",
    prompt: "What distinguishes ransomware from most other malware?",
    explanation: "Ransomware encrypts (or threatens to leak) a victim's data and demands payment for restoration/silence, rather than just stealing data quietly.",
    tags: ["malware"],
    options: [
      { label: "It encrypts/holds data hostage for payment", isCorrect: true },
      { label: "It only affects mobile devices", isCorrect: false },
      { label: "It cannot spread over a network", isCorrect: false },
      { label: "It is always delivered via USB drives", isCorrect: false },
    ],
  },
  {
    category: "Cybersecurity",
    topic: "Access Control",
    difficulty: "MEDIUM",
    prompt: "What is the \"principle of least privilege\"?",
    explanation: "Least privilege means granting a user or process only the minimum access necessary to perform its function, limiting damage from compromise or error.",
    tags: ["access-control"],
    options: [
      { label: "Grant only the minimum access needed to do the job", isCorrect: true },
      { label: "Grant admin access to all trusted employees", isCorrect: false },
      { label: "Rotate all passwords weekly", isCorrect: false },
      { label: "Disable all logging to reduce attack surface", isCorrect: false },
    ],
  },
  {
    category: "Cybersecurity",
    topic: "Incident Response",
    difficulty: "HARD",
    prompt: "In incident response, what is the purpose of the \"containment\" phase?",
    explanation: "Containment limits the spread/impact of an active incident (e.g. isolating affected systems) before eradication and recovery begin.",
    tags: ["incident-response"],
    options: [
      { label: "Limit the spread/impact of the active incident", isCorrect: true },
      { label: "Permanently delete all affected systems", isCorrect: false },
      { label: "Notify the press immediately", isCorrect: false },
      { label: "Restore from backups before investigating", isCorrect: false },
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
