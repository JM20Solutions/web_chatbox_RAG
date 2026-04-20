/**
 * JM20 Pinecone Indexer
 * Run once to upload knowledge base chunks to Pinecone.
 *
 * Usage:
 *   cp .env.example .env && nano .env   ← fill in your keys
 *   node scripts/pinecone-indexer.mjs
 */

import { config } from 'dotenv';
config({ path: '.env' });

const CHUNKS = [
  {
    id: 'about',
    source: 'About JM20',
    text: `JM20 is a company specializing in building custom AI-powered customer support agents for businesses of all sizes. We combine over 20 years of real-world customer support expertise with cutting-edge AI agentic technology to deliver solutions that are practical, effective, and built around real human needs. At JM20, we believe great customer support is not just about automation — it's about the right blend of artificial intelligence and human insight.`,
  },
  {
    id: 'what-we-do',
    source: 'What JM20 Does',
    text: `JM20 designs, builds, and deploys custom AI agents that handle customer support on behalf of businesses. These agents can answer questions, resolve issues, collect information, qualify leads, and book appointments — all automatically, around the clock. Every agent is tailored specifically to the client's business, tone, products, and customers. We don't offer off-the-shelf bots; we build bespoke agentic systems that feel like a natural extension of your brand.`,
  },
  {
    id: 'clients',
    source: 'Who We Work With',
    text: `JM20 works with businesses across all industries and sizes — from small and medium-sized businesses to large enterprises. Our clients include e-commerce brands, SaaS companies, service businesses, and more. Whether you are a startup automating your first support channel or an enterprise scaling across multiple regions, JM20 has the experience and technology to help.`,
  },
  {
    id: 'channels',
    source: 'Channels Supported',
    text: `JM20's AI agents can be deployed across multiple communication channels: Web Chat (embedded on your website for instant visitor support), WhatsApp (meet customers where they already are), and Telegram (automate support and engagement through Telegram bots). All channels are managed as part of a unified multichannel strategy so customers get a consistent experience wherever they reach you.`,
  },
  {
    id: 'differentiators',
    source: 'What Makes JM20 Different',
    text: `JM20 stands out for several reasons: 20+ years of real customer support experience (not just tech theory); a Human + AI hybrid approach where AI handles volume and speed while humans handle complex or sensitive cases; multichannel coverage across Web, WhatsApp, and Telegram; fully custom solutions with no templates or generic bots; and a team of real people who care about the quality of your customer experience.`,
  },
  {
    id: 'process',
    source: 'How It Works',
    text: `Getting started with JM20 is a 4-step process. Step 1 — Discovery Call: a free, no-commitment conversation to understand your business, customers, and goals. Step 2 — Custom Build: we design and build an AI agent tailored to your products, tone of voice, FAQs, and workflows. Step 3 — Deploy: we launch the agent across your chosen channels and ensure everything runs smoothly before going live. Step 4 — Ongoing Support: continuous monitoring, improvements, and support after launch. We are a long-term partner, not a one-time vendor.`,
  },
  {
    id: 'pricing',
    source: 'Pricing',
    text: `JM20 uses a custom pricing model. Because every business has different needs, volumes, and complexity, we tailor every proposal. There are no fixed plans or one-size-fits-all packages. To get a quote, book a free discovery call or email hello@jm20.com. The discovery call is free and there is no commitment.`,
  },
  {
    id: 'contact',
    source: 'Contact JM20',
    text: `You can reach JM20 two ways: (1) the chat widget on this website — use it to ask questions or book a discovery call, available 24/7; (2) email at hello@jm20.com for inquiries, partnerships, or any questions. We typically respond within one business day.`,
  },
  {
    id: 'faq-tech',
    source: 'FAQ — Do I need a technical team?',
    text: `No technical team is needed to work with JM20. We handle the full technical build and deployment. You just need to share information about your business, and we take care of everything else. Most projects go from discovery to deployment within a few weeks.`,
  },
  {
    id: 'faq-handoff',
    source: 'FAQ — Human handoff',
    text: `Yes. JM20 agents support human handoff. Our human + AI hybrid approach means the system escalates to a human agent for complex, sensitive, or high-value interactions. AI handles the volume; humans handle the nuance. Your customers always get the right kind of help.`,
  },
  {
    id: 'faq-languages',
    source: 'FAQ — Languages supported',
    text: `JM20 agents can support multiple languages depending on your customer base. Multilingual requirements should be discussed during the discovery call and will be designed into the solution.`,
  },
  {
    id: 'faq-demo',
    source: 'FAQ — Can I see a demo?',
    text: `Yes — you are already interacting with one. The chat widget on this website is a live demo of JM20's technology. You can also book a personalized demo during the discovery call to see a solution tailored specifically to your business.`,
  },
  {
    id: 'book-call',
    source: 'Book a Discovery Call',
    text: `To book a free discovery call with JM20, use the chat widget on this website or email hello@jm20.com. No commitment, no pressure — just a conversation about your needs and how JM20 can help. Discovery calls are always free.`,
  },
];

async function embedChunk(text) {
  const res = await fetch('https://api.pinecone.io/embed', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': process.env.PINECONE_API_KEY,
    },
    body: JSON.stringify({
      model: 'multilingual-e5-large',
      inputs: [{ text }],
      parameters: { input_type: 'passage', truncate: 'END' },
    }),
  });
  if (!res.ok) throw new Error(`Embed failed: ${await res.text()}`);
  const data = await res.json();
  return data.data[0].values;
}

async function run() {
  console.log('🚀 JM20 Pinecone Indexer');
  console.log(`📦 Indexing ${CHUNKS.length} chunks...\n`);

  const vectors = [];
  for (const chunk of CHUNKS) {
    process.stdout.write(`  ↗ ${chunk.source}... `);
    const values = await embedChunk(chunk.text);
    vectors.push({ id: chunk.id, values, metadata: { text: chunk.text, source: chunk.source } });
    console.log('✓');
  }

  console.log('\n📤 Upserting to Pinecone...');
  const res = await fetch(`${process.env.PINECONE_INDEX_HOST}/vectors/upsert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': process.env.PINECONE_API_KEY,
    },
    body: JSON.stringify({ vectors }),
  });

  if (!res.ok) throw new Error(`Upsert failed: ${await res.text()}`);
  const data = await res.json();
  console.log(`\n✅ Done! ${data.upsertedCount} vectors indexed.`);
  console.log('   Your chat is ready to go.\n');
}

run().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
