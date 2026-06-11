// Mock datasets for PulseIQ

function seededNoise(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

export const kpis = {
  revenue: { value: 2847650, delta: 12.4, trend: "up" as const },
  profit: { value: 684210, delta: 8.7, trend: "up" as const },
  orders: { value: 18429, delta: 4.2, trend: "up" as const },
  aov: { value: 482, delta: -1.6, trend: "down" as const },
  repeatCustomers: { value: 38.6, delta: 3.1, trend: "up" as const },
  outlets: { value: 24, delta: 0, trend: "flat" as const },
};

export const salesTrend = [
  { day: "Mon", revenue: 38200, orders: 412, profit: 9100 },
  { day: "Tue", revenue: 41800, orders: 458, profit: 10240 },
  { day: "Wed", revenue: 39500, orders: 432, profit: 9680 },
  { day: "Thu", revenue: 47200, orders: 502, profit: 12180 },
  { day: "Fri", revenue: 58400, orders: 612, profit: 15300 },
  { day: "Sat", revenue: 72100, orders: 758, profit: 19200 },
  { day: "Sun", revenue: 64200, orders: 681, profit: 16400 },
];

export const channelData = [
  { name: "Dine-in", value: 42, color: "var(--chart-1)" },
  { name: "Swiggy", value: 24, color: "var(--chart-3)" },
  { name: "Zomato", value: 22, color: "var(--chart-5)" },
  { name: "Direct", value: 12, color: "var(--chart-2)" },
];

export const channelMonthly = [
  { month: "Jan", swiggy: 142000, zomato: 128000, dinein: 220000, direct: 58000 },
  { month: "Feb", swiggy: 158000, zomato: 134000, dinein: 245000, direct: 62000 },
  { month: "Mar", swiggy: 172000, zomato: 148000, dinein: 268000, direct: 71000 },
  { month: "Apr", swiggy: 168000, zomato: 152000, dinein: 281000, direct: 74000 },
  { month: "May", swiggy: 184000, zomato: 161000, dinein: 295000, direct: 78000 },
  { month: "Jun", swiggy: 198000, zomato: 174000, dinein: 312000, direct: 84000 },
];

export const peakHours = Array.from({ length: 24 }, (_, h) => ({
  hour: `${h}:00`,
  orders: Math.round(
    20 +
      120 * Math.exp(-Math.pow((h - 13) / 2.5, 2)) +
      180 * Math.exp(-Math.pow((h - 20) / 2, 2)) +
      seededNoise(h + 1) * 18,
  ),
}));

export const heatmap = (() => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const slots = ["6a", "9a", "12p", "3p", "6p", "9p", "12a"];
  return days.flatMap((d, di) =>
    slots.map((s, si) => ({
      day: d,
      slot: s,
      value: Math.round(
        20 +
          80 * Math.exp(-Math.pow(si - 4, 2) / 4) +
          (di >= 4 ? 35 : 0) +
          seededNoise(di * slots.length + si + 1) * 22,
      ),
    })),
  );
})();

export const outlets = [
  {
    id: "ko-001",
    name: "Koramangala Flagship",
    city: "Bangalore",
    revenue: 482300,
    orders: 3120,
    health: 96,
    change: 8.4,
  },
  {
    id: "in-002",
    name: "Indiranagar Bistro",
    city: "Bangalore",
    revenue: 391500,
    orders: 2580,
    health: 92,
    change: 5.1,
  },
  {
    id: "bk-003",
    name: "Bandra West Kitchen",
    city: "Mumbai",
    revenue: 528900,
    orders: 3340,
    health: 94,
    change: 11.2,
  },
  {
    id: "cp-004",
    name: "Connaught Place",
    city: "Delhi",
    revenue: 412700,
    orders: 2890,
    health: 88,
    change: 3.7,
  },
  {
    id: "hi-005",
    name: "HITEC City Cloud",
    city: "Hyderabad",
    revenue: 298400,
    orders: 2410,
    health: 79,
    change: -2.4,
  },
  {
    id: "an-006",
    name: "Anna Nagar Express",
    city: "Chennai",
    revenue: 254800,
    orders: 2120,
    health: 82,
    change: 1.8,
  },
  {
    id: "vk-007",
    name: "Viman Nagar",
    city: "Pune",
    revenue: 218900,
    orders: 1840,
    health: 74,
    change: -4.1,
  },
  {
    id: "se-008",
    name: "Sector 29 Hub",
    city: "Gurgaon",
    revenue: 318200,
    orders: 2380,
    health: 90,
    change: 6.9,
  },
];

export const aiInsights = [
  {
    id: 1,
    type: "opportunity",
    title: "Increase Paneer Tikka price by ₹20",
    body: "Demand elasticity analysis shows volume will only drop 3% while margin lifts 14%. Estimated +₹84K monthly profit.",
    impact: "+₹84,000/mo",
    confidence: 92,
  },
  {
    id: 2,
    type: "alert",
    title: "Viman Nagar margin anomaly detected",
    body: "Food cost ratio jumped from 32% → 41% over the last 9 days. Likely cause: supplier price change on dairy SKUs.",
    impact: "-₹46,200/mo",
    confidence: 88,
  },
  {
    id: 3,
    type: "forecast",
    title: "Friday demand surge expected",
    body: "Weather + local event signals indicate 28% higher dinner orders on Fri. Pre-prep tandoor base and staff +2.",
    impact: "+₹1.2L revenue",
    confidence: 84,
  },
  {
    id: 4,
    type: "opportunity",
    title: "Bundle suggestion: Biryani + Mocktail",
    body: "Cross-purchase pattern in 2,100 orders. Bundling at ₹399 lifts AOV by ₹62 with 22% attach rate.",
    impact: "+₹62 AOV",
    confidence: 79,
  },
] as const;

export const inventory = [
  {
    sku: "ING-0042",
    name: "Basmati Rice (25kg)",
    stock: 8,
    reorder: 12,
    status: "low",
    supplier: "AgroMart",
    days: 2,
  },
  {
    sku: "ING-0118",
    name: "Paneer (Block 1kg)",
    stock: 22,
    reorder: 30,
    status: "low",
    supplier: "DairyCo",
    days: 1,
  },
  {
    sku: "ING-0204",
    name: "Tomato Puree",
    stock: 64,
    reorder: 40,
    status: "ok",
    supplier: "FreshFarms",
    days: 7,
  },
  {
    sku: "ING-0312",
    name: "Chicken Boneless",
    stock: 14,
    reorder: 25,
    status: "low",
    supplier: "MeatHub",
    days: 1,
  },
  {
    sku: "ING-0408",
    name: "Mozzarella",
    stock: 38,
    reorder: 30,
    status: "ok",
    supplier: "DairyCo",
    days: 5,
  },
  {
    sku: "ING-0501",
    name: "Olive Oil 5L",
    stock: 3,
    reorder: 8,
    status: "critical",
    supplier: "Mediterra",
    days: 1,
  },
  {
    sku: "ING-0612",
    name: "Basil Fresh",
    stock: 18,
    reorder: 15,
    status: "ok",
    supplier: "FreshFarms",
    days: 3,
  },
  {
    sku: "ING-0708",
    name: "Garam Masala 1kg",
    stock: 11,
    reorder: 10,
    status: "ok",
    supplier: "SpiceRoute",
    days: 14,
  },
];

export const menuItems = [
  {
    name: "Butter Chicken",
    category: "Mains",
    sold: 2840,
    margin: 62,
    revenue: 482000,
    score: "Star",
  },
  {
    name: "Paneer Tikka",
    category: "Starters",
    sold: 2210,
    margin: 71,
    revenue: 318000,
    score: "Star",
  },
  {
    name: "Hyderabadi Biryani",
    category: "Mains",
    sold: 3120,
    margin: 58,
    revenue: 561000,
    score: "Star",
  },
  {
    name: "Margherita Pizza",
    category: "Mains",
    sold: 1840,
    margin: 64,
    revenue: 312000,
    score: "Plowhorse",
  },
  { name: "Truffle Pasta", category: "Mains", sold: 412, margin: 38, revenue: 98000, score: "Dog" },
  {
    name: "Mango Mocktail",
    category: "Beverage",
    sold: 1980,
    margin: 78,
    revenue: 138000,
    score: "Puzzle",
  },
  {
    name: "Gulab Jamun",
    category: "Dessert",
    sold: 1240,
    margin: 74,
    revenue: 86000,
    score: "Star",
  },
  { name: "Quinoa Bowl", category: "Healthy", sold: 218, margin: 42, revenue: 41000, score: "Dog" },
];

export const customers = [
  { segment: "VIP", count: 412, ltv: 18420, share: 6 },
  { segment: "Loyal", count: 1840, ltv: 7240, share: 22 },
  { segment: "Regular", count: 3210, ltv: 2840, share: 38 },
  { segment: "At Risk", count: 1120, ltv: 1240, share: 14 },
  { segment: "New", count: 1680, ltv: 480, share: 20 },
];

export const cohorts = [
  { cohort: "Jan", w0: 100, w1: 62, w2: 48, w3: 41, w4: 36 },
  { cohort: "Feb", w0: 100, w1: 68, w2: 52, w3: 44, w4: 38 },
  { cohort: "Mar", w0: 100, w1: 71, w2: 56, w3: 49, w4: 42 },
  { cohort: "Apr", w0: 100, w1: 64, w2: 51, w3: 45, w4: 39 },
  { cohort: "May", w0: 100, w1: 73, w2: 58, w3: 51, w4: 45 },
  { cohort: "Jun", w0: 100, w1: 76, w2: 61, w3: 54, w4: 48 },
];

export const integrations = [
  {
    id: "pos",
    name: "POS Petpooja",
    category: "POS",
    status: "connected",
    health: "healthy",
    lastSync: "2m ago",
    color: "from-indigo-500 to-cyan-400",
  },
  {
    id: "swiggy",
    name: "Swiggy",
    category: "Aggregator",
    status: "connected",
    health: "healthy",
    lastSync: "Just now",
    color: "from-orange-500 to-amber-400",
  },
  {
    id: "zomato",
    name: "Zomato",
    category: "Aggregator",
    status: "connected",
    health: "warning",
    lastSync: "12m ago",
    color: "from-rose-500 to-red-400",
  },
  {
    id: "excel",
    name: "Excel Uploads",
    category: "Files",
    status: "connected",
    health: "healthy",
    lastSync: "1h ago",
    color: "from-emerald-500 to-teal-400",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    category: "Messaging",
    status: "connected",
    health: "healthy",
    lastSync: "5m ago",
    color: "from-green-500 to-emerald-400",
  },
  {
    id: "razorpay",
    name: "Razorpay",
    category: "Payments",
    status: "connected",
    health: "healthy",
    lastSync: "30s ago",
    color: "from-blue-500 to-indigo-400",
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments",
    status: "disconnected",
    health: "off",
    lastSync: "—",
    color: "from-violet-500 to-purple-400",
  },
  {
    id: "inventory",
    name: "Posist Inventory",
    category: "Inventory",
    status: "connected",
    health: "healthy",
    lastSync: "8m ago",
    color: "from-cyan-500 to-sky-400",
  },
  {
    id: "tally",
    name: "Tally ERP",
    category: "Accounting",
    status: "disconnected",
    health: "off",
    lastSync: "—",
    color: "from-yellow-500 to-amber-400",
  },
];

export const notifications = [
  {
    id: 1,
    type: "alert",
    title: "Olive Oil 5L below safety stock",
    time: "2m ago",
    outlet: "Bandra West",
  },
  {
    id: 2,
    type: "ai",
    title: "AI detected pricing anomaly on Truffle Pasta",
    time: "14m ago",
    outlet: "Indiranagar",
  },
  {
    id: 3,
    type: "revenue",
    title: "Revenue +28% vs forecast — Koramangala",
    time: "1h ago",
    outlet: "Koramangala",
  },
  {
    id: 4,
    type: "staff",
    title: "3 staff late check-ins flagged",
    time: "3h ago",
    outlet: "HITEC City",
  },
  {
    id: 5,
    type: "alert",
    title: "Zomato API sync delayed (12m)",
    time: "12m ago",
    outlet: "All outlets",
  },
];

export const forecast = Array.from({ length: 14 }, (_, i) => {
  const base = 58000 + Math.sin(i / 2) * 6000 + i * 800;
  return {
    day: `D${i + 1}`,
    actual: i < 7 ? Math.round(base + (seededNoise(i + 2) - 0.5) * 4000) : null,
    forecast: Math.round(base + 2000),
    upper: Math.round(base + 8000),
    lower: Math.round(base - 6000),
  };
});

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
export const formatNum = (n: number) => new Intl.NumberFormat("en-IN").format(n);
