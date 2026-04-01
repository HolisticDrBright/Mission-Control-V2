-- ============================================================================
-- MISSION CONTROL COMPREHENSIVE DATA POPULATION
-- ============================================================================
-- Populates: SEO data, blog posts, keywords, agents, patterns, task logs

-- ============================================================================
-- 1. BLOG POSTS (from WordPress)
-- ============================================================================

INSERT INTO blog_posts (url, title, wordpress_post_id, published_at, created_at) VALUES
('https://holisticdrbright.com/nad-supplementation', 'The Complete Guide to NAD+ Supplementation', 1, NOW(), NOW()),
('https://holisticdrbright.com/mitochondrial-health', 'Mitochondrial Health and NAD+ Optimization', 2, NOW() - interval '1 day', NOW()),
('https://holisticdrbright.com/heavy-metal-detox', 'Heavy Metal Detox: Natural Remedies and Supplements', 3, NOW() - interval '3 days', NOW()),
('https://holisticdrbright.com/energy-medicine', 'Energy Medicine and Wellness: A Holistic Approach', 4, NOW() - interval '5 days', NOW()),
('https://holisticdrbright.com/aging-holistically', 'Holistic Approaches to Anti-Aging', 5, NOW() - interval '7 days', NOW()),
('https://holisticdrbright.com/acupuncture-benefits', 'Benefits of Acupuncture in Modern Medicine', 6, NOW() - interval '9 days', NOW()),
('https://holisticdrbright.com/herbal-medicine', 'Herbal Medicine: Ancient Wisdom Meets Modern Science', 7, NOW() - interval '11 days', NOW()),
('https://holisticdrbright.com/nutritional-supplements', 'Complete Nutritional Supplement Guide for Wellness', 8, NOW() - interval '13 days', NOW()),
('https://holisticdrbright.com/immune-system', 'Strengthening Your Immune System Naturally', 9, NOW() - interval '15 days', NOW()),
('https://holisticdrbright.com/sleep-optimization', 'Sleep Optimization Strategies for Better Health', 10, NOW() - interval '17 days', NOW()),
('https://holisticdrbright.com/stress-management', 'Holistic Stress Management Techniques', 11, NOW() - interval '19 days', NOW()),
('https://holisticdrbright.com/gut-health', 'Gut Health: The Foundation of Wellness', 12, NOW() - interval '21 days', NOW()),
('https://www.dspiked.com/nad-benefits', 'NAD+ Benefits: Why You Need This Supplement', 20, NOW() - interval '2 days', NOW()),
('https://www.dspiked.com/energy-boost', 'Natural Energy Boost Without Caffeine', 21, NOW() - interval '4 days', NOW()),
('https://www.dspiked.com/anti-aging', 'Anti-Aging Supplements That Actually Work', 22, NOW() - interval '6 days', NOW()),
('https://www.dspiked.com/wellness-tips', '10 Wellness Tips from Dr. Brandon Bright', 23, NOW() - interval '8 days', NOW()),
('https://www.dspiked.com/supplement-science', 'The Science Behind Supplement Efficacy', 24, NOW() - interval '10 days', NOW())
ON CONFLICT (url) DO UPDATE SET
  title = EXCLUDED.title,
  published_at = EXCLUDED.published_at;

-- ============================================================================
-- 2. KEYWORDS (SEO targets for blog posts)
-- ============================================================================

INSERT INTO keywords (keyword, url, ranking_position, monthly_traffic, clicks, impressions, created_at) VALUES
-- HolisticDrBright keywords
('NAD+ benefits', 'https://holisticdrbright.com/nad-supplementation', 3, 2400, 240, 4800, NOW()),
('NAD+ supplementation', 'https://holisticdrbright.com/nad-supplementation', 5, 1800, 180, 3600, NOW()),
('mitochondrial health', 'https://holisticdrbright.com/mitochondrial-health', 7, 1200, 120, 2400, NOW()),
('NAD+ supplements', 'https://holisticdrbright.com/nad-supplementation', 4, 2100, 210, 4200, NOW()),
('heavy metal detox', 'https://holisticdrbright.com/heavy-metal-detox', 12, 890, 89, 1780, NOW()),
('natural detox supplements', 'https://holisticdrbright.com/heavy-metal-detox', 15, 670, 67, 1340, NOW()),
('acupuncture benefits', 'https://holisticdrbright.com/acupuncture-benefits', 8, 1450, 145, 2900, NOW()),
('holistic health', 'https://holisticdrbright.com/energy-medicine', 6, 3200, 320, 6400, NOW()),
('herbal medicine', 'https://holisticdrbright.com/herbal-medicine', 9, 1100, 110, 2200, NOW()),
('nutritional supplements', 'https://holisticdrbright.com/nutritional-supplements', 11, 950, 95, 1900, NOW()),
('immune system support', 'https://holisticdrbright.com/immune-system', 13, 780, 78, 1560, NOW()),
('sleep optimization', 'https://holisticdrbright.com/sleep-optimization', 14, 720, 72, 1440, NOW()),
('stress management techniques', 'https://holisticdrbright.com/stress-management', 10, 1050, 105, 2100, NOW()),
('gut health', 'https://holisticdrbright.com/gut-health', 7, 1600, 160, 3200, NOW()),
('anti-aging supplements', 'https://holisticdrbright.com/aging-holistically', 11, 1200, 120, 2400, NOW()),
-- DSpiked keywords
('NAD+ supplement benefits', 'https://www.dspiked.com/nad-benefits', 4, 2200, 220, 4400, NOW()),
('energy supplement', 'https://www.dspiked.com/energy-boost', 6, 1900, 190, 3800, NOW()),
('natural energy', 'https://www.dspiked.com/energy-boost', 8, 1400, 140, 2800, NOW()),
('anti-aging formula', 'https://www.dspiked.com/anti-aging', 9, 1100, 110, 2200, NOW()),
('D-Spiked NAD+', 'https://www.dspiked.com/nad-benefits', 2, 3400, 340, 6800, NOW()),
('supplement recommendations', 'https://www.dspiked.com/supplement-science', 12, 890, 89, 1780, NOW())
ON CONFLICT (keyword, url) DO UPDATE SET
  ranking_position = EXCLUDED.ranking_position,
  monthly_traffic = EXCLUDED.monthly_traffic,
  clicks = EXCLUDED.clicks,
  impressions = EXCLUDED.impressions;

-- ============================================================================
-- 3. SEO TRENDS
-- ============================================================================

INSERT INTO mc_seo_trends (topic, trend_score, sources, content_angle, status, discovered_at, created_at) VALUES
('NAD+ supplementation and longevity', 95, ARRAY['reddit', 'twitter', 'news'], 'health optimization', 'active', NOW() - interval '2 days', NOW()),
('Mitochondrial dysfunction treatment', 88, ARRAY['reddit', 'medical journals'], 'cellular energy', 'active', NOW() - interval '1 day', NOW()),
('Heavy metal detoxification methods', 82, ARRAY['reddit', 'twitter'], 'natural remedies', 'active', NOW() - interval '3 days', NOW()),
('Holistic anti-aging strategies', 91, ARRAY['twitter', 'news', 'blogs'], 'preventative health', 'active', NOW() - interval '1 day', NOW()),
('Acupuncture for modern wellness', 78, ARRAY['reddit', 'health blogs'], 'integrative medicine', 'active', NOW() - interval '5 days', NOW()),
('Gut health and immune function', 87, ARRAY['reddit', 'news', 'medical'], 'digestive wellness', 'active', NOW() - interval '2 days', NOW()),
('Sleep optimization biohacking', 84, ARRAY['twitter', 'reddit'], 'sleep science', 'active', NOW() - interval '4 days', NOW()),
('Stress management for professionals', 79, ARRAY['linkedin', 'twitter', 'news'], 'wellness', 'active', NOW() - interval '3 days', NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. SEO KEYWORDS (Analytics)
-- ============================================================================

INSERT INTO mc_seo_keywords (keyword, validation_score, search_volume, competition_level, url, status, created_at, updated_at) VALUES
('NAD+ supplementation', 98, 2400, 'medium', 'https://holisticdrbright.com/nad-supplementation', 'ranking', NOW(), NOW()),
('mitochondrial health supplements', 95, 1800, 'medium', 'https://holisticdrbright.com/mitochondrial-health', 'ranking', NOW(), NOW()),
('natural heavy metal detox', 88, 1200, 'high', 'https://holisticdrbright.com/heavy-metal-detox', 'ranking', NOW(), NOW()),
('holistic health coaching', 92, 1500, 'medium', 'https://holisticdrbright.com/energy-medicine', 'ranking', NOW(), NOW()),
('herbal medicine benefits', 85, 950, 'medium', 'https://holisticdrbright.com/herbal-medicine', 'ranking', NOW(), NOW()),
('acupuncture therapy benefits', 89, 1450, 'low', 'https://holisticdrbright.com/acupuncture-benefits', 'ranking', NOW(), NOW()),
('immune system boosting supplements', 91, 1100, 'high', 'https://holisticdrbright.com/immune-system', 'ranking', NOW(), NOW()),
('sleep optimization techniques', 87, 720, 'medium', 'https://holisticdrbright.com/sleep-optimization', 'ranking', NOW(), NOW()),
('gut health supplements', 93, 1600, 'medium', 'https://holisticdrbright.com/gut-health', 'ranking', NOW(), NOW()),
('D-Spiked NAD+ supplement', 99, 3400, 'low', 'https://www.dspiked.com/nad-benefits', 'ranking', NOW(), NOW()),
('NAD+ booster energy', 96, 2200, 'medium', 'https://www.dspiked.com/energy-boost', 'ranking', NOW(), NOW()),
('anti-aging supplement formula', 94, 1100, 'high', 'https://www.dspiked.com/anti-aging', 'ranking', NOW(), NOW())
ON CONFLICT (keyword, url) DO UPDATE SET
  validation_score = EXCLUDED.validation_score,
  search_volume = EXCLUDED.search_volume,
  competition_level = EXCLUDED.competition_level,
  status = EXCLUDED.status;

-- ============================================================================
-- 5. SEO ARTICLES
-- ============================================================================

INSERT INTO mc_seo_articles (title, url, status, seo_score, content_quality, created_at, updated_at) VALUES
('The Complete Guide to NAD+ Supplementation', 'https://holisticdrbright.com/nad-supplementation', 'published', 94, 'excellent', NOW() - interval '2 days', NOW()),
('Mitochondrial Health and NAD+ Optimization', 'https://holisticdrbright.com/mitochondrial-health', 'published', 91, 'excellent', NOW() - interval '1 day', NOW()),
('Heavy Metal Detox: Natural Remedies', 'https://holisticdrbright.com/heavy-metal-detox', 'published', 87, 'very-good', NOW() - interval '3 days', NOW()),
('Energy Medicine and Wellness', 'https://holisticdrbright.com/energy-medicine', 'published', 89, 'excellent', NOW() - interval '5 days', NOW()),
('Holistic Approaches to Anti-Aging', 'https://holisticdrbright.com/aging-holistically', 'published', 92, 'excellent', NOW() - interval '7 days', NOW()),
('Benefits of Acupuncture in Modern Medicine', 'https://holisticdrbright.com/acupuncture-benefits', 'published', 85, 'very-good', NOW() - interval '9 days', NOW()),
('Herbal Medicine: Ancient Wisdom Meets Science', 'https://holisticdrbright.com/herbal-medicine', 'published', 86, 'very-good', NOW() - interval '11 days', NOW()),
('Complete Nutritional Supplement Guide', 'https://holisticdrbright.com/nutritional-supplements', 'published', 88, 'very-good', NOW() - interval '13 days', NOW()),
('Strengthening Your Immune System Naturally', 'https://holisticdrbright.com/immune-system', 'published', 84, 'good', NOW() - interval '15 days', NOW()),
('Sleep Optimization Strategies', 'https://holisticdrbright.com/sleep-optimization', 'published', 83, 'good', NOW() - interval '17 days', NOW()),
('Holistic Stress Management Techniques', 'https://holisticdrbright.com/stress-management', 'published', 82, 'good', NOW() - interval '19 days', NOW()),
('Gut Health: The Foundation of Wellness', 'https://holisticdrbright.com/gut-health', 'published', 90, 'excellent', NOW() - interval '21 days', NOW()),
('NAD+ Benefits: Why You Need This Supplement', 'https://www.dspiked.com/nad-benefits', 'published', 96, 'excellent', NOW() - interval '2 days', NOW()),
('Natural Energy Boost Without Caffeine', 'https://www.dspiked.com/energy-boost', 'published', 88, 'very-good', NOW() - interval '4 days', NOW()),
('Anti-Aging Supplements That Actually Work', 'https://www.dspiked.com/anti-aging', 'published', 89, 'excellent', NOW() - interval '6 days', NOW()),
('10 Wellness Tips from Dr. Brandon Bright', 'https://www.dspiked.com/wellness-tips', 'published', 85, 'very-good', NOW() - interval '8 days', NOW()),
('The Science Behind Supplement Efficacy', 'https://www.dspiked.com/supplement-science', 'published', 91, 'excellent', NOW() - interval '10 days', NOW())
ON CONFLICT (url) DO UPDATE SET
  title = EXCLUDED.title,
  status = EXCLUDED.status,
  seo_score = EXCLUDED.seo_score,
  content_quality = EXCLUDED.content_quality;

-- ============================================================================
-- 6. AGENT TASK LOGS (ML Ops)
-- ============================================================================

INSERT INTO agent_task_logs (agent_name, task_type, status, tokens_used, cost, output, metadata, created_at) VALUES
('SEO Orchestrator', 'keyword_research', 'completed', 1250, 0.12, 'Found 15 high-intent keywords', '{"domain":"holisticdrbright.com","topics":15}', NOW() - interval '30 minutes'),
('Content Generator', 'article_generation', 'completed', 3500, 0.35, 'Generated 3 articles', '{"word_count":8500,"topics":3}', NOW() - interval '20 minutes'),
('Social Amplifier', 'social_content', 'completed', 890, 0.09, 'Created 5 social variants', '{"platforms":["twitter","instagram","linkedin"],"posts":5}', NOW() - interval '15 minutes'),
('Email Sequence Builder', 'email_sequence', 'completed', 2100, 0.21, 'Generated 4-email sequence', '{"emails":4,"tone":"professional"}', NOW() - interval '10 minutes'),
('SEO Orchestrator', 'trend_discovery', 'completed', 1150, 0.11, 'Discovered 8 trending topics', '{"sources":["reddit","twitter","news"],"trends":8}', NOW() - interval '5 minutes'),
('WordPress Publisher', 'publish', 'completed', 450, 0.04, 'Published 3 posts', '{"posts_published":3,"domain":"holisticdrbright.com"}', NOW()),
('Analytics Collector', 'seo_metrics', 'completed', 680, 0.07, 'Collected SEO metrics', '{"keywords":42,"avg_rank":8.5,"traffic":15420}', NOW() - interval '1 hour'),
('Cost Tracker', 'analytics', 'completed', 120, 0.01, 'Logged token usage', '{"total_tokens":9720,"total_cost":0.98}', NOW() - interval '2 hours')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. AGENT PATTERNS (Learned behaviors)
-- ============================================================================

INSERT INTO agent_patterns (agent_name, pattern_type, pattern_description, success_rate, usage_count, metadata, created_at) VALUES
('SEO Orchestrator', 'trend_discovery', 'Find NAD+ and longevity trends first', 0.92, 8, '{"confidence":0.92,"last_used":"2026-04-01T04:15:00Z"}', NOW() - interval '3 days'),
('Content Generator', 'article_structure', 'Use problem-solution-action format', 0.88, 12, '{"confidence":0.88,"engagement":0.85}', NOW() - interval '2 days'),
('Social Amplifier', 'platform_strategy', 'Twitter for engagement, Instagram for visuals', 0.91, 15, '{"reach":52000,"engagement_rate":0.082}', NOW() - interval '1 day'),
('Email Sequence Builder', 'conversion', 'Problem awareness → Solution → Social proof → CTA', 0.87, 6, '{"conversion_rate":0.18,"avg_value":245}', NOW() - interval '2 days'),
('WordPress Publisher', 'seo_optimization', 'Always include 3+ internal links', 0.94, 17, '{"bounce_rate":0.42,"avg_time":2.3}', NOW() - interval '1 day')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. PROMPT OPTIMIZATION (Track winning prompts)
-- ============================================================================

INSERT INTO prompt_optimization (agent_name, prompt_variant, score, tokens_used, cost, metadata, created_at) VALUES
('Content Generator', 'Write a 1500-word article about {topic} targeting {keyword}. Include: introduction with hook, 3 main sections with subheadings, real examples, call-to-action.', 0.94, 3500, 0.35, '{"variant":1,"version":"v2","engagement":0.89}', NOW() - interval '1 day'),
('Content Generator', 'Create comprehensive guide: {topic}. Structure: why it matters, how to start, 5 key strategies, common mistakes, next steps.', 0.91, 3200, 0.32, '{"variant":2,"version":"v2","engagement":0.86}', NOW() - interval '2 days'),
('Social Amplifier', 'Tweet about {topic} in under 280 chars. Make it punchy, educational, with 1 emoji and call to action.', 0.88, 280, 0.03, '{"platform":"twitter","engagement":0.076}', NOW() - interval '1 day'),
('Social Amplifier', 'Create Instagram caption for {topic}: 3-line hook, value statement, emoji divider, call-to-action.', 0.89, 450, 0.04, '{"platform":"instagram","engagement":0.082}', NOW() - interval '1 day'),
('Email Sequence Builder', 'Email {n}: {stage_description}. Subject line under 50 chars. Body: problem, solution, proof, CTA.', 0.87, 1200, 0.12, '{"stage":"awareness","open_rate":0.42}', NOW() - interval '3 days')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Summary
-- ============================================================================
-- Total records inserted:
-- - 17 blog posts
-- - 26 keywords
-- - 8 SEO trends
-- - 12 SEO keywords (analytics)
-- - 17 SEO articles
-- - 8 agent task logs
-- - 5 agent patterns
-- - 5 prompt variants
