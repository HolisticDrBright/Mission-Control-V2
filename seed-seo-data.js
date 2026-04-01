const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://utuszztwwadvoxxuyshn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchWordPressPosts(url) {
  const posts = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 3) {
    try {
      const response = await fetch(`${url}?per_page=100&page=${page}&status=publish`);
      if (!response.ok) break;

      const data = await response.json();
      if (!data || data.length === 0) break;

      posts.push(...data);
      page++;
    } catch (e) {
      console.error(`Error fetching page ${page}:`, e.message);
      break;
    }
  }

  return posts;
}

async function seedSEOData() {
  console.log('🌱 Seeding SEO data...\n');

  const sites = [
    {
      name: 'holisticdrbright',
      domain: 'holisticdrbright.com',
      wpUrl: 'https://holisticdrbright.com/wp-json/wp/v2/posts',
    },
    {
      name: 'dspiked',
      domain: 'dspiked.com',
      wpUrl: 'https://www.dspiked.com/wp-json/wp/v2/posts',
    },
  ];

  for (const site of sites) {
    console.log(`📝 Fetching ${site.name} posts...`);

    try {
      const posts = await fetchWordPressPosts(site.wpUrl);
      console.log(`   Found ${posts.length} posts`);

      // Insert/upsert posts
      for (const post of posts) {
        const { error } = await supabase.from('blog_posts').upsert(
          {
            url: post.link,
            title: post.title?.rendered || 'Untitled',
            wordpress_post_id: post.id,
            published_at: post.date_gmt || post.date,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'url' }
        );

        if (error) {
          console.error(`   ❌ Error inserting ${post.id}:`, error.message);
        }
      }

      console.log(`   ✅ Synced ${posts.length} posts for ${site.name}\n`);

      // Create sample keywords from post titles
      for (let i = 0; i < Math.min(posts.length, 20); i++) {
        const post = posts[i];
        const title = post.title?.rendered || '';

        // Extract first few words as keywords
        const words = title.split(' ').filter(w => w.length > 4).slice(0, 3);

        for (const word of words) {
          const randomRank = Math.floor(Math.random() * 50) + 1; // Random rank 1-50
          const randomTraffic = Math.floor(Math.random() * 500) + 10; // Random traffic 10-510

          const { error } = await supabase.from('keywords').upsert(
            {
              keyword: word.toLowerCase(),
              url: post.link,
              ranking_position: randomRank,
              monthly_traffic: randomTraffic,
              clicks: Math.floor(randomTraffic * 0.1),
              impressions: Math.floor(randomTraffic * 2),
              created_at: new Date().toISOString(),
            },
            { onConflict: 'keyword,url' }
          );

          if (!error) {
            // console.log(`   ✅ Added keyword: "${word}" (rank #${randomRank})`);
          }
        }
      }

      console.log(`   ✅ Created sample keywords\n`);
    } catch (error) {
      console.error(`❌ Error processing ${site.name}:`, error.message);
    }
  }

  console.log('✅ SEO data seeding complete!');
  process.exit(0);
}

seedSEOData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
