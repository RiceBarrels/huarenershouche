-- ---------- 0. 扩充假用户池:40 个(a1000000-…-0001 ~ 0040) ----------
-- 注册时间散布在 2025-07 ~ 2025-12,均早于 2026 年的帖子
DO $$
DECLARE
  entries text[] := ARRAY[
    '湾区凯文|San Jose, CA','洛杉矶Amy|Los Angeles, CA','圣盖博阿强|San Gabriel, CA','尔湾Cindy|Irvine, CA',
    '库比蒂诺码农|Cupertino, CA','圣何塞Jason|San Jose, CA','西雅图雨神|Seattle, WA','波特兰小鹿|Portland, OR',
    '纽约Vincent|New York, NY','布鲁克林老陈|Brooklyn, NY','皇后区Grace|Queens, NY','新泽西Leo|Edison, NJ',
    '波士顿学姐|Boston, MA','费城大熊|Philadelphia, PA','华府Daniel|Rockville, MD','亚特兰大Momo|Atlanta, GA',
    '奥兰多阿福|Orlando, FL','迈阿密Sunny|Miami, FL','达拉斯德州哥|Plano, TX','休斯顿Nina|Houston, TX',
    '奥斯汀Ethan|Austin, TX','芝加哥风哥|Chicago, IL','密歇根Anna|Ann Arbor, MI','哥伦布小舟|Columbus, OH',
    '凤凰城Jerry|Phoenix, AZ','丹佛高原红|Denver, CO','盐湖城Ivy|Salt Lake City, UT','拉斯维加斯发哥|Las Vegas, NV',
    '圣地亚哥Wendy|San Diego, CA','萨克拉门托Ken|Sacramento, CA','弗里蒙特Tiger|Fremont, CA','帕萨迪纳Lucy|Pasadena, CA',
    '罗兰岗车神|Rowland Heights, CA','天普市阿婷|Temple City, CA','法拉盛Frank|Flushing, NY','长岛Sophia|Long Island, NY',
    '埃尔蒙特小马|El Monte, CA','圣塔克拉拉Ray|Santa Clara, CA','贝尔维尤Mia|Bellevue, WA','塔科马老周|Tacoma, WA'
  ];
  i int;
  uid uuid;
  joined timestamptz;
BEGIN
  FOR i IN 1..array_length(entries, 1) LOOP
    uid := ('a1000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid;
    joined := timestamptz '2025-07-01 08:00:00-07' + (i * interval '4 days') + (i % 7) * interval '3 hours';

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      'seed2.user' || lpad(i::text, 2, '0') || '@clcauto.com',
      crypt('SeedUser123!', gen_salt('bf')), joined,
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('username', split_part(entries[i], '|', 1)),
      joined, joined, '', '', '', ''
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, username, avatar_url, location, account_type, created_at)
    VALUES (
      uid, split_part(entries[i], '|', 1),
      'https://api.dicebear.com/9.x/notionists/svg?seed=seed2u' || i,
      split_part(entries[i], '|', 2), 'private', joined
    )
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      avatar_url = EXCLUDED.avatar_url,
      location = EXCLUDED.location,
      created_at = EXCLUDED.created_at;
  END LOOP;
END $$;
