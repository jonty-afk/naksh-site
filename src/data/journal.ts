// Journal stories: useful, honest editorial (guides and craft notes), no invented clients or press.
/** `piece`: show that piece cut out on its own colour instead of the boxed photograph (the photo is still used for share previews). */
export interface Story { slug: string; kicker: string; title: string; dek: string; image: string; piece?: string; minutes: number; body: string; shop?: string }

export const JOURNAL: Story[] = [
  {
    slug: 'what-to-wear-to-a-sangeet', kicker: 'Occasion guide', minutes: 5, shop: '/occasion/sangeet',
    title: 'What to wear to a sangeet', image: '/cat/neelam/front.webp', piece: 'neelam',
    dek: 'Movement, colour and a little sparkle: how to dress for the most joyful night of the wedding week.',
    body: `
      <p>The sangeet is the night everyone dances. Families perform, cousins rehearse for weeks and the music runs late — so the first rule is simple: wear something you can move in.</p>
      <h2>Choose a silhouette that swings</h2>
      <p>A lehenga with a full flare, or a sharara that opens from the knee, looks wonderful in motion. Anarkalis work too, as long as the skirt has enough panels (kalis) to swing rather than cling. Avoid long trains: they are beautiful on a stage and impossible on a crowded dance floor.</p>
      <p class="pull">If you will be dancing, choose embroidery that sparkles from across the room: sequins, cutdana and mirror work.</p>
      <h2>Colour</h2>
      <p>Sangeets are evening events, often in hired halls with warm lighting. Jewel tones — sapphire, emerald, rani pink, deep teal — glow under that light. Leave crimson to the bride unless the family says otherwise.</p>
      <h2>Weight and comfort</h2>
      <p>Heavy zardozi is stunning but warm. For a long night, look for georgette or organza with lighter sequin work, and ask us about a soft lining. Every piece is made to measure, so you can ask for a slightly easier fit through the bodice if you plan to dance.</p>
      <h2>In New Zealand</h2>
      <p>Wedding season here runs through our summer, when halls get warm; winter sangeets call for velvet and a shawl for the walk to the car. Tell us your date and venue on a styling call and we will suggest fabrics to match.</p>`,
  },
  {
    slug: 'the-art-of-zardozi', kicker: 'The craft', minutes: 6, shop: '/shop?edit=couture',
    title: 'The art of zardozi', image: '/cat/rani/detail.webp',
    dek: 'Metal thread, a wooden frame and weeks of patient hands: the embroidery behind our couture pieces.',
    body: `
      <p>Zardozi comes from two Persian words: <em>zar</em>, gold, and <em>dozi</em>, embroidery. It reached the Mughal courts centuries ago and has been worked in India ever since, most famously in Lucknow, Agra and Delhi.</p>
      <h2>How it is made</h2>
      <p>The cloth is stretched tight on a wooden frame called an <em>adda</em>. Artisans sit around it and work with metal-wrapped threads, fine coiled wire (<em>dabka</em>), tiny metal stars (<em>sitara</em>) and beads. Motifs are often padded underneath so they stand up from the surface and catch the light.</p>
      <p class="pull">A dense zardozi border can take a team several weeks. It is the reason couture is made to order, not off a shelf.</p>
      <h2>How to recognise good work</h2>
      <p>Look at the edges of each motif: they should be crisp and even, with no loose loops. Turn the piece in the light — real metal thread has a deep, warm glow rather than a flat shine. And look at the back: neat work is neat on both sides.</p>
      <h2>Caring for it</h2>
      <p>Metal thread does not like moisture or folding. Store zardozi flat, wrapped in soft muslin, and always choose a specialist dry cleaner. Our <a class="link" href="/care">care guide</a> has more.</p>`,
  },
  {
    slug: 'caring-for-couture', kicker: 'Care', minutes: 4, shop: '/care',
    title: 'Caring for velvet, silk and organza', image: '/cat/panna/detail.webp',
    dek: 'A handful of habits that keep embroidered pieces beautiful for decades — and for the next generation.',
    body: `
      <p>Indian occasion wear is made to be kept. Many families pass lehengas and dupattas down; with a little care, yours can last just as long.</p>
      <h2>Storage</h2>
      <p>Store heavy pieces flat, never on a hanger — the weight of embroidery stretches the shoulders and seams. Wrap them in breathable cotton or muslin, not plastic, and add a sachet of neem leaves or cedar rather than mothballs.</p>
      <h2>Velvet</h2>
      <p>Never iron velvet directly. Steam it from the back and brush the pile lightly in one direction with a soft brush.</p>
      <h2>Silk and organza</h2>
      <p>Keep perfume and deodorant off the fabric — spray before you dress and let it dry. Organza creases easily: steam on a low setting from a distance.</p>
      <p class="pull">Every few months, unfold your pieces, let them air for an hour in the shade, and fold them along different lines.</p>
      <h2>Cleaning</h2>
      <p>Only a specialist dry cleaner who handles embroidered and beaded garments. Point out any stains straight away and tell them what they are.</p>`,
  },
  {
    slug: 'dressing-for-a-new-zealand-wedding-season', kicker: 'Occasion guide', minutes: 4, shop: '/occasion/wedding-guest',
    title: 'Dressing for a New Zealand wedding season', image: '/cat/gulabo/front.webp', piece: 'gulabo',
    dek: 'Summer marquees and winter halls: how to plan a wardrobe for weddings on this side of the world.',
    body: `
      <p>Indian weddings in Aotearoa follow two calendars at once: the auspicious dates families choose, and our southern seasons. A December mehndi in a Hamilton garden and a July reception in a Christchurch hall need very different clothes.</p>
      <h2>Summer (December to February)</h2>
      <p>Choose georgette, organza and chanderi; gota patti and mirror work are lighter than zardozi. Brights — marigold, rani pink, turquoise — look wonderful in daylight.</p>
      <h2>Winter (June to August)</h2>
      <p>This is velvet season. Emerald, wine and sapphire velvet with antique-gold embroidery are warm and look richer under indoor lighting. Add a shawl or a long jacket for the walk between car and venue.</p>
      <h2>Plan ahead</h2>
      <p>Made-to-order couture takes six to ten weeks. If you have several events, book a styling call early and we will plan the whole week with you — and help you avoid wearing the same colour as the bride’s sister.</p>`,
  },
];
export const storyBySlug = (s: string) => JOURNAL.find((j) => j.slug === s);
