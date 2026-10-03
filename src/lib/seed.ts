import type { Business, Conversation, DemoDatabase, Inquiry, KnowledgeItem, UnansweredQuestion } from './types';

export const MAPLE_ID = 'biz_maple_street_bakery';
export const HARBOR_ID = 'biz_harbor_bike_repair';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

type KnowledgeSeed = Omit<KnowledgeItem, 'businessId' | 'updatedAt' | 'status'> & { status?: KnowledgeItem['status'] };

const mapleKnowledge: KnowledgeSeed[] = [
  {
    id: 'kb_maple_hours',
    kind: 'service',
    question: 'Opening hours',
    answer:
      'We are open Tuesday to Friday 7:00 am to 6:00 pm, Saturday 8:00 am to 4:00 pm, and Sunday 8:00 am to 2:00 pm. We are closed on Mondays.',
    keywords: ['hours', 'open', 'close', 'saturday', 'sunday', 'monday', 'weekend', 'today'],
  },
  {
    id: 'kb_maple_location',
    kind: 'service',
    question: 'Location and address',
    answer: 'You can find us at 214 Maple Street, Springfield, two doors down from the public library.',
    keywords: ['address', 'location', 'where', 'directions', 'find'],
  },
  {
    id: 'kb_maple_parking',
    kind: 'faq',
    question: 'Is there parking nearby?',
    answer:
      'Yes. There is free 2-hour street parking on Maple Street and a public lot behind the library on Oak Avenue.',
    keywords: ['parking', 'park', 'car', 'lot'],
  },
  {
    id: 'kb_maple_custom_cakes',
    kind: 'faq',
    question: 'Can I order a custom or birthday cake?',
    answer:
      'Yes! Custom cakes need at least 72 hours notice (2 weeks for wedding cakes). Order in store, by phone at (555) 014-2290, or with our online order form. Custom cakes start at $45 for a 6-inch round.',
    keywords: ['custom', 'cake', 'birthday', 'wedding', 'order', 'preorder', 'celebration', 'price'],
  },
  {
    id: 'kb_maple_gluten_free',
    kind: 'faq',
    question: 'Do you have gluten-free options?',
    answer:
      'We bake gluten-free brownies, almond-flour cookies, and a gluten-free loaf on Thursdays and Saturdays. They are made in a shared kitchen, so we cannot guarantee they are safe for celiac disease.',
    keywords: ['gluten', 'gluten free', 'celiac', 'wheat'],
  },
  {
    id: 'kb_maple_vegan',
    kind: 'faq',
    question: 'Do you have vegan or dairy-free items?',
    answer:
      'Yes. Our sourdough, baguettes, vegan chocolate chip cookies, and vegan banana muffins are dairy-free and egg-free. Ask at the counter for today\u2019s selection.',
    keywords: ['vegan', 'dairy', 'dairy free', 'egg free', 'plant based'],
  },
  {
    id: 'kb_maple_allergens',
    kind: 'faq',
    question: 'How do you handle nut and other allergies?',
    answer:
      'Our kitchen handles tree nuts, peanuts, wheat, dairy, eggs, and soy. Every item is labeled with its allergens, but we cannot guarantee any item is allergen-free because of shared equipment.',
    keywords: ['allergy', 'allergen', 'nut', 'peanut', 'tree nut', 'soy'],
  },
  {
    id: 'kb_maple_delivery',
    kind: 'faq',
    question: 'Do you deliver?',
    answer:
      'We deliver orders over $30 within 5 miles on Tuesday to Saturday for a $6 fee. Order by 2:00 pm the day before.',
    keywords: ['deliver', 'delivery', 'shipping'],
  },
  {
    id: 'kb_maple_catering',
    kind: 'service',
    question: 'Catering and office orders',
    answer:
      'We cater breakfasts and meetings with pastry boxes for 10, 20, or 40 people starting at $38. Please order catering at least 48 hours ahead.',
    keywords: ['catering', 'cater', 'office', 'meeting', 'event', 'party', 'pastry box'],
  },
  {
    id: 'kb_maple_payment',
    kind: 'faq',
    question: 'What payment methods do you accept?',
    answer: 'We accept cash, all major credit and debit cards, Apple Pay, and Google Pay.',
    keywords: ['payment', 'pay', 'card', 'cash', 'credit', 'apple pay', 'google pay'],
  },
  {
    id: 'kb_maple_sourdough',
    kind: 'service',
    question: 'Sourdough bread schedule',
    answer:
      'Our country sourdough is baked daily and is usually ready by 9:00 am. Seeded rye is baked on Wednesdays and Saturdays. You can reserve loaves by phone.',
    keywords: ['sourdough', 'bread', 'loaf', 'rye', 'baguette', 'reserve'],
  },
  {
    id: 'kb_maple_holiday',
    kind: 'service',
    question: 'Holiday pie pre-orders',
    answer:
      'Holiday pie pre-orders open November 1. Pies are $28 each and must be picked up on the date you choose.',
    keywords: ['holiday', 'thanksgiving', 'christmas', 'pie', 'preorder'],
    status: 'draft',
  },
];

const harborKnowledge: KnowledgeSeed[] = [
  {
    id: 'kb_harbor_hours',
    kind: 'service',
    question: 'Shop hours',
    answer: 'Harbor Bike Repair is open Monday to Friday 10:00 am to 7:00 pm and Saturday 9:00 am to 5:00 pm. We are closed on Sundays.',
    keywords: ['hours', 'open', 'close', 'saturday', 'sunday', 'weekend'],
  },
  {
    id: 'kb_harbor_tuneup',
    kind: 'service',
    question: 'Tune-up packages and prices',
    answer:
      'Basic tune-up is $75 (brakes, gears, safety check). Full tune-up is $140 and adds wheel truing and drivetrain cleaning. Parts are extra.',
    keywords: ['tune', 'tune up', 'tuneup', 'overhaul', 'price', 'brakes', 'gears'],
  },
  {
    id: 'kb_harbor_flat',
    kind: 'faq',
    question: 'Can you fix a flat tire while I wait?',
    answer: 'Yes. Flat repairs are $15 plus the tube and usually take about 20 minutes, walk-ins welcome.',
    keywords: ['flat', 'tire', 'tyre', 'tube', 'puncture', 'wait'],
  },
  {
    id: 'kb_harbor_turnaround',
    kind: 'faq',
    question: 'How long do repairs take?',
    answer: 'Most repairs are finished in 2 to 3 business days. We text you when your bike is ready.',
    keywords: ['turnaround', 'how long', 'wait', 'ready', 'repair'],
  },
  {
    id: 'kb_harbor_ebike',
    kind: 'faq',
    question: 'Do you service e-bikes?',
    answer: 'We service most e-bikes for brakes, tires, and drivetrains. We do not repair motors or batteries.',
    keywords: ['ebike', 'e-bike', 'electric', 'motor', 'battery'],
  },
  {
    id: 'kb_harbor_rentals',
    kind: 'service',
    question: 'Bike rentals',
    answer: 'Hybrid bike rentals are $35 per day including a helmet and lock. A credit card deposit is required.',
    keywords: ['rental', 'rent', 'hire', 'helmet'],
  },
  {
    id: 'kb_harbor_location',
    kind: 'service',
    question: 'Location',
    answer: 'We are at 9 Harbor Road, next to the ferry terminal bike path.',
    keywords: ['address', 'location', 'where', 'directions'],
  },
];

function knowledgeFor(businessId: string, seeds: KnowledgeSeed[], now: number): KnowledgeItem[] {
  return seeds.map((s, i) => ({
    ...s,
    businessId,
    status: s.status ?? 'approved',
    updatedAt: new Date(now - (i + 2) * DAY).toISOString(),
  }));
}

function iso(now: number, offset: number): string {
  return new Date(now - offset).toISOString();
}

export function buildSeed(now: number = Date.now()): DemoDatabase {
  const businesses: Business[] = [
    {
      id: MAPLE_ID,
      slug: 'maple-street-bakery',
      name: 'Maple Street Bakery',
      tagline: 'Neighborhood sourdough, pastries, and celebration cakes since 2009.',
      category: 'Bakery & caf\u00e9',
      brandColor: '#b45309',
      phone: '(555) 014-2290',
      email: 'hello@maplestreetbakery.example',
      address: '214 Maple Street, Springfield',
      greeting: 'Hi! I\u2019m the Maple Street Bakery assistant. Ask me about hours, cakes, allergens, or delivery.',
      widgetKey: 'pk_demo_maple_7c1f2a',
      allowedOrigins: ['http://localhost:5173', 'http://localhost:4173', 'https://www.maplestreetbakery.example'],
    },
    {
      id: HARBOR_ID,
      slug: 'harbor-bike-repair',
      name: 'Harbor Bike Repair',
      tagline: 'Fast, honest bike repairs by the harbor.',
      category: 'Bike shop',
      brandColor: '#0e7490',
      phone: '(555) 019-4410',
      email: 'service@harborbikes.example',
      address: '9 Harbor Road, Bayside',
      greeting: 'Hey there! I can answer questions about Harbor Bike Repair\u2019s services, prices, and hours.',
      widgetKey: 'pk_demo_harbor_93be41',
      allowedOrigins: ['http://localhost:5173', 'http://localhost:4173', 'https://www.harborbikes.example'],
    },
  ];

  const conversations: Conversation[] = [
    {
      id: 'conv_maple_001',
      businessId: MAPLE_ID,
      visitorToken: 'seed-token-maple-001',
      visitorLabel: 'Visitor A41C',
      startedAt: iso(now, 2 * HOUR),
      updatedAt: iso(now, 2 * HOUR - 3 * MIN),
      status: 'active',
      pageUrl: '/demo/maple-street-bakery',
      messages: [
        { id: 'm1', role: 'visitor', text: 'Are you open on Sunday?', createdAt: iso(now, 2 * HOUR) },
        {
          id: 'm2',
          role: 'assistant',
          text: mapleKnowledge[0].answer,
          createdAt: iso(now, 2 * HOUR - 5_000),
          outcome: 'answered',
          sourceIds: ['kb_maple_hours'],
        },
        { id: 'm3', role: 'visitor', text: 'Do you have gluten free bread?', createdAt: iso(now, 2 * HOUR - 2 * MIN) },
        {
          id: 'm4',
          role: 'assistant',
          text: mapleKnowledge[4].answer,
          createdAt: iso(now, 2 * HOUR - 2 * MIN - 4_000),
          outcome: 'answered',
          sourceIds: ['kb_maple_gluten_free'],
        },
        { id: 'm5', role: 'visitor', text: 'Thanks!', createdAt: iso(now, 2 * HOUR - 3 * MIN) },
        {
          id: 'm6',
          role: 'assistant',
          text: 'You\u2019re welcome! Anything else I can help with?',
          createdAt: iso(now, 2 * HOUR - 3 * MIN + 2_000),
          outcome: 'smalltalk',
        },
      ],
    },
    {
      id: 'conv_maple_002',
      businessId: MAPLE_ID,
      visitorToken: 'seed-token-maple-002',
      visitorLabel: 'Visitor 7D02',
      startedAt: iso(now, 1 * DAY + 3 * HOUR),
      updatedAt: iso(now, 1 * DAY + 3 * HOUR - 4 * MIN),
      status: 'handoff',
      pageUrl: '/demo/maple-street-bakery',
      messages: [
        { id: 'm1', role: 'visitor', text: 'Do you offer baking classes for kids?', createdAt: iso(now, 1 * DAY + 3 * HOUR) },
        {
          id: 'm2',
          role: 'assistant',
          text: 'I don\u2019t have approved information from Maple Street Bakery about that, so I don\u2019t want to guess. Would you like me to pass your question to the team? They can follow up with you directly.',
          createdAt: iso(now, 1 * DAY + 3 * HOUR - 4_000),
          outcome: 'handoff_offered',
        },
        {
          id: 'm3',
          role: 'system',
          text: 'Jordan Lee asked the team to follow up at jordan.lee@example.com.',
          createdAt: iso(now, 1 * DAY + 3 * HOUR - 4 * MIN),
        },
      ],
    },
    {
      id: 'conv_maple_003',
      businessId: MAPLE_ID,
      visitorToken: 'seed-token-maple-003',
      visitorLabel: 'Visitor 19BE',
      startedAt: iso(now, 3 * DAY),
      updatedAt: iso(now, 3 * DAY - 2 * MIN),
      status: 'closed',
      pageUrl: '/demo/maple-street-bakery',
      messages: [
        { id: 'm1', role: 'visitor', text: 'How much notice do you need for a birthday cake?', createdAt: iso(now, 3 * DAY) },
        {
          id: 'm2',
          role: 'assistant',
          text: mapleKnowledge[3].answer,
          createdAt: iso(now, 3 * DAY - 4_000),
          outcome: 'answered',
          sourceIds: ['kb_maple_custom_cakes'],
        },
        { id: 'm3', role: 'visitor', text: 'Do you have keto cakes?', createdAt: iso(now, 3 * DAY - 1 * MIN) },
        {
          id: 'm4',
          role: 'assistant',
          text: 'I don\u2019t have approved information from Maple Street Bakery about that, so I don\u2019t want to guess. Would you like me to pass your question to the team? They can follow up with you directly.',
          createdAt: iso(now, 3 * DAY - 1 * MIN - 4_000),
          outcome: 'handoff_offered',
        },
      ],
    },
    {
      id: 'conv_harbor_001',
      businessId: HARBOR_ID,
      visitorToken: 'seed-token-harbor-001',
      visitorLabel: 'Visitor C3F9',
      startedAt: iso(now, 5 * HOUR),
      updatedAt: iso(now, 5 * HOUR - 1 * MIN),
      status: 'active',
      pageUrl: '/demo/harbor-bike-repair',
      messages: [
        { id: 'm1', role: 'visitor', text: 'How much is a tune-up?', createdAt: iso(now, 5 * HOUR) },
        {
          id: 'm2',
          role: 'assistant',
          text: harborKnowledge[1].answer,
          createdAt: iso(now, 5 * HOUR - 4_000),
          outcome: 'answered',
          sourceIds: ['kb_harbor_tuneup'],
        },
        { id: 'm3', role: 'visitor', text: 'Can you replace my e-bike battery?', createdAt: iso(now, 5 * HOUR - 1 * MIN) },
        {
          id: 'm4',
          role: 'assistant',
          text: harborKnowledge[4].answer,
          createdAt: iso(now, 5 * HOUR - 1 * MIN - 4_000),
          outcome: 'answered',
          sourceIds: ['kb_harbor_ebike'],
        },
      ],
    },
    {
      id: 'conv_harbor_002',
      businessId: HARBOR_ID,
      visitorToken: 'seed-token-harbor-002',
      visitorLabel: 'Visitor 52AA',
      startedAt: iso(now, 2 * DAY),
      updatedAt: iso(now, 2 * DAY - 2 * MIN),
      status: 'handoff',
      pageUrl: '/demo/harbor-bike-repair',
      messages: [
        { id: 'm1', role: 'visitor', text: 'Do you sell used bikes?', createdAt: iso(now, 2 * DAY) },
        {
          id: 'm2',
          role: 'assistant',
          text: 'I don\u2019t have approved information from Harbor Bike Repair about that, so I don\u2019t want to guess. Would you like me to pass your question to the team? They can follow up with you directly.',
          createdAt: iso(now, 2 * DAY - 4_000),
          outcome: 'handoff_offered',
        },
        {
          id: 'm3',
          role: 'system',
          text: 'Sam Rivera asked the team to follow up at sam.rivera@example.com.',
          createdAt: iso(now, 2 * DAY - 2 * MIN),
        },
      ],
    },
  ];

  const inquiries: Inquiry[] = [
    {
      id: 'inq_maple_001',
      businessId: MAPLE_ID,
      conversationId: 'conv_maple_002',
      name: 'Jordan Lee',
      email: 'jordan.lee@example.com',
      phone: '(555) 010-7781',
      message: 'Do you offer baking classes for kids? Looking for something for a 9-year-old\u2019s birthday.',
      status: 'new',
      createdAt: iso(now, 1 * DAY + 3 * HOUR - 4 * MIN),
    },
    {
      id: 'inq_maple_002',
      businessId: MAPLE_ID,
      name: 'Priya Natarajan',
      email: 'priya.n@example.com',
      message: 'We would like a quote for weekly pastry deliveries to our office (about 25 people).',
      status: 'contacted',
      createdAt: iso(now, 4 * DAY),
    },
    {
      id: 'inq_harbor_001',
      businessId: HARBOR_ID,
      conversationId: 'conv_harbor_002',
      name: 'Sam Rivera',
      email: 'sam.rivera@example.com',
      message: 'Do you sell used bikes? Looking for a commuter around $300.',
      status: 'new',
      createdAt: iso(now, 2 * DAY - 2 * MIN),
    },
  ];

  const unanswered: UnansweredQuestion[] = [
    {
      id: 'unq_maple_001',
      businessId: MAPLE_ID,
      conversationId: 'conv_maple_002',
      question: 'Do you offer baking classes for kids?',
      createdAt: iso(now, 1 * DAY + 3 * HOUR),
      status: 'open',
    },
    {
      id: 'unq_maple_002',
      businessId: MAPLE_ID,
      conversationId: 'conv_maple_003',
      question: 'Do you have keto cakes?',
      createdAt: iso(now, 3 * DAY - 1 * MIN),
      status: 'open',
    },
    {
      id: 'unq_harbor_001',
      businessId: HARBOR_ID,
      conversationId: 'conv_harbor_002',
      question: 'Do you sell used bikes?',
      createdAt: iso(now, 2 * DAY),
      status: 'open',
    },
  ];

  return {
    version: 1,
    businesses,
    owners: [
      { id: 'owner_maple', email: 'owner@maplestreetbakery.demo', password: 'demo-bakery', displayName: 'Rosa Martinez' },
      { id: 'owner_harbor', email: 'owner@harborbikes.demo', password: 'demo-bikes', displayName: 'Dev Patel' },
    ],
    memberships: [
      { ownerId: 'owner_maple', businessId: MAPLE_ID, role: 'owner' },
      { ownerId: 'owner_harbor', businessId: HARBOR_ID, role: 'owner' },
    ],
    knowledge: [...knowledgeFor(MAPLE_ID, mapleKnowledge, now), ...knowledgeFor(HARBOR_ID, harborKnowledge, now)],
    conversations,
    inquiries,
    unanswered,
  };
}
