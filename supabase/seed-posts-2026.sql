-- ============================================================
-- 2026 社区种子数据:500 篇帖子(2026-01-01 ~ 2026-07-17)
-- 40 个新增假用户 + 问答解惑为主的帖子 + 评论 + 程序化点赞
-- 依赖:先跑过 seed-community.sql(旧 8 用户)更佳,但非必须
-- 在 Supabase SQL Editor 整段运行;可重复执行(ON CONFLICT 保护)
-- ============================================================

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

-- Seed part1: community posts 01-84 (January 2026)
-- Question posts 01-16

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000001', 'a0000000-0000-0000-0000-000000000002', 'discussion', '刚来美国的留学生怎么买车险?求指路', E'刚落地LA半年,准备买人生第一辆二手车。问了几家保险,Geico给我的quote一个月要380刀,吓死我了。我在国内开了三年车,但这边好像完全不认?\n有没有前辈说说留学生第一次买保险怎么能便宜点,是不是要找华人经纪?full coverage和liability only怎么选?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保险','留学生','新手'], 'active', '2026-01-02 10:15:00-08', '2026-01-02 10:15:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0001-000000000001', 'a0000000-0000-0000-0000-000000000008', E'新司机第一年都贵,这是正常的,美国保险只看你在美国的驾驶记录。几个省钱点:1) 多拿几家quote,Geico/Progressive/Mercury一家家比,差价能到40%;2) 学生GPA 3.0以上问good student discount;3) 车旧的话可以只买liability加uninsured motorist,省一半;4) deductible调高到1000刀保费能降不少。开满一年无事故再重新quote,会明显降。', '2026-01-02 13:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000002', 'd0000000-0000-0000-0001-000000000001', 'a0000000-0000-0000-0000-000000000001', E'补充一句,可以找华人保险经纪帮你跑多家报价,不额外收你钱,佣金保险公司出。另外别为了便宜买那种不知名小公司,出了事故理赔扯皮更亏。', '2026-01-02 19:22:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000003', 'd0000000-0000-0000-0001-000000000001', 'a0000000-0000-0000-0000-000000000002', E'感谢两位!刚又要了三家quote,Mercury给到260,确实差好多。先买liability+UM,一年后再调。', '2026-01-03 09:05:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000002', 'a1000000-0000-0000-0000-000000000003', 'discussion', '加州私人交易买车,过户流程到底怎么走?', E'这周末要去看一辆私人卖的凯美瑞,价格谈得差不多了。第一次私人交易心里没底:title怎么签?钱付了之后去DMV要带什么?听说还要交税?卖家说smog他不管,这正常吗?求走过流程的朋友讲讲,怕漏了哪步被罚款。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['过户','DMV','私人交易'], 'active', '2026-01-03 14:30:00-08', '2026-01-03 14:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000004', 'd0000000-0000-0000-0001-000000000002', 'a0000000-0000-0000-0000-000000000008', E'加州流程给你捋一遍:\n1) 卖家在title正面签字转让,双方填好里程数(odometer disclosure);\n2) 卖家有责任在5天内向DMV提交Release of Liability(网上就能填),这是保护他的;\n3) 你作为买家要在10天内去DMV或AAA办transfer,带title、ID、保险证明,当场交use tax(按成交价算)和transfer fee;\n4) smog:加州规定超过4个model year的车,私人交易由卖家提供有效smog证明,他说不管是不合规的,你可以拿这点砍价或要求他先去做,别自己背这个雷。', '2026-01-03 17:55:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000005', 'd0000000-0000-0000-0001-000000000002', 'a0000000-0000-0000-0000-000000000007', E'楼上说得全。再提醒一点:smog证明有效期90天,让卖家做完你尽快过户。还有title上如果有lienholder(贷款没还清),一定要看到银行的lien release再给钱。', '2026-01-04 08:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000006', 'd0000000-0000-0000-0001-000000000002', 'a1000000-0000-0000-0000-000000000003', E'太细了,收藏了。已经跟卖家说好他先去做smog,做完再交易。谢谢!', '2026-01-04 21:10:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000003', 'a1000000-0000-0000-0000-000000000013', 'discussion', 'PPI一般去哪做?大概什么价位?', E'看中一辆二手RAV4,车主同意做PPI(pre-purchase inspection)。但我在波士顿人生地不熟,不知道去哪家店做靠谱,dealer做是不是特别贵?一般检查哪些项目,多少钱算合理?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['PPI','验车','二手车'], 'active', '2026-01-05 11:20:00-05', '2026-01-05 11:20:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000007', 'd0000000-0000-0000-0001-000000000003', 'a0000000-0000-0000-0000-000000000007', E'独立修车行做就行,100-200刀是正常价,dealer要贵一些但设备全。合格的PPI至少包括:升降机看底盘(锈蚀、漏油、事故修复痕迹)、OBD电脑扫码看故障码历史、刹车轮胎剩余量、悬挂球头间隙、试车听异响。做完让店里给你书面报告,拿着报告还能跟卖家砍价。', '2026-01-05 15:45:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000008', 'd0000000-0000-0000-0001-000000000003', 'a0000000-0000-0000-0000-000000000008', E'Yelp/Google搜mechanic评分4.5以上的独立店,打电话问做不做PPI就行,大部分都做。重点:如果卖家不同意做PPI,直接pass,好车不怕查。', '2026-01-06 10:30:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000004', 'a1000000-0000-0000-0000-000000000009', 'discussion', '没有信用记录,车贷利率高得离谱怎么办?', E'来纽约工作一年半,信用记录基本空白。dealer给我的车贷APR报到14.9%,3万的车利息都快赶上首付了。有没有什么办法拿到正常点的利率?听说credit union会好一些?还是干脆攒钱全款?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['车贷','信用','新移民'], 'active', '2026-01-04 20:05:00-05', '2026-01-04 20:05:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000009', 'd0000000-0000-0000-0001-000000000004', 'a0000000-0000-0000-0000-000000000008', E'14.9%太狠了。几个思路:1) 先去credit union开户申请pre-approval,对thin file友好很多,常见能给到7-9%;2) 首付提高到40-50%,贷款额小银行风险低,利率能谈;3) 有信用好的亲友可以co-sign;4) 拿着credit union的pre-approval去dealer,让finance部门beat这个利率。千万别只看月供签合同。', '2026-01-05 09:30:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000010', 'd0000000-0000-0000-0001-000000000004', 'a1000000-0000-0000-0000-000000000005', E'我当年也是这样。建议长线操作:先办张secured信用卡正常刷半年,分数出来后再买车,利率能差一倍。如果急用车,买辆一万左右的代步全款,一年后信用起来了再换。', '2026-01-05 22:15:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000005', 'a1000000-0000-0000-0000-000000000005', 'discussion', '机油到底5000迈换还是10000迈换?', E'2021年的凯美瑞,手册写全合成机油10000迈或一年一换。但去jiffy lube人家永远给我贴5000迈的提醒贴纸,华人修车店师傅也说5000换比较好。到底听谁的?多换是不是纯浪费钱?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保养','机油'], 'active', '2026-01-06 09:40:00-08', '2026-01-06 09:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000011', 'd0000000-0000-0000-0001-000000000005', 'a0000000-0000-0000-0000-000000000007', E'快修店贴5000是他们的生意,不用全信。但手册里其实有两套标准:normal和severe schedule。经常短途(单程不到10迈)、频繁堵车、极端气温,都算severe,按严苛标准就是5000迈。你要是每天高速通勤单程30迈,10000迈没问题。自吸的凯美瑞不娇气,取个中间值7500也很稳。比里程更重要的是别拖着不换。', '2026-01-06 12:10:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000012', 'd0000000-0000-0000-0001-000000000005', 'a1000000-0000-0000-0000-000000000033', E'补一句:涡轮增压的车建议偏保守,5000-6000换。自吸按Tony说的来就行。自己在Costco买机油拿去店里换,工时费30-40刀,比套餐划算。', '2026-01-07 08:25:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000006', 'a1000000-0000-0000-0000-000000000007', 'discussion', '西雅图这种偶尔下雪的地方,值得买雪胎吗?', E'去年那场雪把我吓到了,全城打滑,我的前驱轿车在坡上完全上不去。但西雅图一年也就下那么一两次雪,专门买一套雪胎加钢圈感觉又有点浪费,还得找地方存夏胎。大家怎么处理的?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['雪胎','冬季用车','西雅图'], 'active', '2026-01-05 18:50:00-08', '2026-01-05 18:50:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000013', 'd0000000-0000-0000-0001-000000000006', 'a0000000-0000-0000-0000-000000000007', E'西雅图这种气候我一般推荐all-weather胎(注意不是all-season),比如米其林CrossClimate2或者Nokian WRG系列,带三峰雪花认证,冬天雨雪表现接近入门雪胎,又不用换来换去。真正的雪胎适合每年稳定下雪的地方,你这情况一套全天候胎是最优解。', '2026-01-05 21:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000014', 'd0000000-0000-0000-0001-000000000006', 'a1000000-0000-0000-0000-000000000026', E'丹佛这边是必须上雪胎,但西雅图确实没必要两套轮子。同意楼上,CC2用了两个冬天,雪地刹车距离跟朋友的雪胎差距不大,平时也安静。', '2026-01-06 10:05:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000015', 'd0000000-0000-0000-0001-000000000006', 'a1000000-0000-0000-0000-000000000007', E'谢谢!去Costco问了CC2,四条装完900出头,下单了。', '2026-01-07 12:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000007', 'a1000000-0000-0000-0000-000000000032', 'discussion', '收到召回信,去dealer修要花钱吗?', E'我的车收到一封recall通知,说安全气囊充气装置有问题。第一次遇到召回有点慌:去dealer处理是免费的吗?我的车是二手买的,不是从这家dealer买的,人家会给我修吗?需要预约吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['召回','安全'], 'active', '2026-01-07 13:15:00-08', '2026-01-07 13:15:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000016', 'd0000000-0000-0000-0001-000000000007', 'a0000000-0000-0000-0000-000000000007', E'放心,召回维修100%免费,联邦法律规定的,跟你从哪买的车、有没有过保都没关系,任何该品牌的授权dealer都必须给你修。打电话预约时报VIN和recall编号,顺便问配件有没有到货,气囊类召回有时要等件。去nhtsa.gov输VIN还能查你的车有没有其他没做过的召回,一次全做了。', '2026-01-07 16:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000017', 'd0000000-0000-0000-0001-000000000007', 'a0000000-0000-0000-0000-000000000008', E'顺便提醒各位买二手车的:下单前都去NHTSA查一遍open recall,气囊这种安全项没做的,让卖家先去做完再交易。', '2026-01-08 09:10:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000008', 'a1000000-0000-0000-0000-000000000011', 'discussion', 'Carfax上写minor damage,这车还能买吗?', E'看中一辆2020年的CR-V,价格比市场低1500左右。拉了Carfax发现两年前有一条minor damage记录,rear impact,之后一直正常保养。这种车能入吗?怎么判断当年修得好不好?还是说有事故记录的一律不碰?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['Carfax','事故车','二手车'], 'active', '2026-01-08 19:30:00-05', '2026-01-08 19:30:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000018', 'd0000000-0000-0000-0001-000000000008', 'a0000000-0000-0000-0000-000000000008', E'minor rear impact不是死刑,追尾换个后杠很常见,修好了不影响使用,而且你已经拿到1500的折价。要跑的是这几种:structural damage、airbag deployed、salvage/rebuilt title、泡水记录。判断修复质量靠PPI:让技师看后备箱底板有没有褶皱、焊点是否原厂、缝隙是否均匀。另外记住Carfax没记录不等于没出过事故,私了的不上报,所以反过来说,一条诚实的小记录+完整保养史,有时比"零记录"更让人放心。', '2026-01-08 22:05:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000019', 'd0000000-0000-0000-0001-000000000008', 'a1000000-0000-0000-0000-000000000033', E'看service记录的连续性比看事故那一栏更有用。这车每5-8千迈都有保养记录的话,车主大概率靠谱,小追尾也会修得认真。约个PPI吧。', '2026-01-09 11:20:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000009', 'a1000000-0000-0000-0000-000000000006', 'discussion', '第一次去dealer买二手车,怎么谈价不被坑?', E'下周准备去几家dealer看认证二手车。听说dealer套路很多,什么四方格谈判、拖时间战术。有没有实战派分享一下谈价的正确姿势?是先谈车价还是先说要贷款?看中当天就买会不会太急?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['谈价','dealer','二手车'], 'active', '2026-01-09 10:00:00-08', '2026-01-09 10:00:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000020', 'd0000000-0000-0000-0001-000000000009', 'a0000000-0000-0000-0000-000000000008', E'核心三条:1) 只谈out-the-door价格,让他把税、fee全列出来,别被"月供才300"带节奏;2) 谈价主战场在邮件/短信,先让三四家dealer给你同款车的OTD报价,拿着最低价让别家beat,到店只是签字提车;3) 贷款、trade-in、车价分开谈,他问你是否贷款就说"先把车价定下来"。人家全职卖车,你偶尔买一次,别指望现场斗智,用流程赢他。', '2026-01-09 13:35:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000021', 'd0000000-0000-0000-0001-000000000009', 'a0000000-0000-0000-0000-000000000001', E'补充个时机:月底、季度底去,销售冲量的时候好说话。还有,谈崩了就起身走,十次有八次会被叫回来再让一步。', '2026-01-09 20:50:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000010', 'a0000000-0000-0000-0000-000000000003', 'discussion', 'lease快到期,buyout自己的车划算吗?', E'Model 3的lease三月份到期,合同上residual value写的是26800。现在同款同年份的二手价我看了下大概29000-30000。这样看buyout好像是划算的?但听说buyout还要交税和purchase fee,而且要不要通过dealer操作?有经验的朋友说说流程和坑。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['lease','buyout','电车'], 'active', '2026-01-10 12:20:00-08', '2026-01-10 12:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000022', 'd0000000-0000-0000-0001-000000000010', 'a0000000-0000-0000-0000-000000000008', E'算法很简单:residual + purchase option fee(几百刀,合同里写了)+ sales tax,加起来还低于市场价,而且这车你开了三年知根知底,那就是划算的。两个提醒:1) 尽量直接联系金融公司(lessor)办buyout,有些dealer中间插一手会加"processing fee"上千刀,纯智商税;2) 贷款的话提前找credit union拿lease buyout loan的pre-approval,利率跟普通二手车贷差不多。', '2026-01-10 15:45:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000023', 'd0000000-0000-0000-0001-000000000010', 'a1000000-0000-0000-0000-000000000005', E'别忘了把接下来几年的维修风险算进去,出保后修车自费。不过你这个差价有2000-3000,加上免了找车的麻烦,我觉得可以buyout。', '2026-01-11 09:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000024', 'd0000000-0000-0000-0001-000000000010', 'a0000000-0000-0000-0000-000000000003', E'明白了,直接找金融公司,跳过dealer。多谢两位!', '2026-01-11 18:10:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000011', 'a1000000-0000-0000-0000-000000000019', 'discussion', 'dealer狂推extended warranty,值不值?', E'昨天提车,finance office坐了一个半小时,经理反复推销延保,2900刀保5年,说现在的车全是电子件修不起。差点没顶住签了。想问问大家:延保是不是纯坑?还是说某些车真有必要买?已经出门了还能回去买吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['延保','warranty','dealer'], 'active', '2026-01-11 16:45:00-05', '2026-01-11 16:45:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000025', 'd0000000-0000-0000-0001-000000000011', 'a0000000-0000-0000-0000-000000000007', E'修车的说句实话:丰田本田这类车,延保大概率用不上,把2900存着当维修基金更划算。德系或者电子配置特别多的车,出保后单次维修上千很常见,可以考虑。但要买只买厂家自营的(比如Toyota Extended Care、HondaCare),而且选exclusionary条款的(列出不保的,其余都保),第三方延保拒赔套路太多。价格完全可以砍,开价2900的成本可能就1400,网上一些外州dealer卖同款厂家延保能便宜一半。', '2026-01-11 20:30:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000026', 'd0000000-0000-0000-0001-000000000011', 'a0000000-0000-0000-0000-000000000008', E'厂家延保一般在原厂保修期内都能补买,不用当场决定,这就是为什么finance经理要制造紧迫感。回家慢慢比价,别理他。', '2026-01-12 10:15:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000012', 'a1000000-0000-0000-0000-000000000037', 'discussion', 'smog check没过,接下来该怎么办?', E'开了八年的老车今天smog fail了,报告上写monitors not ready还有一个排放超标。registration这个月底就到期,现在有点慌:是随便找个店修吗?修完再检要不要重新交钱?听说州里有补助是真的吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['smog','年检','加州'], 'active', '2026-01-12 15:10:00-08', '2026-01-12 15:10:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000027', 'd0000000-0000-0000-0001-000000000012', 'a0000000-0000-0000-0000-000000000007', E'分两步看。monitors not ready通常是最近断过电瓶或清过码,电脑自检没跑完,按手册的drive cycle正常开一两百迈再去测就行,不算真故障。排放超标就要修了,常见原因是氧传感器老化或催化器效率下降,找STAR认证的test and repair店诊断。加州有Consumer Assistance Program:符合收入条件可以申请修理补助,不想修的话把车卖给州里报废能拿1000-1500刀。修完在同一家店复检,很多店免费retest或只收小额费用,进店前先问清楚。', '2026-01-12 18:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000028', 'd0000000-0000-0000-0001-000000000012', 'a0000000-0000-0000-0000-000000000008', E'补充:registration快到期可以先在DMV网上交钱拿planned non-operation之外的宽限,交了钱就不算晚缴,smog过了牌照贴纸才寄给你。别拖到过期,罚款是阶梯涨的。', '2026-01-13 09:25:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000013', 'a1000000-0000-0000-0000-000000000031', 'discussion', '这周末去太浩湖滑雪,雪链到底要不要买?', E'第一次冬天开车去Tahoe,朋友说80号公路查得严,没雪链直接劝返。我的车是AWD的SUV,轮胎是普通全季胎。这种情况还需要买雪链吗?买什么规格?在哪买便宜?求老司机指点。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['雪链','太浩湖','寒假自驾'], 'active', '2026-01-08 21:00:00-08', '2026-01-08 21:00:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000029', 'd0000000-0000-0000-0001-000000000013', 'a0000000-0000-0000-0000-000000000003', E'常跑Tahoe的来说下:管制分R1/R2/R3三级。R2的时候AWD可以不装链,但前提是四条胎有M+S标或雪胎,且法律要求车上必须携带雪链备用,检查站会看。R3(极少出现)所有车都得装。你全季胎一般带M+S标,查一下胎壁。雪链按轮胎尺寸买(胎壁上如225/65R17),提前在Amazon或湾区的店买好,山脚下现买贵一倍还常断货。出发前看Caltrans QuickMap的实时管制,80号暴雪时会直接关路。', '2026-01-09 08:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000030', 'd0000000-0000-0000-0001-000000000013', 'a1000000-0000-0000-0000-000000000001', E'买了链子最好在家先试装一次,别到了雪地里第一次拆包装,手冻僵了装半小时的是我本人。', '2026-01-09 12:45:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000014', 'a1000000-0000-0000-0000-000000000010', 'discussion', '收到一张两个月前的停车罚单,现在才知道,晚缴会怎样?', E'翻信箱发现一张11月的street cleaning罚单,65刀,因为搬家地址没更新一直没收到,现在上面写着已经涨到130了。这种情况还能申诉吗?不交会不会影响registration或者被boot?在布鲁克林,求懂行的指点。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['罚单','停车','纽约'], 'active', '2026-01-13 18:20:00-05', '2026-01-13 18:20:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000031', 'd0000000-0000-0000-0001-000000000014', 'a0000000-0000-0000-0000-000000000004', E'纽约的罚单在nyc.gov/finance能在线查和dispute。street cleaning这种如果你没有过硬证据(比如标志被挡的照片),申诉成功率不高,但可以试着写明没收到通知申请减免late penalty,有时候能免掉翻倍的部分。别硬拖,欠350刀以上的judgment debt车会被boot或拖走,到时候费用翻好几倍。另外赶紧去DMV把地址改了,免得下次重蹈覆辙。', '2026-01-13 21:40:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000032', 'd0000000-0000-0000-0001-000000000014', 'a0000000-0000-0000-0000-000000000008', E'提醒所有搬过家的朋友:DMV改地址、保险改地址、EZPass改地址,一样都别漏。罚单和toll的催缴信寄丢是最常见的翻车原因。', '2026-01-14 10:05:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000015', 'a1000000-0000-0000-0000-000000000020', 'discussion', '从加州搬到德州,车的title和牌照怎么转?', E'月底relocate到休斯顿,车是全款的,title在手上。听说德州要做什么车辆检查,还要交一笔钱?具体流程是什么,有时间限制吗?加州的牌照要寄回去吗?保险是不是也得换?一堆问题,求搬过的朋友科普。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['跨州搬家','title','德州'], 'active', '2026-01-14 12:30:00-05', '2026-01-14 12:30:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000033', 'd0000000-0000-0000-0001-000000000015', 'a0000000-0000-0000-0000-000000000008', E'德州流程:1) 先买好德州保险(必须是TX保单才能注册);2) 到任意认证的inspection站做车检,几十刀;3) 90天内去county tax office办title转移和注册,填130-U表,带加州title、保险证明、车检报告、ID;4) 作为新居民交90刀的new resident tax(代替sales tax,因为你不是新买车)。加州牌照德州不强制收回,但建议之后在CA DMV网上报一下车已迁出。驾照也要在90天内换成德州的。', '2026-01-14 16:20:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000034', 'd0000000-0000-0000-0001-000000000015', 'a1000000-0000-0000-0000-000000000019', E'去年刚办过,补充实操:county tax office早上去人少,Harris County可以网上预约。车检现在合并进注册流程了,找个Jiffy Lube之类挂着State Inspection牌子的店就能做。全程办下来不到200刀。', '2026-01-15 09:45:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000016', 'a1000000-0000-0000-0000-000000000014', 'discussion', '跨州运车服务靠谱吗?东岸运到西岸大概多少钱?', E'年后要从费城搬去湾区,不想自己开4000多迈,想找运车公司。网上一搜全是broker,报价从800到1800都有,看得眼花。这行水深吗?怎么挑靠谱的?冬天运车要多久?车里能放行李吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['运车','跨州搬家'], 'active', '2026-01-15 20:15:00-05', '2026-01-15 20:15:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000035', 'd0000000-0000-0000-0001-000000000016', 'a0000000-0000-0000-0000-000000000008', E'这行基本都是broker模式,broker接单再派给实际carrier,本身不算坑,但要会挑:1) 报价过低的别信,那是钓鱼价,到时候没司机接单再让你加钱;东西岸open拖车正常价1100-1500,enclosed翻倍;2) 查公司的DOT/MC编号和评价;3) 别付大额定金,正规的是提车时或送达时付大头;4) 提车和收车时绕车拍视频留证,签的condition report要仔细核对;5) 冬天跨国横穿要预留7-10天窗口,别卡着入职时间。行李原则上不让放,但半个后备箱以内一般司机不管,贵重物品千万别放。', '2026-01-16 09:10:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000036', 'd0000000-0000-0000-0001-000000000016', 'a1000000-0000-0000-0000-000000000009', E'去年运过一次,1250刀纽约到LA,8天到。签单前确认carrier的cargo保险额度,万一运输途中刮了是走他们保险。', '2026-01-16 14:30:00-05') ON CONFLICT (id) DO NOTHING;
-- Question posts 17-32

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000017', 'a1000000-0000-0000-0000-000000000038', 'discussion', '买二手电车,电池健康度到底怎么查?', E'想入一辆四年车龄的二手电车,最担心的就是电池。卖家说"充满能跑250迈没问题",但口说无凭。有没有什么办法在买之前实际验证电池衰减程度?第三方有做电池检测的吗?什么程度的衰减算正常?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['电车','电池','二手车'], 'active', '2026-01-16 10:30:00-08', '2026-01-16 10:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000037', 'd0000000-0000-0000-0001-000000000017', 'a0000000-0000-0000-0000-000000000007', E'几个实操办法:1) 当面让车充到100%,看表显续航跟EPA原始续航的比值,这是最直接的粗测;2) 特斯拉可以在服务菜单看,其他品牌用OBD转接头+对应App(比如Leaf Spy、Car Scanner)能读出SoH(State of Health)百分比;3) Recurrent这类第三方出电池报告,几十刀;4) 问清楚使用习惯,常年DC快充+每天充到100%的电池衰减会快。四年车衰减8-12%属于正常,超过15%就要压价或谨慎了。另外确认电池质保:大部分品牌是8年/10万迈,过户后依然有效。', '2026-01-16 13:50:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000038', 'd0000000-0000-0000-0001-000000000017', 'a0000000-0000-0000-0000-000000000003', E'我的Model 3四年掉了8%,日常家充+偶尔超充,基本符合Tony说的曲线。试驾时看能量图表是否平稳也能看出电池组有没有异常单体。', '2026-01-16 19:25:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000039', 'd0000000-0000-0000-0001-000000000017', 'a1000000-0000-0000-0000-000000000038', E'学到了,先让卖家充满实测,再上OBD读SoH。感谢!', '2026-01-17 09:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000018', 'a0000000-0000-0000-0000-000000000001', 'discussion', '家里装Level 2充电桩,大概什么预算?要办许可吗?', E'家里第二辆车准备换电车,independent house,车库里目前只有普通110V插座。问了一个电工说要看电箱容量,可能1500刀还打不住。想问装过的朋友:总共花了多少?permit是必须的吗?电力公司是不是还有返现?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['充电桩','电车'], 'active', '2026-01-06 16:20:00-08', '2026-01-06 16:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000040', 'd0000000-0000-0000-0001-000000000018', 'a0000000-0000-0000-0000-000000000003', E'我家去年装的,给你参考:电箱在车库旁边,拉一条50A线路+NEMA 14-50插座,连permit一共850刀,壁挂充电器自己买的500。如果电箱在房子另一头或者容量不够要升级main panel,那就上不封顶了,2000-4000都有可能。permit建议办,一是保险理赔认这个,二是卖房inspection的时候不留尾巴。装之前查一下你们电力公司和城市的rebate,SCE、PG&E这些都有过几百刀的返现项目,叠加联邦的话能覆盖不少成本。', '2026-01-06 20:45:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000041', 'd0000000-0000-0000-0001-000000000018', 'a1000000-0000-0000-0000-000000000005', E'多找两三个电工上门quote,差价很大。另外如果通勤不长,其实110V每晚也能补3-4迈/小时的电,可以先用着,不急着一步到位。', '2026-01-07 10:15:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000019', 'a1000000-0000-0000-0000-000000000002', 'discussion', '今天被追尾了,第一次遇到,现在该做什么?', E'刚才在101上堵车被后车追尾,后杠瘪了一块,人没事。对方是个小哥,态度还行,互相拍了保险卡和驾照。因为堵车没叫警察就各自走了。现在有点后悔:没有police report会不会影响理赔?接下来是联系我的保险还是他的?修车是不是必须去保险指定的店?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['事故处理','理赔'], 'active', '2026-01-17 17:40:00-08', '2026-01-17 17:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000042', 'd0000000-0000-0000-0001-000000000019', 'a0000000-0000-0000-0000-000000000008', E'追尾责任基本清晰,没report问题不大,但要抓紧做几件事:1) 现在就把现场照片、对方信息、时间地点整理好;2) 直接给对方的保险公司打电话开third-party claim,走他的liability,你不用出deductible;3) 同时知会你自己的保险(只是report,不是claim),万一对方保险扯皮你还能走自己的collision再subrogate;4) 修车店你有权自己选,不是必须去保险的"推荐店",修车期间的租车费用也在对方保险责任内,记得要。对方要是提出私了给现金,车没检查内伤之前别答应。', '2026-01-17 20:10:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000043', 'd0000000-0000-0000-0001-000000000019', 'a0000000-0000-0000-0000-000000000007', E'后杠看着只瘪一块,里面的泡沫溃缩梁和雷达支架可能已经变形,估损时让店里拆开看,别让保险按表面划痕打发你。', '2026-01-18 09:35:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000020', 'a1000000-0000-0000-0000-000000000024', 'discussion', '走了一次保险理赔,保费会涨多少?', E'上个月冰雪路面小剐蹭,走自己的collision修了,自付500 deductible,保险赔了2300。现在开始担心续保:听同事说走一次claim保费要涨三年?涨幅一般多大?早知道这么点钱就自费修了。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保险','理赔','保费'], 'active', '2026-01-18 13:25:00-05', '2026-01-18 13:25:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000044', 'd0000000-0000-0000-0001-000000000020', 'a0000000-0000-0000-0000-000000000008', E'分情况:at-fault事故(你这种单方剐蹭算)续保时普遍涨20-40%,影响持续3-5年看州和公司;not-at-fault很多州不允许涨或影响很小;comprehensive(玻璃、天灾、被砸)一般不涨或象征性涨。你已经claim了就别纠结,记住一个原则供以后参考:预估维修费减去deductible,不超过1000-1500的小伤自费更划算。另外续保时可以问有没有accident forgiveness,有些公司老客户第一次事故不计费。', '2026-01-18 16:50:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000045', 'd0000000-0000-0000-0001-000000000020', 'a1000000-0000-0000-0000-000000000015', E'到renew的时候多拿几家新报价,新公司看到的记录一样,但定价模型不一样,有时候换家比原地续便宜不少。', '2026-01-19 10:20:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000021', 'a1000000-0000-0000-0000-000000000021', 'discussion', '砍价只谈OTD价,具体话术怎么说?', E'论坛里都说买车只谈out-the-door,但实际操作起来销售总把话题绕回月供和APR。有没有人分享下具体怎么说?比如销售问"你预算月供多少",标准回答是什么?邮件里怎么开口要OTD报价不被已读不回?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['谈价','OTD','话术'], 'active', '2026-01-19 11:10:00-05', '2026-01-19 11:10:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000046', 'd0000000-0000-0000-0001-000000000021', 'a0000000-0000-0000-0000-000000000008', E'给你几句直接能用的:\n销售问月供:"付款方式我自己会安排,我们先确定车子的out-the-door总价。"\n邮件模板:"我对贵店stock#XXXX有购买意向,本周内可以成交。请报out-the-door总价,包含所有税费和fee的breakdown。我在对比三家dealer,价格合适今天就可以放deposit。"\n他报了价:"另一家给我的OTD是$XX,你们能到$XX我现在就过来签。"\n关键是让他相信你真的会买、真的在比价,报价才有诚意。已读不回的就换一家,internet sales部门一般比showroom痛快。', '2026-01-19 14:30:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000047', 'd0000000-0000-0000-0001-000000000021', 'a0000000-0000-0000-0000-000000000001', E'补一句:OTD报价单要书面的,到店发现临时加"market adjustment"或杂费,直接掉头走,这招对付坐地起价最管用。', '2026-01-19 21:05:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000048', 'd0000000-0000-0000-0001-000000000021', 'a1000000-0000-0000-0000-000000000021', E'邮件模板已抄走,周末就试。回头汇报战果。', '2026-01-20 09:15:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000022', 'a1000000-0000-0000-0000-000000000012', 'discussion', 'FB Marketplace买车怎么防骗?约在哪见面安全?', E'预算有限想在Facebook Marketplace淘一辆私人车。但上面感觉鱼龙混杂,有的车价格低得离谱,有的卖家一上来就要定金"帮你留车"。想问有经验的:哪些是明显的骗局信号?见面交易约在哪里比较安全?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['私人交易','防骗'], 'active', '2026-01-20 19:50:00-05', '2026-01-20 19:50:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000049', 'd0000000-0000-0000-0001-000000000022', 'a0000000-0000-0000-0000-000000000008', E'红旗信号背下来:1) 价格明显低于市场三成以上;2) 见车之前先要deposit/礼品卡"锁定名额";3) 卖家人在外地,说车会"托运给你";4) title名字跟卖家ID对不上(问就是"帮朋友卖",这可能是curbstoning或者赃车);5) 拒绝PPI。\n安全操作:白天见面,约在警察局的safe exchange zone或银行停车场;看车时核对VIN(挡风玻璃下角、车门框、title三处一致);交易当天两人一起去你的银行办款、当场签title。做到这些能过滤掉99%的坑。', '2026-01-20 22:35:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000050', 'd0000000-0000-0000-0001-000000000022', 'a1000000-0000-0000-0000-000000000010', E'补充一个:通话比打字重要,肯视频看车、肯语音聊细节的卖家基本是真人真车。全程只肯发消息的多半有问题。', '2026-01-21 12:20:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000023', 'a1000000-0000-0000-0000-000000000030', 'discussion', '车窗被砸包被偷,值得走comprehensive吗?', E'周末去旧金山玩,停路边两小时,回来副驾车窗碎了,包被拿走了。查了下换玻璃报价350左右,我的comprehensive deductible是250。这种情况走保险只能赔100,还会留claim记录,是不是不如自费?包里的东西车险管吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['砸窗','保险','旧金山'], 'active', '2026-01-21 10:15:00-08', '2026-01-21 10:15:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000051', 'd0000000-0000-0000-0001-000000000023', 'a0000000-0000-0000-0000-000000000008', E'你已经算明白了:差价100刀不值得留一条claim记录,自费修。找独立玻璃店或者mobile上门的,side window一般250-350,比dealer便宜。车内财物车险是不赔的,那归renters/homeowners insurance管,但同样要过deductible,笔记本手机这种单件贵的才值得考虑。以后车停外面,包和贵重物品别留在能看见的地方,SF砸窗的只看后座有没有包,不管里面装的是电脑还是脏衣服。', '2026-01-21 13:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000052', 'd0000000-0000-0000-0001-000000000023', 'a1000000-0000-0000-0000-000000000006', E'惨,SF老传统了。修玻璃记得让店里把门板里的碎渣吸干净,不然以后升降窗会咯吱响。', '2026-01-21 18:55:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000024', 'a1000000-0000-0000-0000-000000000016', 'discussion', '预算1万5,新手第一辆车买什么靠谱?', E'刚工作攒了点钱,预算1.5万全款,亚特兰大通勤单程20迈。要求就是省心耐用保值,不追求配置。朋友有推卡罗拉的,有推思域的,还有说这个价位可以够一够年份新的现代起亚。新手求个方向,顺便问下这个预算买几年的车合适?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['选车','新手','预算'], 'active', '2026-01-13 12:40:00-05', '2026-01-13 12:40:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000053', 'd0000000-0000-0000-0001-000000000024', 'a0000000-0000-0000-0000-000000000001', E'1.5万现在能买到2019-2021的卡罗拉或2018-2020的思域,里程4-7万迈的,这两个闭眼买都不会错,开五年卖掉还能回一半血。同预算能买到年份更新、配置更高的Elantra/Forte,也是好车,但保值率差一截。通勤为主我会选卡罗拉:保险便宜、油耗35mpg上下、随便一家店都会修。', '2026-01-13 15:20:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000054', 'd0000000-0000-0000-0001-000000000024', 'a0000000-0000-0000-0000-000000000007', E'同意楼上。这个预算避开高里程的欧系车,便宜是便宜,出保后一个小毛病维修费就能劝退新手。日系买里程适中的,买前照例PPI。', '2026-01-14 09:30:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000025', 'a1000000-0000-0000-0000-000000000022', 'discussion', '芝加哥零下十几度,早上车打不着火,咔咔响', E'今早零下15度,拧钥匙只听到咔咔咔的声音,仪表灯闪,发动机完全不转。缓了半小时又试居然着了。这是电瓶不行了吗?车是2017年的,电瓶好像从来没换过。要是彻底趴窝了怎么办,AAA能来吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['电瓶','冬季用车','芝加哥'], 'active', '2026-01-22 08:30:00-05', '2026-01-22 08:30:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000055', 'd0000000-0000-0000-0001-000000000025', 'a0000000-0000-0000-0000-000000000007', E'咔咔响+仪表灯闪是典型的电瓶电压不足。2017年原装电瓶用到现在早超龄了(正常寿命3-5年,严寒地区更短),低温下电瓶容量本来就要打七折,老电瓶直接就带不动启动机。别等彻底趴窝:AutoZone/O''Reilly免费测电瓶和充电系统,确认是电瓶就当场换,选CCA(冷启动电流)达标或更高的型号,芝加哥建议买AGM的。车上备一个锂电应急启动宝,几十刀,比等AAA快得多。', '2026-01-22 10:45:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000056', 'd0000000-0000-0000-0001-000000000025', 'a1000000-0000-0000-0000-000000000023', E'密歇根人+1,应急启动宝救过我三次。另外Costco的电瓶性价比不错,带保修。', '2026-01-22 19:10:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000026', 'a1000000-0000-0000-0000-000000000036', 'discussion', '12万迈的凯美瑞,变速箱油有必要换吗?', E'2016年的凯美瑞,12万迈,变速箱油从来没动过。华人修车店说该换了,dealer却说"sealed for life"不用换。网上还有人说高里程换变速箱油反而会把变速箱换坏?到底什么说法,现在换晚不晚?附张车的照片,车况保养一直不错,想再开个五年。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/TOYOTA_CAMRY_%28XV70%29_China_%285%29.jpg/960px-TOYOTA_CAMRY_%28XV70%29_China_%285%29.jpg'], NULL, NULL, NULL, ARRAY['变速箱','保养','高里程'], 'active', '2026-01-23 14:20:00-05', '2026-01-23 14:20:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000057', 'd0000000-0000-0000-0001-000000000026', 'a0000000-0000-0000-0000-000000000007', E'"终身免维护"的意思是保修期内不用管,不是真的一辈子不用换。你这个情况可以换,但方式很重要:做drain and fill(放掉一部分加新油),用丰田WS原厂油,可以隔几千迈再做一次逐步置换;不要做机器flush,高里程从没换过油的变速箱,大流量冲洗可能把油泥冲进阀体,"换油换坏了"的传说基本都是flush惹的祸。现在换不晚,换完往后每3-6万迈drain and fill一次,这台爱信6AT能陪你到20万迈以上。', '2026-01-23 17:45:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000058', 'd0000000-0000-0000-0001-000000000026', 'a1000000-0000-0000-0000-000000000033', E'同意只做drain and fill。顺便把变速箱油底壳的磁铁检查一下,吸附物过多说明磨损大,心里有个数。', '2026-01-24 10:30:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000027', 'a1000000-0000-0000-0000-000000000029', 'discussion', '账单上一堆dealer fee,哪些能砍哪些砍不了?', E'昨天拿到一份报价单,除了车价还有:doc fee 85、registration一堆、sales tax、nitrogen充氮气199、VIN etching 299、paint protection 795、GPS防盗399。头都大了,这里面哪些是必须交的,哪些是纯智商税?砍不掉是不是只能换一家?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['dealer','费用','买车'], 'active', '2026-01-24 15:35:00-08', '2026-01-24 15:35:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000059', 'd0000000-0000-0000-0001-000000000027', 'a0000000-0000-0000-0000-000000000008', E'分三类:1) 砍不了的:sales tax、DMV registration/title fee,这些是交给政府的,谁家买都一样;doc fee加州法定上限85刀,这个不算坑。2) 全是智商税的:氮气(空气78%就是氮气)、VIN etching(自己买套装15刀)、paint protection(一次打蜡的成本)、GPS防盗,统统要求划掉。3) 已装在车上的add-on他们会说"拆不掉",那就说"装了我也不付钱,或者我看别家",态度硬一点,这些利润项让掉对他们不伤筋骨。报价单让他重出一份,口头承诺无效。', '2026-01-24 18:50:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000060', 'd0000000-0000-0000-0001-000000000027', 'a1000000-0000-0000-0000-000000000021', E'上周刚砍掉一模一样的三件套,一句"these add-ons come off or I walk"解决,别不好意思。', '2026-01-25 11:25:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000028', 'a1000000-0000-0000-0000-000000000034', 'discussion', 'registration过期忘续了,罚款会滚多少?', E'年底太忙,车的registration十二月中就到期了,今天才想起来没续。加州的,现在去续会罚多少钱?这段时间开车上路被查到会怎样?还有我的smog是不是也得先做?一团乱麻求理顺。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['registration','DMV','加州'], 'active', '2026-01-25 09:20:00-08', '2026-01-25 09:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000061', 'd0000000-0000-0000-0001-000000000028', 'a0000000-0000-0000-0000-000000000008', E'加州晚缴罚款是阶梯的:晚1-10天最轻,10天-30天一档,1-2年更重,拖得越久越亏,你现在一个月出头,罚款还不算太狠,这周就处理。流程:如果今年轮到smog(每两年一次),先去做smog,结果电子上传后直接在DMV网站续费,罚款系统自动算,交完立刻生效,贴纸几周内寄到。期间被pull over会吃"expired registration"的ticket(fix-it ticket,续上后可销),被抓到过期超6个月车还可能被拖。总之别再拖了。', '2026-01-25 12:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000062', 'd0000000-0000-0000-0001-000000000028', 'a1000000-0000-0000-0000-000000000030', E'AAA会员的话可以去AAA网点办registration,不用去DMV排队,当场拿贴纸,亲测好用。', '2026-01-25 16:15:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000029', 'a1000000-0000-0000-0000-000000000027', 'discussion', '拿国内驾照能先买车吗?保险怎么办?', E'刚搬来盐湖城,国内驾照+翻译件目前还能开车。想先买辆车代步,再慢慢考本地驾照。问题是:没有美国驾照能完成买车和上保险吗?保险会不会特别贵?等考出本地驾照保费会降吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['驾照','保险','新移民'], 'active', '2026-01-10 11:50:00-08', '2026-01-10 11:50:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000063', 'd0000000-0000-0000-0001-000000000029', 'a0000000-0000-0000-0000-000000000008', E'可以的。买车本身不查驾照,登记和保险才是关键:多数大保险公司接受外国驾照投保,但会按"无美国驾驶记录"定价,贵是肯定的;个别公司(比如一些华人经纪合作的渠道)对国际驾龄友好些,多问几家。犹他州对新居民有换照时限要求,建议尽快考,笔试有中文的。拿到本地驾照后马上通知保险重新报价,加上开满6-12个月的本地记录,保费会明显下来。买车别忘了注册时要保险证明,先拿VIN找保险生效,再去DMV。', '2026-01-10 14:35:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000064', 'd0000000-0000-0000-0001-000000000029', 'a0000000-0000-0000-0000-000000000002', E'我当年就是这么过来的:国内驾照先投保,半年后考出本地照,续保时降了快三成。笔试题库刷两天就能过,别拖。', '2026-01-11 09:50:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000030', 'a1000000-0000-0000-0000-000000000017', 'discussion', '二手Nissan便宜好多,CVT真的那么容易坏吗?', E'预算有限,发现同年份的Sentra/Altima比卡罗拉便宜2000-3000,配置还高。但网上一搜全是说Nissan CVT变速箱不行的。是所有年份都有问题还是特定几年?如果买的话有什么要特别检查的?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['Nissan','CVT','二手车'], 'active', '2026-01-26 13:30:00-05', '2026-01-26 13:30:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000065', 'd0000000-0000-0000-0001-000000000030', 'a0000000-0000-0000-0000-000000000007', E'不是玄学,是有据可查的:2013-2018年前后的Sentra/Altima/Rogue的Jatco CVT故障率确实偏高,日产还为此延长过部分车型的变速箱保修。近几年的有改进但口碑没完全翻身。真要买:1) 冷车试驾,起步和缓加速听有没有嗡嗡异响、感受有没有抖动打滑;2) 查CVT油更换记录,每3万迈换过的加分,从没换过的12万迈以上直接pass;3) 把省下来的2000当作变速箱风险金,CVT大修或换总成要3500-4500。通勤代步、里程不高、有保养记录的可以买,想开十年的还是加钱上两田。', '2026-01-26 16:45:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000066', 'd0000000-0000-0000-0001-000000000030', 'a0000000-0000-0000-0000-000000000008', E'便宜是市场投票的结果,买它就要接受它二手不好出手。学生开两三年毕业就卖的场景反而还行,买入价低亏得也少。', '2026-01-27 09:20:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000031', 'a1000000-0000-0000-0000-000000000028', 'discussion', 'rebuilt title的车便宜三成,能捡这个漏吗?', E'看到一辆年份很新的车,rebuilt title,比同款clean title便宜将近三分之一,卖家说只是当年被冰雹砸了定损全损,修好了"跟新的一样"。这种车水深吗?保险能正常买吗?懂行的给分析下值不值得冒险。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['salvage','rebuilt','事故车'], 'active', '2026-01-27 12:15:00-08', '2026-01-27 12:15:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000067', 'd0000000-0000-0000-0001-000000000031', 'a0000000-0000-0000-0000-000000000008', E'rebuilt能不能买取决于三件事:为什么全损、谁修的、你打算持有多久。冰雹车确实是rebuilt里相对最好的品种(外观损伤为主,机械结构没伤),但"卖家说是冰雹"不算数,要看salvage拍卖时的原始照片(能用VIN在拍卖历史网站查到)和修复清单。另外想清楚代价:1) 保险:liability一般没问题,但不少公司拒保collision/comprehensive或者压价赔付;2) 贷款难,基本要全款;3) 你买时便宜三成,卖时也一样难卖。综合下来:懂车、全款、打算开到报废的人可以考虑冰雹rebuilt,其他人建议观望。', '2026-01-27 15:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000068', 'd0000000-0000-0000-0001-000000000031', 'a0000000-0000-0000-0000-000000000007', E'补一条硬检查:拿去做四轮定位和车架测量,数据正常说明结构没动过;再看气囊灯自检是否正常,有些拼车会拿电阻骗过气囊灯,这种车碰上事故是要命的。', '2026-01-27 19:45:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000069', 'd0000000-0000-0000-0001-000000000031', 'a1000000-0000-0000-0000-000000000028', E'查了拍卖记录,确实是冰雹车,但我贷款买,看来还是算了。谢谢两位省了我一笔学费。', '2026-01-28 10:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000032', 'a1000000-0000-0000-0000-000000000023', 'discussion', '一降温胎压灯就亮,轮胎没破也报警正常吗?', E'密歇根这几天降到零下,早上一启动胎压灯就亮,显示左前31psi其他33psi。下午开一段又灭了。轮胎目测没扎钉子。这是轮胎有问题还是天冷的正常现象?要按门上标的35psi打吗,还是按轮胎上写的44psi?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['胎压','冬季用车'], 'active', '2026-01-07 08:45:00-05', '2026-01-07 08:45:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000070', 'd0000000-0000-0000-0001-000000000032', 'a0000000-0000-0000-0000-000000000007', E'正常物理现象:气温每降10华氏度胎压掉约1psi,一夜降温十几二十度,胎压就低到触发报警了,白天跑热了又回去,所以灯时亮时灭。处理:冷车状态把四条都补到车门框标签上的数值(你的是35),那个44是轮胎的最大承压,不是使用值,千万别按它打。补完气开几迈让TPMS重新读数灯就灭。入冬补一次气是每年的常规操作,顺手看看有没有慢漏气:如果某一条总是比别的掉得快,再去店里查钉子或气门嘴。', '2026-01-07 11:20:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000071', 'd0000000-0000-0000-0001-000000000032', 'a1000000-0000-0000-0000-000000000007', E'车上备个几十刀的小气泵很方便,不用大冬天专门跑加油站抢气枪。', '2026-01-08 09:15:00-05') ON CONFLICT (id) DO NOTHING;
-- Question posts 33-46

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000033', 'a1000000-0000-0000-0000-000000000015', 'discussion', '都说年底买车便宜,现在一月入手是不是亏了?', E'去年12月太忙没顾上,新年计划里第一件事就是换车。但网上都说12月底是全年最佳买车时机,现在一月去是不是接盘侠?还是等到阵亡将士纪念日那种大促?等三四个月又觉得夜长梦多。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['购车时机','新年购车'], 'active', '2026-01-03 10:20:00-05', '2026-01-03 10:20:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000072', 'd0000000-0000-0000-0001-000000000033', 'a0000000-0000-0000-0000-000000000008', E'一月没那么差:节后是传统淡季,客流少,销售任务却照旧,愿意谈的空间不小;不少店还压着假日促销没清完的库存和上一年款,急着出。二手车方面,年初往往有一批lease回收车和trade-in进来,选择变多。原则不变:盯月底、比三家、谈OTD,时机的影响其实小于谈判方法。真等到五月大促,省的那点也可能被这几个月的租车/修旧车成本吃掉。', '2026-01-03 13:45:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000073', 'd0000000-0000-0000-0001-000000000033', 'a0000000-0000-0000-0000-000000000001', E'需要车的时候就是最好的时机,差价没有想象中大。我一月买过两次车,体验反而好,店里冷清,销售有耐心。', '2026-01-03 20:30:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000034', 'a1000000-0000-0000-0000-000000000001', 'discussion', '年终奖到账,是该换车还是继续开老车?', E'年终奖发下来了,手痒想把开了九年的老思域换掉,看中的车落地大概3万5。但老车除了内饰旧点没大毛病,一年修车也就花几百刀。理性和欲望打架中:大家觉得车能开就继续开,还是生活质量也很重要?有没有同样纠结过的分享下?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['换车','年终奖'], 'active', '2026-01-02 20:40:00-08', '2026-01-02 20:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000074', 'd0000000-0000-0000-0001-000000000034', 'a1000000-0000-0000-0000-000000000005', E'纯算账的话:老思域一年维护几百刀,新车头一年折旧就是几千刀,数学上碾压。但车这东西不全是数学,你要是每天通勤两小时,舒适性提升是实打实的。我的标准:修车年支出超过车价值的一半,或者出现安全隐患,才换。否则奖金投指数基金,让老思域再战三年。', '2026-01-03 09:25:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000075', 'd0000000-0000-0000-0001-000000000034', 'a0000000-0000-0000-0000-000000000008', E'反方观点:等老车出大修那天再换,是被动换车,时间仓促容易买亏。趁现在不着急,慢慢挑慢慢谈,主动权在你手里。想清楚要什么就行,没有标准答案。', '2026-01-03 15:10:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000035', 'a1000000-0000-0000-0000-000000000039', 'discussion', '3万出头买二手Model 3还是加钱上新的?', E'坐标贝尔维尤,通勤30迈,看中电车的使用成本。二手2022款Model 3长续航挂3万左右,新款落地要4万6。差这一万多,买旧的怕电池和小毛病,买新的又肉疼。开过的朋友给点意见?二手特斯拉还有什么要注意的?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['Model3','电车','二手车'], 'active', '2026-01-28 12:30:00-08', '2026-01-28 12:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000076', 'd0000000-0000-0000-0001-000000000035', 'a0000000-0000-0000-0000-000000000003', E'2022款是个不错的年份:已经是heat pump和AMD芯片,长续航电池耐用,四年8-10%的衰减很正常,西雅图气候对电池也友好。买前:1) 让卖家出示电池健康度(服务模式能测);2) 确认没有salvage史,特斯拉对事故车锁超充和部分功能要留意;3) FSD不随车走,别为前车主"买过FSD"付溢价;4) 试驾重点听悬挂异响,早期件有些偏弱。差价一万四够你充好几年电,我选二手。', '2026-01-28 15:45:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000077', 'd0000000-0000-0000-0001-000000000035', 'a0000000-0000-0000-0000-000000000007', E'从修车角度补充:电车省的是机油刹车(动能回收刹车片能用很久),但轮胎磨得快、保险普遍比油车贵一截,算总账时别漏了这两项。', '2026-01-28 19:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000078', 'd0000000-0000-0000-0001-000000000035', 'a1000000-0000-0000-0000-000000000039', E'有道理,先去要电池报告和保险quote,谢谢两位!', '2026-01-29 10:05:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000036', 'a1000000-0000-0000-0000-000000000026', 'discussion', '高速被石子崩了挡风玻璃,小裂纹要马上处理吗?', E'今天70号公路上被前车卷起的石子崩了一下,挡风玻璃上留了个指甲盖大的星状裂纹,位置在副驾侧。开着暖气会不会让它裂大?这种是补一下就行还是要换整块玻璃?走保险的话算comprehensive吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['挡风玻璃','保险'], 'active', '2026-01-16 17:50:00-08', '2026-01-16 17:50:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000079', 'd0000000-0000-0000-0001-000000000036', 'a0000000-0000-0000-0000-000000000008', E'要快:温差(暖气+车外零下)和颠簸都会让裂纹扩展,一旦裂过一定长度就只能换整块了。硬币大小的chip现在补,树脂注入修复几十到一百刀,很多保险公司对chip repair直接免deductible(因为帮他们省了换玻璃的钱),打个电话问一句。真裂长了要换的话算comprehensive,过deductible才值得走。另外你这种带摄像头的车换玻璃还要做ADAS校准,又是一两百,所以趁小赶紧补是最优解。', '2026-01-16 20:15:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000080', 'd0000000-0000-0000-0001-000000000036', 'a0000000-0000-0000-0000-000000000007', E'补充:没时间去店里的话,先贴块透明胶带防灰进裂缝,几天内处理都来得及。Amazon的DIY树脂套装对付小chip也够用,就是手要稳。', '2026-01-17 09:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000037', 'a1000000-0000-0000-0000-000000000018', 'discussion', '正时皮带和正时链条怎么区分?我的车要不要换?', E'车开到9万迈了,朋友突然问我正时皮带换过没,说断了发动机就废了,吓我一跳。上网查有的说我这个发动机是链条不用换,有的说皮带6万就得换。怎么确定自己的车是皮带还是链条?换一次大概多少钱?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['正时皮带','保养'], 'active', '2026-01-29 11:35:00-05', '2026-01-29 11:35:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000081', 'd0000000-0000-0000-0001-000000000037', 'a0000000-0000-0000-0000-000000000007', E'查法很简单:车主手册的maintenance schedule里如果出现timing belt更换项(通常6-10万迈),那就是皮带;没有这一项的基本是链条。也可以报车型+发动机代号来问。皮带车到了里程必须换,断了大概率顶气门,大修比换皮带贵十倍;换的时候连水泵、张紧器、惰轮一起换,工都拆开了,一共700-1200。链条设计上是终身的,但前提是按时换机油,机油脏了链条张紧器和导轨会提前磨,冷启动哗啦响就要警惕了。', '2026-01-29 14:50:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000082', 'd0000000-0000-0000-0001-000000000037', 'a1000000-0000-0000-0000-000000000033', E'报一下你的车型年份和发动机排量,大家帮你查。另外买二手皮带车的时候,有没有换过正时是要重点问的,没凭据就当没换过,砍价800。', '2026-01-29 20:25:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000038', 'a1000000-0000-0000-0000-000000000035', 'discussion', 'dealer买的二手车一周就出问题,lemon law管吗?', E'在法拉盛一家车行买的二手车,开了一个星期变速箱就顿挫报警。车行说卖的时候是as-is,概不负责。气死我了。听说纽约有lemon law,二手车适用吗?这种情况我还有什么办法维权?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['lemon law','维权','纽约'], 'active', '2026-01-26 18:40:00-05', '2026-01-26 18:40:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000083', 'd0000000-0000-0000-0001-000000000038', 'a0000000-0000-0000-0000-000000000008', E'好消息:纽约恰好是对二手车买家最友好的州之一。NY Used Car Lemon Law规定,dealer出售价1500刀以上、里程10万以内的二手车,必须提供强制书面保修:里程越低保修期越长(比如36000迈以下保90天/4000迈)。变速箱正属于覆盖的传动系统部件,dealer嘴上说as-is不能推翻州法的强制保修。操作:书面(短信/邮件留痕)要求维修,拒绝就向NY Attorney General消费者保护部门投诉,必要时走仲裁,这个流程消费者胜率不低。把购车合同、报价单都留好。', '2026-01-26 21:15:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000084', 'd0000000-0000-0000-0001-000000000038', 'a1000000-0000-0000-0000-000000000009', E'对,纽约dealer卖二手车没法真正as-is,别被唬住。打AG投诉电话之前先把书面维修请求发过去,车行一般看到你懂行就服软了。', '2026-01-27 10:30:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000039', 'a1000000-0000-0000-0000-000000000004', 'discussion', '被没保险的车撞了,对方赔不起怎么办?', E'上周在尔湾被人闯stop sign撞了车门,交换信息才发现对方根本没保险,人看着也没什么赔偿能力。修车估价4500。我自己的保单里好像有个uninsured motorist,这个能用吗?用了算我的事故记录吗?deductible怎么算?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保险','UM','事故处理'], 'active', '2026-01-21 15:20:00-08', '2026-01-21 15:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000085', 'd0000000-0000-0000-0001-000000000039', 'a0000000-0000-0000-0000-000000000008', E'UM就是为这种情况存在的,直接用:车损走UM property damage(加州UMPD一般有3500赔付上限和250的deductible)或者走你的collision(赔付全额、出collision deductible),让adjuster帮你算哪个划算,4500的损失大概率走collision更好。人没受伤就不涉及UM bodily injury。这属于not-at-fault事故,加州法律不允许保险公司因此给你涨价。报案时把police report或者对方信息提供全,保险公司之后会去向对方追偿,那是他们的事了。', '2026-01-21 18:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000086', 'd0000000-0000-0000-0001-000000000039', 'a1000000-0000-0000-0000-000000000002', E'加州没保险开车的人比想象中多,所以买保单的时候UM/UIM千万别为了省钱去掉,一年就几十刀的事。楼主这次算是体会到了。', '2026-01-22 09:55:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000040', 'a0000000-0000-0000-0000-000000000004', 'discussion', '车被拖走了!impound取车流程和费用求科普', E'早上出门发现车没了,打给警局才知道因为停在了周三扫街的路段被拖了。第一次遇到,现在人有点懵:去哪个拖车场找?要带什么文件?费用大概多少?听说一天不取一天涨钱是真的吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['拖车','impound','纽约'], 'active', '2026-01-28 09:10:00-05', '2026-01-28 09:10:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000087', 'd0000000-0000-0000-0001-000000000040', 'a1000000-0000-0000-0000-000000000035', E'纽约的话打311或上网查车牌,能查到被拖到哪个pound。带齐三样:驾照、registration(在车里的话到场跟工作人员说)、有效保险证明,车不是你名下的还要授权文件。费用是拖车费+每天的storage,真的一天一涨,今天就去。取车时先把车况拍照,有刮伤当场提出。那张扫街罚单是另算的,该交交该诉诉。', '2026-01-28 11:25:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000088', 'd0000000-0000-0000-0001-000000000040', 'a0000000-0000-0000-0000-000000000008', E'血泪教训型知识点:搬到新街区先把整条街的停车牌研究明白,扫街时间设个手机日历循环提醒,比什么都管用。', '2026-01-28 14:50:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000041', 'a1000000-0000-0000-0000-000000000008', 'discussion', '买AWD的车,还是前驱加雪胎?预算差不少', E'在波特兰,一年下几场雪,周边山区偶尔想去玩。同款车AWD版本比前驱贵2000多,油耗还高一点。听说前驱配雪胎比AWD配全季胎还强?真的假的?两个方案怎么选?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['AWD','雪胎','选车'], 'active', '2026-01-11 13:40:00-08', '2026-01-11 13:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000089', 'd0000000-0000-0000-0001-000000000041', 'a0000000-0000-0000-0000-000000000007', E'是真的,而且原理很简单:AWD解决的是"起步和爬坡打不打滑",靠四个轮子分配动力;但刹车和转弯的抓地力100%取决于轮胎,AWD一点忙帮不上。雪地里出事故大多是刹不住和转向失控,不是起步问题。所以优先级:雪胎>驱动形式。前驱+雪胎在压实雪面的综合表现确实优于AWD+全季胎。你的场景(城市偶尔雪+周末上山)前驱+一套全天候胎或雪胎完全够,省下的2000够买两套好胎。要经常爬没铲雪的陡坡再考虑AWD+雪胎双保险。', '2026-01-11 16:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000090', 'd0000000-0000-0000-0001-000000000041', 'a1000000-0000-0000-0000-000000000026', E'认同,唯一提醒:去Mt. Hood这类雪山,管制时前驱车经常被要求上链子而AWD可以豁免,嫌装链子麻烦的人会为这个买AWD,看你去山里的频率。', '2026-01-12 10:10:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000042', 'a1000000-0000-0000-0000-000000000025', 'discussion', '加价5000的market adjustment,只能认吗?', E'凤凰城看一辆热门混动SUV,标价之外贴着一张"market adjustment +$4995"。销售说全城都这样,爱买不买。这种加价有得谈吗?还是说换个州买再运回来都比这划算?大家遇到加价都怎么应对的?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['加价','dealer','谈价'], 'active', '2026-01-24 11:30:00-08', '2026-01-24 11:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000091', 'd0000000-0000-0000-0001-000000000042', 'a0000000-0000-0000-0000-000000000008', E'markup不是法律是心理战,三招:1) 把搜索半径拉到300迈,给周边城市和邻州的dealer群发邮件问"有没有MSRP出的",总有量大的店愿意走量,开几个小时车省四五千很值;2) 考虑factory order,下订单等几个月,很多店订单车不加价;3) 同一辆车,月初嘴硬月底松口很常见,留着销售的联系方式等他回头找你。另外警惕变种加价:强制捆绑的"protection package",本质一样,一并谈掉。', '2026-01-24 14:45:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000092', 'd0000000-0000-0000-0001-000000000042', 'a1000000-0000-0000-0000-000000000019', E'德州这边去年也疯过,后来库存一上来加价全没了。不急用车的话等一个季度,市场比你会砍价。', '2026-01-25 09:35:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000043', 'a0000000-0000-0000-0000-000000000006', 'discussion', '私卖车收款怎么最安全?听说cashier''s check也有假的', E'准备把家里的旧车私人卖掉,挂1万2。以前一直以为收cashier''s check万无一失,结果同事说现在假支票专骗卖车的,存进去几天后银行发现是假的钱会被追回。那到底怎么收钱才稳?现金?Zelle?还是有什么正规渠道?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['卖车','收款','防骗'], 'active', '2026-01-29 16:20:00-08', '2026-01-29 16:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000093', 'd0000000-0000-0000-0001-000000000043', 'a0000000-0000-0000-0000-000000000008', E'你同事说得对,假cashier''s check是私卖车第一大骗局,"存款到账"和"资金确认"是两回事,银行几天后发现是假票就把钱划走,车早没影了。安全做法按优先级:1) 最稳:约买家一起去他的开户行,当着柜员的面让银行开cashier''s check或直接wire/转账给你,确认到账再签title;2) 现金在银行大堂点清(顺便让银行验钞);3) Zelle适合小额,有单日限额,大额分批有风险,也别用来收陌生人定金。任何"多付了请退差价"的剧本直接拉黑,那是经典手法。', '2026-01-29 19:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000094', 'd0000000-0000-0000-0001-000000000043', 'a1000000-0000-0000-0000-000000000038', E'上个月刚私卖了一辆,就是约在买家的Chase分行办的,柜台当场wire,十分钟到账,双方都踏实。推荐这个方法。', '2026-01-30 10:15:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000044', 'a1000000-0000-0000-0000-000000000040', 'discussion', '刹车时吱吱响,是要换刹车片了吗?大概多少钱', E'最近低速刹车时有高频的吱吱声,雨天好像轻一点,踩重了声音反而没了。车开了6万迈,刹车片没换过。这是警报信号还是正常现象?如果要换,外面店里换一次什么价位?dealer是不是贵很多?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['刹车','保养'], 'active', '2026-01-30 12:20:00-08', '2026-01-30 12:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000095', 'd0000000-0000-0000-0001-000000000044', 'a0000000-0000-0000-0000-000000000007', E'持续的金属吱吱声大概率是磨损报警片在工作:刹车片薄到临界值后,那个小铁片故意蹭盘发声提醒你,所以是"该换了"的信号,不是立刻危险,但别拖过一两千迈。要是声音变成低沉的金属研磨声,说明片已磨穿在伤盘,那就要连盘一起换,费用翻倍。独立修车店换一轴(两轮)刹车片150-300,连盘300-500;dealer贵三到五成。6万迈通常先换前轮就行,让店里顺便量一下后轮和盘的厚度。', '2026-01-30 15:35:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000096', 'd0000000-0000-0000-0001-000000000044', 'a1000000-0000-0000-0000-000000000033', E'换的时候选带陶瓷片的中高档牌子,便宜杂牌片粉尘大还容易响,差价也就三四十刀,别省这个。', '2026-01-30 20:10:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000045', 'a0000000-0000-0000-0000-000000000005', 'discussion', '德州私人买车,税是按成交价还是按SPV算?', E'在达拉斯谈好一辆私人车,1万成交,车况一般所以便宜。朋友提醒我说德州过户交税不一定按成交价,有个什么SPV?如果SPV比我的成交价高,岂不是要多交税?有没有办法按实际价格交?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['税','过户','德州'], 'active', '2026-01-18 14:10:00-05', '2026-01-18 14:10:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000097', 'd0000000-0000-0000-0001-000000000045', 'a1000000-0000-0000-0000-000000000019', E'你朋友懂行。德州私人交易的6.25% motor vehicle tax按"成交价和SPV(Standard Presumptive Value,州里给的推定价)80%取高者"计税,就是防低开发票避税的。tax office网站能提前查你这辆车的SPV。如果车况确实差、成交价远低于SPV,可以在过户后规定时间内找有资质的机构做certified appraisal,按评估价交税,评估费几十刀,差得多的话划算。', '2026-01-18 17:30:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000098', 'd0000000-0000-0000-0001-000000000045', 'a0000000-0000-0000-0000-000000000008', E'先去txdmv网站查SPV再决定要不要做appraisal,别听车行门口"帮你少报点"的馊主意,低报被查是要补税加罚的。', '2026-01-19 09:45:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000046', 'a1000000-0000-0000-0000-000000000010', 'discussion', '冬天早上到底要不要原地热车?家里长辈非说要热五分钟', E'跟我爸视频他听说纽约零下,非叮嘱我每天上车前先热车五分钟,说不热车伤发动机。可我记得现在的车好像不用这样?每天在楼下傻等五分钟是真的有必要吗?到底谁对?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['热车','冬季用车'], 'active', '2026-01-04 09:30:00-05', '2026-01-04 09:30:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000099', 'd0000000-0000-0000-0001-000000000046', 'a0000000-0000-0000-0000-000000000007', E'长辈的经验来自化油器时代,那会儿确实要热。现在的电喷车,启动后等个30秒到1分钟,让机油泵到各处就可以走了,关键是头几分钟温柔开:小油门、别超转、别地板油,边开边热比原地怠速热得快得多。长时间原地怠速反而费油、积碳,有些城市还禁止长怠速。零下十几度的极端天可以适当多等一会儿,或者说服你爸的最好理由:遥控启动提前两分钟,上车暖风刚好,两全其美。', '2026-01-04 11:45:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000100', 'd0000000-0000-0000-0001-000000000046', 'a1000000-0000-0000-0000-000000000022', E'芝加哥人实践版:上车、系安全带、连蓝牙、调导航,一套下来正好一分钟,出发。爸妈那辈的五分钟就当是爱的叮嘱收下吧。', '2026-01-04 15:20:00-05') ON CONFLICT (id) DO NOTHING;
-- Guide and long-term review posts 47-63

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000047', 'a0000000-0000-0000-0000-000000000001', 'review', '2018凯美瑞五年10万迈使用报告,该夸夸该骂骂', E'2021年二手入的2018 Camry LE,当时4.2万迈,现在10.1万迈,说点实在的。\n可靠性:五年只有一次计划外维修,水泵渗漏,出保了自费380。其余就是机油、轮胎、刹车片、电瓶这些消耗品,年均养车不到600刀。\n油耗:通勤加高速综合34mpg左右,加regular,油钱省心。\n缺点也有:隔音一般,高速风噪明显;车机老气,CarPlay是后来自己加装的;LE的织物座椅冬天冷夏天闷。\n总结:它不会给你任何惊喜,也从不给你惊吓。家用代步的尽头就是这台车。里程到12万我准备换正时链条张紧器前照例检查一轮,应该还能再战五年。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Toyota_Camry_%28XV70%29_IMG_9081.jpg/960px-Toyota_Camry_%28XV70%29_IMG_9081.jpg'], 'Toyota', 'Camry', 2018, ARRAY['长期测评','凯美瑞'], 'active', '2026-01-05 13:30:00-08', '2026-01-05 13:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000101', 'd0000000-0000-0000-0001-000000000047', 'a1000000-0000-0000-0000-000000000019', E'年均600刀养车真实,我家那台老雅阁也差不多。这两个车系就是给不想操心的人准备的。', '2026-01-06 10:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000048', 'a1000000-0000-0000-0000-000000000034', 'review', '卡罗拉2020开了三年,女生视角的真实感受', E'当年落地2.1万,现在开了3年6.8万迈,聊聊。\n好的地方:加油一箱能跑400多迈;保养除了机油轮胎没花过别的钱;车小好停,天普市那些窄车位无压力;保险一个月90出头。\nTSS主动安全全系标配,自适应巡航跑高速很省心,这个点被低估了。\n不满意:动力确实肉,上匝道要深踩;后排坐三个人挤;音响很一般。\n给同样预算有限的女生的建议:不追求面子的话,这车是踏实过日子的选择,三年了二手价还坚挺,等于白开。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Toyota_Corolla_E210_sedan_variation.jpg/960px-Toyota_Corolla_E210_sedan_variation.jpg'], 'Toyota', 'Corolla', 2020, ARRAY['卡罗拉','长期测评'], 'active', '2026-01-09 15:40:00-08', '2026-01-09 15:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000102', 'd0000000-0000-0000-0001-000000000048', 'a1000000-0000-0000-0000-000000000011', E'"坚挺到等于白开"太真实了,我2019年买的卡罗拉去年卖掉只亏了三千多。', '2026-01-10 11:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000049', 'a1000000-0000-0000-0000-000000000014', 'review', '奶爸视角:CR-V 2019两年使用总结,空间才是正义', E'二娃出生后把轿车换成了二手2019 CR-V EX,两年3.5万迈总结:\n空间:后排装两个安全座椅中间还能坐人,后备箱塞下双人推车+一周Costco采购,这是轿车给不了的;后排地板全平,装娃神器。\n油耗:1.5T市区27高速32,比想象省。\n小毛病:冬天热车时1.5T有机油稀释的老话题,我按5000迈换油,目前机油尺正常;低速时CVT偶尔有点嗡。\n费城冬天:配了雪胎,AWD+雪胎组合雪天很稳。\n带娃家庭闭眼推,同价位真没什么对手,顶多纠结下RAV4,那就看谁家折扣好了。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/HONDA_CR-V_FIFTH_GENERATION_HONG_KONG.jpg/960px-HONDA_CR-V_FIFTH_GENERATION_HONG_KONG.jpg'], 'Honda', 'CR-V', 2019, ARRAY['CR-V','奶爸车','长期测评'], 'active', '2026-01-12 20:30:00-05', '2026-01-12 20:30:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000103', 'd0000000-0000-0000-0001-000000000049', 'a1000000-0000-0000-0000-000000000012', E'新泽西奶爸+1,我家也是CR-V。后排全平地板真的是每天都在感恩的设计。', '2026-01-13 09:50:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000050', 'a1000000-0000-0000-0000-000000000021', 'review', 'Civic 2022两万迈报告:年轻人第一台车的标准答案?', E'毕业买的Civic Sport,两年2万迈,聊聊它配不配"标准答案"这个名号。\n开起来:底盘质感是同级最好的,过弯稳,方向精准,开着有点乐趣,这是跟卡罗拉最大的区别。\n用起来:油耗33mpg上下;车机流畅带无线CarPlay;Honda Sensing全系标配。\n吐槽:Sport版居然是卤素大灯,晚上照明一般;胎噪偏大;后排头部空间对高个不友好。\n养车:两年只花了机油和轮换,无故障。\n结论:预算2万多想要一台好开、耐用、不掉价的车,它依然是答案之一,另一个答案隔壁丰田4S店有卖。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Honda_Civic_Sport_%282023%29_%2853485831582%29.jpg/960px-Honda_Civic_Sport_%282023%29_%2853485831582%29.jpg'], 'Honda', 'Civic', 2022, ARRAY['思域','长期测评'], 'active', '2026-01-15 18:20:00-05', '2026-01-15 18:20:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000051', 'a1000000-0000-0000-0000-000000000016', 'review', 'Elantra 2021三年感受:性价比之选到底香不香', E'当年预算卡死2万,同配置比两田便宜三千拿下Elantra SEL,三年5.5万迈汇报:\n香的部分:配置碾压同价日系,无钥匙进入、加热座椅、盲区监测当年全带;油耗高速能到38mpg;10年10万迈动力总成质保(首任车主)心里踏实。\n一般的部分:CVT平顺但谈不上高级;隔音中规中矩;内饰塑料感强。\n重点说保值:三年折价明显比卡罗拉狠,这是买它必须接受的,等于把差价提前拿到手了。\n结论:打算开满5年以上、看重配置的,香;两三年就想换车的,还是买保值的。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/HYUNDAI_ELANTRA_CN7_China_%282%29.jpg/960px-HYUNDAI_ELANTRA_CN7_China_%282%29.jpg'], 'Hyundai', 'Elantra', 2021, ARRAY['Elantra','性价比','长期测评'], 'active', '2026-01-19 16:30:00-05', '2026-01-19 16:30:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000104', 'd0000000-0000-0000-0001-000000000051', 'a1000000-0000-0000-0000-000000000024', E'总结到位。补充一点:现代的10年质保只有首任车主有,买二手Elantra的朋友注意质保缩水到5年6万迈,买之前算清楚。', '2026-01-20 10:40:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000052', 'a1000000-0000-0000-0000-000000000006', 'review', '雅阁2019 1.5T七万迈了,当年的机油增多还用担心吗?', E'当年买这台车最纠结的就是1.5T机油增多的传闻,现在7万迈了给个交代:\n我的用法是每天单程25迈通勤+定期跑高速,每5000迈换油,七万迈下来机油尺从没超过上限,没有汽油味。短途冷车工况多的朋友确实更容易中招,建议缩短换油周期并定期看机油尺。\n车本身:动力储备比2.0自吸的凯美瑞强,高速超车轻松;10AT没有,1.5T配的CVT调得不错;座椅是同级最舒服的之一。\n消费:除保养外换过一次12V电瓶和一套轮胎。\n结论:雅阁依然是B级家轿的顶级答卷,二手买1.5T的把保养记录看仔细就行。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Honda_Accord_%28tenth_generation%3B_CV%29_%28front%29_in_Mangga_Besar_-_Jakarta_%2826_February_2024%29.jpg/960px-Honda_Accord_%28tenth_generation%3B_CV%29_%28front%29_in_Mangga_Besar_-_Jakarta_%2826_February_2024%29.jpg'], 'Honda', 'Accord', 2019, ARRAY['雅阁','长期测评'], 'active', '2026-01-22 12:40:00-08', '2026-01-22 12:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000053', 'a0000000-0000-0000-0000-000000000003', 'review', 'Model 3四年真实成本账单:电费、保险、维修全公开', E'2021款Model 3长续航,四年6.5万迈,把账本摊开给想买电车的朋友:\n能耗:家充为主,PG&E电车夜间费率,均摊每迈电费约4分钱,同里程油车(30mpg按$4.5/gal算)每迈15分,四年省了大约7000刀。\n保险:比之前的油车贵约40%,一年多花600左右,吃掉一部分省的油钱。\n维修保养:四年总计不到900——两套雨刷、一次空调滤芯、轮胎一套半(电车费胎是真的)、一次下摆臂衬套异响在保内换的。没有机油保养这项支出真的很爽。\n电池:四年衰减8%,日常家充到80%。\n结论:有家充条件+通勤里程长,电车的账是算得过来的;租房没充电桩的朋友要慎重,公共充电的价格会吃掉大半优势。', ARRAY[]::text[], 'Tesla', 'Model 3', 2021, ARRAY['Model3','电车','用车成本'], 'active', '2026-01-14 19:10:00-08', '2026-01-14 19:10:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000105', 'd0000000-0000-0000-0001-000000000053', 'a1000000-0000-0000-0000-000000000039', E'这种摊开账本的帖子太有用了,正好在纠结要不要入二手Model 3。请问轮胎你用的原厂那款吗?一套多少钱?', '2026-01-15 09:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000106', 'd0000000-0000-0000-0001-000000000053', 'a0000000-0000-0000-0000-000000000003', E'回楼上:后来换的米其林PS AS4,Costco装完1200左右,静音耐磨都比原厂那套好,推荐。', '2026-01-15 12:45:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000054', 'a0000000-0000-0000-0000-000000000008', 'discussion', '二手车看车验车清单完整版,照着做能避开九成的坑', E'整理了一份自用多年的看车清单,新手照着走一遍,能过滤掉绝大多数问题车:\n【看车前】拉VIN报告(Carfax/AutoCheck)看事故、title、里程连续性;查NHTSA有无未处理召回;比对市场价,明显低于行情的先问自己为什么。\n【绕车】漆面反光找色差和橘皮(补漆痕迹);四条胎品牌磨损是否一致;缝隙是否均匀;玻璃生产日期是否一致(换过玻璃未必是事故,但要问)。\n【机舱】冷车看机油尺和机油盖(乳化、油泥);冷却液颜色;皮带边缘有无开裂;机舱螺丝有无拧动痕迹。\n【车内】所有电器按一遍;闻霉味(泡水);安全带拉到底看标签日期;地毯下摸潮气。\n【试驾】冷启动听异响;40迈松手看跑偏;急刹看点头和方向稳定;过减速带听悬挂。\n【最后】谈好价、做PPI、核对title跟卖家ID。\n有问题欢迎跟帖,看到会答。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['避坑','验车','攻略'], 'active', '2026-01-06 11:00:00-08', '2026-01-06 11:00:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000107', 'd0000000-0000-0000-0001-000000000054', 'a1000000-0000-0000-0000-000000000013', E'收藏了!请问"四条胎品牌不一致"具体说明什么问题?预算车很多都是杂牌胎混着的。', '2026-01-06 15:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000108', 'd0000000-0000-0000-0001-000000000054', 'a0000000-0000-0000-0000-000000000008', E'回楼上:单换一两条通常意味着爆过胎或单侧撞过马路牙,要顺着那个角查悬挂和轮毂;四条都旧但一致反而正常。混胎本身不致命,是线索,顺着线索多问一句。', '2026-01-06 18:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000055', 'a0000000-0000-0000-0000-000000000007', 'discussion', '修车匠的冬季用车检查清单,花十分钟避免趴窝', E'每年一月都有一波冻趴窝的车进店,其实大多能提前避免。自己能做的检查:\n1) 电瓶:3年以上车龄的,去连锁配件店免费测一下,低温是老电瓶的鬼门关;\n2) 胎压:降温掉压很正常,按门框标签补,顺便看胎纹深度,插根硬币量,不够的雪天就是滑板;\n3) 玻璃水:换成防冻型(-20°F那种),普通的会冻裂水壶;雨刷胶条硬化的换掉;\n4) 冷却液:看副水壶液位和冰点,四五年没换过的测一下;\n5) 车里常备:应急启动宝、冰铲、手套、一条毛毯,跑长途加一瓶水和零食。\n预约保养的顺嘴让师傅看下刹车和皮带,十分钟的事。有其他问题评论区问。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['冬季用车','保养','干货'], 'active', '2026-01-03 09:30:00-08', '2026-01-03 09:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000109', 'd0000000-0000-0000-0001-000000000055', 'a1000000-0000-0000-0000-000000000023', E'密歇根人補充:门缝胶条喷点硅基保护剂,不然冻雨之后车门能冻得拉不开,别问我怎么知道的。', '2026-01-03 14:10:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000056', 'a0000000-0000-0000-0000-000000000008', 'discussion', '加州二手车过户全流程,一篇讲清(附常见翻车点)', E'总有人过户翻车,写个加州完整版:\n【私人交易】1) 卖家在title签字+填odometer;2) 卖家5天内提交Release of Liability(REG 138,网上可办);3) 买家10天内办transfer:带title、保险、ID,交use tax(按成交价)+transfer fee,DMV或AAA都能办;4) smog:4个model year以上的车由卖家提供,90天内有效。\n【常见翻车点】\n- title丢失:让卖家先去DMV补(REG 227),别接受"回头补给你";\n- title上有贷款:必须拿到lien release或者三方去银行办结清,否则车不是他的;\n- 双人共有title写"and"的要两人都签;\n- 买完不transfer:菲了会吃滞纳金,前任的罚单toll也会缠上你;\n- 现金交易不写bill of sale:写一份,一人一份留底。\n流程真不复杂,慢就慢在DMV排队,能网上办的都网上办。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['过户','DMV','攻略'], 'active', '2026-01-10 10:20:00-08', '2026-01-10 10:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000110', 'd0000000-0000-0000-0001-000000000056', 'a1000000-0000-0000-0000-000000000003', E'上周刚按酱姐之前教的流程走完,全程无卡点,AAA办transfer确实比DMV快太多。顶一个让更多人看到。', '2026-01-10 16:35:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000057', 'a0000000-0000-0000-0000-000000000002', 'discussion', '留学生一月新学期买车全流程,学长踩过的坑都在这', E'新学期到了,群里好多学弟学妹问买车,把我三年前的经验整理下:\n1) 证件:有SSN最好,没有也能买车上保险,ITIN或护照+驾照能搞定,别被车行忽悠"没SSN必须走高息贷款";\n2) 预算:学生党1-2万的二手日系是主流,别忘了留出保险(新手一年1500-3000)、注册税费的钱;\n3) 渠道:同学毕业卖车是好机会知根知底,但流程一样别省,该查的查该过户的过户;\n4) 保险:第一年贵是必然,多比几家,满一年记得重新quote;\n5) 千万别:买残title车图便宜、贷款只看月供、跟车行买一堆add-on、买了车不transfer title(交警查到麻烦大)。\n买车不是消费是自由,加州没车寸步难行。祝各位新学期提到心仪的小车。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['留学生','买车攻略','新学期'], 'active', '2026-01-07 21:20:00-08', '2026-01-07 21:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000111', 'd0000000-0000-0000-0001-000000000057', 'a1000000-0000-0000-0000-000000000013', E'补充东部版:波士顿地铁能覆盖学校的其实可以不买车,省下的钱寒暑假租车玩,养车成本(停车位一个月两三百)东部比加州狠多了,大家按城市算账。', '2026-01-08 10:15:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000058', 'a1000000-0000-0000-0000-000000000005', 'discussion', '把六家保险公司的报价做成了表,分享下比价方法论', E'续保季手痒,拿同样的coverage(100/300/100,comp/collision各500 deductible)找六家报价,结论分享:\n1) 最高和最低差了47%,同一个人同一辆车,不比价就是白送钱;\n2) bundle renters insurance后有两家立刻降8-12%,值得问;\n3) 年缴比月缴普遍便宜4-7%;\n4) 上一年退过组合的公司,今年报价反而最激进,拉黑名单没意义,每年重新比就好;\n5) 注意比价时coverage要完全一致,有的低价quote是悄悄把UM去掉了,看到便宜先查条款。\n方法论就一句话:每年续保前花40分钟,拿三家以上报价,平均能省两三百刀,时薪很高的操作。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保险','比价','省钱'], 'active', '2026-01-17 22:30:00-08', '2026-01-17 22:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000059', 'a0000000-0000-0000-0000-000000000008', 'discussion', '我的买车比价邮件模板,直接抄作业(附回复应对)', E'很多人问邮件怎么写,放个自用模板:\n---\n主题:Stock #12345 - OTD报价请求\n您好,我看中贵店库存编号12345的[年份+车型]。本周内可成交,请提供out-the-door总价明细(车价+税+全部费用)。我同时在联系另外几家经销商,收到书面报价后会尽快答复。谢谢。\n---\n应对常见回复:\n"价格要到店谈" → 回:无法提供书面OTD的店不在考虑范围;\n"今天下单才有这个价" → 回:请给出报价有效期,我按有效期内决定;\n"您预算多少" → 回:请先报价,合适我会直接来签;\n拿到三家报价后,拿最低的问其余两家"能否beat",两轮后基本到底价。整个过程不用进店斗智斗勇,社恐友好。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['谈价','模板','攻略'], 'active', '2026-01-20 10:40:00-08', '2026-01-20 10:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000112', 'd0000000-0000-0000-0001-000000000059', 'a1000000-0000-0000-0000-000000000006', E'亲测有效,上个月就是这么买的,三家两轮下来比第一家的开价低了1900。关键真的是"书面OTD",口头报价都是烟雾弹。', '2026-01-21 09:25:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000060', 'a0000000-0000-0000-0000-000000000007', 'discussion', '修车匠盘点:保养项目里哪些是必要的,哪些是智商税', E'干这行十几年,见过太多人被"建议保养清单"收割,一次说清:\n【该做的】机油机滤按手册;刹车油2-3年(吸水会降低刹车性能);冷却液按手册长效型5-10年;变速箱油3-6万迈drain and fill;空气滤芯脏了就换(自己就能换,10分钟)。\n【看情况】火花塞按手册里程,铱金的10万迈;四轮定位在吃胎、跑偏时做,不用定期;刹车片看厚度不看里程。\n【多数情况是智商税】发动机内部清洗剂;燃油系统"深度养护"(直喷积碳除外);氮气充胎;3000迈换一次全合成机油;没漏油就推销的"发动机舱美容"。\n记住一个原则:一切以车主手册为准,手册没有的项目,让对方给出"为什么你的车需要"的具体理由。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保养','智商税','干货'], 'active', '2026-01-25 13:20:00-08', '2026-01-25 13:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000113', 'd0000000-0000-0000-0001-000000000060', 'a1000000-0000-0000-0000-000000000034', E'去年被快修店推销过199的"燃油深度养护",当场没买回来一查果然没必要。这种帖子应该置顶。', '2026-01-25 16:45:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000114', 'd0000000-0000-0000-0001-000000000060', 'a1000000-0000-0000-0000-000000000020', E'请教Tony师傅:直喷发动机的积碳清洗多少迈做一次合适?我的车8万迈了从来没做过。', '2026-01-26 09:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000061', 'a1000000-0000-0000-0000-000000000026', 'discussion', '丹佛人整理:冬季进山滑雪的行车装备清单', E'每周跑I-70进山,被问了无数次装备,统一回复:\n【车上常年放】雪链(试装过的)、折叠雪铲、冰铲刷、应急启动宝、拖车绳、手电、保暖毯、一箱水和能量棒(堵在山口4小时不是段子);\n【轮胎】11月到4月雪胎,或者至少三峰标全天候胎,全季胎进山是给别人添堵;\n【出发前】看CDOT路况和traction law是否生效;玻璃水加满防冻型(下山喷得飞快);油箱过半再进山,堵车时怠速取暖很费油;\n【习惯】跟车距离拉到平时三倍,下坡用低挡位少踩刹车,见到铲雪车别超。\n山里的救援等两小时起步,装备是给自己买的保险。祝大家滑雪季平安。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['滑雪','冬季自驾','清单'], 'active', '2026-01-09 20:15:00-08', '2026-01-09 20:15:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000062', 'a1000000-0000-0000-0000-000000000033', 'review', '十万迈的2017凯美瑞还值不值得买?我拿真车说话', E'最近后台总有人问"十万迈的车还能不能碰",正好收了一台2017 Camry SE,10.4万迈一车主,拿它当教材:\n查记录:Carfax无事故,机油保养记录从4千迈连到9.8万迈,这种车的十万迈和保养缺失的六万迈,我选前者;\n实检:压缩测试四缸均匀;变速箱油微褐无焦味,做了drain and fill;悬挂胶套轻微老化属正常;刹车盘片还有一半;\n结论:2GR之前这代2.5自吸+6AT是丰田最成熟的动力总成之一,十万迈刚过磨合(半开玩笑),按时保养奔20万迈很常见。\n给大家的可复制经验:里程数字不重要,"里程÷保养记录条数"才重要。十万迈30条记录的车,好过六万迈0条记录的车。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/TOYOTA_CAMRY_%28XV70%29_China_%285%29.jpg/960px-TOYOTA_CAMRY_%28XV70%29_China_%285%29.jpg'], 'Toyota', 'Camry', 2017, ARRAY['高里程','凯美瑞','二手车'], 'active', '2026-01-27 14:30:00-08', '2026-01-27 14:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000115', 'd0000000-0000-0000-0001-000000000062', 'a0000000-0000-0000-0000-000000000001', E'"里程除以保养记录条数"这个指标提炼得好,借走了。我那台18年的就是照这个思路买的,五年无大修。', '2026-01-27 19:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000063', 'a1000000-0000-0000-0000-000000000004', 'discussion', '新年flag:三个月内提车!把我的选车功课贴出来求监督', E'2026年第一天,立个flag:三月底前提车。功课如下,欢迎拍砖:\n预算:OTD不超过2.3万,首付一半,月供控制在350内;\n需求:尔湾通勤往返40迈,周末偶尔圣地亚哥,一年一两次雪山;\n候选:二手2022-2023卡罗拉(省心保值)、二手2021-2022 Elantra(配置香)、加点上新款混动(油耗香但超预算);\n计划:一月做功课看车+拿保险quote,二月PPI和谈价,三月月底签(听说月底好谈)。\n有没有过来人给点意见,是等三月底还是看到合适的直接下手?', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/TOYOTA_COROLLA_SEDAN_%28E210%29_China.jpg/960px-TOYOTA_COROLLA_SEDAN_%28E210%29_China.jpg'], NULL, NULL, NULL, ARRAY['新年购车','选车','flag'], 'active', '2026-01-01 15:20:00-08', '2026-01-01 15:20:00-08') ON CONFLICT (id) DO NOTHING;
-- Showoff posts 64-76

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000064', 'a1000000-0000-0000-0000-000000000019', 'showoff', '新年第一提!凯美瑞XSE落地,达拉斯的朋友眼熟吗', E'看了俩月终于提了,2.5自吸完全够用,高速定速巡航安逸得很。销售还想推延保和封釉,全被我笑着拒了(感谢论坛各位的科普)。德州的太阳底下这个漆面真好看,先晒为敬。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Toyota_Camry_%28XV70%29_IMG_9081.jpg/960px-Toyota_Camry_%28XV70%29_IMG_9081.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/TOYOTA_CAMRY_%28XV70%29_China_%2815%29.jpg/960px-TOYOTA_CAMRY_%28XV70%29_China_%2815%29.jpg'], NULL, NULL, NULL, ARRAY['提车','凯美瑞'], 'active', '2026-01-04 16:40:00-05', '2026-01-04 16:40:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000116', 'd0000000-0000-0000-0001-000000000064', 'a0000000-0000-0000-0000-000000000001', E'恭喜恭喜,凯美瑞车主俱乐部又添一员。能空手走出finance office的都是狠人。', '2026-01-04 20:10:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000065', 'a1000000-0000-0000-0000-000000000001', 'showoff', '人生第一辆全新车:Civic Sport提回家了', E'之前一直开二手,工作第三年终于奖励自己一辆新思域。Sport的黑轮毂太戳我了,内饰那条蜂窝饰板比照片好看。用了论坛的邮件比价法,三家dealer比下来省了1700,亲测有效,给后来人一点信心。湾区的路上以后请多关照!', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Honda_Civic_Sport_%282024%29_%2853625033326%29.jpg/960px-Honda_Civic_Sport_%282024%29_%2853625033326%29.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Honda_Civic_Sport_%282024%29_%2853624139102%29.jpg/960px-Honda_Civic_Sport_%282024%29_%2853624139102%29.jpg'], NULL, NULL, NULL, ARRAY['提车','思域','新车'], 'active', '2026-01-10 17:30:00-08', '2026-01-10 17:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000117', 'd0000000-0000-0000-0001-000000000065', 'a1000000-0000-0000-0000-000000000006', E'恭喜!同款车主,这代思域开一年了越开越顺手。黑轮毂记得勤洗,刹车粉挂上去挺明显的。', '2026-01-10 20:45:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000118', 'd0000000-0000-0000-0001-000000000065', 'a0000000-0000-0000-0000-000000000008', E'省1700还顺便当了方法论的活广告,恭喜提车,新车顺利!', '2026-01-11 09:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000066', 'a1000000-0000-0000-0000-000000000009', 'showoff', '换车成功,雅阁到手,顺便告别开了八年的老卡罗拉', E'老卡罗拉16万迈光荣退休(卖给了同小区一个刚工作的小伙,希望它继续争气)。升级雅阁,后排空间和座椅舒适度是肉眼可见的提升,爸妈坐着终于不喊挤了。前后都拍了一张,纪念一下人生第二辆车。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Honda_Accord_%28tenth_generation%3B_CV%29_%28front_view%29_in_16_Ilir_-_Palembang%2C_SS.jpg/960px-Honda_Accord_%28tenth_generation%3B_CV%29_%28front_view%29_in_16_Ilir_-_Palembang%2C_SS.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Honda_Accord_%28tenth_generation%3B_CV%29_%28rear_view%29_in_16_Ilir_-_Palembang%2C_SS_02.jpg/960px-Honda_Accord_%28tenth_generation%3B_CV%29_%28rear_view%29_in_16_Ilir_-_Palembang%2C_SS_02.jpg'], NULL, NULL, NULL, ARRAY['提车','雅阁','换车'], 'active', '2026-01-12 15:20:00-05', '2026-01-12 15:20:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000119', 'd0000000-0000-0000-0001-000000000066', 'a1000000-0000-0000-0000-000000000010', E'16万迈的卡罗拉还能发挥余热,丰田是这样的。雅阁座椅确实是同级天花板,恭喜!', '2026-01-13 10:35:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000067', 'a1000000-0000-0000-0000-000000000013', 'showoff', '博士第五年,终于对油价说不:卡罗拉混动提车', E'实验室通勤来回45分钟,油价看着心疼,咬牙从老雪佛兰换成了卡罗拉混动。表显油耗50+mpg,加满一箱估算能跑500迈,应该能做到一个月只进一次加油站。穷学生晒车,图个开心,勿喷。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Toyota_Corolla_Hybrid_Sedan%2C_GIMS_2019%2C_Le_Grand-Saconnex_%28GIMS1338%29.jpg/960px-Toyota_Corolla_Hybrid_Sedan%2C_GIMS_2019%2C_Le_Grand-Saconnex_%28GIMS1338%29.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/TOYOTA_COROLLA_SEDAN_HYBRID_%28E210%29_China.jpg/960px-TOYOTA_COROLLA_SEDAN_HYBRID_%28E210%29_China.jpg'], NULL, NULL, NULL, ARRAY['提车','混动','留学生'], 'active', '2026-01-17 18:50:00-05', '2026-01-17 18:50:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000120', 'd0000000-0000-0000-0001-000000000067', 'a0000000-0000-0000-0000-000000000002', E'50mpg是真香,恭喜学姐!波士顿冬天短途油耗会略掉一点,属于正常现象别慌。', '2026-01-18 11:20:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000068', 'a1000000-0000-0000-0000-000000000007', 'showoff', '为了雪季换的CR-V AWD,提车当周就派上用场', E'轿车开了五年,受够了每年一下雪就趴窝,换了CR-V AWD。提车第四天西雅图就来了场雪,AWD+新换的全天候胎稳稳当当爬上了我家那个坡,邻居的后驱车还在下面打滑。这钱花得值。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/HONDA_CR-V_FIFTH_GENERATION_HONG_KONG.jpg/960px-HONDA_CR-V_FIFTH_GENERATION_HONG_KONG.jpg'], NULL, NULL, NULL, ARRAY['提车','CR-V','冬季用车'], 'active', '2026-01-14 19:40:00-08', '2026-01-14 19:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000121', 'd0000000-0000-0000-0001-000000000068', 'a1000000-0000-0000-0000-000000000040', E'塔科马邻居前来祝贺,同款雪天焦虑,已加入换AWD的观望名单。那场雪我是推着车上坡的,别问。', '2026-01-15 09:10:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000069', 'a1000000-0000-0000-0000-000000000017', 'showoff', '预算内的快乐:Elantra提车,配置多到用不过来', E'比了一圈,同样的钱日系只能买丐版,Elantra直接给到中配:座椅加热、无钥匙、L2辅助驾驶全都有。奥兰多太阳大,通风座椅真不是伪需求。有人说韩系不保值,但我打算开到开不动为止,不存在的问题。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/f/f5/2020_Hyundai_Avante_%28Elantra%29_CN7.jpg'], NULL, NULL, NULL, ARRAY['提车','Elantra','性价比'], 'active', '2026-01-20 14:20:00-05', '2026-01-20 14:20:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000122', 'd0000000-0000-0000-0001-000000000069', 'a1000000-0000-0000-0000-000000000016', E'开到报废确实就不用管保值了,这个逻辑无懈可击。恭喜提车,亚特兰大Elantra车主握爪。', '2026-01-20 19:35:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000070', 'a1000000-0000-0000-0000-000000000011', 'showoff', '来美第六年,终于有了自己名字的title:二手卡罗拉', E'一直坐地铁+蹭车,上个月搬到皇后区深处终于扛不住了。同事转手的2021卡罗拉,3.8万迈,知根知底,按论坛流程做了PPI和过户,一切顺利。今天贴纸寄到,车是旧的,title上的名字是新的。纪念一下这个小小的里程碑。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/TOYOTA_COROLLA_SEDAN_%28E210%29_China.jpg/960px-TOYOTA_COROLLA_SEDAN_%28E210%29_China.jpg'], NULL, NULL, NULL, ARRAY['提车','第一辆车','卡罗拉'], 'active', '2026-01-23 17:10:00-05', '2026-01-23 17:10:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000123', 'd0000000-0000-0000-0001-000000000070', 'a0000000-0000-0000-0000-000000000004', E'"车是旧的,title上的名字是新的",这句写得好。恭喜Grace,皇后区停车不易,且开且珍惜。', '2026-01-23 20:30:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000124', 'd0000000-0000-0000-0001-000000000070', 'a1000000-0000-0000-0000-000000000036', E'恭喜!同事转手+PPI是二手车的最优路径了,羡慕这种知根知底的车源。', '2026-01-24 09:45:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000071', 'a1000000-0000-0000-0000-000000000029', 'showoff', '圣地亚哥海边提车,白色凯美瑞太适合加州了', E'纠结了黑白灰三个月,最后选了白色,在海边阳光下真的没选错。混动版,市区表显45mpg。提车路上特意绕了段海岸线,新车的第一箱油就这么愉快地浪费了一部分。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/TOYOTA_CAMRY_%28XV70%29_China_%2811%29.jpg/960px-TOYOTA_CAMRY_%28XV70%29_China_%2811%29.jpg'], NULL, NULL, NULL, ARRAY['提车','凯美瑞','加州'], 'active', '2026-01-24 16:50:00-08', '2026-01-24 16:50:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000125', 'd0000000-0000-0000-0001-000000000071', 'a1000000-0000-0000-0000-000000000002', E'白色显新还耐脏(相对),加州正确答案。恭喜!海岸线剪彩仪式是新车的必修课,不算浪费油。', '2026-01-25 10:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000072', 'a1000000-0000-0000-0000-000000000028', 'showoff', '等了七个月,Type R终于落地,没加价!', E'去年年中下的订,上周到港,昨天提车,重点是:MSRP拿下,没加一分钱(感谢那位愿意按订单价走的销售,拉斯维加斯需要这样的清流)。冠军白+红内,发动机盖上那个进气口每次看都开心。先老老实实磨合,磨合期过了找机会去跑一次山。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Honda_Civic_Type_R_%282024%29_%2853625033396%29.jpg/960px-Honda_Civic_Type_R_%282024%29_%2853625033396%29.jpg'], NULL, NULL, NULL, ARRAY['提车','TypeR','性能车'], 'active', '2026-01-26 15:30:00-08', '2026-01-26 15:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000126', 'd0000000-0000-0000-0001-000000000072', 'a1000000-0000-0000-0000-000000000033', E'MSRP提TR是真本事,这车前两年加价一两万的比比皆是。恭喜,记得首保前温柔点,这台K20C1值得。', '2026-01-26 18:45:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000127', 'd0000000-0000-0000-0001-000000000072', 'a1000000-0000-0000-0000-000000000001', E'羡慕的口水从湾区流到内华达。跑山视频记得回来发!', '2026-01-27 09:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000073', 'a1000000-0000-0000-0000-000000000035', 'showoff', '新年第一天提车,雅阁混动,讨个好彩头', E'跨年夜谈好的价,元旦上午提车,销售说我是他们店今年第一单,彩头这不就来了。混动版市区油耗惊喜,法拉盛这种走走停停的路况正是它的主场。新的一年,新车新气象,祝大家都有好车开。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Honda_Accord_%28tenth_generation%3B_CV%29_%28side-rear%29_in_16_Ilir_-_Palembang%2C_SS_03.jpg/960px-Honda_Accord_%28tenth_generation%3B_CV%29_%28side-rear%29_in_16_Ilir_-_Palembang%2C_SS_03.jpg'], NULL, NULL, NULL, ARRAY['提车','雅阁','新年'], 'active', '2026-01-01 13:20:00-05', '2026-01-01 13:20:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000128', 'd0000000-0000-0000-0001-000000000073', 'a0000000-0000-0000-0000-000000000004', E'元旦提车这个彩头到位,恭喜Frank哥!混动在缅街堵车时看着油耗数字,幸福感加倍。', '2026-01-01 18:40:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000074', 'a1000000-0000-0000-0000-000000000037', 'showoff', '一万五收的二手Civic到手,发帖感谢论坛攻略', E'预算有限,按论坛的清单一步步来:VIN报告、冷车看机油、试驾听异响、PPI(检出后刹车片快到线,砍了200)、AAA过户。全程没踩坑,车况跟描述一致。埃尔蒙特的朋友以后路上见,这辆蓝Civic就是我。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Honda_Civic_Sport_%282023%29_%2853485831582%29.jpg/960px-Honda_Civic_Sport_%282023%29_%2853485831582%29.jpg'], NULL, NULL, NULL, ARRAY['提车','二手车','思域'], 'active', '2026-01-28 17:20:00-08', '2026-01-28 17:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000129', 'd0000000-0000-0000-0001-000000000074', 'a0000000-0000-0000-0000-000000000008', E'用PPI结果砍价200,学以致用,这就是发攻略最开心的时刻。恭喜提车!', '2026-01-28 20:50:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000075', 'a1000000-0000-0000-0000-000000000008', 'showoff', '开学前搞定人生大事:二手卡罗拉,波特兰新学期开张', E'赶在新学期开学前把车定了,2021卡罗拉,4.2万迈,学长回国前转的,价格厚道还送了半年的雪胎使用权(他存在tire shop的)。以后去超市不用再拼车了,自由的感觉真好。留学生朋友们新学期加油!', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Toyota_Corolla_E210_sedan_variation.jpg/960px-Toyota_Corolla_E210_sedan_variation.jpg'], NULL, NULL, NULL, ARRAY['提车','留学生','新学期'], 'active', '2026-01-13 19:30:00-08', '2026-01-13 19:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000130', 'd0000000-0000-0000-0001-000000000075', 'a0000000-0000-0000-0000-000000000002', E'学长回国转车是留学生买车的黄金渠道,恭喜!别忘了尽快过户+把保险落到自己名下,别嫌麻烦。', '2026-01-14 10:25:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000076', 'a1000000-0000-0000-0000-000000000003', 'showoff', '难得圣盖博下了场雨,雨后洗车打蜡,焕然一新', E'开了四年的凯美瑞,趁周末天晴自己动手两桶水洗车法+打了层蜡,漆面又能反光了。二手车也要活得体面。附上成果图,不许说它旧,它只是有故事。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/TOYOTA_CAMRY_%28XV70%29_China_%2811%29.jpg/960px-TOYOTA_CAMRY_%28XV70%29_China_%2811%29.jpg'], NULL, NULL, NULL, ARRAY['洗车','晒车'], 'active', '2026-01-30 15:40:00-08', '2026-01-30 15:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000131', 'd0000000-0000-0000-0001-000000000076', 'a1000000-0000-0000-0000-000000000034', E'有故事的车最有味道。两桶水洗车法确实香,就是腰有点废,洗完一次歇三天。', '2026-01-30 19:15:00-08') ON CONFLICT (id) DO NOTHING;

-- Light chatter posts 77-84

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000077', 'a1000000-0000-0000-0000-000000000030', 'discussion', '萨克拉门托油价新年又涨了,大家那边现在多少?', E'家门口的Chevron regular已经4.89了,元旦前还4.6出头。Costco还是坚挺在4.3几,就是排队排到怀疑人生。突然理解为什么身边的人一个个都换混动了。大家所在的城市现在油价多少,来对对账。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['油价','吐槽'], 'active', '2026-01-08 12:30:00-08', '2026-01-08 12:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000132', 'd0000000-0000-0000-0001-000000000077', 'a1000000-0000-0000-0000-000000000019', E'休斯顿路过:2.79。你们加州人看到别哭。', '2026-01-08 16:45:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000078', 'a1000000-0000-0000-0000-000000000022', 'discussion', '芝加哥的冬天洗车是不是白洗?纠结中', E'刚洗完第二天,一场雪加融雪盐,车又成了白花花的盐渍战损涂装。但听说冬天不洗车,融雪盐会腐蚀底盘?到底是勤洗还是开摆,芝加哥的朋友们怎么处理的?我现在的策略是看到洗车行排队就当没这回事。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['洗车','冬季用车','吐槽'], 'active', '2026-01-15 13:20:00-05', '2026-01-15 13:20:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000079', 'a1000000-0000-0000-0000-000000000039', 'discussion', '贝尔维尤今早结冰,405上一路都是开双闪的', E'今早那层黑冰太阴险了,看着是湿路其实是冰。405南向亲眼看见两起追尾,平时20分钟的路开了50分钟。西雅图都市圈的朋友这几天早高峰都悠着点,跟车距离拉大,别急刹。平安到公司的都点个赞。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['路况','冬季用车','西雅图'], 'active', '2026-01-18 09:20:00-08', '2026-01-18 09:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000133', 'd0000000-0000-0000-0001-000000000079', 'a1000000-0000-0000-0000-000000000040', E'塔科马这边也是,I-5匝道口撒了沙才好点。黑冰这东西,四驱雪胎都得服,慢就是快。', '2026-01-18 12:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000080', 'a1000000-0000-0000-0000-000000000032', 'discussion', '超市停车场收获一枚door ding,凶手不知所踪', E'停得好好的,购物回来车门多了个白色小凹坑,对方车都没留张条。气归气,想问下这种指甲盖大的小凹痕,做paintless dent repair大概什么价?还是攒几个一起修划算?顺便呼吁大家开门看看旁边,谢谢了。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['吐槽','停车'], 'active', '2026-01-21 17:30:00-08', '2026-01-21 17:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000134', 'd0000000-0000-0000-0001-000000000080', 'a0000000-0000-0000-0000-000000000007', E'没伤漆的小凹PDR一个75-150,一次修几个能谈打包价,攒着一起修划算。伤了漆的另说。以后停远一点停边角位,多走两步保平安。', '2026-01-21 20:15:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000081', 'a1000000-0000-0000-0000-000000000023', 'discussion', '每天早上刮冰十分钟,密歇根人的冬季晨练', E'冻雨之后车窗那层冰壳,刮得胳膊都酸了,手还冻透。分享几个亲测:1) 前一晚雨刷立起来,挡风盖块布,早上直接掀;2) 温水(不是热水!热水炸玻璃)浇一下侧窗速度快;3) 提前十分钟遥控启动开除霜,回屋喝完一杯咖啡下来正好。就当晨练了,大家的车都还好吗。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['冬季用车','吐槽'], 'active', '2026-01-25 08:40:00-05', '2026-01-25 08:40:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000082', 'a1000000-0000-0000-0000-000000000025', 'discussion', '手册写建议91号油,加89到底行不行?', E'凤凰城这油价,premium比regular一加仑贵一刀多。我的车手册写的是"recommended premium",不是"required"。网上说recommended的加低标号就是动力略降油耗略增,不伤发动机,真的假的?有没有同款纠结的,你们都加什么?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['油号','吐槽'], 'active', '2026-01-29 12:50:00-08', '2026-01-29 12:50:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000083', 'a1000000-0000-0000-0000-000000000018', 'discussion', '迈阿密DMV现场排队三小时,分享下避坑心得', E'今天去办title transfer,早上九点半到,取号后前面还有80多个人,办完出来下午一点。血泪心得:1) 一定提前网上约,哪怕约到两周后也比walk-in强;2) 周二周三人最少,周一和周五午后是重灾区;3) 材料提前检查三遍,排三小时轮到你缺一张纸,当场心态爆炸(说的就是我前面那位)。就这样,腿已废,下次一定预约。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['DMV','吐槽'], 'active', '2026-01-30 16:20:00-05', '2026-01-30 16:20:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0001-000000000135', 'd0000000-0000-0000-0001-000000000083', 'a1000000-0000-0000-0000-000000000016', E'亚特兰大同款经历,现在我都是放号时间蹲点抢预约,跟抢演唱会门票一个打法。', '2026-01-30 19:45:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0001-000000000084', 'a1000000-0000-0000-0000-000000000027', 'discussion', '寒假自驾归来:盐湖城往返峡谷地,1200迈无压力', E'趁假期尾巴跑了趟Moab,盐湖城往返1200迈。冬天的峡谷地几乎没人,雪盖着红岩那个景色值回全部油钱。老伙计全程没掉链子,出发前按论坛冬季清单做了检查,电瓶胎压玻璃水都过了一遍,心里有底跑得踏实。发张途中随手拍,新学期/新一年,开工!', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/TOYOTA_CAMRY_%28XV70%29_China_%2815%29.jpg/960px-TOYOTA_CAMRY_%28XV70%29_China_%2815%29.jpg'], NULL, NULL, NULL, ARRAY['寒假自驾','游记'], 'active', '2026-01-31 18:30:00-08', '2026-01-31 18:30:00-08') ON CONFLICT (id) DO NOTHING;

-- Seed part 2: 84 community posts + comments, February 2026
-- Post IDs d0000000-0000-0000-0002-0000000000NN (01-84)
-- Comment IDs e0000000-0000-0000-0002-000000000NNN

-- P01 discussion 报税refund (留学生Kevin, LA)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000001', 'a0000000-0000-0000-0000-000000000002', 'discussion', '退税下来三千八,拿去付首付合适吗', E'刚收到IRS的退税,3800刀。本来打算存着,但我现在这台老车修车越来越频繁,想趁二月淡季换台两万左右的二手凯美瑞。\n问题是:退税全部拿去当首付,再贷一万六千多,月供压力会不会太大?我税后一个月到手4200左右,还有房租1600。还是说继续攒半年再买更稳?大家退税一般怎么用的?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['报税季','车贷','预算'], 'active', '2026-02-01 10:05:00-08', '2026-02-01 10:05:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000001', 'd0000000-0000-0000-0002-000000000001', 'a0000000-0000-0000-0000-000000000008', E'退税当首付很常见,但别全砸进去。建议:留1000-1500应急金,剩下的加上你原有存款凑到车价20%以上,这样贷款不容易负资产。月供加保险控制在税后收入15%以内,你这个收入两万的车没问题。另外二月确实是淡季,总统日前后dealer冲量,可以谈。', '2026-02-01 13:40:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000002', 'd0000000-0000-0000-0002-000000000001', 'a0000000-0000-0000-0000-000000000001', E'我第一台车就是退税加存款付的首付。一个建议:先去credit union拿个pre-approval,知道自己利率多少再去谈车价,不然finance office随便给你报个高的你都不知道。老车如果一年修车超过2000刀,换车是对的。', '2026-02-01 16:20:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000003', 'd0000000-0000-0000-0002-000000000001', 'a0000000-0000-0000-0000-000000000002', E'谢谢两位!那我先去credit union问pre-approval,留点应急金,看来这个月可以开始看车了。', '2026-02-02 09:10:00-08')
ON CONFLICT (id) DO NOTHING;

-- P02 showoff CR-V混动 (尔湾Cindy)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000002', 'a1000000-0000-0000-0000-000000000004', 'showoff', '提车!二手CR-V混动,落地两万二', E'看了一个多月终于定了,2022款CR-V混动,3万2千迈,一手车主,记录全。谈下来两万零五,加税加DMV落地两万二不到。\n尔湾到公司来回40迈,之前的老车一箱油一周,这台开了三天表显油耗40mpg+,后排放婴儿车绰绰有余。给同样在看混动SUV的姐妹们一点信心!', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/HONDA_CR-V_PHEV_FIFTH_GENERATION_China.jpg/960px-HONDA_CR-V_PHEV_FIFTH_GENERATION_China.jpg'], NULL, NULL, NULL, ARRAY['提车','混动','CR-V'], 'active', '2026-02-01 16:40:00-08', '2026-02-01 16:40:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000004', 'd0000000-0000-0000-0002-000000000002', 'a0000000-0000-0000-0000-000000000001', E'恭喜!这个里程这个价在橙县算很不错了,混动CR-V市场上抢手,记录全的更少。40mpg通勤真香。', '2026-02-01 19:30:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000005', 'd0000000-0000-0000-0002-000000000002', 'a1000000-0000-0000-0000-000000000003', E'恭喜提车!请问是在哪家看的?我也在圣盖博这边找混动CR-V,好车源太难蹲了。', '2026-02-02 11:15:00-08')
ON CONFLICT (id) DO NOTHING;

-- P03 discussion 无信用记录车贷 (波士顿学姐)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000003', 'a1000000-0000-0000-0000-000000000013', 'discussion', 'F1学生没有信用记录,车贷是不是没戏', E'来美国刚半年,有SSN但信用记录基本空白,只有一张secured card用了三个月。看中一台一万五的二手车,dealer说可以给我做贷款但利率要11.9%,吓退了。\n想问问:留学生没有信用历史,有没有更好的贷款渠道?还是说只能加大首付硬着头皮接受高利率?或者干脆全款买台便宜点的?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['留学生','车贷','信用记录'], 'active', '2026-02-02 09:30:00-05', '2026-02-02 09:30:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000006', 'd0000000-0000-0000-0002-000000000003', 'a0000000-0000-0000-0000-000000000008', E'几个思路:1) 先试本地credit union,有些对thin file比大银行友好,拿学校证明和收入证明去聊;2) 首付放到40-50%,利率能压下来不少,贷款额小风险也小;3) 实在不行先全款买台八九千的过渡,把secured card养一年,分数上来再换车refinance路子就宽了。11.9%不是不能接受,但半年后一定要refinance。', '2026-02-02 12:50:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000007', 'd0000000-0000-0000-0002-000000000003', 'a1000000-0000-0000-0000-000000000009', E'我前年跟你情况一模一样。当时首付50%,利率9.4%咬牙签了,养了八个月信用分到700,refinance到5.9%。总利息其实没多花太多,车早买早用。关键是每月按时还,别断。', '2026-02-02 18:25:00-05')
ON CONFLICT (id) DO NOTHING;

-- P04 guide 总统日攻略 (避坑酱)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000004', 'a0000000-0000-0000-0000-000000000008', 'review', '总统日车市促销怎么薅:二月买车时间表', E'每年二月的总统日(今年2月16日)是上半年少有的买车窗口,写个时间表给准备出手的朋友。\n\n为什么二月能谈:1) 传统淡季,店里客流少,销售有指标压力;2) 总统日是厂商投广告的促销节点,新车有额外rebate,二手车部门也跟着冲量;3) 报税季退税陆续到账,dealer知道你有首付,但也更愿意成交。\n\n时间表:2月初开始锁定3-5台目标车,发邮件要OTD报价;总统日前的周四周五跟进砍价,把几家报价互相压;真正下手放在总统日周末到月底最后两天,月底销售为了凑数最松口。\n\n注意:促销周末店里人多,气氛容易让人冲动。价格其实提前一周就能谈好,周末只是去签字提车。别被"仅限今天"的话术带节奏,二月每一天都是buyer market。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['总统日','砍价攻略'], 'active', '2026-02-02 19:00:00-08', '2026-02-02 19:00:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000008', 'd0000000-0000-0000-0002-000000000004', 'a0000000-0000-0000-0000-000000000005', E'月底最后两天这条亲测有效,我去年就是1月31号下午去的,销售直接把之前咬死的价又让了600。', '2026-02-03 10:20:00-05')
ON CONFLICT (id) DO NOTHING;

-- P05 discussion co-sign风险 (埃尔蒙特小马)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000005', 'a1000000-0000-0000-0000-000000000037', 'discussion', '朋友让我给他车贷做co-sign,该答应吗', E'认识两年的朋友,信用分不够,dealer说找个co-signer利率能从14%降到8%。他让我帮忙,说就是签个字,车贷他自己还。\n我心里有点打鼓:co-sign到底意味着什么?如果他哪个月没还上,是不是找我要?会不会影响我自己以后买房贷款?不答应又怕伤感情,大家帮我分析下。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['co-sign','车贷'], 'active', '2026-02-03 12:20:00-08', '2026-02-03 12:20:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000009', 'd0000000-0000-0000-0002-000000000005', 'a0000000-0000-0000-0000-000000000008', E'讲清楚后果你再决定:co-sign不是担保人那么简单,你是共同借款人,他断供银行直接找你全额追讨,逾期记录同步上你的信用报告。这笔贷款还会算进你的DTI,你以后申房贷额度会被占掉一块。原则:你愿意直接借给他这笔钱并做好要不回来的心理准备,才签;否则宁可帮他出主意加大首付。', '2026-02-03 15:45:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000010', 'd0000000-0000-0000-0002-000000000005', 'a1000000-0000-0000-0000-000000000010', E'血泪教训:我表哥给同事co-sign,人家断供半年才发现,信用分掉了90多分,催收电话全打到他这。感情归感情,钱的事签字前想清楚最坏情况。', '2026-02-04 09:30:00-08')
ON CONFLICT (id) DO NOTHING;

-- P06 review CR-V 2018 (湾区凯文)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000006', 'a1000000-0000-0000-0000-000000000001', 'review', '2018 CR-V开了两年五万迈,说点实话', E'两年前两万迈接手的2018 CR-V EX,现在七万迈,总结给考虑这代CR-V的朋友。\n\n满意的:空间无敌,后备箱放两个28寸箱子再塞背包没压力;1.5T市区高速油耗28-30mpg;保养便宜,两年只花了机油轮胎和一次刹车片。\n\n不满意的:1.5T的机油增多问题这代确实存在,冷车短途多的话要留意机油尺,我每5000迈换油没出过事但心里始终有根弦;隔音一般,高速风噪明显;CVT起步肉,超车要深踩。\n\n结论:家用代步几乎挑不出大毛病,买的时候查一下有没有做过机油稀释相关的召回campaign,短途通勤为主的建议直接看混动版。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/HONDA_CR-V_FIFTH_GENERATION_HONG_KONG_%282%29.jpg/960px-HONDA_CR-V_FIFTH_GENERATION_HONG_KONG_%282%29.jpg'], 'Honda', 'CR-V', 2018, ARRAY['CR-V','用车报告'], 'active', '2026-02-03 20:15:00-08', '2026-02-03 20:15:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000011', 'd0000000-0000-0000-0002-000000000006', 'a1000000-0000-0000-0000-000000000006', E'机油增多那段很中肯。我同事的2017款就中招过,4S做了软件更新后好多了。买这代CR-V查召回记录确实是必修课。', '2026-02-04 12:30:00-08')
ON CONFLICT (id) DO NOTHING;

-- P07 discussion 保险shop报价 (皇后区Grace)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000007', 'a1000000-0000-0000-0000-000000000011', 'discussion', '第一次买车险,报价从180到340差好远', E'刚买了人生第一台车,开始shop保险,同样的车同样的coverage,Geico报180一个月,Progressive报225,一家本地agent报340,差距大到怀疑自己填错了。\n新手司机在纽约,26岁,驾照两年无出险。想问:1) 报价差这么多正常吗?2) 除了价格还要看什么?3) 半年付和月付差多少?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保险','新手'], 'active', '2026-02-04 08:50:00-05', '2026-02-04 08:50:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000012', 'd0000000-0000-0000-0002-000000000007', 'a1000000-0000-0000-0000-000000000012', E'正常,每家的定价模型不一样,纽约新手差一倍都见过。要点:1) 确认每家报价的liability限额和deductible完全一致再比;2) 半年一次付清一般比月付便宜5-8%,月付很多还收手续费;3) deductible从500提到1000能降不少保费,前提是你出得起这1000。', '2026-02-04 11:40:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000013', 'd0000000-0000-0000-0002-000000000007', 'a0000000-0000-0000-0000-000000000004', E'法拉盛这边很多人用华人broker,好处是能一次帮你比好几家,理赔时有人帮你打电话。另外你要是租房,把renters insurance跟车险bundle,两边都能打折,我当时一年省了200多。', '2026-02-04 15:20:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000014', 'd0000000-0000-0000-0002-000000000007', 'a1000000-0000-0000-0000-000000000011', E'谢谢!原来还有bundle这个操作,我这就去把renters加上再要一轮报价。', '2026-02-05 09:05:00-05')
ON CONFLICT (id) DO NOTHING;

-- P08 chatter 油价 (奥兰多阿福)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000008', 'a1000000-0000-0000-0000-000000000017', 'discussion', '过完年油价又抬头了,你们那边多少', E'年前还2块8,这两天奥兰多这边普遍3块1了,Costco都排起了长队。据说是炼油厂春季检修要开始了。\n随手问问各地车友,你们那边现在普通汽油多少钱一加仑?加州的朋友先别哭。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['油价','闲聊'], 'active', '2026-02-04 21:10:00-05', '2026-02-04 21:10:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000015', 'd0000000-0000-0000-0002-000000000008', 'a1000000-0000-0000-0000-000000000018', E'迈阿密3块2起步,靠近海滩的加油站敢标3块6。还好我通勤近,一箱油能撑两周。', '2026-02-05 08:40:00-05')
ON CONFLICT (id) DO NOTHING;

-- P09 discussion 出险后保费 (圣地亚哥Wendy)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000009', 'a1000000-0000-0000-0000-000000000029', 'discussion', '上个月追尾了别人,续保会涨多少', E'一月底雨天没刹住轻微追尾前车,我全责,走保险赔了对方4000多。这是我五年来第一次出险。\n现在快到续保了,心里没底:全责事故保费一般涨多少?会涨几年?要不要趁续保换一家公司,还是新公司看到出险记录会更狠?有没有出过险的朋友分享下实际涨幅。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保险','出险'], 'active', '2026-02-05 09:40:00-08', '2026-02-05 09:40:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000016', 'd0000000-0000-0000-0002-000000000009', 'a0000000-0000-0000-0000-000000000008', E'全责事故普遍涨30-50%,影响3-5年,逐年递减。几个动作:1) 查你的保单有没有accident forgiveness,有的话第一次全责不涨;2) 出险记录是跟人走的(CLUE报告),换公司也看得到,但每家对事故的定价权重不同,所以照样值得shop一圈;3) 别为了省保费降liability限额,该省的地方是deductible和车损险。', '2026-02-05 13:20:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000017', 'd0000000-0000-0000-0002-000000000009', 'a0000000-0000-0000-0000-000000000001', E'我2022年全责出过一次,State Farm从月付128涨到175,第三年降回140左右。当时shop了一圈发现别家报得更高,就没换。你可以都问问,但心理预期涨三成吧。', '2026-02-06 10:10:00-08')
ON CONFLICT (id) DO NOTHING;

-- P10 showoff RAV4 Prime (圣何塞Jason)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000010', 'a1000000-0000-0000-0000-000000000006', 'showoff', '蹲了仨月,终于收到RAV4 Prime', E'二手RAV4 Prime真的难蹲,好价的上架两天就没。这台2022 XSE,2万8千迈,前车主换Model X出的,谈到三万一。\n插电混动是真的适合湾区:每天通勤35迈基本纯电搞定,周末去Tahoe又没有里程焦虑。上牌后还能申请绿色贴纸走carpool。附两张提车照,内饰几乎全新。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Toyota_RAV4_Plug-in_Hybrid_GR_Sport_IMG_9896.jpg/960px-Toyota_RAV4_Plug-in_Hybrid_GR_Sport_IMG_9896.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Toyota_RAV4_Plug-in_Hybrid_GR_Sport_IMG_9891.jpg/960px-Toyota_RAV4_Plug-in_Hybrid_GR_Sport_IMG_9891.jpg'], NULL, NULL, NULL, ARRAY['提车','RAV4','插电混动'], 'active', '2026-02-05 18:30:00-08', '2026-02-05 18:30:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000018', 'd0000000-0000-0000-0002-000000000010', 'a1000000-0000-0000-0000-000000000005', E'恭喜!Prime这个价可以的,42迈纯电续航覆盖通勤,加州电价虽然贵,夜间充还是比油便宜。carpool贴纸更是无价。', '2026-02-05 21:15:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000019', 'd0000000-0000-0000-0002-000000000010', 'a0000000-0000-0000-0000-000000000003', E'从电车党角度看Prime也是好选择,去Tahoe不用规划充电桩这点太实用了。祝新车愉快!', '2026-02-06 08:50:00-08')
ON CONFLICT (id) DO NOTHING;

-- P11 discussion 谈价 (天普市阿婷)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000011', 'a1000000-0000-0000-0000-000000000034', 'discussion', '看中这台CX-5,标价1万7怎么开口砍', E'在一家二手车行看中这台2021 CX-5,4万迈,标价16995。KBB上fair price区间是15200-16400,感觉有得谈但我从来没砍过价,上次销售随口一句"这价没得少了"我就怂了。\n想请教:第一句怎么开口?直接报一个低于KBB下限的数吗?销售说要去"问经理"是真的假的?什么时候该转身走人?', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Mazda_CX-5_%28KF%29_Facelift_1X7A0331_%282%29.jpg/960px-Mazda_CX-5_%28KF%29_Facelift_1X7A0331_%282%29.jpg'], NULL, NULL, NULL, ARRAY['砍价','CX-5'], 'active', '2026-02-06 11:05:00-08', '2026-02-06 11:05:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000020', 'd0000000-0000-0000-0002-000000000011', 'a0000000-0000-0000-0000-000000000008', E'砍价核心不是话术是筹码:1) 先在网上找2-3台同款同里程的在售车,截图带着,开口就说"隔壁那台15800,你这台能做到15500我今天就定";2) 只谈OTD总价,别被月供绕进去;3) "问经理"是标准流程,等他回来价格一般会降一点但没到位,这时候起身收东西是最有效的动作,真走到门口价格还能再掉。记住二月是淡季,主动权在你。', '2026-02-06 14:30:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000021', 'd0000000-0000-0000-0002-000000000011', 'a1000000-0000-0000-0000-000000000033', E'补充一个:去之前打电话问这台车在不在,顺便说"我今天下午带现金和pre-approval过来,OTD多少你给个实价"。让他知道你是today buyer,报价立马不一样。', '2026-02-06 17:50:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000022', 'd0000000-0000-0000-0002-000000000011', 'a1000000-0000-0000-0000-000000000034', E'学到了,先去截同款车的图,周末就去试试OTD谈法,回来汇报!', '2026-02-07 10:15:00-08')
ON CONFLICT (id) DO NOTHING;

-- P12 discussion dealer fee拆解 (新泽西Leo)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000012', 'a1000000-0000-0000-0000-000000000012', 'discussion', '报价单一堆fee,哪些是真哪些能砍', E'昨天去谈一台车,车价谈得挺顺,结果报价单一出来多了一堆:doc fee 695、dealer prep 495、VIN etching 299、nitrogen轮胎充氮 199、window tint 395。加起来两千多,销售说"每台车都有"。\n除了税和DMV注册费,这些到底哪些是必须的?哪些是纯宰人的?新泽西的朋友你们都交过哪些?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['dealer fee','避坑'], 'active', '2026-02-06 14:45:00-05', '2026-02-06 14:45:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000023', 'd0000000-0000-0000-0002-000000000012', 'a0000000-0000-0000-0000-000000000008', E'分三类:1) 必交:sales tax、title/registration,这是给政府的;2) 名义上不能免但可以让利抵扣:doc fee,新泽西没有上限所以经常六七百,谈不掉就让他在车价里减同等金额;3) 纯利润项,全部可拒:VIN etching、氮气、prep fee、贴膜、织物保护。就说"这些我都不要,拿掉,不然我去别家"。他们宁可拿掉也不会放走一个today buyer。', '2026-02-06 17:30:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000024', 'd0000000-0000-0000-0002-000000000012', 'a1000000-0000-0000-0000-000000000035', E'上个月我在长岛买车,单子上也有299的VIN etching,我说这玩意自己买套件20刀,直接划掉了。prep fee磨了一下也拿掉了。doc fee没砍动,但车价多让了500,一个意思。', '2026-02-07 09:45:00-05')
ON CONFLICT (id) DO NOTHING;

-- P13 guide 冬末保养 (修车匠Tony)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000013', 'a0000000-0000-0000-0000-000000000007', 'review', '冬天快过去了,这五件事建议做一遍', E'修车铺二三月最常见的活,其实一半可以提前预防。冬末交界这几周,建议自查这五项:\n\n1. 电瓶:低温是电瓶杀手,熬过冬天的老电瓶春天最容易突然趴窝。四年以上的电瓶花几分钟做个load test,免得哪天早上打不着。\n2. 底盘冲洗:下雪州的车,融雪盐还挂在底盘上,气温回升腐蚀更快。找个自助洗车用高压水把底盘、轮拱冲一遍。\n3. 雨刮和玻璃水:冬天刮冰把胶条都磨毛了,春雨季前换一对,二十刀的事。\n4. 胎压和花纹:冬天低温大家都补过气,回暖后胎压会偏高,重新按门框标准调一次;顺手用25美分硬币查下花纹深度。\n5. 机油:短途冷启动多的冬天,机油里积的水汽和汽油比夏天多,快到里程的别拖,按时换掉。\n\n都是小钱,拖成大修就不值了。有问题评论区问。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保养','冬季用车'], 'active', '2026-02-07 10:00:00-08', '2026-02-07 10:00:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000025', 'd0000000-0000-0000-0002-000000000013', 'a0000000-0000-0000-0000-000000000006', E'第一条真实,我上一块电瓶就是三月初趴的,前一天还一切正常。现在学乖了,每年开春去auto parts店免费测一次。', '2026-02-07 13:25:00-08')
ON CONFLICT (id) DO NOTHING;

-- P14 discussion doc fee各州 (亚特兰大Momo)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000014', 'a1000000-0000-0000-0000-000000000016', 'discussion', '乔治亚的doc fee要899,是被宰了吗', E'在亚特兰大看车,两家dealer的doc fee一家799一家899,我记得网上有人说加州才85,同一个东西怎么差十倍?\n乔治亚是不是没有上限?这个费用到底是干嘛的,有没有办法不交?还是只能在车价上找补回来?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['doc fee','各州差异'], 'active', '2026-02-07 16:20:00-05', '2026-02-07 16:20:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000026', 'd0000000-0000-0000-0002-000000000014', 'a0000000-0000-0000-0000-000000000008', E'doc fee名义上是处理文件的成本,实际就是利润。有些州立法设了上限:加州85刀左右、纽约175、德州150上下,所以那些州便宜;乔治亚、佛罗里达没有上限,七八百是常态,九百也见过。应对办法只有一个:谈OTD总价。你不纠结单项,只说"落地一共多少",fee高就让车价降回来,总数达标就签。', '2026-02-07 19:40:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000027', 'd0000000-0000-0000-0002-000000000014', 'a1000000-0000-0000-0000-000000000019', E'德州这边基本都是150,第一次听说899的时候我也惊了。楼上说得对,盯OTD就完事,单项fee是他们设计出来分散你注意力的。', '2026-02-08 11:30:00-05')
ON CONFLICT (id) DO NOTHING;

-- P15 discussion extended warranty (弗里蒙特Tiger)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000015', 'a1000000-0000-0000-0000-000000000031', 'discussion', 'finance办公室推的延保2800刀,值吗', E'上周买车,车价谈完进finance office,经理开始推extended warranty,5年10万迈bumper to bumper,开价2800,说发动机变速箱修一次就回本,被我暂时拖住说考虑考虑。\n车是2021年的凯美瑞,6万迈。这种延保到底值不值?是不是也能砍价?错过当场买以后还能补吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['延保','avoid坑'], 'active', '2026-02-08 09:10:00-08', '2026-02-08 09:10:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000028', 'd0000000-0000-0000-0002-000000000015', 'a0000000-0000-0000-0000-000000000007', E'修车的角度说实话:凯美瑞这种车,10万迈内发动机变速箱大修的概率非常低,2800大概率打水漂。延保真正有点意义的是电子件多、修起来贵的车型。另外要分清:厂家原厂延保还有点保障,第三方延保理赔时各种"这项不在范围内",我铺里见得太多了。真要买,只买丰田原厂的,而且价格能砍,2800的东西1500-1800能拿下,也可以之后再买,不是只有签字当天这一次机会。', '2026-02-08 12:20:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000029', 'd0000000-0000-0000-0002-000000000015', 'a0000000-0000-0000-0000-000000000001', E'我的做法:不买延保,把这2800存进一个单独的"修车基金"。开丰田本田的,这笔钱大概率到卖车都花不完,还赚利息。', '2026-02-08 15:45:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000030', 'd0000000-0000-0000-0002-000000000015', 'a1000000-0000-0000-0000-000000000031', E'感谢!那我就不买了,凯美瑞信仰充值。修车基金这个思路好,照做。', '2026-02-09 08:30:00-08')
ON CONFLICT (id) DO NOTHING;

-- P16 showoff RX350 2018 (法拉盛Frank)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000016', 'a1000000-0000-0000-0000-000000000035', 'showoff', '人到中年,提了台二手RX350犒劳自己', E'来美国第十二年,一直开着买菜车,今年终于换了心心念念的RX350。2018款,4万9千迈,一手车主全程dealer保养,谈到两万六千五。\n开了一周,最大感受是安静,法拉盛的坑洼路面过滤得干干净净。中年人不求快,求的就是这份稳。附提车照。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/2018_Lexus_RX350%2C_Front_Right%2C_10-22-2020.jpg/960px-2018_Lexus_RX350%2C_Front_Right%2C_10-22-2020.jpg'], NULL, NULL, NULL, ARRAY['提车','雷克萨斯'], 'active', '2026-02-08 13:30:00-05', '2026-02-08 13:30:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000031', 'd0000000-0000-0000-0002-000000000016', 'a0000000-0000-0000-0000-000000000004', E'恭喜Frank哥!这个里程这个价在纽约很实在了,RX开十年不带修的,选它准没错。', '2026-02-08 16:10:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000032', 'd0000000-0000-0000-0002-000000000016', 'a1000000-0000-0000-0000-000000000036', E'"不求快,求的就是这份稳",说到心坎里了。长岛这边RX保有量巨大不是没有道理的,恭喜!', '2026-02-09 10:35:00-05')
ON CONFLICT (id) DO NOTHING;

-- P17 discussion 盐蚀防锈 (密歇根Anna)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000017', 'a1000000-0000-0000-0000-000000000023', 'discussion', '密歇根的融雪盐太狠,底盘怎么保', E'今年冬天雪特别多,路上撒盐撒得跟不要钱一样。上周换机油时技师说我底盘已经有浮锈了,车才五年。\n想问下五大湖区的朋友:1) 冬天多久洗一次底盘合适?2) 那种fluid film或者undercoating喷涂值得做吗,一次两三百;3) 已经有浮锈了还来得及处理吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['防锈','雪带用车'], 'active', '2026-02-08 19:45:00-05', '2026-02-08 19:45:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000033', 'd0000000-0000-0000-0002-000000000017', 'a0000000-0000-0000-0000-000000000007', E'雪带的车我们叫"底下比上面老十岁"。建议:1) 化雪的暖和天去洗一次带底盘冲洗的洗车,整个冬天洗三四次就很有效,重点是轮拱内侧;2) fluid film值得,每年秋天喷一次,两三百买底盘寿命,尤其刹车油管和副车架这些锈穿了要大钱的地方;3) 浮锈不怕,钢丝刷掉喷转化剂再上底盘装甲就稳住了,怕的是不管它。春天来了先把这个冬天的盐冲干净。', '2026-02-09 09:15:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000034', 'd0000000-0000-0000-0002-000000000017', 'a1000000-0000-0000-0000-000000000022', E'芝加哥同病相怜。补一条买车视角:在雪带买二手车,趴下去看底盘比看外观重要十倍,同款车南方州运过来的能贵一两千,贵得有道理。', '2026-02-09 14:50:00-05')
ON CONFLICT (id) DO NOTHING;

-- P18 discussion 暖车争议 (丹佛高原红)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000018', 'a1000000-0000-0000-0000-000000000026', 'discussion', '零下的早晨到底要不要原地热车5分钟', E'丹佛这周早上都是零下十度。我爸视频里坚持让我原地热车5分钟再走,说不然伤发动机;同事说现在的车不用热,点火就能走,原地怠速反而费油积碳。\n两边听着都有道理,到底谁对?高海拔零下天气有没有特殊讲究?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['暖车','冬季用车'], 'active', '2026-02-09 08:20:00-08', '2026-02-09 08:20:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000035', 'd0000000-0000-0000-0002-000000000018', 'a0000000-0000-0000-0000-000000000007', E'两边各对一半。现代电喷车不需要热5分钟,那是化油器时代的习惯。正确做法:点火后等个30秒到1分钟,让机油泵到位,然后温柔地开起来,水温上来之前别地板油、别拉高转。发动机在低速行驶中升温比原地怠速快得多,对积碳也友好。零下十度可以适当多等一会,顺便刮干净所有玻璃的霜,这比热车重要,视线不清才是真危险。', '2026-02-09 11:30:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000036', 'd0000000-0000-0000-0002-000000000018', 'a1000000-0000-0000-0000-000000000027', E'盐湖城同款天气。我的习惯是上车系安全带调导航的功夫正好一分钟,然后慢慢开出小区,出主路时水温也起来一格了,刚刚好。', '2026-02-09 16:45:00-08')
ON CONFLICT (id) DO NOTHING;

-- P19 review RAV4 Hybrid油耗 (西雅图阿明)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000019', 'a0000000-0000-0000-0000-000000000006', 'review', 'RAV4混动一整个冬天的真实油耗记录', E'去年入手的2021 RAV4 Hybrid XLE,坚持记了一冬天油耗,给关心混动冬季表现的朋友一组真实数据。\n\n西雅图冬天(35-45华氏度,小雨为主):市区通勤单程11迈,表显36-38mpg,实际加油算下来35mpg左右;高速去波特兰一趟,定速70迈,37mpg。对比EPA标称的40mpg,冬天折损大概10%,主要是暖风和冷启动吃掉的。\n\n几个观察:短途(3迈以内)最伤油耗,发动机基本全程在给电池和暖风打工,能到30就不错;方向盘加热和座椅加热比开暖风省油,冬天多用;胎压保持在标准值,掉2psi油耗肉眼可见变差。\n\n总体还是满意,同事的汽油版RAV4冬天26mpg,一年油费差出500多刀。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Toyota_RAV4_Hybrid_%28XA50%29_DSC_2709.jpg/960px-Toyota_RAV4_Hybrid_%28XA50%29_DSC_2709.jpg'], 'Toyota', 'RAV4', 2021, ARRAY['RAV4','混动','油耗'], 'active', '2026-02-09 20:30:00-08', '2026-02-09 20:30:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000037', 'd0000000-0000-0000-0002-000000000019', 'a1000000-0000-0000-0000-000000000039', E'数据党点赞。贝尔维尤这边我的混动冬天也是35上下,方向盘加热代替暖风这招确实有用,亲测能差2mpg。', '2026-02-10 09:20:00-08')
ON CONFLICT (id) DO NOTHING;

-- P20 discussion 变速箱油 (哥伦布小舟)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000020', 'a1000000-0000-0000-0000-000000000024', 'discussion', 'dealer说变速箱油终身免换,能信吗', E'我的车快10万迈了,去dealer做保养问要不要换变速箱油,服务顾问说这车是lifetime fluid,不用换。但网上又一堆人说"终身免换"的意思是"变速箱终身",到寿命直接换变速箱。\n到底听谁的?10万迈从没换过变速箱油,现在换会不会反而把变速箱搞坏?听说有"越换越坏"的说法。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['变速箱','保养'], 'active', '2026-02-10 09:00:00-05', '2026-02-10 09:00:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000038', 'd0000000-0000-0000-0002-000000000020', 'a0000000-0000-0000-0000-000000000007', E'lifetime fluid更像营销话术,油品再好也会氧化和积累磨损物。我的建议:自动变速箱6-10万迈做一次drain and fill(放掉一部分换新油),温和又有效。"越换越坏"的传说来自高里程车做暴力flush,把沉积物冲进阀体,那是方法问题不是换油问题。你这10万迈没换过的,做drain and fill别做flush,分两次间隔几千迈做,油慢慢就置换新了。变速箱一个八千一万,一次换油一两百,账很好算。', '2026-02-10 12:40:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000039', 'd0000000-0000-0000-0002-000000000020', 'a0000000-0000-0000-0000-000000000008', E'补一句买车视角:看二手车时,10万迈以上还标榜"变速箱油从没换过"的,不是加分是减分。要卖家出示换油记录,没有的话把未来这笔保养算进砍价里。', '2026-02-10 15:55:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000040', 'd0000000-0000-0000-0002-000000000020', 'a1000000-0000-0000-0000-000000000024', E'明白了,drain and fill不做flush,这周就去约。谢谢Tony师傅,这论坛有你真好。', '2026-02-11 08:20:00-05')
ON CONFLICT (id) DO NOTHING;

-- P21 chatter 加州暴雨 (洛杉矶Amy)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000021', 'a1000000-0000-0000-0000-000000000002', 'discussion', '洛杉矶一下雨,全城都不会开车了', E'这周的大气河真的服了,405上大家不是龟速40就是照常80,一天看见三起追尾。我的雨刮还在这个节骨眼罢工,刮完一道水痕跟没刮一样。\n提醒各位:加州的车雨刮一年晒到硬化,雨季前真的要检查。你们今天通勤还好吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['雨季','闲聊'], 'active', '2026-02-10 12:15:00-08', '2026-02-10 12:15:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000041', 'd0000000-0000-0000-0002-000000000021', 'a0000000-0000-0000-0000-000000000001', E'尔湾也在下,5号往北全红。加州车的雨刮是消耗品里最容易被忘的,我都是每年十一月雨季前直接换新,Costco两根二十来刀。', '2026-02-10 15:30:00-08')
ON CONFLICT (id) DO NOTHING;

-- P22 discussion 刹车异响 (萨克拉门托Ken)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000022', 'a1000000-0000-0000-0000-000000000030', 'discussion', '早上倒车刹车吱吱响,开一会又没了', E'最近半个月,每天早上第一脚刹车都有吱吱的声音,尤其是倒车出车道的时候,开个十来分钟就消失,白天怎么踩都正常。\n车是2019年的,刹车片去年刚换过。这种"早上响白天好"的情况正常吗?要不要紧?还是说得赶紧去检查?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['刹车','异响'], 'active', '2026-02-10 17:40:00-08', '2026-02-10 17:40:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000042', 'd0000000-0000-0000-0002-000000000022', 'a0000000-0000-0000-0000-000000000007', E'大概率正常。夜里潮气让刹车盘表面结一层浮锈,早上前几脚刹车是在磨掉这层锈,吱吱声就是这么来的,磨掉就安静了,潮湿天和洗完车尤其明显。需要警惕的是另外两种:一直响不消失的金属摩擦声(报警片在提示刹车片磨到底了),和踩刹车时的抖动或哐当声。你的片去年刚换,先观察,如果哪天变成全天响再来找我。', '2026-02-10 20:50:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000043', 'd0000000-0000-0000-0002-000000000022', 'a1000000-0000-0000-0000-000000000001', E'我的车也这样好几年了,萨克拉门托冬天早上湿度大更明显。Tony说的对,分清"早晨限定"还是"全天营业"就行。', '2026-02-11 09:10:00-08')
ON CONFLICT (id) DO NOTHING;

-- P23 discussion 胎压灯 (长岛Sophia)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000023', 'a1000000-0000-0000-0000-000000000036', 'discussion', '胎压灯这个冬天亮三回了,轮胎有问题吗', E'入冬以来胎压灯亮了三次,每次去加油站充到35就灭,过两三周降温又亮。轮胎看着不瘪,去店里查也说没扎钉。\n是轮胎慢撒气还是传感器坏了?为什么总在特别冷的早上亮?需要换轮胎吗,还是就这么充着过完冬天?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['胎压','冬季用车'], 'active', '2026-02-11 07:50:00-05', '2026-02-11 07:50:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000044', 'd0000000-0000-0000-0002-000000000023', 'a0000000-0000-0000-0000-000000000007', E'物理课:气温每降10华氏度,胎压掉大约1psi。秋天充的35psi,碰上零下的寒潮直接掉到30以下,灯就亮了,这是正常现象不是漏气。你的情况三次都对应降温,轮胎又查过没钉,基本可以放心。要点:胎压按门框贴纸的冷胎标准充(别按轮胎侧面的最大值),寒潮前主动补一两psi。如果是单个轮子反复比另外三个低,那才要查气门嘴和轮毂边缘密封。', '2026-02-11 10:30:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000045', 'd0000000-0000-0000-0002-000000000023', 'a1000000-0000-0000-0000-000000000010', E'长岛冬天早晚温差大,我家两台车轮流亮灯,习惯就好。买个二三十刀的小充气泵放后备箱,在家慢慢充,比在加油站投币从容多了。', '2026-02-11 16:20:00-05')
ON CONFLICT (id) DO NOTHING;

-- P24 showoff F-150 (达拉斯德州哥)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000024', 'a1000000-0000-0000-0000-000000000019', 'showoff', '在德州,人生总要有一台F-150', E'来德州第五年,终于活成了本地人的样子:提了台2021 F-150 XLT,3.5 EcoBoost,4万迈,两万九落地。\n上周刚用它从Home Depot拉了整套地板和二十包水泥,搬家、捡家具、帮朋友拉床垫,一台车全包了。在DFW开皮卡不是炫,是刚需,谁开谁知道。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Ford_F-150_%28fourteenth_generation%29_Rutesheimer_Autoschau_2025_DSC_9231.jpg/960px-Ford_F-150_%28fourteenth_generation%29_Rutesheimer_Autoschau_2025_DSC_9231.jpg'], NULL, NULL, NULL, ARRAY['提车','皮卡','德州'], 'active', '2026-02-11 12:30:00-05', '2026-02-11 12:30:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000046', 'd0000000-0000-0000-0002-000000000024', 'a1000000-0000-0000-0000-000000000020', E'休斯顿人认证:在德州没皮卡的中国人聚会时都在蹭有皮卡的。恭喜,以后搬家群里又多一位大哥。', '2026-02-11 15:40:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000047', 'd0000000-0000-0000-0002-000000000024', 'a1000000-0000-0000-0000-000000000021', E'3.5 EcoBoost拉货是真有劲,就是右脚重的话油耗感人,市区能干到15mpg以下,且开且珍惜哈哈。', '2026-02-12 09:25:00-05')
ON CONFLICT (id) DO NOTHING;

-- P25 discussion 跨州搬家上牌 (奥斯汀Ethan)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000025', 'a1000000-0000-0000-0000-000000000021', 'discussion', '从加州搬来奥斯汀,车怎么转德州牌', E'上个月刚从湾区搬到奥斯汀,车是开过来的,还挂着加州牌。听说要在30天内转德州注册,但具体流程一头雾水:要先做inspection吗?去哪个部门办?加州的title在我手里,需要准备什么材料?保险是不是也要先换成德州的?有经验的朋友给个步骤清单吧。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['跨州搬家','上牌'], 'active', '2026-02-11 18:20:00-05', '2026-02-11 18:20:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000048', 'd0000000-0000-0000-0002-000000000025', 'a0000000-0000-0000-0000-000000000005', E'去年帮朋友办过,清单如下:1) 先买德州车险(加州保单不能用来注册);2) 去认证的inspection站做检测,奥斯汀所在的Travis县要做排放;3) 拿着检测报告、加州title、德州保险证明、驾照,去县里的tax office填130-U表,交新居民税90刀加注册费,当场拿牌。全程最麻烦的就是排队,建议网上预约。30天期限过了也能办,别拖太久就行。', '2026-02-11 21:30:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000049', 'd0000000-0000-0000-0002-000000000025', 'a0000000-0000-0000-0000-000000000008', E'补充两点:1) 德州驾照和车牌是两条线,车牌在tax office办,驾照在DPS办,别跑错;2) 车上如果还有加州的贷款,title在银行手里,要先让lender寄title或者走电子title转移,提前打电话问,这一步最容易卡住。', '2026-02-12 10:15:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000050', 'd0000000-0000-0000-0002-000000000025', 'a1000000-0000-0000-0000-000000000021', E'太全了,感谢!我的车没贷款,title在手,那就是保险-inspection-tax office三步走,这周搞定。', '2026-02-12 14:40:00-05')
ON CONFLICT (id) DO NOTHING;

-- P26 discussion 国际驾照 (圣盖博阿强)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000026', 'a1000000-0000-0000-0000-000000000003', 'discussion', '爸妈来探亲,国际驾照能开我的车吗', E'爸妈三月过来住半年,老爸在国内老司机三十年,想让他偶尔帮忙接送娃。他有中国驾照,可以办个翻译件或者公证件。\n问题:1) 加州允许持外国驾照开车吗,能开多久?2) 我的保险要不要把他加进去?不加的话出事保险会不会拒赔?3) 网上卖的"国际驾照IDP"中国好像不能办,翻译件够用吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['探亲','驾照','保险'], 'active', '2026-02-12 10:10:00-08', '2026-02-12 10:10:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000051', 'd0000000-0000-0000-0002-000000000026', 'a0000000-0000-0000-0000-000000000008', E'分开说:1) 加州对合法入境的访客,允许持有效外国驾照开车,身份是访客期间一般都可以,建议随身带驾照原件加英文翻译件;2) 中国不是国际驾照公约国,所以没有真的IDP,网上卖的那种没有法律效力,别买;3) 保险是重点:打电话给你的保险公司,把他作为household里的驾驶人报备或者确认occasional driver是否覆盖,口头确认不放心就要个书面。出了事故保险公司找理由拒赔,最常用的借口就是"未申报的常用驾驶人"。', '2026-02-12 13:30:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000052', 'd0000000-0000-0000-0002-000000000026', 'a0000000-0000-0000-0000-000000000002', E'我爸妈前年来,我是直接打给Geico加了个listed driver,半年多花了两百来刀,买个安心。另外提醒叔叔:美国的stop sign和无保护左转跟国内习惯差很大,先在小区里陪练几天再上路。', '2026-02-12 17:45:00-08')
ON CONFLICT (id) DO NOTHING;

-- P27 review RX350 2013 (尔湾老王)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000027', 'a0000000-0000-0000-0000-000000000001', 'review', '15万迈的2013 RX350,老骥伏枥的一年', E'家里这台2013 RX350去年过了15万迈,写个年度小结,给纠结高里程雷车能不能买的朋友参考。\n\n这一年花的钱:常规机油保养四次,前刹车片加盘,一套米其林,水泵有轻微渗漏预防性换掉,合计2600左右,没有一次趴窝。\n\n2GR这台3.5 V6是丰田的功勋机器,只要按时换油真的开不坏。要留意的老毛病就两个:水泵渗漏(我这台第二次换了)和门板按键老化,都是小钱。6速变速箱换过两次油,换挡依旧顺滑。\n\n结论:预算两万以内想要台省心舒服的SUV,10-15万迈、记录全的RX350依然是我最推荐的答案之一,前提是买之前查清水泵和变速箱油的历史。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/2013_Lexus_RX350%2C_Front_Left%2C_09-14-2020.jpg/960px-2013_Lexus_RX350%2C_Front_Left%2C_09-14-2020.jpg'], 'Lexus', 'RX350', 2013, ARRAY['雷克萨斯','高里程','用车报告'], 'active', '2026-02-12 15:00:00-08', '2026-02-12 15:00:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000053', 'd0000000-0000-0000-0002-000000000027', 'a1000000-0000-0000-0000-000000000035', E'王哥这篇来得太巧,我刚提了台2018的RX。看你这台15万迈的状态,我这台看来能陪我到退休。', '2026-02-12 21:40:00-05')
ON CONFLICT (id) DO NOTHING;

-- P28 discussion 亲友卖车过户 (法拉盛小李)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000028', 'a0000000-0000-0000-0000-000000000004', 'discussion', '把车卖给表弟,纽约过户有什么讲究', E'我换了新车,旧车想六千块卖给刚来纽约的表弟。亲戚之间交易,想问下:1) 是不是把title背面签一签就行?2) 听说要填一个税务表格,表弟按什么价交税?写低一点行不行?3) 车牌是我留着还是跟车走?第一次在纽约卖车,怕漏了步骤害表弟上不了牌。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['过户','纽约'], 'active', '2026-02-12 20:40:00-05', '2026-02-12 20:40:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000054', 'd0000000-0000-0000-0002-000000000028', 'a0000000-0000-0000-0000-000000000008', E'纽约流程:1) title背面卖方签字,写清里程和售价,再写一份简单的bill of sale双方签;2) 税务表是DTF-802,表弟拿去DMV办过户时交sales tax。注意:直系亲属(父母子女配偶)之间赠与可以免税,表弟不属于直系,按成交价交税;价格写得离谱地低,DMV有权按市场价核定,老老实实写六千就好,税也没多少;3) 纽约车牌跟人不跟车,你把牌拆下来拿去DMV注销或转到新车,表弟自己上新牌。你注销牌之前保险别停,顺序是:他上完牌,你再退保。', '2026-02-13 09:30:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000055', 'd0000000-0000-0000-0002-000000000028', 'a1000000-0000-0000-0000-000000000011', E'补充一个过来人细节:成交那天陪表弟一起去DMV办,亲戚交易最忌讳"回头再办",拖着不过户,期间车出了罚单事故都算你头上。', '2026-02-13 14:15:00-05')
ON CONFLICT (id) DO NOTHING;

-- P29 discussion gift transfer (帕萨迪纳Lucy)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000029', 'a1000000-0000-0000-0000-000000000032', 'discussion', '想把旧车送给亲妹妹,加州怎么办gift', E'我升级了车,旧的Corolla想直接送给刚毕业来LA工作的妹妹。听说加州家人之间可以按gift transfer办,能免一些税费?\n具体想问:1) 兄弟姐妹算不算加州认可的家庭成员范围?2) gift是不是就不用交use tax了?smog check还要不要做?3) 需要填什么表,流程是先去DMV还是先交接车?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['gift','过户','加州'], 'active', '2026-02-13 09:25:00-08', '2026-02-13 09:25:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000056', 'd0000000-0000-0000-0002-000000000029', 'a0000000-0000-0000-0000-000000000008', E'加州对这块算友好:1) 兄弟姐妹在认可的家庭成员范围内(父母、子女、配偶、兄弟姐妹、祖孙都算);2) 家庭成员之间的transfer免use tax,而且免smog check,这是两大实惠;3) 操作:title背面你签转让,注明是gift,妹妹填REG 256表说明家庭关系,10天内你在DMV网站提交Notice of Release of Liability撇清责任,她30天内去DMV办过户交个几十刀的手续费就完事。记得把保养记录一起给她。', '2026-02-13 12:40:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000057', 'd0000000-0000-0000-0002-000000000029', 'a0000000-0000-0000-0000-000000000001', E'去年刚给儿子办过一模一样的,流程就是楼上说的。提醒一句:Release of Liability千万别忘,我朋友送车给亲戚没提交,半年后收到一沓高速托运费账单,扯皮扯了俩月。', '2026-02-13 16:20:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000058', 'd0000000-0000-0000-0002-000000000029', 'a1000000-0000-0000-0000-000000000032', E'清楚了!免税还免smog,加州难得的良心政策。REG 256和Release of Liability都记下了,谢谢两位。', '2026-02-14 10:05:00-08')
ON CONFLICT (id) DO NOTHING;

-- P30 showoff CX-5 (库比蒂诺码农)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000030', 'a1000000-0000-0000-0000-000000000005', 'showoff', '不想跟风买RAV4,提了台红色CX-5', E'湾区停车场一眼望去全是RAV4和Model Y,我偏不。上周提了这台魂动红CX-5,2022款2万6千迈,两万一落地。\n试驾的时候就被内饰和转向手感圈粉,这个价位少有的开着有乐趣的SUV。同事说马自达保值率不如两田,我的看法是:车是买来开的,不是买来卖的。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Mazda_CX-5_%28KF%29_Facelift_1X7A0331_%282%29.jpg/960px-Mazda_CX-5_%28KF%29_Facelift_1X7A0331_%282%29.jpg'], NULL, NULL, NULL, ARRAY['提车','马自达'], 'active', '2026-02-13 18:50:00-08', '2026-02-13 18:50:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000059', 'd0000000-0000-0000-0002-000000000030', 'a1000000-0000-0000-0000-000000000038', E'魂动红真的好看,阳光下和阴天是两种红。CX-5这套2.5自吸加6AT皮实得很,开着有乐趣这句话我举双手同意。', '2026-02-13 21:30:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000060', 'd0000000-0000-0000-0002-000000000030', 'a1000000-0000-0000-0000-000000000034', E'同款候选选手路过!我正在谈一台2021的CX-5,看到你两万一落地心里更有数了,谢谢参考价。', '2026-02-14 09:40:00-08')
ON CONFLICT (id) DO NOTHING;

-- P31 chatter 情人节自驾 (圣塔克拉拉Ray)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000031', 'a1000000-0000-0000-0000-000000000038', 'discussion', '情人节带媳妇一号公路自驾,不堵才怪', E'今天情人节,起了个大早带媳妇走一号公路去Half Moon Bay吃螃蟹,顺便让服役三年的老伙计出个远门。\n结果全湾区的情侣都是一个想法,92号排到怀疑人生。好在海边天气给面子,吃上了Dungeness crab。情人节+周末自驾的朋友们,你们都堵在哪条路上?', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/2020_Subaru_Outback_AWD%2C_front.jpg/960px-2020_Subaru_Outback_AWD%2C_front.jpg'], NULL, NULL, NULL, ARRAY['情人节','自驾'], 'active', '2026-02-14 10:30:00-08', '2026-02-14 10:30:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000061', 'd0000000-0000-0000-0002-000000000031', 'a1000000-0000-0000-0000-000000000002', E'洛杉矶报告:PCH往Malibu方向一样瘫痪,情人节的海边餐厅等位一小时起。明年学乖了,2月13号提前过。', '2026-02-14 14:20:00-08')
ON CONFLICT (id) DO NOTHING;

-- P32 discussion 二手电车冬天续航 (圣地亚哥Wendy)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000032', 'a1000000-0000-0000-0000-000000000029', 'discussion', '考虑二手Model 3,冬天续航掉多少', E'一直开油车,最近认真考虑入一台二手Model 3,两万出头的2021款长续航看着很香。圣地亚哥不冷,但我每个月要跑一趟Mammoth滑雪,山里零下。\n问问电车前辈:1) 冬天上山续航实际打几折?2) 二手电车怎么看电池衰减,有没有靠谱的检测办法?3) 车龄四五年的电池还能撑几年?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['电车','续航','二手'], 'active', '2026-02-14 14:20:00-08', '2026-02-14 14:20:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000062', 'd0000000-0000-0000-0002-000000000032', 'a1000000-0000-0000-0000-000000000007', E'西雅图电车车主答:冷天加高速加爬坡,按标称六到六五折规划最稳,零下的山路别指望官方续航。技巧:出发前插着桩把车和电池预热到位,能省不少;上山耗得多,下山动能回收能捞回来一截。Mammoth沿途充电桩这两年多了不少,规划好其实不慌。', '2026-02-14 17:40:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000063', 'd0000000-0000-0000-0002-000000000032', 'a0000000-0000-0000-0000-000000000003', E'开了五年Model 3的来答电池:1) 看衰减最直接的是充满看表显续航跟原始EPA对比,健康的2021长续航一般衰减在8-12%;2) 试驾时看能量图和充电速度,快充明显慢于同款要警惕;3) 特斯拉电池八年12万迈质保,2021款还在保,衰减到70%以下能索赔,所以四五年的车电池基本不用过度焦虑,挑一台充电习惯好的(家充为主)更重要。', '2026-02-15 09:30:00-08')
ON CONFLICT (id) DO NOTHING;

-- P33 showoff Outback (波特兰小鹿)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000033', 'a1000000-0000-0000-0000-000000000008', 'showoff', '俄勒冈人均斯巴鲁,我也终于上车了', E'在波特兰住了三年,终于理解为什么这里人均斯巴鲁:一年八个月下雨,周末不是山就是海。上周把2020 Outback开回了家,3万7千迈,两万三。\n提车当天就拉去Mt. Hood试了雪地,全时四驱稳得让人感动,X-Mode下坡辅助比我想象中好用。后备箱塞下两块单板加全套装备还有富余。快乐!', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Subaru_Outback_2020_au_SIAM_2020.jpg/960px-Subaru_Outback_2020_au_SIAM_2020.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/2020_Subaru_Outback_AWD%2C_rear.jpg/960px-2020_Subaru_Outback_AWD%2C_rear.jpg'], NULL, NULL, NULL, ARRAY['提车','斯巴鲁','滑雪'], 'active', '2026-02-14 16:45:00-08', '2026-02-14 16:45:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000064', 'd0000000-0000-0000-0002-000000000033', 'a1000000-0000-0000-0000-000000000007', E'欢迎加入西北斯巴鲁大军,西雅图这边同样人均一台。记得按保养手册管好机油,水平对置发动机就好这一口。', '2026-02-14 20:10:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000065', 'd0000000-0000-0000-0002-000000000033', 'a1000000-0000-0000-0000-000000000040', E'塔科马老斯巴鲁车主握爪。X-Mode在雪天停车场爬坡的时候你会更爱它,恭喜提车!', '2026-02-15 11:25:00-08')
ON CONFLICT (id) DO NOTHING;

-- P34 discussion 总统日促销 (拉斯维加斯发哥)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000034', 'a1000000-0000-0000-0000-000000000028', 'discussion', '明天总统日去看车,折扣是真是假', E'各家dealer这周的广告轰炸:Presidents Day Sale,横幅拉满。我正好想换台二手SUV,预算两万五。\n想问有经验的:总统日的折扣是真让利还是先抬价再打折的套路?二手车部门也参与吗还是只有新车?到底是明天人挤人的时候去,还是等月底?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['总统日','行情'], 'active', '2026-02-15 11:30:00-08', '2026-02-15 11:30:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000066', 'd0000000-0000-0000-0002-000000000034', 'a0000000-0000-0000-0000-000000000008', E'一半一半。真的部分:厂商在这个节点确实有额外rebate和低息金融,主要在新车;二手车没有官方折扣,但店里定了周末冲量目标,经理批价会松。假的部分:横幅上"立省5000"多半是从虚高的标价里省。策略:今天先在网上把目标车的OTD要出来,明天带着别家报价去压,谈崩了不慌,月底28号前他们还会回头找你。二月你是甲方。', '2026-02-15 14:50:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000067', 'd0000000-0000-0000-0002-000000000034', 'a0000000-0000-0000-0000-000000000005', E'我去年总统日买的车,经验是别上午去,人最多销售最横。下午四点以后去,快打烊还没开单的销售好说话得多。', '2026-02-15 18:30:00-05')
ON CONFLICT (id) DO NOTHING;

-- P35 discussion CR-V vs RAV4保值 (布鲁克林老陈)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000035', 'a1000000-0000-0000-0000-000000000010', 'discussion', 'CR-V和RAV4,五年后谁更保值', E'预算两万五在CR-V和RAV4混动之间纠结,打算开五年左右卖掉换新。看中这台CR-V了,但朋友说RAV4保值率常年压CR-V一头,五年后能多卖一两千。\n真的假的?有没有两台都拥有过的朋友说说,除了保值,日常使用差别大吗?', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/HONDA_CR-V_PHEV_FIFTH_GENERATION_China.jpg/960px-HONDA_CR-V_PHEV_FIFTH_GENERATION_China.jpg'], NULL, NULL, NULL, ARRAY['保值率','选车'], 'active', '2026-02-15 15:10:00-05', '2026-02-15 15:10:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000068', 'd0000000-0000-0000-0002-000000000035', 'a0000000-0000-0000-0000-000000000001', E'两台都开过的来说:保值率RAV4确实略胜,尤其混动版,但差距没到左右决策的程度,五年后可能就差几百到一千。使用上:CR-V后排和后备箱更大更舒服,RAV4混动油耗更漂亮、四驱可选项多。家里娃多选CR-V,常跑山路雪地选RAV4,就这么简单。', '2026-02-15 18:40:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000069', 'd0000000-0000-0000-0002-000000000035', 'a1000000-0000-0000-0000-000000000001', E'开2018 CR-V的补充:这代CR-V的1.5T早期有机油稀释的争议,对二手价有一点点拖累,混动版没这个问题。你要是打算五年就出手,买的时候里程别贪高,车况和记录比车标对残值影响更大。', '2026-02-16 10:20:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000070', 'd0000000-0000-0000-0002-000000000035', 'a0000000-0000-0000-0000-000000000008', E'数据角度:五年残值率两者都在55-60%区间,RAV4高2-3个点。但买入价才是大头,同年份同里程CR-V经常比RAV4便宜500-1000,一进一出基本抹平。哪台车况好、价格谈得下来,就买哪台。', '2026-02-16 13:35:00-08')
ON CONFLICT (id) DO NOTHING;

-- P36 guide 过户流程 (避坑酱)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000036', 'a0000000-0000-0000-0000-000000000008', 'review', '私人交易过户全流程,存下备用', E'最近后台好几个人问私人买卖怎么过户,写个通用流程,各州细节不同但骨架一致。\n\n买家侧五步:1) 成交前查VIN(Carfax加NICB查是否盗抢/salvage);2) 验title:卖家名字要跟证件一致,title上有lien要先解押;3) 付款同时让卖家在title背面签字,填好里程和价格,拿到手才算完;4) 双方签bill of sale,一式两份;5) 按州规定期限(多为10-30天)去DMV办过户、交税、上牌,别拖,拖了有罚金。\n\n卖家侧三步:1) 收好全款再签title,cashier check要在银行柜台当面验;2) 留一份bill of sale和title复印件;3) 立刻提交release of liability(加州10天内),然后才退保险和拆牌(牌照跟车还是跟人看各州)。\n\n最容易踩的三个坑:title签错位置(签之前看清buyer/seller栏)、忘了release of liability、买家拖着不过户。前两个毁的是卖家,最后一个坑的也是卖家。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['过户','攻略'], 'active', '2026-02-15 20:00:00-08', '2026-02-15 20:00:00-08')
ON CONFLICT (id) DO NOTHING;

-- P37 discussion 私卖收款 (费城大熊)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000037', 'a1000000-0000-0000-0000-000000000014', 'discussion', '私卖车怎么收钱最安全,怕收到假支票', E'我在网上挂了台一万二的车,有个买家谈好了价说带cashier check来提车。网上一搜全是假cashier check的案例,支票存进去几天后被银行退回,车已经开走了。\n一万多的交易,现金点起来也吓人。大家私卖都怎么收款的?Zelle有额度限制吧?有没有万无一失的办法?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['私卖','防骗'], 'active', '2026-02-16 09:40:00-05', '2026-02-16 09:40:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000071', 'd0000000-0000-0000-0002-000000000037', 'a0000000-0000-0000-0000-000000000008', E'最稳的办法只有一个:约在买家的开户银行网点,当着柜员的面让他现场开cashier check或者直接wire/转账到你账户,确认到账你再签title。假cashier check骗局全靠"银行下班后交易+几天的清算时差",把交易搬进银行大厅这个骗局就死了。Zelle单日限额一般几千,可以让他分两天转定金加尾款,但大额还是柜台最踏实。另外警惕"多付了请退差价"和"我人在外州先寄支票"的,百分百是骗子。', '2026-02-16 12:30:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000072', 'd0000000-0000-0000-0002-000000000037', 'a1000000-0000-0000-0000-000000000035', E'上个月刚私卖出一台,就是约在他的Chase分行办的,柜台开check我当场存进我账户,前后四十分钟,双方都安心。买家不肯去银行的,直接pass换下一个。', '2026-02-16 16:45:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000073', 'd0000000-0000-0000-0002-000000000037', 'a1000000-0000-0000-0000-000000000014', E'"把交易搬进银行大厅"这句记住了,我这就跟买家约银行见,不肯去的就算了。谢谢两位!', '2026-02-17 08:50:00-05')
ON CONFLICT (id) DO NOTHING;

-- P38 review CX-5 2017 (罗兰岗车神)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000038', 'a1000000-0000-0000-0000-000000000033', 'review', '2017 CX-5九年车主,优缺点全摊开', E'这台2017 CX-5跟了我九年,12万迈,准备换车之际写个告别总结。\n\n优点:2.5自吸加6AT这套动力总成九年零大修,只换过常规易损件;转向和底盘质感同价位无敌,山路开着是真享受;内饰用料在当年日系里算越级。\n\n缺点也不藏着:后排偏小,坐三个成年人挤;隔音到高速就露怯,胎噪明显;自吸动力够用但仅限够用,满载爬坡要吼;车机老古董,好在我加了个CarPlay盒子续命。\n\n维修花销九年合计约4800,大头是10万迈时的悬挂胶套和一套刹车。结论:预算一万三四想要台开着不无聊又省心的SUV,这代CX-5闭眼收,买前重点看有没有按时换机油就行。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/2017_Mazda_CX-5_%28KF%29_Maxx_2WD_wagon_%282018-11-02%29_02.jpg/960px-2017_Mazda_CX-5_%28KF%29_Maxx_2WD_wagon_%282018-11-02%29_02.jpg'], 'Mazda', 'CX-5', 2017, ARRAY['马自达','用车报告','高里程'], 'active', '2026-02-16 13:20:00-08', '2026-02-16 13:20:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000074', 'd0000000-0000-0000-0002-000000000038', 'a1000000-0000-0000-0000-000000000005', E'九年4800的维修费,这就是我选马自达的底气。刚提了台CX-5,看到老前辈的车况更放心了。', '2026-02-16 17:40:00-08')
ON CONFLICT (id) DO NOTHING;

-- P39 discussion Carfax小事故 (华府Daniel)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000039', 'a1000000-0000-0000-0000-000000000015', 'discussion', 'Carfax写minor damage,这车还能要吗', E'看中一台2020年的Accord,价格比同款便宜1500,一查Carfax,三年前有一条"minor damage, rear",之后正常过户和保养记录都齐。\n卖家说就是被追尾换了个后杠。想问:1) Carfax的minor damage可信度多高,会不会实际是大事故?2) 这种车买了以后卖是不是也难出手?3) 便宜1500值不值得冒这个险?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['事故车','Carfax'], 'active', '2026-02-16 19:30:00-05', '2026-02-16 19:30:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000075', 'd0000000-0000-0000-0002-000000000039', 'a0000000-0000-0000-0000-000000000007', E'Carfax只是保险和车行上报的记录,严重程度描述不能全信,轻的可能没报,报的也可能轻描淡写。关键看伤到哪:换后杠皮补个漆无所谓,车是拿来用的;伤到后围板、纵梁这些结构件才是硬伤。办法:花一百多做个PPI,让技师举升起来看后部有没有切割焊接痕迹、备胎槽平不平整,再拿漆膜仪扫一圈。结构没伤,minor rear damage的车我自己都敢买。', '2026-02-16 22:20:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000076', 'd0000000-0000-0000-0002-000000000039', 'a0000000-0000-0000-0000-000000000008', E'第2、3问我答:有事故记录的车转手时同样会被下家压价,所以1500的折扣其实不算深,这类车合理折价一般在同款的8-12%。检查通过的话,拿着Carfax这条记录再往下砍500-800完全合理,买它的逻辑是"折扣够深",不是"当没事故"。', '2026-02-17 09:45:00-05')
ON CONFLICT (id) DO NOTHING;

-- P40 discussion lease buyout (贝尔维尤Mia)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000040', 'a1000000-0000-0000-0000-000000000039', 'discussion', 'lease四月到期,买断划算还是还车', E'三年lease的SUV四月到期,合同上的buyout价格是24500。这车我开得很爱惜,3万迈整,没磕碰。\n查了下同款同里程市场挂价26000-27000,看起来买断小赚?但朋友说2026年二手车价一直在回落,买断价是三年前定的虚高残值。到底怎么判断?还有买断是不是还要交税和购置费,这些算进去还划算吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['lease','买断'], 'active', '2026-02-17 08:15:00-08', '2026-02-17 08:15:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000077', 'd0000000-0000-0000-0002-000000000040', 'a0000000-0000-0000-0000-000000000008', E'算法很简单:市场私卖价(不是dealer挂价,挂价虚,按retail减10%估)减去买断价加税费,差额为正就值得买断。你的情况:买断24500加华州销售税大约2500,总成本27000,跟挂价26-27k打平,不算捡漏但也不亏,而且你买的是一台自己知根知底的车,这个信息价值私以为值一两千。另外买断还省了还车时可能被挑的wear and tear费用。结论:自用继续开,买断合理;想套利转卖,没肉。', '2026-02-17 11:30:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000078', 'd0000000-0000-0000-0002-000000000040', 'a0000000-0000-0000-0000-000000000006', E'去年我lease到期就是买断的,逻辑跟楼上一样:知根知底四个字值钱。市场上两万多买台别人的车,车况是开盲盒。', '2026-02-17 15:50:00-08')
ON CONFLICT (id) DO NOTHING;

-- P41 showoff CR-V (皇后区Grace)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000041', 'a1000000-0000-0000-0000-000000000011', 'showoff', '人生第一台车!前辈们的建议全用上了', E'上周在这里问保险的新手就是我,今天正式提车啦:2019 CR-V EX,5万4千迈,一万九落地。\n从看车、砍价到保险,基本都是照着论坛攻略操作的:要了OTD、做了PPI、拒了一堆fee,保险bundle省了两百多。第一次觉得买车没被当韭菜。谢谢这个论坛,附上停车场第一张合影。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/HONDA_CR-V_FIFTH_GENERATION_HONG_KONG_%282%29.jpg/960px-HONDA_CR-V_FIFTH_GENERATION_HONG_KONG_%282%29.jpg'], NULL, NULL, NULL, ARRAY['提车','新手','CR-V'], 'active', '2026-02-17 12:40:00-05', '2026-02-17 12:40:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000079', 'd0000000-0000-0000-0002-000000000041', 'a0000000-0000-0000-0000-000000000004', E'恭喜Grace!从问保险到提车半个月,执行力满分。法拉盛的停车位就交给你自己修炼了哈哈。', '2026-02-17 15:20:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000080', 'd0000000-0000-0000-0002-000000000041', 'a1000000-0000-0000-0000-000000000009', E'攻略用出来才是自己的,恭喜!5万4的CR-V一万九在纽约是正常好价,没被宰,放心开。', '2026-02-18 09:10:00-05')
ON CONFLICT (id) DO NOTHING;

-- P42 discussion 高里程RX (盐湖城Ivy)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000042', 'a1000000-0000-0000-0000-000000000027', 'discussion', '12万迈的RX350卖一万四,敢不敢接', E'本地一个华人卖家出这台2016 RX350,12万迈,一万四,记录看着挺全,比车行同款便宜两千多。\n里程有点劝退,但都说雷车耐造。想听听懂车的:12万迈的RX350还能再战多少?接手后哪些保养是马上要做的?什么情况下该果断放弃?', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/2020_Lexus_RX_350_L_au_SIAM_2020.png/960px-2020_Lexus_RX_350_L_au_SIAM_2020.png'], NULL, NULL, NULL, ARRAY['高里程','雷克萨斯'], 'active', '2026-02-17 17:55:00-08', '2026-02-17 17:55:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000081', 'd0000000-0000-0000-0002-000000000042', 'a0000000-0000-0000-0000-000000000007', E'RX350的2GR发动机保养得当30万迈的我都修过(是来换水泵不是大修)。12万迈重点查三样:1) 水泵和正时罩渗漏,这代的常见小病;2) 变速箱油有没有换过,没换过的压价并接手就换;3) 悬挂胶套和减震,盐湖城的路加冬天的盐,底盘要趴下去看。放弃的信号:冷启动嗒嗒声不消失、变速箱换挡冲击、底盘锈得掉渣。前面三样都干净的话,一万四不贵,这车再战8万迈很正常。', '2026-02-17 21:10:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000082', 'd0000000-0000-0000-0002-000000000042', 'a0000000-0000-0000-0000-000000000001', E'参考我那台:2013年的,15万迈,一年杂费2600跑得欢。买高里程雷车的核心就一句:宁买记录全的高里程,不买没记录的低里程。', '2026-02-18 09:40:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000083', 'd0000000-0000-0000-0002-000000000042', 'a1000000-0000-0000-0000-000000000027', E'感谢两位!约了周六让技师朋友陪我去验,重点盯水泵、变速箱油和底盘锈,验完回来汇报。', '2026-02-18 12:30:00-08')
ON CONFLICT (id) DO NOTHING;

-- P43 discussion 正时链条皮带 (芝加哥风哥)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000043', 'a1000000-0000-0000-0000-000000000022', 'discussion', '买二手车,正时皮带这关怎么查', E'帮我妈看一台2014年的老凯美瑞,9万迈。朋友提醒我注意"正时皮带该换了",我一查这车好像是链条不是皮带?\n搞不懂了:1) 怎么查一台车用的是链条还是皮带?2) 皮带是不是必须按里程换,不换会怎样?3) 链条就真的终身不用管吗?买老车这块怎么避坑?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['正时','老车','避坑'], 'active', '2026-02-18 10:20:00-05', '2026-02-18 10:20:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000084', 'd0000000-0000-0000-0002-000000000043', 'a0000000-0000-0000-0000-000000000007', E'先说结论:2014凯美瑞的2.5(2AR-FE)是链条,你朋友多虑了。科普:1) 查法很简单,搜"车型+年份+timing chain or belt",或者看发动机代号;2) 皮带车必须按手册换,一般6-10万迈,连水泵一起干,600-1200刀,断了的话干涉式发动机气门顶活塞,直接大修,所以买皮带车必须要到更换凭证,没有就当没换过,砍掉这笔钱;3) 链条设计上免维护,但按时换机油是前提,机油脏了链条张紧器磨损,冷启动哗啦声就是前兆。老凯美瑞这块放心,查好机油记录就行。', '2026-02-18 13:40:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000085', 'd0000000-0000-0000-0002-000000000043', 'a1000000-0000-0000-0000-000000000024', E'补个反面教材:我同学买过一台本田Odyssey的V6,皮带车,卖家说换过拿不出单据,他信了。八千迈后皮带断,修发动机花了四千五。凭证凭证凭证。', '2026-02-19 09:20:00-05')
ON CONFLICT (id) DO NOTHING;

-- P44 guide 识别事故车 (修车匠Tony)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000044', 'a0000000-0000-0000-0000-000000000007', 'review', '修车匠教你五分钟看出事故车', E'收车前的快速检查,不用仪器也能筛掉八成问题车,顺序从外到里:\n\n1. 蹲车头看缝隙:引擎盖与翼子板、大灯的缝隙要左右对称,一边宽一边窄基本动过。\n2. 开引擎盖看螺丝:翼子板固定螺丝和铰链螺丝有没有拧动掉漆的痕迹,原厂螺丝的漆是完整的。\n3. 看大灯新旧:一边大灯清澈一边发黄,清澈那边多半换过,问为什么换。\n4. 摸焊点和胶条:掀开门框胶条看焊点,原厂点焊圆润均匀,钣金修复的焊点粗糙;水切胶条下面有打磨痕迹的要警惕。\n5. 后备箱掀地毯:看备胎槽,追尾修复最难藏的就是这里,褶皱不自然、有焊疤、防锈胶重新打过的都是信号。\n\n以上任何一条中招不代表一定是大事故,但代表你需要一次专业PPI加漆膜仪。五分钟的检查,省的可能是几千刀的学费。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['事故车','验车','攻略'], 'active', '2026-02-18 14:00:00-08', '2026-02-18 14:00:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000086', 'd0000000-0000-0000-0002-000000000044', 'a0000000-0000-0000-0000-000000000008', E'干货收藏。我再加一条第六:雨后去看车,打开四个门闻味道,地毯下进过水的霉味藏不住,水泡车比事故车更该跑。', '2026-02-18 17:30:00-08')
ON CONFLICT (id) DO NOTHING;

-- P45 discussion 玻璃水冻住 (塔科马老周)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000045', 'a1000000-0000-0000-0000-000000000040', 'discussion', '寒潮玻璃水冻住喷不出来,怎么救', E'塔科马这波寒潮,早上高速上前车溅一挡风玻璃泥水,按喷水杆只听见电机嗡嗡响,一滴都喷不出来,吓出一身汗靠雨刮干刮到下高速。\n应该是玻璃水冻住了,夏天图便宜加的蓝色大桶装。现在怎么把冻住的化开?直接倒热水进去行不行?以后加哪种不会冻?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['玻璃水','冬季用车'], 'active', '2026-02-18 19:10:00-08', '2026-02-18 19:10:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000087', 'd0000000-0000-0000-0002-000000000045', 'a1000000-0000-0000-0000-000000000007', E'西雅图老司机做法:把车开出去跑二十分钟或者停进暖车库,机舱温度会把水壶慢慢化开,化开后马上把旧的抽掉或喷光,换标着-20F的冬季配方。别倒开水,塑料壶和管路受不了骤热,化了还得修。', '2026-02-18 22:00:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000088', 'd0000000-0000-0000-0002-000000000045', 'a0000000-0000-0000-0000-000000000007', E'楼上说的对,补充:夏季玻璃水基本是水加一点清洁剂,零下必冻。冬季配方看瓶身防冻标号,西北选-20F的够用,五大湖那边建议-25F以下。壶化开后如果喷嘴还不出水,可能喷嘴处单独结冰,用别针通一下或者热毛巾捂喷嘴。另外雨刮干刮特别毁胶条,回头检查下胶条有没有刮出条纹。', '2026-02-19 08:30:00-08')
ON CONFLICT (id) DO NOTHING;

-- P46 discussion smog check (凤凰城Jerry)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000046', 'a1000000-0000-0000-0000-000000000025', 'discussion', '排放检测没过,亮P0420码,续牌卡住了', E'车牌这个月底到期,去做排放检测没过,报告说check engine灯亮,读出来是P0420。店里说可能要换催化器,报价1600,我当场心梗。\n这车平时开着一点问题没有。想问:P0420一定是催化器坏了吗?有没有便宜点的排查顺序?另外听说清了码马上去测可以蒙混过关,靠谱吗?牌照快到期了来得及吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['排放检测','故障码'], 'active', '2026-02-19 09:30:00-08', '2026-02-19 09:30:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000089', 'd0000000-0000-0000-0002-000000000046', 'a0000000-0000-0000-0000-000000000007', E'P0420是"催化器效率低于阈值",不等于催化器报废。排查顺序:1) 先查排气有没有漏气,法兰垫圈漏气几十刀就能解决误报;2) 下游O2传感器老化也会触发,一两百,比催化器便宜得多;3) 都排除了才考虑催化器,而且可以先试副厂件。清码蒙混那招别用:清码后车载电脑的readiness monitor全部归零,检测站一看monitor没ready直接拒测,还得老老实实开一两百迈让它重新自检。牌照来不及就先去MVD问延期或临时许可,别裸奔上路。', '2026-02-19 12:45:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000090', 'd0000000-0000-0000-0002-000000000046', 'a0000000-0000-0000-0000-000000000001', E'我那台老车前年P0420,最后就是换了个下游O2传感器,180刀搞定,到现在没复发。先别被1600吓到,按Tony的顺序来。', '2026-02-19 16:20:00-08')
ON CONFLICT (id) DO NOTHING;

-- P47 discussion 学生党5000预算 (纽约Vincent)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000047', 'a1000000-0000-0000-0000-000000000009', 'discussion', '学弟5000刀预算找代步车,怎么帮他挑', E'实验室新来的学弟预算5000全款想买台代步车,主要是从住处到学校加超市,一年后毕业可能就卖。\n这个预算在纽约上州能买到什么?是13-14年的高里程卡罗拉靠谱,还是可以看看同价位年份新点的韩系?这个价位买车最该防的坑是什么?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['学生党','低预算'], 'active', '2026-02-19 13:45:00-05', '2026-02-19 13:45:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000091', 'd0000000-0000-0000-0002-000000000047', 'a0000000-0000-0000-0000-000000000008', E'5000预算的铁律:车况大于车型,车型大于年份。优先12-15年的卡罗拉、Civic、马3,12-15万迈不可怕,要的是机油记录和一台没病的变速箱;同价位能买到年份新两年的韩系或美系,但这个价位的它们往往是被修怕了才卖。防坑三条:1) 留500做买后首检和小修,别5000全砸车价;2) 纽约上州的车必看底盘锈,锈穿刹车管线的直接放弃;3) 卖家不让PPI的一律pass。一年后卖,丰田本田还能回血七八成,这是隐藏优势。', '2026-02-19 17:20:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000092', 'd0000000-0000-0000-0002-000000000047', 'a1000000-0000-0000-0000-000000000010', E'纽约学生车老中介聊两句:这个价位多蹲教授和老美家庭的一手车,车况普遍比车行的好,Craigslist和大学的BBS比车行靠谱。冬天看车正好,毛病藏不住。', '2026-02-20 10:30:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000093', 'd0000000-0000-0000-0002-000000000047', 'a1000000-0000-0000-0000-000000000009', E'两位的建议都转给学弟了,先蹲教授二手卡罗拉,留500修车钱,底盘锈一票否决。谢啦!', '2026-02-20 14:15:00-05')
ON CONFLICT (id) DO NOTHING;

-- P48 showoff RAV4 Hybrid (西雅图雨神)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000048', 'a1000000-0000-0000-0000-000000000007', 'showoff', '雨城人民终于换了台混动RAV4', E'开了六年的老轿车光荣退役,换了这台2022 RAV4 Hybrid XLE,3万迈,两万七拿下。\n选它的理由很简单:西雅图一年下两百天雨,E-Four四驱心里稳;混动起步安静,早高峰520桥上蠕行不心疼油。周末去了趟Snoqualmie,湿滑路面稳稳的。北美神车名不虚传,真香。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Toyota_RAV4_Hybrid_%28XA50%29_DSC_2709.jpg/960px-Toyota_RAV4_Hybrid_%28XA50%29_DSC_2709.jpg'], NULL, NULL, NULL, ARRAY['提车','RAV4','混动'], 'active', '2026-02-19 18:20:00-08', '2026-02-19 18:20:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000094', 'd0000000-0000-0000-0002-000000000048', 'a1000000-0000-0000-0000-000000000039', E'贝尔维尤同款车主欢迎!雨天车道保持加ACC在520上跟车,通勤幸福感直接翻倍,你慢慢体会。', '2026-02-19 21:40:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000095', 'd0000000-0000-0000-0002-000000000048', 'a0000000-0000-0000-0000-000000000006', E'恭喜!参考我发的冬季油耗帖,短途多用座椅加热代替暖风,西雅图冬天也能保住35mpg以上。', '2026-02-20 09:15:00-08')
ON CONFLICT (id) DO NOTHING;

-- P49 discussion 火花塞 (达拉斯Lily)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000049', 'a0000000-0000-0000-0000-000000000005', 'discussion', '保养被推荐换火花塞,380刀正常吗', E'今天去做常规保养,店里说我这台车7万迈了建议换火花塞,报价380含工时。我印象里火花塞不是挺便宜的零件吗,一根十几二十刀?\n想确认下:1) 7万迈换火花塞是正常周期还是过度保养?2) 380这个价合理吗?3) 不换继续开会有什么症状?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['火花塞','保养'], 'active', '2026-02-20 08:40:00-05', '2026-02-20 08:40:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000096', 'd0000000-0000-0000-0002-000000000049', 'a0000000-0000-0000-0000-000000000007', E'看车型和塞子类型:现在大多数车原厂铱金塞,寿命10万迈左右,7万迈就换偏早,翻下你的保养手册,上面写多少就是多少。价格方面:四缸横置发动机换四个塞子是半小时的活,零件加工时200-250合理;但有些V6要拆进气歧管才够得着后排塞子,380-450是正常价。拖着不换的症状:冷启动抖、加速无力、油耗变差,最后可能点火线圈跟着遭殃。结论:先看手册,没到里程就明年再说。', '2026-02-20 11:50:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000097', 'd0000000-0000-0000-0002-000000000049', 'a1000000-0000-0000-0000-000000000019', E'动手党路线:四缸车自己换,塞子上Rockauto买原厂型号四五十刀,一个套筒加扭力扳手,YouTube跟着拧,一小时省三百。V6就算了,老实交钱。', '2026-02-20 15:30:00-05')
ON CONFLICT (id) DO NOTHING;

-- P50 chatter 停车场同款 (迈阿密Sunny)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000050', 'a1000000-0000-0000-0000-000000000018', 'discussion', '超市出来差点上错车,同款同色扎堆', E'今天在超市停车场,出来看到"我的车"旁边还停着一台一模一样的,同款同色连轮毂都一样,拿着钥匙愣了三秒不知道该按哪台。\n拍了张照留念。开大众脸车型的都有这经历吧?你们都靠什么认自己的车,车牌还是保险杠上的划痕?', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Mazda_CX-5_Newground_1X7A6786.jpg/960px-Mazda_CX-5_Newground_1X7A6786.jpg'], NULL, NULL, NULL, ARRAY['闲聊'], 'active', '2026-02-20 12:10:00-05', '2026-02-20 12:10:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000098', 'd0000000-0000-0000-0002-000000000050', 'a1000000-0000-0000-0000-000000000016', E'白色RAV4车主表示日常靠后视镜上挂的小狮子认车,有一回拉了三次别人的门把手,车主就在车里,社死。', '2026-02-20 16:40:00-05')
ON CONFLICT (id) DO NOTHING;

-- P51 discussion dealer加价 (休斯顿Nina)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000051', 'a1000000-0000-0000-0000-000000000020', 'discussion', '标价之外加2000市场调整费,合法吗', E'看中一台挂网上16800的二手混动,到店谈,报价单突然多出一行"market adjustment +2000",销售说这车抢手,网上标价不含这个。\n气笑了。这种操作合法吗?能投诉吗?还是说德州就这样,只能认?大家遇到过加价的怎么应对的?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['加价','避坑'], 'active', '2026-02-20 17:30:00-05', '2026-02-20 17:30:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000099', 'd0000000-0000-0000-0002-000000000051', 'a0000000-0000-0000-0000-000000000008', E'加价本身多数州不违法(标价虚假宣传另说),但2026年二月的二手车市场根本轮不到他们加价,这是纯粹试探你软不软。应对:1) 当场说"网上标价就是我出价的上限,拿掉调整费,否则我走",然后真的起身走;2) 走之前截图网上标价,给店的GM邮箱发一封,很多店会回来道歉给原价;3) 混动车源现在并不紧张,同城多问两家立刻有对比。记住淡季加价的店,砍掉调整费之后往往还能再谈。', '2026-02-20 20:45:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000100', 'd0000000-0000-0000-0002-000000000051', 'a1000000-0000-0000-0000-000000000028', E'维加斯这边疫情那两年加价成风,现在谁加价谁没生意。上个月我看车也碰到一家要加1500,我直接走,第二天销售打电话说"经理特批不加了"。腿是最好的谈判工具。', '2026-02-21 10:20:00-05')
ON CONFLICT (id) DO NOTHING;

-- P52 discussion PPI (尔湾Cindy)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000052', 'a1000000-0000-0000-0000-000000000004', 'discussion', '帮朋友问:卖家不让把车开去做PPI', E'朋友在谈一台私人卖家的车,想开去修车铺做pre-purchase inspection,卖家不同意车离开他的视线,说"你可以当面看,开走不行"。\n这要求过分吗?好像也能理解怕遇到骗子。这种情况怎么破:是让卖家跟车一起去,还是找上门检测的服务?上门PPI靠谱吗,一般多少钱?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['PPI','验车'], 'active', '2026-02-21 10:15:00-08', '2026-02-21 10:15:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000101', 'd0000000-0000-0000-0002-000000000052', 'a0000000-0000-0000-0000-000000000007', E'卖家不让车离开视线是合理的,他也怕碰上开走不回来的。两个都体面的方案:1) 约好时间,卖家自己把车开到买家指定的修车铺,买家出检测费,这是最常见的做法,正经卖家一般都答应;2) mobile PPI,技师带设备上门,加州大概150-250,举升不了但漆膜仪、OBD、试车都能做,能筛掉大部分问题。真正的红旗是两个方案都拒绝的卖家,那说明车经不起看,再便宜也撤。', '2026-02-21 13:30:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000102', 'd0000000-0000-0000-0002-000000000052', 'a0000000-0000-0000-0000-000000000008', E'补充:约铺检测时让朋友自己选铺子,别去卖家推荐的"熟人店"。检测报告出来的小毛病清单,正好是最后一轮砍价的弹药,PPI的钱基本都能砍回来。', '2026-02-21 16:50:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000103', 'd0000000-0000-0000-0002-000000000052', 'a1000000-0000-0000-0000-000000000004', E'转达给朋友了,卖家答应一起把车开去检测,约了周三。看来之前是我们把人想坏了哈哈,谢谢解答!', '2026-02-22 09:40:00-08')
ON CONFLICT (id) DO NOTHING;

-- P53 review Outback雪地 (波士顿学姐)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000053', 'a1000000-0000-0000-0000-000000000013', 'review', '新英格兰暴雪季,Outback表现汇报', E'去年秋天入的2020 Outback Premium,4万迈,专为波士顿的冬天买的。这个雪季连吃两场大雪,交作业。\n\n雪地表现:对称全时四驱不是玄学,积雪四五寸的小区路起步不打滑不心慌;地面残雪结冰的早晨,配合冬季胎走90号高速很稳。8.7寸离地间隙,铲车没来之前也敢出门,雪堆一冲就过。\n\n槽点也有:CVT低速有一点橡皮筋感;EyeSight在大雪糊住摄像头时会罢工报警,得停车擦;油耗冬天26mpg左右,对得起四驱但别指望混动水平。\n\n给东北同学的建议:四驱不是免死金牌,该换冬季胎还是要换,四驱管起步,刹车和转弯全靠胎。Outback加冬季胎这套组合,新英格兰过冬答案之一。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/2020_Subaru_Outback_AWD%2C_front.jpg/960px-2020_Subaru_Outback_AWD%2C_front.jpg'], 'Subaru', 'Outback', 2020, ARRAY['斯巴鲁','雪地','用车报告'], 'active', '2026-02-21 14:30:00-05', '2026-02-21 14:30:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000104', 'd0000000-0000-0000-0002-000000000053', 'a1000000-0000-0000-0000-000000000023', E'"四驱管起步,刹车转弯全靠胎"必须置顶。密歇根每年冬天第一场雪,沟里趴的一半是过于自信的四驱SUV。', '2026-02-21 18:20:00-05')
ON CONFLICT (id) DO NOTHING;

-- P54 showoff 老RX (奥兰多阿福)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000054', 'a1000000-0000-0000-0000-000000000017', 'showoff', '四千五收的2009 RX350,越开越香', E'预算有限,四千五从一位要回国的前辈手里接了这台2009 RX350,17万迈,记录塞满一个文件夹。\n收拾了一下:全车打蜡、换了四条二手胎、内饰深度清洁,焕然一新。开起来除了车机是古董,隔音舒适性吊打我朋友的新款买菜车。老雷车,yyds。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/2006-2009_and_2009-2012_Lexus_RX%27s_Station_Wagons_%282020-02-11%29.jpg/960px-2006-2009_and_2009-2012_Lexus_RX%27s_Station_Wagons_%282020-02-11%29.jpg'], NULL, NULL, NULL, ARRAY['老车','雷克萨斯','捡漏'], 'active', '2026-02-21 18:00:00-05', '2026-02-21 18:00:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000105', 'd0000000-0000-0000-0002-000000000054', 'a0000000-0000-0000-0000-000000000001', E'回国前辈的一手车加全套记录,这是二手市场的隐藏彩蛋,四千五血赚。这代RX开到25万迈的大有人在。', '2026-02-21 21:30:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000106', 'd0000000-0000-0000-0002-000000000054', 'a1000000-0000-0000-0000-000000000025', E'华人圈接回国前辈的车确实是捡漏正道,车况透明还带人情价。恭喜,记得把变速箱油也安排上。', '2026-02-22 10:45:00-05')
ON CONFLICT (id) DO NOTHING;

-- P55 discussion refinance (库比蒂诺码农)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000055', 'a1000000-0000-0000-0000-000000000005', 'discussion', '车贷利率7.9%,现在refinance能降吗', E'去年信用记录短,车贷只拿到7.9%,supposedly还了一年信用分从680涨到了755。剩余贷款还有两万一,36期。\n想问:1) 现在这个分数refinance大概能拿到什么利率?2) 去哪里refi比较好,原银行还是credit union?3) refi会拉hard inquiry,对信用分影响大吗?有没有手续费之类的隐藏成本?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['车贷','refinance'], 'active', '2026-02-22 09:50:00-08', '2026-02-22 09:50:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000107', 'd0000000-0000-0000-0002-000000000055', 'a0000000-0000-0000-0000-000000000008', E'755分二手车refi现在大致能看到5.5-6.5%,两万一的余额降两个点,36期总利息省七八百。渠道:credit union通常最狠,一次申请三四家(PenFed、本地CU、Navy Fed如果够格),集中在14天内申请,征信模型会把同类hard pull算作一次购物行为,影响很小。注意两点:1) 看清有没有手续费和lien转移费,一般50-100;2) 别为了月供好看把36期refi成60期,那是把省的利息又还回去了。', '2026-02-22 13:20:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000108', 'd0000000-0000-0000-0002-000000000055', 'a0000000-0000-0000-0000-000000000003', E'去年我从8.2%refi到5.9%,就是本地credit union,线上申请第二天出结果,全程没去网点。记得refi后确认旧贷款账户显示paid off,别影响记录。', '2026-02-22 17:45:00-08')
ON CONFLICT (id) DO NOTHING;

-- P56 discussion 老车全险 (留学生Kevin)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000056', 'a0000000-0000-0000-0000-000000000002', 'discussion', '13年的老Civic,全险还有必要吗', E'我的2013 Civic现在市值也就五千左右,全险一个月要165,其中collision和comprehensive占了将近一半。朋友说这种老车早该只留liability,省下的钱存着换车。\n但我又怕真撞了或者被偷,一分拿不到。这个账怎么算?什么情况下该降成liability only?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保险','老车'], 'active', '2026-02-22 13:25:00-08', '2026-02-22 13:25:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000109', 'd0000000-0000-0000-0002-000000000056', 'a0000000-0000-0000-0000-000000000008', E'通用算法:car value除以(collision+comprehensive年保费),小于10就该认真考虑drop。你的情况:车值5000,这两项年保费约950,比值5出头,教科书级的该降。降了之后风险自担的上限就是车价五千,而你每年确定省下九百多。两个不能省的:liability限额别降反该买高(撞了别人才是无底洞),uninsured motorist留着(加州无保险司机不少)。另外自付额转念一想:全险出险一次保费还要涨,老车小刮蹭你本来也不会走保险。', '2026-02-22 16:40:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000110', 'd0000000-0000-0000-0002-000000000056', 'a0000000-0000-0000-0000-000000000001', E'我家那台2011年的买菜车三年前就只留liability加UM了,省下的保费早超过车价的一半。心态就是:真撞报废就当它光荣退休。', '2026-02-23 09:30:00-08')
ON CONFLICT (id) DO NOTHING;

-- P57 guide 留学生保险省钱 (避坑酱)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000057', 'a0000000-0000-0000-0000-000000000008', 'review', '留学生车险太贵?七个合法省钱开关', E'留学生没有美国驾驶记录,车险经常被报到两三百一个月,但下面这些开关每个都能拧下来一点:\n\n1. 好学生折扣:全日制GPA 3.0以上,大部分公司给10-15%off,发成绩单就行,很多人不知道。\n2. 防御性驾驶课:线上几十刀几个小时,纽约等州强制给折扣,一次管三年。\n3. 提高deductible:从500到1000,保费立降,前提是存款里真有这1000。\n4. 里程申报:学生年里程普遍低,如实报5000-7000迈比默认12000便宜;开得少的直接看按里程计费的保险。\n5. bundle:和renters insurance绑定,两边都打折,renters本身一个月才十几刀。\n6. 每半年shop一轮:学生保费下降最快,续保时旧公司不会主动给你降价,新报价会。\n7. 车型选对:保险对车型极其敏感,同预算Corolla和某些"运动款"保费能差一倍,买车前先要保险报价再定车。\n\n最后提醒:别为了便宜买最低liability限额,人在国外,赔偿官司伤不起,15/30这种最低配不如加点钱上50/100。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['留学生','保险','攻略'], 'active', '2026-02-22 19:40:00-08', '2026-02-22 19:40:00-08')
ON CONFLICT (id) DO NOTHING;

-- P58 discussion registration迟交 (洛杉矶Amy)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000058', 'a1000000-0000-0000-0000-000000000002', 'discussion', '注册续费忘了俩月,罚款还吃了ticket', E'年底搬家太乱,车的registration十二月就到期了我完全没注意,前天贴条了:expired registration。\n现在去DMV续的话,迟了两个月罚款会翻倍吗?那张ticket是不是另算?听说续上之后拿证明去可以减免?求加州老司机指路,还有什么补救的先后顺序。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['registration','罚单'], 'active', '2026-02-23 08:30:00-08', '2026-02-23 08:30:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000111', 'd0000000-0000-0000-0002-000000000058', 'a0000000-0000-0000-0000-000000000001', E'先说DMV:加州迟交罚金是阶梯的,拖得越久比例越高,两个月大概是原费用加百分之几十的penalty,网上登录DMV账户直接续,金额系统会算好,不用跑线下。动作要快,再拖到半年一年罚金还会跳档。', '2026-02-23 11:20:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000112', 'd0000000-0000-0000-0002-000000000058', 'a0000000-0000-0000-0000-000000000008', E'ticket那边:expired registration在加州通常是correctable violation(俗称fix-it ticket),你把registration续好,按ticket上的指示让警局或法院核验改正证明,罚金就从一百多降到25刀左右的手续费。顺序:先续费拿到新贴纸,再处理ticket,别反过来拖过ticket期限,那就变成真罚款加追加费了。', '2026-02-23 14:45:00-08')
ON CONFLICT (id) DO NOTHING;

-- P59 discussion 停车场被刮 (圣何塞Jason)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000059', 'a1000000-0000-0000-0000-000000000006', 'discussion', '新车停车场被刮,对方跑了,咽不下这口气', E'提车才俩月,今天下班发现后翼子板一道深划痕带凹陷,对方拍拍屁股走了,连个条都没留。\n估了下修漆加钣金要1200左右。想问:1) 这种hit and run报警有用吗,商场停车场的监控能调吗?2) 走自己保险的话算哪一类,保费会涨吗?3) deductible 500,自己修还是走保险怎么选?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['被刮','保险理赔'], 'active', '2026-02-23 12:45:00-08', '2026-02-23 12:45:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000113', 'd0000000-0000-0000-0002-000000000059', 'a0000000-0000-0000-0000-000000000008', E'按顺序:1) 先找商场客服问监控,大部分商场只配合警方,所以顺手线上报个police report,拍到肇事车牌就能走对方保险,一分不用出;2) 找不到人的话,停放中被撞走你自己的collision,加州对not-at-fault理赔原则上不该涨费率,但出险记录会留在CLUE上;3) 算账:1200的修理走保险你出500的deductible,保险出700,为这700留一条记录,值不值自己掂量。我的建议是先拿两三家修理厂报价,华人钣金店这种活可能800就下来了,差价缩小就自费,保记录干净。', '2026-02-23 16:30:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000114', 'd0000000-0000-0000-0002-000000000059', 'a1000000-0000-0000-0000-000000000029', E'同款遭遇过,监控调出来是斜对面倒车拉的,对方保险全赔。所以别嫌麻烦,报警加找监控真的有戏,商场一般存7-30天,动作要快。', '2026-02-23 20:15:00-08')
ON CONFLICT (id) DO NOTHING;

-- P60 showoff CX-5 (密歇根Anna)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000060', 'a1000000-0000-0000-0000-000000000023', 'showoff', '雪窝子里提了台CX-5四驱,冲雪无压力', E'老家伙终于在这个冬天寿终正寝,咬牙上了台2021 CX-5 AWD,3万9千迈,一万九千八。\n密歇根提车当天就是雪,i-Activ四驱加一套新换的雪胎,小区没铲雪的路直接碾过去,幸福感爆棚。就是红色车在雪地里太显眼,洗车频率估计要翻倍了。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/2017_Mazda_CX-5_%28KF%29_Maxx_2WD_wagon_%282018-11-02%29_01.jpg/960px-2017_Mazda_CX-5_%28KF%29_Maxx_2WD_wagon_%282018-11-02%29_01.jpg'], NULL, NULL, NULL, ARRAY['提车','马自达','雪地'], 'active', '2026-02-23 17:20:00-05', '2026-02-23 17:20:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000115', 'd0000000-0000-0000-0002-000000000060', 'a1000000-0000-0000-0000-000000000022', E'芝加哥邻居恭喜!雪州开车记得常冲底盘,融雪盐不跟你客气,开春去做个fluid film底盘更安心。', '2026-02-23 20:40:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000116', 'd0000000-0000-0000-0002-000000000060', 'a1000000-0000-0000-0000-000000000033', E'CX-5大家庭又添一员!红色显眼是优点,雪天别人离你远远的,被动安全拉满哈哈。', '2026-02-24 09:30:00-05')
ON CONFLICT (id) DO NOTHING;

-- P61 discussion 冬季胎 (丹佛高原红)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000061', 'a1000000-0000-0000-0000-000000000026', 'discussion', '丹佛通勤党,全季胎真的不够用吗', E'我的车现在是一套全季胎,平时市区通勤没觉得有问题,但每次去滑雪场I-70爬坡都开得心惊胆战,上周还目睹一台SUV原地打滑横在路中间。\n纠结要不要单买一套冬季胎加钢圈,一套下来八九百。就丹佛这种市区少雪、上山暴雪的气候,值吗?还是升级一套顶级全季胎就够了?附一张我车的近照。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/White_2020_Subaru_Outback_rear.jpg/960px-White_2020_Subaru_Outback_rear.jpg'], NULL, NULL, NULL, ARRAY['冬季胎','滑雪'], 'active', '2026-02-24 09:15:00-08', '2026-02-24 09:15:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000117', 'd0000000-0000-0000-0002-000000000061', 'a0000000-0000-0000-0000-000000000007', E'技术账:全季胎的橡胶在45华氏度以下开始变硬,抓地力下降,再顶级的全季也改变不了配方物理。你的使用画像是关键:一个雪季上山几次?超过五六次,八九百的冬胎加钢圈摊下来每次不到几十刀,买的是刹车距离缩短二三成;偶尔去一两次,可以考虑带一副链条应急加挑雪地评分高的全季。另外注意I-70雪天有traction law,全季胎花纹不够深的车查到要罚款,冬胎顺便把合规也解决了。', '2026-02-24 12:30:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000118', 'd0000000-0000-0000-0002-000000000061', 'a1000000-0000-0000-0000-000000000027', E'盐湖城滑雪党现身:三年前上了冬胎就再没回头,山路下坡踩刹车那一下的信心完全不一样。买便宜钢圈自己在家换,每年就是俩小时的事。', '2026-02-24 16:45:00-08')
ON CONFLICT (id) DO NOTHING;

-- P62 review CR-V Hybrid 2022 (弗里蒙特Tiger)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000062', 'a1000000-0000-0000-0000-000000000031', 'review', 'CR-V混动一年两万迈,通勤党真实账本', E'2022 CR-V Hybrid入手一年整,通勤弗里蒙特到南湾,单程22迈,跑了两万迈,晒账本。\n\n油费:全年平均38mpg(市区40+,高速84号风大的时候35),两万迈油费约2400,同事同款汽油版年油费3400左右,一年差出一千。\n\n保养:两次机油加一次轮胎换位,不到300,混动的刹车片因为动能回收几乎无磨损,省钱点之一。\n\n体验:市区电机起步安静顺滑,堵车蠕行是混动的主场;高速超车发动机嘶吼声不好听,但速度是给到的;后备箱和后排依旧是CR-V的看家本领。\n\n小毛病:车机偶尔蓝牙抽风,重启解决;冬天早上纯电模式撑不了多久,正常现象。\n\n结论:每天40迈以上通勤的,混动版多花的差价两三年就回本,闭眼推荐。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/HONDA_CR-V_HYBRID_FIFTH_GENERATION_China.jpg/960px-HONDA_CR-V_HYBRID_FIFTH_GENERATION_China.jpg'], 'Honda', 'CR-V', 2022, ARRAY['CR-V','混动','通勤'], 'active', '2026-02-24 13:40:00-08', '2026-02-24 13:40:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000119', 'd0000000-0000-0000-0002-000000000062', 'a1000000-0000-0000-0000-000000000004', E'和我那台的表现基本一致,刹车片零磨损这点真的被低估了,油钱之外的隐形省钱。通勤党加一票混动。', '2026-02-24 17:20:00-08')
ON CONFLICT (id) DO NOTHING;

-- P63 discussion CVT可靠性 (新泽西Leo)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000063', 'a1000000-0000-0000-0000-000000000012', 'discussion', '预算内最合适的是台Rogue,但CVT劝退?', E'一万五预算,配置里程最合适的是一台2020 Nissan Rogue,但网上一搜全是"日产CVT三大件杀手"的帖子,又看到有人说新款早改进了,是老黄历。\n到底现在的日产CVT什么水平?买二手的怎么判断变速箱状态?同预算是不是宁可买台里程高点的丰田本田?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['CVT','日产','选车'], 'active', '2026-02-24 18:30:00-05', '2026-02-24 18:30:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000120', 'd0000000-0000-0000-0002-000000000063', 'a0000000-0000-0000-0000-000000000007', E'修车铺视角:日产CVT最黑的是07-13那批,后面逐代改进,2020的Rogue没有当年那么邪乎,但耐久性口碑仍然排在丰田本田之后,我铺里进的CVT大修十台有六台是日产。买它的话:1) 试驾上高速,匀速再深踩,听有没有拖拉的嗡嗡声和转速乱窜;2) 冷车起步看有没有顿挫和打滑感;3) 问CVT油换过没有,3-4万迈一换是保命符;4) 谈价时把"CVT风险溢价"砍进去,同配置比丰田便宜两千才有性价比。预算实在紧,高一两万迈的RAV4我个人更放心。', '2026-02-24 21:20:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000121', 'd0000000-0000-0000-0002-000000000063', 'a0000000-0000-0000-0000-000000000008', E'补一个残值角度:同年份Rogue比RAV4便宜是市场投票的结果,买的时候便宜卖的时候一样便宜。它不是不能买,是必须买得足够便宜。Tony说的便宜两千是底线。', '2026-02-25 09:40:00-05')
ON CONFLICT (id) DO NOTHING;

-- P64 discussion 混动省多少 (圣塔克拉拉Ray)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000064', 'a1000000-0000-0000-0000-000000000038', 'discussion', '每天通勤100迈,换混动一年能省多少油钱', E'新工作通勤单程50迈,一天100迈,现在开的车高速也就29mpg,加州油价快5刀,每月油钱肉疼。\n认真考虑换混动,但混动二手价普遍贵两三千。帮我算算:这个通勤强度下混动一年能省多少?几年回本?还是干脆一步到位看插电或者纯电?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['混动','通勤','油费'], 'active', '2026-02-25 08:50:00-08', '2026-02-25 08:50:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000122', 'd0000000-0000-0000-0002-000000000064', 'a0000000-0000-0000-0000-000000000006', E'帮你算:一年通勤按250个工作日是25000迈。现在29mpg,油价4.8:25000/29*4.8约4140刀;换台46mpg的混动:25000/46*4.8约2610刀,一年省1500露头。混动贵的两三千,两年内就回本,你这种里程是混动的最佳客户画像。附赠:混动刹车片省、发动机负荷小,长期维护也占优。', '2026-02-25 11:40:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000123', 'd0000000-0000-0000-0002-000000000064', 'a1000000-0000-0000-0000-000000000001', E'一天100迈的话纯电也可以认真看:家里能装充电桩的话,夜间电价充电百迈成本三四刀,比混动的油钱还砍一半。但没有home charging就别勉强,公共快充又贵又费时间,还是混动稳。', '2026-02-25 15:20:00-08')
ON CONFLICT (id) DO NOTHING;

-- P65 showoff Outback (塔科马老周)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000065', 'a1000000-0000-0000-0000-000000000040', 'showoff', '被寒潮整怕了,换了台Outback', E'前阵子玻璃水冻住那位就是我。老车这个冬天毛病不断,一咬牙换了,2020 Outback,4万5千迈,两万一。\n塔科马这种又湿又偶尔来场雪的地方,四驱加高离地是真踏实。周末拉着钓具去了趟海边,后备箱平整度好评。老车站好最后一班岗,新伙计接棒。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/White_2020_Subaru_Outback_rear.jpg/960px-White_2020_Subaru_Outback_rear.jpg'], NULL, NULL, NULL, ARRAY['提车','斯巴鲁'], 'active', '2026-02-25 12:20:00-08', '2026-02-25 12:20:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000124', 'd0000000-0000-0000-0002-000000000065', 'a1000000-0000-0000-0000-000000000008', E'波特兰Outback车主欢迎!这车装钓具露营装备是真能装,记得第一时间把冬季玻璃水安排上,哈哈。', '2026-02-25 15:40:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000125', 'd0000000-0000-0000-0002-000000000065', 'a1000000-0000-0000-0000-000000000007', E'从玻璃水冻住到提新车,这波剧情推进可以的。西北四件套:斯巴鲁、雨衣、咖啡、钓竿,你已集齐一半。', '2026-02-26 09:20:00-08')
ON CONFLICT (id) DO NOTHING;

-- P66 discussion title有lien (埃尔蒙特小马)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000066', 'a1000000-0000-0000-0000-000000000037', 'discussion', '卖家车贷没还完,title在银行,能买吗', E'谈好一台一万六的车,临付款卖家才说贷款还剩七千没还清,title在他的贷款银行那里,让我"先把钱给他,他去还清贷款再把title寄给我"。\n这话听着就悬。这种带lien的车正确的交易姿势是什么?是不是要去银行一起办?如果他还不上钱title拿不出来,我的钱不就打水漂了?求指导,这车我还挺想要的。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['lien','私卖','过户'], 'active', '2026-02-25 17:45:00-08', '2026-02-25 17:45:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000126', 'd0000000-0000-0000-0002-000000000066', 'a0000000-0000-0000-0000-000000000008', E'你的直觉是对的,"先给钱后寄title"绝对不行。正确姿势:1) 让卖家找银行开一份10-day payoff quote,写明还清贷款的确切金额;2) 约在他的贷款银行网点,你直接把payoff金额付给银行(不是给他),剩余差额给卖家,银行当场或几个工作日内出lien release和title;3) 三方都留书面记录,写清楚title寄给谁。银行是全国连锁的话本地分行就能办。卖家如果不肯配合走银行,只肯私下收钱,这车再喜欢也放弃,lien没解除的车过不了户,钱车两空的案例年年有。', '2026-02-25 20:50:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000127', 'd0000000-0000-0000-0002-000000000066', 'a1000000-0000-0000-0000-000000000035', E'去年买过一台带lien的,就是三方去的银行,我付给银行八千payoff,给卖家四千,前后一小时,两周后title寄到我家。流程走对了其实很顺。', '2026-02-26 10:30:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000128', 'd0000000-0000-0000-0002-000000000066', 'a1000000-0000-0000-0000-000000000037', E'明白了,payoff直接付银行,差额给人,不走这个流程就不买。多谢救命,差点就转账了。', '2026-02-26 14:20:00-08')
ON CONFLICT (id) DO NOTHING;

-- P67 discussion salvage拍卖车 (达拉斯德州哥)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000067', 'a1000000-0000-0000-0000-000000000019', 'discussion', 'Copart拍卖车便宜一半,这水有多深', E'刷Copart看到同款车拍卖价只要市场一半,心动了。朋友里有人靠拍事故车修好转卖赚了些,也有人劝我普通人别碰。\n想听真话:1) salvage title的车修好后自己开,有什么长期麻烦?2) 保险是不是很难买全险?3) rebuilt title以后卖车是不是没人接盘?有没有那种"轻微事故大折扣"的捡漏可能?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['拍卖车','salvage'], 'active', '2026-02-26 09:30:00-05', '2026-02-26 09:30:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000129', 'd0000000-0000-0000-0002-000000000067', 'a0000000-0000-0000-0000-000000000007', E'实话:那一半差价是留给会修车、有场地、有渠道的人赚的,不是留给消费者省的。拍卖车你看不到发动机能不能着、变速箱走不走,图片里"小剐蹭"拆开可能是纵梁弯。普通人算总账:拍卖价加运费加修理加rebuilt inspection,经常追平市场价七八成,承担的却是无质保加保险歧视(很多公司rebuilt只给liability,给全险的赔付也按残值打折)加转手困难。真想省钱,不如买有小事故记录但clean title的车,折价10%,风险可控。Copart那是行业,不是捡漏。', '2026-02-26 12:40:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000130', 'd0000000-0000-0000-0002-000000000067', 'a0000000-0000-0000-0000-000000000008', E'补个数据:rebuilt title的车市场行情大致是同款clean title的六到七折,你转卖时买家还会拿这个死命压价,流动性差很多。你朋友赚钱靠的是自己的工时不要钱,你要按市场价付工时,账就倒挂了。', '2026-02-26 16:20:00-05')
ON CONFLICT (id) DO NOTHING;

-- P68 guide 私卖流程 (尔湾老王)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000068', 'a0000000-0000-0000-0000-000000000001', 'review', '自己卖车比trade-in多卖两千,流程实录', E'上个月把家里的旧车私卖了,dealer trade-in报11000,私卖最后13200成交,把流程记下来给想多卖两千的朋友。\n\n准备(一周):洗车打蜡加内饰清洁花了80,手机拍了25张照片(外观各角度、内饰、仪表盘里程、发动机舱、瑕疵特写都拍,瑕疵主动拍出来反而少浪费口舌);把保养记录整理成一个PDF。\n\n挂车:发在Facebook Marketplace、Craigslist和本站,定价参考KBB私卖价上浮5%留砍价空间。写清楚:里程、事故史、瑕疵、只收cashier check或柜台交易。\n\n筛人:回复里九成是废话和压价党,只理会问具体问题、愿意约看车的。看车约在银行或警局停车场,白天。试驾让对方出示驾照拍照,我坐副驾。\n\n成交:第三个看车的当场定了,一起去他的银行柜台办的款,当面签title和bill of sale,当晚就在DMV网站提交了release of liability。\n\n总耗时两周,多赚两千二,时薪不错。嫌麻烦的trade-in也不丢人,但差价自己心里要有数。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['私卖','卖车攻略'], 'active', '2026-02-26 14:15:00-08', '2026-02-26 14:15:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000131', 'd0000000-0000-0000-0002-000000000068', 'a1000000-0000-0000-0000-000000000014', E'"瑕疵主动拍出来"这条深有体会,我卖车时藏着掖着,看车的当场发现反而砍得更狠。坦诚是最好的定价策略。', '2026-02-26 18:30:00-05')
ON CONFLICT (id) DO NOTHING;

-- P69 discussion 回国回来电瓶 (布鲁克林老陈)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000069', 'a1000000-0000-0000-0000-000000000010', 'discussion', '回国过年三周,回来车打不着了', E'回国过了个年,车停在路边三个星期,昨晚落地今早一拧钥匙:哒哒哒,仪表灯全暗。叫了邻居jump了一下勉强着了。\n问题:1) jump着了之后要开多久才能把电充回来?2) 这块电瓶四年了,是不是直接换掉更省心?3) 以后每年回国一个月,怎么防止再趴窝,拔负极靠谱吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['电瓶','回国'], 'active', '2026-02-26 19:50:00-05', '2026-02-26 19:50:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000132', 'd0000000-0000-0000-0002-000000000069', 'a0000000-0000-0000-0000-000000000007', E'1) jump后至少连续开30-45分钟(别怠速停在那,上路开),但深度亏电一次对电瓶伤害很大,充回来也元气大伤;2) 四年加一次深度亏电,我建议直接去auto parts店做个免费load test,大概率数据难看,一百来刀换了,省得寒潮天把你撂在路上;3) 长期停车方案按条件选:有车库有插座就买个二三十刀的trickle charger维持电,最省心;停路边就拔负极(记好收音机和座椅设置会重置),或者拜托朋友每周帮你开二十分钟。纽约停路边还要考虑扫街挪车,这个比电瓶还难办哈哈。', '2026-02-26 22:40:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000133', 'd0000000-0000-0000-0002-000000000069', 'a0000000-0000-0000-0000-000000000004', E'法拉盛同款经历,回国党标配剧情。我现在的方案是回国前把车停朋友家车道插涓流充电器,给他带包国内零食当停车费,双赢。', '2026-02-27 09:15:00-05')
ON CONFLICT (id) DO NOTHING;

-- P70 chatter 回国罚单 (圣盖博阿强)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000070', 'a1000000-0000-0000-0000-000000000003', 'discussion', '回国半个月,信箱里躺着三张扫街罚单', E'过年回国半个月,车停在家门口的街上,忘了这条街每周四上午扫街。回来打开信箱,三张罚单齐刷刷,一张73,三张219刀,过个年的红包全交给市政府了。\n血的教训:回国前要么停车库,要么把扫街日历刻在脑门上。大家有没有更惨的,来安慰安慰我。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['罚单','回国','闲聊'], 'active', '2026-02-27 10:40:00-08', '2026-02-27 10:40:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000134', 'd0000000-0000-0000-0002-000000000070', 'a1000000-0000-0000-0000-000000000002', E'安慰你一下:我同事回国一个月,车被拖走了,拖车费加存车费五百多,取车时还发现电瓶没电。你这219刀还算温柔的。', '2026-02-27 13:20:00-08')
ON CONFLICT (id) DO NOTHING;

-- P71 discussion 机油标号 (萨克拉门托Ken)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000071', 'a1000000-0000-0000-0000-000000000030', 'discussion', '手册写0W-20,店里劝我加5W-30,听谁的', E'今天去一家快修店换机油,技师说我这车9万迈了,"老发动机加稠一点的5W-30更好,密封性好不烧机油",但用户手册白纸黑字写0W-20。\n到底听手册的还是听老师傅的?高里程车换稠机油这个说法有依据吗?加错标号会伤发动机吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['机油','保养'], 'active', '2026-02-27 14:20:00-08', '2026-02-27 14:20:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000135', 'd0000000-0000-0000-0002-000000000071', 'a0000000-0000-0000-0000-000000000007', E'听手册的。0W-20不是随便定的,现代发动机的油道、可变气门机构、机油泵都按这个粘度设计,换稠了低温流动性差,冷启动那几秒的磨损反而变大,油耗也会涨。"老车加稠油"只在一种情况下有点道理:发动机已经明显烧机油或者油压偏低,靠稠油续命,那是治标的姑息疗法,不是保养。你这台9万迈不烧机油的话,继续0W-20,可以选带high mileage配方的(多点密封件养护剂),标号不变。快修店劝你换稠油,有时候只是因为5W-30桶装的成本低。', '2026-02-27 17:30:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000136', 'd0000000-0000-0000-0002-000000000071', 'a0000000-0000-0000-0000-000000000001', E'同意楼上。我的原则:发动机的事,写手册的工程师比柜台的师傅懂这台车。我那台15万迈的雷车一直按手册标号,不烧不漏。', '2026-02-28 09:20:00-08')
ON CONFLICT (id) DO NOTHING;

-- P72 review F-150 2021 (奥斯汀Ethan)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000072', 'a1000000-0000-0000-0000-000000000021', 'review', 'F-150开满一年:装修党的真实记录', E'去年买房开始折腾装修,入了台2021 F-150 XLT 2.7 EcoBoost,一年下来两万迈,给想上皮卡的华人朋友一份实录。\n\n拉过的货:全套橱柜、40袋mulch、一台洗衣机一台烘干机、若干次Home Depot木材,还帮朋友搬了三次家。5.5尺斗加tailgate放平,基本没有装不下的家庭需求,租U-Haul的钱一年省了大几百。\n\n油耗:空载高速21mpg,市区17,拉重货14-15,2.7比3.5省一点但拉满时要舍得踩。\n\n使用成本:全险比轿车贵了30%左右,轮胎大,一套四条比轿车贵小一半,这些买前要有预期。\n\n缺点:长度接近20尺,市区停车是修行,老小区车位塞不下;雨天空载后轮容易滑,后斗压两袋沙有改善。\n\n结论:有房有院子有装修需求,皮卡是工具属性拉满的正确答案;纯城市通勤就别凑热闹了。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Ford_F-150_%28fourteenth_generation%29_Rutesheimer_Autoschau_2025_DSC_9231.jpg/960px-Ford_F-150_%28fourteenth_generation%29_Rutesheimer_Autoschau_2025_DSC_9231.jpg'], 'Ford', 'F-150', 2021, ARRAY['皮卡','用车报告'], 'active', '2026-02-27 18:10:00-05', '2026-02-27 18:10:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000137', 'd0000000-0000-0000-0002-000000000072', 'a1000000-0000-0000-0000-000000000019', E'达拉斯F-150车友认证,句句属实。补一条:雨天空载滑那个,切到4A四驱模式(如果有)基本解决,没有的话后斗压沙袋是老办法。', '2026-02-27 21:30:00-05')
ON CONFLICT (id) DO NOTHING;

-- P73 showoff RAV4 (休斯顿Nina)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000073', 'a1000000-0000-0000-0000-000000000020', 'showoff', '拒了加价那家,别家提到了心仪的车', E'之前发帖吐槽被加2000市场调整费的就是我。听大家的话扭头就走,一周内问了另外三家,昨天用比那家标价还低300的OTD提到了同款:2021 RAV4 XLE,3万6千迈。\n事实证明:二月的买家挺直腰杆就是最大的筹码。感谢论坛的各位!', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/2021_Toyota_RAV4_PHV.jpg/960px-2021_Toyota_RAV4_PHV.jpg'], NULL, NULL, NULL, ARRAY['提车','RAV4','砍价'], 'active', '2026-02-27 20:30:00-05', '2026-02-27 20:30:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000138', 'd0000000-0000-0000-0002-000000000073', 'a0000000-0000-0000-0000-000000000005', E'这剧情爽文级别,加价那家现在肯定后悔了。恭喜提车,德州姐妹给你点赞!', '2026-02-27 22:40:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000139', 'd0000000-0000-0000-0002-000000000073', 'a1000000-0000-0000-0000-000000000021', E'"挺直腰杆就是最大的筹码",这句话应该刻在每个买车人的手机壁纸上。恭喜!', '2026-02-28 09:50:00-05')
ON CONFLICT (id) DO NOTHING;

-- P74 discussion OTD报价 (长岛Sophia)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000074', 'a1000000-0000-0000-0000-000000000036', 'discussion', '发邮件要OTD报价,十家有八家不回', E'学着论坛攻略给十家dealer发邮件要out-the-door报价,写明了车型预算和购买时间。结果两天过去,只有两家回了,其中一家还是让我"来店里详谈"的废话。\n是我邮件写得不对,还是这招已经失效了?怎么写才能让他们乖乖报数?打电话会不会更有效?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['OTD','砍价'], 'active', '2026-02-28 09:20:00-05', '2026-02-28 09:20:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000140', 'd0000000-0000-0000-0002-000000000074', 'a0000000-0000-0000-0000-000000000008', E'不回的原因通常是邮件太泛。提高回复率的写法:1) 发给internet sales或fleet部门,不是通用邮箱,他们靠线上成交吃饭;2) 指名具体库存:写上网站上那台车的stock number和VIN,证明你不是海撒;3) 给出行动承诺:"OTD合适,本周六到店签字提车";4) 最后一句写"已联系多家,只比OTD总价"。这样写完基本一半以上会回。已读不回的和只会说"来店里聊"的,直接淘汰,这种店进门也是磨你三小时的路数。', '2026-02-28 12:30:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000141', 'd0000000-0000-0000-0002-000000000074', 'a1000000-0000-0000-0000-000000000028', E'我上次是邮件加一通电话跟进,电话里就一句"我邮件里要的OTD今天能给吗,别家已经给了",下午报价就来了。邮件留痕,电话催命,组合拳。', '2026-02-28 15:20:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000142', 'd0000000-0000-0000-0002-000000000074', 'a1000000-0000-0000-0000-000000000036', E'原来要写stock number和到店承诺,我那封确实写得太空泛了。今晚重写一版发出去,谢谢两位!', '2026-02-28 18:40:00-05')
ON CONFLICT (id) DO NOTHING;

-- P75 discussion Uber用车 (迈阿密Sunny)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000075', 'a1000000-0000-0000-0000-000000000018', 'discussion', '想周末跑Uber贴补油钱,买什么车合适', E'正职之外想周末跑跑Uber赚点外快。现在的车是两门coupe,不符合平台要求,正好想换。\n预算一万五,跑Uber的车该怎么选?是不是无脑混动?平台对车龄有要求吗?还有跑网约车保险是不是要加钱,车损耗大不大,会不会赚的还没折旧多?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['Uber','网约车','选车'], 'active', '2026-02-28 12:40:00-05', '2026-02-28 12:40:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000143', 'd0000000-0000-0000-0002-000000000075', 'a0000000-0000-0000-0000-000000000001', E'跑单车公式:油耗低+后排大+皮实+保有量大(配件便宜)。一万五预算闭眼看混动凯美瑞或者普锐斯,迈阿密机场单多,一天省下的油钱是实打实的。平台车龄要求各城市不同,迈阿密一般15年内、四门、无salvage,注册前去Uber页面查清楚。', '2026-02-28 15:30:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000144', 'd0000000-0000-0000-0002-000000000075', 'a0000000-0000-0000-0000-000000000007', E'成本这块给你泼点冷静水:1) 保险必须告知保险公司加rideshare endorsement,一个月多二三十刀,瞒着跑出事平台和保险互踢皮球,自己兜底;2) 损耗按每迈0.15-0.2刀心里预算(油+胎+刹车+折旧),刨掉这个再算时薪,别只看App里的流水;3) 保养周期减半执行,跑单的车机油别拖到一万迈。想清楚这三条还有的赚,再出手。', '2026-02-28 17:50:00-05')
ON CONFLICT (id) DO NOTHING;

-- P76 guide 车贷预批 (华府Daniel)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000076', 'a1000000-0000-0000-0000-000000000015', 'review', '买车前先拿pre-approval,流程和好处', E'上个月买车前做足了功课,靠一纸pre-approval在finance office没被宰,把流程分享出来。\n\n什么是pre-approval:银行或credit union预先批给你的贷款额度和利率,有效期一般30-60天,拿着它去买车,相当于揣着现金谈判。\n\n流程:1) 选2-3家机构(自己的主银行加一两家credit union,CU利率普遍更低);2) 线上申请,填收入和想贷的额度,几分钟到一天出结果;3) 拿到批复邮件或letter,里面有额度、利率、期限。\n\n实战用法:全程不跟销售谈月供,只谈车价;进finance office后亮出pre-approval,一句话:"能低于这个利率就用你家的,不能就走我自己的"。dealer金融是有权限从贷款方拿返点加价的,你有底牌他就只能拿真实利率来卷。我这次CU给5.4%,dealer先报6.9%,看到letter后"申请了个特批"变成5.2%,当场用了dealer的,双赢。\n\n提醒:多家申请集中在两周内完成,征信只算一次询问;pre-approval不等于必须贷满,少贷提前还大多无罚金,签字前确认一下。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['车贷','pre-approval','攻略'], 'active', '2026-02-28 15:30:00-05', '2026-02-28 15:30:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000145', 'd0000000-0000-0000-0002-000000000076', 'a1000000-0000-0000-0000-000000000009', E'"能低于就用你家的"这句话是精髓,让dealer金融从宰客部门变成比价对象。上次买车我也是这么反杀的,dealer最后比我的CU还低了0.3。', '2026-02-28 19:20:00-05')
ON CONFLICT (id) DO NOTHING;

-- P77 review RX350 2018追更 (法拉盛Frank)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000077', 'a1000000-0000-0000-0000-000000000035', 'review', 'RX350提车两周追更:纽约实战体验', E'两周前晒过提车的RX350,开满两周一千迈,追更一篇给同样在看这台车的朋友。\n\n通勤:法拉盛到曼哈顿,走过LIE也走过Grand Central,坑洼和减速带的过滤是这台车最值钱的地方,之前的老车过Northern Blvd像骑马,现在像坐船。\n\n油耗:市区拥堵18mpg,高速26,3.5 V6加92号油(手册说91以上),一个月油钱比老车多花40刀左右,买它之前请接受这一点,舒适是有油耗代价的。\n\n停车:比轿车高一头,法拉盛的路边平行泊车和窄车库要适应几天,360影像没有的款全靠后视镜修行。\n\n小结:它不快、不省油、车机老气,但每天下班坐进去的那一刻都觉得钱花对了。中年人的车,懂的都懂。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/2018_Lexus_RX350%2C_Front_Right%2C_10-22-2020.jpg/960px-2018_Lexus_RX350%2C_Front_Right%2C_10-22-2020.jpg'], 'Lexus', 'RX350', 2018, ARRAY['雷克萨斯','用车报告'], 'active', '2026-02-21 16:20:00-05', '2026-02-21 16:20:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000146', 'd0000000-0000-0000-0002-000000000077', 'a1000000-0000-0000-0000-000000000027', E'"下班坐进去那一刻觉得钱花对了",被这句种草了。我正在看一台高里程的RX,看完你和王哥的帖子更坚定了。', '2026-02-22 10:30:00-08')
ON CONFLICT (id) DO NOTHING;

-- P78 guide Carfax怎么读 (避坑酱)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000078', 'a0000000-0000-0000-0000-000000000008', 'review', 'Carfax不是只看有无事故,教你逐行读', E'很多人拿到Carfax只扫一眼"没有事故"就放心了,其实信息都藏在细节里,逐段教你读:\n\n1. 车主数量和用途:1 owner personal use最优;rental或fleet不是死刑,但租赁车前两万迈被多少人暴力对待没人知道,应该更便宜。\n2. 注册地变迁:长期在盐带州(五大湖、东北)注册的,底盘锈蚀概率高;从水灾州(佛州、路州)流出的车,警惕水泡洗title。\n3. 保养记录的"节奏":比"有没有记录"更重要的是间隔,正常是每5000-8000迈一条,中间突然空白两年的,那两年发生了什么?\n4. 里程曲线:逐条记录的里程应该单调递增,出现回退直接放弃,odometer rollback比事故严重得多。\n5. 事故条目的语言:minor/moderate/severe是上报方的措辞,不是鉴定结论;看伤的位置比看severity有用,rear小碰无伤大雅,structural/airbag deployed直接跳过。\n6. 最新一条记录的时间:挂牌在卖却半年没有任何记录的车,问问这半年车在哪、谁在开。\n\n最后:Carfax只记录"被上报的",私了的事故它一无所知,所以它是筛子不是保票,过了筛子还是要PPI。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['Carfax','验车','攻略'], 'active', '2026-02-06 18:30:00-08', '2026-02-06 18:30:00-08')
ON CONFLICT (id) DO NOTHING;

-- P79 guide 电车过冬 (湾区Model3车主)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000079', 'a0000000-0000-0000-0000-000000000003', 'review', '电车车主过冬手册,五年经验浓缩', E'开电车第五个冬天,把踩过的坑浓缩成几条,给刚上电车或正在观望的朋友:\n\n1. 续航心理建设:冷天掉两三成是物理规律不是车坏了,规划长途按标称七折算,山区六折。\n2. 出门前预热是最大的免费午餐:插着充电桩的时候用App提前十分钟开空调加电池预热,用的是电网的电,不掏电池的老本,上车就是暖的,续航还坚挺。\n3. 充电习惯:冷电池快充很慢,导航里设置充电站为目的地让电池提前预热(特斯拉和多数新车都有);家充的把充电结束时间设在出发前,收工时电池是温的。\n4. 座椅加热优先:方向盘加热加座椅加热的能耗只有暖风的零头,温度感受还更直接,冬天多用它们少开热风。\n5. 雪天优势别浪费:电车重心低加电机响应快,配上冬季胎雪地表现其实优于同级油车,但动能回收在冰面上等于持续轻刹车,记得把回收调低或开雪地模式。\n6. 露天过夜停车:门把手和充电口结冰是真烦,预报冻雨的晚上,充电口盖里塞张纸巾防冻住,老车主土办法。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['电车','冬季用车','攻略'], 'active', '2026-02-03 17:45:00-08', '2026-02-03 17:45:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000147', 'd0000000-0000-0000-0002-000000000079', 'a1000000-0000-0000-0000-000000000007', E'充电口塞纸巾这条太土太有效了,去年冻雨我撬了十分钟充电口盖,当时要看到这帖能少骂十句。已转发给刚提电车的同事。', '2026-02-04 09:40:00-08')
ON CONFLICT (id) DO NOTHING;

-- P80 chatter 行车记录仪 (湾区凯文)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000080', 'a1000000-0000-0000-0000-000000000001', 'discussion', '行车记录仪今天替我省了几千刀', E'早高峰101上前车突然别线急刹,我躲开了,后车没躲开追了我一下。对方下车张口就说是我急刹造成的。\n我一句话没吵,掏出手机回放记录仪:前车别线、我正常减速、他跟车过近,全程清清楚楚。对方当场改口,保险走得干干净净。\n六十刀的记录仪,今天大概替我省了几千刀和无数扯皮。还没装的朋友,这是我今年安利的第一件车品。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['行车记录仪','安利'], 'active', '2026-02-10 21:30:00-08', '2026-02-10 21:30:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000148', 'd0000000-0000-0000-0002-000000000080', 'a1000000-0000-0000-0000-000000000006', E'+1,湾区开车记录仪就是刚需,碰瓷和乱变道太多了。买前后双录的,追尾扯皮基本一录定音。', '2026-02-11 08:50:00-08')
ON CONFLICT (id) DO NOTHING;

-- P81 chatter 退税花哪了 (法拉盛小李)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000081', 'a0000000-0000-0000-0000-000000000004', 'discussion', '退税到账的举个手,都花在车上了吗', E'报得早,退税这周到账了。本来发誓要老老实实存起来,结果已经预约了下周的四轮定位和两条新胎,又看上了一套脚垫。\n好奇大家的退税都往哪花:存起来、付车贷、保养、还是直接上了新车首付?评论区统计一下,让我看看我不是一个人。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['报税季','闲聊'], 'active', '2026-02-24 20:15:00-05', '2026-02-24 20:15:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000149', 'd0000000-0000-0000-0002-000000000081', 'a1000000-0000-0000-0000-000000000011', E'我的退税上周已经变成新提的CR-V首付了,连捂热乎的机会都没有。车这个东西,真的是碎钞机和幸福感发生器二合一。', '2026-02-25 09:30:00-05')
ON CONFLICT (id) DO NOTHING;

-- P82 discussion 回国半年车怎么办 (天普市阿婷)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000082', 'a1000000-0000-0000-0000-000000000034', 'discussion', '四月回国待半年,车是卖掉还是封存', E'家里有事,四月要回国待半年左右。车是台开了三年的SUV,还剩一点贷款。纠结怎么处理:\n1) 卖掉最干脆,但回来又要重新买,一卖一买感觉亏几千;2) 停在朋友家或租个车位封存,保险怎么调?半年不开车会不会坏?3) 听说还能租给靠谱朋友开,但出事故算谁的?过来人给个思路。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['回国','封存','卖车'], 'active', '2026-02-13 11:20:00-08', '2026-02-13 11:20:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000150', 'd0000000-0000-0000-0002-000000000082', 'a0000000-0000-0000-0000-000000000001', E'半年是个尴尬的时长,我的判断标准:车还有贷款、半年后确定回来,倾向封存;可能延期到一年以上,卖。封存做对四件事车坏不了:胎压打高两三psi防止平点、接涓流充电器或每月请朋友开一次、油箱加满防冷凝水、保险降成仅comprehensive(防偷防砸,便宜很多)但千万别全停,停了再买要涨价。停朋友家车道比停路边强一百倍。', '2026-02-13 15:30:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000151', 'd0000000-0000-0000-0002-000000000082', 'a0000000-0000-0000-0000-000000000008', E'借朋友开那条我劝退:保险跟车也跟人,朋友常开必须加成listed driver,出了大事故理赔纠纷加人情债双杀,华人圈这种翻脸案例我见过不止一起。要么正经封存,要么干脆卖,别选中间那条最模糊的路。', '2026-02-14 10:20:00-08')
ON CONFLICT (id) DO NOTHING;

-- P83 discussion 水泡车识别 (亚特兰大Momo)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000083', 'a1000000-0000-0000-0000-000000000016', 'discussion', '南方买二手车,水泡车怎么防', E'看车看到一台价格美丽得反常的,比行情低两千多,车是从佛罗里达过来的。朋友一句"便宜成这样怕不是水泡车"给我整清醒了。\n水泡车是不是Carfax查不出来?自己看车的时候有哪些土办法能识别?真买到了是不是就是无底洞?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['水泡车','避坑'], 'active', '2026-02-17 14:50:00-05', '2026-02-17 14:50:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000152', 'd0000000-0000-0000-0002-000000000083', 'a0000000-0000-0000-0000-000000000007', E'水泡车走保险报废的会留flood title,但很多在灾后被低价收走私修洗白,Carfax确实可能是干净的。上手检查口诀"一闻二摸三抠四看":闻,关窗晒半小时后进车闻霉味,香水味特别重的更可疑;摸,掀地毯摸底层有没有潮气和泥沙感;抠,安全带全部拉到底看根部有没有水渍线和泥,座椅滑轨、座椅弹簧看锈;看,大灯尾灯内侧水雾痕、保险丝盒和线束插头的绿锈、备胎槽的泥沙。水泡车的病根在线束和电脑板,修是修不完的,再便宜也不碰。', '2026-02-17 18:20:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000153', 'd0000000-0000-0000-0002-000000000083', 'a0000000-0000-0000-0000-000000000008', E'再加一招:NICB官网有免费的VINCheck,专查水灾和盗抢记录,和Carfax互为补充。另外反常低价本身就是答案,二手车市场没有圣诞老人,便宜两千必有两千的理由。', '2026-02-18 09:30:00-05')
ON CONFLICT (id) DO NOTHING;

-- P84 showoff CR-V混动 (尔湾老王)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0002-000000000084', 'a0000000-0000-0000-0000-000000000001', 'showoff', '给老婆提了台CR-V混动,交作业', E'家里领导的老车服役十年光荣退休,二月最后一天提了这台2022 CR-V混动,2万9千迈,两万三落地。\n谈价过程就是本论坛攻略的标准操作:月中要好OTD,拖到今天月底签字,比首次报价又低了700。老婆很满意,说以后接娃买菜底气都足了。二月买车季圆满收官,下个月轮到我看着车库流口水了。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/HONDA_CR-V_HYBRID_FIFTH_GENERATION_China.jpg/960px-HONDA_CR-V_HYBRID_FIFTH_GENERATION_China.jpg'], NULL, NULL, NULL, ARRAY['提车','CR-V','混动'], 'active', '2026-02-28 17:40:00-08', '2026-02-28 17:40:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000154', 'd0000000-0000-0000-0002-000000000084', 'a1000000-0000-0000-0000-000000000004', E'王哥好眼光,和我那台同款!嫂子以后就知道混动CR-V买菜接娃有多顺手了,恭喜恭喜。', '2026-02-28 20:30:00-08')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0002-000000000155', 'd0000000-0000-0000-0002-000000000084', 'a0000000-0000-0000-0000-000000000002', E'月底签字省700,王哥言传身教,这就是论坛攻略的含金量。恭喜嫂子提车!', '2026-02-28 21:50:00-08')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Community seed part 3: March 2026 posts (84 posts)
-- Post IDs d0000000-0000-0000-0003-0000000000NN (01-84)
-- Comment IDs e0000000-0000-0000-0003-000000000NNN (001-)
-- ============================================================

-- P01 讨论:雪胎换回全季胎(波士顿学姐)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000001', 'a1000000-0000-0000-0000-000000000013', 'discussion', '波士顿三月还在下雪,雪胎什么时候换回全季胎?', E'去年十一月听劝换了一套雪胎,这个冬天确实稳,一次都没打滑。现在三月了,白天有时候能到50多度,但上周又下了一场雪。问一下大家一般什么时候换回全季胎?太早换怕再来一场倒春寒,太晚换又听说雪胎在热天磨损特别快,软胎几个月就磨掉不少。有没有一个靠谱的判断标准?另外换下来的雪胎放公寓阳台可以吗,会不会晒坏?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['轮胎','春季保养','新英格兰'], 'active', '2026-03-02 08:40:00-05', '2026-03-02 08:40:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000001', 'd0000000-0000-0000-0003-000000000001', 'a0000000-0000-0000-0000-000000000007', E'行业里通用的标准是看连续气温:当白天气温稳定在45°F(7°C)以上就该换回全季胎了。雪胎的橡胶配方软,超过这个温度磨损速度大概是全季胎的1.5到2倍,而且刹车距离反而更长。波士顿的话一般是三月底四月初比较稳妥,别看一两天的高温,看未来两周预报。阳台存放注意避光,轮胎最怕紫外线和臭氧,套个轮胎袋侧放或吊挂都行,别长期平叠受压。', '2026-03-02 14:20:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000002', 'd0000000-0000-0000-0003-000000000001', 'a0000000-0000-0000-0000-000000000008', E'补充一点:换的时候顺便让店里查一下胎纹深度,雪胎低于6/32就基本失去雪地性能了,明年冬天前好有个预期。很多店换季换胎忙到爆,提前一两周网上预约,Costco会员换位平衡免费,散客可以看看Discount Tire。', '2026-03-03 10:05:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000003', 'd0000000-0000-0000-0003-000000000001', 'a1000000-0000-0000-0000-000000000013', E'感谢两位!那我等三月底再约,轮胎袋已经下单了。', '2026-03-03 21:30:00-05') ON CONFLICT (id) DO NOTHING;

-- P02 讨论:加州REAL ID材料(尔湾Cindy)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000002', 'a1000000-0000-0000-0000-000000000004', 'discussion', '加州DMV办REAL ID要带哪些材料?求一次过经验', E'五月要飞国内转机,听说以后国内航班安检要REAL ID,想趁这次续驾照一起升级。网上看要求写得挺绕:身份证明、SSN、两份地址证明?我是H4身份,租房合同在老公名下,水电账单也不是我的名字,这种情况怎么办?有没有姐妹最近办过的,分享一下带了什么材料一次通过的?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['DMV','REAL ID','加州'], 'active', '2026-03-03 21:15:00-08', '2026-03-03 21:15:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000004', 'd0000000-0000-0000-0003-000000000002', 'a0000000-0000-0000-0000-000000000001', E'我家领导去年办的,情况跟你类似。核心四样:护照+有效签证+I-94(身份证明)、SSN卡或带SSN的W-2(H4没SSN的可以走无SSN声明流程)、两份不同来源的地址证明。地址证明不一定要你名字的账单,银行对账单、保险单、手机账单都算,提前把一两个账单改成你的名字,等下一期账单寄来就行。DMV官网可以先填online application拿确认码,再约appointment,窗口十分钟搞定。', '2026-03-04 09:40:00-08') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000005', 'd0000000-0000-0000-0003-000000000002', 'a0000000-0000-0000-0000-000000000008', E'提醒一句:所有材料要原件,复印件和手机照片都不收。名字如果有拼写不一致(比如护照拼音和SSN卡差一个空格)会被卡,先检查一遍。另外REAL ID主要是坐美国国内航班用,出境用护照就行,不影响你转机,别被中介忽悠交钱代办。', '2026-03-05 12:10:00-08') ON CONFLICT (id) DO NOTHING;

-- P03 车评:2021 F-150 XLT 一年报告(达拉斯德州哥)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000003', 'a1000000-0000-0000-0000-000000000019', 'review', '2021 F-150 XLT 二手买入一年:德州人的真实账本', E'去年三月3.8万美元买的2021 XLT 2.7 EcoBoost,四驱,当时3.2万英里,现在4.7万英里,说说一年的账。\n\n油耗:混合路况实测19 MPG左右,高速定速能到22,拖过一次6000磅的船立刻掉到11,量力而行。\n\n花费:常规保养两次机油共180刀,换了一套Defender LTX轮胎950刀,除此之外零故障。10代之后的F-150电子档杆和大屏都挺好用,CarPlay无线连接偶尔抽风,重启就好。\n\n好处:home depot拉建材、搬家帮朋友、周末拖船,皮卡在德州就是万能工具。停车确实要练,车位小的plaza我都停远处。\n\n提醒想买的:2.7比3.5省油且够用,除非你常拖8000磅以上;检查下车架有没有拖挂造成的锈和变形,试驾时10-40mph急加速听变速箱有没有闯动。总体一年下来觉得这钱花得值,德州开皮卡不需要理由。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Ford_F-150_%28fourteenth_generation%29_Rutesheimer_Autoschau_2025_DSC_9230.jpg/960px-Ford_F-150_%28fourteenth_generation%29_Rutesheimer_Autoschau_2025_DSC_9230.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Ford_F-150_%28fourteenth_generation%29_Rutesheimer_Autoschau_2025_DSC_9217.jpg/960px-Ford_F-150_%28fourteenth_generation%29_Rutesheimer_Autoschau_2025_DSC_9217.jpg'], 'Ford', 'F-150', 2021, ARRAY['皮卡','用车报告','德州'], 'active', '2026-03-09 12:30:00-05', '2026-03-09 12:30:00-05') ON CONFLICT (id) DO NOTHING;

-- P04 晒车:Model Y 提车(湾区凯文)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000004', 'a1000000-0000-0000-0000-000000000001', 'showoff', '三年老油车置换焕新版Model Y,南湾提车记', E'蹲了小半年终于出手,把开了三年的油车trade in换了焕新版Model Y。周六在Fremont交付中心提的车,前后排了不到四十分钟。新款悬挂比朋友的老款明显软了不少,过101的伸缩缝不再哐哐响。回家第一件事装了home charger的预约,现在先蹭公司充电。内饰氛围灯有点花哨,但整体还是值回票价。晒一张交付时的照片,祝自己电动生活愉快。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Tesla_Model_Y_%282025%29_MYLE_Festival_2025_DSC_9565.jpg/960px-Tesla_Model_Y_%282025%29_MYLE_Festival_2025_DSC_9565.jpg'], NULL, NULL, NULL, ARRAY['提车','Tesla','湾区'], 'active', '2026-03-10 18:05:00-07', '2026-03-10 18:05:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000006', 'd0000000-0000-0000-0003-000000000004', 'a0000000-0000-0000-0000-000000000003', E'恭喜!焕新版悬挂确实是最大升级,我那台老3过减速带跟拖拉机似的。家充装好之后你会回不去的,记得让电工报permit。', '2026-03-10 21:40:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000007', 'd0000000-0000-0000-0003-000000000004', 'a1000000-0000-0000-0000-000000000005', E'同款恭喜,公司充电桩早上八点后就抢不到了,建议还是尽快装家充,PG&E有EV电价计划,半夜充便宜一半。', '2026-03-11 09:12:00-07') ON CONFLICT (id) DO NOTHING;

-- P05 讨论:CVT顿挫(埃尔蒙特小马)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000005', 'a1000000-0000-0000-0000-000000000037', 'discussion', 'CVT低速有点一冲一冲的,是要坏的前兆吗?', E'2017年的日产Sentra,9万英里,最近感觉20-30mph缓加速的时候有轻微的一冲一冲,像有人在后面推了一下,速度上去之后就正常了。冷车更明显。网上一搜全是日产CVT要炸的帖子,吓得不轻。想问问这是不是变速箱要坏的前兆?换CVT油还有救吗,还是赶紧卖车止损?车况其他都好,不想这时候背车贷。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['CVT','变速箱','维修'], 'active', '2026-03-04 10:20:00-08', '2026-03-04 10:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000008', 'd0000000-0000-0000-0003-000000000005', 'a0000000-0000-0000-0000-000000000007', E'先别慌。轻微顿挫不等于要炸,先做三件事:1)查这台车CVT油有没有换过,9万英里没换过的话立刻换,必须用日产NS-3原厂油,别让快修店灌通用油;2)让店里用电脑读一下变速箱有没有存juddering相关的码;3)换油后开2000英里观察。如果换油后顿挫消失,继续正常开就行。如果出现打滑(转速上升车速不涨)、异响、或者顿挫越来越重,那才是链条或阀体磨损,修一次3000-4000刀,这时候再考虑卖不卖。', '2026-03-04 15:45:00-08') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000009', 'd0000000-0000-0000-0003-000000000005', 'a0000000-0000-0000-0000-000000000008', E'补充:日产对部分年份CVT有延保到8.4万英里的历史(老款),你这个2017/9万英里大概率出保了,但可以打日产客服报VIN问问有没有campaign。真要卖的话现在卖比坏了再卖多拿两三千,自己权衡。', '2026-03-05 11:20:00-08') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000010', 'd0000000-0000-0000-0003-000000000005', 'a1000000-0000-0000-0000-000000000037', E'谢谢Tony师傅!查了记录确实从来没换过CVT油,已经约了周六去换,换完汇报。', '2026-03-05 19:08:00-08') ON CONFLICT (id) DO NOTHING;

-- P06 讨论:DMV路考预约(留学生Kevin)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000006', 'a0000000-0000-0000-0000-000000000002', 'discussion', 'LA的DMV路考预约排到两个月后,有什么捡漏技巧?', E'笔试早就过了,permit在手,路考死活约不上。LA附近几个DMV最早的slot都排到五月中了,我四月租约到期要搬家,急着拿驾照。听说有人天天刷能刷到cancellation,是真的吗?几点刷比较容易?还有说远一点的DMV好约,值得开一个小时去考吗?求约到的同学分享经验。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['DMV','路考','留学生'], 'active', '2026-03-05 23:40:00-08', '2026-03-05 23:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000011', 'd0000000-0000-0000-0003-000000000006', 'a1000000-0000-0000-0000-000000000003', E'刷cancellation是真的,DMV放取消名额一般在早上开门前后和午休结束那会儿,我当时早上7点50和下午1点各刷一轮,三天刷到一个隔周的。另外别只盯着Hollywood和Culver City这种热门点,Winnetka、Lancaster这些偏一点的DMV经常有两周内的slot。考场偏的还有个好处:路况简单,通过率高。', '2026-03-06 10:30:00-08') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000012', 'd0000000-0000-0000-0003-000000000006', 'a0000000-0000-0000-0000-000000000008', E'注意第三方付费抢号的服务别用,DMV明确说过会取消倒卖的预约。自己刷免费又安全。考前记得确认考试车的注册和保险有效,手刹副驾能拉到,不然到了现场直接拒考,又要重约。', '2026-03-06 18:22:00-08') ON CONFLICT (id) DO NOTHING;

-- P07 攻略:春季保养清单(修车匠Tony)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000007', 'a0000000-0000-0000-0000-000000000007', 'review', '修车匠的春季保养清单:冬天过完,这六样东西该看了', E'每年三月店里都会集中来一波"冬天攒下来的病",与其坏在路上,不如花半小时自查。给大家一份我自己用的春季清单:\n\n1)电瓶:冬天是电瓶杀手,春天是验尸官。启动明显变肉、大灯怠速发暗的,去auto parts店免费测一下CCA,四年以上的电瓶该换就换。\n\n2)轮胎:冬天路面坑多,检查胎侧有没有鼓包,顺便看胎纹,插硬币测深度低于4/32就要计划换胎了。用雪胎的抓紧换回来。\n\n3)雨刮:被冰刮了一冬天的胶条基本都废了,春雨季前换一对,20刀自己五分钟搞定。\n\n4)底盘冲洗:东北部撒盐州的车,找个自助洗车用高压水冲一遍底盘和轮拱,盐留着一夏天就是锈。\n\n5)空调:第一波热浪来之前试一下制冷,不凉的现在修,等六月排队要等两周。\n\n6)机滤空滤花粉滤:花粉季前换cabin filter,过敏体质的选带活性炭的,车里会好受很多。\n\n以上除了底盘冲洗都能自己动手,预算100刀以内。有问题评论区问。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['春季保养','干货','自己动手'], 'active', '2026-03-07 09:00:00-08', '2026-03-07 09:00:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000013', 'd0000000-0000-0000-0003-000000000007', 'a1000000-0000-0000-0000-000000000002', E'收藏了!上周刚按这个换了cabin filter,拆出来的旧滤芯上全是黄色花粉,难怪一开风扇就打喷嚏。', '2026-03-08 16:35:00-07') ON CONFLICT (id) DO NOTHING;

-- P08 讨论:出保前检查(皇后区Grace)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000008', 'a1000000-0000-0000-0000-000000000011', 'discussion', '原厂保修还剩三个月,出保前应该让dealer查什么?', E'我的车5月就满3年3.6万英里的bumper to bumper保修了。听同事说出保前要把车拿去dealer做个全面检查,有毛病趁在保免费修,不然出保之后修什么都是自己掏钱。想问问具体应该让他们查哪些项目?直接跟service advisor说"帮我全查一遍"他们会认真查吗?还是要我自己列清单?有没有出保前捡到便宜的例子,让我学习一下。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保修','用车常识'], 'active', '2026-03-06 19:55:00-05', '2026-03-06 19:55:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000014', 'd0000000-0000-0000-0003-000000000008', 'a0000000-0000-0000-0000-000000000007', E'思路对,但方法要改:不要说"全查一遍",要报具体症状,dealer只对症状立单。出保前重点关注这些容易出问题又贵的:漏油渗油(发动机和变速箱结合面、减震器)、天窗排水和漏水痕迹、空调制冷效果、座椅电机和加热、车机死机重启、异响(报清楚什么速度什么动作出现)。哪怕症状很轻微也要立案,保修期内report过的问题,出保后复发很多厂家会goodwill继续修。修完保留所有工单。', '2026-03-07 09:30:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000015', 'd0000000-0000-0000-0003-000000000008', 'a0000000-0000-0000-0000-000000000008', E'真实例子:去年有个读者天窗有一点点渗水印,出保前两周去立案,dealer换了整套天窗排水和顶棚,账面2400刀,分文没花。另外你这个里程如果有延保offer别急着买,dealer卖的延保价格可以砍,而且第三方也能买,回头看我主页有一篇延保避坑。', '2026-03-07 20:15:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000016', 'd0000000-0000-0000-0003-000000000008', 'a1000000-0000-0000-0000-000000000011', E'太有用了,我这车机确实偶尔黑屏,一直懒得管,这就去立案!', '2026-03-08 11:02:00-04') ON CONFLICT (id) DO NOTHING;

-- P09 闲聊:花粉季洗车(亚特兰大Momo)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000009', 'a1000000-0000-0000-0000-000000000016', 'discussion', '亚特兰大的春天:白车秒变黄车,洗了个寂寞', E'昨天刚洗的车,今天早上出门一看,整个车盖了一层黄绿色的松树花粉,黑车变抹茶色,雨刷一刮糊成一片。亚特兰大的花粉季真的谁懂啊,pollen count五千多。现在的纠结是:天天洗浪费钱,不洗又难受。大家花粉季都多久洗一次车?还是干脆躺平等四月下雨?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['花粉季','闲聊','洗车'], 'active', '2026-03-12 08:15:00-04', '2026-03-12 08:15:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000017', 'd0000000-0000-0000-0003-000000000009', 'a1000000-0000-0000-0000-000000000017', E'佛州同款抹茶车报到。我的办法是买个月卡无限次洗,花粉季这一个月最值。切记别干擦,花粉混着灰是研磨剂,会拉出太阳纹。', '2026-03-12 13:40:00-04') ON CONFLICT (id) DO NOTHING;

-- P10 讨论:正时皮带(萨克拉门托Ken)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000010', 'a1000000-0000-0000-0000-000000000030', 'discussion', '正时皮带一定要10万英里换吗?车况看着还好', E'2014年的Honda Odyssey,刚过10万英里,dealer打电话说正时皮带到了必须换,连水泵一起报价1400刀。车开着一点问题没有,皮带这东西看不见摸不着,怎么知道是不是真到寿命了?能不能拖到12万再换?还是说这个真不能赌?另外这个价格合理吗,外面小店会便宜多少?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保养','本田','维修报价'], 'active', '2026-03-11 20:30:00-07', '2026-03-11 20:30:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000018', 'd0000000-0000-0000-0003-000000000010', 'a0000000-0000-0000-0000-000000000007', E'这个真不能赌。Odyssey的J35是干涉式发动机,正时皮带断了活塞会直接怼上气门,大修费用5000刀起,比换皮带贵好几倍。本田官方建议6万英里或7年(严苛工况)到10.5万英里之间换,你这台12年车龄的,橡胶老化比里程更要命,建议尽快换。1400刀在dealer属于正常价,独立日系专修店做全套(皮带+水泵+张紧轮+惰轮+盘车皮带)一般900-1100刀,用Aisin套件就是原厂供应商,不必迷信dealer。', '2026-03-12 08:50:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000019', 'd0000000-0000-0000-0003-000000000010', 'a1000000-0000-0000-0000-000000000031', E'我的老雅阁去年换的,湾区日系店1050刀Aisin全套。多说一句,换的时候让师傅顺手看下曲轴油封渗不渗油,拆开顺手换很便宜,单独再拆一次就是重复工时。', '2026-03-12 22:14:00-07') ON CONFLICT (id) DO NOTHING;

-- P11 晒车:Tacoma露营(西雅图雨神)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000011', 'a1000000-0000-0000-0000-000000000007', 'showoff', '春假前整备完毕:Tacoma+床帐,奥林匹克半岛走起', E'盼了一冬天,终于把露营装备全装回Tacoma了。床帐、拉杆箱式厨房、车载冰箱,斗里码得整整齐齐。这周末先去奥林匹克半岛试营一晚,四月再走北瀑布。西雅图人的春天就是:雨还没停,人已经在路上了。TRD Off-Road的Crawl Control在烂路上是真好用,新手强烈建议选这个配置。晒两张出发前的照片。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/2020_Toyota_Tacoma_TRD_Pro_rear_NYIAS_2019.jpg/960px-2020_Toyota_Tacoma_TRD_Pro_rear_NYIAS_2019.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/2020_Toyota_Tacoma_TRD_Pro_front_NYIAS_2019.jpg/960px-2020_Toyota_Tacoma_TRD_Pro_front_NYIAS_2019.jpg'], NULL, NULL, NULL, ARRAY['露营','皮卡','太平洋西北'], 'active', '2026-03-14 16:45:00-07', '2026-03-14 16:45:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000020', 'd0000000-0000-0000-0003-000000000011', 'a1000000-0000-0000-0000-000000000008', E'装备党狂喜,床帐链接求一个!波特兰这边胡德山脚下也有几个好营地,五月雪化了可以约个车队。', '2026-03-14 20:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000021', 'd0000000-0000-0000-0003-000000000011', 'a1000000-0000-0000-0000-000000000040', E'塔科马人认证:这才是Tacoma的正确打开方式。半岛101环线三月还是雨季,Hoh雨林步道泥大,备双胶鞋。', '2026-03-15 10:18:00-07') ON CONFLICT (id) DO NOTHING;

-- P12 讨论:停车场刮蹭逃逸(洛杉矶Amy)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000012', 'a1000000-0000-0000-0000-000000000002', 'discussion', '超市停车场车被刮了对方跑了,还有的救吗?', E'今天在超市买个菜出来,发现后保险杠左边一道长长的白漆刮痕带凹陷,对方屁都没留就跑了。气死我了。看了下停车场有监控摄像头,但超市会给我看吗?这种情况报警有用吗?走自己保险的话是算collision还是uninsured motorist?deductible是500,感觉修一下也就一千出头,走保险会不会明年保费涨得更亏?求指点,第一次遇到这种事,又气又懵。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['事故处理','保险','停车场'], 'active', '2026-03-13 12:10:00-07', '2026-03-13 12:10:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000022', 'd0000000-0000-0000-0003-000000000012', 'a0000000-0000-0000-0000-000000000008', E'按顺序来:1)当场多角度拍照,包括你的车位位置和周围摄像头;2)找超市customer service登记,他们一般不直接给你看录像,但会配合警方调取,所以3)在线报一个hit and run的police report,拿到report number;4)California的话,肇事逃逸可以走你保单里的UMPD(uninsured motorist property damage,如果有)或者collision。重点:hit and run有police report的情况下,很多保险公司算not-at-fault,对保费影响远小于有责事故。你先打电话问保险(问claim部门之前可以先匿名问agent涨价规则)。修车1000出头、deductible 500,如果确认不涨价就走,会涨就自费。', '2026-03-13 15:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000023', 'd0000000-0000-0000-0003-000000000012', 'a0000000-0000-0000-0000-000000000001', E'补一句过来人经验:保险杠塑料件的刮痕带小凹陷,华人钣金店经常500-700就能修得很好,先去两三家估个价再决定走不走保险。要是刮痕不深凹陷不明显,抛光加补漆笔一百多也能看,别为了完美主义交500 deductible。', '2026-03-14 09:45:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000024', 'd0000000-0000-0000-0003-000000000012', 'a1000000-0000-0000-0000-000000000002', E'谢谢两位!police report已经在线提交了,明天去华人钣金店估价,超市那边说警方来函就配合调录像。心情好多了。', '2026-03-14 19:20:00-07') ON CONFLICT (id) DO NOTHING;

-- P13 讨论:刹车片厚度(长岛Sophia)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000013', 'a1000000-0000-0000-0000-000000000036', 'discussion', '保养时说刹车片剩4mm,现在必须换还是能再等等?', E'去Jiffy Lube换机油,技师说前刹车片剩4mm了,建议马上换,报价380刀。我平时开得少,一年也就八千英里,通勤为主没什么急刹。想问一下4mm到底是什么概念?一般新片是多厚,磨到多少是底线?能不能等到夏天回国前再换?还是这种连锁店本来就喜欢吓唬人推销?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['刹车','保养','避坑'], 'active', '2026-03-15 14:25:00-04', '2026-03-15 14:25:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000025', 'd0000000-0000-0000-0003-000000000013', 'a0000000-0000-0000-0000-000000000007', E'给你个标尺:新片一般10-12mm,3mm是行业公认的更换线,2mm以下金属背板快磨到刹车盘,盘一起换就贵了。4mm还有余量,你这种温和开法撑3000-5000英里问题不大,但别拖到冬天。380刀换前轴在纽约不算宰,但也不便宜,独立修车店用好一点的陶瓷片(Akebono、Wagner)一般250-320。另外下次让他们顺便报一下刹车盘厚度和有没有沟槽,只换片不看盘是不专业的。', '2026-03-15 19:40:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000026', 'd0000000-0000-0000-0003-000000000013', 'a0000000-0000-0000-0000-000000000004', E'法拉盛这边独立店换前片带工280左右很正常,你长岛可以过来修顺便吃个饭哈哈。快修连锁的报价单可以拿走比价,不用当场答应,他们最爱用"不换很危险"话术。', '2026-03-16 12:05:00-04') ON CONFLICT (id) DO NOTHING;

-- P14 车评:Model 3 七万英里电池报告(湾区Model3车主)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000014', 'a0000000-0000-0000-0000-000000000003', 'review', '2019 Model 3长续航,7万英里电池衰减实测数据', E'又到一年汇报时间。2019年提的Model 3 LR,现在7.1万英里,给关心电池衰减的朋友一组真实数据。\n\n新车EPA 310英里,现在充到100%表显278英里,衰减约10.3%。前3万英里掉得最快(约6%),之后明显放缓,最近两万英里只掉了2%左右,和网上大样本统计的曲线基本一致。\n\n我的充电习惯:日常家充上限80%,长途前充100%,超充占比约15%。没有刻意娇惯,夏天也停室外。\n\n维护成本:七年只换过一套轮胎、两次雨刮、一次空调滤芯,12V小电瓶去年预防性换了(150刀)。刹车片因为动能回收几乎没磨,还剩7mm+。\n\n结论:买二手Model 3不用太恐惧电池,重点看有没有事故底盘磕碰,衰减可以当场充满验证表显。7万英里的LR现在二手也就1.8万上下,里程焦虑真的可以放下了。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/2019_Tesla_Model_3_Long_Range_Dual_Motor_in_Red_Multi-Coat%2C_front_left%2C_2021-05-30.jpg/960px-2019_Tesla_Model_3_Long_Range_Dual_Motor_in_Red_Multi-Coat%2C_front_left%2C_2021-05-30.jpg'], 'Tesla', 'Model 3', 2019, ARRAY['电动车','电池','长期报告'], 'active', '2026-03-16 21:10:00-07', '2026-03-16 21:10:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000027', 'd0000000-0000-0000-0003-000000000014', 'a1000000-0000-0000-0000-000000000009', E'感谢每年坚持更新,这个系列我从4万英里那篇追到现在,准备入二手Model 3的定心丸。', '2026-03-17 10:35:00-04') ON CONFLICT (id) DO NOTHING;

-- P15 讨论:四轮定位信号(哥伦布小舟)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000015', 'a1000000-0000-0000-0000-000000000024', 'discussion', '方向盘直行时歪了几度,是该做四轮定位了吗?', E'俄亥俄的冬天路烂得没法说,这两个月压了无数个坑。最近发现直线行驶时方向盘不是正的,往左歪了大概5度,松手车会慢慢往右跑。这是不是就是要做四轮定位的信号?做一次大概多少钱,去哪儿做靠谱?还有,是不是压一次大坑就要做一次?那我这冬天得做十次了……', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['四轮定位','悬挂','中西部'], 'active', '2026-03-17 18:30:00-04', '2026-03-17 18:30:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000028', 'd0000000-0000-0000-0003-000000000015', 'a0000000-0000-0000-0000-000000000007', E'方向盘歪+松手跑偏,是的,典型该做定位了。价格90-130刀一次,Firestone有lifetime alignment(200刀左右终身不限次),你们那种路况买这个最划算。但注意:压坑压歪的不一定只是定位,做之前让师傅检查一下控制臂衬套、球头和轮圈有没有变形,轮圈失圆光做定位是治不好的。跑偏还有个简单排查:左右前胎压先打成一致,胎压差1-2psi也会跑偏。', '2026-03-18 09:15:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000029', 'd0000000-0000-0000-0003-000000000015', 'a0000000-0000-0000-0000-000000000008', E'附议lifetime alignment,中西部烂路州回本神器,我认识的雪城同学一年做了四次早回本了。另外定位单要拿到before/after数据那张纸,全绿才算做完,有的店只调前束糊弄人。', '2026-03-19 08:40:00-04') ON CONFLICT (id) DO NOTHING;

-- P16 讨论:保险加新手(圣何塞Jason)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000016', 'a1000000-0000-0000-0000-000000000006', 'discussion', '老婆刚拿驾照,加到我的保险里保费翻倍,正常吗?', E'老婆上个月刚考出驾照,准备加到我的Progressive保单里,报价出来直接从每半年780涨到1520,几乎翻倍。她三十多岁了又不是毛头小子,新手就这么贵吗?有什么办法降下来?听说有的公司对新拿驾照的成年人友好一些?还是说让她先不上保险,开车时算permissive use?求懂行的支招。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保险','新手司机'], 'active', '2026-03-18 21:50:00-07', '2026-03-18 21:50:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000030', 'd0000000-0000-0000-0003-000000000016', 'a0000000-0000-0000-0000-000000000001', E'先纠正一个危险想法:同住配偶必须加进保单或者书面exclude,不能当permissive use,出了事保险公司可以拒赔,这个坑千万别踩。降价思路:1)成年新手各家算法差很多,让broker把State Farm、Mercury、AAA都跑一遍报价,加州华人用Mercury经常便宜不少;2)她去上一个defensive driving网课,有的公司给折扣;3)把她设为你那台旧车的primary driver而不是新车,费率低一截。', '2026-03-19 10:20:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000031', 'd0000000-0000-0000-0003-000000000016', 'a0000000-0000-0000-0000-000000000008', E'补充数据:新驾照(licensed years=0)在定价模型里权重非常大,和年龄关系反而小,基本都要贵50-100%,你这个翻倍在湾区不算离谱。好消息是每续保一次降一档,三年后基本回归正常。期间保持零事故零罚单最重要,别为了省钱降低liability额度,湾区随便追个尾就超15/30的上限了。', '2026-03-19 22:45:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000032', 'd0000000-0000-0000-0003-000000000016', 'a1000000-0000-0000-0000-000000000006', E'明白了,exclude的坑差点踩,这就找broker多报几家。谢谢!', '2026-03-20 08:30:00-07') ON CONFLICT (id) DO NOTHING;

-- P17 闲聊:春假自驾大峡谷(凤凰城Jerry)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000017', 'a1000000-0000-0000-0000-000000000025', 'discussion', '春假大峡谷自驾,凤凰城出发的朋友看过来', E'下周带爸妈走大峡谷南缘,凤凰城出发走17号转40号,顺路Sedona住一晚。三月底南缘还可能有雪,租车行的车没雪链,查了下NPS说南缘海拔7000英尺,早晚结冰。有最近去过的朋友吗?红岩那段现在人多不多?另外Williams镇上有家不错的中餐吗,爸妈吃不惯汉堡。纯闲聊帖,顺便找找同路人。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['春假','自驾','亚利桑那'], 'active', '2026-03-19 19:20:00-07', '2026-03-19 19:20:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000033', 'd0000000-0000-0000-0003-000000000017', 'a1000000-0000-0000-0000-000000000028', E'上上周刚去过,南缘主路除净很快,早上九点后基本没冰,别起太早就行。Sedona的红岩环线周末堵到怀疑人生,尽量周中去。Williams没啥中餐,Flagstaff有几家还行,导航搜一下唐人快餐。', '2026-03-20 12:35:00-07') ON CONFLICT (id) DO NOTHING;

-- P18 讨论:rebuilt title保险(拉斯维加斯发哥)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000018', 'a1000000-0000-0000-0000-000000000028', 'discussion', '看中一台rebuilt title的车便宜三成,保险真的买不了吗?', E'朋友转让一台2020年的凯美瑞,rebuilt title,比市场价便宜差不多三成,他说就是当年被冰雹砸过修复的,机械没问题。我最担心保险:听说rebuilt title只能买liability,买不了全险,真的假的?那车要是被偷了或者撞了岂不是血本无归?维加斯这边有人买过rebuilt的车吗,保险到底怎么处理的?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['rebuilt title','保险','避坑'], 'active', '2026-03-20 16:40:00-07', '2026-03-20 16:40:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000034', 'd0000000-0000-0000-0003-000000000018', 'a0000000-0000-0000-0000-000000000008', E'不是绝对买不了,是分公司:Progressive和Geico一般肯给rebuilt上全险(可能要求提交车辆照片),State Farm很多州只给liability,Farmers看情况。真正的问题在理赔:全损时rebuilt车的估值会按clean title打六到八折,你买的时候便宜三成,赔的时候也少三成,逻辑上不吃亏但心理落差大。冰雹车确实是rebuilt里最好的类型(结构没伤),但要验证:调CARFAX看当年报损原因,再花150刀找第三方技师检查有没有结构切割焊接痕迹。两样都干净,这个折扣可以要。', '2026-03-21 09:25:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000035', 'd0000000-0000-0000-0003-000000000018', 'a0000000-0000-0000-0000-000000000007', E'从修车角度补一刀:冰雹车看车顶和引擎盖内衬,PDR(无痕修复)做得好的基本无痕,做得差的车顶横梁有敲击波纹。重点摸车顶胶条下面和查天窗排水,冰雹车如果当时玻璃碎过,怕的是进过水,闻车内霉味、翻地毯下面看锈,进水车才是碰都不能碰的。', '2026-03-21 14:50:00-07') ON CONFLICT (id) DO NOTHING;

-- P19 晒车:Ram 1500 提车(休斯顿Nina)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000019', 'a1000000-0000-0000-0000-000000000020', 'showoff', '女生也能开大皮卡:二手Ram 1500提车,内饰真香', E'在版上潜水半年,今天也轮到我晒车了。提了台2021 Ram 1500 Big Horn,二手3.4万英里。当初在F-150和Ram之间纠结,试驾完立刻倒向Ram:空气悬挂配上这个内饰,开起来根本不像皮卡,像大号轿车。身高160的我上下车靠踏板完全没问题,倒车影像加360全景,停车其实比想象中容易。周末已经预约了给后斗装tonneau cover。休斯顿的姐妹别怕皮卡,真的开两天就爱上。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Ram_1500_%28DT%29_Hirschaid_2022-20220709-RM-111330.jpg/960px-Ram_1500_%28DT%29_Hirschaid_2022-20220709-RM-111330.jpg'], NULL, NULL, NULL, ARRAY['提车','皮卡','德州'], 'active', '2026-03-21 15:35:00-05', '2026-03-21 15:35:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000036', 'd0000000-0000-0000-0003-000000000019', 'a1000000-0000-0000-0000-000000000019', E'恭喜!Ram的内饰确实是半吨皮卡里最好的没有之一,达拉斯德州哥认证。空气悬挂记得留意冬天压缩机声音,五年以上是易损件,不过你这台还早。', '2026-03-21 20:10:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000037', 'd0000000-0000-0000-0003-000000000019', 'a1000000-0000-0000-0000-000000000021', E'奥斯汀路过,tonneau cover装三折软盖就够用还便宜,硬盖除非你常拉贵重东西。恭喜提车!', '2026-03-22 11:28:00-05') ON CONFLICT (id) DO NOTHING;

-- P20 讨论:德州笔试中文(达拉斯Lily)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000020', 'a0000000-0000-0000-0000-000000000005', 'discussion', '帮爸妈问:德州驾照笔试有中文版吗?', E'爸妈过来长住,想让他们考个德州驾照,平时接送孩子方便。他们英文基本不行。问一下:德州DPS的笔试有中文选项吗?网上说法不一,有说机器上能选中文,有说只有英文和西语。如果没有中文,可以带翻译吗?还有爸妈这个年纪(60+)路考有什么额外要求吗?有陪父母考过的朋友分享下流程呗。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['驾照','父母','德州'], 'active', '2026-03-22 10:05:00-05', '2026-03-22 10:05:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000038', 'd0000000-0000-0000-0003-000000000020', 'a1000000-0000-0000-0000-000000000019', E'去年刚陪我妈考过:德州DPS笔试机器可以选语言,里面有中文(简体),不用带翻译,我妈在Plano的office考的,刷题用的是网上那套中文题库,两天就过了。路考没有年龄附加要求,但考官指令是英文的,turn left/right、pull over这几个词一定要提前教会,我妈就是靠背了十几个指令词过的。视力测试现场做,戴老花镜没问题。', '2026-03-22 15:30:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000039', 'd0000000-0000-0000-0003-000000000020', 'a0000000-0000-0000-0000-000000000008', E'提醒:德州成人新申请也要走Impact Texas Drivers的视频课程(ITAD,一小时视频),路考前必须完成,很多长辈卡在这一步不知道,帮他们在电脑上放完记录就行。另外父母如果只有B1/B2身份,德州给的驾照有效期会跟身份挂钩,预期管理好。', '2026-03-23 09:15:00-05') ON CONFLICT (id) DO NOTHING;

-- P21 攻略:bill of sale写法(二手车避坑酱)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000021', 'a0000000-0000-0000-0000-000000000008', 'review', '私人交易必备:一张不留后患的Bill of Sale怎么写', E'后台老有人问私下买卖车要不要写bill of sale、怎么写。答案:要,买卖双方各留一份。虽然很多州过户不强制要求,但它是你避免后续扯皮的最重要文件。\n\n必写八项:\n1)车辆信息:年份、品牌、型号、VIN、当前里程(odometer reading写准,虚报里程是联邦重罪);\n2)成交价格和付款方式(写清cash还是cashier check及编号);\n3)交易日期和时间(精确到时间!交割后对方吃罚单闯红灯,这个时间就是你的护身符);\n4)双方全名、地址、驾照号;\n5)AS-IS条款:写明"sold as-is, no warranty expressed or implied",私人交易没有退货冷静期,这句保护卖家;\n6)卖家声明title干净、无未偿lien;\n7)双方签字;8)有条件的话找个证人或做公证(部分州如Louisiana要求公证)。\n\n卖家额外动作:交割当天就去DMV提交Notice of Transfer/Release of Liability(加州是REG 138,网上五分钟),把车牌处理规则查清楚(加州牌随车走,德州牌卖家摘走)。买家额外动作:拿到签好的title当场核对VIN和卖家驾照名字一致。\n\n模板不用花钱买,各州DMV官网都有免费PDF,搜"你的州+bill of sale DMV"就有。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['私人交易','过户','干货'], 'active', '2026-03-23 11:00:00-07', '2026-03-23 11:00:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000040', 'd0000000-0000-0000-0003-000000000021', 'a1000000-0000-0000-0000-000000000035', E'第3条真的血泪教训,我去年卖车没写时间,买家过户拖了一个月,期间吃了张过路费罚单寄到我家,折腾了俩月才撤掉。大家一定要写时间+当天交Release of Liability。', '2026-03-24 16:45:00-04') ON CONFLICT (id) DO NOTHING;

-- P22 讨论:冷启动哒哒响(帕萨迪纳Lucy)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000022', 'a1000000-0000-0000-0000-000000000032', 'discussion', '早上冷启动前几秒哒哒哒响,热车后消失,严重吗?', E'2016年的RAV4,10万英里出头。最近发现早上第一次点火,发动机会哒哒哒响个几秒钟,声音从发动机上部来的,热车之后就完全听不到了,白天再启动也没有。油我一直用5W-30半合成,5000英里一换。这是气门响还是什么?要紧吗?会不会是机油问题?担心中……', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['异响','发动机','丰田'], 'active', '2026-03-24 08:50:00-07', '2026-03-24 08:50:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000041', 'd0000000-0000-0000-0003-000000000022', 'a0000000-0000-0000-0000-000000000007', E'冷启动几秒的上部哒哒声,十有八九是液压挺杆/VVT在等机油压力建立,机油一泵上去就安静,这在10万英里的车上很常见,不算故障。两个改善方向:1)确认机滤是带止回阀的正品(杂牌机滤止回阀失效会让机油夜里流空,冷启动响得更久);2)RAV4这台2.5用0W-20全合成更合适,冷流动性比5W-30好,冷启动供油更快。要警惕的情况是:响声超过30秒不消失、或者热车也响、或者声音是金属敲缸的闷响,那就要来店里查了。', '2026-03-24 12:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000042', 'd0000000-0000-0000-0003-000000000022', 'a1000000-0000-0000-0000-000000000033', E'我那台老凯美瑞同款症状响了五年了,换了0W-20和Denso机滤之后从几秒变成一秒,该吃吃该喝喝。丰田2.5AR这个机器皮实得很。', '2026-03-25 09:40:00-07') ON CONFLICT (id) DO NOTHING;

-- P23 讨论:拼车与保险(布鲁克林老陈)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000023', 'a1000000-0000-0000-0000-000000000010', 'discussion', '帮邻居小孩拼车接送上下学收点油钱,保险算商业用途吗?', E'情况是这样:同一个小区三家娃都在一个学校,家长群商量让我顺路捎上,每家每月给我150块油钱。我老婆提醒说收了钱万一出事故,保险公司会不会说我是商业运营拒赔?这算不算rideshare?需要买商业保险吗?就是个顺路互助,不想搞得这么复杂,但也不想留隐患。有懂的吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保险','拼车','纽约'], 'active', '2026-03-25 20:15:00-04', '2026-03-25 20:15:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000043', 'd0000000-0000-0000-0003-000000000023', 'a0000000-0000-0000-0000-000000000008', E'关键在于"分摊成本"还是"以营利为目的"。保险行业普遍承认carpool cost-sharing(分摊油钱过路费)不构成livery/for-hire使用,personal auto policy继续有效;但如果收的钱明显超出成本、固定按趟计费像运营,就可能被认定为livery,纽约州对livery排除条款执行得比较严。你这个每家150/月接近成本分摊,一般没问题。稳妥做法:1)打给你的保险agent问一句并留邮件记录;2)钱按油费过路费分摊的名义收;3)liability额度建议提到100/300,拉着三个别人家的孩子,15/30那种底线额度真不够。', '2026-03-26 09:50:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000044', 'd0000000-0000-0000-0003-000000000023', 'a1000000-0000-0000-0000-000000000009', E'补充一个实操:让每个娃家长签个简单的waiver不现实也伤感情,但儿童座椅/booster一定按纽约州规定配齐,8岁以下必须用,查得严,而且真出事这是责任认定的大头。', '2026-03-26 22:30:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000045', 'd0000000-0000-0000-0003-000000000023', 'a1000000-0000-0000-0000-000000000010', E'谢谢!已经给agent发了邮件,booster这就去买两个,想得周到。', '2026-03-27 08:05:00-04') ON CONFLICT (id) DO NOTHING;

-- P24 车评:2020 Tacoma SR5 两年感受(塔科马老周)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000024', 'a1000000-0000-0000-0000-000000000040', 'review', '2020 Tacoma SR5两年6万英里:优缺点都给你说透', E'两年前4.1万英里买的2020 Tacoma SR5双排座,现在10.2万英里,西雅图-塔科马通勤加周末进山,说点实在的。\n\n优点:1)保值离谱,我现在卖掉几乎不亏钱,丰田皮卡在西北部是硬通货;2)可靠性无敌,6万英里唯一非保养支出是一颗轮速传感器120刀;3)部件便宜好修,满大街都是配件。\n\n缺点也不藏着:1)3.5 V6配6AT调校保守,高速超车降挡犹豫,ECT PWR模式好一点;2)坐姿是"腿伸直坐地板"式的,长途腰累,建议试驾至少开40分钟再决定;3)油耗实测18 MPG,不算省;4)隔音一般,雨大的时候车顶像打鼓——西雅图人体会最深。\n\n适合谁:要拉装备进山、打算开十年以上、烦修车的人。不适合谁:主要城市通勤、在乎舒适性的人,真的可以看看Ridgeline。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/2020_Toyota_Tacoma_de_4_portes_au_SIAM_2020.jpg/960px-2020_Toyota_Tacoma_de_4_portes_au_SIAM_2020.jpg'], 'Toyota', 'Tacoma', 2020, ARRAY['皮卡','长期报告','丰田'], 'active', '2026-03-26 17:40:00-07', '2026-03-26 17:40:00-07') ON CONFLICT (id) DO NOTHING;

-- P25 讨论:只换两条胎(丹佛高原红)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000025', 'a1000000-0000-0000-0000-000000000026', 'discussion', '前轮磨得快,只换两条前胎行不行?新胎放前还是放后?', E'春天检查轮胎,前两条磨到3/32了,后两条还有6/32。预算有限,想先只换两条。问题来了:轮胎店说新胎必须装在后轴,我寻思我是前驱车,前轮驱动又转向,新胎不应该放前面吗?店员说这是规定,说不清为什么。到底谁对?还有我这是AWD的Subaru Outback,听说AWD只换两条会伤差速器,真的假的?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['轮胎','AWD','用车常识'], 'active', '2026-03-27 12:40:00-06', '2026-03-27 12:40:00-06') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000046', 'd0000000-0000-0000-0003-000000000025', 'a0000000-0000-0000-0000-000000000007', E'店员说得对但没说明白:新胎放后轴是因为后轮先失去抓地会甩尾(转向过度),普通人救不回来;前轮先滑只是推头,松油门就能恢复,所以宁可让磨损胎在前。但你后半句更关键——Outback是全时四驱,斯巴鲁明确要求四条胎周长差不能超过2/32,只换两条新旧差3/32,中央差速器长期带着转速差工作会过热磨损,修一次比四条胎贵多了。你这个情况要么四条一起换,要么问店里能不能把两条新胎shave(削到和旧胎一样深),部分专业店有这服务。', '2026-03-27 17:20:00-06') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000047', 'd0000000-0000-0000-0003-000000000025', 'a0000000-0000-0000-0000-000000000008', E'省钱思路给你:后两条6/32其实也快到该换的档口了(科罗拉多雨雪多,4/32以下雪地就很勉强),不如等Costco或Discount Tire四条装的季度促销,一次换四条摊下来不比换两条贵太多,还解决AWD问题。另外前轮磨得比后轮快一倍,说明你很久没做轮胎换位了,以后每5000-7500英里换位一次,四条一起磨才能四条一起换。', '2026-03-28 10:05:00-06') ON CONFLICT (id) DO NOTHING;

-- P26 晒车:Model 3 Performance(库比蒂诺码农)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000026', 'a1000000-0000-0000-0000-000000000005', 'showoff', '年终奖落地:二手Model 3 Performance,三秒俱乐部报到', E'去年蹲了半年P版价格,终于在年后用一个还不错的价格收了台2023 Model 3 Performance,2.1万英里,前任车主是个爱惜车的老哥,原厂膜都给我贴好了。提车两周感受:3.1秒破百在南湾早高峰毫无用武之地,但每一脚都是快乐。20寸轮毂过坑要格外小心,湾区的路你们懂的。周末去了趟半月湾,山路上这车的底盘支撑和双电机的出弯动力真的值回票价。下一步计划:换一套UP的防倾杆。照片是提车当天拍的。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Tesla_Model_3_Performance_IMG001.jpg/960px-Tesla_Model_3_Performance_IMG001.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Tesla_Model_3_Performance_IMG002.jpg/960px-Tesla_Model_3_Performance_IMG002.jpg'], NULL, NULL, NULL, ARRAY['Tesla','提车','性能车'], 'active', '2026-03-05 19:30:00-08', '2026-03-05 19:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000048', 'd0000000-0000-0000-0003-000000000026', 'a0000000-0000-0000-0000-000000000003', E'P版轮胎预算要做足,PS4S一套四条2000刀不到一点,暴力驾驶2万英里就见底,温柔点能撑3万。恭喜恭喜,84和9号公路欢迎你。', '2026-03-06 09:20:00-08') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000049', 'd0000000-0000-0000-0003-000000000026', 'a1000000-0000-0000-0000-000000000031', E'羡慕,弗里蒙特打工人还在开买菜车。20寸配薄胎真的容易鼓包,建议买个轮胎保险或者留一条备用胎在车库。', '2026-03-06 21:45:00-08') ON CONFLICT (id) DO NOTHING;

-- P27 讨论:退货冷静期误区(天普市阿婷)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000027', 'a1000000-0000-0000-0000-000000000034', 'discussion', '朋友说买车有三天冷静期能无理由退,是真的吗?', E'昨天在dealer看中一台二手CRV,销售催得急,朋友说"你先签,反正加州买东西有三天冷静期,不满意三天内能退"。我总觉得不对劲,车这种大件也适用吗?今天上网查又看到什么"contract cancellation option",两天可以退但要买?彻底看晕了。有明白人给捋一捋吗?签了字到底还有没有后悔药?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['避坑','二手车','加州'], 'active', '2026-03-06 21:20:00-08', '2026-03-06 21:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000050', 'd0000000-0000-0000-0003-000000000027', 'a0000000-0000-0000-0000-000000000008', E'你的直觉是对的,你朋友说的是大坑:美国买车没有法定冷静期,签字生效,这是每年坑掉无数新移民的头号误区。你查到的是加州特有的Contract Cancellation Option:仅限4万美元以下的二手车、仅限dealer购买,而且要在签合同时花钱买这个选项(按车价阶梯,几十到几百刀),买了才有2天退车权,退车还可能付restocking fee。没买这个选项,签了就是你的了。所以:合同没看懂就不签,销售越催越要慢,"今天不定明天就没了"是全美统一话术。', '2026-03-07 10:15:00-08') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000051', 'd0000000-0000-0000-0003-000000000027', 'a0000000-0000-0000-0000-000000000001', E'老王补充:那个cancellation option其实可以当谈判工具,你提出要买,有的销售怕你真退,反而在车价上让一步。另外签字前把合同拍照发给懂的朋友看十分钟,dealer不让拍照看合同的,扭头就走,这种店必有猫腻。', '2026-03-07 18:40:00-08') ON CONFLICT (id) DO NOTHING;

-- P28 讨论:机油更换里程(新泽西Leo)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000028', 'a1000000-0000-0000-0000-000000000012', 'discussion', '全合成机油到底5000英里换还是7500换?说明书和修车店说的不一样', E'车是2019 Accord 1.5T,说明书说跟Maintenance Minder走,基本上快到9000英里才提示换油。但我常去的修车店每次贴纸都写5000英里回来换,说涡轮车机油衰减快,尤其我这种短途通勤多的。到底听谁的?多换伤钱,少换怕伤发动机,1.5T还有机油增多的传闻,更纠结了。大家的1.5T都多少英里换?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['机油','保养','本田'], 'active', '2026-03-07 16:10:00-05', '2026-03-07 16:10:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000052', 'd0000000-0000-0000-0003-000000000028', 'a0000000-0000-0000-0000-000000000007', E'两边都有道理,取个科学的中间值。Maintenance Minder是按算法算的,正常工况到15%提示没问题;但它对"短途多、冬天冷启动多"这种严苛工况的修正不够激进。你这台1.5T直喷+涡轮+新泽西冬天短途,汽油稀释机油(oil dilution)确实比自吸车明显——检查方法很简单:拔机油尺闻,汽油味重、油位反而升高,就是稀释了。我的建议:冬天按5000-6000换,夏天长途多可以放到7500,用全合成别用blend。5000贴纸对店家有利益成分,但对你这个具体车型不算坑。', '2026-03-07 20:30:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000053', 'd0000000-0000-0000-0003-000000000028', 'a1000000-0000-0000-0000-000000000014', E'同款1.5T车主,费城冬天短途,我按6000换,每次自己带Costco的全合成让店里换,工费30刀,一年油钱膜钱省下不少。机油增多那个事多跑跑高速让机油热透就能挥发掉一些,别老是两英里买菜路。', '2026-03-08 11:25:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000054', 'd0000000-0000-0000-0003-000000000028', 'a1000000-0000-0000-0000-000000000012', E'学到了,原来机油尺还能闻出问题,明早就去闻闻。谢谢Tony和大熊!', '2026-03-08 21:50:00-04') ON CONFLICT (id) DO NOTHING;

-- P29 攻略:换胎季挑店(修车匠Tony)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000029', 'a0000000-0000-0000-0000-000000000007', 'review', '换胎季到了:轮胎在哪买、在哪装,一篇讲清楚', E'三四月是换胎高峰,讲讲怎么花对钱。\n\n在哪买:1)Costco——会员价含安装、终身补胎、充氮气,米其林普利司通促销时最香,缺点是品牌少排队久;2)Discount Tire/America''s Tire——品牌全,价格可谈(是的,可以砍价,拿着网上报价让他们match),免费补胎政策慷慨;3)Tire Rack网购——尺寸冷门的胎经常最便宜,寄到合作安装店,适合知道自己要什么的人;4)dealer——最贵,除非有价格match活动。\n\n怎么挑胎:别只看价格,看三个指标:UTQG磨损指数(500以上耐用)、湿地评级、生产日期(DOT码后四位,超过两年的库存胎要求换新或打折)。加州这种不下雪的,买高分all-season就行,别为用不上的雪地性能付钱。\n\n安装当天盯三件事:1)对角上扭力扳手,不是风炮怼到底——风炮拧过头是刹车盘变形和螺栓断裂的常见原因;2)四轮换位记录清零;3)做动平衡后要求试跑,60-70mph方向盘不抖才算完。\n\n最后:装完100英里内回去免费re-torque一次,大部分店都有这服务,很少人知道。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['轮胎','干货','避坑'], 'active', '2026-03-15 10:30:00-07', '2026-03-15 10:30:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000055', 'd0000000-0000-0000-0003-000000000029', 'a1000000-0000-0000-0000-000000000013', E'DOT日期那条太重要了,我上次在小店差点被装了三年前的库存胎,幸亏看了这里学的知识当场要求换。Tony的帖子每篇必读。', '2026-03-16 09:45:00-04') ON CONFLICT (id) DO NOTHING;

-- P30 讨论:高速胎噪变大(圣塔克拉拉Ray)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000030', 'a1000000-0000-0000-0000-000000000038', 'discussion', '高速上嗡嗡声越来越大,轮胎的问题还是轴承?', E'最近上101明显感觉车里嗡嗡声比以前大,55mph以上尤其明显,像有一架小飞机跟着。变道的时候声音好像会轻微变化。轮胎是三年前换的,还有5/32左右。到底怎么区分是胎噪还是轮毂轴承坏了?听说轴承坏了继续开会把轮子甩出去,吓人。去店里检查会不会直接让我大换特换?想先自己有个判断。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['异响','轴承','轮胎'], 'active', '2026-03-09 18:20:00-07', '2026-03-09 18:20:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000056', 'd0000000-0000-0000-0003-000000000030', 'a0000000-0000-0000-0000-000000000007', E'你已经自己找到关键线索了:变道声音变化是轴承的经典特征。原理:向左变道时重量压到右轮,如果声音变大,大概率右侧轴承;声音变小则是左侧。胎噪一般不随变道变化,但会随路面材质变化(新铺的沥青上安静、旧水泥路吵)。再补一个自查:把车顶起来,手握轮胎上下12点和左右3-9点摇,有旷量或转动时手能摸到沙沙的震动就是轴承。轴承坏初期不会甩轮子,但拖几个月会连带损坏轮速传感器触发ABS灯。换一个轴承带工300-450刀,只换坏的那个,不用四个全换,谁让你全换就换店。', '2026-03-10 08:40:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000057', 'd0000000-0000-0000-0003-000000000030', 'a0000000-0000-0000-0000-000000000008', E'也别完全排除轮胎:三年的胎如果长期没做换位,可能有锯齿状偏磨(cupping),声音也是嗡嗡的,用手顺着胎面摸一圈,有波浪感就是。偏磨的胎没救,只能换,而且要查是不是减震器老化导致的。先按Tony的方法排查轴承,两个都查了再去店里,你就不会被牵着走。', '2026-03-10 21:15:00-07') ON CONFLICT (id) DO NOTHING;

-- P31 闲聊:搬家季卖车还是运车(华府Daniel)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000031', 'a1000000-0000-0000-0000-000000000015', 'discussion', '夏天要搬去西雅图,车是卖了重买还是运过去?', E'拿到新offer,六月从DC搬西雅图。一台2021年的CX-5,车况不错还有贷款没还完。纠结:1)运车横跨美国报价1400-1800刀,要两周;2)自己开过去,3000英里加酒店油钱也小一千,还搭一周假期;3)DC这边卖掉,到西雅图重买,但华州有销售税,重买要交10%的税感觉血亏。大家搬家都怎么处理车的?有没有什么我没想到的坑?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['搬家季','闲聊','西雅图'], 'active', '2026-03-28 11:30:00-04', '2026-03-28 11:30:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000058', 'd0000000-0000-0000-0003-000000000031', 'a0000000-0000-0000-0000-000000000006', E'搬来西雅图的人告诉你:留着车运过来或开过来。华州对外州搬入的自用车免use tax(拥有超过90天的车),你重买才要交10%,卖掉重买是最亏的。开过来走I-90风景很好,六月路况也好,当成公路旅行。运车的话选broker前查DOT编号投诉记录,报价太低的都会中途加价。', '2026-03-28 19:20:00-07') ON CONFLICT (id) DO NOTHING;

-- P32 讨论:代购车靠谱吗(波特兰小鹿)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000032', 'a1000000-0000-0000-0000-000000000008', 'discussion', '微信群里的"代购车"服务靠谱吗?说能拿到dealer内部价', E'本地华人群里有人做"买车代购",说认识各家dealer的fleet manager,能拿到内部价,收500服务费,还包谈判包提车。我英语一般也怕被销售忽悠,有点心动。但又怕这是套路,比如他跟dealer拿回扣,所谓内部价其实比我自己谈还贵?用过这类服务的朋友说说体验?或者有什么办法验证他给的价格是不是真的好?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['买车','避坑','代购'], 'active', '2026-03-10 20:45:00-07', '2026-03-10 20:45:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000059', 'd0000000-0000-0000-0003-000000000032', 'a0000000-0000-0000-0000-000000000008', E'这行水很深,好坏都有,验证方法比猜人品靠谱:1)让他先报out-the-door总价(含税费杂费),你自己同时给三家dealer发邮件要OTD报价——现在邮件询价销售都肯给,这就是你的基准线,他能比基准低才有价值;2)服务费必须事前书面确定,警惕"免服务费"的,那说明他吃的是dealer返点,屁股坐在对面;3)所有文件签字前你自己过目,加装的extended warranty、GAP、贴膜套餐一律先拒绝,很多代购的猫腻在F&I环节塞产品。做到这三条,代购顶多赚个明面上的辛苦钱。', '2026-03-11 09:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000060', 'd0000000-0000-0000-0003-000000000032', 'a0000000-0000-0000-0000-000000000006', E'我用过一次靠谱的,省的钱确实比服务费多,但那位是明码标价只收买家钱的。避坑酱说的邮件询价法你其实自己就能做,复制粘贴一段英文模板发十家,坐等报价互杀,英语不好完全不影响,砍价发生在邮箱里不在店里。', '2026-03-11 22:10:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000061', 'd0000000-0000-0000-0003-000000000032', 'a1000000-0000-0000-0000-000000000008', E'邮件询价这招好,我先自己发一轮试试,拿到基准价再决定用不用他。谢谢两位!', '2026-03-12 12:40:00-07') ON CONFLICT (id) DO NOTHING;

-- P33 车评:2022 Model Y 一年三万迈(贝尔维尤Mia)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000033', 'a1000000-0000-0000-0000-000000000039', 'review', '2022 Model Y长续航,西雅图通勤一年3万英里流水账', E'去年这时候二手入的2022 Model Y LR,3.3万英里买入,现在6.4万英里,贝尔维尤到西雅图每天520桥通勤,说说真实感受。\n\n通勤:HOV道对EV不再免费但通勤时间还是省,单踏板堵车比油车轻松太多。冬天西雅图那种4度小雨天,续航打八折左右,比东部朋友的七折好一些,热泵功不可没。\n\n花费:电费家充每月45刀上下,对比之前RAV4每月180刀油钱。一年保养支出:雨刮25刀+轮胎换位0刀(Costco免费),就这些。轮胎还剩4/32,Model Y吃胎是真的,下个月该换了,预算1000刀。\n\n小毛病:后备箱密封条渗过一次水(保修换了)、车机重启过三次、手机钥匙偶尔失灵。都不致命但确实存在,买它要接受它是个电子产品。\n\n总结:通勤工具满分,家庭唯一用车85分,雪山滑雪往返稳得很,但拖挂和长途穿越就别指望了。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Tesla_Model_Y_1X7A6211.jpg/960px-Tesla_Model_Y_1X7A6211.jpg'], 'Tesla', 'Model Y', 2022, ARRAY['电动车','长期报告','西雅图'], 'active', '2026-03-12 21:35:00-07', '2026-03-12 21:35:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000062', 'd0000000-0000-0000-0003-000000000033', 'a1000000-0000-0000-0000-000000000007', E'雨神认证:西北部开EV最大的敌人不是冷是湿,车库有除湿最好。Model Y吃胎+1,换胎时试试Crossclimate2,静音和寿命都比原厂胎强。', '2026-03-13 12:20:00-07') ON CONFLICT (id) DO NOTHING;

-- P34 讨论:Carfax事故记录(奥斯汀Ethan)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000034', 'a1000000-0000-0000-0000-000000000021', 'discussion', 'Carfax上有一条minor accident,这车还能要吗?', E'看中一台2021 Mazda CX-30,价格比同款干净记录的便宜2000刀。Carfax显示两年前有一条"minor damage, rear",没有airbag展开,之后正常保养记录连续。销售说就是被追了个尾换了个杠。这种记录的车能买吗?minor damage的定义到底是什么,会不会其实伤到大梁了Carfax也只写minor?买了以后卖车是不是也会被压价?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['二手车','事故车','Carfax'], 'active', '2026-03-13 13:15:00-05', '2026-03-13 13:15:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000063', 'd0000000-0000-0000-0003-000000000034', 'a0000000-0000-0000-0000-000000000008', E'先明确:Carfax的minor/moderate/severe是根据报案和维修数据估的,不是权威鉴定,minor可以比看起来重,干净记录也可能有没报保险的私修。所以答案不在报告里,在车上:花150-200刀做个PPI(pre-purchase inspection),指名让技师查后部——后备箱地板有没有褶皱、后纵梁有没有焊接或腻子痕迹、漆膜仪测后侧漆面厚度。真只是换杠喷漆,2000刀折扣是白捡;伤到纵梁,给我5000折扣也不要。卖车时确实会被继续压价,所以你今天拿到的折扣要够深,2000刀对这个价位的车算合理但不惊喜,PPI干净的话可以再磨500。', '2026-03-13 18:40:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000064', 'd0000000-0000-0000-0003-000000000034', 'a0000000-0000-0000-0000-000000000007', E'技师视角教你两个当场就能做的:1)打开后备箱掀起地毯,看备胎槽,原厂冲压面是平整带规则筋线的,修过的会有波浪、砂纸痕或新喷的底漆;2)看后门和后翼子板的缝隙宽窄是否左右对称,追尾修复不到位缝隙骗不了人。这两下没问题,基本就是换杠级别的小碰。', '2026-03-14 10:05:00-05') ON CONFLICT (id) DO NOTHING;

-- P35 晒车:F-150拉建材(罗兰岗车神)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000035', 'a1000000-0000-0000-0000-000000000033', 'showoff', '自家后院翻新全靠它:F-150一天三趟Home Depot', E'最近后院铺paver搞landscaping,我的F-150立了大功:一天跑了三趟Home Depot,水泥袋、沙子、石板、木方,一共拉了小两吨,分批运完悬挂稳稳的。以前开轿车的时候租他们的flatbed truck一次75刀还要掐着75分钟还车,现在自己有皮卡是真的自由。晒一张今天满载归来的照片。顺便说一句,斗里拉水泥袋记得垫个bed mat,不然撒一层灰吹都吹不干净,问我怎么知道的。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Ford_F-150_front_view_%28fourteenth_generation%29.jpg/960px-Ford_F-150_front_view_%28fourteenth_generation%29.jpg'], NULL, NULL, NULL, ARRAY['皮卡','DIY','晒车'], 'active', '2026-03-17 17:50:00-07', '2026-03-17 17:50:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000065', 'd0000000-0000-0000-0003-000000000035', 'a1000000-0000-0000-0000-000000000003', E'皮卡在手天下我有,圣盖博这边邻居搬家都来找我,现在学会了收一顿火锅当运费哈哈。铺paver辛苦,成品图记得晒。', '2026-03-18 09:35:00-07') ON CONFLICT (id) DO NOTHING;

-- P36 讨论:冷却液液位警告(密歇根Anna)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000036', 'a1000000-0000-0000-0000-000000000023', 'discussion', '仪表跳出冷却液不足警告,加了半个月又亮了,哪里漏了?', E'2018 Ford Escape 1.5T,半个月前跳coolant low警告,买了瓶对应颜色的防冻液加到MAX线,今天警告又亮了,一看液位又到MIN以下。地库车位地上没看到明显水渍,水温表一直正常。这算漏得快吗?会不会是传说中的缸内渗漏?这台Escape我买的时候就听说1.5T有冷却液问题,现在有点慌,开去修车店之前想先了解下大概是什么情况、修起来什么价位。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['冷却液','福特','维修'], 'active', '2026-03-18 19:45:00-04', '2026-03-18 19:45:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000066', 'd0000000-0000-0000-0003-000000000036', 'a0000000-0000-0000-0000-000000000007', E'很遗憾你的担心方向是对的:Ford 1.5 EcoBoost有公开的缸盖冷却液渗入气缸的通病,福特为此有过Customer Satisfaction Program(21N12,部分车延保到8.4万英里)。自查两步:1)早上冷车启动瞬间看排气管,如果冒白甜雾且持续,是冷却液进缸的信号;2)地上没水渍+半个月掉到MIN以下,外漏可能性小,先做个冷却系统压力测试(压测50刀左右)确认。重点:拿VIN打给Ford dealer查你的车在不在21N12覆盖范围内,在的话缸盖甚至短块更换可能免费,先查这个再谈自费修,自费换缸盖3000刀起。', '2026-03-19 09:20:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000067', 'd0000000-0000-0000-0003-000000000036', 'a1000000-0000-0000-0000-000000000024', E'我同事的Escape就是这个问题,查了VIN在延保范围内,dealer免费换了短块,前后拖了三周但没花钱。一定先查VIN别自费!另外期间备着防冻液随时补,别让它低于MIN干烧。', '2026-03-19 20:55:00-04') ON CONFLICT (id) DO NOTHING;

-- P37 讨论:拍卖车能碰吗(芝加哥风哥)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000037', 'a1000000-0000-0000-0000-000000000022', 'discussion', 'Copart拍卖车比市场价便宜一半,普通人能碰吗?', E'刷Copart和IAAI看到很多车便宜得离谱,同款2022凯美瑞市场2.2万,拍卖场1.1万就能拿下,标着run and drive。我手痒了:是不是找个有dealer license的代拍,加上拍卖费运费修理费,落地也就1.5万,血赚?还是说这里面全是雷?身边没人玩过拍卖车,求科普,芝加哥这边有靠谱的代拍渠道吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['拍卖车','避坑','二手车'], 'active', '2026-03-19 21:10:00-05', '2026-03-19 21:10:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000068', 'd0000000-0000-0000-0003-000000000037', 'a0000000-0000-0000-0000-000000000008', E'先泼冷水:Copart上九成以上是保险公司报废车,便宜一半的凯美瑞几乎必然是salvage title,修完过rebuilt检验才能上路,残值和保险都打折(翻我之前rebuilt那篇)。run and drive只保证"到场时能打着能挪动",不保证变速箱不响气囊没爆。真实成本公式:拍卖价+buyer fee(几百到上千)+代拍费+运费+修理费+补气囊(一个座椅气囊带布套几百刀,爆四个就是小几千)+rebuilt检验费,老玩家修完落地一般是市场价的75-85折,不是五折。新手第一坑就是照片看着完好,到手发现底下全是伤。想省钱不如去买保险公司流出的干净title租赁返还车。这行能赚的是有修理厂和渠道的人,不是我们。', '2026-03-20 10:25:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000069', 'd0000000-0000-0000-0003-000000000037', 'a0000000-0000-0000-0000-000000000007', E'我们店有时帮客人评估拍卖车,说个内行细节:现在的车追一下尾,雷达、摄像头、传感器校准就能吃掉两三千,电动车电池包磕一下直接总成报废,拍卖车的"小事故"修理费远比十年前高。风哥要真想玩,从冰雹车和玻璃损坏(glass claim)这类非结构损伤入门,别碰正碰追尾和水泡。', '2026-03-20 19:40:00-05') ON CONFLICT (id) DO NOTHING;

-- P38 攻略:学生与好司机保险折扣(二手车避坑酱)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000038', 'a0000000-0000-0000-0000-000000000008', 'review', '留学生和年轻司机省保费指南:这五个折扣你可能一个都没拿', E'车险对25岁以下和新驾照人群是真的贵,但很多折扣是"不问就没有",整理五个最常被漏掉的:\n\n1)Good Student Discount:全日制学生GPA 3.0以上(B平均),凭成绩单能减8-15%,研究生很多公司也认,每次续保时重新提交一次。\n\n2)Defensive Driving Course:上一门州认可的防御性驾驶网课(20-40刀,几小时),部分州强制保险公司给折扣,纽约州直接减10%管三年,性价比之王。\n\n3)Telematics/UBI程序:Progressive Snapshot、State Farm Drive Safe那类,开车温柔的能减10-30%。注意急刹和深夜开车会扣分,外卖党慎入,大部分公司试用期表现差也不会涨价,可以白嫖试一轮。\n\n4)Low Mileage:年里程低于7500报给保险,学生走路上课的别按默认12000报。\n\n5)捆绑租客保险:renters insurance一年100多刀,捆绑car policy的折扣经常超过租客险本身的钱,等于白拿一份财产险。\n\n最后提醒:折扣叠满也别忘了每年重新shop一轮,同一个人换家公司报价差30%是常态,忠诚在美国保险业不值钱。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保险','留学生','省钱'], 'active', '2026-03-20 14:20:00-07', '2026-03-20 14:20:00-07') ON CONFLICT (id) DO NOTHING;

-- P39 讨论:春假长途前检查(奥兰多阿福)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000039', 'a1000000-0000-0000-0000-000000000017', 'discussion', '春假从奥兰多开去Key West,出发前该检查什么?', E'下周春假,计划带家人从奥兰多开去Key West,往返800多英里,跨海大桥听说很晒很堵。车是2019 Highlander,7.8万英里,平时就市区代步,没跑过这么远。出发前自己能检查些什么?要不要专门去店里做个check?一号公路那段没有备胎的话是不是很危险?第一次带娃跑长途,想稳一点。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['春假','自驾','长途检查'], 'active', '2026-03-11 20:30:00-04', '2026-03-11 20:30:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000070', 'd0000000-0000-0000-0003-000000000039', 'a0000000-0000-0000-0000-000000000007', E'800英里对7.8万英里的Highlander是小菜,自查五分钟版:1)胎压按门框标签打足(冷胎测),看一眼四条胎有没有钉子和鼓包,确认备胎有气——很多人备胎十年没检查过,是瘪的;2)机油尺液位、冷却液壶液位在刻度内;3)灯光全亮一遍;4)雨刮喷水正常(佛州午后雷阵雨说来就来);5)空调制冷给力,Keys那一路暴晒。如果最近一次保养在5000英里内做的,不用专门进店。带娃再备:12V充气泵一个(30刀,比备胎还实用)、水和零食,Seven Mile Bridge堵起来没有下一个出口。', '2026-03-12 09:15:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000071', 'd0000000-0000-0000-0003-000000000039', 'a0000000-0000-0000-0000-000000000008', E'补一条很多人不知道的:检查你保险有没有roadside assistance,没有的话AAA经典会员几十刀,Keys那种单路线地方拖车费天价,一次就回本。手机下好离线地图,一号公路部分路段信号很差。', '2026-03-12 15:50:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000072', 'd0000000-0000-0000-0003-000000000039', 'a1000000-0000-0000-0000-000000000017', E'清单截图保存了!备胎果然只有18psi,已充好,充气泵也下单了。回来发游记。', '2026-03-13 11:30:00-04') ON CONFLICT (id) DO NOTHING;

-- P40 晒车:Ram TRX(达拉斯德州哥)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000040', 'a1000000-0000-0000-0000-000000000019', 'showoff', '圆梦了:702马力Ram TRX,V8绝唱收下了', E'F-150还留着干活,但男人的车库里总得有台不讲道理的玩具。TRX停产之后价格回落,我盯了半年,上周终于收了台2022年的,1.9万英里,车况完美。6.2机械增压V8,702马力,点火那一声整个街区都知道我回家了。周末去了趟郊外的土路,起步弹射那一下推背感这辈子忘不了。油耗?10 MPG,别问,问就是情怀税。德州汽油便宜,这就是我留在德州的理由之一。上两张图,涡轮党勿喷,V8的浪漫你们不懂。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Ram_1500_TRX_MYLE_Festival_2025_DSC_9555.jpg/960px-Ram_1500_TRX_MYLE_Festival_2025_DSC_9555.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/2021-22_RAM_1500_TRX.jpg/960px-2021-22_RAM_1500_TRX.jpg'], NULL, NULL, NULL, ARRAY['皮卡','性能车','晒车'], 'active', '2026-03-22 16:20:00-05', '2026-03-22 16:20:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000073', 'd0000000-0000-0000-0003-000000000040', 'a1000000-0000-0000-0000-000000000020', E'休斯顿姐妹替你心疼油钱三秒钟,然后继续羡慕。这声浪隔着屏幕都听见了。', '2026-03-22 20:45:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000074', 'd0000000-0000-0000-0003-000000000040', 'a1000000-0000-0000-0000-000000000028', E'德州哥你等着,我下周提车,维加斯这边也收了一台,到时候隔空对饮。TRX停产才懂,V8真的是买一台少一台。', '2026-03-23 12:30:00-07') ON CONFLICT (id) DO NOTHING;

-- P41 讨论:车窗贴膜加州规定(圣地亚哥Wendy)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000041', 'a1000000-0000-0000-0000-000000000029', 'discussion', '加州贴膜到底哪些窗能贴?会不会被警察拦?', E'圣地亚哥太阳越来越毒,想给车贴膜。华人贴膜店说前排也能贴,"大家都这么贴,没事"。但我查加州法规好像前侧窗透光率要70%以上?那市面上那些贴得黑黑的车是怎么回事,都在违法吗?被拦到罚多少?有没有既合法又隔热的方案?怕晒又怕吃fix-it ticket,求过来人指路。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['贴膜','加州','法规'], 'active', '2026-03-23 13:10:00-07', '2026-03-23 13:10:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000075', 'd0000000-0000-0000-0003-000000000041', 'a0000000-0000-0000-0000-000000000001', E'你查得没错:加州规定前挡只能贴最上沿4英寸,前侧窗贴完透光率必须≥70%,后侧窗和后挡随便贴多黑都行(贴黑了要求有双侧后视镜)。路上那些前窗黑黑的确实都在违法,只是警察一般不专门为这个拦车,多是别的事被拦时加一张fix-it ticket,撕膜复检后销单,罚款不重但麻烦。合法又隔热的方案是贴陶瓷膜:70%透光的陶瓷膜(比如3M Crystalline 70或者龙膜同级)红外阻隔能到90%+,看起来几乎透明但隔热立竿见影,前排贴这种,后排随意加深,既凉快又不怕拦。', '2026-03-23 18:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000076', 'd0000000-0000-0000-0003-000000000041', 'a0000000-0000-0000-0000-000000000008', E'补充避坑:贴膜店说"没事"的时候,吃ticket的是你不是他。选店看两点:用什么牌子的膜敢不敢写在收据上(杂牌膜起泡变紫没售后)、有没有质保卡。陶瓷膜全车500-800是正常价,超过1000的在卖品牌溢价,低于400的膜来路存疑。', '2026-03-24 10:20:00-07') ON CONFLICT (id) DO NOTHING;

-- P42 晒车:维加斯发哥TRX提车(拉斯维加斯发哥)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000042', 'a1000000-0000-0000-0000-000000000028', 'showoff', '说到做到:维加斯也有TRX了,沙漠才是它的主场', E'前几天在德州哥帖子里立的flag,今天兑现:2021 Ram TRX提回家了。维加斯买这车太合理了,出城二十分钟就是沙漠,Baja模式不是摆设是日常。提车当天直接去了趟红岩峡谷外围的土路,35寸胎配Bilstein黑金减震,搓板路上如履平地,这套底盘在铺装路上舒服得不像性能皮卡。唯一的问题:这车宽80多英寸,Strip附近的停车楼进出全靠折后视镜。附一张提车照,德州哥,约起。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Ram_1500_TRX_1X7A0057.jpg/960px-Ram_1500_TRX_1X7A0057.jpg'], NULL, NULL, NULL, ARRAY['皮卡','越野','晒车'], 'active', '2026-03-24 15:40:00-07', '2026-03-24 15:40:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000077', 'd0000000-0000-0000-0003-000000000042', 'a1000000-0000-0000-0000-000000000019', E'好家伙,执行力拉满!沙漠确实是TRX的完全体,德州只有牧场土路。五月我去维加斯出差,后备箱的浪漫到时候碰一碰。', '2026-03-24 19:55:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000078', 'd0000000-0000-0000-0003-000000000042', 'a1000000-0000-0000-0000-000000000025', E'凤凰城到维加斯四个小时,哪天组个西南沙漠车队,我这台老Tundra给你们压压速度。', '2026-03-25 09:10:00-07') ON CONFLICT (id) DO NOTHING;

-- P43 车评:2020 Silverado 2500HD 干活车报告(弗里蒙特Tiger)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000043', 'a1000000-0000-0000-0000-000000000031', 'review', '给装修队开2020 Silverado 2500HD一年:重型皮卡不浪漫但可靠', E'家里装修生意去年添了台二手2020 Silverado 2500HD,6.6汽油V8,当时5.5万英里,现在7.9万英里,天天拉工具拉材料偶尔拖小挖机,说说重型皮卡真实的一面。\n\n能干:床斗里一吨的瓷砖水泥不带哼一声,拖7000磅的设备拖架跟没拖一样,这是半吨卡(F-150/1500那类)给不了的从容。\n\n代价:油耗市区实测11 MPG,悬挂空载时颠得像拖拉机,长度20英尺,湾区停车是地狱难度,基本告别室内停车楼。\n\n一年维护:机油三次、刹车前片一套、一条被螺丝扎的胎,总共1100刀左右,汽油版比柴油版省心太多——柴油版DEF系统和喷油器动辄几千,干轻活真不用上柴油。\n\n给想买重型卡干活的朋友:汽油6.6够用还便宜,买二手重点查拖挂历史,看拖钩磨损和变速箱油状态,被往死里拖过的车变速箱油又黑又糊。纯家用千万别买HD,你需要的是1500,信我。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/New_2020_Chevrolet_Silverado_HD_at_Toronto_International_Autoshow.jpg/960px-New_2020_Chevrolet_Silverado_HD_at_Toronto_International_Autoshow.jpg'], 'Chevrolet', 'Silverado 2500HD', 2020, ARRAY['皮卡','工作车','长期报告'], 'active', '2026-03-25 20:10:00-07', '2026-03-25 20:10:00-07') ON CONFLICT (id) DO NOTHING;

-- P44 讨论:盲点监测误报(迈阿密Sunny)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000044', 'a1000000-0000-0000-0000-000000000018', 'discussion', '盲点监测老是无缘无故报警,后视镜灯狂闪,怎么治?', E'2021 Sonata,最近盲点监测(BSM)动不动就报警,旁边明明没车,后视镜小灯闪个不停,有时候还带滴滴声,吵得心烦。发现下大雨之后特别频繁。是传感器坏了吗?查了下在后保险杠里面?迈阿密天天下雨,是不是进水了?去dealer查一次诊断费就要180,有没有先自己排查的办法?实在不行这功能能关吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['电子故障','传感器','现代'], 'active', '2026-03-26 17:25:00-04', '2026-03-26 17:25:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000079', 'd0000000-0000-0000-0003-000000000044', 'a0000000-0000-0000-0000-000000000007', E'BSM雷达在后杠两侧内部,误报三大原因按概率排:1)后杠雷达区域太脏——泥、虫尸、贴纸、甚至加装的牌照框都会散射雷达波,先把后杠两角彻底洗干净,这一步治好一半的误报;2)后杠受过撞击(哪怕轻微)导致雷达支架角度偏了,雷达是要校准角度的,倒车蹭过花坛都可能歪;3)雨天误报多是传感器密封老化进水,现代这代车有先例。顺序:先洗,再回忆有没有磕碰史,都排除了再去店里读码,读出来一般是"radar blockage"或具体哪侧故障,换一颗传感器件300-400刀。功能可以在设置里关,但雨天误报说明它已经在带病工作,佛州暴雨天你反而最需要它。', '2026-03-26 21:40:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000080', 'd0000000-0000-0000-0003-000000000044', 'a0000000-0000-0000-0000-000000000008', E'查一下你的VIN有没有相关召回或TSB:去NHTSA官网输VIN,免费。现代对部分车型的BSM模块出过技术通告,在TSB范围内dealer按厂家流程处理,比盲修省钱。180刀诊断费可以谈,很多dealer修车就免诊断费。', '2026-03-27 10:15:00-04') ON CONFLICT (id) DO NOTHING;

-- P45 闲聊:油价(法拉盛Frank)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000045', 'a1000000-0000-0000-0000-000000000035', 'discussion', '法拉盛加油站悄悄涨了三毛,春天一到油价就飘', E'昨天路过Northern Blvd常去的那家站,regular一夜之间从3.09涨到3.39,问了下说换夏季配方油了,每年这时候都要涨一波。皇后区的兄弟姐妹现在都在哪家加?Costco要排二十分钟队但便宜两毛五,到底值不值得排?顺便发起个小调查:你们油箱见底才加还是半箱就加?我丈母娘坚持半箱必加,说对油泵好,有科学依据吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['油价','闲聊','纽约'], 'active', '2026-03-27 09:40:00-04', '2026-03-27 09:40:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000081', 'd0000000-0000-0000-0003-000000000045', 'a1000000-0000-0000-0000-000000000010', E'夏季配方每年四五月切换,涨两三毛正常,六月后会稳住。Costco排队20分钟省2.5刀,时薪7.5刀,自己看着办哈哈。你丈母娘有点道理:油泵靠汽油散热,长期贴着油灯开确实伤泵,但半箱就加大可不必,四分之一箱加就行。', '2026-03-27 13:20:00-04') ON CONFLICT (id) DO NOTHING;

-- P46 讨论:二手EV电池怎么验(纽约Vincent)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000046', 'a1000000-0000-0000-0000-000000000009', 'discussion', '想收台二手电动车,电池健康度到底怎么当场验?', E'预算2万出头,在看二手Model 3和Bolt EUV。油车我会看机油看变速箱,但电动车完全抓瞎:电池衰减了多少怎么当场验证?卖家说"表显还有260迈"能信吗?听说有的车充满了表显好看,实际掉电飞快。还有Bolt当年召回换过电池的,是不是反而算加分项?求EV老司机传授验车姿势。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['电动车','二手车','验车'], 'active', '2026-03-28 10:50:00-04', '2026-03-28 10:50:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000082', 'd0000000-0000-0000-0003-000000000046', 'a0000000-0000-0000-0000-000000000003', E'特斯拉的验法:1)让卖家提前充到100%(愿不愿意配合本身就是试金石),表显除以原始EPA就是大致健康度,2019-2021的LR原始310-353看具体版本,先查清楚;2)更准的是服务模式或第三方App(Tessie之类)读电池数据,约看车时带根线;3)试驾时看能耗页,平路60mph巡航Wh/mi在240-280之间算正常,离谱高说明有问题。Bolt你说得对:换过新电池包的是加分项,等于电池重新计龄,让卖家出示召回完成记录(dealer可以按VIN打印),没换过的Bolt直接pass。', '2026-03-28 09:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000083', 'd0000000-0000-0000-0003-000000000046', 'a0000000-0000-0000-0000-000000000007', E'补两个油车思维也适用的:1)查底盘!EV电池包就挂在车底,托底磕碰是大忌,举升机上看电池壳有没有凹陷划伤,有磕痕的再便宜也别要;2)EV轮胎和悬挂损耗比同尺寸油车快(车重扭矩大),看四条胎磨损是否均匀,单侧内磨说明定位或悬挂有问题。纽约的车再加一条:查泡水,Ida那年之后二手市场泡水EV不少,电车泡水比油车致命。', '2026-03-28 16:45:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000084', 'd0000000-0000-0000-0003-000000000046', 'a1000000-0000-0000-0000-000000000009', E'干货密度太高了,已做笔记。周末约了一台21年LR看车,按这套流程走一遍,回来汇报结果。', '2026-03-29 12:10:00-04') ON CONFLICT (id) DO NOTHING;

-- P47 晒车:老Tacoma二十万英里(圣盖博阿强)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000047', 'a1000000-0000-0000-0000-000000000003', 'showoff', '我的老Tacoma今天20万英里整,发帖纪念', E'2008年的Tacoma,今天早上在10号高速上跳到200000整,提前把手机架好录了下来,仪式感这块拿捏住了。这车跟了我11年,从留学生开到两个娃的爹,搬过四次家,拉过无数次家具,进过沙漠下过河滩,除了正常保养就换过一次水泵、一套离合和若干轮胎电瓶。空调至今给力,车漆晒得有点哑光了,舍不得卖,准备再战10万。丰田老皮卡,yyds。附纪念照一张。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Toyota_Tacoma_Extended_Cab_CAC.jpg/960px-Toyota_Tacoma_Extended_Cab_CAC.jpg'], NULL, NULL, NULL, ARRAY['里程碑','丰田','情怀'], 'active', '2026-03-29 10:20:00-07', '2026-03-29 10:20:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000085', 'd0000000-0000-0000-0003-000000000047', 'a1000000-0000-0000-0000-000000000040', E'向20万英里的前辈致敬!我那台2020的才10万出头,原来路还长。二代Tacoma记得查一下车架锈蚀召回有没有做过,加州车应该问题不大。', '2026-03-29 14:35:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000086', 'd0000000-0000-0000-0003-000000000047', 'a0000000-0000-0000-0000-000000000007', E'11年就换过水泵和离合,这就是我们修车的最不喜欢丰田的原因(笑)。再战10万完全没问题,20万这个节点建议把全部油液换一遍:变速箱油、差速器油、转向油、刹车油,几百刀让它焕发第二春。', '2026-03-30 09:50:00-07') ON CONFLICT (id) DO NOTHING;

-- P48 讨论:title没到手能卖车吗(费城大熊)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000048', 'a1000000-0000-0000-0000-000000000014', 'discussion', '贷款刚还清但title还没寄到,这时候能把车卖了吗?', E'上个月把车贷提前还清了,银行说title要4-6周才寄到。偏偏这时候谈好了一个买家,价格很满意,人家等着车用,问我能不能先交车交钱,title到了再补寄给他。听着好像可以但总觉得哪里不对:没有title的交易受法律保护吗?万一title寄丢了呢?宾州这边有什么正规流程处理这种"还清了但title在路上"的情况吗?不想煮熟的鸭子飞了,也不想留纠纷。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['过户','卖车','宾州'], 'active', '2026-03-30 19:15:00-04', '2026-03-30 19:15:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000087', 'd0000000-0000-0000-0003-000000000048', 'a0000000-0000-0000-0000-000000000008', E'"先交车、title后补寄"是纠纷高发操作,强烈不建议:车和钱两清了但过户没完成,期间车的法律责任还挂你头上,买家反悔或title邮寄出问题都是死结。正路有两条:1)问银行能不能做电子放款证明+加急title,很多lender可以出lien release letter,部分州DMV拿着它加当前title就能过户;2)最稳的:约买家等title到手再交易,用500-1000刀的不可退定金(书面写明)把买家锁住,真心买家不会介意等两三周,催着你"没title也先交车"的买家,反而要警惕是不是有别的心思。宾州还可以两人一起去notary/tag service办,他们对这种情况见得多,几十刀手续费买个专业保障。', '2026-03-31 09:40:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000088', 'd0000000-0000-0000-0003-000000000048', 'a0000000-0000-0000-0000-000000000004', E'宾州卖过车的路过:宾州过户本来就必须去notary或AAA当场办,不存在签个title塞邮箱的操作,所以你更不可能绕开title先交车。定金协议这招我用过,买家爽快付了定金等了三周,交易顺利。', '2026-03-31 15:25:00-04') ON CONFLICT (id) DO NOTHING;

-- P49 晒车:春假整备出发(西雅图阿明)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000049', 'a0000000-0000-0000-0000-000000000006', 'showoff', '老伙计洗刷完毕,春假第一站:哥伦比亚河谷', E'趁着周末难得放晴,把我那台老Tacoma里里外外收拾了一遍:洗车打蜡、后斗清空重新铺垫、机油刚换、胎压打满。下周春假带家里两位去哥伦比亚河谷看瀑布,顺路去Hood River吃樱桃派。西雅图的冬天太长了,车干净的那一刻感觉人都精神了。老车不追求光鲜,收拾利索就是对它最大的尊重。出发前留影一张。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Toyota_Tacoma_Extended_Cab_CAC.jpg/960px-Toyota_Tacoma_Extended_Cab_CAC.jpg'], NULL, NULL, NULL, ARRAY['春假','自驾','晒车'], 'active', '2026-03-02 16:30:00-08', '2026-03-02 16:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000089', 'd0000000-0000-0000-0003-000000000049', 'a1000000-0000-0000-0000-000000000007', E'河谷这个季节瀑布水量最大,Multnomah早上九点前到不然停车位没了。老Tacoma状态真好,阿明哥的车品一直在线。', '2026-03-02 20:15:00-08') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000090', 'd0000000-0000-0000-0003-000000000049', 'a1000000-0000-0000-0000-000000000008', E'波特兰人友情提示:84号公路河谷段这几周风大,过Hood River大桥皮卡稳一点但也慢点开。樱桃派选Packer Orchards家的,不谢。', '2026-03-03 11:40:00-08') ON CONFLICT (id) DO NOTHING;

-- P50 车评:二手Model S值不值(圣何塞Jason)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000050', 'a1000000-0000-0000-0000-000000000006', 'review', '试了台2023 Model S:跌了一半价的旗舰,二手真香还是坑?', E'上周陪朋友去看一台2023 Model S长续航,2.8万英里,开价5.2万,当年新车落地小九万,三年腰斩,忍不住研究了一下二手大S到底值不值,分享给同样心动的人。\n\n香的部分:百公里加速3秒级、空气悬挂、前后屏、实测高速续航350英里级别,这个性能和舒适性,5万出头的新车没有对手。乘坐质感确实比Model 3/Y高一个档次,后排大人长途不遭罪。\n\n要冷静的部分:1)保值率就是你看到的样子,你买完它还会继续跌;2)Yoke方向盘(如果是早期批次)见仁见智,掉头真的别扭,试驾时重点体验;3)出保后维修是大件:空气悬挂单角1500+、MCU屏幕出问题四位数,建议留意还剩多少原厂保修,基本车保4年5万英里、电池电机8年;4)21寸轮的胎又贵又费。\n\n我的结论:预算5万、家里有另一台车兜底、能接受贬值的,这是性能豪华性价比之王;要是它当唯一家用车还打算开十年,老老实实Model Y或者EV9更稳。朋友最后砍到5万整拿下了,提车那天笑得像捡到钱。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Tesla_Model_S_%282023%29_Motorworld_Munich_1X7A0025.jpg/960px-Tesla_Model_S_%282023%29_Motorworld_Munich_1X7A0025.jpg'], 'Tesla', 'Model S', 2023, ARRAY['电动车','二手车','豪华车'], 'active', '2026-03-03 20:40:00-08', '2026-03-03 20:40:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000091', 'd0000000-0000-0000-0003-000000000050', 'a0000000-0000-0000-0000-000000000003', E'总结到位。补一句:大S的空气悬挂和铝制车身决定了小事故修起来也贵,保险全险报价会比Model 3高不少,买前先拿VIN问一轮保险再签字,别提完车被保单吓一跳。', '2026-03-04 10:30:00-08') ON CONFLICT (id) DO NOTHING;

-- P51 讨论:smog check过不了(萨克拉门托Ken)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000051', 'a1000000-0000-0000-0000-000000000030', 'discussion', '注册续期smog check没过,monitor not ready是什么意思?', E'车牌注册到期,去做smog check,店里说没过,原因不是排放超标,而是"monitors not ready",让我"开一阵子再来"。一脸懵:什么是monitor?为什么not ready?我上周刚换过电瓶,店员说可能跟这个有关?再考一次还要交一次钱吗?注册马上到期了,开着过期牌会被罚吗?求加州老司机指导,在线等,挺急的。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['smog check','加州','注册'], 'active', '2026-03-30 12:20:00-07', '2026-03-30 12:20:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000092', 'd0000000-0000-0000-0003-000000000051', 'a0000000-0000-0000-0000-000000000007', E'谜底就是你自己说的换电瓶:断电后车载电脑的排放自检监测(readiness monitors)全部清零,需要完成一组特定的行驶循环(drive cycle)才会逐项变成ready,smog站是读这些monitor的状态,not ready就不给测。解决办法:混合工况开一周,包含几次冷启动、市区走走停停、和一段55-65mph匀速20分钟以上的高速,一般50-100英里后monitor就齐了(EVAP那项最慢,油箱保持在1/4到3/4之间有助于它完成)。别信"原地怠速俩小时"的偏方,没用。复测收不收费看店,很多店免费复测一次,去之前问清楚。', '2026-03-30 15:45:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000093', 'd0000000-0000-0000-0003-000000000051', 'a0000000-0000-0000-0000-000000000008', E'注册到期的部分:加州DMV可以先交注册费(网上就能交),smog没过的话注册不会完成但缴费日期算数,避免滞纳金;实在赶不上,AAA或DMV可以给你处理temporary operating permit,几块钱合法开一个月。别硬开过期牌,被拦一次罚的钱够做十次smog。', '2026-03-30 19:30:00-07') ON CONFLICT (id) DO NOTHING;

-- P52 攻略:跨州搬家自驾(波士顿学姐)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000052', 'a1000000-0000-0000-0000-000000000013', 'review', '毕业搬家季预习:自己开车横跨美国,我的完整清单', E'又快到毕业搬家季,去年我从波士顿开到湾区(3100英里,6天),整理一份实操清单给今年要横跨的学弟学妹。\n\n出发前一周:做一次保养并告诉师傅你要跑3000英里,让他重点看胎、刹车、皮带和油液;查保险覆盖(跨州开车没问题,但确认roadside assistance覆盖全国);车顶行李箱谨慎,高速上费油还吵,能塞车里就塞车里。\n\n路线经验:北线I-90风景好但三四月怀俄明段还会封路下雪,查511路况再走;中线I-80最稳;每天开450-550英里是舒适上限,别学网上一天900的狠人,疲劳驾驶不值得。\n\n住宿:大学城的酒店比高速出口的连锁便宜且安全,车上行李全搬进房间太累的话,至少贵重物品带走+行李盖毯子+停在监控位。我在盐湖城见过整排车窗被砸的。\n\n花费实录:油钱470刀(中型SUV)、住宿五晚共600刀、吃饭200刀,合计1300不到,比运车+机票双人便宜,还白赚一次公路旅行。黄石和拱门就在路上,顺路玩起来。\n\n最后:到新州后30-60天内要换驾照和注册(各州期限不同),别拖,拖过期限有的州要重新笔试。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['搬家季','自驾','攻略'], 'active', '2026-03-21 15:10:00-04', '2026-03-21 15:10:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000094', 'd0000000-0000-0000-0003-000000000052', 'a1000000-0000-0000-0000-000000000015', E'马住!正好六月要搬西雅图,I-90北线六月应该没雪了吧,黄石顺路这个太诱人。请问学姐当时两个人轮流开还是一个人?', '2026-03-22 10:25:00-04') ON CONFLICT (id) DO NOTHING;

-- P53 讨论:车贷再融资(亚特兰大Momo)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000053', 'a1000000-0000-0000-0000-000000000016', 'discussion', '车贷利率8.9%,现在做refinance划算吗?', E'去年刚工作时信用分只有660,买车贷款吃了8.9%的高利率,72期。现在信用分爬到740了,听说可以refinance把利率降下来。问题:1)现在这个行情能拿到多少利率算好?2)refinance会不会又hard pull把我信用分打下去?3)有没有什么手续费或者坑,比如变相延长贷款期?车还欠1.8万,还有52期。在信用社问还是网上平台问?有做过的朋友分享下流程和实际省了多少钱吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['车贷','refinance','信用分'], 'active', '2026-03-14 11:35:00-04', '2026-03-14 11:35:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000095', 'd0000000-0000-0000-0003-000000000053', 'a0000000-0000-0000-0000-000000000008', E'660到740是refinance收益最大的区间,你这情况大概率划算。要点:1)740分二手车refi现在能谈到6%上下(credit union通常最低,PenFed、Navy Federal、本地CU都问问);2)hard pull掉几分是真的,但14天内的多次车贷查询算一次,所以集中一两周内比完所有报价;3)最大的坑就是你说的:把52期重新拉回72期,月供好看了总利息更多——refi时明确要求期限≤剩余期限;4)看清有没有origination fee和州里的title转lien费用,超过200刀总费用的要重新算账。8.9%降到6%,1.8万本金52期,总利息大约省1300-1500刀,值得跑一趟。', '2026-03-14 16:50:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000096', 'd0000000-0000-0000-0003-000000000053', 'a1000000-0000-0000-0000-000000000015', E'去年做过:本地credit union从9.2降到5.9,网上申请第二天电话核实,一周搞定,除了DMV换lien的35刀没别的费用。记得refi后旧贷款的autopay要手动关,我差点被重复扣款。', '2026-03-15 09:20:00-04') ON CONFLICT (id) DO NOTHING;

-- P54 晒车:新泽西Leo提F-150(新泽西Leo)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000054', 'a1000000-0000-0000-0000-000000000012', 'showoff', '家里添了第二台车:F-150 XLT,东岸华人也开上皮卡了', E'Accord继续通勤,家里添了台二手2022 F-150 XLT当周末车。在东岸华人圈皮卡还是少数派,丈人第一反应是"买这么大干嘛",结果上周帮他从Costco拉了个烤炉、又帮小舅子搬了家,现在全家真香。5.0 V8的声音每天早上听一遍,新泽西油价还行,养得起。停车确实要适应,车位都得挑头尾。板上德州和西岸的皮卡大佬多,东岸车友有拉活需求的欢迎认识一下,互相帮衬。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Ford_F-150_%28fourteenth_generation%29_Rutesheimer_Autoschau_2025_DSC_9230.jpg/960px-Ford_F-150_%28fourteenth_generation%29_Rutesheimer_Autoschau_2025_DSC_9230.jpg'], NULL, NULL, NULL, ARRAY['提车','皮卡','东岸'], 'active', '2026-03-31 17:20:00-04', '2026-03-31 17:20:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000097', 'd0000000-0000-0000-0003-000000000054', 'a1000000-0000-0000-0000-000000000014', E'费城大熊报到,东岸皮卡互助群可以有!5.0自吸大V8才是F-150正确答案,以后跨州搬家喊一声。', '2026-03-31 21:05:00-04') ON CONFLICT (id) DO NOTHING;

-- P55 讨论:树胶鸟粪漆面(洛杉矶Amy)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000055', 'a1000000-0000-0000-0000-000000000002', 'discussion', '树下停了一周,车顶全是树胶和鸟粪,怎么清不伤漆?', E'公寓车位不够,在路边树下停了一周,回来车顶和引擎盖全是黏糊糊的树胶点,还有好几坨鸟粪干在漆上了。用湿巾使劲擦了一块,好像留下了个印子,吓得不敢动了。这些东西到底怎么清才不伤漆?普通洗车能洗掉吗?那个印子是把漆咬了吗还能救吗?以后停树下有什么防护办法,总不能天天抢车位吧……', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['洗车','漆面','春季'], 'active', '2026-03-29 13:45:00-07', '2026-03-29 13:45:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000098', 'd0000000-0000-0000-0003-000000000055', 'a0000000-0000-0000-0000-000000000007', E'切记别再干擦了!正确顺序:1)先正常洗车把浮灰去掉;2)树胶用专用的bug and tar remover(十几刀)或者异丙酒精喷在微纤维布上敷着软化再轻轻带走,顽固的树胶点用粘土(clay bar)配润滑液处理;3)鸟粪干痕先用湿毛巾敷五分钟泡软再擦,千万别抠。你那个印子:鸟粪是酸性的,时间久了会蚀刻清漆(etching),浅的用抛光剂手工抛能救,深到摸得到凹坑就要机器抛光,詹家几十刀的事,别自己上砂蜡越弄越花。以后:看到鸟粪48小时内处理,伤害就到不了清漆深层。', '2026-03-29 17:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000099', 'd0000000-0000-0000-0003-000000000055', 'a0000000-0000-0000-0000-000000000008', E'长期停树下的防护:打一层蜡或封体剂(sealant)是牺牲层,树胶落在蜡上而不是清漆上,好清理十倍;预算够就上镀晶。半罩式车衣也行但LA风大容易刮蹭漆,要买带内绒的。车里常备一小瓶detailer喷雾和两块微纤维布,见脏随手处理,比周末大扫除有用。', '2026-03-30 10:15:00-07') ON CONFLICT (id) DO NOTHING;

-- P56 讨论:OBD扫码器(哥伦布小舟)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000056', 'a1000000-0000-0000-0000-000000000024', 'discussion', '想买个OBD扫码器自己读故障码,几十刀的蓝牙款够用吗?', E'受这个版的熏陶,决定告别"灯亮就慌"的日子,想买个OBD2扫码器自己先读码再决定去不去店里。亚马逊上从15刀的蓝牙小方块到300刀的专业手持都有,纠结买哪种:便宜的蓝牙款配手机App够用吗?App是不是还要订阅费?能读变速箱和ABS的码吗还是只能读发动机?顺便求个靠谱App推荐,最好能看实时数据的。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['OBD','DIY','工具'], 'active', '2026-03-31 12:30:00-04', '2026-03-31 12:30:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000100', 'd0000000-0000-0000-0003-000000000056', 'a0000000-0000-0000-0000-000000000007', E'普通车主两条路线:1)入门:OBDLink CX或Veepeak蓝牙头(30-40刀)+ Car Scanner App(免费版够用),读发动机码、清码、看实时数据都没问题,这已经覆盖90%的场景;2)进阶:OBDLink MX+(100刀左右)配App能读大部分车的ABS、变速箱、气囊等增强协议,丰田本田福特支持都不错。15刀的ELM327杂牌头别买,芯片是阉割的,读着读着断连还可能锁协议。提醒:读到码别急着换件,P0420不等于换催化器,先来论坛发码问,十次有八次是小问题。', '2026-03-31 16:20:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000101', 'd0000000-0000-0000-0003-000000000056', 'a1000000-0000-0000-0000-000000000031', E'装修队全部车配的MX+,值。另外去AutoZone/O''Reilly免费借读码也是一招,不过人家会顺便推销配件,自己有个头还是方便。Car Scanner的实时油温水温页面跑长途时看着很安心。', '2026-03-31 20:45:00-07') ON CONFLICT (id) DO NOTHING;

-- P57 车评:2020 Ram 1500真实油耗(奥斯汀Ethan)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000057', 'a1000000-0000-0000-0000-000000000021', 'review', '2020 Ram 1500 Laramie两年油耗账本:5.7 V8在德州到底喝多少', E'很多人问Ram 1500 5.7 Hemi真实油耗,我记了两年账,直接上数据。\n\n车况:2020 Laramie 4x4,5.7 V8带eTorque轻混,买时2.9万英里,现在5.8万英里,奥斯汀通勤+每月一次休斯顿往返。\n\n油耗实测(全程App记账):市区通勤14.2 MPG,高速75mph定速19.5 MPG,混合16.8 MPG,拖5500磅的travel trailer跑I-10只有9.8 MPG。夏天开空调市区会掉到13。全年油钱2900刀左右(德州油价温柔,加87就行)。\n\n对比参考:朋友的F-150 3.5EB混合能到18-19,但他拖挂时和我一样烂,涡轮车拖重就原形毕露。5.7的好处是结构简单,两年除了常规保养只换过一组火花塞(16颗,V8的仪式感),eTorque的小电池目前没闹脾气。\n\n结论:买5.7就别指望油耗,买它买的是无脑可靠和V8顺滑。年里程超过1.5万英里又不拖挂的,认真考虑混动皮卡。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Ram_1500_%28DT%29_Hirschaid_2022-20220709-RM-111330.jpg/960px-Ram_1500_%28DT%29_Hirschaid_2022-20220709-RM-111330.jpg'], 'Ram', '1500', 2020, ARRAY['皮卡','油耗','长期报告'], 'active', '2026-03-28 14:30:00-05', '2026-03-28 14:30:00-05') ON CONFLICT (id) DO NOTHING;

-- P58 讨论:湾区通勤EV还是混动(弗里蒙特Tiger)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000058', 'a1000000-0000-0000-0000-000000000031', 'discussion', '每天弗里蒙特到南旧金山90英里通勤,买EV还是混动?', E'新项目要跑南旧金山,每天往返90英里,880堵得心肌梗塞。现在开的皮卡干活用,想添一台纯通勤车,预算3万上下二手。纠结EV还是混动:EV走carpool道(贴纸政策现在什么情况?)+充电便宜,但我租的房子没法装家充;混动Camry/Prius无脑省心,但走不了carpool。有没有同款长通勤的兄弟给个建议,没有家充的EV通勤到底痛不痛苦?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['通勤','电动车','湾区'], 'active', '2026-03-04 21:15:00-08', '2026-03-04 21:15:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000102', 'd0000000-0000-0000-0003-000000000058', 'a0000000-0000-0000-0000-000000000003', E'先泼个冷水:加州carpool贴纸(CAV decal)项目已经在2025年9月底到期结束了,国会没续,现在买EV不能单人走carpool道,这个最大卖点没了,决策权重要重新算。没有家充的90英里日通勤,意味着每两三天一次超充,每次30-40分钟,油钱是省了时间搭进去了,除非你公司有充电桩——先去查你新office车库,有L2桩的话EV依然成立,白天上班充满,体验和家充差不多。', '2026-03-05 09:40:00-08') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000103', 'd0000000-0000-0000-0003-000000000058', 'a1000000-0000-0000-0000-000000000005', E'同款90英里通勤路过:我是公司有桩才敢开电车的,插上下班拔走,五年没去过超充。公司没桩的话听我的买混动,Camry Hybrid实测46 MPG,90英里一天油钱不到8刀,而且880那种蠕行路况混动最省。别小看每周多出来的两小时充电时间,通勤族的时间最贵。', '2026-03-05 12:20:00-08') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000104', 'd0000000-0000-0000-0003-000000000058', 'a0000000-0000-0000-0000-000000000008', E'算笔账收尾:3万预算二手Camry Hybrid能买到2022-23低里程的,年油钱约1400;同价Model 3也能买到,超充年电费约1100,但没家充没公司桩的话,一年多花50+小时在充电站。差300刀油钱买回50小时,混动赢。等你换了有车库的房子,再电动化不迟。', '2026-03-05 22:35:00-08') ON CONFLICT (id) DO NOTHING;

-- P59 闲聊:洗车排队(达拉斯Lily)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000059', 'a0000000-0000-0000-0000-000000000005', 'discussion', '周末洗车排队四十分钟,达拉斯人对洗车是有什么执念吗', E'今天下午去家附近的洗车行,好家伙,队排到街上,等了四十多分钟。得州人是不是把洗车当周末娱乐项目了?一到晴天全城出动。诚心提问:大家都是周几去洗车人最少?我试过周二中午去,五分钟进去,但打工人哪有周二中午的自由。还有那种月卡unlimited洗车,一个月20多刀,洗四次就回本,你们买吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['洗车','闲聊','德州'], 'active', '2026-03-15 16:50:00-05', '2026-03-15 16:50:00-05') ON CONFLICT (id) DO NOTHING;

-- P60 讨论:老鼠咬线(波特兰小鹿)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000060', 'a1000000-0000-0000-0000-000000000008', 'discussion', '发动机舱里发现老鼠窝!线被咬了两根,怎么防它再来?', E'车停后院车道,最近总觉得有股怪味,今天开引擎盖检查玻璃水,发现空滤盒旁边一坨树叶纸屑窝,还有……粑粑。检查发现有两根线的绝缘皮被啃了,露出铜丝,吓死。问题:1)被啃的线是包一下就行还是必须换?会不会引起短路自燃?2)怎么确认它没把窝做到别的地方?3)最重要的:怎么防止它们再回来?听说丰田本田的大豆基线皮是老鼠自助餐,真的假的?波特兰这边树多,邻居说家家都遇到过。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['老鼠','线路','养车'], 'active', '2026-03-24 18:40:00-07', '2026-03-24 18:40:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000105', 'd0000000-0000-0000-0003-000000000060', 'a0000000-0000-0000-0000-000000000007', E'先处理线:露铜丝的线不能只包电工胶布了事,震动和潮气会让它慢慢恶化,正确做法是剪掉受损段、焊接或压接+热缩管,几十刀的事,如果啃的是传感器线束,虚接会报一堆莫名其妙的码。检查范围:空滤盒内部(最爱做窝)、隔音棉、暖风进风道,开暖风有臭味说明它进过风道。大豆基绝缘皮的说法流传很广,实际上老鼠啃线更多是磨牙天性+发动机舱暖和,什么牌子都啃。防回来:1)窝和粪便彻底清掉并用消毒水去味(留着气味等于挂了个欢迎光临);2)薄荷油喷剂每两周补喷,有一定效果;3)最有效的还是引擎盖下放捕鼠夹+车周围断粮(鸟食、宠物粮、垃圾桶盖严);4)常开,车一周不动就是它们的精装公寓。', '2026-03-25 09:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000106', 'd0000000-0000-0000-0003-000000000060', 'a0000000-0000-0000-0000-000000000008', E'补一个保险冷知识:啮齿动物咬线造成的损坏,comprehensive(综合险)一般是赔的,不算你的事故记录。如果查出来线束伤得多(换整根线束动辄上千),别硬扛,报comp险只出deductible。报之前拍好窝和咬痕的照片。', '2026-03-25 21:10:00-07') ON CONFLICT (id) DO NOTHING;

-- P61 讨论:理赔后保费涨幅(纽约Vincent)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000061', 'a1000000-0000-0000-0000-000000000009', 'discussion', '出了一次有责小事故,下次续保到底会涨多少?', E'上个月并线没看好蹭了别人,我全责,对方修车走我保险赔了3800刀。现在天天焦虑续保:网上有说涨20%的,有说涨50%的,还有说直接被踢出保单的。纽约这边有经验的说说,一次有责、赔付4000以下的事故,续保大概涨什么幅度?会涨几年?要不要现在就开始shop别家?还是别家一看我有记录报价更狠?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保险','事故','续保'], 'active', '2026-03-08 19:30:00-04', '2026-03-08 19:30:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000107', 'd0000000-0000-0000-0003-000000000061', 'a0000000-0000-0000-0000-000000000008', E'给你个现实预期:一次有责物损理赔,行业平均续保涨30-45%,纽约州偏高,一般影响3年(每年递减),第4年记录不再计费。几个要点:1)查你保单有没有accident forgiveness条款,有的话首次事故不涨,很多人买了都不知道;2)shop别家完全应该,新保险公司看的是CLUE报告里的同一条记录,但各家对首次事故的惩罚系数差别巨大,有的公司对3年内一次事故很宽容;3)别为了怕涨价瞒报,CLUE上都查得到,瞒报被发现是拒保理由。另外3800的赔付不算大案,不至于被踢,放宽心。', '2026-03-09 09:45:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000108', 'd0000000-0000-0000-0003-000000000061', 'a1000000-0000-0000-0000-000000000010', E'过来人数据点:布鲁克林,前年一次有责赔了5000左右,Geico续保从半年890涨到1240,涨了大概40%,第二年降回1050。当时比了四家,Progressive反而报得更低就跳过去了。该shop就shop,忠诚没有折扣。', '2026-03-09 20:30:00-04') ON CONFLICT (id) DO NOTHING;

-- P62 攻略:看车带什么工具(修车匠Tony)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000062', 'a0000000-0000-0000-0000-000000000007', 'review', '看二手车带这五样东西,现场30分钟顶半个技师', E'总有人问看车要不要带工具,带什么。给一套我自己帮朋友看车的随身五件套,全部加起来不到100刀:\n\n1)强光手电(20刀):看发动机舱底部渗油、看轮拱内侧锈蚀、照底盘,自然光靠不住;\n2)漆膜仪(60刀国产的就行):绕车每个面板测三个点,原厂漆一般3-6 mil,超过8说明补过漆,左右对称面板差值大于2就要问为什么;\n3)OBD蓝牙头+手机(30刀):读有没有存码,重点看readiness monitor是不是刚被清过——全部not ready说明卖家临时清码心虚,扭头砍价或走人;\n4)磁铁冰箱贴(0刀):隔着薄布贴钣金,吸不住的地方是厚腻子,专治"无事故"嘴硬;\n5)湿纸巾(0刀):擦机油尺看油况,擦排气管内壁——黑干灰正常,油腻发黑烧机油,白色乳状可能窜防冻液。\n\n流程:先绕车看漆和缝隙(5分钟)、开盖看机舱(10分钟)、读码(5分钟)、冷启动听声(2分钟)、试驾(10分钟,关音乐,认真听)。这套下来能筛掉八成问题车,剩下两成拿不准的,花150刀做PPI,永远值得。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['验车','干货','二手车'], 'active', '2026-03-22 10:15:00-07', '2026-03-22 10:15:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000109', 'd0000000-0000-0000-0003-000000000062', 'a1000000-0000-0000-0000-000000000034', E'磁铁冰箱贴这个也太草根了哈哈,但真的有用,上次看车靠它发现后翼子板整面腻子,卖家脸都绿了。已存,下次看车照抄。', '2026-03-23 14:20:00-07') ON CONFLICT (id) DO NOTHING;

-- P63 晒车:尔湾Cindy提Model 3(尔湾Cindy)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000063', 'a1000000-0000-0000-0000-000000000004', 'showoff', '人生第一台自己全款的车:Model 3,尔湾提车小记', E'来美七年,从二手Corolla开到今天,终于提了人生第一台自己全款买的车:Model 3焕新版。在Costa Mesa交付中心提的,流程比想象中快,App点点点就开走了。回家路上阳光正好,Ventura式的加州蓝天配新车,矫情一下:成年人的浪漫是自己给的。老公负责装家充,我负责研究哨兵模式,分工明确。附提车照,泪目时刻,谢谢自己没放弃。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Tesla_Model_3_2021_facelift.jpg/960px-Tesla_Model_3_2021_facelift.jpg'], NULL, NULL, NULL, ARRAY['提车','Tesla','尔湾'], 'active', '2026-03-16 17:30:00-07', '2026-03-16 17:30:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000110', 'd0000000-0000-0000-0003-000000000063', 'a0000000-0000-0000-0000-000000000001', E'恭喜恭喜!尔湾邻居握手。全款买车这个仪式感值得记一辈子,REAL ID办好了吗?哈哈,记得给新车上个好保险,尔湾这边Mercury对Tesla报价还行。', '2026-03-16 20:45:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000111', 'd0000000-0000-0000-0003-000000000063', 'a1000000-0000-0000-0000-000000000002', E'"成年人的浪漫是自己给的"这句戳到我了。恭喜姐妹!LA到尔湾的姐妹EV小分队+1。', '2026-03-17 09:20:00-07') ON CONFLICT (id) DO NOTHING;

-- P64 讨论:涡轮车加92还是87(费城大熊)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000064', 'a1000000-0000-0000-0000-000000000014', 'discussion', '涡轮车说明书写"推荐91+",一直加87会伤发动机吗?', E'我的1.5T说明书写的是"87可用,推荐91+以获得最佳性能"。买车两年我一直无脑87,最近听朋友说涡轮车加87会爆震、积碳、烧机油,长期下来毁发动机,把我说慌了。到底是真有害还是心理作用?油价差每加仑六七毛,一年也是几百刀,如果没实际危害我想继续87。有没有懂发动机的给个准话:什么情况必须高标号,什么情况87就够?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['油品','涡轮','用车常识'], 'active', '2026-03-09 12:45:00-04', '2026-03-09 12:45:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000112', 'd0000000-0000-0000-0003-000000000064', 'a0000000-0000-0000-0000-000000000007', E'准话来了,关键看说明书用词:"required 91+"是必须,加87会真伤(爆震传感器只能兜底不能常年硬扛);"recommended 91+"像你这台,意思是ECU检测到低标号会自动推迟点火保护发动机,代价是动力小几个百分点、极端高温高负载下油耗略差,但不会造成损伤,本田自己都背书87可用。你的工况(费城通勤、不拖挂、不下赛道)继续87完全没问题。两个例外情形建议临时升92:夏天连续爬山满载、或者你发现动力明显发闷有金属敲击声。至于积碳,和标号关系不大,和直喷技术本身有关,加Top Tier认证的油(Costco/Shell/Exxon都是)比纠结标号有用多了。', '2026-03-09 17:30:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000113', 'd0000000-0000-0000-0003-000000000064', 'a0000000-0000-0000-0000-000000000008', E'补个数据:美国油站的87/89/91差价这几年被拉大了,89基本是智商税(87和91勾兑的),要升就直接91/93。另外别在偏僻小站加高标号,周转慢的油罐87最新鲜,这是冷知识。', '2026-03-10 08:50:00-04') ON CONFLICT (id) DO NOTHING;

-- P65 讨论:H1B季买车时机(库比蒂诺码农)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000065', 'a1000000-0000-0000-0000-000000000005', 'discussion', '组里小朋友H1B抽签中了才想买车,现在买还是等结果?', E'替组里刚毕业的小朋友问的(也是当年的自己):OPT身份,四月H1B抽签,十月才知道最终去留,现在代步刚需,纠结要不要买车。买吧,万一没抽中要回国或去加拿大,车得急卖折价;不买吧,湾区没车确实寸步难行,租车又太贵。大家当年OPT阶段是怎么决策的?买二手保值车到时候好脱手,还是干脆先lease?OPT身份lease和贷款好批吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['H1B','留学生','买车决策'], 'active', '2026-03-26 21:40:00-07', '2026-03-26 21:40:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000114', 'd0000000-0000-0000-0003-000000000065', 'a0000000-0000-0000-0000-000000000008', E'这题我熟,标准答案是:买保值硬通货,别lease。逻辑:1)lease对短期不确定身份最不友好——中途退租的费用高到离谱,transfer lease又慢又挑人;2)买台1.5-2万的二手卡罗拉/思域/CRV,即使一年后急卖,亏的也就一两千折旧+过户成本,比一年租车或者lease中断费便宜太多;3)OPT贷款:有SSN+工资单,很多credit union和丰田本田金融都批,利率略高,首付多给点就行,真批不下来这个价位咬咬牙全款也够得着。核心原则:身份不确定期,持有流动性好的资产,日本双田就是二手车市场的流动性之王。', '2026-03-27 09:35:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000115', 'd0000000-0000-0000-0003-000000000065', 'a1000000-0000-0000-0000-000000000001', E'当年OPT的我买了台二手卡罗拉,两年后抽中卖掉换车,只亏了1800,还靠它攒出了信用记录。让小朋友放心买,别买冷门车和改装车就行,急卖的时候市场会教育人。', '2026-03-27 18:50:00-07') ON CONFLICT (id) DO NOTHING;

-- P66 车评:Tacoma TRD Off-Road改装记录(西雅图雨神)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000066', 'a1000000-0000-0000-0000-000000000007', 'review', '2021 Tacoma TRD Off-Road轻改清单:预算3000刀怎么花在刀刃上', E'总有人私信问我的Tacoma改了什么,整理一份两年来的轻改清单和踩坑记录,预算党参考。\n\n花得值的:1)全地形胎Falken Wildpeak AT3W(900刀):原厂公路胎在湿滑林道就是溜冰鞋,换AT胎是越野第一改,雨州人民更是刚需;2)前杠底护板升级铝合金(350刀):原厂那块薄铁皮磕一次就变形;3)床架bed rack+床帐(1300刀):睡车斗比睡帐篷干燥太多,西北部露营神器;4)后差速呼吸管加高(50刀自己动手):过水必备,便宜保命。\n\n不值的:1)2寸升高套件——好看是真好看,高速发飘、油耗+2MPG、还得重做定位,除非你真玩岩石路线,轻越野完全不需要;2)射灯光棒——用过三次,招警察注意,拆了;3)排气改装——就是买了个噪音。\n\n心得:Tacoma原厂能力已经覆盖95%的林道和营地路,改装优先补短板(胎、护板),不要补长板。省下的钱加油和买营地装备,体验提升大得多。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/2020_Toyota_Tacoma_TRD_Pro_front_NYIAS_2019.jpg/960px-2020_Toyota_Tacoma_TRD_Pro_front_NYIAS_2019.jpg'], 'Toyota', 'Tacoma', 2021, ARRAY['越野','改装','皮卡'], 'active', '2026-03-27 19:10:00-07', '2026-03-27 19:10:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000116', 'd0000000-0000-0000-0003-000000000066', 'a1000000-0000-0000-0000-000000000040', E'"改装补短板不补长板"这句话价值三千刀,拦住了我准备下单升高件的手。AT3W在雨天铺装路的表现也确实比想象中好,西北部同款推荐。', '2026-03-28 10:40:00-07') ON CONFLICT (id) DO NOTHING;

-- P67 讨论:被撞对方留了条(天普市阿婷)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000067', 'a1000000-0000-0000-0000-000000000034', 'discussion', '车门被撞凹,对方留了张字条和电话,接下来怎么走不吃亏?', E'比上次运气好点:今天下班发现车门一个大凹,雨刮下压着张字条,对方承认是他开门撞的(应该是撞了就跑良心发现又回来的),留了名字电话说愿意赔。问题来了:我是直接跟他私了要现金,还是要他的保险信息走保险?私了的话去哪估价、要多少合理?万一他赖账呢?第一次遇到"有良心的肇事者",反而不知道流程了,求指导。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['事故处理','理赔','私了'], 'active', '2026-03-19 18:20:00-07', '2026-03-19 18:20:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000117', 'd0000000-0000-0000-0003-000000000067', 'a0000000-0000-0000-0000-000000000008', E'标准流程:1)先固定证据——凹痕多角度拍照、字条拍照收好、跟对方的通话后补一条短信确认("按你留言,你3/19开门碰到我车门,我们约定……"),留下文字痕迹;2)去两家body shop拿书面估价(车门凹陷带漆面损伤,估价常见400-900,只做无痕修复PDR的话200-400);3)拿着估价跟对方谈:金额小对方一般愿意现金私了,一手转账一手签个简单的release(写明"此款项为3/19车门损伤全部赔偿,双方再无其他主张");4)对方要是变脸赖账,你再要他保险信息走claim,他的字条和你的短信就是证据。原则:私了金额=修理估价,别加价也别客气打折。', '2026-03-19 21:45:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000118', 'd0000000-0000-0000-0003-000000000067', 'a0000000-0000-0000-0000-000000000001', E'补充:门边这种凹如果漆没破,优先找PDR师傅(华人区很多流动PDR,罗兰岗天普这边微信群里就有),两三百修完看不出痕迹,还不用喷漆不留补漆记录,对以后卖车友好。漆破了才需要进钣喷。', '2026-03-20 10:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000119', 'd0000000-0000-0000-0003-000000000067', 'a1000000-0000-0000-0000-000000000034', E'短信已补发对方也确认了,明天去估价。漆没破,先找PDR问问。谢谢两位,这个版真的靠谱。', '2026-03-20 19:15:00-07') ON CONFLICT (id) DO NOTHING;

-- P68 讨论:挂D挡咯噔一声(皇后区Grace)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000068', 'a1000000-0000-0000-0000-000000000011', 'discussion', '从P挂到D的时候咯噔一声,车身还晃一下,要修吗?', E'车是2018 Altima,7.6万英里。最近从P挡挂到D或者R的时候,能感觉到咯噔一下,有时候还听得到闷响,车身跟着晃一下。行驶中换挡倒是平顺的。在坡上停车之后这个现象特别明显,有一次咯噔得吓人。这是变速箱问题还是什么?跟我停车习惯有关系吗?我一般是踩住刹车直接推P拉手刹。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['变速箱','用车习惯','异响'], 'active', '2026-03-23 20:10:00-04', '2026-03-23 20:10:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000120', 'd0000000-0000-0000-0003-000000000068', 'a0000000-0000-0000-0000-000000000007', E'你最后一句暴露了主要原因:坡上"踩刹车直接推P再拉手刹",整台车的重量都压在变速箱里一根小小的驻车棘爪上,再挂D时棘爪带着负载释放,就是那声咯噔。正确顺序:踩刹车-挂N-拉紧手刹-松脚刹让车压在手刹上-再挂P,以后坡上停车照这个来,咯噔多半消失。如果平地上也响得明显,再查两样:发动机机脚垫(mount)老化(挂挡瞬间发动机晃动大)和传动轴/半轴间隙,Altima这个年份机脚垫软了很常见,换一个150-250刀。先改习惯观察一周,再决定去不去店里。', '2026-03-24 09:25:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000121', 'd0000000-0000-0000-0003-000000000068', 'a0000000-0000-0000-0000-000000000008', E'Tony说的驻车棘爪知识点建议全体新手抄写:坡道先手刹后P挡。顺便说,这个习惯还能避免哪天棘爪磨坏了P挡挂不住溜车,修棘爪要拆变速箱,四位数起步。好习惯零成本。', '2026-03-24 22:40:00-04') ON CONFLICT (id) DO NOTHING;

-- P69 闲聊:羡慕敞篷(迈阿密Sunny)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000069', 'a1000000-0000-0000-0000-000000000018', 'discussion', '迈阿密的春天全是敞篷车,忍不住也想搞一台老Miata', E'一到三月,Ocean Drive上全是开着敞篷的人,吹着海风别提多惬意。我这台买菜SUV突然就不香了。认真考虑搞台一万上下的老Miata当玩具:NB或者NC年份的,自动挡(别骂,堵车多),周末沿海边兜风。问题:老敞篷的软顶漏不漏水?迈阿密天天暴雨。保养是不是很贵?家里领导问"这车能装什么",我说能装快乐,她说快乐放后备箱都放不下。有玩具车的兄弟给点说服配偶的话术。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['敞篷车','玩具车','闲聊'], 'active', '2026-03-18 21:50:00-04', '2026-03-18 21:50:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000122', 'd0000000-0000-0000-0003-000000000069', 'a1000000-0000-0000-0000-000000000017', E'奥兰多Miata车主劝入:NC软顶只要胶条没老化基本不漏,买之前拿水管冲十分钟验货就行。保养便宜得感人,马自达件满地都是。说服话术只有一句有效:一万块的Miata三年后还能卖一万,这是零成本快乐,理财产品。', '2026-03-19 10:35:00-04') ON CONFLICT (id) DO NOTHING;

-- P70 讨论:OTD价格怎么谈(圣地亚哥Wendy)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000070', 'a1000000-0000-0000-0000-000000000029', 'discussion', '大家总说谈OTD价,具体话术是什么?销售绕来绕去怎么办', E'看攻略都说买车只谈out-the-door价,不谈月供。道理我懂,但实操就懵:上周去店里,我说"give me the OTD price",销售反问"你预算多少月供",我说不谈月供,他就开始扯这车多抢手。最后给我张纸,车价下面一堆费用:doc fee、dealer prep、市场调整费、贴膜费,OTD比标价高了4000多。这些费用哪些是必须的哪些能砍?正确的谈判姿势到底是怎样的,求实战派教学。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['买车','谈判','避坑'], 'active', '2026-03-04 19:30:00-08', '2026-03-04 19:30:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000123', 'd0000000-0000-0000-0003-000000000070', 'a0000000-0000-0000-0000-000000000008', E'先分类那张纸:必须的=车价+税+DMV注册费+doc fee(加州法定上限85刀,别的州几百的都有,但加州这项砍不动也不用砍);能砍的=dealer prep、市场调整费(market adjustment)、window etching、"已装"的贴膜脚垫套餐,这些全是利润项,统一话术:"I''m not paying for that, please remove it or I''ll walk."实战姿势:1)谈判别在店里开始,邮件同时询三五家OTD,拿最低的去压别家;2)销售扯月供你就一句话循环:"OTD number first, financing later";3)最强的筹码永远是站起来走人,真走过一次你就知道电话追得有多快。你看到的高4000那种单子,就是筛选"不会砍价的客人"用的,别接招。', '2026-03-05 10:20:00-08') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000124', 'd0000000-0000-0000-0003-000000000070', 'a0000000-0000-0000-0000-000000000001', E'补个心态建议:整个过程你不需要说服任何人,只需要重复要求和比价。我陪朋友买车,全程就三句话来回说,销售最后自己把调整费划掉了。脸皮厚度=省下的美元数,尤其咱们华人容易不好意思,记住不好意思一次四千块。', '2026-03-05 18:40:00-08') ON CONFLICT (id) DO NOTHING;

-- P71 晒车:Model Y全家出游(波士顿学姐)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000071', 'a1000000-0000-0000-0000-000000000013', 'showoff', '带爸妈鳕鱼角一日游,Model Y后备箱装下了全家的春天', E'爸妈来探亲,趁周末天暖和带他们去Cape Cod转了一圈。Model Y的后备箱+前备箱是真能装:野餐垫、保温箱、我妈坚持要带的电饭煲(?)、我爸的钓具,全塞下了。一路自驾辅助开着,爸妈从"电车靠谱吗"到"这车比你叔的奔驰稳当",真香只要一个来回。海边充电桩就在停车场,吃顿lobster roll的功夫补到90%。春天的马萨诸塞终于像话了,晒一张海边的照片。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Tesla_Model_Y_%282025%29_MYLE_Festival_2025_DSC_9570.jpg/960px-Tesla_Model_Y_%282025%29_MYLE_Festival_2025_DSC_9570.jpg'], NULL, NULL, NULL, ARRAY['自驾','家庭','Tesla'], 'active', '2026-03-29 20:15:00-04', '2026-03-29 20:15:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000125', 'd0000000-0000-0000-0003-000000000071', 'a1000000-0000-0000-0000-000000000009', E'电饭煲哈哈哈,中国爸妈的出行安全感。四月鳕鱼角人还少,五月后周末的6号公路就开始堵了,你们去得正是时候。', '2026-03-30 09:40:00-04') ON CONFLICT (id) DO NOTHING;

-- P72 讨论:车钥匙电池(达拉斯Lily)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000072', 'a0000000-0000-0000-0000-000000000005', 'discussion', '车钥匙突然失灵打不开门,是钥匙没电还是车有问题?', E'今天在超市停车场,按钥匙没反应,车门打不开,当场慌了,以为车被人动了手脚。折腾半天发现钥匙壳里有个机械小钥匙能开门,进去之后车也能点着。回家路上想到几个问题:1)怎么确定是钥匙电池没电而不是车的接收器坏了?2)钥匙电池自己能换吗,什么型号哪里买?3)如果哪天彻底没电了,push start的车怎么点火?先把问题发上来,顺便提醒大家钥匙里都藏着机械钥匙,别像我一样站在车边干着急。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['车钥匙','用车常识','新手'], 'active', '2026-03-25 19:40:00-05', '2026-03-25 19:40:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000126', 'd0000000-0000-0000-0003-000000000072', 'a0000000-0000-0000-0000-000000000007', E'逐条答:1)判断很简单,大多数车有两把钥匙,另一把好用就是这把的电池问题;单钥匙的话看作用距离,电池衰减是"越靠越近才有反应",接收器坏是完全没反应;2)绝大多数钥匙用CR2032纽扣电池,超市药店都有,两三刀,壳上有缝用小一字改锥撬开,换之前拍张照记住电池正反,五分钟的事,别去dealer花30刀换;3)push start车的应急启动:钥匙彻底没电时,把钥匙本体直接贴在start按钮上按(有的车是贴在方向柱感应区),车内NFC线圈能读到芯片,照样点火,说明书里搜dead key fob有图示。你今天这套操作(机械钥匙开门)已经满分了。', '2026-03-26 09:20:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000127', 'd0000000-0000-0000-0003-000000000072', 'a1000000-0000-0000-0000-000000000019', E'补充一个:机械钥匙开门时防盗警报可能会响,别慌,插钥匙点火或按一下遥控(如果还有残余电量)就停。Costco卖CR2032十粒装,换一次囤十年。', '2026-03-26 14:35:00-05') ON CONFLICT (id) DO NOTHING;

-- P73 讨论:dealer fee哪些合理(长岛Sophia)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000073', 'a1000000-0000-0000-0000-000000000036', 'discussion', '二手车报价单上一堆fee,纽约的doc fee有上限吗?', E'在长岛一家二手车行看中一台车,谈好车价之后拿到报价单傻眼了:doc fee 349、dealer service fee 599、certification fee 795、nitrogen轮胎充氮75。加起来快1800。销售说"每台车都有,州里规定的"。我记得纽约对doc fee是有上限的?到底哪些是官方费用哪些是编出来的?certification那个说是129项检查,听着好像有点用又好像是话术。懂行的帮我看看这单子还能抢救吗。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['买车','费用','纽约'], 'active', '2026-03-26 19:05:00-04', '2026-03-26 19:05:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000128', 'd0000000-0000-0000-0003-000000000073', 'a0000000-0000-0000-0000-000000000008', E'纽约州doc fee法定上限就是175刀,他收349已经违规了,这一条你直接指出来,通常整张单子的气势就垮了。逐项判:doc fee>175=砍到175;dealer service fee=纯编的,拒付;certification fee=如果车是挂着certified pre-owned卖的,认证成本应该含在车价里,后加就是二次收费,拒付;氮气75=氮气本身没坏处但空气里78%就是氮气,这75刀买的是绿色气门嘴帽,拒付。话术统一:"车价我们谈好了,这些fee要么去掉要么从车价里扣,不然我看别家。"纽约二手车竞争激烈,他会松口的。', '2026-03-27 09:30:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000129', 'd0000000-0000-0000-0003-000000000073', 'a0000000-0000-0000-0000-000000000004', E'法拉盛车行打过多年交道的提醒:谈崩了真别恋战,长岛到皇后区几十家dealer,同款车至少五家有。我的经验是周三下午和月底最后两天去谈,销售冲量的时候fee说砍就砍。', '2026-03-27 21:20:00-04') ON CONFLICT (id) DO NOTHING;

-- P74 攻略:花粉季漆面养护(二手车避坑酱)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000074', 'a0000000-0000-0000-0000-000000000008', 'review', '花粉季护车指南:黄色粉末不只是难看,它真的伤漆', E'每年三四月后台必收一堆"车漆发黄怎么办",提前把花粉季养护写清楚。\n\n为什么要管:花粉不是灰尘,它含酸性蛋白酶,沾水后(晨露、小雨)会被激活,在清漆上留下微蚀刻,长期不管的车漆会失去光泽,黄色车衣现象在松树多的南方州尤其严重。\n\n三条纪律:1)只用大量清水+洗车液冲洗,禁止干擦禁止掸子,花粉颗粒有倒刺结构,干擦等于拿细砂纸打圈;2)洗完必须擦干或吹干,水痕+花粉=双重蚀刻;3)雨后24小时内冲一次,哪怕只用自助水枪快冲,因为雨水正好是激活剂。\n\n省钱方案分级:入门=每周自助洗车5刀×6周,花粉季安稳度过;进阶=季前打一层合成蜡(牺牲层,20刀自己动手,撑2-3个月);壕版=镀晶或PPF,花粉完全不粘。附加项:cabin filter季前换成活性炭款,车内过敏党亲测有效;停车尽量避开松树柏树正下方,树荫的代价是三倍花粉量。\n\n花粉季结束后(大约五月中),认真做一次deep clean+clay bar,把残留清干净再进入夏天暴晒季,漆面能多撑好几年。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['花粉季','漆面','养护'], 'active', '2026-03-13 10:50:00-07', '2026-03-13 10:50:00-07') ON CONFLICT (id) DO NOTHING;

-- P75 讨论:低速打方向咯噔(盐湖城Ivy)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000075', 'a1000000-0000-0000-0000-000000000027', 'discussion', '低速打满方向有咯噔咯噔的声音,是哪里出问题了?', E'2017 CX-5,8.8万英里。最近在停车场低速挪车、方向打满的时候,前轮位置有咯噔咯噔的声音,有点像什么东西在跳齿,速度快了或者方向回正就没有。直行完全正常,高速也没有异响。盐湖城冬天撒盐撒得凶,不知道有没有关系。这种症状大概是什么坏了?还能开吗,会不会开着开着轮子罢工?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['异响','转向','悬挂'], 'active', '2026-03-05 17:30:00-07', '2026-03-05 17:30:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000130', 'd0000000-0000-0000-0003-000000000075', 'a0000000-0000-0000-0000-000000000007', E'"打满方向+低速+咯噔跳齿感",教科书级的外侧CV joint(等速万向节)磨损症状,你们那种撒盐州还常伴随防尘套开裂进盐水加速磨损的剧情。自查:蹲下看前轮内侧的橡胶防尘套(手风琴状那个)有没有裂口和甩出来的黑色油脂。答案:1)还能开,但别拖过一两个月,CV joint是渐进磨损,从咯噔到彻底断开有很长过程,不会突然罢工,但断在路上就要拖车了;2)修法:防尘套没破只是磨损,直接换半轴总成(axle assembly),副厂件带工一侧300-450刀;别单换joint,工时不划算。换的时候两侧一起检查,通常同龄。', '2026-03-06 09:45:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000131', 'd0000000-0000-0000-0003-000000000075', 'a0000000-0000-0000-0000-000000000008', E'区分一个相似症状免得白花钱:如果咯噔声不分方向、过坑也响,那更可能是稳定杆连杆(sway bar link),件更便宜(一侧100-150)。让店里举升起来两个都查一遍再报价,一次搞清楚。撒盐州的车底盘件寿命都打七折,顺手让他们看看别的胶套。', '2026-03-06 20:20:00-07') ON CONFLICT (id) DO NOTHING;

-- P76 晒车:Silverado HD拖房车(丹佛高原红)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000076', 'a1000000-0000-0000-0000-000000000026', 'showoff', '为了全家的诗和远方:Silverado HD配上房车,科州备战露营季', E'去年底咬牙把半吨卡换成了Silverado 2500HD,就为了拖家里那台28尺的travel trailer上山不喘。这周末把房车从存储场拖回家做春季整备:查轮胎、充电瓶、清水箱,五月落基山露营季就绪。HD拖着9000磅爬I-70的Eisenhower隧道那段长坡,水温油温稳如老狗,半吨卡时代我可是一路盯着仪表冒汗的。科州的朋友,Great Sand Dunes和Steamboat的营地五月见。附一张整备日的合影。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/New_2020_Chevrolet_Silverado_HD_at_Toronto_International_Autoshow.jpg/960px-New_2020_Chevrolet_Silverado_HD_at_Toronto_International_Autoshow.jpg'], NULL, NULL, NULL, ARRAY['房车','拖挂','科罗拉多'], 'active', '2026-03-30 15:20:00-06', '2026-03-30 15:20:00-06') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000132', 'd0000000-0000-0000-0003-000000000076', 'a1000000-0000-0000-0000-000000000031', E'HD拖9000磅确实从容,这就是我说的"半吨卡给不了的从容"。房车轮胎记得看DOT年份,存储场停一冬天,胎压和老化比磨损更要命。', '2026-03-30 19:40:00-07') ON CONFLICT (id) DO NOTHING;

-- P77 讨论:跑Uber买什么车保险怎么办(法拉盛Frank)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000077', 'a1000000-0000-0000-0000-000000000035', 'discussion', '想周末兼职跑Uber,买什么车合适?rideshare保险必须买吗?', E'工作之余想周末跑跑Uber Eats和Uber赚点外快。两个问题:1)买什么车合适?想买台省油的二手混动,普锐斯还是Camry Hybrid?里程多少以内的值得买?听说纽约市跑Uber载客还要TLC牌照,外卖也要吗?2)保险:普通个人保险跑单出事故会被拒赔?那个rideshare endorsement贵不贵,不买行不行?群里说法太乱,想听这个版的靠谱意见。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['rideshare','保险','兼职'], 'active', '2026-03-10 22:15:00-04', '2026-03-10 22:15:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000133', 'd0000000-0000-0000-0003-000000000077', 'a0000000-0000-0000-0000-000000000008', E'保险部分是重点,认真看:接单期间分三段——App开着等单(Period 1)、接到单去接人/取餐(P2)、载着人/餐(P3)。Uber的商业保险主要罩P2和P3,P1只有很低的责任险,而你的个人保单一旦发现你在商业接单,整单都可能拒赔。rideshare endorsement就是补P1这个洞的,纽约各家一年多花200-500刀,跑单就必须买,不买等于裸奔。外卖(Uber Eats)同理,别以为送餐就不算商业使用。TLC:纽约市五个区内载客(Uber/Lyft)必须TLC牌照+TLC保险,门槛和成本高很多;纯外卖不需要TLC。所以住法拉盛的兼职党大多选纯外卖,或者去长岛纳苏县接活避开市区TLC要求(注意平台区域规则)。', '2026-03-11 10:30:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000134', 'd0000000-0000-0000-0003-000000000077', 'a1000000-0000-0000-0000-000000000010', E'车的部分:外卖首选普锐斯,市区走走停停55 MPG,后排放保温包正合适,买12万英里以内、电池没换过也没事(丰田混动电池皮实,坏了副厂800能换)。Camry Hybrid舒服点但贵几千,纯外卖没必要。别买德系跑单,修一次白干一个月。', '2026-03-11 19:45:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000135', 'd0000000-0000-0000-0003-000000000077', 'a1000000-0000-0000-0000-000000000035', E'清楚了:先纯外卖+rideshare endorsement+二手普锐斯,TLC那套成本太高不碰。谢谢两位大哥,回头请喝奶茶。', '2026-03-12 12:20:00-04') ON CONFLICT (id) DO NOTHING;

-- P78 车评:F-150 PowerBoost混动皮卡(芝加哥风哥)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000078', 'a1000000-0000-0000-0000-000000000022', 'review', '2022 F-150 PowerBoost:能当发电机的混动皮卡,中西部实测', E'去年入的2022 F-150 PowerBoost(3.5混动),风城一年用下来,聊聊这套很少人写的动力总成。\n\n油耗:混动皮卡不是噱头,市区实测21 MPG,比同事的5.0 V8市区高出一半,高速19-20(混动高速优势小),一年油钱省了800刀左右。\n\n真正的杀手锏是Pro Power Onboard车载电源:我这台7.2kW版本,斗里四个插座。去年冬天芝加哥暴风雪小区停电6小时,我从车上拉线给冰箱、暖气鼓风机和WiFi供电,全楼就我家灯亮着,邻居第二天全来问车。露营带电磁炉电火锅更是降维打击。\n\n缺点:1)混动电池占了斗下一块空间,备胎位置受影响;2)刹车脚感在动能回收切换时有点不线性,堵车跟车要适应;3)10AT低速偶有换挡犹豫,升级过变速箱软件好了大半;4)比同配置纯油版贵2500-4000,按油钱算四五年回本,买它更多是买那个电源。\n\n中西部又冷又爱停电,这车是工具属性的天花板。拖挂6000磅实测12 MPG,混动光环消失,重拖党还是看柴油。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Ford_F-150_%28fourteenth_generation%29_Rutesheimer_Autoschau_2025_DSC_9217.jpg/960px-Ford_F-150_%28fourteenth_generation%29_Rutesheimer_Autoschau_2025_DSC_9217.jpg'], 'Ford', 'F-150', 2022, ARRAY['皮卡','混动','长期报告'], 'active', '2026-03-16 13:40:00-05', '2026-03-16 13:40:00-05') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000136', 'd0000000-0000-0000-0003-000000000078', 'a1000000-0000-0000-0000-000000000012', E'停电供全屋这段看馋了,新泽西风暴停电也是常事。正好在看二手F-150,一直在纯油5.0和PowerBoost之间摇摆,被你这篇拉向混动了,请问买二手PowerBoost要重点查什么?', '2026-03-17 09:30:00-04') ON CONFLICT (id) DO NOTHING;

-- P79 讨论:挡风玻璃裂纹(贝尔维尤Mia)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000079', 'a1000000-0000-0000-0000-000000000039', 'discussion', '高速被石子崩了个小坑,现在裂了两厘米,补还是换?', E'上周在I-405被前车崩起的石子砸了下挡风玻璃,当时就一个小白点没在意,昨天降温,发现从白点延伸出一条两厘米左右的裂纹,在副驾侧下方。问了两家:玻璃店说赶紧补,80刀;另一家说裂了就补不住了要换,带校准1100刀(车有前摄像头)。到底听谁的?裂纹会不会突然裂穿整个玻璃?保险comprehensive能cover吗,免赔额500的话是不是白搭?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['挡风玻璃','保险','维修'], 'active', '2026-03-07 11:20:00-08', '2026-03-07 11:20:00-08') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000137', 'd0000000-0000-0000-0003-000000000079', 'a0000000-0000-0000-0000-000000000007', E'行业标准:裂纹6英寸(15cm)以内、不在驾驶员主视野、没裂到玻璃边缘,可以补;你这2cm完全在可补范围,第二家在推销换玻璃。但要快:温差是裂纹杀手,你已经见识了降温让它长了,再等它窜过6英寸或伸到边缘就真只能换了。这几天别用除霜大热风猛吹、别用高压水枪怼那个位置。补完裂纹会留浅印但停止扩展,强度恢复九成。保险:很多保单的玻璃修补(repair)是零免赔的——保险公司宁愿出80刀补也不想赔1100换,打电话问一句,大概率免费。华州不少人还买了full glass coverage,换玻璃也零免赔,查下你的保单。', '2026-03-07 15:40:00-08') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000138', 'd0000000-0000-0000-0003-000000000079', 'a0000000-0000-0000-0000-000000000008', E'附议先打保险电话,glass repair零免赔很常见,Safelite这类连锁能上门补。另外提醒围观群众:被崩石子当天就该处理,20刀的DIY树脂补坑套件对付新鲜小白点效果很好,拖成裂纹就要专业设备了。跟大货车和渣土车保持距离,是玻璃最好的保险。', '2026-03-08 10:25:00-08') ON CONFLICT (id) DO NOTHING;

-- P80 闲聊:夏令时(芝加哥风哥)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000080', 'a1000000-0000-0000-0000-000000000022', 'discussion', '夏令时第一周:全城司机集体睡不醒,早高峰肉眼可见地暴躁', E'周日刚拨快一小时,今天周一早高峰,90/94上目睹三起追尾现场,个个都是低速跟车怼上去的,一看就是没睡醒走神。每年这一周都有研究说事故率上升,今天算是亲眼见证。提醒大家这几天:早上多留15分钟别赶、咖啡备好、跟车距离拉大一个车身。另外车机的时钟自动跳了,但我那台老车的表还得手动调,一年两次,总有一次忘,四月还在看冬令时。你们的车钟调了吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['夏令时','安全驾驶','闲聊'], 'active', '2026-03-09 08:50:00-05', '2026-03-09 08:50:00-05') ON CONFLICT (id) DO NOTHING;

-- P81 讨论:私人交易收款防骗(圣何塞Jason)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000081', 'a1000000-0000-0000-0000-000000000006', 'discussion', '卖车买家要用cashier check付款,怎么确认不是假支票?', E'把家里的旧CRV挂网上卖,谈好1.35万,买家说用cashier check付款。我隐约记得看过假cashier check骗局的新闻:支票是假的,车开走了,几天后银行说支票作废。但现金1万多买家说不安全不愿意带,Zelle又有额度限制。大家私人卖车都怎么收钱的?有没有既安全又双方都能接受的方式?周六就约了交车,在线等,有点慌。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['卖车','防骗','私人交易'], 'active', '2026-03-21 20:30:00-07', '2026-03-21 20:30:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000139', 'd0000000-0000-0000-0003-000000000081', 'a0000000-0000-0000-0000-000000000008', E'假cashier check是二手车圈经典骗局,防法其实很简单:约买家在他出票的那家银行网点见面交易——他当着柜员的面开出cashier check交给你,或者更干脆,你俩在柜台直接做账户转账,钱到账你再签title。银行大堂有监控有柜员,安全性拉满,正经买家不会拒绝这个安排,拒绝的就是答案。次选方案:约在你的银行,当场让柜员verify支票真伪并直接存入。绝对不要:约在停车场收支票交车、接受超额支票让你找零(100%是骗局)、或者答应"先给定金尾款Venmo慢慢转"。周六改约银行,一句话的事。', '2026-03-22 09:15:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000140', 'd0000000-0000-0000-0003-000000000081', 'a0000000-0000-0000-0000-000000000001', E'银行见面+1,我卖过三台车全在Chase大堂交易的,柜员都见怪不怪了。补充:交易完当场手机上提交DMV的Release of Liability,车钥匙才离手。顺利出手!', '2026-03-22 16:40:00-07') ON CONFLICT (id) DO NOTHING;

-- P82 攻略:rebuilt title能不能买(二手车避坑酱)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000082', 'a0000000-0000-0000-0000-000000000008', 'review', 'rebuilt title二手车完全指南:什么能买,什么碰都别碰', E'后台问rebuilt车的人越来越多,毕竟便宜25-40%太诱人,一次写透。\n\n先分清概念:salvage=保险公司判全损后的状态,不能合法上路;rebuilt/reconstructed=修复后通过州检验、可以上路的状态。买卖合法,但title烙印跟车一辈子。\n\n按损伤类型分级(核心干货):\n可以考虑:冰雹车(纯外观,结构无伤)、玻璃盗抢损(偷车砸窗被判全损)、轻度追尾修复且有完整维修照片记录的。\n谨慎:中度碰撞修复——必须第三方检查纵梁、气囊是否真实更换(有黑店塞旧气囊甚至空气囊盖板)。\n碰都别碰:泡水车(电子系统的病三年后才发作,神仙难救)、火烧车、重度正碰/侧碰伤及A柱B柱的。\n\n买前四步:1)拿VIN查NMVTS和保险历史,确认当年判损原因;2)要修复过程照片和零件单,正经rebuilder都留档,拿不出的走人;3)150-200刀第三方PPI+漆膜仪+举升机看底盘;4)先打电话问你的保险给不给上全险(参考我之前答过的:Progressive等公司可以,部分公司只给liability)。\n\n价格铁律:rebuilt合理价=同款clean车价的65-75折。折扣不到位就没有意义,因为你卖出时同样要打这个折,而且买家池子小、周期长。适合谁:打算开到报废、动手能力强或有靠谱修车渠道的人。第一次买车的新手、打算三年一换的人,请离rebuilt远一点。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['rebuilt title','避坑','干货'], 'active', '2026-03-08 09:30:00-07', '2026-03-08 09:30:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000141', 'd0000000-0000-0000-0003-000000000082', 'a1000000-0000-0000-0000-000000000003', E'"折扣不到位就没有意义"这句是精髓。圣盖博这边不少车行拿rebuilt当clean卖只便宜10%,专坑不查title的新移民,大家买车一定自己花几刀查一遍VIN。', '2026-03-09 11:45:00-07') ON CONFLICT (id) DO NOTHING;

-- P83 讨论:安全座椅LATCH安装(新泽西Leo)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000083', 'a1000000-0000-0000-0000-000000000012', 'discussion', '安全座椅用LATCH还是安全带固定?装完还是能晃是不是没装对?', E'二宝快出生了,买了新的婴儿安全座椅,研究安装说明书研究到头大:到底用LATCH接口固定还是用安全带固定?说明书说都行但不能同时用,为什么不能同时用,双保险不是更牢?还有我装完底座用力晃还是能动个两三厘米,网上说"不能晃动超过一英寸",我这算失败吗?大宝的座椅当年是丈母娘找人装的,这次想自己搞明白。新泽西有没有免费帮忙检查安装的地方?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['安全座椅','育儿','安全'], 'active', '2026-03-12 21:30:00-04', '2026-03-12 21:30:00-04') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000142', 'd0000000-0000-0000-0003-000000000083', 'a1000000-0000-0000-0000-000000000013', E'当年考过CPST资料的学姐answer:1)LATCH和安全带二选一,单独用都达标,同时用反而会让底座受力方向冲突,碰撞测试没验证过这种装法,所以禁止;LATCH有重量上限(娃+座椅一般65磅封顶),超了必须转安全带固定,婴儿座椅阶段随便选,LATCH省事;2)晃动测试的姿势要对:抓安全带路径处(belt path)晃,不是抓座椅边缘,侧向和前后各晃,超过一英寸就要重装——常见原因是没跪上去用体重压实就锁紧;3)免费检查:搜Safe Kids car seat check event,消防局和医院定期办,NJ很多点,预约制,技师手把手教,强烈推荐去一次,以后自己就会了。', '2026-03-13 09:40:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000143', 'd0000000-0000-0000-0003-000000000083', 'a0000000-0000-0000-0000-000000000008', E'学姐说得很全,我补一个买车视角:后座中间位置最安全但很多车中间没LATCH接口,用安全带装中间是完全OK的。另外安全座椅是极少数"永远买新不买二手"的车品,出过事故的座椅结构可能有暗伤,marketplace上的二手座椅再便宜也别碰。恭喜二宝!', '2026-03-13 20:15:00-04') ON CONFLICT (id) DO NOTHING;

-- P84 闲聊:三月碎碎念(西雅图阿明)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0003-000000000084', 'a0000000-0000-0000-0000-000000000006', 'discussion', '三月养车总结:西雅图的车,永远洗不干净的浪漫', E'月底了,记一笔这个月的养车流水:洗车三次(全部在洗完第二天下雨,精准如闹钟)、换季保养一次135刀、给春假自驾加油两箱、雨刮换了一对。哥伦比亚河谷自驾很成功,家里领导拍的瀑布照片被她妈拿去当微信头像了。西雅图人的三月就是:雨里洗车,雨里出游,雨里等一个不下雨的周末。四月要把冬天欠的底盘冲洗补上,还有谁的车和我一样,轮拱里还藏着一冬天的松针?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['闲聊','月度总结','西雅图'], 'active', '2026-03-31 19:45:00-07', '2026-03-31 19:45:00-07') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0003-000000000144', 'd0000000-0000-0000-0003-000000000084', 'a1000000-0000-0000-0000-000000000007', E'洗完必下雨定律,西雅图玄学认证。我的松针在引擎盖缝里,上周开盖清出来一小把,还夹着两片去年的枫叶,时间胶囊了属于是。', '2026-03-31 21:30:00-07') ON CONFLICT (id) DO NOTHING;

-- Seed part 4: community posts for April 2026 (84 posts)
-- Posts d0000000-0000-0000-0004-000000000001 .. 084
-- Comments e0000000-0000-0000-0004-000000000001 ..

-- P01 discussion: 春假自驾前检查清单
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000001', 'a1000000-0000-0000-0000-000000000004', 'discussion', '春假带娃自驾去大峡谷,出发前要检查啥?', E'下周春假打算从尔湾开去大峡谷,单程七个多小时,车是开了五年的汉兰达,平时只在市区代步。第一次跑这么远心里没底,出发前应该自己检查哪些东西?有没有必要专门去店里做个检查?娃才四岁,路上还有什么要注意的,求有经验的家长指点。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['自驾游','长途检查'], 'active', '2026-04-02 09:14:00-07', '2026-04-02 09:14:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000001', 'd0000000-0000-0000-0004-000000000001', 'a0000000-0000-0000-0000-000000000007', E'修车的给你个清单:1. 胎压打到门框标签值,顺便看胎纹和有没有钉子;2. 机油尺拔出来看液位和颜色,快到保养里程就提前换掉;3. 冷却液水壶液位在MIN和MAX之间;4. 雨刮喷水是否正常,沙漠回来一堆虫子要刮;5. 电瓶超过四年的建议测一下。汉兰达五年车这些自己都能看,没必要专门花钱检查,但如果刹车有异响就先处理再走。', '2026-04-02 13:40:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000002', 'd0000000-0000-0000-0004-000000000001', 'a0000000-0000-0000-0000-000000000001', E'去年我们全家也是这条线。补充几点:I-40沿路加油站间距不小,油量剩一半就加;大峡谷南缘四月早晚还挺冷,娃的厚衣服带上;车里备水和零食,Williams往北那段没什么补给。安全座椅检查一下安装是不是紧的,能晃动超过一英寸就重新装。', '2026-04-02 20:05:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000003', 'd0000000-0000-0000-0004-000000000001', 'a1000000-0000-0000-0000-000000000033', E'备胎别忘了!很多人从来没看过自己备胎,亏气的备胎等于没有。顺手确认千斤顶和扳手都在。再买个几十刀的应急启动宝放后备箱,长途心里踏实很多。', '2026-04-03 11:22:00-07')
ON CONFLICT (id) DO NOTHING;

-- P02 discussion: 高速爆胎处理
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000002', 'a1000000-0000-0000-0000-000000000019', 'discussion', '高速上突然爆胎,正确操作到底是什么?', E'上周朋友在I-35上七十多迈爆了前胎,他下意识猛踩刹车,车头甩了一下差点撞护栏,万幸没事。我开车这么多年也没遇到过,想认真问一下:高速爆胎的瞬间到底应该怎么操作?是不是不能踩刹车?事后处理流程又是什么?希望大家都用不上,但真心觉得应该提前学。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['安全驾驶','轮胎'], 'active', '2026-04-03 18:40:00-05', '2026-04-03 18:40:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000004', 'd0000000-0000-0000-0004-000000000002', 'a0000000-0000-0000-0000-000000000007', E'你朋友的反应恰恰是最危险的。正确顺序:1. 双手握紧方向盘,车会往爆胎一侧偏,用力稳住走直线;2. 千万不要猛刹车,松油门让车自己减速;3. 速度降到四五十迈以下再轻点刹车,打灯慢慢挪到路肩;4. 停稳后开双闪,人从副驾侧下车站到护栏外,再打救援电话。记住口诀:握稳、松油、缓停。', '2026-04-04 09:12:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000005', 'd0000000-0000-0000-0004-000000000002', 'a0000000-0000-0000-0000-000000000008', E'预防比处理更重要:大部分高速爆胎是长期亏气加高温,每个月看一眼胎压,胎纹磨到指示条就换,胎壁有鼓包立刻换。另外高速上除非万不得已,不建议自己在路肩换胎,尤其左侧路肩,叫救援更安全。', '2026-04-04 16:33:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000006', 'd0000000-0000-0000-0004-000000000002', 'a1000000-0000-0000-0000-000000000022', E'亲历过一次后胎爆,后胎比前胎好控制一些,但那声巨响真的吓人。当时就是死死握方向盘滑到路肩的。补一句:停在路肩后人别坐车里,被追尾的案例太多了。', '2026-04-05 10:02:00-05')
ON CONFLICT (id) DO NOTHING;

-- P03 discussion: roadside assistance 值不值
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000003', 'a1000000-0000-0000-0000-000000000013', 'discussion', '开十年老车,道路救援会员有必要买吗?', E'我的车是2016年的卡罗拉,快十万迈了,平时波士顿市区和学校两点一线。最近续保险看到可以加roadside assistance,一年三十多刀,AAA会员则要七八十。老车是不是更应该买个救援保障?还是说卡罗拉皮实根本用不上?大家都买了吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['道路救援','用车成本'], 'active', '2026-04-05 21:10:00-04', '2026-04-05 21:10:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000007', 'd0000000-0000-0000-0004-000000000003', 'a1000000-0000-0000-0000-000000000012', E'十年老车建议至少留一个。我算过账:一次拖车没有会员的话一百五到三百刀,电瓶搭电上门也要七八十,只要用一次就回本。市区通勤其实最常用的是搭电和锁车里这种小事,不是拖车。保险附带的三十刀那档基本够用。', '2026-04-06 08:15:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000008', 'd0000000-0000-0000-0004-000000000003', 'a0000000-0000-0000-0000-000000000004', E'还有个思路:先看看你信用卡有没有自带救援优惠,有些卡有按次收费的服务。另外新一点的手机保险套餐、甚至有些手机运营商也送救援。别重复买了。卡罗拉十万迈确实不容易坏,但电瓶冬天说没就没,东北部老铁都懂。', '2026-04-06 12:40:00-04')
ON CONFLICT (id) DO NOTHING;

-- P04 discussion: AAA vs 保险自带
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000004', 'a1000000-0000-0000-0000-000000000030', 'discussion', 'AAA和保险自带救援,重复了留哪个?', E'整理账单发现我同时有AAA基础会员和保险里的roadside,明显重复了。AAA一年79,保险那个一年25。想砍掉一个但拿不定主意:听说走保险的救援会留记录影响保费?AAA的拖车里程好像也更长?有没有人对比过这两个的实际区别,砍哪个更合理?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['道路救援','保险'], 'active', '2026-04-06 12:05:00-07', '2026-04-06 12:05:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000009', 'd0000000-0000-0000-0004-000000000004', 'a0000000-0000-0000-0000-000000000001', E'我留的是AAA,理由三个:一是AAA跟人不跟车,你开别人车、坐别人车抛锚都能叫;二是保险的救援每次使用会记成一条零赔付记录,虽然多数公司说不影响保费,但换保险询价时有的公司会看;三是AAA顺带的酒店租车折扣、DMV代办服务,加州人用得上。预算紧才留保险那个。', '2026-04-06 15:30:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000010', 'd0000000-0000-0000-0004-000000000004', 'a1000000-0000-0000-0000-000000000025', E'看用车场景。你要是常跑长途,AAA基础会员免费拖车只有5英里,超出按里程收,真要保长途得升Plus(100英里)。市区代步的话保险那个25刀性价比高。我在凤凰城周边跑得多,留了AAA Plus,去年拖了一次60英里,直接回本好几年。', '2026-04-07 09:18:00-07')
ON CONFLICT (id) DO NOTHING;

-- P05 discussion: 机场长期停车
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000005', 'a1000000-0000-0000-0000-000000000002', 'discussion', 'LAX停一周,哪种停车方案最划算?', E'月底回国一周,查了下LAX官方经济停车场一天也要二十多,一周下来小两百。周边那些带shuttle的私营停车场广告价看着便宜,但评论区有人说取车等半小时、车被剐。大家去LAX长期停车一般怎么解决?私营的靠谱吗,还是干脆叫朋友送机?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['机场停车','出行'], 'active', '2026-04-01 08:32:00-07', '2026-04-01 08:32:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000011', 'd0000000-0000-0000-0004-000000000005', 'a0000000-0000-0000-0000-000000000002', E'私营的关键是提前在官网或比价网站订,walk-in价和预订价能差一倍。我常用105附近那几家,一天十刀上下,shuttle十几分钟一班。要点:选有顶棚或室内的位置(加几刀),拍照记录车况,贵重物品全带走。赶早班机记得给shuttle留足40分钟余量。', '2026-04-01 11:05:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000012', 'd0000000-0000-0000-0004-000000000005', 'a1000000-0000-0000-0000-000000000032', E'一周的话我一般直接比较三个:官方经济场提前网上订常有折扣价、私营停车场、还有打车往返的钱。从帕萨迪纳打车去LAX单程就六七十,停车反而便宜。你家要是离机场近,答案可能就反过来了,动手算一下就清楚。', '2026-04-01 19:44:00-07')
ON CONFLICT (id) DO NOTHING;

-- P06 discussion: 花粉季洗车
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000006', 'a1000000-0000-0000-0000-000000000016', 'discussion', '亚特兰大花粉把车糊成黄色,多久洗一次?', E'四月的亚特兰大真是没法看,黑色的车停一晚就变黄绿色,松树花粉铺满整个车身。请教一下:花粉季是不是得天天洗车?不洗会不会伤车漆?还有人说要打蜡保护,现在打还是等花粉季过了再打?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['洗车','漆面养护'], 'active', '2026-04-07 17:25:00-04', '2026-04-07 17:25:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000013', 'd0000000-0000-0000-0004-000000000006', 'a0000000-0000-0000-0000-000000000007', E'花粉本身短期不太腐蚀车漆,真正伤漆的是干擦:花粉颗粒偏硬,拿掸子或干毛巾一抹全是划痕。正确做法是先用水冲掉大部分,再正常洗。频率不用天天洗,一周一次水冲、两周一次正经洗就够。蜡现在就可以打,表面有蜡层花粉冲起来容易得多,等季节过了再补一次。', '2026-04-08 10:11:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000014', 'd0000000-0000-0000-0004-000000000006', 'a1000000-0000-0000-0000-000000000024', E'俄亥俄这边也一样。我的偷懒办法:花粉季办一个自动洗车月卡,十几二十刀无限次,路过就冲一遍,比手洗省事太多。另外这段时间空调记得开内循环,不然花粉全进车里,过敏的人受不了。', '2026-04-08 14:02:00-04')
ON CONFLICT (id) DO NOTHING;

-- P07 discussion: 玻璃镀膜
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000007', 'a1000000-0000-0000-0000-000000000006', 'discussion', '前挡玻璃疏水镀膜是智商税吗?', E'贴膜店推销玻璃镀膜,说雨天不用开雨刮水珠自己飞走,报价一百五做前挡加两侧。北加最近雨多,确实心动,但又觉得像智商税。有做过的朋友说说实际效果吗?能维持多久?跟自己买瓶Rain-X涂涂区别大不大?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['玻璃镀膜','雨季'], 'active', '2026-04-08 20:18:00-07', '2026-04-08 20:18:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000015', 'd0000000-0000-0000-0004-000000000007', 'a1000000-0000-0000-0000-000000000038', E'效果是真的,四十迈以上水珠直接被风吹走,夜雨看路灯也不炫。但一百五不值——自己买瓶疏水剂十来刀,先用玻璃水+钢丝绒0000号把油膜去掉,再涂两遍,效果能到店里八成,维持两三个月,雨季前补涂一次就行。店里用的耐久型能撑一年,但差价够你买十瓶了。', '2026-04-09 09:30:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000016', 'd0000000-0000-0000-0004-000000000007', 'a0000000-0000-0000-0000-000000000008', E'提醒一句:涂之前的除油膜步骤比涂什么牌子更重要,油膜不除干净,涂完雨刮会抖会响。另外别涂雨刮胶条那面,有些人涂完嫌雨刮跳,其实是这个原因。DIY完全够用,这钱省下来。', '2026-04-09 13:15:00-07')
ON CONFLICT (id) DO NOTHING;

-- P08 discussion: 隔热膜法规
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000008', 'a1000000-0000-0000-0000-000000000037', 'discussion', '加州前侧窗到底能不能贴膜?会被罚吗?', E'天热了想全车贴隔热膜,店家说前侧窗给我贴35%的,被查了算他的。但我网上查加州法规好像前侧窗要70%以上透光?身边确实一堆人贴着深色膜也没事。想问问懂的朋友:加州实际执法什么情况?被拦下来是罚款还是撕膜?有没有既合法又隔热的方案?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['隔热膜','法规'], 'active', '2026-04-09 12:44:00-07', '2026-04-09 12:44:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000017', 'd0000000-0000-0000-0004-000000000008', 'a0000000-0000-0000-0000-000000000007', E'店家说"算他的"你可别信,罚单是开给你的。加州规定:前挡只能贴最上沿,前侧窗必须70%以上透光,后排和后挡随便贴。合法方案是前侧窗上70%的陶瓷膜,看起来接近透明但红外隔热率能到90%以上,隔热主要靠陶瓷层不靠颜色深浅。预算大头花在前挡上沿和前侧窗陶瓷膜,后排可以用便宜点的深色膜。', '2026-04-09 16:20:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000018', 'd0000000-0000-0000-0004-000000000008', 'a1000000-0000-0000-0000-000000000003', E'亲身经历:前侧窗20%的膜,晚上被拦下来吃了个fix-it ticket,要求撕膜后去签字销单,还交了25刀手续费。虽然不是大钱但折腾,撕膜再贴新的又是几百。一步到位贴合法的省心。', '2026-04-10 08:55:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000019', 'd0000000-0000-0000-0004-000000000008', 'a1000000-0000-0000-0000-000000000009', E'纽约的朋友注意,NY是前后排侧窗都要70%,而且年检直接测透光率,不合格过不了检。别把加州那套搬过来。', '2026-04-10 18:12:00-04')
ON CONFLICT (id) DO NOTHING;

-- P09 discussion: 行车记录仪 (image)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000009', 'a0000000-0000-0000-0000-000000000003', 'discussion', 'Model 3自带哨兵,还有必要装记录仪吗?', E'开Model 3三年了(上图),一直靠车机自带的行车记录和哨兵模式。上个月被别车,导出录像发现夜间画质一般,车牌根本看不清。纠结要不要再装个独立的行车记录仪,还是换个好点的U盘就行?装独立记录仪的话走线会不会破坏内饰?求装过的朋友分享。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Tesla_Model_3_interior.jpg/960px-Tesla_Model_3_interior.jpg'], NULL, NULL, NULL, ARRAY['行车记录仪','特斯拉'], 'active', '2026-04-10 21:37:00-07', '2026-04-10 21:37:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000020', 'd0000000-0000-0000-0004-000000000009', 'a1000000-0000-0000-0000-000000000005', E'先把U盘换成高耐久的microSD卡加读卡器或者小固态,原厂录像丢帧很多时候是U盘写入速度不行。哨兵的短板是夜间码率和没有车内视角,如果你常停路边,加一个独立记录仪确实有意义。', '2026-04-11 08:20:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000021', 'd0000000-0000-0000-0004-000000000009', 'a1000000-0000-0000-0000-000000000001', E'我的3装了独立前后双录。走线不难:前挡镜头藏在后视镜后面,线沿顶棚缝隙塞进去,顺A柱下来(注意别压到气囊标记的位置),藏进门框胶条到手套箱后面接电。全程用塑料撬棒,不留痕迹,一个多小时搞定。取电用点烟器最简单,要停车监控就接降压线。', '2026-04-11 12:45:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000022', 'd0000000-0000-0000-0004-000000000009', 'a0000000-0000-0000-0000-000000000007', E'从修车角度提醒:A柱走线一定避开侧气帘,线固定在原车线束旁边,别用铁丝乱捆。特斯拉低压电瓶不大,接降压线做停车监控要设好低压保护值,别把小电瓶耗趴窝。', '2026-04-11 15:10:00-07')
ON CONFLICT (id) DO NOTHING;

-- P10 discussion: 后备箱应急装备
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000010', 'a1000000-0000-0000-0000-000000000023', 'discussion', '后备箱应急装备,哪些真有用哪些是摆设?', E'密歇根这边前阵子还在下冻雨,上周终于回暖,想趁换季整理下后备箱。网上那种"48件套应急包"看着全乎,但感觉一半用不上。想听听大家真实用过的:哪些东西是真救过急的?哪些买了纯占地方?预算一百刀以内怎么配最实在?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['应急装备','用车心得'], 'active', '2026-04-11 10:15:00-04', '2026-04-11 10:15:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000023', 'd0000000-0000-0000-0004-000000000010', 'a0000000-0000-0000-0000-000000000006', E'按使用频率排:1. 应急启动宝(用过最多,还能给手机充电);2. 胎压表加小气泵;3. 三角牌或爆闪灯;4. 手套和旧毛巾;5. 保暖毯和瓶装水。那种48件套里的拖车绳、火花塞扳手,普通人一辈子用不上,别浪费钱。一百刀配上面这套绰绰有余。', '2026-04-11 14:30:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000024', 'd0000000-0000-0000-0004-000000000010', 'a1000000-0000-0000-0000-000000000040', E'补充两个被低估的:补胎胶条套装(慢漏气自己十分钟搞定,救援都不用叫)和一件反光背心,晚上路肩换胎穿上安全感完全不同。还有,启动宝记得每两三个月充一次电,真用的时候没电最气人。', '2026-04-12 09:05:00-07')
ON CONFLICT (id) DO NOTHING;

-- P11 discussion: 儿童安全座椅法规
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000011', 'a1000000-0000-0000-0000-000000000011', 'discussion', '纽约州安全座椅法规,2岁必须反向坐吗?', E'二宝刚满2岁,大宝5岁。婆婆总说孩子正着坐舒服,想给二宝把座椅转过来。我记得纽约有法律规定2岁前必须反向?现在满2岁了是不是就能转?还有大宝5岁用booster合法吗?两个座椅装在后排中间和右侧哪个位置更安全?求家长们科普。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['儿童座椅','法规'], 'active', '2026-04-12 14:22:00-04', '2026-04-12 14:22:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000025', 'd0000000-0000-0000-0004-000000000011', 'a1000000-0000-0000-0000-000000000013', E'纽约州法律是2岁前必须反向,满2岁法律上可以转正,但儿科学会建议反向坐到座椅的身高体重上限,一般能到3-4岁,反向对颈椎保护好得多,不用急着转。5岁用高背booster合法(NY要求8岁前用儿童约束系统),但前提是孩子体重到了座椅说明书的下限。', '2026-04-12 18:40:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000026', 'd0000000-0000-0000-0004-000000000011', 'a1000000-0000-0000-0000-000000000036', E'位置问题:理论上后排中间离两侧碰撞最远,最安全,但前提是能装稳。很多车中间座位是拱起来的,LATCH也只给两侧,装不紧反而不如装在侧面。小的放中间、大的放右侧(靠人行道侧上下车)是常见组合。', '2026-04-13 09:12:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000027', 'd0000000-0000-0000-0004-000000000011', 'a0000000-0000-0000-0000-000000000008', E'补一个很多人不知道的:各地消防局和医院有免费的car seat检查活动,技师帮你检查安装还教你调肩带高度,搜car seat check加你的城市就能约。统计上一半以上家庭的座椅都装得不对,值得跑一趟。', '2026-04-13 11:30:00-07')
ON CONFLICT (id) DO NOTHING;

-- P12 discussion: 宠物乘车
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000012', 'a1000000-0000-0000-0000-000000000008', 'discussion', '狗子坐车满车乱窜,大家都怎么固定?', E'刚领养了一只两岁的边牧,坐车特别兴奋,后座前座来回跳,有一次直接窜到我腿上,吓出一身冷汗。想问问养狗的车友:你们用什么固定?安全带扣、航空箱还是隔离网?波特兰周末想常带它去爬山,一坐一两个小时,什么方案对狗和人都舒服?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['宠物乘车','安全'], 'active', '2026-04-13 16:08:00-07', '2026-04-13 16:08:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000028', 'd0000000-0000-0000-0004-000000000012', 'a1000000-0000-0000-0000-000000000029', E'边牧这种活跃的建议胸背带加安全带扣,扣在后排安全带卡座上,活动范围留到能坐能卧但够不到前排。千万别只拴脖圈,急刹会勒伤。航空箱其实是碰撞测试里成绩最好的方案,但边牧尺寸的箱子后座放不太下,SUV后备箱固定住才行。另外头伸出窗外那种看着快乐,砂石飞虫伤眼睛,别惯着。', '2026-04-13 19:22:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000029', 'd0000000-0000-0000-0004-000000000012', 'a1000000-0000-0000-0000-000000000007', E'我家金毛用后座隔离网加安全带扣双保险。提醒下长途:每一个半小时停下来放风喝水,车里常备水碗和吸水垫。还有天气快热了,哪怕开个窗也绝对不能把狗单独留车里,西雅图夏天车内温度半小时就能到危险线。', '2026-04-14 08:47:00-07')
ON CONFLICT (id) DO NOTHING;

-- P13 discussion: 搬家卖车 vs 运车
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000013', 'a0000000-0000-0000-0000-000000000002', 'discussion', '五月毕业搬去新泽西,车卖掉还是运过去?', E'终于要毕业了,拿到新泽西的offer,六月入职。现在开的2016卡罗拉,9万迈,车况还行,KBB私卖价大概9千。纠结:1. 在LA卖掉,到东岸再买;2. 花钱运过去;3. 干脆自己开过去当毕业旅行。运车报价问了几家,open的1100到1400。哪个方案最不亏?有没有毕业搬家的前辈分享经验?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['毕业季','搬家运车'], 'active', '2026-04-14 22:15:00-07', '2026-04-14 22:15:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000030', 'd0000000-0000-0000-0004-000000000013', 'a1000000-0000-0000-0000-000000000012', E'在新泽西帮你看了下行情:同年份同里程的卡罗拉这边挂牌普遍比加州贵几百到一千,东岸无锈的加州车还更抢手。也就是说你卖了再买肯定亏(卖是批发价心态,买是零售价),运过去1200左右反而保住了差价。还要算上到NJ重新title和注册的费用,但那笔钱哪个方案都逃不掉。', '2026-04-15 09:33:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000031', 'd0000000-0000-0000-0004-000000000013', 'a0000000-0000-0000-0000-000000000008', E'补充方案三的账:LA到NJ约2800英里,油费300多,住宿两三晚200-300,再算4天时间和车的磨损。如果你本来就想来一次横穿美国,这是最好的时机,顺路大峡谷、66号公路走起;纯为省钱就不值,运车更省心。另外运车选口碑好的broker,交车前录像存证,预留一周的浮动窗口。', '2026-04-15 12:20:00-07')
ON CONFLICT (id) DO NOTHING;

-- P14 discussion: 跨州买车税
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000014', 'a1000000-0000-0000-0000-000000000007', 'discussion', '住华州去俄勒冈买车,真能省销售税吗?', E'西雅图这边车价加上10%左右的税实在肉疼。俄勒冈没有销售税,离得也不远,朋友撺掇我去波特兰买车省一笔。但我总觉得没这么好的事:华州注册的时候会不会补收?到底怎么算的?有没有实际操作过的朋友讲讲,别让我白跑一趟。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['跨州买车','税费'], 'active', '2026-04-15 19:05:00-07', '2026-04-15 19:05:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000032', 'd0000000-0000-0000-0004-000000000014', 'a0000000-0000-0000-0000-000000000007', E'直接说结论:省不了。销售税/使用税跟的是你注册所在地,不是购车地。你在俄勒冈买完,回华州DOL注册时会按你所在地税率补收use tax,一分跑不掉。跨州买车的意义在于选择面大、同款车差价,而不是避税。真正合法少交税的途径是trade-in抵扣(华州按差额计税)。', '2026-04-16 10:14:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000033', 'd0000000-0000-0000-0004-000000000014', 'a1000000-0000-0000-0000-000000000008', E'俄勒冈居民路过:免税是给我们有OR驾照和地址的人的,dealer卖外州人的时候都会问注册州。别听网上说借朋友地址注册那种操作,华州对常住居民挂外州牌查得挺严,被认定逃税罚得更多。', '2026-04-16 13:42:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000034', 'd0000000-0000-0000-0004-000000000014', 'a0000000-0000-0000-0000-000000000006', E'不过去波特兰看车本身不亏,俄勒冈车源不用交税所以标价谈判逻辑简单,而且那边气候温和车况普遍不错。我上一辆就是波特兰私人手里买的,回来补税,但车本身比西雅图同价位的强。', '2026-04-16 20:08:00-07')
ON CONFLICT (id) DO NOTHING;

-- P15 discussion: 远程购车风险
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000015', 'a1000000-0000-0000-0000-000000000027', 'discussion', '外州私人卖家让先打订金,这靠谱吗?', E'在网上看中一辆丹佛的2019年RAV4,价格比盐湖城本地低两千多。卖家人在电话里很客气,说问的人多,让我先Zelle五百订金帮我留车,我飞过去看车满意再付尾款。总觉得哪里不对但又怕错过。远程买私人车的正确流程应该是什么?订金到底能不能打?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['远程购车','避坑'], 'active', '2026-04-16 11:28:00-06', '2026-04-16 11:28:00-06')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000035', 'd0000000-0000-0000-0004-000000000015', 'a0000000-0000-0000-0000-000000000008', E'Zelle订金=打水漂,这是远程购车头号骗局,价格明显低于市场价+催你付订金,两个红旗都齐了。正确流程:1. 视频通话实时看车,让卖家拍VIN、里程表、title正反面;2. 自己拉Carfax对里程和事故;3. 花一百多刀约当地第三方pre-purchase inspection,正规店都提供;4. 见面交易,银行本票加DMV办手续,一手交钱一手拿title。任何见面前要钱的,直接拉黑。', '2026-04-16 14:50:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000036', 'd0000000-0000-0000-0004-000000000015', 'a1000000-0000-0000-0000-000000000028', E'低于市场价两千多本身就是钓鱼价。真着急卖的人会接受你飞过去当天看车当天成交,不会催你先打钱。我买卖过好几台车,凡是说"问的人多快下订"的,九成是话术。', '2026-04-17 09:26:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000037', 'd0000000-0000-0000-0004-000000000015', 'a0000000-0000-0000-0000-000000000007', E'强调下PPI:一百多刀让机械师升起来看底盘、读电脑、试车,能筛掉九成的坑。外州车你人生地不熟,这钱绝对不能省。RAV4这种保值车很少有"捡漏价",便宜必有原因。', '2026-04-17 13:05:00-07')
ON CONFLICT (id) DO NOTHING;

-- P16 discussion: escrow 服务
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000016', 'a1000000-0000-0000-0000-000000000015', 'discussion', '二手车交易用escrow第三方托管靠谱吗?', E'准备卖车,买家在外州,提出用一个escrow网站托管资金,说他打款到平台,我发车他验收后平台放款。听起来对双方都公平,但我搜了下发现假escrow网站骗局也很多。有人实际用过这类服务吗?怎么分辨真假?还是说坚持见面现金/本票交易更好?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['交易安全','避坑'], 'active', '2026-04-16 20:34:00-04', '2026-04-16 20:34:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000038', 'd0000000-0000-0000-0004-000000000016', 'a0000000-0000-0000-0000-000000000008', E'关键点:正规的第三方托管确实存在(escrow.com是老牌持牌的,还有专做车辆交易的KeySavvy这类),但"买家指定的陌生escrow网站"是经典骗局模板——网站是骗子自己搭的,显示"资金已托管"骗你发车。规则很简单:用哪家平台必须由你选或双方共同确认,查平台的牌照和年头,任何买家发链接让你注册的一律当骗局处理。', '2026-04-17 10:12:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000039', 'd0000000-0000-0000-0004-000000000016', 'a1000000-0000-0000-0000-000000000009', E'我去年卖车给外州买家就是用的持牌托管平台,买家打款、平台核实、我交车签title、平台放款,前后四天,手续费买家出的。体验不错,但整个流程发起链接是我发给他的,主动权在卖家手里这点很重要。', '2026-04-17 21:40:00-04')
ON CONFLICT (id) DO NOTHING;

-- P17 discussion: 水泡车辨别 (image)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000017', 'a1000000-0000-0000-0000-000000000017', 'discussion', '雨季看车怕水泡,老铁们帮看看这内饰', E'奥兰多这边雨季快到了,想趁现在收个便宜代步车。看中一辆老车,卖家发来内饰图(见图),价格低得有点反常。佛州水泡车多是出了名的,光看照片我也拿不准。想请教:实地看车的时候从哪些地方能看出泡过水?卖家嘴上说无事故无泡水,能信几分?', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/ZAZ-1103_Slavuta_front_seats_and_dashboard_interior_view.jpg/960px-ZAZ-1103_Slavuta_front_seats_and_dashboard_interior_view.jpg'], NULL, NULL, NULL, ARRAY['水泡车','验车'], 'active', '2026-04-18 13:47:00-04', '2026-04-18 13:47:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000040', 'd0000000-0000-0000-0004-000000000017', 'a0000000-0000-0000-0000-000000000007', E'照片看不出泡水,必须实地。教你几招:1. 上车先闻,霉味或者刺鼻的香水味(用来盖霉味)都是警报;2. 掀开地毯一角摸底板,看有没有泥沙和锈;3. 座椅滑轨、座椅下方弹簧和螺丝有没有锈;4. 大灯尾灯内侧有没有水痕水汽;5. 保险丝盒和线束插头有没有绿色氧化;6. 安全带全部拉到底,看根部有没有水渍霉斑。占两条以上就走人。', '2026-04-18 16:22:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000041', 'd0000000-0000-0000-0004-000000000017', 'a1000000-0000-0000-0000-000000000018', E'迈阿密人告诉你:先查VIN,NICB的VINCheck免费查盗抢和flood记录,再拉Carfax看title有没有salvage或flood brand。但注意很多水泡车是走私牌照洗白的,记录干净不等于没泡过,所以Tony说的实地检查一步都不能省。', '2026-04-19 10:08:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000042', 'd0000000-0000-0000-0004-000000000017', 'a0000000-0000-0000-0000-000000000008', E'"价格低得反常"这六个字已经是答案的一半了。佛州每年飓风季过后半年到一年,市场上洗白水泡车最多,现在这个时间点正好撞上。预算再紧也建议加点钱买记录清楚的,水泡车电路问题是无底洞。', '2026-04-19 12:31:00-07')
ON CONFLICT (id) DO NOTHING;

-- P18 discussion: 异地违章
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000018', 'a1000000-0000-0000-0000-000000000003', 'discussion', '收到亚利桑那寄来的摄像头罚单,要理吗?', E'上个月开车去凤凰城玩,昨天收到一封亚利桑那某市寄来的photo radar罚单,拍的是我的车牌,超速11迈,罚一百多。网上有人说这种邮寄的照相罚单可以不理,过段时间自动作废;也有人说不交会影响加州这边的记录甚至注册。到底哪种说法对?有经历过的吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['违章罚单','异地用车'], 'active', '2026-04-19 17:56:00-07', '2026-04-19 17:56:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000043', 'd0000000-0000-0000-0004-000000000018', 'a1000000-0000-0000-0000-000000000025', E'本地人科普下:亚利桑那的photo radar罚单确实有个特殊规定,邮寄不构成正式送达,理论上一定期限内没被process server当面送达,案子可能作废。但注意三点:1. 你是外州人,城市法院的处理方式各地不一样;2. 有的城市会转给催收公司,影响信用;3. 别拿"可能作废"赌。先看罚单是civil speeding还是criminal,金额不大的话我一般建议线上交了省心,或者打电话问法院能不能上defensive driving课销分。', '2026-04-20 08:44:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000044', 'd0000000-0000-0000-0004-000000000018', 'a0000000-0000-0000-0000-000000000001', E'我几年前也中过一张。照相罚单一般是civil性质,不上驾照记分,大概率也不传到加州DMV,主要风险就是催收和下次再进那个州的麻烦。我当时选择交了,一百多买个安心。要是罚单信息有错(车型对不上、照片不是你),那就写信dispute,成功率不低。', '2026-04-20 12:19:00-07')
ON CONFLICT (id) DO NOTHING;

-- P19 discussion: gap insurance
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000019', 'a1000000-0000-0000-0000-000000000020', 'discussion', '贷款买车被推销gap保险,到底值不值?', E'上周在休斯顿贷款提了辆二手SUV,首付10%,贷六年。F&I办公室极力推销gap insurance,说车被偷或全损时赔保险赔付和贷款余额的差额,收我800刀一次性。当时没签,回来越想越纠结:我这种低首付长贷款是不是正需要?但800刀是不是被宰了?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保险','贷款买车'], 'active', '2026-04-20 12:41:00-05', '2026-04-20 12:41:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000045', 'd0000000-0000-0000-0004-000000000019', 'a1000000-0000-0000-0000-000000000019', E'两个问题分开看。第一,你需不需要gap:首付10%贷6年,头两三年大概率欠款高于车价,属于典型需要gap的画像,需要。第二,在哪买:dealer的800刀是最贵的渠道,你自己的车险公司加一个gap/loan coverage,一年也就二三十刀,等贷款还到低于车价了随时取消。打给你的保险agent问一句就行,没签是对的。', '2026-04-20 18:25:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000046', 'd0000000-0000-0000-0004-000000000019', 'a0000000-0000-0000-0000-000000000005', E'补充:就算已经在dealer买了的姐妹也别慌,gap产品一般可以按比例退,写信给贷款行和产品公司申请cancel就行。另外有些credit union的车贷自带便宜的gap,几十刀整个贷款期,下次贷款前先问银行。', '2026-04-21 09:14:00-05')
ON CONFLICT (id) DO NOTHING;

-- P20 discussion: 油价app (image)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000020', 'a1000000-0000-0000-0000-000000000034', 'discussion', '油价又上来了,省油钱的app哪个真好用?', E'最近油价一路涨,我的小Prius都觉得加油肉疼了(图是我的仪表,还是省油小能手)。看网上有GasBuddy、Upside一堆app,还有各种加油返现信用卡。想问问大家日常真的在用哪个?返现类的会不会用了发现油站本身就贵,等于没省?求真实体验。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Toyota_Prius_C_Dashboard_Canada.jpg/960px-Toyota_Prius_C_Dashboard_Canada.jpg'], NULL, NULL, NULL, ARRAY['油价','省钱'], 'active', '2026-04-08 08:52:00-07', '2026-04-08 08:52:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000047', 'd0000000-0000-0000-0004-000000000020', 'a1000000-0000-0000-0000-000000000002', E'我的组合:GasBuddy纯比价,出门前看一眼顺路哪家便宜;Upside返现是真的,但你说的坑也是真的——个别合作油站标价偏高,所以要配合GasBuddy交叉看,净价便宜才加。再叠一张加油3%以上返现的信用卡,一箱油能省两三刀。别为省一毛钱专门绕路,油钱又烧回去了。', '2026-04-08 12:30:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000048', 'd0000000-0000-0000-0004-000000000020', 'a1000000-0000-0000-0000-000000000028', E'拉斯维加斯人民表示:什么app都不如Costco和山姆的油价实在,常年比周边低两三毛。你有会员卡的话直接去,没有的话算算一年油量,会员费很容易就赚回来。Prius油箱小,更适合顺路加,别专门跑。', '2026-04-09 10:15:00-07')
ON CONFLICT (id) DO NOTHING;

-- P21 discussion: Costco 油
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000021', 'a1000000-0000-0000-0000-000000000031', 'discussion', 'Costco的油质量到底行不行?排队值得吗?', E'弗里蒙特Costco油站永远在排队,便宜是真便宜,比隔壁品牌站低三四毛。但家里长辈一直念叨"便宜没好油,伤发动机"。想问懂行的:Costco的油和雪佛龙壳牌到底有没有本质区别?每次排队十来分钟到底值不值?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['加油','用车成本'], 'active', '2026-04-21 18:33:00-07', '2026-04-21 18:33:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000049', 'd0000000-0000-0000-0004-000000000021', 'a0000000-0000-0000-0000-000000000003', E'放心加。Costco的Kirkland汽油是Top Tier认证的,清洁添加剂剂量达标,和雪佛龙壳牌同属一个认证体系,基础油本来就出自同样的区域炼厂和管道,差别只在各家添加剂配方。"便宜伤发动机"是老黄历。我两辆车加了六七年,毫无问题。', '2026-04-22 09:21:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000050', 'd0000000-0000-0000-0004-000000000021', 'a1000000-0000-0000-0000-000000000005', E'排队问题有解:工作日早上开门后半小时和晚上关门前基本不用等,周末下午是重灾区。按一箱省四五刀算,一年五十箱就是两百多刀,排队这点时间我觉得值,顺路买菜一起解决。', '2026-04-22 12:48:00-07')
ON CONFLICT (id) DO NOTHING;

-- P22 discussion: 退税买车预算
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000022', 'a1000000-0000-0000-0000-000000000014', 'discussion', '退税到账6800,换车还是继续开老Civic?', E'报完税退了6800刀,刚到账。现在的车是2018年Civic,11万迈,除了小毛病不断(异响、空调偶尔罢工)大问题没有。心痒想拿退税当首付换个新点的,但理智又说Civic还能再战几年。大家遇到这种情况怎么选?退税季是不是买车的好时机,dealer会不会趁机抬价?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['换车','退税季'], 'active', '2026-04-17 19:22:00-04', '2026-04-17 19:22:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000051', 'd0000000-0000-0000-0004-000000000022', 'a0000000-0000-0000-0000-000000000008', E'先泼冷水:退税季(二到四月)恰恰是二手车price高点之一,dealer都知道大家兜里有钱,行情数据每年这时候都翘一下。你的Civic 11万迈对这个车系来说正当壮年,异响和空调修一修一两千封顶。我的建议:拿一千修车,五千八存着当应急金或者明年淡季(秋冬)再换,同样的车能便宜不少。"车还能开"的时候换车,永远是最亏的时机。', '2026-04-18 09:40:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000052', 'd0000000-0000-0000-0004-000000000022', 'a1000000-0000-0000-0000-000000000010', E'同意楼上。补一个判断标准:一年修车钱超过车价的一半再考虑换。你这才小毛病,离那条线远着呢。我那台老凯美瑞就是这么开到18万迈的,省下的钱真香。', '2026-04-18 15:27:00-04')
ON CONFLICT (id) DO NOTHING;

-- P23 discussion: 毕业季卖车时机
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000023', 'a1000000-0000-0000-0000-000000000024', 'discussion', '五月毕业卖车,现在挂出去还是等等?', E'俄州这边五月中毕业,之后回国发展,车必须出掉,2019年Corolla,车况不错。问题是时机:现在四月下旬就挂,还是等到五月毕业季买家多的时候?听说毕业季卖车的人也扎堆,价格反而被压?第一次卖车,怕留的时间不够最后贱卖,求过来人指导节奏。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['毕业季','卖车'], 'active', '2026-04-22 10:18:00-04', '2026-04-22 10:18:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000053', 'd0000000-0000-0000-0004-000000000023', 'a0000000-0000-0000-0000-000000000008', E'现在就挂,原因:1. 毕业季五月中下旬卖家集中抛售,尤其大学城,同款车一挂七八台,买方市场;2. 你现在挂,面对的是五月入学/入职提前找车的买家,竞争小;3. 私卖平均要两三周才能遇到合适买家,你等到五月再挂,时间压力会逼你接受低价。定价参考KBB私卖价上浮5%留砍价空间,照片洗干净车在白天拍,保养记录整理成一个文件夹,好车不愁卖。', '2026-04-22 13:50:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000054', 'd0000000-0000-0000-0004-000000000023', 'a0000000-0000-0000-0000-000000000004', E'过来人补充:留出plan B,定一个心理底价和最后期限(比如离校前十天),到期没卖掉就问CarMax/Carvana报价保底。别学我当年拖到最后三天,被人当面砍一千五还得笑着答应。', '2026-04-23 11:32:00-04')
ON CONFLICT (id) DO NOTHING;

-- P24 discussion: 雨刮
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000024', 'a1000000-0000-0000-0000-000000000040', 'discussion', '雨刮一动就吱吱响还刮不干净,换啥牌子?', E'塔科马的春雨下个没完,我的雨刮现在一动就吱吱叫,刮完还留一道道水痕,晚上开车特别影响视线。原厂的用了大概两年。想问:直接换哪个牌子好?传统骨架式和无骨的选哪种?还是说有可能不是雨刮的问题?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['雨刮','雨季'], 'active', '2026-04-05 09:47:00-07', '2026-04-05 09:47:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000055', 'd0000000-0000-0000-0004-000000000024', 'a1000000-0000-0000-0000-000000000007', E'西北雨区两年确实到寿命了。先花五分钟排除法:湿布蘸点玻璃水把胶条擦一遍(会擦下来很多黑色残渣),再把前挡好好洗一次去油膜,三成的吱吱声这样就好了。还不行就换,推荐beam式(无骨),贴合度好,Bosch Icon或者Rain-X Latitude都稳,我们这种天天下雨的地方一年到一年半一换。', '2026-04-05 12:15:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000056', 'd0000000-0000-0000-0004-000000000024', 'a0000000-0000-0000-0000-000000000006', E'Costco的Michelin两支装打折时性价比无敌,自己换,卡扣对上一分钟一根,店里换还收工时费纯浪费。买的时候查好自己车的尺寸,主驾和副驾长度经常不一样。', '2026-04-06 08:30:00-07')
ON CONFLICT (id) DO NOTHING;

-- P25 discussion: 樱花树胶鸟粪
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000025', 'a1000000-0000-0000-0000-000000000036', 'discussion', '樱花很美,但车停树下一周成灾了怎么办', E'长岛家门口一排樱花树,开花是真好看,掉下来是真要命。车在树下停了一周,车顶引擎盖全是压扁的花瓣、黏糊糊的树胶点,还有好几坨鸟粪,有的已经干硬了。直接冲洗根本弄不掉,拿指甲抠又怕伤漆。求救:这些东西怎么安全去除?已经留下印子的还有救吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['漆面养护','樱花季'], 'active', '2026-04-06 16:29:00-04', '2026-04-06 16:29:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000057', 'd0000000-0000-0000-0004-000000000025', 'a0000000-0000-0000-0000-000000000008', E'分类处理:鸟粪最伤漆(酸性),干硬的先盖一张湿纸巾泡软几分钟再轻轻拎走,千万别干抠;树胶用专用的bug&tar remover或者异丙酒精点在毛巾上敷着擦,溶掉就下来了;花瓣印正常洗车加铁粉去除剂多数能掉。已经蚀出轮廓的浅印,抛光蜡手抛能救回来一大半,深到指甲能感觉到台阶的就得抛光机了。以后这个季节买个车罩,二三十刀解决所有问题。', '2026-04-07 09:55:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000058', 'd0000000-0000-0000-0004-000000000025', 'a1000000-0000-0000-0000-000000000039', E'西雅图樱花季同款烦恼。补充一个顺序:先冲水再动手,所有溶剂擦完的区域记得补一层快速蜡,不然那块漆裸着更容易吃灰。鸟粪真的要当天处理,太阳一晒加速腐蚀,我车顶有个印就是拖了三天的教训。', '2026-04-07 14:18:00-07')
ON CONFLICT (id) DO NOTHING;

-- P26 discussion: 轮胎4/32
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000026', 'a1000000-0000-0000-0000-000000000026', 'discussion', '轮胎还剩4/32,能再撑一个夏天吗?', E'保养时店里说我四条胎都剩4/32了,建议全换,报价八百多。我看胎面花纹还挺明显的,有点怀疑是不是想赚我钱。丹佛这边春天偶尔还下雪,夏天又常有雷阵雨。4/32到底是什么水平?能不能撑到年底黑五买胎打折?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['轮胎','保养'], 'active', '2026-04-23 12:36:00-06', '2026-04-23 12:36:00-06')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000059', 'd0000000-0000-0000-0004-000000000026', 'a0000000-0000-0000-0000-000000000007', E'店里这次没坑你。法定最低是2/32,但那是"违法线"不是"安全线":测试数据里4/32的湿地刹车距离比新胎长出一大截,雪地性能下降更明显。你在丹佛,春雪加夏季雷雨,4/32属于"该安排了"。干燥地区代步可以撑到3/32,你这情况我不建议赌到黑五。可以关注下五月Memorial Day各家轮胎店的促销,买三送一很常见,不用等年底。', '2026-04-23 15:44:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000060', 'd0000000-0000-0000-0004-000000000026', 'a1000000-0000-0000-0000-000000000019', E'教你自己验证:拿一个25美分硬币,华盛顿头朝下插进花纹,能看到头顶就是4/32以下。多测几个位置,内外侧磨损不均说明还有四轮定位问题。别只信店里一张嘴,自己两分钟测完心里有数。', '2026-04-24 09:28:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000061', 'd0000000-0000-0000-0004-000000000026', 'a1000000-0000-0000-0000-000000000033', E'提醒一句:你要是AWD的车,四条一起换,别听人劝只换两条,前后直径差太多对分动系统不好。Costco和Discount Tire都能price match,拿着对方报价去谈。', '2026-04-24 13:16:00-07')
ON CONFLICT (id) DO NOTHING;

-- P27 discussion: 二手车买回先做什么
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000027', 'a1000000-0000-0000-0000-000000000021', 'discussion', '刚提的二手雅阁,第一周该做哪些保养?', E'上周末从私人手里收了台2017雅阁,7万迈,车况看着不错但保养记录不全,前车主说"一直按时保养"但拿不出单子。奥斯汀的朋友推荐我先全套保养一遍图个安心。想问:哪些是必须马上做的?哪些可以缓缓?预算五百左右够不够?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保养','二手车'], 'active', '2026-04-24 20:09:00-05', '2026-04-24 20:09:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000062', 'd0000000-0000-0000-0004-000000000027', 'a0000000-0000-0000-0000-000000000007', E'记录不全就当没保养过,按这个优先级来:必做——机油机滤(几十刀)、空气滤芯和空调滤芯(自己换很简单)、看刹车油颜色(深褐色就换,百刀内)、胎压和胎纹检查。看情况——7万迈的CVT/AT建议换变速箱油(雅阁CVT大概两百),冷却液看颜色和液位。可以缓——火花塞(原厂间隔一般10万迈)。五百刀在独立修车店做完上面这些够了,别去dealer做,同样的活贵一倍。', '2026-04-25 09:35:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000063', 'd0000000-0000-0000-0004-000000000027', 'a0000000-0000-0000-0000-000000000008', E'加一条零成本的:去NHTSA官网输VIN查未完成的召回,有的话去dealer免费修,这是法定免费的。再把车主手册翻出来对着保养表看一遍,心里就有本账了。恭喜提车!', '2026-04-25 13:22:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000064', 'd0000000-0000-0000-0004-000000000027', 'a1000000-0000-0000-0000-000000000006', E'顺手把电瓶也测一下,很多店免费测。二手车电瓶年龄不明,德州夏天马上到了,高温对电瓶的伤害比冬天还大,别等趴窝了才换。', '2026-04-26 10:44:00-07')
ON CONFLICT (id) DO NOTHING;

-- P28 discussion: 机油里程
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000028', 'a1000000-0000-0000-0000-000000000010', 'discussion', '修车店说5000迈必须换油,手册写10000,信谁?', E'每次去换油,店里都在挡风玻璃贴个3000或5000迈的提醒贴纸,说"美国路况必须勤换"。但我车主手册明明写全合成10000迈或一年。到底听谁的?布鲁克林市区走走停停算不算手册里说的severe condition?多换油对车总没坏处吧,还是纯粹多花钱?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['机油','保养'], 'active', '2026-04-25 11:53:00-04', '2026-04-25 11:53:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000065', 'd0000000-0000-0000-0004-000000000028', 'a0000000-0000-0000-0000-000000000007', E'干这行的说句得罪同行的话:贴纸上的3000迈是上个年代矿物油的标准,现在全合成完全不需要。听手册的,但看细则:你这种市区短途频繁启停确实算severe条件,手册一般会给一个severe schedule,大约是正常间隔的六到七成。所以10000的手册值,你按6000-7500换就很稳妥,5000也行图个整数好记。多换油对车无害,但对钱包有害,一年多花的钱不如攒着换刹车油变速箱油,那些才是常被忽略的。', '2026-04-25 15:28:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000066', 'd0000000-0000-0000-0004-000000000028', 'a1000000-0000-0000-0000-000000000023', E'另一个角度:里程之外还有时间线,开得少的车哪怕一年跑不到五千迈,机油也建议一年一换,油会氧化吸潮。我家那台一年四千迈的买菜车就是按时间换的。', '2026-04-26 09:41:00-04')
ON CONFLICT (id) DO NOTHING;

-- P29 discussion: 刹车异响
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000029', 'a1000000-0000-0000-0000-000000000039', 'discussion', '早上刹车吱吱响,开一会就没了,要紧吗?', E'最近每天早上倒车出库踩刹车都吱吱响,开个十几分钟就完全正常了,一整天都没声,第二天早上又来。贝尔维尤最近天天下雨,不知道有没有关系。这种情况要紧吗?需要去检查还是正常现象?怕小问题拖成大问题,又怕白跑一趟被推销一堆项目。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['刹车','异响'], 'active', '2026-04-26 08:24:00-07', '2026-04-26 08:24:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000067', 'd0000000-0000-0000-0004-000000000029', 'a0000000-0000-0000-0000-000000000007', E'你描述的这种"早晨响、开热就好"大概率没事:潮湿地区过夜后刹车盘表面起一层薄锈,头几脚刹车把锈磨掉就安静了,西雅图这种气候太常见。需要警惕的是另外两种:一是持续的金属尖啸不分早晚,那是刹车片磨损报警片在响,该换片了;二是磨铁的咕噜声或刹车时方向盘抖,马上去检查。你可以顺便看一眼轮毂缝隙里刹车片厚度,厚度还剩三四毫米以上就放心开。', '2026-04-26 12:10:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000068', 'd0000000-0000-0000-0004-000000000029', 'a1000000-0000-0000-0000-000000000040', E'塔科马同款,一到雨季天天如此,我的车这样响了三年了屁事没有。真不放心的话下次换轮胎的时候让师傅顺手看下刹车片,不用专门跑一趟。', '2026-04-27 09:18:00-07')
ON CONFLICT (id) DO NOTHING;

-- P30 discussion: 车内霉味 (image)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000030', 'a1000000-0000-0000-0000-000000000018', 'discussion', '迈阿密雨季车里一股霉味,怎么除根?', E'我这台老林肯(图)最近车里霉味越来越重,尤其开空调头几分钟,一股旧地下室的味道。香水挂件喷雾都试了,治标不治本。迈阿密天天下午雷阵雨,感觉车里就没干过。有什么办法能除根?是不是哪里进水了?', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/2003_Town_Car_Cartier_L-5.jpg/960px-2003_Town_Car_Cartier_L-5.jpg'], NULL, NULL, NULL, ARRAY['车内异味','雨季'], 'active', '2026-04-27 18:36:00-04', '2026-04-27 18:36:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000069', 'd0000000-0000-0000-0004-000000000030', 'a1000000-0000-0000-0000-000000000017', E'佛州老司机三步排查:1. 换空调滤芯,十几刀自己换,老车的滤芯拿出来能吓你一跳;2. 掀地毯摸有没有湿,湿的话查天窗排水管和门底排水孔,佛州的车十有八九是排水孔被树叶堵了,水灌进车厢;3. 后备箱备胎槽也摸一下,积水重灾区。找到水源之前,买袋除湿剂扔车里先顶着。', '2026-04-28 08:52:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000070', 'd0000000-0000-0000-0004-000000000030', 'a0000000-0000-0000-0000-000000000007', E'"开空调头几分钟最臭"指向蒸发箱发霉,潮湿地区老车通病。处理:买罐AC evaporator泡沫清洗剂从排水管或者鼓风机口打进去(视频教程很多),再养成个习惯——到目的地前几分钟关AC只开风,把蒸发箱吹干,霉菌没有潮气就长不起来。滤芯换掉配合这两招,基本能除根。', '2026-04-28 11:15:00-07')
ON CONFLICT (id) DO NOTHING;

-- P31 discussion: 自动洗车伤漆吗
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000031', 'a1000000-0000-0000-0000-000000000009', 'discussion', '自动洗车到底伤不伤漆?纠结要不要办月卡', E'家附近新开了家自动洗车,月卡无限次才25刀,很心动。但网上一堆人说自动洗车的刷子全是划痕,把漆面刷成蜘蛛网。也有人说现在都是软布刷没那么夸张。真相到底是什么?黑色车是不是更明显?我就是个普通通勤族,不追求展车级漆面,但也不想两年后车漆惨不忍睹。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['洗车','漆面养护'], 'active', '2026-04-04 15:12:00-04', '2026-04-04 15:12:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000071', 'd0000000-0000-0000-0004-000000000031', 'a1000000-0000-0000-0000-000000000033', E'实话实说:接触式自动洗车(有刷子/布条的)长期用确实会累积细划痕,原理很简单,布条上带着上一台车的沙粒。黑色深色车看得最明显,太阳底下一圈圈太阳纹。touchless(纯高压水加药水)不碰漆面,但洗不掉顽固污渍,药水也偏猛。我的排序:自己两桶法手洗 > touchless > 软布接触式。你是通勤族不追求完美的话,月卡的接触式其实也能接受,两三年后想救回来做个抛光就行,看你怎么权衡时间和漆面。', '2026-04-04 19:38:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000072', 'd0000000-0000-0000-0004-000000000031', 'a1000000-0000-0000-0000-000000000034', E'我是白车+月卡用户,两年了肉眼没觉得有什么问题,白色浅色是真的抗造。要是黑车我就不敢这么造了。补一句:自动洗车最后那个吹干经常吹不净,备条超细纤维毛巾自己擦一下,不然水印也难看。', '2026-04-05 10:26:00-07')
ON CONFLICT (id) DO NOTHING;

-- P32 discussion: 停车场剐蹭逃逸
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000032', 'a1000000-0000-0000-0000-000000000001', 'discussion', '超市停车场被剐,对方跑了,还有救吗?', E'刚在超市买个菜出来,发现后保险杠被剐了一大道,白色车漆蹭得明明白白,对方连个条都没留就跑了。气死。目测修一下要几百上千。想问:1. 这种情况报警有用吗?2. 超市监控能要到吗?3. 找不到人的话走自己保险,保费会涨吗?deductible是500,到底值不值得走?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['剐蹭','保险理赔'], 'active', '2026-04-11 19:48:00-07', '2026-04-11 19:48:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000073', 'd0000000-0000-0000-0004-000000000032', 'a0000000-0000-0000-0000-000000000003', E'流程走一遍:先拍照(伤痕、车位、周围环境),然后进超市找客服要监控,直接说涉及hit and run要报警,有的店配合有的店只给警察看,所以最好当场打非紧急报警电话备个案,拿个report number。找到对方就走对方保险,一分不用出。找不到的话:你这种情况先问body shop现金价,几百刀的剐蹭往往低于或刚过deductible,走保险不划算;上千的话再考虑走collision。', '2026-04-12 09:14:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000074', 'd0000000-0000-0000-0004-000000000032', 'a1000000-0000-0000-0000-000000000029', E'监控要抓紧,很多超市录像只保留一两周,拖久了就没了。我上次在圣地亚哥被剐就是靠监控拍到车牌,警察联系到对方,最后对方保险全赔,一定要试。', '2026-04-12 13:37:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000075', 'd0000000-0000-0000-0004-000000000032', 'a0000000-0000-0000-0000-000000000008', E'关于保费:走collision理赔哪怕不是你的责任(对方逃逸找不到人),很多保险公司也会记为not-at-fault claim,理论上不该涨价,但会影响你的claim-free折扣,续保时可能变相涨一点。所以小伤真心建议现金修或者干脆留着,保险留给大事故用。另外看看你的保单有没有uninsured motorist property damage,有些州这个可以覆盖逃逸事故且免赔额更低。', '2026-04-12 16:05:00-07')
ON CONFLICT (id) DO NOTHING;

-- P33 discussion: 保险涨价
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000033', 'a1000000-0000-0000-0000-000000000029', 'discussion', '无事故无罚单,续保居然涨30%,正常吗?', E'收到续保通知差点没看懂:我过去一年零事故零罚单零理赔,半年保费从890涨到1150,快30%了。打电话问,客服就说"整体费率调整"。这正常吗?是不是被区别对待了?大家最近续保都什么行情?换保险公司会不会有坑,比如新公司先低价钓鱼第二年再涨回来?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保险','省钱'], 'active', '2026-04-13 12:19:00-07', '2026-04-13 12:19:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000076', 'd0000000-0000-0000-0004-000000000033', 'a0000000-0000-0000-0000-000000000005', E'不是针对你,这两年全行业都在涨:修车工时费、配件、医疗赔付全涨,加州和一些州还有积压的费率调整获批落地。但"大家都涨"不等于你只能认:每次续保前花一小时找两三家询价,或者找独立broker一次比十家,这是唯一有效的办法。我去年就这么从涨价的那家换走,同样保额省了400多。钓鱼定价确实存在,所以换过去第二年续保时记得再比一次,把比价变成年度例行公事。', '2026-04-13 17:42:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000077', 'd0000000-0000-0000-0004-000000000033', 'a1000000-0000-0000-0000-000000000030', E'换之前先在现有保单上抠一遍:deductible从500提到1000能降不少;年里程报低了没有(疫情后很多人还按通勤报);bundle租房险;有些公司装个驾驶习惯监测app再打折。几个加起来有时候比换家还多。', '2026-04-14 09:08:00-07')
ON CONFLICT (id) DO NOTHING;

-- P34 discussion: 二手EV电池 (image)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000034', 'a1000000-0000-0000-0000-000000000022', 'discussion', '想收二手Ioniq 5,电池健康度怎么查?', E'芝加哥油价看着闹心,动了买二手电车的念头,看中一台2022的Ioniq 5(图是同款),车主说电池"完全没问题"。但电车最值钱的就是电池,口说无凭。想问懂电车的:私人交易怎么实际验证电池健康度?有没有类似油车PPI那种检测?另外芝加哥冬天冷,对电池寿命影响大吗?', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Hyundai_Ioniq_5_IAA_2021_1X7A0189.jpg/960px-Hyundai_Ioniq_5_IAA_2021_1X7A0189.jpg'], NULL, NULL, NULL, ARRAY['EV','二手车','电池'], 'active', '2026-04-14 09:57:00-05', '2026-04-14 09:57:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000078', 'd0000000-0000-0000-0004-000000000034', 'a0000000-0000-0000-0000-000000000003', E'最直观的土办法:让车主充到100%,看表显满电续航跟EPA标称(SEL/Limited AWD大约256-266英里,看配置)差多少,差距在一成以内算健康。再借个OBD2蓝牙头配app读SOH(State of Health)和电池温度、单体电压差,几十刀的设备,数据比嘴可信。试驾时看掉电速度是否跟里程匹配。', '2026-04-14 13:26:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000079', 'd0000000-0000-0000-0004-000000000034', 'a1000000-0000-0000-0000-000000000005', E'还可以买份第三方电池报告(Recurrent之类),几十刀出个健康评分和同龄车对比。重点提醒:现代的电池质保是10年10万英里,但转手后条款会变(一般缩短),买前让dealer或客服确认这台车过户后还剩多少质保,这直接影响价格底气。', '2026-04-15 08:19:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000080', 'd0000000-0000-0000-0004-000000000034', 'a0000000-0000-0000-0000-000000000008', E'冷的问题:低温会让当天续航明显缩水(冬天打七折很正常),但对电池长期寿命反而比高温友好,芝加哥车不用怕这个,倒是问清楚车主平时是不是天天快充,长期只用快充的电池衰减会快一些。充电习惯好的一手车主车,值得多出点钱。', '2026-04-15 11:47:00-07')
ON CONFLICT (id) DO NOTHING;

-- P35 discussion: 家充安装 (image)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000035', 'a1000000-0000-0000-0000-000000000025', 'discussion', '提了Ioniq 5,家里装充电桩要花多少钱?', E'上个月提的Ioniq 5(图),目前一直蹭公司和超市的充电桩,太不方便了。想在车库装个L2家充。问了一个电工朋友说"看情况,500到3000都有可能",这范围也太大了吧。想问装过的朋友:到底哪些因素决定价格?挂墙充电桩买哪种?凤凰城这边电力公司好像还有补贴?', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Hyundai_Ioniq_5_N_Line_IMG_3869.jpg/960px-Hyundai_Ioniq_5_N_Line_IMG_3869.jpg'], NULL, NULL, NULL, ARRAY['EV','家充'], 'active', '2026-04-18 10:41:00-07', '2026-04-18 10:41:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000081', 'd0000000-0000-0000-0004-000000000035', 'a1000000-0000-0000-0000-000000000031', E'价格差主要在两点:电箱到车库的距离(走线越长越贵)和电箱有没有空余容量。顺利的情况:电箱就在车库、有空位,拉一路50安培线装个NEMA 14-50插座,400-800刀搞定;充电桩本体300-600刀买个大牌的(能连app、UL认证)。不顺的情况:电箱满了要升级200安培服务,那就是2000+起。先找两三个电工出免费quote,顺便查下联邦有30%的充电设备税收抵免(有上限),你们当地电力公司SRP/APS也有过rebate,叠起来能省不少。', '2026-04-18 14:23:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000082', 'd0000000-0000-0000-0004-000000000035', 'a1000000-0000-0000-0000-000000000006', E'省钱小径:如果每天通勤不到五六十英里,其实装个普通插座用随车的充电器慢充都够回血,不一定非上48安的豪华桩。我第一年就是14-50插座加移动充电器过来的,后来才升级。另外记得问电力公司有没有EV电价套餐,夜里充电便宜一半。', '2026-04-19 09:36:00-07')
ON CONFLICT (id) DO NOTHING;

-- P36 discussion: 公寓无桩买EV (image)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000036', 'a1000000-0000-0000-0000-000000000032', 'discussion', '住公寓没充电桩,买电车现实吗?', E'很喜欢Mach-E,看中一台二手的(图),但我住帕萨迪纳的老公寓,车位就是个露天stall,物业说"暂无安装充电桩计划"。通勤单程18英里,周末偶尔跑LA。就靠公共充电桩过日子现实吗?会不会买了之后天天为充电焦虑?有没有同样公寓党开电车的说说真实体验?', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Ford_Mustang_Mach-E_Leonberg_2022_1X7A0434.jpg/960px-Ford_Mustang_Mach-E_Leonberg_2022_1X7A0434.jpg'], NULL, NULL, NULL, ARRAY['EV','公寓充电'], 'active', '2026-04-19 21:14:00-07', '2026-04-19 21:14:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000083', 'd0000000-0000-0000-0004-000000000036', 'a0000000-0000-0000-0000-000000000003', E'算笔账你就有答案:单程18英里,一周通勤加杂七杂八约250英里,Mach-E满电跑250-300,也就是说一周快充一次就够。如果你公司有充电桩或者常去的超市有,连这一次都省了。我有个同事就是这么过的,固定周日晚上充电顺便买菜,45分钟80%,他说习惯之后跟去加油站没区别。焦虑主要来自"随时想满电"的油车思维,改成"一周一充"的节奏就好了。', '2026-04-20 08:28:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000084', 'd0000000-0000-0000-0004-000000000036', 'a1000000-0000-0000-0000-000000000002', E'加州租客别放弃装桩:加州有Right to Charge法律,房东不能无理由拒绝租客自费安装充电设备(要走流程、买保险、恢复原状)。你可以给物业发个正式邮件引用一下,很多物业只是懒,推一推就动了。哪怕装个普通110V插座慢充,露天车位每晚回血40英里,你的通勤都覆盖了。', '2026-04-20 12:52:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000085', 'd0000000-0000-0000-0004-000000000036', 'a1000000-0000-0000-0000-000000000038', E'反方意见供参考:我朋友公寓党开了一年电车最后换回混动了,他的点是快充价格不便宜(高峰每度快赶上油钱)加上偶尔排队,省钱幅度没想象的大。如果主要动机是省钱,先算下你常用的快充桩电价;如果就是喜欢电车的驾驶感,那当我没说,冲吧。', '2026-04-21 10:19:00-07')
ON CONFLICT (id) DO NOTHING;

-- P37 discussion: 租车 vs 自驾
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000037', 'a1000000-0000-0000-0000-000000000012', 'discussion', '长周末全家出游,租车还是开自己车?', E'五月底Memorial Day打算全家四口从新泽西开去DC玩三天,单程230英里。老婆提议租个车去,说别把自己车折腾出毛病;我觉得自己的车开着顺手还省租金。租SUV三天大概180加保险,自己车是2019年的CX-5。这种中短途大家一般怎么选?租车的隐藏成本多吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['自驾游','租车'], 'active', '2026-04-02 14:03:00-04', '2026-04-02 14:03:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000086', 'd0000000-0000-0000-0004-000000000037', 'a1000000-0000-0000-0000-000000000013', E'帮你算:来回460英里,自己车按IRS折旧口径满打满算三百刀,实际现金支出就是六七十的油钱加过路费。租车180+保险30+油钱,现金支出300往上,还要花时间取车还车、熟悉车。你的CX-5才2019年,单程230英里就是热身,完全没必要租。租车划算的场景是:自己车太老不放心、要装的人和行李超出、或者去很费车的路况(碎石路、越野)。', '2026-04-02 18:26:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000087', 'd0000000-0000-0000-0004-000000000037', 'a0000000-0000-0000-0000-000000000004', E'再提醒个隐藏成本:节假日租车,机场店和热门点位经常排长队,取车一小时还车半小时,三天行程搭进去半天。自己车出发前查下胎压机油就行。DC停车费倒是要有心理准备,酒店一晚停车四五十刀很正常,选个带免费停车的近郊酒店坐地铁进城更舒服。', '2026-04-03 09:48:00-04')
ON CONFLICT (id) DO NOTHING;

-- P38 discussion: 配钥匙
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000038', 'a1000000-0000-0000-0000-000000000035', 'discussion', '车钥匙丢了dealer要400,有便宜的路子吗?', E'倒霉,丰田的智能钥匙丢在哪儿想不起来了,家里就剩一把。去dealer问,配一把新的加编程要400多刀还要等件。这价格实在下不去手,但就一把钥匙也不敢拖,再丢就得拖车了。法拉盛这边有靠谱的锁匠能做吗?网上买钥匙自己配靠谱不?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['车钥匙','省钱'], 'active', '2026-04-21 16:57:00-04', '2026-04-21 16:57:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000088', 'd0000000-0000-0000-0004-000000000038', 'a0000000-0000-0000-0000-000000000007', E'汽车锁匠(automotive locksmith)是正解,智能钥匙他们有设备现场编程,丰田的一般200-280能拿下,比dealer便宜三四成,当天搞定。注意:约的时候报VIN和年款问清全包价,准备好ID和车辆注册证明车是你的。网上自己买钥匙的坑在于:壳是通用的但芯片频率版本多,买错不退,编程还得找人,省不了多少,不建议小白折腾。趁现在有一把能用的赶紧配,丢完最后一把就是另一个价了。', '2026-04-22 08:33:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000089', 'd0000000-0000-0000-0004-000000000038', 'a0000000-0000-0000-0000-000000000004', E'法拉盛缅街往南那片就有几家做车钥匙的,微信群里口碑都能查到,我去年配的凯美瑞钥匙240全包。对了,配完新钥匙可以让锁匠把丢的那把从车上删掉,防止真被人捡去开车门。', '2026-04-22 14:21:00-04')
ON CONFLICT (id) DO NOTHING;

-- P39 discussion: 三元催化防盗
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000039', 'a1000000-0000-0000-0000-000000000030', 'discussion', '小区连着丢了几个三元催化,怎么防?', E'萨克拉门托我们小区微信群这个月报了三起三元催化被锯,全是Prius和老款SUV,早上一打火像拖拉机才发现。我的车也是榜上有名的车型,天天露天停,慌得很。防盗板、报警器、刻字这些办法哪个真有用?保险这块又是怎么算的?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['防盗','三元催化'], 'active', '2026-04-22 07:46:00-07', '2026-04-22 07:46:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000090', 'd0000000-0000-0000-0004-000000000039', 'a0000000-0000-0000-0000-000000000007', E'按有效性排:1. 物理防盗板/防盗笼最实在,焊或锁在催化器外面,小偷锯起来费时间就会放弃,材料加安装300-500刀,Prius有现成套件;2. 停车位置比什么都重要,能进车库进车库,不能就停路灯下、监控下;3. 倾斜报警器有点用但邻居听多了也麻木;4. 刻VIN喷高温漆主要帮警察追赃,防盗作用一般。保险方面:被偷属于comprehensive范围,没买comp的这就是买的理由。', '2026-04-22 11:29:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000091', 'd0000000-0000-0000-0004-000000000039', 'a0000000-0000-0000-0000-000000000002', E'血泪经历:我那台老Prius两年前被锯过一次,走comp赔的,deductible 250,换完两个月装了防盗板,之后小偷又光顾过一次(底下有新锯痕)但没得手。这钱花得值。另外被锯了别急着开去修,排气直吹底盘线束可能引发二次损伤,拖过去稳妥。', '2026-04-23 09:15:00-07')
ON CONFLICT (id) DO NOTHING;

-- P40 discussion: 车窗被砸
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000040', 'a1000000-0000-0000-0000-000000000028', 'discussion', '车窗被砸包被拿走,300块的玻璃走保险吗?', E'昨晚车停在外面,早上发现后侧窗被砸了,车里一个旧背包被拿走(里面就一件外套,亏他看得上)。玻璃店报价换一块300刀。我的comprehensive deductible是500。这种情况是不是只能自认倒霉自己掏?报警还有必要吗?以后停外面有什么讲究?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['车窗被砸','保险理赔'], 'active', '2026-04-24 23:11:00-07', '2026-04-24 23:11:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000092', 'd0000000-0000-0000-0004-000000000040', 'a0000000-0000-0000-0000-000000000005', E'300低于500的deductible,走保险一分拿不到还留条记录,自己修没跑了。两个省钱点:1. 问保单有没有单独的glass coverage(有些州有些保单玻璃单独免赔或者零免赔,打电话确认下,别想当然);2. 侧窗玻璃找移动玻璃店上门换,比连锁店便宜,二百出头也能做。报警建议线上报个案备着,万一小区连环作案,警察需要数据决定巡逻,几分钟的事。', '2026-04-25 10:37:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000093', 'd0000000-0000-0000-0004-000000000040', 'a1000000-0000-0000-0000-000000000022', E'以后的讲究就一条:车内目视范围什么都别放,连空袋子都不行,砸窗贼不知道包里是外套还是电脑,他只看到"有个包"。芝加哥老铁都是后备箱藏好或者干脆带走,座位上干干净净,贼看一眼就走了。', '2026-04-25 14:54:00-05')
ON CONFLICT (id) DO NOTHING;

-- P41 discussion: 挡风玻璃石子裂纹
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000041', 'a1000000-0000-0000-0000-000000000023', 'discussion', '高速被石子崩了个坑,会不会越裂越大?', E'今天在I-94上被前车带起的石子崩了挡风玻璃,"啪"一声吓我一跳,留下一个指甲盖大的星状小坑,位置在副驾侧偏下。目前没有裂开的迹象。请问:这种小坑会自己扩展成大裂缝吗?是补还是换?补一下多少钱,走保险划算吗?密歇根这边昼夜温差还挺大的。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['挡风玻璃','理赔'], 'active', '2026-04-26 13:28:00-04', '2026-04-26 13:28:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000094', 'd0000000-0000-0000-0004-000000000041', 'a0000000-0000-0000-0000-000000000007', E'尽快补,别拖。星状坑小于25美分硬币、不在驾驶员主视线区、没伤到内层,都可以树脂修补,60-100刀,半小时。你说的昼夜温差正是裂纹扩展的头号推手,再加上过减速带的震动,拖两周小坑变横贯裂缝的见得太多了,到时候就是三五百换玻璃(带摄像头的车还要加校准费)。这几天的过渡措施:贴片透明胶带防尘防水,别用热风猛吹除雾,别走烂路。很多保险对玻璃修补免deductible(公司知道修比换省钱),打电话问一句。', '2026-04-26 16:45:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000095', 'd0000000-0000-0000-0004-000000000041', 'a1000000-0000-0000-0000-000000000026', E'丹佛人对这个太熟了,山区公路撒的碎石每年崩我一两次。经验:修补后的点还是会留个小疤,介意的话可以直接换,但修补的结构强度完全够用。我家两台车都加了玻璃险,这边真的用得上。', '2026-04-27 09:22:00-06')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000096', 'd0000000-0000-0000-0004-000000000041', 'a1000000-0000-0000-0000-000000000012', E'补一个防身技巧:跟渣土车、拉石子的卡车保持距离或者干脆变道超过去,它们车斗掉的石子基本就是玻璃杀手。我换过两块玻璃之后才长的记性。', '2026-04-27 19:36:00-04')
ON CONFLICT (id) DO NOTHING;

-- P42 discussion: 延保值不值
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000042', 'a1000000-0000-0000-0000-000000000038', 'discussion', 'dealer推的3000刀延保,到底要不要买?', E'刚在dealer订了台2019年的RX 350,F&I经理花了半小时推销extended warranty,7年10万英里,报价2980,说"雷克萨斯电子件坏一个就回本"。我知道F&I的东西水分大,但又想着车确实过了原厂保修。这种延保到底值不值?能砍价吗?还是有别的替代方案?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['延保','买车'], 'active', '2026-04-27 11:39:00-07', '2026-04-27 11:39:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000097', 'd0000000-0000-0000-0004-000000000042', 'a0000000-0000-0000-0000-000000000008', E'几个冷知识:1. F&I的延保报价水分极大,2980的东西砍到1800很正常,他们佣金就在里面;2. 看清楚是厂家背书的延保还是第三方的,第三方拒赔纠纷多,合同里exclusionary(列不保的)比named component(列保的)覆盖广得多;3. 延保不是当场必须买,很多在原厂保修到期前都能补购,回家慢慢研究不迟。最重要的:RX 350是可靠性天花板级别的车,统计上你买延保大概率是白送钱。', '2026-04-27 15:16:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000098', 'd0000000-0000-0000-0004-000000000042', 'a0000000-0000-0000-0000-000000000007', E'修车工视角:RX的V6加爱信变速箱,正常保养开到20万迈不动大手术的一抓一把,这车买延保属于给最不需要保险的东西上保险。同样的钱存个"维修基金"户头,大概率到你卖车都花不完。要是你买的是某些欧系涡轮车,我的答案会反过来。', '2026-04-28 09:44:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000099', 'd0000000-0000-0000-0004-000000000042', 'a0000000-0000-0000-0000-000000000001', E'补个实操:如果心里实在过不去这个坎,可以问雷克萨斯官方CPO或者厂家延保的价格对比,官方的贵一点但理赔在任何dealer都认。第三方延保出险时指定修理厂、按"批发工时"报销的条款,坑就在细则里。', '2026-04-28 13:27:00-07')
ON CONFLICT (id) DO NOTHING;

-- P43 discussion: trade-in vs 私卖
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000043', 'a1000000-0000-0000-0000-000000000021', 'discussion', 'trade-in报价比私卖低3000,忍麻烦私卖吗?', E'准备换车,dealer给我的2018 Tacoma trade-in报价21500,但同款同里程私卖行情24500上下,差了3000。私卖的麻烦大家都懂:约看车放鸽子、砍价、过户、还有安全问题。但3000刀也不是小钱。德州这边听说trade-in还能抵税?到底怎么算,差价会不会没有看起来那么大?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['卖车','置换'], 'active', '2026-04-28 17:52:00-05', '2026-04-28 17:52:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000100', 'd0000000-0000-0000-0004-000000000043', 'a0000000-0000-0000-0000-000000000008', E'德州的账要这么算:trade-in可以从新车计税价里扣掉,德州销售税6.25%,21500的trade-in帮你省21500x6.25%=1344的税。所以真实差价是3000-1344=1656,不是3000。1656买"当天搞定、零风险、不用接待陌生人",值不值就看你的时间和精力了。中间方案:把车开去CarMax/Carvana拿个书面报价,经常比dealer trade-in高几百到一千,再拿这个报价回去逼dealer加价,两头受益。', '2026-04-29 09:10:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000101', 'd0000000-0000-0000-0004-000000000043', 'a1000000-0000-0000-0000-000000000019', E'Tacoma私卖其实是最好卖的车之一,达拉斯这边挂出去基本一周内出,而且买家都懂行不太墨迹。要是换台冷门车我就劝你trade-in了,皮卡的话那1656挣得不算辛苦。见面交易约在警察局停车场,只收本票或当面Zelle到账确认。', '2026-04-29 12:38:00-05')
ON CONFLICT (id) DO NOTHING;

-- P44 discussion: 新手第一辆车预算
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000044', 'a1000000-0000-0000-0000-000000000013', 'discussion', '学弟预算1万5第一辆车,怎么分配最合理?', E'帮一个刚来的学弟问:手里1万5,在波士顿读书,想买第一辆车。他的想法是全花在车价上,买台尽量新的。我劝他留点余量但说不出个数。大家觉得1万5预算怎么拆?车价、税费保险、维修备用金各留多少?留学生第一年保险是不是特别贵?有没有推荐的车型思路?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['新手买车','留学生'], 'active', '2026-04-28 20:26:00-04', '2026-04-28 20:26:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000102', 'd0000000-0000-0000-0004-000000000044', 'a0000000-0000-0000-0000-000000000008', E'我的标准拆法:车价上限12000(挂牌价11000左右留砍价),销售税+过户+第一年注册约800-1000(麻州6.25%),首月保险留出300-500,维修备用金1500(第一辆二手车头三个月冒出点小毛病太正常)。千万别顶格花,新手把预算全押车价,买完连换轮胎的钱都没有的案例我见太多了。', '2026-04-29 10:05:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000103', 'd0000000-0000-0000-0004-000000000044', 'a0000000-0000-0000-0000-000000000001', E'车型思路:12000在现在的行情能摸到9-11年的卡罗拉/Civic/马自达3,里程6-9万那种,闭眼买不了大亏。避开同价位的欧系(养不起)和过于老的豪华品牌(修一次哭一次)。买之前一定先询保险价——留学生无美国驾驶记录,同一台车不同保险公司报价能差一倍,Civic这类车保险还偏贵,别车买完了才发现保险一年三千。', '2026-04-29 14:12:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000104', 'd0000000-0000-0000-0004-000000000044', 'a1000000-0000-0000-0000-000000000010', E'波士顿特供建议:那边冬天撒盐凶,看车必看底盘锈蚀,南方来的车加分。还有市区停车位金贵,小车比SUV好过日子。让学弟加个当地华人车友群,看车时叫个懂车的老留一起去,比什么攻略都管用。', '2026-04-30 09:31:00-04')
ON CONFLICT (id) DO NOTHING;

-- P45 discussion: 坡道P挡异响
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000045', 'a1000000-0000-0000-0000-000000000008', 'discussion', '坡道停车再启动,挂挡时咯噔一声正常吗?', E'波特兰家门口是个斜坡,每天停那儿。发现一个现象:坡上停一夜,早上从P挡挂出来的瞬间会"咯噔"一声,还有点顿挫感,平地停车就没有。车是自动挡的CX-30。这声音正常吗?会不会伤变速箱?网上说什么先拉手刹再挂P,原理是什么?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['自动挡','用车习惯'], 'active', '2026-04-29 08:19:00-07', '2026-04-29 08:19:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000105', 'd0000000-0000-0000-0004-000000000045', 'a0000000-0000-0000-0000-000000000007', E'这声是parking pawl(驻车棘爪)在受力状态下弹开的声音。你直接挂P松脚刹,整台车的重量顺着坡压在变速箱里那个小钢爪上,第二天挂出来自然咯噔一下。偶尔没事,天天如此棘爪和齿会加速磨损。正确顺序记住"坡道三步":踩住脚刹-拉手刹-松一点脚刹让车沉在手刹上-再挂P。这样重量由手刹承担,棘爪只是保险,挂出来轻轻松松没声音。平地无所谓,坡道务必养成习惯。', '2026-04-29 12:47:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000106', 'd0000000-0000-0000-0004-000000000045', 'a1000000-0000-0000-0000-000000000003', E'学到了,我在圣盖博山脚住的时候天天咯噔,一直以为是通病没当回事。补充下电子手刹的车也一样适用,有auto hold的先让auto hold接住再挂P也行。', '2026-04-30 10:14:00-07')
ON CONFLICT (id) DO NOTHING;

-- P46 discussion: 空调不冷
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000046', 'a0000000-0000-0000-0000-000000000005', 'discussion', '达拉斯已经30度,空调不太冷,加氟就行?', E'才四月底达拉斯就30度了,今年夏天怕是要命。我的车空调感觉不如去年冷,出风是凉的但压不住太阳晒,中午车里还是闷热。朋友说"加点氟就行,快修店60刀"。是这么简单吗?还是可能有别的问题?怕遇到那种只会推销加氟套餐的店。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['空调','夏季用车'], 'active', '2026-04-30 13:05:00-05', '2026-04-30 13:05:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000107', 'd0000000-0000-0000-0004-000000000046', 'a0000000-0000-0000-0000-000000000007', E'先别急着加氟,按成本从低到高排查:1. 空调滤芯堵了风量小,十几刀自己换;2. 冷凝器(水箱前那层)糊满飞虫柳絮,水枪轻轻冲干净,制冷立竿见影,这两项解决一大半"不够冷";3. 都正常再测压力,真缺氟要明白一点——空调是密闭系统,缺氟必有漏点,光加氟几个月又漏光,正规做法是打荧光剂找漏、修漏再定量加注。那种不查漏直接"60刀加氟"的店,赚的就是你反复来的钱。', '2026-04-30 16:38:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000108', 'd0000000-0000-0000-0004-000000000046', 'a1000000-0000-0000-0000-000000000020', E'休斯顿人补充实用招:前挡放遮阳板、贴合规隔热膜、上车先开窗开风扇排两分钟热气再关窗开AC,车内温度起点低十度,空调压力小很多。德州夏天这些土办法比多加半磅氟管用。', '2026-04-30 19:57:00-05')
ON CONFLICT (id) DO NOTHING;

-- P47 review: 2021 Sienna
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000047', 'a0000000-0000-0000-0000-000000000001', 'review', '2021塞纳车主:春假一趟犹他,彻底服了', E'2021 Sienna XLE混动,两年半车主,刚跑完春假犹他环线回来,2100英里,聊聊真实感受。\n\n油耗:全程满载(两大两小加行李塞满),山路高速混着跑,表显35.8 MPG,一台八座MPV跑出这个数,加油时心情是愉悦的。市区日常36-38没压力。\n\n空间:第二排挪到最后,四岁的娃在安全座椅上能伸直腿踢不到前排,后备箱塞下四个行李箱加露营装备。休息区放倒座椅给娃换衣服午睡,MPV的尊严就在这里。\n\n缺点也说:1. 混动系统高速超车嗓门大,地板油时像台缝纫机在嘶吼;2. 第三排放倒是手动的,腰不好的慎重;3. 车机反应一般,好在有CarPlay。\n\n两年半唯一的维修是保养和一次12V电瓶,可靠性没让人操过心。家里人多想省油的,这车闭眼推,就是二手价还是坚挺得让人牙痒。', ARRAY[]::text[], 'Toyota', 'Sienna', 2021, ARRAY['MPV','家庭用车','自驾游'], 'active', '2026-04-12 10:33:00-07', '2026-04-12 10:33:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000109', 'd0000000-0000-0000-0004-000000000047', 'a1000000-0000-0000-0000-000000000004', E'王哥这篇来得太及时,我们家正在塞纳和Odyssey之间纠结。请问二排座椅不能拆这点,买大件家具的时候难受吗?', '2026-04-12 15:20:00-07')
ON CONFLICT (id) DO NOTHING;

-- P48 review: 2019 Lexus ES 300h
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000048', 'a1000000-0000-0000-0000-000000000009', 'review', 'ES 300h三年通勤报告:无聊,但无敌', E'2019 ES 300h,三年前4.2万迈时二手入的,现在9.6万迈,曼哈顿通勤加周末长岛跑,说说这台"无聊神车"。\n\n油耗:混动系统市区堵车43-45 MPG,高速42上下,加一箱油能从纽约开到波士顿打个来回。对比我之前的328i,油钱直接砍半。\n\n舒适:座椅是那种坐进去叹口气的软,隔音在FDR坑洼路面上依然稳得住。后排空间接近标轴5系,爸妈来了坐着不委屈。\n\n维修:三年账单念给你听——机油保养、一套轮胎、一次刹车片、一个后视镜马达(被快递车碰的)。混动电池毫无衰减迹象,这套THS系统是丰田拿命调的。\n\n缺点:开起来毫无欲望,方向盘后面是一台家电;车机那个触摸板是人机工程学灾难,好在CarPlay救场。\n\n结论:如果你要的是A点到B点的极致省心加体面,ES 300h是二手30万人民币以内我能想到的最优解。想要驾驶乐趣的绕道,这车的乐趣在加油站和修车账单上。', ARRAY[]::text[], 'Lexus', 'ES', 2019, ARRAY['混动','通勤'], 'active', '2026-04-07 21:48:00-04', '2026-04-07 21:48:00-04')
ON CONFLICT (id) DO NOTHING;

-- P49 review: 2022 Model Y (image)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000049', 'a1000000-0000-0000-0000-000000000039', 'review', 'Model Y两年4.6万迈:电池衰减实测数据', E'2022 Model Y长续航,两年整4.6万迈,贝尔维尤通勤加每年两次加州往返,给关心电池的朋友上点真实数据。\n\n电池:新车满电表显330英里,现在满电306,衰减约7%,头一年掉得快(4%),第二年明显放缓。充电习惯:家充为主日常充到80%,长途才用超充,超充占比大概两成。\n\n冬天:西雅图这种0-10度的冬天,实际续航打75-8折,预热做好点能好些。别信网上"续航腰斩"的极端案例,那是中西部零下二十度的剧本。\n\n花费:两年电费(家充夜间电价)约1400刀,同里程油车油钱至少4500。保养就换了雨刮和轮胎调位,刹车因为动能回收几乎无磨损。\n\n坑也有:悬挂偏硬,西雅图烂路上后排乘客有意见;车漆软,前杠石子小坑无数;保险比同价油车贵两成。\n\n总体:通勤机器属性拉满,二手价这两年跌得凶,反而现在是收二手的好时机,买前记得按我上面的方法看满电表显。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/%D0%90%D0%BB%D0%BC%D0%B0%D1%82%D1%8B%2C_Tesla_Model_Y_%D0%BD%D0%B0_%D0%9A%D0%B0%D1%80%D0%B8%D0%BC%D0%BE%D0%B2%D0%B0.jpg/960px-%D0%90%D0%BB%D0%BC%D0%B0%D1%82%D1%8B%2C_Tesla_Model_Y_%D0%BD%D0%B0_%D0%9A%D0%B0%D1%80%D0%B8%D0%BC%D0%BE%D0%B2%D0%B0.jpg'], 'Tesla', 'Model Y', 2022, ARRAY['EV','电池','用车成本'], 'active', '2026-04-09 19:26:00-07', '2026-04-09 19:26:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000110', 'd0000000-0000-0000-0004-000000000049', 'a0000000-0000-0000-0000-000000000003', E'数据帖点赞,和我的3衰减曲线基本一致,头年掉得快后面走平是常态。补充一句给看二手的:同年份的车,家充为主的和天天超充的,电池状态可能差出好几个点,买前多问一句充电习惯。', '2026-04-10 09:12:00-07')
ON CONFLICT (id) DO NOTHING;

-- P50 review: 2021 Mach-E (image)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000050', 'a1000000-0000-0000-0000-000000000024', 'review', '中西部开Mach-E一年:优缺点都很福特', E'2021 Mach-E Premium AWD,去年二手价大跳水的时候接盘的,一年2万迈,哥伦布市区加周末跑辛辛那提,交个作业。\n\n先说好的:开起来是真活泼,AWD双电机推背随叫随到,底盘比特斯拉厚道,烂路从容;外形停车场回头率高,常被问"这是野马?";座椅宽大,美式沙发的舒服。\n\n再说很福特的部分:车机SYNC偶尔卡成PPT,重启大法用过三次;门把手那个按钮式设计冬天冻住过;实际续航比表显乐观,尤其上高速,规划长途我按标称八折算。\n\n充电:俄亥俄公共桩密度一般,家充是刚需,我装了个48安的,每晚满血。用上特斯拉超充转接头之后,长途焦虑小多了。\n\n一年花费:电费700出头,保养就是换胎调位和玻璃水。跟同事的Explorer比,一年省下的油钱够我们全家下十几次馆子。\n\n总结:二手Mach-E现在的价格是真香,能接受福特式小毛病、家里能装充电桩的,值得认真考虑。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Ford_Mustang_Mach-E_Leonberg_2022_1X7A0434.jpg/960px-Ford_Mustang_Mach-E_Leonberg_2022_1X7A0434.jpg'], 'Ford', 'Mustang Mach-E', 2021, ARRAY['EV','车主体验'], 'active', '2026-04-15 12:37:00-04', '2026-04-15 12:37:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000111', 'd0000000-0000-0000-0004-000000000050', 'a1000000-0000-0000-0000-000000000023', E'"优缺点都很福特"太精辟了哈哈。密歇根这边好多福特员工家属开这车,评价出奇一致:底盘好、车机随缘。请问冬天实际续航掉多少?我们这比俄亥俄还冷点。', '2026-04-15 18:24:00-04')
ON CONFLICT (id) DO NOTHING;

-- P51 review: 2022 Ioniq 5 春假自驾
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000051', 'a1000000-0000-0000-0000-000000000007', 'review', '开Ioniq 5跑了趟春假环线,充电才是主角', E'2022 Ioniq 5 AWD,春假从西雅图出发,波特兰-胡德山-哥伦比亚河谷绕一圈,全程1180英里,分享下电车长途的真实体验。\n\n充电体验是这车的王牌:800V平台在350kW桩上从18%到80%只用了19分钟,买杯咖啡上个厕所的功夫。全程充电5次,总共停留约100分钟,规划得当的话跟油车吃饭休息的节奏基本重合。\n\n续航:满电标称256,春天气温十来度,高速70迈实际能跑220左右,山路爬坡掉得肉眼可见,但下坡动能回收又能捞回来一截,哥伦比亚河谷那段下坡白赚20英里,好玩。\n\n路线经验:I-84沿线快充桩够用,但支线进山前一定看好电量,胡德山周边桩少,我留了40%余量进山,出来剩12%,不算惊险但也不敢大意。用ABRP(A Better Routeplanner)规划比车机自带的靠谱。\n\n住宿选带L2桩的旅馆,一晚回满,第二天满血出发,这是电车自驾最爽的部分——早上"油箱"永远是满的。\n\n结论:800V平台的车跑长途,焦虑基本可以退场了,前提是肯花十分钟做功课。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Hyundai_Ioniq_5_IAA_2021_1X7A0189.jpg/960px-Hyundai_Ioniq_5_IAA_2021_1X7A0189.jpg'], 'Hyundai', 'Ioniq 5', 2022, ARRAY['EV','自驾游','充电'], 'active', '2026-04-20 20:53:00-07', '2026-04-20 20:53:00-07')
ON CONFLICT (id) DO NOTHING;

-- P52 review: 2018 CR-V 十万迈
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000052', 'a1000000-0000-0000-0000-000000000010', 'review', 'CR-V十万迈成绩单:账本全公开', E'2018 CR-V EX,新车买的,上周表跳过100000迈,把八年账本翻出来给大家参考,买菜车到底养着花多少钱。\n\n维修保养总账(不含油钱保险):机油保养八年约1600;轮胎换过两套2100;刹车前后各换过一次900;电瓶两个380;火花塞、各种滤芯、雨刮零零碎碎600;唯一一次非常规维修是空调压缩机离合器,出保后修的,650。八年总计约6200,平均一年775。\n\n1.5T机油增多的老问题:我这台早期批次确实中过招,冬天短途机油尺会涨,4S按召回刷了程序后明显好转,后来我养成每月看机油尺的习惯,再没超过上限。这是这代CR-V绕不开的话题,买二手的记得查这项召回做没做。\n\n现状:十万迈的车,发动机变速箱状态正常,内饰塑料件有点异响,座椅侧翼磨得发亮,别的没了。\n\n感想:布鲁克林这种停车环境+纽约的路,能坚持八年只出一次非常规维修,我对它没什么可挑的。计划再开五万迈换电车。', ARRAY[]::text[], 'Honda', 'CR-V', 2018, ARRAY['SUV','用车成本','十万迈'], 'active', '2026-04-10 14:16:00-04', '2026-04-10 14:16:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000112', 'd0000000-0000-0000-0004-000000000052', 'a1000000-0000-0000-0000-000000000035', E'这种账本帖最有价值,比什么评测都实在。一年775的养车成本,难怪街上十台里三台是CR-V。机油增多那段尤其提醒到位,我表弟正看二手CR-V,转给他了。', '2026-04-11 09:38:00-04')
ON CONFLICT (id) DO NOTHING;

-- P53 review: 2020 CX-5
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000053', 'a1000000-0000-0000-0000-000000000004', 'review', '女生视角聊CX-5:被低估的选择', E'2020 CX-5 Grand Touring,开了快三年,当初在RAV4、CR-V、CX-5里选了销量最低的它,现在依然觉得选对了,说说女生在意的几个点。\n\n开着好看也坐着好看:魂动红的漆面在加州太阳下是流动的,内饰在20万日系SUV里质感第一档,没有大黑塑料的廉价感。朋友第一次坐都会问"这车挺贵吧",其实二手比RAV4还便宜。\n\n开起来稳:方向盘是有沟通感的,过弯车身稳稳贴地,尔湾到圣地亚哥的5号一路稳稳当当,不像有些SUV飘飘的让人紧张。\n\n实用性扣分项照实说:后排和后备箱确实比RAV4小一圈,放婴儿车加采购就满了;油耗中规中矩,市区25左右,比混动对手费油;车机屏幕小,旋钮操作要适应几天。\n\n三年可靠性:零故障,保养便宜,马自达的机械素质对得起口碑。\n\n适合谁:一两口之家、注重颜值和驾驶质感、不拉大件的,CX-5是同价位的宝藏;家里俩娃以上的还是看塞纳CR-V去吧。', ARRAY[]::text[], 'Mazda', 'CX-5', 2020, ARRAY['SUV','女生用车'], 'active', '2026-04-23 09:29:00-07', '2026-04-23 09:29:00-07')
ON CONFLICT (id) DO NOTHING;

-- P54 review: 2023 Camry Hybrid (image)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000054', 'a1000000-0000-0000-0000-000000000020', 'review', '凯美瑞混动真实油耗:一箱油跑出680英里', E'2023 Camry Hybrid LE,一年车主,坐标休斯顿,这帖就聊一件事:油耗,因为这是我买它的全部理由。\n\n数据:一年2.3万迈,加油app全程记账,实际平均51.2 MPG(表显52.8,略虚)。最好一箱:纯市区通勤温和驾驶,680英里才亮灯(图是我的仪表盘)。最差一箱:圣诞去奥斯汀,85迈狂奔加满载,也有44。\n\n对比:之前那台2.5L的老款凯美瑞同样路线32 MPG,一年油钱差出900多刀,混动版差价三年回本,后面全是赚的。\n\n德州特色体验:夏天怠速开空调,发动机停机电池带空调,油耗几乎不动,停车场等人一小时心不疼;冬天基本不影响,毕竟休斯顿的冬天是假的。\n\n其他简单说:动力够用不多,底盘舒适取向,后排大,车机普通。就是一台把"经济实用"四个字焊死在引擎盖上的车。\n\n给蹲混动的朋友:凯美瑞混动二手溢价不小,但按我的油耗账,通勤里程大的人这溢价值得付。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/PIMS_2024_-_All-New_Toyota_Camry_HEV_%28dashboard%29.jpg/960px-PIMS_2024_-_All-New_Toyota_Camry_HEV_%28dashboard%29.jpg'], 'Toyota', 'Camry', 2023, ARRAY['混动','油耗'], 'active', '2026-04-16 15:44:00-05', '2026-04-16 15:44:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000113', 'd0000000-0000-0000-0004-000000000054', 'a1000000-0000-0000-0000-000000000021', E'680英里一箱是真离谱,奥斯汀到休斯顿来回三趟不用加油。请问一年2.3万迈的话,你这个通勤强度混动电池有没有听说要担心的?', '2026-04-17 10:26:00-05')
ON CONFLICT (id) DO NOTHING;

-- P55 guide: 搬家卖车全流程
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000055', 'a0000000-0000-0000-0000-000000000008', 'discussion', '毕业搬家卖车全流程攻略,收藏这篇就够', E'又到毕业搬家季,后台好多人问卖车流程,整理一篇发出来。\n\n【时间线】离开前6周:决定卖车还是运车(差价小于运费就运,别白折腾);前4-5周:整理保养记录、洗车拍照挂平台;前2-3周:集中约看车;最后一周:只接受"看了就能定"的买家,同时拿好CarMax/Carvana书面报价保底。\n\n【定价】KBB和Edmunds私卖价取中,再搜本地同款在售价交叉验证,挂价留5-8%砍价空间。低于市场价10%以上只会招来贩子。\n\n【看车】白天、公共场所、带个朋友;试驾查对方驾照拍照,自己坐副驾;只接受本票、现金或当面确认到账的Zelle,个人支票一律拒绝。\n\n【过户三件事】1. title背面按州要求填写签字,买卖双方信息、里程、价格,写错别涂改(很多州涂改作废,要申请新title);2. bill of sale一式两份;3. 最关键也最容易忘的——卖完立刻去DMV(或网上)提交release of liability/转让通知,不然对方吃罚单出事故都可能找上你。\n\n【收尾】通知保险取消或转移、拆掉收费站transponder、注销停车月卡。\n\n祝各位毕业生顺利出车,新旅程顺利。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['卖车','攻略','毕业季'], 'active', '2026-04-13 11:07:00-07', '2026-04-13 11:07:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000114', 'd0000000-0000-0000-0004-000000000055', 'a0000000-0000-0000-0000-000000000002', E'酱姐这篇存了!正好我五月毕业要卖车,release of liability这条真不知道,差点就埋雷了。请问加州这个是不是DMV网上五分钟就能填?', '2026-04-13 16:33:00-07')
ON CONFLICT (id) DO NOTHING;

-- P56 guide: Tony 春季保养
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000056', 'a0000000-0000-0000-0000-000000000007', 'discussion', '修车Tony:开春这六件事,自己十分钟搞定', E'冬天过完,车跟人一样要"换季"。不用去店里花钱,这六件事自己车库里十分钟过一遍:\n\n1. 胎压:气温回升胎压会跟着涨,冬天补过气的现在可能超了,按门框标签调回标准值,顺手看胎纹和胎壁。\n\n2. 雨刮:过完一个冬天胶条基本硬化,喷水试一下,有条纹、跳动就换,雨季前这十几刀别省。\n\n3. 电瓶桩头:掀开盖子看看有没有白绿色结晶,有就拿热水冲掉、钢丝刷清理、涂点凡士林。冬天是电瓶杀手,春天是验伤的时候,三年以上的电瓶顺手测个电压。\n\n4. 空调试机:热天来之前把AC打开跑几分钟,不冷、有异味现在处理,别等第一个热浪来了跟全城人一起排队。\n\n5. 底盘冲洗:在撒盐州过冬的,找个带底盘冲洗的洗车好好冲一次,盐留在底盘上锈起来神不知鬼不觉,南方朋友跳过这条。\n\n6. 机油和冷却液液位:两根尺一个壶,拔出来看一眼的事,很多大修都是从"懒得看一眼"开始的。\n\n有问题评论区问,看到都会回。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保养','攻略','换季'], 'active', '2026-04-04 10:22:00-07', '2026-04-04 10:22:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000115', 'd0000000-0000-0000-0004-000000000056', 'a1000000-0000-0000-0000-000000000034', E'Tony哥每季的清单帖都是白嫖级干货。问一下第3条,我的电瓶四年了,冬天启动都正常,是等它出症状再换还是现在预防性换掉?', '2026-04-04 15:49:00-07')
ON CONFLICT (id) DO NOTHING;

-- P57 guide: Tony 验事故车
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000057', 'a0000000-0000-0000-0000-000000000007', 'discussion', '看二手车只查五个位置,事故车现出原形', E'收车这些年,教大家一套最省时间的事故排查法,看车时按顺序查这五个位置,大事故基本藏不住:\n\n1. 引擎盖内侧螺丝和铰链:原厂螺丝有一层完整漆封,动过扳手必留咬痕。两侧大灯固定螺丝一起看,换过大灯多半有故事。\n\n2. 水箱框架:开盖看水箱上横梁,原厂是机器人焊点(圆形、均匀),粗糙的手工焊、密封胶抹得歪歪扭扭,说明车头挨过大的。\n\n3. 车门框密封胶条掀开看焊点:A/B柱内侧原厂焊点整齐一排,切割修复过的会有打磨痕和不规则焊疤,这是判断"结构性损伤"的关键,也是我最不建议买的一类车。\n\n4. 四门两盖缝隙:蹲下顺光看缝隙宽窄是否均匀,手指摸缝内侧边缘,原厂钝而光滑,钣金切割过的发利。\n\n5. 玻璃生产码:全车玻璃日期应该一致或早于出厂日,某一块明显晚了,问清楚为什么换。\n\n最后:漆膜仪现在几十刀一个,全车测一圈,补漆门板不是大事,但补漆+焊点异常+缝隙不匀三样凑齐,直接走人,市场上永远有下一台车。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['验车','事故车','攻略'], 'active', '2026-04-25 16:31:00-07', '2026-04-25 16:31:00-07')
ON CONFLICT (id) DO NOTHING;

-- P58 guide: 机场停车攻略
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000058', 'a0000000-0000-0000-0000-000000000008', 'discussion', '暑假回国前必读:机场长期停车省钱指南', E'马上到回国高峰,每年都有人停两周机场官方停车场花掉四五百,这篇帮你把这笔钱打下来。\n\n【三类选择】官方经济场:最贵但最省心,好处是不用等shuttle很久,适合3天内短停;机场周边私营场:长停主力,提前官网预订一天8-15刀,比walk-in便宜一半,选带fence和摄像头的,室内/带棚位加几刀在鸟多树多的机场很值;酒店Park&Fly套餐:住一晚送7-14天停车,红眼航班或早班机绝配,算下来经常比单订停车还便宜。\n\n【比价姿势】搜机场代码+parking的比价网站一次看全,再去停车场官网比一次(常有官网独享折扣码),用运通或某些信用卡订还有额外返现。\n\n【停前五件事】1. 拍视频绕车一周留证;2. 车内清空目视范围;3. 留燃油/电量够回程(冬天尤其);4. 拍下停车位置编号;5. 钥匙别放车上代客泊车除外。\n\n【回来取车】长停两周以上,上车先看胎压,启动后等一分钟再走。电瓶弱的车停两周有趴窝风险,三年以上电瓶出发前充满电或干脆先换。\n\n各机场具体哪家好,评论区互相接力吧,我先说:LAX选105沿线,SFO选South San Francisco那几家。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['机场停车','攻略','省钱'], 'active', '2026-04-03 09:41:00-07', '2026-04-03 09:41:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000116', 'd0000000-0000-0000-0004-000000000058', 'a1000000-0000-0000-0000-000000000002', E'接力LAX:Century大道沿线几家连锁的官网订常年10刀上下,shuttle高峰十分钟一班。补充个教训:promo code订的单子改航班不退,买贵一两刀那种可免费取消的更稳。', '2026-04-03 13:28:00-07')
ON CONFLICT (id) DO NOTHING;

-- P59 guide: Jason EV自驾优胜美地
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000059', 'a1000000-0000-0000-0000-000000000006', 'discussion', '开电车去优胜美地:充电规划实战笔记', E'春假开我的Mach-E(图)从圣何塞跑了趟优胜美地,回来整理一份电车进国家公园的功课,给打算去的电车车友抄作业。\n\n【总原则】国家公园内充电桩稀少且慢,策略是"进园前充满,园内只放电不指望充"。\n\n【路线实操】圣何塞出发满电,120号进山,Groveland是最后的可靠快充点,补到90%以上再进园。园内Yosemite Valley有几个L2目的地桩,靠抢,当过充上运气,别当刚需。我两天园内跑了约90英里,出园时剩35%,回程Oakdale快充无缝衔接。\n\n【山路心得】上山耗电猛,表显续航别当真,按海拔修正:每爬1000英尺多预留3-5%电;下山动能回收能捞回不少,我下谷底那段回收了8%,所以"进园的电"比"出园的电"要多留。\n\n【几个坑】1. 山里没信号,充电app提前下好离线地图、绑好卡;2. 早晚温差大,清晨出发续航略缩;3. 园内堵车挪车不费电,这点比油车强,怠速焦虑不存在。\n\n【结论】做好功课的话,电车进优胜美地毫无压力,省下的油钱刚好抵门票加一顿Curry Village披萨。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Ford_Mustang_Mach-E_Rally_Auto_Zuerich_2023_1X7A1180.jpg/960px-Ford_Mustang_Mach-E_Rally_Auto_Zuerich_2023_1X7A1180.jpg'], NULL, NULL, NULL, ARRAY['EV','自驾游','国家公园'], 'active', '2026-04-06 19:14:00-07', '2026-04-06 19:14:00-07')
ON CONFLICT (id) DO NOTHING;

-- P60 guide: 砍价话术
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000060', 'a0000000-0000-0000-0000-000000000008', 'discussion', '二手车砍价实战话术,照着说就行', E'总有人说"我脸皮薄不会砍价",其实砍价不靠脸皮靠准备,这篇给你现成剧本。\n\n【开口前的功课】拉同城同款在售列表截图存好;查这台车挂了多久(挂超过30天的卖家心态完全不同);记下车况问题清单,每一条都是筹码。\n\n【对私人卖家】看完车别当场报价,先问"您这价格还有空间吗",让对方先动。然后用事实说话:"轮胎剩3/32要换一套600,前杠这块漆要补300,我很有诚意,x减去这些,xx能不能今天成交?"重点:报价同时给出"今天成交"的确定性,现金和爽快是私卖市场最硬的通货。\n\n【对dealer】只谈out-the-door价,别让他绕月供;报价让他给纸质OTD明细,拿着去问第二家,来回两轮基本见底;加装的膜、防锈、"dealer fee"逐条挑战,很多是可以划掉的。快到月底、车在场上趴了45天以上,是你最大的朋友。\n\n【心态】砍不动就走,留电话说"到这个价随时找我"。我的车有一半是走出门第二天卖家回电话成交的。记住:你不是在求他卖,是在帮他解决库存。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['砍价','买车','攻略'], 'active', '2026-04-29 18:47:00-07', '2026-04-29 18:47:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000117', 'd0000000-0000-0000-0004-000000000060', 'a1000000-0000-0000-0000-000000000014', E'上个月照酱姐之前教的OTD打法买了台CX-30,两家dealer来回问了三轮,最后便宜了1700还免掉一个莫名其妙的处理费。"你是在帮他解决库存"这句是心态解药,分享给各位脸皮薄战友。', '2026-04-30 09:26:00-04')
ON CONFLICT (id) DO NOTHING;

-- P61 review: 2017 Prius C (image)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000061', 'a1000000-0000-0000-0000-000000000034', 'review', '八千刀的Prius C,通勤党的快乐老家', E'2017 Prius C,去年八千多收的,9万迈,天普市到DTLA通勤单程19英里,开满一年来交作业。\n\n油耗:这是它存在的全部意义——一年平均48 MPG,市区堵车反而更省(混动特性),一箱油9加仑左右能跑400+英里,一个月油钱60刀出头。同事的探险者一箱油钱够我加一个月。\n\n小有小的爽:钻小巷、抢车位、路边平行泊车,这个尺寸在圣盖博谷是降维打击,哪里都塞得进。内饰(图)确实塑料感拉满,但你看看价格,要什么自行车。\n\n缺点不藏着:高速70迈以上发动机吼得欢,超车要提前预谋;隔音基本没有;后排坐成年人是酷刑,好在我基本单人通勤。\n\n可靠性:一年就换了机油和一条胎,丰田混动系统9万迈状态稳如老狗,电池买前让店里测过,健康度良好。这代车电池就算真到寿命,副厂翻新电池加安装也就一千五上下,摊到省的油钱里毫无压力。\n\n总结:预算一万以内、纯通勤代步,Prius C是我能找到的性价比之王,丑萌丑萌的,开着开着就顺眼了。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Toyota_Prius_C_Dashboard_Canada.jpg/960px-Toyota_Prius_C_Dashboard_Canada.jpg'], 'Toyota', 'Prius c', 2017, ARRAY['混动','通勤','性价比'], 'active', '2026-04-11 12:58:00-07', '2026-04-11 12:58:00-07')
ON CONFLICT (id) DO NOTHING;

-- P62 review: 2013 Lexus LS 460 (image)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000062', 'a1000000-0000-0000-0000-000000000035', 'review', '两万刀的十年LS460,老旗舰值不值?', E'2013 LS 460,去年两万出头收的,12万迈一手车,法拉盛街坊都问我这老家伙值不值,开满一年答案来了。\n\n值的部分:这套4.6L V8加八速,丝滑得像热刀切黄油,高速上安静到能听见后排丈母娘的呼噜;座椅(图为方向盘,内饰同样水准)是真皮大沙发,长岛来回两小时下车腰不酸;当年17万的做工,门一关"砰"的厚重感,现在40万的新车未必给你。\n\n代价也要摆出来:油耗市区16,高速22,喝的还是93号,一个月油钱是凯美瑞车主的两倍;轮胎刹车这些消耗件全是大尺寸,价格跟着旗舰身份走;air suspension这代是常见衰老点,我买前专门检查过,目前健在,但心里备着两千刀的预算(可以改弹簧降级,但舍不得那口舒适)。\n\n一年实际维修:除保养外换了一套下摆臂胶套,900刀,别的没了,LS的可靠性在大型豪华车里是异类般的存在。\n\n结论:同样两万,你可以买台新款买菜车,也可以买"曾经的百万座驾"。家里有第二台车打底、自己会看车况的,老LS是少数不太坑的老豪华;拿它当唯一用车的三思。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Steering_Wheel_-_2013_Lexus_LS_460_%289864187184%29.jpg/960px-Steering_Wheel_-_2013_Lexus_LS_460_%289864187184%29.jpg'], 'Lexus', 'LS', 2013, ARRAY['豪华车','老车'], 'active', '2026-04-26 21:19:00-04', '2026-04-26 21:19:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000118', 'd0000000-0000-0000-0004-000000000062', 'a0000000-0000-0000-0000-000000000004', E'Frank哥这台我坐过,后排真的是移动客厅,比我坐过的网约车Escalade还舒服。法拉盛老一辈就认这种车,有面儿还不坏,比德系老旗舰省心太多。', '2026-04-27 10:44:00-04')
ON CONFLICT (id) DO NOTHING;

-- P63 guide: Tony 隔热膜
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000063', 'a0000000-0000-0000-0000-000000000007', 'discussion', '夏天前聊聊隔热膜:钱要花在哪一层', E'一到四五月店里贴膜的人排队,但十个人里八个的钱没花对地方,讲清楚几个关键概念:\n\n1. 隔热看的不是颜色深浅。决定隔热的是TSER(总太阳能阻隔率)和红外阻隔率,透明的顶级陶瓷膜隔热吊打深色染色膜。销售拿"深=隔热"忽悠你,直接走人。\n\n2. 膜分三档:染色膜最便宜,几年褪色发紫,基本纯遮隐私;金属膜隔热好但屏蔽信号,ETC、手机、GPS都受影响,现在不建议;陶瓷膜是主流答案,隔热强不挡信号,价格全车500-900看品牌。\n\n3. 钱的分配:太阳的热量一大半从前挡和前侧窗进来,所以预算优先给前挡(合法的透明陶瓷款)和前侧窗,后半车用中档就行,反着配的等于白花。\n\n4. 各州法规差异大,加州前侧窗70%透光,德州25%,亚利桑那33%,贴之前搜自己州的tint law,跨州搬家的老铁尤其注意,合法在A州不等于合法在B州。\n\n5. 施工看细节:好店会把玻璃边缘清干净、膜裁到位不留大白边,贴完两三天内有点雾和小水泡正常,两周不散再回去找他。\n\n预算实在紧的:先只贴前挡,体感差别最大的就是它。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['隔热膜','攻略','夏季用车'], 'active', '2026-04-22 13:52:00-07', '2026-04-22 13:52:00-07')
ON CONFLICT (id) DO NOTHING;

-- P64 showoff: 提车 Model 3
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000064', 'a1000000-0000-0000-0000-000000000001', 'showoff', '人生第一台电车,Model 3提车两周报到', E'纠结了半年,趁四月的优惠上车了二手Model 3,两周开了800英里,每天下班都想绕远路回家。极简内饰(图)从"这也太空了"到"真香"只用了三天,单踏板已经完全适应。湾区通勤加超充生态,目前零焦虑。感谢社区里各位大佬之前解答我的问题,买车功课一半是在这儿做的!', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Tesla_Model_3_interior.jpg/960px-Tesla_Model_3_interior.jpg'], NULL, NULL, NULL, ARRAY['提车','EV'], 'active', '2026-04-05 17:36:00-07', '2026-04-05 17:36:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000119', 'd0000000-0000-0000-0004-000000000064', 'a0000000-0000-0000-0000-000000000003', E'欢迎入坑!记得去设置里把充电上限日常设到80%,还有下雨前把充电口盖检查下有没有杂物,老车主的两句唠叨。', '2026-04-05 20:14:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000120', 'd0000000-0000-0000-0004-000000000064', 'a1000000-0000-0000-0000-000000000005', E'恭喜恭喜,"下班想绕远路回家"这个症状我三年了还没好。库比蒂诺超充见!', '2026-04-06 09:27:00-07')
ON CONFLICT (id) DO NOTHING;

-- P65 showoff: Model 3 白内饰
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000065', 'a1000000-0000-0000-0000-000000000029', 'showoff', '顶住全网劝退,白内饰一年后依然白', E'当初选白内饰,全网都说"三个月变酱油色",一年过去了,晒图证明(图)。秘诀无他:每两周拿婴儿湿巾擦一遍,牛仔裤新买的先单独洗两次再上车。圣地亚哥的阳光下白内饰是真的仙,后悔的人可能只是懒,哈哈。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Tesla_Model_3_Premium_2023_%283%29.jpg/960px-Tesla_Model_3_Premium_2023_%283%29.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Tesla_Model_3_Premium_2023_%284%29.jpg/960px-Tesla_Model_3_Premium_2023_%284%29.jpg'], NULL, NULL, NULL, ARRAY['内饰','EV'], 'active', '2026-04-08 11:23:00-07', '2026-04-08 11:23:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000121', 'd0000000-0000-0000-0004-000000000065', 'a1000000-0000-0000-0000-000000000002', E'白内饰战士敬佩,这份自律我做不到,老老实实黑内饰的路过。婴儿湿巾这招记下了,方向盘上的包浆也能救吗?', '2026-04-08 16:40:00-07')
ON CONFLICT (id) DO NOTHING;

-- P66 showoff: Mach-E Rally
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000066', 'a1000000-0000-0000-0000-000000000006', 'showoff', '洗完车忍不住多拍两张,Rally就是帅', E'周六早上手洗打蜡两小时,阳光一出来这个黄色直接发光(图)。Mach-E Rally的白色轮毂是点睛之笔,脏得也是真快,洗一次车一半时间在抠轮毂。停车场已经被三个陌生人搭讪问车,这钱花得值。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Ford_Mustang_Mach-E_Rally_Auto_Zuerich_2023_1X7A1182.jpg/960px-Ford_Mustang_Mach-E_Rally_Auto_Zuerich_2023_1X7A1182.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Ford_Mustang_Mach-E_Rally_Auto_Zuerich_2023_1X7A1180.jpg/960px-Ford_Mustang_Mach-E_Rally_Auto_Zuerich_2023_1X7A1180.jpg'], NULL, NULL, NULL, ARRAY['洗车','EV'], 'active', '2026-04-12 16:49:00-07', '2026-04-12 16:49:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000122', 'd0000000-0000-0000-0004-000000000066', 'a1000000-0000-0000-0000-000000000024', E'这个配色太提神了,我那台普通版Mach-E看着突然素得像买菜车(它确实是)。白轮毂勇士,雨天路过泥坑的时候你会想起我这条评论。', '2026-04-12 21:15:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000123', 'd0000000-0000-0000-0004-000000000066', 'a1000000-0000-0000-0000-000000000038', E'圣塔克拉拉哪个停车场?感觉我见过这台车,黄得过目不忘哈哈。', '2026-04-13 09:52:00-07')
ON CONFLICT (id) DO NOTHING;

-- P67 showoff: Ioniq 5 N Line
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000067', 'a1000000-0000-0000-0000-000000000021', 'showoff', '像素战士进化版,N Line套件到位', E'我的Ioniq 5换上N Line套件了(图),前脸攻击性直接拉满,像素灯配运动包围,赛博感和复古感居然不打架。奥斯汀的电车浓度越来越高,但这造型还是独一份的辨识度。下一步纠结要不要换轮毂,车友们给点意见。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Hyundai_Ioniq_5_N_Line_IMG_3869.jpg/960px-Hyundai_Ioniq_5_N_Line_IMG_3869.jpg'], NULL, NULL, NULL, ARRAY['改装','EV'], 'active', '2026-04-15 19:31:00-05', '2026-04-15 19:31:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000124', 'd0000000-0000-0000-0004-000000000067', 'a1000000-0000-0000-0000-000000000007', E'这前脸帅的,Ioniq 5是我心中近几年最耐看的设计没有之一。轮毂建议保留原厂风格的封闭式,续航和造型都在线,换太张扬的反而破坏像素风的整体感。', '2026-04-16 09:08:00-07')
ON CONFLICT (id) DO NOTHING;

-- P68 showoff: 车展 Triumph
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000068', 'a1000000-0000-0000-0000-000000000022', 'showoff', '芝加哥春季车展,被一台英国老爷车拿捏', E'周末去逛本地经典车展,新车看得麻木,反而在一台Triumph Spitfire面前站了二十分钟。看看这个驾驶舱(图),木纹方向盘、机械表盘、没有一块屏幕,连空调都没有,但坐进去的欲望比展厅里任何新车都强。跟车主老爷子聊了半小时,人家二十岁买的车养到现在,这才叫爱车。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Triumph_Spitfire_sports_car_cockpit.jpg/960px-Triumph_Spitfire_sports_car_cockpit.jpg'], NULL, NULL, NULL, ARRAY['老爷车','车展'], 'active', '2026-04-19 14:26:00-05', '2026-04-19 14:26:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000125', 'd0000000-0000-0000-0004-000000000068', 'a1000000-0000-0000-0000-000000000035', E'英国老跑车,买的时候一台车,养的时候一个英国零件供应链哈哈。但这内饰是真有味道,现在的车屏幕越做越大,魂越做越少。', '2026-04-19 18:43:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000126', 'd0000000-0000-0000-0004-000000000068', 'a1000000-0000-0000-0000-000000000010', E'"二十岁买的车养到现在",这句看得人感慨。我们这代人换车像换手机,人家那是把车当家庭成员处的。', '2026-04-20 10:17:00-04')
ON CONFLICT (id) DO NOTHING;

-- P69 showoff: 老爷车内饰
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000069', 'a1000000-0000-0000-0000-000000000040', 'showoff', '车库寻宝:邻居的老古董让我摸方向盘了', E'塔科马的邻居老爷子车库里藏着一台养了几十年的老古董,今天终于获准参观还让我坐进驾驶位(图)。这个大盘子方向盘、金属拨杆、真木饰板,每一处都是手工时代的痕迹。老爷子说以前的车"修得好",现在的车"换得快",琢磨了一路。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Vintage_car_interior_shows_classic_steering_wheel_and_dashboard_details_in_a_garage_setting.jpg/960px-Vintage_car_interior_shows_classic_steering_wheel_and_dashboard_details_in_a_garage_setting.jpg'], NULL, NULL, NULL, ARRAY['老爷车','情怀'], 'active', '2026-04-20 11:42:00-07', '2026-04-20 11:42:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000127', 'd0000000-0000-0000-0004-000000000069', 'a1000000-0000-0000-0000-000000000022', E'这内饰包浆是岁月才能做出来的效果,仿都仿不来。能被老爷子请进车库的都是被认可的人,恭喜获得邻里最高礼遇。', '2026-04-20 15:39:00-05')
ON CONFLICT (id) DO NOTHING;

-- P70 showoff: KE70 Corolla
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000070', 'a1000000-0000-0000-0000-000000000003', 'showoff', '收了台KE70卡罗拉,我爸当年的梦中情车', E'蹲了两年,终于从一位圣地亚哥老哥手里收了这台KE70老卡罗拉,内饰基本原装(图),仪表简单到感人,收音机还能出声。我爸八十年代在国内杂志上见过这车,念叨了半辈子,视频通话给他看的时候老爷子眼睛都亮了。周末圣盖博的兄弟们想摸车的排队,温柔点摸。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Toyota_Corolla_DX_%28KE70%29_Dashboard_01.jpg/960px-Toyota_Corolla_DX_%28KE70%29_Dashboard_01.jpg'], NULL, NULL, NULL, ARRAY['老爷车','JDM','情怀'], 'active', '2026-04-21 20:15:00-07', '2026-04-21 20:15:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000128', 'd0000000-0000-0000-0004-000000000070', 'a1000000-0000-0000-0000-000000000033', E'KE70现在存世量比你想的还少,原装内饰的更是稀有,恭喜阿强!后驱小卡罗拉,AE86的前辈,别被玩漂移的忽悠去下场,原汁原味最值钱。', '2026-04-22 08:41:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000129', 'd0000000-0000-0000-0004-000000000070', 'a0000000-0000-0000-0000-000000000001', E'给你爸看车那段真实了,我们这代人的车瘾一半是替父辈圆梦。哪天开来尔湾,请你喝茶,让我也坐坐八十年代。', '2026-04-22 12:24:00-07')
ON CONFLICT (id) DO NOTHING;

-- P71 showoff: Soarer
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000071', 'a1000000-0000-0000-0000-000000000033', 'showoff', '右舵Soarer进坑一周年,晒晒这套内饰', E'我的右舵丰田Soarer到手整一年,纪念日晒一波内饰(图)。九十年代日本泡沫经济时期的做工,数字仪表、厚实座椅,那个年代丰田是真下本。右舵在美国开一年也习惯了,就是drive-thru取餐永远要下车,罗兰岗的兄弟看到一台右舵大双门别拍了,直接来聊。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Toyota_Soarer_interior_view.jpg/960px-Toyota_Soarer_interior_view.jpg'], NULL, NULL, NULL, ARRAY['JDM','老爷车'], 'active', '2026-04-25 15:37:00-07', '2026-04-25 15:37:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000130', 'd0000000-0000-0000-0004-000000000071', 'a1000000-0000-0000-0000-000000000003', E'车神这台我馋一年了,泡沫时代的丰田内饰确实是另一个物种。下次车聚让我的KE70跟它合个影,凑一对时代眼泪。', '2026-04-25 19:02:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000131', 'd0000000-0000-0000-0004-000000000071', 'a1000000-0000-0000-0000-000000000037', E'drive-thru下车取餐那个画面太好笑了,建议常备一根长夹子(不是开玩笑,澳洲右舵老哥们真这么干)。', '2026-04-26 10:28:00-07')
ON CONFLICT (id) DO NOTHING;

-- P72 showoff: Town Car
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000072', 'a1000000-0000-0000-0000-000000000010', 'showoff', '两千五收的林肯Town Car,美式沙发厅', E'朋友搬家甩卖,两千五百刀接了这台老Town Car,里程不低但保养记录厚厚一沓。看看这个内饰(图),真皮电动大沙发,木纹饰板,前排能坐仨人的连体座椅,美式老豪华的活化石。V8开起来晃晃悠悠像开船,布鲁克林的坑洼路在它面前如履平地。当代步车买的,现在有点舍不得当代步车了。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/2003_Town_Car_Cartier_L-5.jpg/960px-2003_Town_Car_Cartier_L-5.jpg'], NULL, NULL, NULL, ARRAY['老车','美式豪华'], 'active', '2026-04-27 13:14:00-04', '2026-04-27 13:14:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000132', 'd0000000-0000-0000-0004-000000000072', 'a1000000-0000-0000-0000-000000000035', E'Town Car是被严重低估的老车,皮实、便宜、坐着舒服,纽约老一辈司机开它跑车行能跑三十万英里。两千五这个价,老陈你是捡着了。', '2026-04-27 17:36:00-04')
ON CONFLICT (id) DO NOTHING;

-- P73 showoff: 方向盘深度清洁
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000073', 'a1000000-0000-0000-0000-000000000016', 'showoff', '花一下午拯救包浆方向盘,前后对比爽了', E'我的老起亚方向盘包浆到反光,一直没好意思拍。这周末用全内饰清洁剂加软毛刷伺候了一下午,连缝线里的黑泥都抠出来了,现在这个状态(图)摸着终于不黏手了!顺便把中控和门板全做了一遍。亚特兰大的春天适合干活,建议大家都翻出刷子试试,成就感爆棚。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Gfp-kia-optima-steering-wheel.jpg/960px-Gfp-kia-optima-steering-wheel.jpg'], NULL, NULL, NULL, ARRAY['内饰清洁','DIY'], 'active', '2026-04-26 10:52:00-04', '2026-04-26 10:52:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000133', 'd0000000-0000-0000-0004-000000000073', 'a1000000-0000-0000-0000-000000000017', E'方向盘包浆是每台车的宿命,能动手治好的是少数狠人。提醒一句清洁完可以上一层皮革保护剂,不然干净状态维持不了太久,别问我怎么知道的。', '2026-04-26 14:19:00-04')
ON CONFLICT (id) DO NOTHING;

-- P74 showoff: 冷门车 ZAZ
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000074', 'a1000000-0000-0000-0000-000000000014', 'showoff', '费城街头偶遇神秘车,考考各位车友', E'今天在费城遛弯撞见一台完全不认识的车,车主是位乌克兰大叔,热情地打开车门让我看内饰(图)。他说这是ZAZ Slavuta,乌克兰产的,当年移民的时候的回忆,特地淘了一台运过来。仪表和座椅朴素得像上个世纪,但大叔擦得干干净净。在美国街头见到这车的概率大概比中彩票低,车友们谁认识这牌子?', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/ZAZ-1103_Slavuta_front_seats_and_dashboard_interior_view.jpg/960px-ZAZ-1103_Slavuta_front_seats_and_dashboard_interior_view.jpg'], NULL, NULL, NULL, ARRAY['冷门车','街拍'], 'active', '2026-04-28 19:08:00-04', '2026-04-28 19:08:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000134', 'd0000000-0000-0000-0004-000000000074', 'a1000000-0000-0000-0000-000000000022', E'ZAZ我还真知道,苏联时代的Zaporozhets就是他们家的,类似"人民小车"的定位。大叔淘一台运过来,这不是买车,是把故乡搬过来了。', '2026-04-29 09:23:00-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000135', 'd0000000-0000-0000-0004-000000000074', 'a1000000-0000-0000-0000-000000000040', E'这种车的价值跟马力零关系,全在人身上。想起我邻居老爷子的车库,车是时光机这话不假。', '2026-04-29 11:46:00-07')
ON CONFLICT (id) DO NOTHING;

-- P75 showoff: Mach-E GT 樱花季
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000075', 'a1000000-0000-0000-0000-000000000015', 'showoff', '樱花季试驾Mach-E GT,DC遛了一圈', E'趁樱花季请了半天假,约了试驾Mach-E GT(图),开着它在DC城里兜了一大圈。GT的加速是会上瘾的那种,红灯起步一脚下去笑出声。Tidal Basin附近就别开车去了,人山人海,我在乔治城河边找了个安静路段拍的照。现在满脑子都是要不要下订,钱包在求救。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Ford_Mustang_Mach-E_GT_IAA_2021_1X7A0176.jpg/960px-Ford_Mustang_Mach-E_GT_IAA_2021_1X7A0176.jpg'], NULL, NULL, NULL, ARRAY['试驾','EV','樱花季'], 'active', '2026-04-04 13:21:00-04', '2026-04-04 13:21:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000136', 'd0000000-0000-0000-0004-000000000075', 'a1000000-0000-0000-0000-000000000016', E'GT那个加速试过一次就回不去了,这是试驾的阴谋哈哈。理性提醒:GT的悬挂比普通版硬不少,先想想通勤路况再让钱包做决定。', '2026-04-04 17:48:00-04')
ON CONFLICT (id) DO NOTHING;

-- P76 showoff: Model Y 樱花
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000076', 'a1000000-0000-0000-0000-000000000039', 'showoff', '华大樱花开了,带Y打卡年度大片', E'西雅图一年一度的樱花刷屏周,我起了个大早带着Model Y去华大附近转了圈,树下随手一停就是屏保(图)。提醒想去拍的车友:校园周边周末停车位靠抢,早上八点前到还能从容拍,九点后就是人海模式。花期就这两周,冲!', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/%D0%90%D0%BB%D0%BC%D0%B0%D1%82%D1%8B%2C_Tesla_Model_Y_%D0%BD%D0%B0_%D0%9A%D0%B0%D1%80%D0%B8%D0%BC%D0%BE%D0%B2%D0%B0.jpg/960px-%D0%90%D0%BB%D0%BC%D0%B0%D1%82%D1%8B%2C_Tesla_Model_Y_%D0%BD%D0%B0_%D0%9A%D0%B0%D1%80%D0%B8%D0%BC%D0%BE%D0%B2%D0%B0.jpg'], NULL, NULL, NULL, ARRAY['樱花季','EV','打卡'], 'active', '2026-04-02 16:44:00-07', '2026-04-02 16:44:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000137', 'd0000000-0000-0000-0004-000000000076', 'a1000000-0000-0000-0000-000000000007', E'本地人补充:拍完记得赶紧把车上的花瓣冲掉,樱花瓣沾上晨露黏在漆面上,晒一天就留印,美丽的代价不便宜。', '2026-04-02 19:21:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000138', 'd0000000-0000-0000-0004-000000000076', 'a1000000-0000-0000-0000-000000000006', E'湾区没这个景致,酸了。这张构图可以,借去当手机壁纸了(狗头)。', '2026-04-03 10:36:00-07')
ON CONFLICT (id) DO NOTHING;

-- P77 chatter: DC樱花堵车
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000077', 'a1000000-0000-0000-0000-000000000015', 'discussion', '友情提示:这两周别开车靠近Tidal Basin', E'血泪播报:今天想着工作日人少,开车路过Tidal Basin看樱花,结果在Independence大道堵了四十五分钟,挪了半英里,停车场全满,路边全是绕圈找位的车。最后灰溜溜开回家了。要看樱花的老乡听我一句:地铁到Smithsonian站走过去,或者干脆等下周花落了看地上的"樱花地毯",也挺美,还不堵。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['樱花季','吐槽'], 'active', '2026-04-01 18:27:00-04', '2026-04-01 18:27:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000139', 'd0000000-0000-0000-0004-000000000077', 'a1000000-0000-0000-0000-000000000036', E'纽约人表示去年也犯过一样的错,开去DC看樱花,车停在弗吉尼亚,人走了三英里。樱花季开车去等于花式受罪,地铁才是版本答案。', '2026-04-01 21:44:00-04')
ON CONFLICT (id) DO NOTHING;

-- P78 chatter: 油价吐槽
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000078', 'a1000000-0000-0000-0000-000000000028', 'discussion', '早上加油差点以为按错油枪', E'今早常去的那家加油,普通汽油一夜之间涨了两毛五,加满一箱比上周多花四刀。旁边的老哥跟我对视一眼,都从对方眼里看到了心痛。夏季出行季还没到就开始涨,这是要闹哪样。就想发个帖问问,大家那边最近油价什么行情,让我心理平衡一下。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['油价','吐槽'], 'active', '2026-04-10 08:16:00-07', '2026-04-10 08:16:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000140', 'd0000000-0000-0000-0004-000000000078', 'a1000000-0000-0000-0000-000000000019', E'来德州疗伤吧发哥,我们这还在两块多,每次看加州朋友晒油价都感觉自己在白捡油。不过说真的,每年春天炼油厂切换夏季配方都要涨一波,五月底前别指望降。', '2026-04-10 12:39:00-05')
ON CONFLICT (id) DO NOTHING;

-- P79 chatter: 退税纠结
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000079', 'a1000000-0000-0000-0000-000000000037', 'discussion', '报完税的快乐还没捂热,就开始想换车', E'4月15号前赶完税,退税这两天到账了。本来发誓要老老实实存起来,结果今天下班路过dealer,看见一排车在夕阳下闪闪发光,脚就不听使唤拐进去了。试都没敢试,怕一试就走不出来。埃尔蒙特的兄弟们,你们的退税都守住了吗?还是已经变成四个轮子了?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['退税季','闲聊'], 'active', '2026-04-17 21:33:00-07', '2026-04-17 21:33:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000141', 'd0000000-0000-0000-0004-000000000079', 'a0000000-0000-0000-0000-000000000001', E'dealer最懂这个季节的人性,展厅灯光都比平时亮三分。老王教你一招:想买车的冲动,先冷冻三十天,三十天后还想买再研究,一大半人第十天就忘了。守住,钱包会感谢你。', '2026-04-18 09:57:00-07')
ON CONFLICT (id) DO NOTHING;

-- P80 chatter: 西雅图雨刮
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000080', 'a1000000-0000-0000-0000-000000000007', 'discussion', '雨神日记:连续下雨第21天,雨刮先扛不住了', E'号称雨神,家里雨具比锅碗多。今年四月西雅图这雨下得连本地人都想吐槽,我数了下连续21天没见过完整的太阳。今早雨刮开始蹦迪,一边刮一边吱哇乱叫,得,周末的活儿有了。雨城人民的春天:洗车靠天,擦车靠雨刮,心情靠咖啡。大家的车都还好吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['雨季','闲聊'], 'active', '2026-04-03 07:52:00-07', '2026-04-03 07:52:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000142', 'd0000000-0000-0000-0004-000000000080', 'a1000000-0000-0000-0000-000000000040', E'塔科马报到,我的雨刮上周已经先走一步了,换了副新的世界都清晰了。雨神你这个ID在四月的西雅图含金量太高,建议改名"雨主"。', '2026-04-03 11:18:00-07')
ON CONFLICT (id) DO NOTHING;

-- P81 chatter: car show 随拍 (images)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000081', 'a1000000-0000-0000-0000-000000000026', 'discussion', '丹佛周末Cars and Coffee随拍,老车含量超标', E'今早去丹佛本地的Cars and Coffee,春天第一场,老车们都从车库里爬出来晒太阳了。随手拍了两张有意思的:一台内饰保存完美的老古董(图1),还有一台右舵日本老双门(图2),车主说是九十年代的Soarer,在场围观人数吊打旁边的新超跑。看来大家心里都住着旧时光。下个月的场次谁一起?', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Vintage_car_interior_shows_classic_steering_wheel_and_dashboard_details_in_a_garage_setting.jpg/960px-Vintage_car_interior_shows_classic_steering_wheel_and_dashboard_details_in_a_garage_setting.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Toyota_Soarer_interior_view.jpg/960px-Toyota_Soarer_interior_view.jpg'], NULL, NULL, NULL, ARRAY['车聚','老爷车'], 'active', '2026-04-18 16:09:00-06', '2026-04-18 16:09:00-06')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000143', 'd0000000-0000-0000-0004-000000000081', 'a1000000-0000-0000-0000-000000000033', E'丹佛也有Soarer?!老车圈真是处处有同好。围观人数吊打超跑很正常,超跑看的是钱,老车看的是命——保存一台老车花的心思,懂的都懂。', '2026-04-18 20:35:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000144', 'd0000000-0000-0000-0004-000000000081', 'a1000000-0000-0000-0000-000000000014', E'羡慕这种车友文化,费城的车聚总感觉差点意思。第一张的木纹方向盘绝了,现在哪还找得到这种手艺。', '2026-04-19 11:02:00-04')
ON CONFLICT (id) DO NOTHING;

-- P82 chatter: 深夜洗车 (image)
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000082', 'a1000000-0000-0000-0000-000000000034', 'discussion', '晚上十点的自助洗车场,是我的解压舱', E'加班到九点半,没回家,拐去了自助洗车场。晚上的洗车场没人排队,高压水枪冲掉泡沫的那一刻,感觉一周的班味也被冲掉了。洗完钻进车里把方向盘内饰擦得锃亮(图),坐在干净的车里发了十分钟呆才开回家。谁懂,这比做SPA便宜多了,五刀买一小时安静。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Gfp-kia-optima-steering-wheel.jpg/960px-Gfp-kia-optima-steering-wheel.jpg'], NULL, NULL, NULL, ARRAY['洗车','闲聊'], 'active', '2026-04-24 22:41:00-07', '2026-04-24 22:41:00-07')
ON CONFLICT (id) DO NOTHING;

-- P83 chatter: I-5 堵车
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000083', 'a1000000-0000-0000-0000-000000000030', 'discussion', '春假返程的I-5,是全加州的车都在这了吗', E'刚从LA看完朋友开回萨克拉门托,春假最后一个周日的I-5北上,Grapevine那段直接停车场模式,平时五个半小时的路开了八个多小时。孩子在后座睡了两觉醒来问怎么还没到家。给下周还要跑长途的朋友提个醒:错峰!哪怕周一早上走都比周日下午强十倍。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['春假','堵车'], 'active', '2026-04-06 15:33:00-07', '2026-04-06 15:33:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000145', 'd0000000-0000-0000-0004-000000000083', 'a1000000-0000-0000-0000-000000000002', E'周日的I-5和405是加州两大渡劫圣地。我们家现在长途铁律:去程周五请半天假中午走,回程周一一早走,多请半天假换八小时人生,这买卖太值了。', '2026-04-06 19:58:00-07')
ON CONFLICT (id) DO NOTHING;

-- P84 chatter: 超载皮卡
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0004-000000000084', 'a1000000-0000-0000-0000-000000000025', 'discussion', '今天高速上被一车床垫吓出冷汗', E'下班走I-10,前面一台皮卡车斗里立着三张床垫加一个衣柜,就一根绳子意思了一下,床垫在风里疯狂扇动,跟要起飞一样。我赶紧变道拉开距离,后视镜里看它还在晃。凤凰城的风大家又不是不知道……真心呼吁:搬家绑不牢就租个带箱的U-Haul吧,你省的那五十刀,可能是后车的挡风玻璃和人身安全。大家遇到这种车,远离加举报,别犹豫。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['安全驾驶','吐槽'], 'active', '2026-04-29 17:24:00-07', '2026-04-29 17:24:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0004-000000000146', 'd0000000-0000-0000-0004-000000000084', 'a1000000-0000-0000-0000-000000000026', E'科罗拉多山口的风里见过起飞的床垫,真的就是一发炮弹。补充下,很多州公路上掉落物砸到后车,货主是要负全责的,但赔偿追不回惊吓。看到这种车,超过去或者留足十秒车距,别赌。', '2026-04-29 21:47:00-06')
ON CONFLICT (id) DO NOTHING;

-- part5: 2026年5月 社区帖子 (84 posts) + 评论
-- Posts d0000000-0000-0000-0005-0000000000NN (01-84), comments e0000000-0000-0000-0005-000000000NNN

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000001', 'a0000000-0000-0000-0000-000000000002', 'discussion', '六月中毕业回国,车提前多久挂出去卖比较稳?', '大家好,我6月15号毕业典礼,6月底的机票回国。一辆2019年的卡罗拉,大概能卖1万2左右。现在纠结什么时候开始挂:挂早了怕卖掉之后没车用,毕业前最后一个月要搬家、跑学校各种手续,没车很麻烦;挂晚了又怕来不及过户,砸手里只能贱卖给车行。有没有毕业季卖过车的朋友分享一下时间线?私卖和卖给CarMax大概差多少钱?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['毕业季','卖车'], 'active', '2026-05-04 10:23:00-07', '2026-05-04 10:23:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000001', 'd0000000-0000-0000-0005-000000000001', 'a0000000-0000-0000-0000-000000000008', '建议提前4-5周挂出去,价格标高一点慢慢谈。私卖记得写清楚"交车时间6月20号左右",很多买家能接受等两周,尤其是接手的学弟学妹,这样你既锁定了买家又能用到最后。CarMax/Carvana报价一般比私卖低1000-2000,留一个当保底,临走前三天没卖掉直接开去车行,当天拿支票。', '2026-05-04 15:40:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000002', 'd0000000-0000-0000-0005-000000000001', 'a0000000-0000-0000-0000-000000000001', '补充一点:过户手续别拖到最后一天,DMV预约现在要等。加州的话卖家签好title、交Notice of Transfer就行,当天能搞定。收款用cashier''s check当面银行兑,或者Zelle小额试一笔再收大额。', '2026-05-05 09:12:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000003', 'd0000000-0000-0000-0005-000000000001', 'a1000000-0000-0000-0000-000000000013', '我去年就是这么干的,5月初挂、6月18交车,买家是同校学妹,签了个简单的交车协议,定金收了500。最后比车行报价多卖了1800,够一张机票了。', '2026-05-06 20:31:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000002', 'a1000000-0000-0000-0000-000000000013', 'discussion', '把车卖给直系学弟,流程上有什么要注意的?', '车是2018年的CR-V,学弟人很好,价格都谈好了。3年前买的时候的贷款已经还清,title在我手里。因为是熟人,总觉得不好意思搞得太正式,但又怕以后车出事扯不清。请问:1. 需要签bill of sale吗?2. 交车之后他多久必须去过户?3. 交车前这段时间保险怎么算?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['毕业季','卖车','过户'], 'active', '2026-05-06 18:05:00-04', '2026-05-06 18:05:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000004', 'd0000000-0000-0000-0005-000000000002', 'a0000000-0000-0000-0000-000000000008', '越是熟人越要把手续做全,这不是见外,是保护双方。bill of sale必须签,写清车架号、里程、as-is出售、交车日期;title背面签字转让;然后你自己去DMV交一份卖车通知(各州叫法不同,麻州是交回车牌取消注册),这样他过户前吃罚单撞车都跟你无关。保险你交车当天打电话取消,他那边交车前就得把保险买好,无缝衔接。', '2026-05-06 21:44:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000005', 'd0000000-0000-0000-0005-000000000002', 'a1000000-0000-0000-0000-000000000035', '车牌那步最容易忘。麻州车牌跟人走不跟车走,交车前把牌子拆下来,不然他开着你的牌被拍到,麻烦都是你的。', '2026-05-07 12:30:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000003', 'a1000000-0000-0000-0000-000000000011', 'discussion', '暑假回国三个月,车放朋友家,保险能停吗?', '6月到8月回国,车打算停在朋友家车道上,朋友偶尔帮我挪一下车。问了保险公司说可以降成storage模式只留comprehensive,但这样朋友帮我挪车算不算脱保?还有人说注册状态的车不能只买comprehensive?纽约的政策有点看不懂,有经验的朋友说说?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保险','回国'], 'active', '2026-05-08 09:40:00-04', '2026-05-08 09:40:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000006', 'd0000000-0000-0000-0005-000000000003', 'a1000000-0000-0000-0000-000000000012', '纽约州要求注册中的车必须保持liability,不能只留comprehensive,除非你把车牌交回DMV暂停注册。所以要么保险照常交,要么正经走surrender plates流程。朋友只是车道上挪几米还好,上路开就必须有liability。', '2026-05-08 13:22:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000007', 'd0000000-0000-0000-0005-000000000003', 'a0000000-0000-0000-0000-000000000008', '我的建议:三个月而已,把deductible调高、里程改成low mileage,保费能降一截,比来回折腾注册划算。另外让朋友每两周着车十分钟,电瓶就不会趴窝。', '2026-05-08 19:05:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000004', 'a1000000-0000-0000-0000-000000000019', 'discussion', 'Memorial Day车行大促,到底是真降价还是套路?', '满屏都是Memorial Day Sale,什么0首付、0% APR、比市场价低3000。我想趁假期把家里第二辆车换了,但总觉得羊毛出在羊身上。想问问懂行的:节日促销的折扣是真的吗?是不是把价格先抬上去再打折?二手车这时候买是更便宜还是更贵?', ARRAY['https://upload.wikimedia.org/wikipedia/commons/b/b8/Used_Car_Lot%2C_Holyhead_Road%2C_Valley_-_geograph.org.uk_-_877427.jpg'], NULL, NULL, NULL, ARRAY['买车','促销'], 'active', '2026-05-18 08:15:00-04', '2026-05-18 08:15:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000008', 'd0000000-0000-0000-0005-000000000004', 'a0000000-0000-0000-0000-000000000008', '一半真一半套路。真的部分:季度节点加节假日,销售有冲量压力,新车incentive是厂家真金白银;假的部分:广告价往往只有一台特价车,到店就"刚卖掉"。二手车节日期间人流大,反而不容易砍价,真想捡漏可以等节后那个周二去,销售没完成任务的时候最好说话。', '2026-05-18 11:02:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000009', 'd0000000-0000-0000-0005-000000000004', 'a0000000-0000-0000-0000-000000000005', '上个Memorial Day我陪朋友买的,广告价出门变成加dealer add-on:贴膜、防锈、GPS防盗,一共2000多。盯着out-the-door price谈,别的都是烟雾弹。', '2026-05-18 16:45:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000010', 'd0000000-0000-0000-0005-000000000004', 'a1000000-0000-0000-0000-000000000020', '0% APR一般要顶级信用分,而且经常和现金折扣二选一。算下来有时候拿rebate自己去credit union贷款更省。', '2026-05-19 10:20:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000005', 'a1000000-0000-0000-0000-000000000025', 'discussion', '凤凰城快40度了,空调不冷是加氟还是压缩机要换?', '车是10年的老车,去年夏天空调还凑合,今年一开始就只出温风,怠速时更明显,跑起来稍微好点。朋友说先去加个氟试试,也有人说老车八成是压缩机离合器坏了,加氟白花钱。这两种毛病怎么区分?外面店里检查一次大概多少钱?附一张引擎舱照片,平时保养没断过。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/C_C_Viper_Engine_Bay_%2865603951%29.jpeg/960px-C_C_Viper_Engine_Bay_%2865603951%29.jpeg'], NULL, NULL, NULL, ARRAY['空调','维修'], 'active', '2026-05-09 11:30:00-07', '2026-05-09 11:30:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000011', 'd0000000-0000-0000-0005-000000000005', 'a0000000-0000-0000-0000-000000000007', '先别急着换压缩机。制冷剂是循环的,正常不该少,少了就是有泄漏。店里做一次AC诊断(加荧光剂加压力表)大概100-150,能看出低压高压读数:两边都低是缺氟有漏点,常见漏点是冷凝器被石子打漏和管路O圈老化;压缩机不吸合也可能只是压力开关或继电器,几十块的事。直接"加氟"不查漏,大概率一个月后打回原形。', '2026-05-09 14:55:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000012', 'd0000000-0000-0000-0005-000000000005', 'a1000000-0000-0000-0000-000000000033', '同款经历,最后是冷凝器漏,换了件300多加冷媒,凉得跟新车一样。别一上来就被忽悠换压缩机,那个连工带料上千了。', '2026-05-09 18:20:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000013', 'd0000000-0000-0000-0005-000000000005', 'a1000000-0000-0000-0000-000000000028', '沙漠地区提醒:查一下电子扇转不转。怠速不冷、跑起来变冷,很典型是散热风扇不转,冷凝器散不了热。', '2026-05-10 08:05:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000006', 'a1000000-0000-0000-0000-000000000028', 'discussion', '夏天到了电瓶两年就不行,是正常损耗吗?', '在维加斯,车停外面,电瓶基本两年一换,这次又开始打火无力了。朋友在东北老家一块电瓶能用五六年。是不是高温对电瓶伤害比低温还大?有没有什么牌子或者型号更抗热?换电瓶自己动手难不难?附我引擎舱现状。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Honda_City_Turbo_II_engine_bay.jpg/960px-Honda_City_Turbo_II_engine_bay.jpg'], NULL, NULL, NULL, ARRAY['电瓶','夏季'], 'active', '2026-05-12 19:22:00-07', '2026-05-12 19:22:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000014', 'd0000000-0000-0000-0005-000000000006', 'a0000000-0000-0000-0000-000000000007', '是的,高温才是电瓶杀手,热量加速极板腐蚀和电解液蒸发,凤凰城维加斯这种地方电瓶寿命普遍2-3年,低温只是让本来已经虚弱的电瓶暴露出来。选AGM电瓶更抗热,Costco和Walmart的性价比高,注意对好group size和CCA。自己换不难,先断负极再断正极,装回去顺序反过来,有些车断电后要重新学习怠速和车窗一键升降。', '2026-05-13 08:40:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000015', 'd0000000-0000-0000-0005-000000000006', 'a1000000-0000-0000-0000-000000000025', '我们这边老司机土办法:每年入夏前去店里免费测一次电瓶健康度,低于70%就提前换,总比大热天趴在停车场等救援强。', '2026-05-13 12:15:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000007', 'a1000000-0000-0000-0000-000000000037', 'discussion', '冷却液低于MIN线,能直接加水应急吗?', '今天开引擎盖检查(照片),发现副水壶液位低于MIN线不少。查了下我这车要粉色的冷却液,家附近店里没货。网上有人说应急可以加蒸馏水,也有人说千万不能混。请问:1. 加错颜色的冷却液会怎样?2. 液位下降这么多是不是有泄漏?水温表目前正常。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/93SE_4-dr_Engine_Bay_30.jpg/960px-93SE_4-dr_Engine_Bay_30.jpg'], NULL, NULL, NULL, ARRAY['冷却液','保养'], 'active', '2026-05-05 08:50:00-07', '2026-05-05 08:50:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000016', 'd0000000-0000-0000-0005-000000000007', 'a0000000-0000-0000-0000-000000000007', '短期应急加蒸馏水没问题(别用矿物质多的自来水),就是稍微稀释了冰点沸点,回头补浓缩液就行。不同颜色配方的冷却液不要混,混了可能产生沉淀堵水道。液位明显下降要留心:看地面有没有粉色水渍、水壶盖和水管接头有没有干涸的结晶痕迹。都没有的话也可能是水箱盖蒸发或缸垫微渗,先补到MAX,两周后再看降不降,降得快就去做个冷却系统打压测试。', '2026-05-05 12:35:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000017', 'd0000000-0000-0000-0005-000000000007', 'a1000000-0000-0000-0000-000000000003', '华人超市附近的AutoZone基本都有对应车型的premixed,拿VIN一查就知道该用哪种,别猜颜色。', '2026-05-05 17:48:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000008', 'a1000000-0000-0000-0000-000000000026', 'discussion', '新车没有备胎只给补胎胶,跑山路心慌怎么办?', '刚发现我的车原厂居然不带备胎,只有一罐补胎胶和小气泵。平时市区还好,但我们经常开山路去hiking,没信号的地方爆个胎想想就可怕。请问:1. 补胎胶能对付什么样的胎伤?2. 值得自己买个donut备胎放后备箱吗?3. 还是买套补胎条工具更实用?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['轮胎','自驾'], 'active', '2026-05-07 20:10:00-07', '2026-05-07 20:10:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000018', 'd0000000-0000-0000-0005-000000000008', 'a0000000-0000-0000-0000-000000000007', '补胎胶只能对付胎面小扎钉,侧壁破、大口子、胎圈漏都没用,而且用过胶的胎很多店拒补,等于废一条。走山路建议:补胎条工具包加便携气泵,胎面扎钉自己十分钟搞定,比补胎胶靠谱;侧壁破什么都救不了,只能靠备胎或拖车。淘个同款车的原厂donut加千斤顶套装,二手一百多刀,后备箱有地方就放着,心里踏实。', '2026-05-08 09:25:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000019', 'd0000000-0000-0000-0005-000000000008', 'a1000000-0000-0000-0000-000000000027', '我们去国家公园都是两台车同行,信号盲区AAA都叫不到,备胎真不是智商税。另外出发前把备胎气压也查了,很多人备胎本身是瘪的。', '2026-05-08 13:50:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000020', 'd0000000-0000-0000-0005-000000000008', 'a1000000-0000-0000-0000-000000000030', '补胎条真心推荐,视频看两个就会,我在Tahoe路上用过一次,顶着开回城里换的胎。', '2026-05-09 07:42:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000009', 'a1000000-0000-0000-0000-000000000027', 'discussion', '暑假黄石自驾,开自己的车还是租SUV更划算?', '计划7月从盐湖城出发去黄石加大提顿,来回大概1200迈,一家四口。自己的车是台开了8万迈的轿车,担心山路动力和碎石路;租台SUV一周大概450加保险。纠结:1200迈的损耗和油钱,跟租车费用比哪个划算?园区里普通轿车够用吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['国家公园','自驾'], 'active', '2026-05-10 09:05:00-07', '2026-05-10 09:05:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000021', 'd0000000-0000-0000-0005-000000000009', 'a1000000-0000-0000-0000-000000000026', '黄石主环路全铺装,轿车完全够,大提顿也是,只有少数支线是碎石路不去就行。8万迈的车做个保养检查就能上,1200迈损耗算5毛一迈也就600块,但这是纸面数字,实际现金支出就油钱100多。租车的意义主要是里程焦虑和新车省心,划不划算看你对自己车况的信心。', '2026-05-10 12:40:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000022', 'd0000000-0000-0000-0005-000000000009', 'a1000000-0000-0000-0000-000000000007', '我投租车一票,不为别的,为了保险省心。租车全险出了事拍拍屁股走人,自己的车刮了底盘心疼半年。旺季记得提前订,7月盐湖城机场取车价格会飞涨。', '2026-05-10 16:22:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000023', 'd0000000-0000-0000-0005-000000000009', 'a0000000-0000-0000-0000-000000000001', '折中方案:出发前花150做个全面检查(刹车、胎、冷却液、电瓶),开自己的车去,省下的租车钱住一晚Jackson的酒店不香吗。', '2026-05-11 08:15:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000010', 'a1000000-0000-0000-0000-000000000006', 'discussion', '101上被开85迈超速罚单,上庭有机会减免吗?', '上周在101被CHP拦下,限速65开到85。罚单还没收到账单,但网上说加州这个档要400左右,还影响保险。第一次吃罚单,想问:1. trial by written declaration值得试吗?2. 上庭的话警察不出现是不是就撤销?3. 认罚的话能同时上traffic school吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['罚单'], 'active', '2026-05-03 16:44:00-07', '2026-05-03 16:44:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000024', 'd0000000-0000-0000-0005-000000000010', 'a1000000-0000-0000-0000-000000000002', 'written declaration值得一试,成本就是写封信加押金(输了不退但也不多花),警察不回复declaration的比例不低,撤销了押金全退。就算输了还能要求trial de novo再上一次庭。我自己就declaration成功过一次。', '2026-05-03 19:30:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000025', 'd0000000-0000-0000-0005-000000000010', 'a1000000-0000-0000-0000-000000000001', '85对65这个超20迈的档一般还有traffic school资格(18个月内没上过就行),认罚加traffic school,点数不上保险记录。别拖过deadline,拖了会加civil assessment,300多就变600多了。', '2026-05-04 09:10:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000011', 'a1000000-0000-0000-0000-000000000002', 'discussion', '网上traffic school哪家快?消分流程求扫盲', '吃了个红灯右转罚单,法院信上说eligible for traffic school。第一次弄,想问:1. 是先交罚款再报名吗?2. 网课是不是可以随便挂着放?考试难吗?3. 完成之后要自己把证书交给法院还是学校代交?怕流程漏一步,点数还是上了记录。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['罚单','消分'], 'active', '2026-05-11 12:18:00-07', '2026-05-11 12:18:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000026', 'd0000000-0000-0000-0005-000000000011', 'a1000000-0000-0000-0000-000000000004', '流程:先交罚款加traffic school费给法院,拿到case号再去DMV认证的网校名单里随便挑一家(十几刀那种就行)。课程有计时,但可以分几天挂完,章节小测都超简单。现在基本都是学校电子回传法院,完成后自己上法院网站查一下case状态变没变,变了才算闭环。', '2026-05-11 15:47:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000027', 'd0000000-0000-0000-0005-000000000011', 'a1000000-0000-0000-0000-000000000032', '提醒一句,traffic school上完是点数不给保险公司看,罚单本身的钱一分不少交,别以为能省罚款。18个月内只能用一次,且行且珍惜。', '2026-05-12 10:05:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000012', 'a1000000-0000-0000-0000-000000000012', 'discussion', '无事故无罚单,续保却涨了30%,能argue吗?', '收到renewal通知,同样的coverage从半年780涨到1020。这一年我零事故零罚单,信用分还涨了,打电话客服就说整体费率调整。请问这种情况有没有办法appeal?还是只能默默换保险公司?换保险会不会影响以后的理赔记录?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保险'], 'active', '2026-05-13 17:35:00-04', '2026-05-13 17:35:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000028', 'd0000000-0000-0000-0005-000000000012', 'a0000000-0000-0000-0000-000000000004', '所谓费率调整是全州备案的,个人appeal基本没戏,但你可以让agent重新跑一遍discount:里程改低、加装防盗、bundle租房险、上safe driving app,好几项加起来能抵一部分。最有效的还是拿着现有coverage去比价,新客户价经常比老客户续保便宜。', '2026-05-13 20:12:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000029', 'd0000000-0000-0000-0005-000000000012', 'a0000000-0000-0000-0000-000000000008', '换保险公司完全不影响理赔记录,记录跟人走(CLUE报告)。唯一注意别断保,哪怕一天,断保记录会让所有公司给你涨价。新保单生效日和旧的到期日对齐再取消。', '2026-05-14 09:30:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000013', 'a0000000-0000-0000-0000-000000000003', 'discussion', 'Model 3湾区到黄石,充电规划求老司机把关', '6月底打算开Model 3长续航从湾区出发,走80号经Reno、盐湖城到黄石,单程约950迈。第一次开电车跑这么远,ABRP排出来要充6次。问题:1. 内华达段超充间距大,需要每站都充到90%吗?2. 西黄石充电桩够用吗?据说旺季要排队?3. 住的民宿没充电桩,普通插座过夜能回多少电?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['电车','自驾','充电'], 'active', '2026-05-14 21:10:00-07', '2026-05-14 21:10:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000030', 'd0000000-0000-0000-0005-000000000013', 'a1000000-0000-0000-0000-000000000031', '80号沿线超充很成熟,Winnemucca、Elko、Wells都有站,正常按导航走就行,不用刻意充到90%。电车长途的诀窍是少充多次,每次充到能到下一站再留15%余量就走,20-60%区间充电速度最快。只有进黄石前那一段建议充满,园区里桩少距离长。', '2026-05-15 08:22:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000031', 'd0000000-0000-0000-0005-000000000013', 'a1000000-0000-0000-0000-000000000039', '西黄石镇上有超充,去年暑假去过,早上和晚饭时间会排一会儿,错峰就好。园区内Old Faithful那边有目的地充电桩,但被油车占位是常事,别把它算进规划里。', '2026-05-15 11:45:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000032', 'd0000000-0000-0000-0005-000000000013', 'a1000000-0000-0000-0000-000000000021', '普通110v插座过夜12小时也就回40-50迈,聊胜于无。记得带mobile connector和一条线径粗的延长线,民宿插座老化发热要留意。', '2026-05-15 19:03:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000014', 'a1000000-0000-0000-0000-000000000031', 'discussion', '超充站排队越来越夸张,大家都几点去充?', 'Fremont这边几个超充站,晚上七八点清一色排队15分钟起,周末更离谱。我家住公寓没法装家充,只能靠超充续命。想问同样公寓党的朋友:你们都什么时段去充?有没有找冷门站的思路?另外排队时那种插着枪人不在车里的,有办法吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['充电','电车'], 'active', '2026-05-22 19:48:00-07', '2026-05-22 19:48:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000033', 'd0000000-0000-0000-0005-000000000014', 'a0000000-0000-0000-0000-000000000003', '早上6-8点和上午10-11点基本不排,午饭和晚饭时段最堵。App里把附近3-4个站都收藏,出发前看实时占用,有时候多开5分钟去商场楼顶那种冷门站反而更快。充到80%就走,后面20%又慢又占坑。', '2026-05-23 07:55:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000034', 'd0000000-0000-0000-0005-000000000014', 'a1000000-0000-0000-0000-000000000038', '特斯拉对充满后继续占位收idle fee,站满50%就开始计费一分钟一块多,所以人不在的情况比以前少了。公寓党建议跟物业提议装几个L2,现在有补贴,我们小区去年就装成了。', '2026-05-23 12:30:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000015', 'a1000000-0000-0000-0000-000000000038', 'discussion', '算了笔账:家充和超充成本差多少?求验证', '准备下手电车,先算电费账。PG&E电车套餐夜间大概0.31一度,超充高峰要0.58。按一年12000迈、百迈25度算,家充约930一年,全靠超充要1740,差800多。但装家充墙充加电工报价1800,这么看两年多才回本?我算得对吗?有没有漏掉什么?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['充电','电车'], 'active', '2026-05-06 12:05:00-07', '2026-05-06 12:05:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000035', 'd0000000-0000-0000-0005-000000000015', 'a1000000-0000-0000-0000-000000000005', '账基本对,但漏了几点:1. 家充不用专门跑充电站,一年省下的时间不好定价但很真实;2. 墙充不是必须,很多车带的mobile connector配个NEMA 14-50插座就行,电工装插座500-800,比墙充便宜一半;3. 卖房时充电插座算加分项。我自己就是14-50方案,三年了没觉得不够用。', '2026-05-06 15:38:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000036', 'd0000000-0000-0000-0005-000000000015', 'a1000000-0000-0000-0000-000000000039', '补一条:留意你们utility有没有装充电桩返现,还有联邦装charger的税收抵免,叠加下来实际支出可能腰斩,回本周期直接缩短一半。', '2026-05-07 09:20:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000016', 'a1000000-0000-0000-0000-000000000040', 'discussion', '退休想入二手房车,Class C十年车龄水深吗?', '跟老伴计划退休后开房车把西部国家公园转一遍。看上几台十年左右车龄的Class C,标价4-6万,比新车便宜一大半。但听说房车水很深:漏水、发电机、冰箱都是坑。想请教玩过房车的朋友:十年车龄该重点查什么?维护一年大概花多少?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['房车'], 'active', '2026-05-15 10:30:00-07', '2026-05-15 10:30:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000037', 'd0000000-0000-0000-0005-000000000016', 'a0000000-0000-0000-0000-000000000006', '房车第一大坑是水损,车顶密封胶老化渗水,墙体里面烂了外面看不出来。看车带个湿度计,摸内壁角落有没有软塌,闻霉味,车顶上去看密封胶状况。底盘部分(发动机变速箱)反而好办,福特E450底盘满大街都能修。发电机按小时数看,带载试机半小时。', '2026-05-15 14:12:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000038', 'd0000000-0000-0000-0005-000000000016', 'a1000000-0000-0000-0000-000000000008', '建议先租一次一周试试再买,我们就是租了两回发现更喜欢拖挂式,预算还省一半,平时SUV还能当日常车。', '2026-05-16 08:44:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000017', 'a1000000-0000-0000-0000-000000000021', 'discussion', '德州考摩托车驾照,MSF课程值得上吗?', '一直想搞台摩托周末跑山。德州考M类照好像有两条路:自己去DMV笔试加路考,或者上MSF安全课程免路考。MSF要200多块两天,有点犹豫。上过的朋友觉得值吗?零基础直接上课能跟上吗?另外买车前保险大概什么水平?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['摩托车','驾照'], 'active', '2026-05-04 15:20:00-04', '2026-05-04 15:20:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000039', 'd0000000-0000-0000-0005-000000000017', 'a1000000-0000-0000-0000-000000000014', 'MSF闭眼冲,零基础友好,车和头盔都是课程提供的,练两天基础操作比自己瞎摸索安全太多,结业卡免路考,保险还能打折。我们班一半人没碰过摩托,都过了。', '2026-05-04 19:05:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000040', 'd0000000-0000-0000-0005-000000000017', 'a1000000-0000-0000-0000-000000000019', '保险比你想的便宜,30岁往上买台中量级街车,一年liability也就两三百。德州夏天骑车是真的烤,装备别省,网眼夏季骑行服比硬扛凉快多了。', '2026-05-05 09:33:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000018', 'a1000000-0000-0000-0000-000000000024', 'discussion', '车贷利率6.9%,手里有闲钱该提前还吗?', '去年贷的车,60期6.9%,还剩3万本金。最近攒了些闲钱,纠结要不要提前还掉一部分。网上说法两派:一派说6.9%不低赶紧还,另一派说钱放高收益储蓄或投资更划算。还有说提前还款影响信用分的?想听听大家实际怎么操作的。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['车贷'], 'active', '2026-05-08 21:15:00-04', '2026-05-08 21:15:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000041', 'd0000000-0000-0000-0005-000000000018', 'a1000000-0000-0000-0000-000000000015', '数学上很简单:6.9%是税后无风险收益,高收益储蓄现在4%左右还要交税,所以还贷款稳赚。先确认你的贷款没有prepayment penalty(绝大多数车贷没有),还款时选principal only,不然多交的钱会被算成提前交下期月供,利息一分不省。', '2026-05-09 08:40:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000042', 'd0000000-0000-0000-0005-000000000018', 'a1000000-0000-0000-0000-000000000005', '信用分影响微乎其微:还清后账户关闭,平均账龄和账户组合略变,可能掉几分,几个月就回来了。别为了这几分白交6.9%的利息。', '2026-05-09 12:10:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000043', 'd0000000-0000-0000-0005-000000000018', 'a0000000-0000-0000-0000-000000000008', '唯一提醒:留足应急金再还。车贷提前还进去的钱是取不出来的,失业了银行可不会因为你多还过就让你缓交月供。', '2026-05-10 10:25:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000019', 'a1000000-0000-0000-0000-000000000015', 'discussion', '车贷refinance现在做还是再等等降息?', '前年高点贷的车,利率9.2%,信用分从680涨到了760。看了下现在credit union给的refi报价大概6.5%,能省不少。但新闻一直说下半年可能降息,纠结现在锁还是再等等。refi有没有什么隐藏费用?对信用分伤害大吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['车贷','refinance'], 'active', '2026-05-20 12:40:00-04', '2026-05-20 12:40:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000044', 'd0000000-0000-0000-0005-000000000019', 'a1000000-0000-0000-0000-000000000024', '别等。你从9.2到6.5每个月都在真省钱,等半年就算再降0.5%,省的还没你等的这几个月多交的利息多。而且refi又不是只能做一次,以后真降多了可以再refi。费用就是几十块的title转移费,大部分credit union不收origination。', '2026-05-20 16:05:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000045', 'd0000000-0000-0000-0005-000000000019', 'a0000000-0000-0000-0000-000000000001', 'hard pull掉个几分,两三个月恢复。注意别把期限重置拉长,剩36期就refi成36期,不然月供好看了,总利息没省多少。', '2026-05-21 09:18:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000020', 'a1000000-0000-0000-0000-000000000035', 'discussion', '毕业季二手车变多了,现在是收车的好时机吗?', '最近逛了几个车行(图),又在群里看到一堆毕业生甩卖,感觉5、6月市面上的二手车明显变多。我正好想给老婆添一台代步车,预算1万5。想问懂行情的:毕业季是买方市场吗?跟毕业生私人买是不是比车行划算很多?会不会有什么风险?', ARRAY['https://upload.wikimedia.org/wikipedia/commons/e/ed/Old_car_dealership_lot_in_Cemmaes_Road_-_geograph.org.uk_-_2950985.jpg'], NULL, NULL, NULL, ARRAY['毕业季','买车','行情'], 'active', '2026-05-16 14:25:00-04', '2026-05-16 14:25:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000046', 'd0000000-0000-0000-0005-000000000020', 'a0000000-0000-0000-0000-000000000008', '毕业季确实是学生车集中出货的窗口,尤其大学城周边,卖家有硬deadline,议价空间大。风险主要两个:一是留学生的车可能有贷款没还清(lien在title上),交易前必须看清title有没有lienholder;二是急卖的车往往保养随缘,花100多做个PPI很值。总体来说,同样的钱在毕业生手里能买到比车行高半级的车。', '2026-05-16 18:50:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000047', 'd0000000-0000-0000-0005-000000000020', 'a0000000-0000-0000-0000-000000000004', '法拉盛这边5月底6月初最明显,微信群一天能刷出七八台。价格好谈,但好车也走得快,看中了别犹豫过夜。', '2026-05-16 20:35:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000048', 'd0000000-0000-0000-0005-000000000020', 'a1000000-0000-0000-0000-000000000010', '我去年6月就是收的毕业生的凯美瑞,比dealer标价便宜2500,车况记录齐全。记得让对方把两把钥匙和保养记录都找齐,学生车这两样最爱丢。', '2026-05-17 11:12:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000021', 'a1000000-0000-0000-0000-000000000009', 'discussion', '接手毕业学长的车,3000块的人情价有什么坑?', '学长毕业回国,一台2015年的Accord开了11万迈,3000块人情价转给我,市场价怎么也得6000往上。车我坐过几次没毛病,但毕竟是第一次买车,想问:这种明显低于市场价的交易,过户时DMV会不会找麻烦?税是按成交价交还是按市场价交?还需要做检查吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['毕业季','二手车'], 'active', '2026-05-12 20:05:00-04', '2026-05-12 20:05:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000049', 'd0000000-0000-0000-0005-000000000021', 'a0000000-0000-0000-0000-000000000008', '纽约私人交易报税价过低,DMV有权按book value征税,3000这个价位对11万迈的车不算离谱,一般能过,带上双方签好的bill of sale就行。人情价也建议花钱做个PPI,不是防学长,是让你自己清楚接下来一年要花什么钱:11万迈的Accord正常该换的件(避震、悬挂胶套)如果都没换过,预算里留1500维护费,心里有数。', '2026-05-13 09:40:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000050', 'd0000000-0000-0000-0005-000000000021', 'a1000000-0000-0000-0000-000000000013', 'title、两把钥匙、保养记录、有没有未处理的罚单和parking ticket,这四样确认好。学长的车最大的好处是车史透明,这比什么Carfax都靠谱。', '2026-05-13 14:22:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000022', 'a1000000-0000-0000-0000-000000000029', 'discussion', '天热胎压从35涨到39,需要放气吗?', '早上冷车打的35psi,中午暴晒加跑了段高速,胎压显示39了,车门框标签写的是35。有点慌,要不要放掉一点?网上有人说热胎压高是正常的不用管,也有人说超过38就危险。到底哪个对?夏天打气应该打低一点预留空间吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['轮胎','夏季'], 'active', '2026-05-19 13:15:00-07', '2026-05-19 13:15:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000051', 'd0000000-0000-0000-0005-000000000022', 'a0000000-0000-0000-0000-000000000007', '不用放!车门标签的35psi指的是冷胎压,轮胎设计时就考虑了行驶升温,热胎升3-5psi完全正常,轮胎侧壁上的max pressure(一般44psi以上)才是别超的线。放掉热胎的气,第二天早上冷车就变成亏气状态,亏气才是爆胎主因。正确做法:早上冷车按标签打35,热了随它去。', '2026-05-19 16:02:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000052', 'd0000000-0000-0000-0005-000000000022', 'a0000000-0000-0000-0000-000000000001', '补充:长途出发前查冷胎压最准,加油站顺手打气那会儿胎已经热了,要打就比标签多打2-3psi补偿。', '2026-05-20 08:30:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000023', 'a1000000-0000-0000-0000-000000000030', 'discussion', '下月开去优胜美地,出发前该自查哪些项目?', '6月初计划全家开去优胜美地,来回400多迈还有山路。车是6万迈的SUV,上次保养是4个月前。不想花冤枉钱做全套dealer inspection,想自己先过一遍。求一个实用的出发前自查清单,哪些自己能看,哪些必须交给店里?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['自驾','保养'], 'active', '2026-05-17 09:10:00-07', '2026-05-17 09:10:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000053', 'd0000000-0000-0000-0005-000000000023', 'a0000000-0000-0000-0000-000000000007', '自己能查的:1. 机油尺液位和颜色;2. 冷却液副水壶液位;3. 胎压含备胎,胎面有无扎钉、磨损是否均匀;4. 所有灯光;5. 雨刮和玻璃水;6. 刹车有无异响、踏板脚感。交给店里的:刹车片厚度测量(轮子不拆不好看准)、电瓶健康度测试、皮带状况。山路多提醒一句:下长坡用低档位控速,别一路踩刹车,刹车热衰减在Yosemite每年都坑几个人。', '2026-05-17 13:45:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000054', 'd0000000-0000-0000-0005-000000000023', 'a1000000-0000-0000-0000-000000000026', '再带上:手机离线地图(园区没信号)、搭电线或应急启动宝、一加仑水。都是几十块的东西,关键时刻能救命。', '2026-05-18 07:58:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000024', 'a1000000-0000-0000-0000-000000000018', 'discussion', '迈阿密暴晒方向盘烫手,遮阳挡真有用吗?', '车停外面半小时,方向盘烫得没法碰,中控台都怕晒裂了。看人推荐前挡遮阳板、贴隔热膜、遮车衣,还有那种太阳能换气扇。这些东西哪些是真有用哪些是智商税?隔热膜是不是所有州都合法?求热带州朋友的实战经验。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['夏季','用车'], 'active', '2026-05-21 11:05:00-04', '2026-05-21 11:05:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000055', 'd0000000-0000-0000-0005-000000000024', 'a1000000-0000-0000-0000-000000000017', '按性价比排:前挡遮阳板(15块,车内温度立降10-15度,方向盘和仪表台直接受益)大于陶瓷隔热膜(前侧窗做下来两三百,长期有效还防UV老化内饰)大于太阳能换气扇(基本智商税,那点风量杯水车薪)。佛州侧窗膜透光率有规定,前侧窗不能太黑,让店里按州标准做就行。', '2026-05-21 14:40:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000056', 'd0000000-0000-0000-0005-000000000024', 'a1000000-0000-0000-0000-000000000025', '沙漠人民补充:上车先开两侧车窗对流十几秒再开空调,降温比干吹空调快一倍。真皮座椅铺个坐垫,不然夏天短裤上车就是铁板烧。', '2026-05-21 16:22:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000025', 'a1000000-0000-0000-0000-000000000020', 'discussion', '空调一开一股霉味,自己能处理吗?', '最近开空调,出风口一股酸霉味,开几分钟会淡一些,但每次上车都被熏一下。车在休斯顿,潮得很。查了下有说换cabin filter的,有说买泡沫清洗剂喷进风道的,还有说要拆开清洗蒸发箱。想问这几种方法该从哪个开始?为什么会发霉?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['空调','异味'], 'active', '2026-05-23 18:30:00-04', '2026-05-23 18:30:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000057', 'd0000000-0000-0000-0005-000000000025', 'a0000000-0000-0000-0000-000000000007', '霉味根源是蒸发箱表面冷凝水加灰尘滋生霉菌,潮湿地区高发。按成本从低到高:1. 换cabin filter(15块自己动手,顺便看旧滤芯是不是已经发黑);2. 泡沫蒸发器清洗剂从外循环进风口或排水管喷入(20块,效果能撑几个月);3. 拆蒸发箱深度清洗(几百块,别轻易走到这步)。日常预防最重要:到目的地前几分钟关AC只开风,把蒸发箱吹干,霉菌就不容易长。', '2026-05-24 09:15:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000058', 'd0000000-0000-0000-0005-000000000025', 'a1000000-0000-0000-0000-000000000018', '停车前关AC开自然风这招亲测有效,我坚持半年了没再犯。另外别用那种加香的喷雾盖味道,越盖越难闻。', '2026-05-24 12:44:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000026', 'a1000000-0000-0000-0000-000000000032', 'discussion', '超市停车场被剐蹭对方跑了,还有的救吗?', '中午去超市,回来发现后保险杠一道深划痕带白漆,对方人车都没影,雨刮上也没留条。气死。问了超市客服说监控只拍出入口,拍不到车位。这种情况:1. 报警有用吗?2. 走自己保险的话记录会算我有责吗?deductible 500,修一下估价800,感觉走保险不太值?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['剐蹭','保险'], 'active', '2026-05-02 14:10:00-07', '2026-05-02 14:10:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000059', 'd0000000-0000-0000-0005-000000000026', 'a1000000-0000-0000-0000-000000000002', '报警可以备案(网上就能填hit and run report),主要用处是万一以后找到对方或者保险需要证明。走自己collision,hit and run算not-at-fault不计你责任,但有些保险公司照样会影响续保价,而且800减500就剩300,确实不太值。我会选:留下报案记录,自费找华人钣喷店,这种深度划痕带补漆大概300-400能搞定。', '2026-05-02 17:35:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000060', 'd0000000-0000-0000-0005-000000000026', 'a0000000-0000-0000-0000-000000000001', '也看看你保单有没有uninsured motorist property damage(UMPD),有的州hit and run可以走这个,deductible很低甚至没有。打电话问清楚再决定。', '2026-05-03 09:28:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000061', 'd0000000-0000-0000-0005-000000000026', 'a1000000-0000-0000-0000-000000000034', '圣盖博谷这边建议多找几家店问,同一道划痕报价能差一倍。顺便装个带停车监控的行车记录仪吧,下次至少能拍到人。', '2026-05-03 15:50:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000027', 'a0000000-0000-0000-0000-000000000006', 'discussion', '出保在即,dealer推销延保2800值得买吗?', '车快过5年6万迈保修期了,dealer打电话推销延保,3年3.6万迈要2800,说以后随便修一次变速箱就回本。车是日系,目前没大毛病。网上说延保是dealer利润最高的产品之一,但真出大修不买又心疼。大家怎么决策的?(配图是上周去店里拍的)', ARRAY['https://upload.wikimedia.org/wikipedia/commons/b/b8/Used_Car_Lot%2C_Holyhead_Road%2C_Valley_-_geograph.org.uk_-_877427.jpg'], NULL, NULL, NULL, ARRAY['延保','保修'], 'active', '2026-05-09 09:55:00-07', '2026-05-09 09:55:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000062', 'd0000000-0000-0000-0005-000000000027', 'a0000000-0000-0000-0000-000000000008', '几个事实:1. dealer卖的延保马上还价,2800的说不定1800就卖,他们margin极高;2. 看清是exclusionary(除列出的都保)还是列举式(只保列出的),后者坑多;3. 日系车5-9万迈这个区间大修概率很低,延保对德系车主更有意义。我的一般建议:日系可靠车型,把2800存进专门的修车账户,大概率用不完。', '2026-05-09 13:20:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000063', 'd0000000-0000-0000-0005-000000000027', 'a0000000-0000-0000-0000-000000000007', '从修车角度说:延保理赔时对保养记录卡得很严,少一次机油记录就可能拒赔,而且很多延保指定理赔流程,修车周期被拖长。真要买,买厂家官方延保,别买第三方的,第三方拒赔是家常便饭。', '2026-05-09 18:44:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000064', 'd0000000-0000-0000-0005-000000000027', 'a1000000-0000-0000-0000-000000000039', '我们家两台车都没买,五年下来"延保账户"里存的钱只花掉过一次300块的传感器,剩下的成了旅游基金。', '2026-05-10 10:12:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000028', 'a1000000-0000-0000-0000-000000000016', 'discussion', '毕业刚拿offer,买第一辆车预算怎么定合理?', '8月入职,年薪听着还行但要还学生贷款。上班地方没公交,必须买车。纠结买1万以内的高龄二手过渡,还是直接上2万多的准新车开五六年。信用记录短,贷款利率据说会很难看。学长学姐们第一辆车都怎么买的?后悔过吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['毕业季','买车','预算'], 'active', '2026-05-05 19:30:00-04', '2026-05-05 19:30:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000065', 'd0000000-0000-0000-0005-000000000028', 'a0000000-0000-0000-0000-000000000008', '经验公式:落地价不超过年收入的35%,月供加保险加油不超过月到手的15%。信用短利率高,所以尽量多付首付少贷,或者干脆买台1万2到1万5的丰田本田全款或短贷,开三年信用养起来了再换。最后悔的路线通常是:刚工作就贷一台超预算的车,每月被月供压得不敢辞职。', '2026-05-06 08:45:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000066', 'd0000000-0000-0000-0005-000000000028', 'a1000000-0000-0000-0000-000000000024', '我第一辆车9500的卡罗拉全款,开了四年卖掉还回血6000。第一辆车的使命是可靠加便宜,面子这东西等RSU vest了再说。', '2026-05-06 13:20:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000029', 'a1000000-0000-0000-0000-000000000033', 'discussion', '加州smog没过,故障灯又没亮,怎么回事?', '车该续注册了,开去smog店居然fail,技师说是monitor not ready,让我再开一阵子回来复检。我一头雾水:仪表盘没有任何故障灯,为什么会not ready?是不是因为上周我换电瓶断过电?再开多久才ready?会不会耽误注册截止日期?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['smog','年检'], 'active', '2026-05-13 15:40:00-07', '2026-05-13 15:40:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000067', 'd0000000-0000-0000-0005-000000000029', 'a0000000-0000-0000-0000-000000000007', '就是换电瓶断电闹的。断电会清空车载电脑的自检监测(monitor),各系统要在特定工况下跑完自检才会置ready,smog要求大部分monitor完成。解决方法:跑一个drive cycle,通俗版是混合工况开100-200迈,包含冷启动、匀速55-60迈巡航20分钟、市区走走停停,一般几天通勤就够,个别车催化器和EVAP的monitor比较倔。复检前让店里免费扫一下ready状态再上线,别白交钱。', '2026-05-13 18:25:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000068', 'd0000000-0000-0000-0005-000000000029', 'a1000000-0000-0000-0000-000000000003', '罗兰岗这边smog店基本都免费帮你查ready没,顺路进去看一眼再决定。注册要过期的话先把注册费在网上交了,smog后补,不产生迟交罚款。', '2026-05-14 09:50:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000069', 'd0000000-0000-0000-0005-000000000029', 'a1000000-0000-0000-0000-000000000037', '我上次也是这样,开了一周高速通勤就ready了,复检秒过。以后smog前两周别动电瓶。', '2026-05-14 14:33:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000030', 'a1000000-0000-0000-0000-000000000008', 'discussion', '雨后天窗滴水,是密封条坏了吗?', '波特兰连下几天雨,发现A柱内饰和主驾脚垫是湿的,晴天开天窗听着也有异响。网上说天窗本来就不是完全密封,靠排水槽排水?那漏水到底是密封条老化还是排水管堵了?自己能处理吗?担心拖久了泡出霉味,电路泡坏更麻烦。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['天窗','漏水'], 'active', '2026-05-24 10:20:00-07', '2026-05-24 10:20:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000070', 'd0000000-0000-0000-0005-000000000030', 'a0000000-0000-0000-0000-000000000007', '你查到的说法对,天窗设计就允许少量水进入,再经四角的排水管排到车底,所以九成的天窗漏水是排水管被树叶灰尘堵了,不是密封条。自查:开天窗往前角排水槽倒一杯水,水很快消失并从车底前轮附近滴出就是通畅;积住不动就是堵了。疏通用细的塑料软线轻轻捅加吸尘器吸,千万别用高压气猛吹,排水管接头会被吹脱,那就得拆顶棚了。脚垫抓紧拿出来晒,地毯下面的隔音棉吸了水很难干。', '2026-05-24 13:55:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000071', 'd0000000-0000-0000-0005-000000000030', 'a1000000-0000-0000-0000-000000000007', '西北老司机的觉悟:每年秋天落叶季结束和春天各清一次排水槽,停树底下的车尤其要勤。我的车十年了没漏过。', '2026-05-25 08:12:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000031', 'a1000000-0000-0000-0000-000000000022', 'discussion', '轮胎才磨掉一半但已经七年了,要换吗?', '换季检查发现四条胎DOT码是2019年产的,胎纹还有6/32,平时开得少。店里说橡胶老化建议换,网上又有人说十年内都能用。轮胎寿命到底看年限还是看胎纹?老化的胎有什么直观判断方法?高速跑长途会不会有风险?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['轮胎','安全'], 'active', '2026-05-03 11:25:00-04', '2026-05-03 11:25:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000072', 'd0000000-0000-0000-0005-000000000031', 'a0000000-0000-0000-0000-000000000007', '两个都要看,先到为准。行业普遍建议6年起密切检查、10年强制退役,但这是理想存放条件,芝加哥冬夏温差大、路盐腐蚀,实际寿命打个八折。直观判断:胎面和侧壁有无细密龟裂纹,尤其胎肩沟槽底部,用手指扒开看;橡胶发硬发亮也是老化标志。胎纹6/32日常够用,但七年的胎抓地力和排水性早不是纸面数据了。要跑高速长途,我建议换,四条胎的钱买不来命。', '2026-05-03 15:40:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000073', 'd0000000-0000-0000-0005-000000000031', 'a1000000-0000-0000-0000-000000000005', '补个小知识:DOT后四位是生产周加年份,比如3519就是2019年第35周。买新胎时也看一眼,有些店会把库存两三年的"新胎"卖给你。', '2026-05-04 09:22:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000032', 'a1000000-0000-0000-0000-000000000039', 'discussion', '电车夏天开空调,续航掉得比冬天少吗?', '第一年开电车过夏天。冬天开暖气续航打七五折我领教过了,夏天空调会掉多少?网上说空调比暖气省电很多,是真的吗?另外暴晒停车时用不用留着通风功能?会不会把电耗光?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['电车','夏季'], 'active', '2026-05-26 20:15:00-07', '2026-05-26 20:15:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000074', 'd0000000-0000-0000-0005-000000000032', 'a0000000-0000-0000-0000-000000000003', '真的,空调压缩机功率2-3kW,电阻式暖气动辄5-7kW,所以夏天续航一般只掉5-10%,比冬天温柔多了。高速上反而开窗更费电(风阻),关窗开空调是对的。', '2026-05-27 08:35:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000075', 'd0000000-0000-0000-0005-000000000032', 'a1000000-0000-0000-0000-000000000038', '暴晒防过热的通风保护一小时也就1-2%的电,停一下午没问题,长期停机场那种再关。夏天真正伤电池的是暴晒下长期保持满电,日常充到80%对电池更友好。', '2026-05-27 12:10:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000033', 'a1000000-0000-0000-0000-000000000034', 'discussion', '买二手车前的PPI去哪做?大概什么价?', '看中一台私人卖的2019 CX-5,约了周末看车(先去附近车行转了圈感受行情,图)。都说买前要做pre-purchase inspection,但具体去哪做?dealer、连锁店还是华人修车铺?大概多少钱?卖家不愿意让我把车开走检查怎么办?检查报告出来哪些问题是红线该直接放弃?', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Car_dealership%2C_Rotherham_-_geograph.org.uk_-_2582974.jpg/960px-Car_dealership%2C_Rotherham_-_geograph.org.uk_-_2582974.jpg'], NULL, NULL, NULL, ARRAY['验车','二手车'], 'active', '2026-05-07 16:50:00-07', '2026-05-07 16:50:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000076', 'd0000000-0000-0000-0005-000000000033', 'a0000000-0000-0000-0000-000000000007', '一般100-200,独立修车铺性价比最高,要求升举车看底盘、电脑扫码、试车,出纸质或照片报告。卖家不放心可以让他一起把车开过来,正经卖家都配合,死活不让做PPI的车直接pass,这本身就是答案。红线:事故伤到大梁纵梁、变速箱顿挫打滑、发动机渗油成片、泡水痕迹(座椅导轨锈、保险丝盒泥沙)。小件如刹车片轮胎快到寿命,不是红线,是砍价筹码。', '2026-05-07 19:40:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000077', 'd0000000-0000-0000-0005-000000000033', 'a0000000-0000-0000-0000-000000000008', '华人铺子的好处是可以用中文细问,让师傅按"如果你家里人买这台车"的标准说实话。另外CX-5这车本身可靠性不错,重点查有没有事故修复痕迹就好。', '2026-05-08 10:15:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000034', 'a1000000-0000-0000-0000-000000000017', 'discussion', 'Prius三元催化被偷,启动像拖拉机,怎么办?', '早上打火轰一声像拖拉机,下车一看车底排气管被切了一截,老Prius的三元催化被偷了,人都麻了。想问:1. 走保险的话是comprehensive吗?会涨保费吗?2. 修下来大概多少钱?用原厂件还是副厂件?3. 装防盗板有用吗?怎么防再次被偷?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['被盗','保险'], 'active', '2026-05-10 07:45:00-04', '2026-05-10 07:45:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000078', 'd0000000-0000-0000-0005-000000000034', 'a0000000-0000-0000-0000-000000000007', '走comprehensive,catalytic converter theft是高发理赔,deductible之外基本全赔。修的话原厂件贵到离谱(Prius的催化器贵金属含量高,所以才总被偷),佛州可以装合规副厂件,几百到一千多就能下来;加州那种要求CARB认证件的州才必须上贵的。修完立刻装防盗铝板或焊防盗笼,150-300,再被偷的概率大降,小偷图快,看见护板一般直接找下一台。', '2026-05-10 11:20:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000079', 'd0000000-0000-0000-0005-000000000034', 'a1000000-0000-0000-0000-000000000012', 'comprehensive理赔一般不影响你的at-fault记录,但理赔次数多了续保还是可能小涨。报个警拿case号,保险要用。', '2026-05-10 15:33:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000080', 'd0000000-0000-0000-0005-000000000034', 'a1000000-0000-0000-0000-000000000018', '我们小区连着丢了三台,后来物业加了摄像头,大家都装了护板,再没丢过。停车尽量停亮的地方,或者车尾对墙,让千斤顶没地方下。', '2026-05-11 09:08:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000035', 'a1000000-0000-0000-0000-000000000023', 'discussion', '从密歇根搬去俄亥俄,车的手续要重办哪些?', '下个月因为工作搬去Columbus。车是我名下、贷款已还清。查了下好像要换驾照、换title、换注册、换保险?这些有先后顺序吗?有没有时间限制?车检要重做吗?保险是搬过去当天就得换地址吗?怕漏办哪样被罚。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['搬家','过户'], 'active', '2026-05-14 12:30:00-04', '2026-05-14 12:30:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000081', 'd0000000-0000-0000-0005-000000000035', 'a1000000-0000-0000-0000-000000000015', '顺序建议:1. 先把保险改到新地址(电话十分钟,俄亥俄费率说不定还降);2. 落地后先换驾照(要住址证明,租约或水电账单);3. 拿着新驾照加原title去BMV做title转换和注册换牌。俄亥俄给新居民30天窗口,别拖。俄亥俄没有全州安全检查,比较省事。原车牌按密歇根的规则处理掉就行。', '2026-05-14 16:15:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000082', 'd0000000-0000-0000-0005-000000000035', 'a0000000-0000-0000-0000-000000000008', '补充:有贷款的朋友要让lienholder把title寄到新州DMV,流程久要提前办。你还清了就简单,title在手直接办,记得把lien release文件也带上以防万一。', '2026-05-15 10:40:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000036', 'a1000000-0000-0000-0000-000000000004', 'discussion', '国家公园租车,柜台推销的保险要全拒吗?', '订好了6月盐湖城取车玩Utah大环线。柜台保险一天加50多,比车费还贵。我自己有车,personal auto policy据说能cover租车?信用卡好像也有rental coverage?这两个够不够?LDW、SLI这些术语看得头大,到底哪些必须要?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['租车','保险','国家公园'], 'active', '2026-05-15 21:05:00-07', '2026-05-15 21:05:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000083', 'd0000000-0000-0000-0005-000000000036', 'a1000000-0000-0000-0000-000000000027', '理清三层:1. 你自己车险的liability和collision一般延伸到美国境内租车,打电话跟agent确认一下;2. 信用卡(很多Visa和万事达)提供的是secondary的CDW,少数卡是primary,全程用这张卡付租车费才生效;3. 柜台LDW唯一优势是出险不走你自己保险、不影响费率。我的做法:确认好前两层,柜台全拒。大环线多是铺装路,别开去纯off-road就不会触发租车合同的免责条款。', '2026-05-16 09:30:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000084', 'd0000000-0000-0000-0005-000000000036', 'a1000000-0000-0000-0000-000000000002', '提醒看下你的信用卡条款有没有把大型SUV或皮卡排除在外,租Suburban这种级别有的卡不保。用对卡,每天50多的LDW拒得理直气壮。', '2026-05-16 13:12:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000037', 'a1000000-0000-0000-0000-000000000010', 'discussion', '纽约搬去达拉斯,车是托运还是自己开过去?', '全家搬去达拉斯,1550迈。托运报价open trailer大概1100-1300,7-10天到。自己开的话油钱200多加路上两晚酒店加三天时间。老婆嫌开车累,我觉得托运又贵又怕磕碰。有托运过的朋友说说体验?报价是不是还会坐地起价?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['搬家','托运'], 'active', '2026-05-11 18:40:00-04', '2026-05-11 18:40:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000085', 'd0000000-0000-0000-0005-000000000037', 'a1000000-0000-0000-0000-000000000019', '托运找broker要有心理准备:报价是"预估",旺季司机不接单就会让你加钱,发车日也不精确。选评价好的、别贪最低价,低价单最容易被放鸽子。提车时当着司机面绕车拍视频,和发车前的照片对比,有磕碰当场写在bill of lading上,回头再扯皮就难了。', '2026-05-12 09:25:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000086', 'd0000000-0000-0000-0005-000000000037', 'a1000000-0000-0000-0000-000000000023', '我两年前托运过,整体顺利。建议油箱留四分之一、车里别放贵重物品(托运保险不保车内物品)。如果你们本来就要飞,托运其实不亏;要是想顺路玩Nashville和Memphis,自驾就当搬家旅行也挺好。', '2026-05-12 14:50:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000038', 'a1000000-0000-0000-0000-000000000036', 'discussion', '行车记录仪求推荐,走暗线自己能搞定吗?', '上个月目睹一起碰瓷,吓得赶紧研究行车记录仪。预算150左右,想要前后双录加停车监控。看了一圈70mai、Viofo、Vantrue不知道怎么选。另外走暗线是不是要接保险盒?自己动手难度大吗?会不会把车电瓶耗干?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['行车记录仪'], 'active', '2026-05-18 20:30:00-04', '2026-05-18 20:30:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000087', 'd0000000-0000-0000-0005-000000000038', 'a1000000-0000-0000-0000-000000000035', '这个价位Viofo和70mai都行,画质别只看分辨率,夜间车牌能不能拍清才是关键,去油管搜实拍对比。停车监控必须配降压线接保险丝盒,选ACC和常电两个位,自带低压保护,设到12.0V就不会亏电瓶。', '2026-05-19 08:55:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000088', 'd0000000-0000-0000-0005-000000000038', 'a1000000-0000-0000-0000-000000000006', '走线不难:沿A柱内饰缝塞进去,到保险丝盒用取电夹,全程半小时,油管照着做就行。A柱有气帘的车注意线别压在气囊展开路径上,塞在原车线束一侧。', '2026-05-19 12:40:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000039', 'a1000000-0000-0000-0000-000000000003', 'discussion', '油价又上来了,只加87会伤发动机吗?', '湾区91都快6块了。我的车油箱盖写的premium recommended,不是required。以前一直乖乖加91,最近想改加87,一箱能省七八块。recommended和required到底差在哪?加87会不会积碳、爆震、伤发动机?动力损失明显吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['油价','用车'], 'active', '2026-05-27 17:25:00-07', '2026-05-27 17:25:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000089', 'd0000000-0000-0000-0005-000000000039', 'a0000000-0000-0000-0000-000000000007', 'recommended的意思是:加91发挥标称动力,加87也安全,行车电脑探测到爆震会自动推迟点火,代价是动力和油耗略差,长期用不伤发动机。required就不一样了,高压缩比设计,常年加87有爆震风险,别省这个钱。你是recommended,放心加87,要是感觉动力肉、油耗反而升了,再换回来,让数据说话。日常代步基本感觉不出来。', '2026-05-27 20:10:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000090', 'd0000000-0000-0000-0005-000000000039', 'a1000000-0000-0000-0000-000000000033', '实测党路过:我涡轮车recommended 91,加87市区没区别,上坡满载和大脚超车能感觉出来软一点。折中方案:平时87,跑长途或者夏天拉满一车人时加91。', '2026-05-28 09:35:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000040', 'a0000000-0000-0000-0000-000000000001', 'discussion', '私卖车收款,什么方式最不容易被骗?', '准备把家里第二台车私卖,标价1万8。以前只卖过三五千的车收现金,这次金额大了有点虚。听过各种骗局:假cashier''s check、Zelle撤回、假付款截图。请问这个金额:1. 最稳的收款方式是什么?2. 一手交钱一手交货的顺序怎么安排?3. 约在银行见面靠谱吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['卖车','防骗'], 'active', '2026-05-06 09:15:00-07', '2026-05-06 09:15:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000091', 'd0000000-0000-0000-0005-000000000040', 'a0000000-0000-0000-0000-000000000008', '最稳:约在你的银行网点里当面交易,买家现场取现金存进你账户,或者当柜开cashier''s check由柜员验真并立即存入,确认无误再签title。Zelle本人操作其实也安全(没有chargeback),风险在于假截图,所以必须你自己刷新银行app看到余额变化。原则就一条:钱没落到你账户里的任何"凭证"都不算数。', '2026-05-06 12:40:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000092', 'd0000000-0000-0000-0005-000000000040', 'a0000000-0000-0000-0000-000000000004', '补个细节:约银行营业时间交易还有个好处,大额现金柜员帮你点,验钞机比你手搓强。周末着急的买家让他等周一,真买家不会因为这个跑掉。', '2026-05-06 19:22:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000093', 'd0000000-0000-0000-0005-000000000040', 'a1000000-0000-0000-0000-000000000001', '我上个月刚私卖,Zelle分两笔(每日限额),我盯着账户到账才交钥匙。另外交车后马上提交DMV的Notice of Transfer,免得他不去过户,罚单过路费都找你。', '2026-05-07 08:50:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000041', 'a1000000-0000-0000-0000-000000000005', 'discussion', 'Costco换轮胎和America''s Tire比,该选哪家?', '四条胎该换了。Costco会员价含安装、氮气、终身补胎和rotation;America''s Tire经常有rebate,免费补胎还不限购买地。价格算下来差不太多。用过两家的说说:预约等待、补胎服务、rotation方便程度,实际体验差别大吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['轮胎'], 'active', '2026-05-21 13:40:00-07', '2026-05-21 13:40:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000094', 'd0000000-0000-0000-0005-000000000041', 'a1000000-0000-0000-0000-000000000001', '两家都不错,决策点其实是"以后你去哪家方便"。Costco便宜稳定但预约排队感人,周末补个胎可能要等两三小时;America''s Tire门店多、walk-in补胎快、免费补胎连别家买的胎都补(拉客手段但真香)。我最后选后者就是图快。', '2026-05-21 17:05:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000095', 'd0000000-0000-0000-0005-000000000041', 'a1000000-0000-0000-0000-000000000031', 'Costco老会员提示:等每年那几次"买四条省150+"的米其林普利司通活动再下手,叠加会员回馈能便宜不少。不着急的话把两家活动价都盯一个月。', '2026-05-22 09:28:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000042', 'a1000000-0000-0000-0000-000000000007', 'discussion', '夏天带狗自驾要注意什么?后座怎么布置?', '领养的金毛一岁了,打算夏天带它跑几个州立公园。第一次带狗长途,想请教:1. 后座铺什么既防毛又防抓?2. 狗需要系"安全带"吗?华州有规定吗?3. 中途休息频率多少合适?最担心夏天停车买东西那十几分钟,开条窗缝够吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['宠物','自驾'], 'active', '2026-05-25 08:55:00-07', '2026-05-25 08:55:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000096', 'd0000000-0000-0000-0005-000000000042', 'a1000000-0000-0000-0000-000000000008', '后座吊床式seat cover加安全带扣胸背带,亲测金毛适用,急刹车时真能保命。休息每2小时一次,让它喝水撒欢十分钟。重点说停车:夏天开条缝根本没用,车内十分钟就能到40多度,宁可轮流留人在车里开着空调,或者只去能带狗进的地方。华州虽然没有专门的狗约束法条,但狗干扰驾驶可以按distracted driving处理。', '2026-05-25 12:30:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000097', 'd0000000-0000-0000-0005-000000000042', 'a1000000-0000-0000-0000-000000000040', '带上折叠水碗、旧毛巾、还有它熟悉的毯子,狗在陌生环境闻到自己味道会安定很多。晕车的狗出发前两小时别喂食。', '2026-05-25 18:15:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000043', 'a0000000-0000-0000-0000-000000000004', 'discussion', 'AAA会员年年续,到底值不值?', '续费通知又来了,basic涨到70多一年。用了三年就叫过一次搭电。家里两台车都不算新,老婆说留着安心,我算算这些年会费都够买个应急启动宝加补胎套装了。大家怎么看?有没有别的道路救援更划算?保险自带的救援够用吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['道路救援','AAA'], 'active', '2026-05-08 11:20:00-04', '2026-05-08 11:20:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000098', 'd0000000-0000-0000-0005-000000000043', 'a1000000-0000-0000-0000-000000000011', '我站留着。去年我半夜在高速上爆胎,AAA四十分钟到,拖到家门口的修车铺,一分没花。这种时刻你不会想跟第三方救援砍价扯皮。而且AAA隐藏福利不少:DMV业务代办(纽约排队地狱懂的都懂)、酒店租车折扣、免费公证。', '2026-05-08 14:45:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000099', 'd0000000-0000-0000-0005-000000000043', 'a1000000-0000-0000-0000-000000000036', '保险自带的roadside其实很便宜(一年十几刀)也能用,但有说法叫多了可能影响续保记录;AAA的救援记录跟保险无关,这是它的核心优势。', '2026-05-08 20:10:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000100', 'd0000000-0000-0000-0005-000000000043', 'a0000000-0000-0000-0000-000000000001', '家有老人小孩或者老车,留;年轻人加新车、会自己搭电换胎的,可以砍。另外续费前打电话说要取消,经常给你打个折。', '2026-05-09 10:35:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000044', 'a0000000-0000-0000-0000-000000000005', 'discussion', '智能钥匙丢了,dealer配一把要400,有平替吗?', '手贱把唯一的备用钥匙也搞丢了,现在全家就剩一把钥匙,慌得不行。dealer报价:钥匙加编程400多,还要预约等件。锁匠说200能搞定,网上钥匙壳几十块。想问:1. 锁匠配的和dealer的有区别吗?2. 网上买壳自己配靠谱吗?3. 钥匙真的全丢光了是不是天价?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['钥匙','用车'], 'active', '2026-05-16 09:40:00-04', '2026-05-16 09:40:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000101', 'd0000000-0000-0000-0005-000000000044', 'a0000000-0000-0000-0000-000000000007', '汽车锁匠是正解,他们有正规编程设备,钥匙用OEM或高质量副厂的,200上下很正常,还能上门服务免拖车。网上自购钥匙要严格对准FCC ID,买错编不进去,省的钱赔在折腾上。最后一个问题很关键:全部钥匙丢光的话很多车要换防盗模块或走安全流程,费用翻几倍,所以趁现在还有一把,抓紧配!别等真丢光了才动。', '2026-05-16 12:15:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000102', 'd0000000-0000-0000-0005-000000000044', 'a1000000-0000-0000-0000-000000000020', '推荐找本地华人锁匠,微信群搜一下,我配的丰田智能钥匙180全包,当场测试所有功能再给钱。', '2026-05-16 18:50:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000045', 'a1000000-0000-0000-0000-000000000001', 'discussion', '机油到底5000迈换还是按厂家说的10000迈?', '说明书写全合成10000迈或一年一换,但华人修车铺师傅都说5000就得换,说加州走走停停伤机油。到底听谁的?我一年开1万2左右,一半是通勤堵车。10000一换省钱省事,但怕伤发动机;5000一换又觉得是店家想赚钱。有没有客观标准?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['机油','保养'], 'active', '2026-05-19 19:05:00-07', '2026-05-19 19:05:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000103', 'd0000000-0000-0000-0005-000000000045', 'a0000000-0000-0000-0000-000000000007', '利益相关但说实话:关键看工况。厂家的10000迈基于"正常工况",而说明书里severe service(频繁短途、走走停停、极端温度)那页写的间隔往往就是5000-7500,湾区通勤堵车正属于severe。我的建议取中间:全合成7000-7500一换,既不交智商税也不赌发动机。涡轮车、烧机油车型、经常短途的往5000靠。比里程更要紧的是别超时间,开得少也一年一换。', '2026-05-20 08:30:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000104', 'd0000000-0000-0000-0005-000000000045', 'a0000000-0000-0000-0000-000000000001', '我两台车都7500一换,一台开到18万迈了不烧机油。比纠结间隔更重要的是每个月抽根机油尺看看液位,很多发动机是先亏机油亏坏的,不是机油老化坏的。', '2026-05-20 12:15:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000105', 'd0000000-0000-0000-0005-000000000045', 'a1000000-0000-0000-0000-000000000030', '有条件的可以做次机油送检(Blackstone,30多刀),报告告诉你你的工况下机油还剩多少寿命,用数据结束争论。', '2026-05-21 10:40:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000046', 'a1000000-0000-0000-0000-000000000028', 'discussion', '租车公司退役车便宜一大截,能买吗?', '看到Hertz Car Sales在清库存,同年份同配置比dealer便宜15-20%,里程3-5万,明码标价不砍价。心动但犹豫:租车被那么多人开过,是不是伤得厉害?保养记录有吗?听说还有买回来发现是事故修复的?想听买过的人说说。(图为附近车场)', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Palmyra_back_from_Broad_-_used_car_lot%2C_Mid-City_New_Orleans_3.jpg/960px-Palmyra_back_from_Broad_-_used_car_lot%2C_Mid-City_New_Orleans_3.jpg'], NULL, NULL, NULL, ARRAY['二手车','买车'], 'active', '2026-05-28 12:10:00-07', '2026-05-28 12:10:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000106', 'd0000000-0000-0000-0005-000000000046', 'a0000000-0000-0000-0000-000000000008', '租车退役车是"均值不错、方差大":保养按公司流程走(记录能要到),但驾驶习惯没人爱惜。适合买的人:要冷门配置、代步定位、愿意做PPI的。注意三点:1. Carfax上的rental记录不影响你用,但影响你以后卖,下家也会看到;2. 一定查title是否clean,大批量处理时偶有事故修复车流入;3. 同款多台可选时,选里程低加轮胎刹车剩得多的,这就是白送的几百块。', '2026-05-28 15:35:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000107', 'd0000000-0000-0000-0005-000000000046', 'a0000000-0000-0000-0000-000000000005', '我2023年在Hertz买过一台Corolla,两年了零毛病,便宜的3000块真香。就是提车时内饰有股租车味,做了个深度清洁。', '2026-05-28 19:20:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000108', 'd0000000-0000-0000-0005-000000000046', 'a1000000-0000-0000-0000-000000000025', '补充个细节:租车公司的车基本是乞丐版配置,买前确认你要的功能(CarPlay、盲点监测)有没有,别只看年份便宜。', '2026-05-29 09:05:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000047', 'a0000000-0000-0000-0000-000000000001', 'review', '2022 RAV4混动两年4万迈长测:省油但不完美', E'两年前在dealer提的(图是当时车行拍的),两年4万迈,说说真实感受。\n\n省油是真省:综合38-40MPG,同尺寸汽油SUV基本25上下,一年油钱省800多。可靠性无可挑剔,除了保养没进过店。空间后排和后备箱都够家用,全家出游没压力。\n\n缺点也有:1. 发动机高转声音大,上坡地板油像拖拉机;2. 悬挂偏硬,过减速带后排颠;3. 车机反应一般,好在有CarPlay;4. 12v小电瓶容量小,停两周就亏电,回国一个月回来叫了救援。\n\n保值率吓人,现在二手价比我落地价没跌多少。总结:家用买菜通勤长途全能,想要驾驶乐趣的绕道。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/5/52/Used_car_lot_-_geograph.org.uk_-_1036517.jpg'], 'Toyota', 'RAV4 Hybrid', 2022, ARRAY['车主长测','混动'], 'active', '2026-05-10 15:30:00-07', '2026-05-10 15:30:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000048', 'a0000000-0000-0000-0000-000000000002', 'review', '毕业前把2019思域卖了:四年留学用车总账', E'交车那天在车行门口拍了张照留念(图)。四年前1万6买的二手2019 Civic,4万迈接手,现在7万2迈,1万1卖给了学弟。\n\n算总账:折旧5000,四年保险7600(留学生保险是真贵),保养轮胎约1800,油钱6000左右,罚单两张300。平均下来一年5200,一个月430,比想象中便宜。\n\n思域本身没得挑:零大修,就换过一次电瓶和一套胎,油耗34MPG。给学弟学妹的建议:买保有量大的日系,配件便宜谁都会修;保险多要几家报价,差价惊人;卖车提前一个月挂,毕业周人人都在甩卖,价格血崩。\n\n四年谢谢这台小车陪我跑遍加州。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/e/ed/Old_car_dealership_lot_in_Cemmaes_Road_-_geograph.org.uk_-_2950985.jpg'], 'Honda', 'Civic', 2019, ARRAY['毕业季','卖车'], 'active', '2026-05-20 11:20:00-07', '2026-05-20 11:20:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000049', 'a1000000-0000-0000-0000-000000000039', 'review', 'Model Y一年2万迈:西雅图用车实录', E'去年提的2023 Model Y长续航,一年2万迈汇报。\n\n先说好的:加速和安静就不提了,最大惊喜是省心,一年唯一一次"保养"是补玻璃水和调胎压;家充电费一迈成本4分钱,比之前的油车一年省了大约1500。西雅图冬天阴冷,续航打八折,热泵比朋友的老款强不少。\n\n槽点:1. 悬挂硬,烂路很颠;2. 雨天单踏板要适应;3. 玻璃车顶夏天晒,贴了膜好多了;4. 车漆偏软,前杠已经两个石子坑。\n\nFSD试用了一个月,高速好用,市区还是自己开踏实。总体推荐给通勤族,能家充的话体验翻倍。', ARRAY[]::text[], 'Tesla', 'Model Y', 2023, ARRAY['电车','车主长测'], 'active', '2026-05-05 20:45:00-07', '2026-05-05 20:45:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000050', 'a0000000-0000-0000-0000-000000000008', 'review', '毕业季卖车不亏钱:六周时间线攻略', E'又到毕业季,每年都有同学临走前三天贱卖车,这篇给个时间线。\n\n【T-6周】查行情:KBB和Edmunds打底,再看本地和微信群同款实际挂价,取中上定价,留砍价空间。\n\n【T-5周】整备:洗车打蜡吸尘,50块的detailing能多卖500;拍照选晴天空旷停车场,拍够20张,含内饰和瑕疵。\n\n【T-4周】挂出:群里、FB Marketplace、Craigslist同时挂,写清"X月X日交车",筛掉低球买家。\n\n【T-2周】看车试驾:约白天公共场所,同行一人;谈成收定金200-500写进收据。\n\n【T-3天】保底方案:联系CarMax和Carvana拿报价,私卖没成直接走保底。\n\n【交车日】银行里一手交钱一手签title,交DMV转让通知,取消保险。\n\n记住:时间是卖家最大的筹码,别把自己逼到机票前一天。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['毕业季','卖车','攻略'], 'active', '2026-05-01 09:00:00-07', '2026-05-01 09:00:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000051', 'a0000000-0000-0000-0000-000000000005', 'review', 'Memorial Day陪闺蜜买车实录:砍掉2400', E'昨天陪闺蜜在两家dealer之间周旋了一下午(图是第二家的场子),记录一下过程给大家参考。目标:一台2022 CR-V,第一家标价26500。\n\n第一回合:销售报out-the-door 29200,里面塞了1295的"protection package"和doc fee以外的杂费。我们逐项问,贴膜防锈GPS全拒,销售说"已经装车上了",标准话术,坚持不要就是能去掉。\n\n第二回合:亮出第二家同款的书面报价27400 OTD,销售进去"请示经理"两次,降到27000。\n\n第三回合:起身要走,经理出面,最终26800 OTD成交,比第一次报价省2400。\n\n心得:1. 节日人多,销售没耐心磨,书面竞价最管用;2. 只谈OTD价;3. 财务室里的延保和gap一律"回家考虑";4. 假期最后一天傍晚去,效果加倍。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Palmyra_back_from_Broad_-_used_car_lot%2C_Mid-City_New_Orleans_1.jpg/960px-Palmyra_back_from_Broad_-_used_car_lot%2C_Mid-City_New_Orleans_1.jpg'], NULL, NULL, NULL, ARRAY['砍价','买车'], 'active', '2026-05-26 10:15:00-04', '2026-05-26 10:15:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000052', 'a1000000-0000-0000-0000-000000000003', 'review', '2018 ES 300h八万迈:中年人的舒适区', E'三年前收的二手2018 ES 300h,当时5万迈,现在8万。当初在IS和ES之间选了舒适路线,现在看选对了。\n\n油耗:混动系统市区通勤42MPG,洛杉矶到湾区一箱油轻松单程。舒适性:座椅和隔音是这个价位的天花板,丈母娘上车就夸。可靠性:三年除保养只换过刹车片和一颗轮速传感器,雷家品质名不虚传。\n\n缺点:动力就是够用水平,别期待推背;车机老古董,后来加装了CarPlay盒子救活;后排中间地台偏高。保养在华人铺子做,一次80-120,比德系便宜一半。\n\n二手混动最担心的电池,雷家这套镍氢皮实,论坛里20万迈没换的一堆。适合每天通勤40迈以上、追求安静省心的家庭。', ARRAY[]::text[], 'Lexus', 'ES 300h', 2018, ARRAY['车主长测','混动'], 'active', '2026-05-13 19:40:00-07', '2026-05-13 19:40:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000053', 'a0000000-0000-0000-0000-000000000007', 'review', '入夏自检六项,车龄五年以上的都该做一遍', E'天热是车辆故障高发期,店里最近趴窝拖来的车明显变多。分享六个入夏自检项,自己在家二十分钟搞定(配图:打开引擎盖别害怕,认识这几样就行)。\n\n1. 冷却液:冷车看副水壶液位在MIN和MAX之间,液体应清澈不浑浊,五年没换过的建议换掉。\n\n2. 电瓶:高温是电瓶杀手,桩头有白绿色结晶就清理,三年以上车龄入夏前去店里免费测一次。\n\n3. 空调:上路前开最大冷风试五分钟,出风不冷早处理,入夏后修空调排队还涨价。\n\n4. 胎压胎况:按门框标签打冷胎压,检查胎纹和侧壁裂纹,别忘备胎。\n\n5. 皮带:着车听有无尖叫,熄火目视有无裂纹起毛。\n\n6. 雨刮玻璃水:夏天虫尸加雷阵雨全靠它。\n\n这六项花不了几个钱,但夏天高速上趴窝一次,拖车费就够做十次保养。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/MG_B_V8_engine_bay_%2814167614655%29.jpg/960px-MG_B_V8_engine_bay_%2814167614655%29.jpg'], NULL, NULL, NULL, ARRAY['保养','夏季','干货'], 'active', '2026-05-22 08:30:00-07', '2026-05-22 08:30:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000054', 'a1000000-0000-0000-0000-000000000023', 'review', '2021 CX-5家用两年:被低估的选择', E'当年预算2万8,试了CR-V和RAV4,最后选了CX-5,两年3万迈汇报。\n\n选它的原因很简单:同价位内饰质感最好,开起来最像轿车。两年体验:操控确实是同级最佳,过弯稳、方向盘有沟通感,底盘滤震高级;可靠性零故障,马自达的机械素质让人放心。密歇根雪地里AWD表现可靠,配雪胎无压力。\n\n缺点得说透:1. 后排和后备箱明显小于CR-V,有娃家庭要先试装安全座椅;2. 油耗26MPG中规中矩,比不过混动;3. 车机屏幕行车时不能触控,旋钮党狂喜,其他人再见;4. 隔音一般,高速胎噪偏大。\n\n总结:一个人或两口之家、在乎驾驶感,CX-5是同价位性价比之选;拉家带口优先空间的还是去看CR-V。', ARRAY[]::text[], 'Mazda', 'CX-5', 2021, ARRAY['车主长测','SUV'], 'active', '2026-05-17 16:20:00-04', '2026-05-17 16:20:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000055', 'a1000000-0000-0000-0000-000000000026', 'review', '丹佛出发黄石大提顿七日自驾攻略', E'上周刚回来,趁热写攻略。路线:丹佛-Casper-Cody东门进黄石,南门出到大提顿,经Jackson回,全程1500迈。\n\n【路况】全程铺装,轿车无压力,东门山路多弯注意慢行;5月底高海拔路段可能还有雪,出发前查NPS官网road status。\n\n【加油】园区内加油站少且贵,Cody和Jackson加满再进园,园内低于半箱就补。\n\n【住宿】园内木屋提前半年抢,订不到就住West Yellowstone或Gardiner,旺季价格翻倍。\n\n【野生动物】清晨傍晚去Lamar Valley和Hayden Valley看野牛狼熊,离野牛至少25码,堵"动物jam"时别下车。\n\n【装备】海拔高,防晒和水必备;昼夜温差20度,5月底羽绒服也用得上;园区没信号,下离线地图。\n\n【花费】两人七天:油300、住宿1400、门票买80的年票更划算、吃500。有问题评论区见。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['自驾','国家公园','攻略'], 'active', '2026-05-24 20:10:00-07', '2026-05-24 20:10:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000056', 'a1000000-0000-0000-0000-000000000008', 'review', '2020傲虎五年车主:露营党的本命车', E'傲虎五年7万迈,大概睡过它后备箱三十多晚,资格够写这篇了。\n\n为什么露营党爱傲虎:1. 放倒后排接近全平,一米八几的人能睡直;2. 8.7寸离地间隙,forest road碎石路随便走,比轿车敢去的地方多太多;3. 原厂车顶轨承重够,驮皮划艇和车顶箱无压力;4. AWD雨雪泥地稳,俄勒冈的冬天从没怂过。\n\n五年花费:除常规保养,换过前刹车、一套胎、一个后轮轴承。水平对置传说中的烧机油,我这台7万迈还没出现,机油尺月月看。油耗26-28MPG,对得起这个通过性。\n\n缺点:CVT加速佛系,高速超车要预判;车机反应慢。奉劝一句:想省钱买2015-2019高里程的,查查烧机油和CVT记录再下手。', ARRAY[]::text[], 'Subaru', 'Outback', 2020, ARRAY['露营','车主长测'], 'active', '2026-05-29 11:45:00-07', '2026-05-29 11:45:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000057', 'a0000000-0000-0000-0000-000000000008', 'review', '留学生车险太贵?这几招合法省下几百刀', E'留学生保险贵是系统性的:没美国驾驶记录、年龄小、驾照新,保险公司只能按高风险定价。但贵和被宰是两回事,这几招都合法有效。\n\n1. 多要报价:同样条件不同公司差价能到50%,主流几家都问一遍,这是时薪最高的一小时。\n\n2. 国内驾龄:部分公司认可国内驾驶经验(带翻译件),能把"新手"标签摘掉一半。\n\n3. 好学生折扣:GPA 3.0以上很多公司给10-15%,交成绩单就行。\n\n4. 提高deductible:存款够cover的话把500调到1000,保费立降。\n\n5. 老车砍collision:车值3000以下,collision可以考虑砍掉,一年省的钱两年就是小半台车价。\n\n6. 别自动续保:每次续保前重新比价,忠诚度在保险行业等于溢价。\n\n7. 千万别裸险,也别买群里流传的"影子保单",出一次事故毁所有。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保险','留学生','攻略'], 'active', '2026-05-12 09:30:00-07', '2026-05-12 09:30:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000058', 'a0000000-0000-0000-0000-000000000004', 'review', '二手2017塞纳半年:七座刚需的踏实之选', E'家里添了二宝,半年前2万2收了台2017 Sienna XLE,8万迈,汇报一下。\n\n买点就是空间:第二排两个安全座椅加爷爷奶奶坐第三排,后备箱还能塞下双人推车,这是任何三排SUV给不了的从容。电动侧滑门是带娃神器,窄车位抱着娃开门不怕磕。\n\n可靠性半年零问题,3.5 V6加8AT成熟省心,油耗市区19高速25,七座车这水平认了。\n\n买二手Sienna的功课:1. 试所有侧滑门开合顺不顺,修一扇门不便宜;2. 看第二排座椅导轨有没有锈(泡水高发位);3. AWD版本注意后轴异响。\n\n法拉盛奶爸车三宝:Sienna、Odyssey、Highlander。我选Sienna就图丰田保值,三年后出手不心疼。', ARRAY[]::text[], 'Toyota', 'Sienna', 2017, ARRAY['七座','家用车'], 'active', '2026-05-07 21:15:00-04', '2026-05-07 21:15:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000059', 'a0000000-0000-0000-0000-000000000007', 'review', '空调不冷别乱花钱:修车师傅的排查顺序', E'最近每天都有空调不冷的车进店,写个通用排查顺序,看懂了至少不被忽悠。\n\n第一步看现象:完全不冷还是不够冷?怠速不冷跑起来冷?前者多半是系统问题,后者常见是散热不良(电子扇不转、冷凝器脏)。\n\n第二步低成本排查(图为常见引擎舱布局):1. 空调滤芯堵死会导致风量小"感觉不冷",15块自己换;2. 冷凝器表面糊满柳絮虫尸,低压水冲干净,立竿见影;3. 听压缩机离合器"咔哒"吸合声,不吸合可能只是保险丝、继电器或压力开关,几十块的事。\n\n第三步上设备:压力表读数定方向,双低是缺氟(必有漏点,要查漏别只加氟),高压过高是散热不良,数值异常波动看膨胀阀或压缩机内部。\n\n避坑重点:"99块加氟套餐"不查漏等于白加;开口就让换压缩机的,让他先给你看压力数据。空调维修水不深,是信息差深。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Honda_prelude_engine_bay.jpg/960px-Honda_prelude_engine_bay.jpg'], NULL, NULL, NULL, ARRAY['空调','干货'], 'active', '2026-05-30 10:05:00-07', '2026-05-30 10:05:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000060', 'a1000000-0000-0000-0000-000000000021', 'review', 'Ioniq 5德州road trip实测:充电比想象顺', E'上周开2022 Ioniq 5从奥斯汀跑了趟大弯国家公园,来回900迈,交一份非特斯拉电车的长途报告。\n\n充电体验:西德州确实是充电荒漠,但规划好就没事,I-10沿线Electrify America间距还行,800V平台从18%充到80%只要20分钟出头,比想象中顺,全程没趴窝。\n\n翻车点:1. EA桩的故障率仍然感人,四桩坏一桩是常态,到站先看app实时状态,永远留50迈余量;2. 大弯园区内零充电桩,进园前在Fort Stockton充满,园里省着开;3. 德州夏天40度,空调加高速80迈,表显续航打75折,规划按实际算。\n\n费用:900迈充电花了62刀,同路线油车SUV大概110刀。结论:德州开电车长途完全可行,但还没到无脑开的程度,ABRP加PlugShare两个app是保命符。', ARRAY[]::text[], 'Hyundai', 'Ioniq 5', 2022, ARRAY['电车','自驾','充电'], 'active', '2026-05-31 14:30:00-04', '2026-05-31 14:30:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000061', 'a1000000-0000-0000-0000-000000000015', 'review', '私卖过户手续各州差在哪?一篇说清基本盘', E'帮朋友处理过几次跨州买卖,发现大家最容易栽在"我以为跟我们州一样"。写个基本盘扫盲。\n\n共同流程:卖家在title背面签字转让,写清里程和售价;双方签bill of sale;买家限期内(常见10-30天)去DMV过户交税上牌。\n\n容易踩的坑:1. title签错位置或涂改,很多州直接作废要补办,下笔前看清SELLER栏;2. 个别州(亚利桑那、蒙大拿等)title转让要公证,大部分州不用;3. 车牌归属:加州牌跟车走,纽约麻州等牌跟人走要摘掉,搞反了罚单找上门;4. 卖家保护:加州叫Notice of Transfer,别的州叫release of liability,交了才和这台车撇清关系;5. lien未释放的title不能交易,先让银行出lien release;6. 跨州购车,销售税在你注册的州交,别被卖家州"代收"忽悠。\n\n办事前花十分钟看目标州DMV官网,比听老乡口口相传靠谱。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['过户','攻略'], 'active', '2026-05-09 10:50:00-04', '2026-05-09 10:50:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000062', 'a1000000-0000-0000-0000-000000000005', 'review', '2016宝马328i一年养车账单全公开', E'去年1万5收的2016 328i,9万迈,一年过去了,晒账单破除"宝马修不起"和"宝马不贵"两派迷思。\n\n常规保养:机油两次240(华人店,原厂标号),空调滤加空滤80,刹车油更换120。维修:水泵加节温器渗漏更换650(N20发动机的经典节目,图为当时拍的引擎舱),气门室盖垫渗油380,一个轮速传感器150。轮胎:防爆胎两条560。合计一年2180,不含保险油费。\n\n结论:1. 二手宝马的车价是"首付",每年2000上下的维护是"月供",按这个预期来就不会破防;2. 找到靠谱的独立德系店是养宝马的第一课,dealer报价基本翻倍;3. N20该漏的都会漏,买前查记录里水泵漏水做没做过,没做过就拿这个砍价。\n\n开起来值不值?操控是真香,值不值看钱包。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Engine_bay_of_Merkur_XR4Ti.jpg/960px-Engine_bay_of_Merkur_XR4Ti.jpg'], 'BMW', '328i', 2016, ARRAY['宝马','养车成本'], 'active', '2026-05-15 20:25:00-07', '2026-05-15 20:25:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000063', 'a0000000-0000-0000-0000-000000000007', 'review', '二手车验车:打开引擎盖先看这五处', E'很多朋友看二手车,引擎盖打开点点头就关上了。教你们五个不用工具就能看的点(图为参考)。\n\n1. 机油尺加机油盖:油尺看液位和颜色,黑不可怕,乳白色奶昔状直接走人(冷却液窜进机油);机油盖内侧有黄褐色油泥,说明长期保养差。\n\n2. 冷却液:副水壶液体应清澈,铁锈色或浮着油花的有故事;壶壁挂满褐色垢的,冷却系统老化。\n\n3. 渗油痕迹:重点看气门室盖边缘、发动机与变速箱结合处。反过来,洗得"过分干净"的引擎舱也可疑,可能是卖前专门洗过掩盖渗漏。\n\n4. 螺丝拧动痕迹:翼子板螺丝、大灯螺丝有拧过的漆面破损,说明此处拆过,追问事故史。\n\n5. 冷启动:一定要约冷车启动,听有无异响、看尾气颜色,热车启动能掩盖很多问题,看车就约早上第一趟。\n\n这五处看完再决定要不要花钱做PPI,能先筛掉一半烂车。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/MG_C_GT_engine_bay_Downton_%288040849607%29.jpg/960px-MG_C_GT_engine_bay_Downton_%288040849607%29.jpg'], NULL, NULL, NULL, ARRAY['验车','二手车','干货'], 'active', '2026-05-03 08:40:00-07', '2026-05-03 08:40:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000064', 'a1000000-0000-0000-0000-000000000037', 'showoff', '收了台老Prelude,周末把引擎舱洗出来了', '一直想要台90年代本田,上个月终于收了台Prelude,机械状态好就是脏。这周末拆了进气管路,除油泥、洗线束、护理胶管,前后搞了六个小时,H系列发动机终于见人了(图)。老车就是这点好,结构一目了然,自己动手有乐趣。下一步换正时皮带和水泵,慢慢整备。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Honda_prelude_engine_bay.jpg/960px-Honda_prelude_engine_bay.jpg'], NULL, NULL, NULL, ARRAY['老车','DIY'], 'active', '2026-05-02 17:20:00-07', '2026-05-02 17:20:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000109', 'd0000000-0000-0000-0005-000000000064', 'a1000000-0000-0000-0000-000000000038', '这台状态可以啊,90年代本田引擎舱就是耐看,线束走得干干净净。正时皮带换的时候把曲轴油封一起换了,拆都拆了。', '2026-05-02 20:45:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000110', 'd0000000-0000-0000-0005-000000000064', 'a0000000-0000-0000-0000-000000000007', '支持自己动手,提醒一句洗引擎舱别用高压水枪怼电器接头,老车插头密封圈都脆了,雾化喷加刷子最稳。', '2026-05-03 10:30:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000065', 'a1000000-0000-0000-0000-000000000004', 'showoff', '早起逛Cars and Coffee,被两台MG圈粉了', '周日早起去了尔湾的Cars and Coffee,本来是陪老公去看超跑的,结果被角落两台英国老车MG拉住走不动道。车主爷爷把引擎盖全开着让人拍(图),一台还是稀有的V8版本,机舱收拾得像艺术品,聊起来滔滔不绝讲了半小时历史。比起崭新的超跑,这种被照顾了五十年的老车更打动人。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/MG_C_GT_engine_bay_Downton_%288040849607%29.jpg/960px-MG_C_GT_engine_bay_Downton_%288040849607%29.jpg','https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/MG_B_V8_engine_bay_%2814167614655%29.jpg/960px-MG_B_V8_engine_bay_%2814167614655%29.jpg'], NULL, NULL, NULL, ARRAY['车聚','老爷车'], 'active', '2026-05-17 12:40:00-07', '2026-05-17 12:40:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000111', 'd0000000-0000-0000-0005-000000000065', 'a0000000-0000-0000-0000-000000000001', '尔湾这个场子老车质量一直在线,这种爷爷辈车主才是宝藏,下次去找他聊,能学到的比论坛一年都多。', '2026-05-17 16:05:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000112', 'd0000000-0000-0000-0005-000000000065', 'a1000000-0000-0000-0000-000000000029', 'MG的机盖开法都自带仪式感,上周圣地亚哥的场子也有一台,看来南加的MG车主都爱扎堆。', '2026-05-18 09:50:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000066', 'a0000000-0000-0000-0000-000000000006', 'showoff', '陪老爷子整备他的90年代萨博,情怀满格', '老爷子九十年代来美国买的第一台车就是萨博,前几年又淘回来一台同款慢慢玩。这个周末陪他把点火系统翻新了一遍,顺手把机舱整理干净(图)。红色缸盖罩一擦出来,老爷子在旁边笑得像个孩子。车这个东西,有时候载的不是人,是记忆。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/93SE_4-dr_Engine_Bay_30.jpg/960px-93SE_4-dr_Engine_Bay_30.jpg'], NULL, NULL, NULL, ARRAY['老车','情怀'], 'active', '2026-05-25 15:30:00-07', '2026-05-25 15:30:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000113', 'd0000000-0000-0000-0005-000000000066', 'a1000000-0000-0000-0000-000000000040', '说得太对了,萨博停产之后这些车越来越有味道,替老爷子高兴,这缸盖罩红得正。', '2026-05-25 19:10:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000067', 'a1000000-0000-0000-0000-000000000019', 'showoff', '车展看到Viper的V10机舱,德州人激动了', '周末达拉斯有个小型美式性能车展,一台Viper直接把引擎盖整个掀开展示那台8.4升V10(图),排量比我全家的车加起来都大。车主说市区油耗个位数,"but who cares"。这就是美式浪漫吧,不谈效率,只谈排量。看完回家看自己的皮卡都觉得温柔了。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/C_C_Viper_Engine_Bay_%2865603951%29.jpeg/960px-C_C_Viper_Engine_Bay_%2865603951%29.jpeg'], NULL, NULL, NULL, ARRAY['车展','肌肉车'], 'active', '2026-05-23 18:45:00-04', '2026-05-23 18:45:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000114', 'd0000000-0000-0000-0005-000000000067', 'a1000000-0000-0000-0000-000000000021', '大排量自吸是时代的眼泪了,现在新车再也不会这么造。奥斯汀的Cars and Coffee也常有一台蓝白条的,推荐来看。', '2026-05-24 10:20:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000068', 'a1000000-0000-0000-0000-000000000033', 'showoff', '朋友的Corvette机舱全是碳纤维,看饿了', '去朋友店里喝茶,他刚给自己的Corvette做完一轮碳纤维改装,引擎盖一开我直接看饿了(图):进气、机舱盖板一水儿碳纤维,做工服帖不是贴纸货。他说零件等了三个月,装完减重其实没几磅,"主要是开盖的时候好看"。真诚,这就是改装的本质。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Lots_of_Carbon_Fiber_in_this_Corvette_Engine_Bay_%285049453782%29.jpg/960px-Lots_of_Carbon_Fiber_in_this_Corvette_Engine_Bay_%285049453782%29.jpg'], NULL, NULL, NULL, ARRAY['改装','跑车'], 'active', '2026-05-30 16:20:00-07', '2026-05-30 16:20:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000115', 'd0000000-0000-0000-0005-000000000068', 'a1000000-0000-0000-0000-000000000003', '开盖好看确实是刚需,车聚上引擎盖不开等于白来。这套碳纤维目测不便宜,替他的钱包默哀三秒。', '2026-05-30 19:55:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000069', 'a1000000-0000-0000-0000-000000000016', 'showoff', 'Memorial Day提车啦,人生第一台敞篷', '蹲了半年的敞篷车,趁Memorial Day促销终于拿下!提车时销售把车擦得锃亮停在门口(图),阳光一照按捺不住发个帖。谈价过程用了论坛学的招:只谈OTD、拒掉全部加装包,比首次报价省了1900。亚特兰大的夏天晚风加敞篷,值回一切。周末就去蓝岭公路开篷兜风!', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/M%C3%BCnster%2C_Beresa%2C_Mercedes-Benz_C-Klasse_Cabrio_--_2018_--_1757.jpg/960px-M%C3%BCnster%2C_Beresa%2C_Mercedes-Benz_C-Klasse_Cabrio_--_2018_--_1757.jpg'], NULL, NULL, NULL, ARRAY['提车','敞篷'], 'active', '2026-05-25 13:10:00-04', '2026-05-25 13:10:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000116', 'd0000000-0000-0000-0005-000000000069', 'a1000000-0000-0000-0000-000000000024', '恭喜!学以致用砍下1900,这帖子含金量高。蓝岭公路秋天再去一次,漫山红叶配敞篷才是版本答案。', '2026-05-25 17:40:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000117', 'd0000000-0000-0000-0005-000000000069', 'a0000000-0000-0000-0000-000000000008', '恭喜提车!补一课:软顶记得定期打理胶条和液压机构,停车尽量避开树胶鸟粪,清洁用软顶专用剂别用洗车皂。', '2026-05-26 09:15:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000070', 'a1000000-0000-0000-0000-000000000012', 'showoff', '陪兄弟去奔驰店提车,排场拉满', '兄弟熬了三年终于换车,今天陪他去店里提(图)。店里仪式感是真会整:红布盖车、拉花、销售列队鼓掌,兄弟嘴上说尴尬,脸上笑得藏不住。作为陪跑的我全程负责砍financing和拒加装,财务室大战四十分钟,gap和延保全推掉了。兄弟说下次我买车他陪砍,成交。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Concesionario_de_Mercedes-Benz%2C_M%C3%BAnich%2C_Alemania%2C_2013-03-30%2C_DD_25.JPG/960px-Concesionario_de_Mercedes-Benz%2C_M%C3%BAnich%2C_Alemania%2C_2013-03-30%2C_DD_25.JPG'], NULL, NULL, NULL, ARRAY['提车'], 'active', '2026-05-16 15:50:00-04', '2026-05-16 15:50:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000118', 'd0000000-0000-0000-0005-000000000070', 'a1000000-0000-0000-0000-000000000009', '财务室大战四十分钟太真实了,那个小房间才是4S店真正的主战场,恭喜你兄弟!', '2026-05-16 20:30:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000071', 'a1000000-0000-0000-0000-000000000029', 'showoff', '加油站偶遇Lotus Exige,车主直接开盖科普', '在圣地亚哥加油,旁边停进来一台橙色Lotus Exige,我多看了两眼,车主大哥直接问"想看引擎吗",当场开盖科普(图):中置引擎就在座位后面,机械增压,全车比我的车轻了快一千磅。大哥说这车没有杯架没有储物格,"买它就是买个大玩具"。爱了,虽然我腰下不去那个座椅。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/2005_Lotus_Exige_S_engine_bay.jpg/960px-2005_Lotus_Exige_S_engine_bay.jpg'], NULL, NULL, NULL, ARRAY['跑车','偶遇'], 'active', '2026-05-11 11:25:00-07', '2026-05-11 11:25:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000119', 'd0000000-0000-0000-0005-000000000071', 'a1000000-0000-0000-0000-000000000033', 'Exige车主个个都是移动科普站,因为坐进去太费劲,必须站在外面聊天。橙色这台在圣地亚哥车圈有名的。', '2026-05-11 15:40:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000120', 'd0000000-0000-0000-0005-000000000071', 'a1000000-0000-0000-0000-000000000004', '哈哈哈"买个大玩具"太真实了,上次车聚一位Elise车主的原话是"它唯一的配置是发动机"。', '2026-05-12 09:10:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000072', 'a1000000-0000-0000-0000-000000000040', 'showoff', '老爷车展看到1953年的车,机舱像钟表', '西雅图这边周末有老爷车展,看到一台1953年的英国Jowett,七十多年的车,引擎舱干净得像钟表内部(图)。车主说全车能开能跑,每年就出来晒几次太阳。跟这些车一比,现在的引擎舱全被塑料罩盖着,少了点看头。老了以后我也想有台这样的车慢慢盘。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Jowett_Jupiter_Engine_Bay_%281953%29.jpg/960px-Jowett_Jupiter_Engine_Bay_%281953%29.jpg'], NULL, NULL, NULL, ARRAY['老爷车','车展'], 'active', '2026-05-19 14:35:00-07', '2026-05-19 14:35:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000121', 'd0000000-0000-0000-0005-000000000072', 'a0000000-0000-0000-0000-000000000006', '这台我也看到了!车主说配件全靠英国的俱乐部之间互相匀,玩老爷车玩的就是这个圈子。', '2026-05-19 18:20:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000073', 'a1000000-0000-0000-0000-000000000022', 'showoff', '折腾半年,我的冷门车Merkur终于复活', '接盘一台Merkur XR4Ti半年,前任车主放车库十年没动。换了全套油液、油泵、皮带和一堆胶管,今天终于自己着车怠速稳定,机舱状态见图。这车冷门到配件店店员当场查不到,零件全靠论坛和eBay蹲。但2.3涡轮加后驱,80年代的味道太正了。芝加哥的朋友路上见到一台白色的别惊讶,是我。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Engine_bay_of_Merkur_XR4Ti.jpg/960px-Engine_bay_of_Merkur_XR4Ti.jpg'], NULL, NULL, NULL, ARRAY['老车','DIY'], 'active', '2026-05-28 16:40:00-04', '2026-05-28 16:40:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000122', 'd0000000-0000-0000-0005-000000000073', 'a0000000-0000-0000-0000-000000000007', '敢接盘停放十年的车就是勇士。油箱和油路清干净了吗?这种车油箱底的胶质最容易反复堵油泵滤网,建议顺手把燃油滤也换新。', '2026-05-28 20:15:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000074', 'a1000000-0000-0000-0000-000000000020', 'showoff', '周末陪看车,车行大到像停机坪', '陪表妹看她的第一台车,休斯顿的dealer是真的大,库存一眼望不到头(图),逛了两小时脚都酸了。表妹的心路历程:进门要买白色轿车,出门时在纠结红色SUV,销售都被她绕晕了。最后什么都没定,拿了三张报价单回家"考虑一下"。买车果然是大型选择题现场。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Car_dealership_car_park_-_geograph.org.uk_-_8195523.jpg/960px-Car_dealership_car_park_-_geograph.org.uk_-_8195523.jpg'], NULL, NULL, NULL, ARRAY['逛车行'], 'active', '2026-05-31 15:20:00-04', '2026-05-31 15:20:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000123', 'd0000000-0000-0000-0005-000000000074', 'a1000000-0000-0000-0000-000000000019', '什么都没定就对了,第一次逛就下单的才容易后悔。拿着三张报价单让他们互相卷去吧,德州dealer别的不多,同行竞争管够。', '2026-05-31 18:45:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000075', 'a1000000-0000-0000-0000-000000000038', 'showoff', '日系小车聚会,被一台City Turbo萌到了', '湾区周末有个日系老车聚会,全场最萌的是一台80年代本田City Turbo(图),车小得像玩具,机舱里塞了台涡轮,妥妥的口袋火箭。车主是位日本大叔,后备箱里居然还装着原厂配套的折叠摩托Motocompo,当年的设计就是开到城里再骑摩托,官方套娃直接给我看笑了。老本田的脑洞真是领先时代。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Honda_City_Turbo_II_engine_bay.jpg/960px-Honda_City_Turbo_II_engine_bay.jpg'], NULL, NULL, NULL, ARRAY['车聚','日系老车'], 'active', '2026-05-14 13:50:00-07', '2026-05-14 13:50:00-07')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000124', 'd0000000-0000-0000-0005-000000000075', 'a1000000-0000-0000-0000-000000000037', 'Motocompo都有?!这是全套收齐了啊,这套组合现在收藏价比车还贵,大叔是真玩家。', '2026-05-14 17:30:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000076', 'a1000000-0000-0000-0000-000000000009', 'showoff', '人生第一台车提回家了,论坛的建议真香', '之前发帖问过接学长车的事,后来学长的车被人抢先定了,最后在皇后区一家小车行落地9800拿下一台2016卡罗拉(图为车行)。全程按论坛攻略走:PPI花了120查出后刹车快到寿命,砍掉300;只谈OTD;拒了三个加装包。第一次全款买车,手续比想象中简单。感谢这个论坛,从看帖到提车三个月,毕业第一课修完。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/5/52/Used_car_lot_-_geograph.org.uk_-_1036517.jpg'], NULL, NULL, NULL, ARRAY['提车','第一台车'], 'active', '2026-05-27 12:15:00-04', '2026-05-27 12:15:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000125', 'd0000000-0000-0000-0005-000000000076', 'a1000000-0000-0000-0000-000000000035', '恭喜!9800的16年卡罗拉在纽约算正常价,PPI还砍回300,这波操作满分,开三年基本不掉价。', '2026-05-27 16:40:00-04')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0005-000000000126', 'd0000000-0000-0000-0005-000000000076', 'a1000000-0000-0000-0000-000000000013', '从发帖提问到按攻略执行,这才是论坛的正确打开方式,恭喜毕业第一课满绩!', '2026-05-27 19:55:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000077', 'a1000000-0000-0000-0000-000000000030', 'discussion', '加油站偶遇同款同色车,车主默契点头', '早上加油,旁边车道停进来一台和我同款同色同轮毂的车,连贴膜色号都像。两人对视一秒,默契点头,谁也没说话。开走的时候他按了两下喇叭。开了五年车,今天这个瞬间最有归属感。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['日常'], 'active', '2026-05-04 08:35:00-07', '2026-05-04 08:35:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000078', 'a1000000-0000-0000-0000-000000000025', 'discussion', '凤凰城的夏天:安全带扣是烙铁', '今天中午上车,手碰到安全带金属扣的瞬间差点喊出声,目测能煎蛋。方向盘要用指尖轮流转,墨镜放中控台上拿起来烫脸。每年都发誓要买遮阳挡,每年都拖到七月。凤凰城的车友们,你们车里现在多少度?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['吐槽','夏季'], 'active', '2026-05-29 12:50:00-07', '2026-05-29 12:50:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000079', 'a1000000-0000-0000-0000-000000000002', 'discussion', 'Memorial Day洗车排队一小时,人比车多', '趁假期去洗车,好家伙,队伍排到街上,前面十几台车,吸尘器位全满,等了快一小时。看来大家的假期安排高度一致:洗车、烧烤、看促销。洗完出门那一刻还是值的,车亮得能反光。就是排队时看着旁边自助水枪五分钟搞定的大哥,陷入了沉思。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['日常','吐槽'], 'active', '2026-05-24 15:40:00-07', '2026-05-24 15:40:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000080', 'a1000000-0000-0000-0000-000000000010', 'discussion', '高速上看到一台皮卡,搬家搬出杂技效果', '今天在95号上看到一台皮卡,车斗里的家具堆得比驾驶室还高,一根绳子绕了几圈,床垫在风里哗哗扇动,后面的车全都默契地隔它三个车位远。大哥,搬家公司真的没那么贵,你这床垫飞出来,大家的保险都要涨。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['吐槽'], 'active', '2026-05-13 13:25:00-04', '2026-05-13 13:25:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000081', 'a1000000-0000-0000-0000-000000000011', 'discussion', '在商场停车楼走丢,找车找了二十五分钟', '今天在停车楼上演大型寻车现场:明明记得停在3层,走遍3层没有,上4层没有,最后在2层找到,原来我从另一个入口进的。二十五分钟,一万步,拎着的奶茶都喝完了。从今天起停好车必拍柱子编号,发出来提醒和我一样的路痴。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['日常'], 'active', '2026-05-06 17:45:00-04', '2026-05-06 17:45:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000082', 'a1000000-0000-0000-0000-000000000013', 'discussion', '朋友圈一半在卖车,毕业季实感', '五月的朋友圈和微信群:昨天三台卡罗拉、两台思域、一台马自达3,配文高度统一:"毕业回国,忍痛出售,价格好谈"。看着学弟学妹们排队接盘,想起我自己卖车那年,交车时居然有点舍不得。铁打的校园,流水的二手车,一代传一代。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['毕业季','日常'], 'active', '2026-05-21 21:30:00-04', '2026-05-21 21:30:00-04')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000083', 'a1000000-0000-0000-0000-000000000034', 'discussion', '邻居车库里的老爷车,今天终于出街了', '隔壁爷爷车库里那台盖着车衣的老车,住了三年只闻其名。今天路过看到车衣掀了,爷爷在车道上开着引擎盖擦车(图),说趁天好带老伴出去兜一圈。老车缓缓倒出车道的时候,整条街的人都在看。有些车不是交通工具,是时间胶囊。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Jowett_Jupiter_Engine_Bay_%281953%29.jpg/960px-Jowett_Jupiter_Engine_Bay_%281953%29.jpg'], NULL, NULL, NULL, ARRAY['日常','老爷车'], 'active', '2026-05-31 10:40:00-07', '2026-05-31 10:40:00-07')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0005-000000000084', 'a1000000-0000-0000-0000-000000000023', 'discussion', '加满一箱油破60刀,默默截图留念', '今天加油跳枪那一下:61.4刀。记得刚来美国那会儿加满才30出头。截图发家庭群,我妈回了句"那你少开点"。合理,但做不到。就当为夏天的自驾游提前适应油价了,大家最近一箱油都多少?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['油价','吐槽'], 'active', '2026-05-22 18:20:00-04', '2026-05-22 18:20:00-04')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- part6.sql — 社区种子帖 2026-06-01 ~ 2026-07-17(80 帖)
-- Post IDs: d0000000-0000-0000-0006-0000000000NN (01-80)
-- Comment IDs: e0000000-0000-0000-0006-000000000NNN (001-)
-- ============================================================

-- 01 discussion 迈阿密Sunny 飓风季油箱
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000001', 'a1000000-0000-0000-0000-000000000018', 'discussion', '飓风季开始了,油箱平时保持多少油合适?', E'住迈阿密第三年,前两年 hurricane 来之前加油站排大队,还遇到过整条街加油站全挂"无油"牌子的情况。想问问佛州和德州的朋友,飓风季平时油箱保持在多少比较稳?我现在是低于半箱就去加,会不会太谨慎了?另外家里要不要备一个油桶?听说存汽油有安全问题。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['飓风季','用车常识'], 'active', '2026-06-01 09:40:00-04', '2026-06-01 09:40:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000001', 'd0000000-0000-0000-0006-000000000001', 'a1000000-0000-0000-0000-000000000017', E'奥兰多老住户经验:六月到十一月我都保持半箱以上,预报有风暴进入五天锥形区就加满。撤离的时候堵在 I-95 上最怕的就是没油,加油站要么排队两小时要么没货。备油桶我不推荐放家里,高温车库存汽油真的危险,不如提前加满车。', '2026-06-01 13:20:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000002', 'd0000000-0000-0000-0006-000000000001', 'a0000000-0000-0000-0000-000000000007', E'修车角度补一句:别长期把油开到接近空箱,油泵靠汽油散热,常年低油位油泵寿命会打折。半箱线是个很好的习惯,不算谨慎。真要存油,用带认证的专用油桶,加稳定剂,放阴凉通风处,三个月内用掉轮换。', '2026-06-02 08:05:00-04') ON CONFLICT (id) DO NOTHING;

-- 02 discussion 洛杉矶Amy 方向盘烫
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000002', 'a1000000-0000-0000-0000-000000000002', 'discussion', '暴晒后方向盘烫得没法握,大家怎么解决?', E'洛杉矶最近连着高温,车停室外停车场,下午上车方向盘烫得根本不敢碰,换挡杆也是。开出去十分钟才敢正常握。除了遮阳挡还有什么招?方向盘套会不会影响手感?有没有人试过那种反着停车让方向盘背光的说法,真的有用吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['夏季用车','防晒'], 'active', '2026-06-01 13:05:00-07', '2026-06-01 13:05:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000003', 'd0000000-0000-0000-0006-000000000002', 'a0000000-0000-0000-0000-000000000001', E'尔湾晒了十几年,我的顺序:上车先开门扇几下把热气排出去,发动后四窗全降+空调外循环开一分钟,再关窗内循环。方向盘我把遮阳挡塞前挡时故意往方向盘那边压低一点,能挡住大半直射。方向盘套夏天反而闷手,不如一条浅色毛巾搭在上面,下车十秒钟的事。', '2026-06-01 16:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000004', 'd0000000-0000-0000-0006-000000000002', 'a1000000-0000-0000-0000-000000000025', E'凤凰城人表示这是基本生存技能:遮阳挡必须是硬质反光那种,伞式的收放快,值得买。停车方向有讲究,下午车头朝北或朝东,前挡吃到的直射会少很多。真皮方向盘长期暴晒还会开裂,遮阳挡其实是在保内饰残值。', '2026-06-02 09:15:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000005', 'd0000000-0000-0000-0006-000000000002', 'a0000000-0000-0000-0000-000000000008', E'补充一个数据:实测下午两点室外 95°F,车内不遮阳能到 150°F 以上,方向盘表面能超过 120°F。遮阳挡能把方向盘温度拉低二三十度,是所有办法里性价比最高的。贴前挡隔热膜(透光率合规的)也有帮助,但见效不如遮阳挡直接。', '2026-06-02 11:40:00-07') ON CONFLICT (id) DO NOTHING;

-- 03 review(攻略) 修车匠Tony 夏季长途检查清单
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000003', 'a0000000-0000-0000-0000-000000000007', 'review', 'Tony清单:夏季长途出发前必查的13项', E'暑假自驾旺季到了,每年七月我店里都会拖回来几台半路趴窝的车,九成问题出发前花半小时就能避免。清单给大家:\n1. 胎压四轮+备胎,按门框标签冷胎值打;\n2. 轮胎花纹深度,插硬币测,低于2/32"别跑长途;\n3. 轮胎有没有鼓包、裂纹,尤其六年以上的胎;\n4. 机油液位和颜色,快到保养里程的提前换;\n5. 冷却液液位,只看副水壶,冷车看,别开热水箱盖;\n6. 刹车油液位和刹车片厚度;\n7. 电瓶桩头有没有白绿色腐蚀,三年以上电瓶建议测一下;\n8. 空调制冷是否给力,出风口温度应比车外低20°F以上;\n9. 雨刮喷水和刮拭效果;\n10. 所有灯光,让人帮你看刹车灯;\n11. 皮带有没有裂纹异响;\n12. 底盘有没有渗漏印;\n13. 车里放:充电宝、水、搭电线、补胎套装、三角牌。\n重点说轮胎和冷却液,夏天高温爆胎和开锅占趴窝原因的一半以上。自己不会看的,出发前来任何一家修理厂做个 trip inspection,一般就几十刀。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['干货','夏季用车','自驾'], 'active', '2026-06-02 08:30:00-07', '2026-06-02 08:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000006', 'd0000000-0000-0000-0006-000000000003', 'a1000000-0000-0000-0000-000000000030', E'收藏了,下周正好要开去黄石。请问Tony,胎是2021年的,花纹还有4/32",跑三千迈往返可以吗?还是干脆换了再走?', '2026-06-02 15:10:00-07') ON CONFLICT (id) DO NOTHING;

-- 04 discussion 波士顿学姐 lease takeover
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000004', 'a1000000-0000-0000-0000-000000000013', 'discussion', '暑期实习三个月,接别人的lease靠谱吗?', E'在波士顿读研,暑假拿到湾区实习,六月中到九月初。买车再卖太折腾,长租车三个月要三千多刀。看到有 lease takeover 平台能接手别人剩三四个月的租约,月付看起来比租车便宜不少。有人实际操作过吗?transfer 手续复杂吗?保险怎么算?会不会到时候还车被挑毛病扣钱?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['短期用车','实习'], 'active', '2026-06-02 19:22:00-04', '2026-06-02 19:22:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000007', 'd0000000-0000-0000-0006-000000000004', 'a0000000-0000-0000-0000-000000000008', E'三个月的takeover要特别小心几点:1)transfer本身要车贷公司批,流程快则一周慢则一个月,你六月中就要用车可能来不及;2)还车时的磨损检查(excess wear)和超里程费都算在合同持有人头上,谁背取决于transfer是不是完全过户,有些只是"代付"性质,风险大;3)保险要自己买全险,短期保单不便宜。三个月我反而建议:找同学转租车位+买张月度租车会员,或者Turo按月租,总成本算下来经常差不多,但没有任何合同尾巴。', '2026-06-03 10:15:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000008', 'd0000000-0000-0000-0006-000000000004', 'a1000000-0000-0000-0000-000000000009', E'我去年暑期实习就是Turo按月租的,连租三个月拿了长租折扣,一台卡罗拉月租八百多含基本险,不用管保养不用管过户,还车拍照走人。lease takeover适合接六个月以上的,三个月手续成本摊不平。', '2026-06-03 21:40:00-04') ON CONFLICT (id) DO NOTHING;

-- 05 showoff 弗里蒙特Tiger 二手Model 3
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000005', 'a1000000-0000-0000-0000-000000000031', 'showoff', '人生第一台电车,二手Model 3提回家了', E'看了两个月,终于从私人卖家手里提了台21年的Model 3标续,五万迈,电池健康报告92%。第一次开电车,单踏板还在适应,但是安静和提速真的回不去了。下班顺路第一次用公共桩,插上枪那一刻仪式感拉满。以后油价再涨跟我没关系了,哈哈。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Car2Go_Charging_Station_Stuttgart_2013_01.jpg/960px-Car2Go_Charging_Station_Stuttgart_2013_01.jpg'], NULL, NULL, NULL, ARRAY['提车','电车'], 'active', '2026-06-03 18:45:00-07', '2026-06-03 18:45:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000009', 'd0000000-0000-0000-0006-000000000005', 'a0000000-0000-0000-0000-000000000003', E'恭喜入坑!92%的健康度很不错了。建议尽快在家里装个240V插座,哪怕慢充,晚上插着早上满电,比蹲公共桩舒服太多。夏天空调随便开,预冷功能记得用起来。', '2026-06-04 09:20:00-07') ON CONFLICT (id) DO NOTHING;

-- 06 discussion 休斯顿Nina 泡水车
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000006', 'a1000000-0000-0000-0000-000000000020', 'discussion', '休斯顿五月刚淹过水,现在买二手车怕中招', E'上个月休斯顿又淹了几个区,朋友说接下来几个月本地二手车市场肯定混进一批泡水车,收拾干净了根本看不出来。我正好计划七月买台两三万的SUV,预算不高不低,最怕买到这种车。除了看Carfax还有什么办法?听说有的泡水车保险都没报,记录上完全干净?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['泡水车','避坑'], 'active', '2026-06-03 20:10:00-05', '2026-06-03 20:10:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000010', 'd0000000-0000-0000-0006-000000000006', 'a0000000-0000-0000-0000-000000000007', E'没报保险的泡水车确实查记录查不到,只能靠实车检查:掀地毯摸底层有没有潮气泥沙、看座椅滑轨和安全带卷到底有没有锈、闻内饰是不是有霉味或者异常浓的香水味、看大灯雾灯里有没有水痕水线、保险丝盒和线束接头有没有绿色氧化。最稳的还是花一百多找独立技师做PPI,明说让他重点排查水损,举升机上底盘一看基本藏不住。', '2026-06-04 09:35:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000011', 'd0000000-0000-0000-0006-000000000006', 'a1000000-0000-0000-0000-000000000019', E'达拉斯这边也一样,大水过后三个月是泡水车流入高峰。补充一个:NICB官网有免费的VINCheck,能查到保险公司申报过的水淹/全损记录,和Carfax交叉验证。另外价格明显低于市场价两千以上的"急售",直接多留个心眼。', '2026-06-04 12:50:00-05') ON CONFLICT (id) DO NOTHING;

-- 07 discussion 湾区凯文 夏天胎压
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000007', 'a1000000-0000-0000-0000-000000000001', 'discussion', '夏天胎压显示38了,需要放点气吗?', E'门框标签写前后都是35psi,冬天打到35没问题。最近热起来,中午跑完高速仪表显示到38甚至39,报警倒是没报。网上有人说热胀正常别管,有人说夏天应该少打两个。到底哪种对?早上冷车的时候看是36。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['轮胎','夏季用车'], 'active', '2026-06-04 08:12:00-07', '2026-06-04 08:12:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000012', 'd0000000-0000-0000-0006-000000000007', 'a0000000-0000-0000-0000-000000000007', E'记住一条就行:标签上的35是"冷胎值",即停放三小时以上或早晨出门前的读数。行驶后升3-5psi完全正常,是设计内的,千万别在热胎状态放气,否则等胎冷下来就亏气了,亏气高速行驶才是真正的爆胎风险。你早上冷车36,只比标准高1,可以在冷车时放到35,也可以不管。', '2026-06-04 10:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000013', 'd0000000-0000-0000-0006-000000000007', 'a1000000-0000-0000-0000-000000000006', E'我之前也纠结过这个,后来买了个二十块的电子胎压计,每月初早上出门前量一次调一次,一年四季都按标签值,再也不用猜。顺便说TPMS报警阈值一般是低压才报,高几个psi不会响的。', '2026-06-04 13:45:00-07') ON CONFLICT (id) DO NOTHING;

-- 08 chatter 帕萨迪纳Lucy 口红化了
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000008', 'a1000000-0000-0000-0000-000000000032', 'chatter', '警告:别把口红留在车里,别问我怎么知道的', E'中午出去吃个饭,回来发现扶手箱里的口红直接化成一滩,新买的YSL……顺便墨镜盒也烫得像烤盘。姐妹们夏天车里真的什么都别放,尤其化妆品、打火机、碳酸水。今天这教训值四十刀。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['夏季用车','日常'], 'active', '2026-06-04 15:30:00-07', '2026-06-04 15:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000014', 'd0000000-0000-0000-0006-000000000008', 'a1000000-0000-0000-0000-000000000034', E'哈哈哈我上周是一整排巧克力,开门那一刻心都碎了。还有薄荷糖会粘成一大坨。现在我车里只放一条毛巾和一瓶没气的水。', '2026-06-04 19:05:00-07') ON CONFLICT (id) DO NOTHING;

-- 09 discussion 长岛Sophia 遮阳挡
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000009', 'a1000000-0000-0000-0000-000000000036', 'discussion', '前挡遮阳挡,折叠反光板和伞式哪个好用?', E'长岛这边通勤停露天,想买个前挡遮阳挡。看了下主要两种:传统折叠反光板十几刀,伞式的三四十刀号称收放三秒。用过的朋友说说,伞式是不是智商税?反光板每次折叠收纳确实烦。还有量尺寸有什么讲究吗,我的车前挡比较斜。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['防晒','好物'], 'active', '2026-06-05 11:05:00-04', '2026-06-05 11:05:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000015', 'd0000000-0000-0000-0006-000000000009', 'a1000000-0000-0000-0000-000000000025', E'两种我都用过。伞式不是智商税,收放确实快,尤其你每天要用两次的话,体验差距很大;缺点是伞骨中间会有个把手顶在玻璃上,遮盖率略低于全尺寸反光板。反光板胜在便宜+贴合好,但每次叠回去像叠帐篷。每天用选伞式,偶尔用选反光板。尺寸按你车型搜专用款最稳,通用款量前挡对角线。', '2026-06-05 14:30:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000016', 'd0000000-0000-0000-0006-000000000009', 'a0000000-0000-0000-0000-000000000001', E'加一句:不管哪种,买银色反光面的,别买纯黑的,黑色吸热等于给车内加个加热垫。装的时候用遮阳板压住两角就不会塌下来。', '2026-06-05 17:55:00-04') ON CONFLICT (id) DO NOTHING;

-- 10 review 达拉斯德州哥 2020 Mazda CX-5
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000010', 'a1000000-0000-0000-0000-000000000019', 'review', '2020 CX-5德州暴晒三年,内饰状态汇报', E'当年很多人劝我别买红色+真皮内饰,说德州太阳三年就晒废。现在三年过去,汇报一下:车一直停公寓露天位,夏天基本天天暴晒。做对的三件事:提车就贴了陶瓷膜、遮阳挡从不偷懒、每两个月给真皮上一次养护剂。现在座椅没有裂纹,方向盘皮质完好,只有中控台顶部颜色比门板略浅一点点,要仔细对比才看得出。红色车漆定期打蜡,没有明显褪色。\n结论:德州晒三年不可怕,可怕的是什么都不做。真皮内饰重点保养的就是防晒+保湿,一瓶养护剂十几刀能用一年。另外提醒CX-5车主,天窗排水孔记得一年清一次,我去年堵过一次,雨季差点漏到顶棚。车本身机械零故障,2.5自吸就是省心。', ARRAY[]::text[], 'Mazda', 'CX-5', 2020, ARRAY['用车报告','防晒'], 'active', '2026-06-05 21:40:00-05', '2026-06-05 21:40:00-05') ON CONFLICT (id) DO NOTHING;

-- 11 discussion 皇后区Grace 大学城买车vs公交
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000011', 'a1000000-0000-0000-0000-000000000011', 'discussion', '弟弟九月去大学城读书,到底要不要买车?', E'弟弟秋季去俄亥俄一个大学城读本科,学校说校车覆盖主校区,但周末买菜、看医生、去机场都不方便。家里在纠结:直接给他买台八千到一万的二手代步,还是让他先用一年公交+打车看看?担心的点:新手+课业忙,养车成本(保险对年轻男生特别贵)、停车permit也要钱。有过来人给个思路吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['新生','买车决策'], 'active', '2026-06-06 10:18:00-04', '2026-06-06 10:18:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000017', 'd0000000-0000-0000-0006-000000000011', 'a0000000-0000-0000-0000-000000000002', E'我本科就在中西部大学城,建议第一学期先别买。理由:开学前两个月他根本不知道自己的生活半径,很多大学城其实走路+校车+同学拼车完全够;而且落地就买车容易在人生地不熟时被坑。感恩节或者寒假摸清情况再买,车源选择也更从容。买菜可以蹭中国同学车,惯例是帮忙分摊油钱。', '2026-06-06 13:40:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000018', 'd0000000-0000-0000-0006-000000000011', 'a0000000-0000-0000-0000-000000000004', E'反方观点:如果他学校在那种沃尔玛都要开20分钟的村里,没车生活质量真的很低,冬天俄亥俄零下十几度等公交不现实。一万预算买台卡罗拉/思域老款,毕业还能卖掉回血一半。保险贵是真的,挂在父母保单下加good student折扣能省不少,前提是保单州要处理好。', '2026-06-06 16:25:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000019', 'd0000000-0000-0000-0006-000000000011', 'a0000000-0000-0000-0000-000000000008', E'折中方案:开学先不买,给他留好预算,十月十一月再决定。那时候有两个好处:一是他已经考出当地驾照、熟悉路况;二是年底二手车价通常比开学季八月软一些,大学城的车价开学前都会被留学生需求抬一波。', '2026-06-07 09:10:00-04') ON CONFLICT (id) DO NOTHING;

-- 12 showoff 库比蒂诺码农 Ioniq 5
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000012', 'a1000000-0000-0000-0000-000000000005', 'showoff', '接手同事的Ioniq 5,800V平台真香', E'同事回国把开了两年的Ioniq 5卖给我,知根知底的车买得放心。今天第一次去快充桩,10%充到80%不到二十分钟,比我之前试驾过的几台电车快一截,800V平台名不虚传。内味儿还是新车味,后排地板全平,爸妈来了坐着舒服。周末准备跑一趟Tahoe试试高速续航。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Electric_car_charging_station%2C_Batman_%28Turkey%29.jpg/960px-Electric_car_charging_station%2C_Batman_%28Turkey%29.jpg'], NULL, NULL, NULL, ARRAY['提车','电车'], 'active', '2026-06-06 17:25:00-07', '2026-06-06 17:25:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000020', 'd0000000-0000-0000-0006-000000000012', 'a1000000-0000-0000-0000-000000000038', E'同事之间的车交易最舒服了,保养记录都不用查。Ioniq 5跑Tahoe记得规划一下快充点,上山那段耗电会明显偏高,预留20%余量比较稳。', '2026-06-06 21:50:00-07') ON CONFLICT (id) DO NOTHING;

-- 13 discussion 奥兰多阿福 佛州淹水车
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000013', 'a1000000-0000-0000-0000-000000000017', 'discussion', '佛州买二手车,title干净就不是淹水车吗?', E'在奥兰多帮亲戚看车,佛州这种年年泡水的地方,车贩子处理泡水车据说很有一套。想确认一下:如果title是clean的,不是flood/salvage,是不是就能放心?还是说存在洗title的操作?另外佛州本地牌的车和外州转过来的车,哪种更要小心?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['泡水车','避坑'], 'active', '2026-06-07 09:50:00-04', '2026-06-07 09:50:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000021', 'd0000000-0000-0000-0006-000000000013', 'a0000000-0000-0000-0000-000000000007', E'clean title不等于没泡过水,两种漏网:一是车主没走保险自己修的,系统里什么都没有;二是"title washing",把flood title的车转到检查宽松的州重新登记洗白,来回倒几手记录就模糊了。所以看车历史时注意短期内跨多州频繁过户的,是危险信号。实车检查永远是最后防线:锈、霉味、水线、电子件抽风,四样占一样就走人。', '2026-06-07 14:20:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000022', 'd0000000-0000-0000-0006-000000000013', 'a0000000-0000-0000-0000-000000000008', E'补一条实操:查NMVTIS(官方title数据库)+NICB VINCheck+Carfax三个来源交叉,单看一家都有盲区。佛州买车我还会看这台车过去两年的登记地址在不在已知的水灾区,飓风Ian那年Fort Myers泡的车到现在还有在市面上流转的。', '2026-06-08 08:45:00-04') ON CONFLICT (id) DO NOTHING;

-- 14 discussion 盐湖城Ivy 长途前换机油
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000014', 'a1000000-0000-0000-0000-000000000027', 'discussion', '还有2000迈才到保养,长途前有必要提前换机油吗?', E'月底从盐湖城开去西雅图,单程850迈。现在机油还有2000迈才到保养间隔。我爸坚持说长途前必须换机油"图个安心",我觉得没必要,机油又不知道我要跑长途。到底该听谁的?顺便问下高温跑山路对机油要求会更高吗?我是5W-30全合成。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['保养','自驾'], 'active', '2026-06-08 12:33:00-06', '2026-06-08 12:33:00-06') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000023', 'd0000000-0000-0000-0006-000000000014', 'a0000000-0000-0000-0000-000000000007', E'你是对的,你爸也不算全错。技术上:剩2000迈的全合成机油跑850迈高速毫无压力,高速巡航反而是机油最轻松的工况,不需要提前换。但出发前值得做的是"检查"而不是"更换":拉机油尺看液位在上下限之间、颜色不是酱油色,冷却液液位正常。回程后里程差不多也该到保养了,回来再换,一步到位。5W-30全合成应付夏天山路完全够。', '2026-06-08 15:50:00-06') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000024', 'd0000000-0000-0000-0006-000000000014', 'a1000000-0000-0000-0000-000000000026', E'丹佛到盐湖城我每年跑好几趟,同意楼上。老一辈的"长途前必换"是化油器年代3000迈换油周期留下的习惯,现在的全合成没那么娇气。比起机油,你更该看看轮胎和雨刮,I-84那段夏天午后雷阵雨说来就来。', '2026-06-09 09:05:00-06') ON CONFLICT (id) DO NOTHING;

-- 15 discussion 哥伦布小舟 PPI
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000015', 'a1000000-0000-0000-0000-000000000024', 'discussion', '第一次做PPI,一般多少钱?都查些什么?', E'准备买一台私人卖家的2019 Accord,大家都说买前要做PPI(购前检查)。想问:1)俄亥俄这边一般收费多少?2)是去修理厂还是有上门的?3)检查报告会给书面的吗?卖家嫌麻烦不太想配合,说"车况自己看",这种态度是不是本身就是红旗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['验车','避坑'], 'active', '2026-06-09 14:20:00-04', '2026-06-09 14:20:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000025', 'd0000000-0000-0000-0006-000000000015', 'a0000000-0000-0000-0000-000000000007', E'行价100-200刀,独立修理厂比4S便宜。标准PPI内容:举升看底盘(渗漏、锈蚀、事故修复痕迹)、电脑读故障码含历史码、刹车轮胎悬挂状态、漆膜仪测有没有二次喷漆、试车听异响。会给书面或电子报告。上门检测服务也有,贵一点但适合卖家不愿挪车的情况。拒绝PPI的卖家,九成有事,剩下一成是真嫌麻烦——但你没必要赌这个概率,Accord市面上多的是。', '2026-06-09 18:35:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000026', 'd0000000-0000-0000-0006-000000000015', 'a0000000-0000-0000-0000-000000000008', E'话术给你:"我付钱、我预约、开到你方便的修理厂,半小时搞定,查出来没问题我今天就可以下定金。"这样说完还拒绝的,直接下一台。另外PPI查出小问题别急着跑,正好是砍价筹码,报告上列的维修项按市场工时费砍,有理有据。', '2026-06-10 10:00:00-04') ON CONFLICT (id) DO NOTHING;

-- 16 discussion 圣盖博阿强 贴膜
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000016', 'a1000000-0000-0000-0000-000000000003', 'discussion', '加州贴膜:陶瓷膜值不值?前挡到底能不能贴?', E'圣盖博这边贴膜店报价差很多,金属膜两百多,陶瓷膜要五六百。问了几家说法还不一致:有的说前挡不能贴,有的说贴70%透光的没事。想搞清楚:1)加州法规前挡和前侧窗到底怎么规定的?2)陶瓷膜比金属膜隔热真有那么大差距吗?3)金属膜会不会影响手机信号和FasTrak?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['贴膜','防晒'], 'active', '2026-06-09 19:05:00-07', '2026-06-09 19:05:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000027', 'd0000000-0000-0000-0006-000000000016', 'a0000000-0000-0000-0000-000000000001', E'加州规矩:前侧窗要求可见光透过率88%以上(贴膜后综合),前挡风只允许顶部一条遮阳带,整面贴深色是不合规的,被拦下会吃fix-it ticket。很多店说"没事"是指查得松,不是合法。后排和后挡随便贴。金属膜确实可能干扰GPS和收费器,现在基本没人推荐了,预算够直接陶瓷膜,红外阻隔差距在大太阳下体感很明显。', '2026-06-10 09:40:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000028', 'd0000000-0000-0000-0006-000000000016', 'a1000000-0000-0000-0000-000000000033', E'罗兰岗贴过三台车的经验:陶瓷膜选主流品牌的中端系列就够了,顶配系列溢价主要在牌子。谈价时问清楚是不是整卷正品膜、有没有质保卡,以及包不包含前挡遮阳带。五六百能做到全车+终身质保就合理。', '2026-06-10 13:15:00-07') ON CONFLICT (id) DO NOTHING;

-- 17 review(攻略) 避坑酱 新生买车时间线
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000017', 'a0000000-0000-0000-0000-000000000008', 'review', '八月落地新生看过来:买车时间线该怎么排', E'每年八月都有一批新生落地就急着买车,然后在最忙的时候被坑。把合理的时间线写清楚:\n落地前(现在就能做):办好国内驾照公证或翻译件;研究所在州能不能用国内驾照临时开;看攻略确定预算和目标车型,别到了再从零学。\n第1-2周:安顿住处,考笔试拿learner permit(很多州当天出结果);下载租车/共享用车App过渡;观察实际生活半径,重新评估是否真需要车。\n第3-6周:约路考;同时开始看车,多看少动,建立价格感觉。切记:没有本地驾照也可以买车上保险,但保费会贵,不着急的话等驾照下来再买。\n第6-10周:正式出手。私人车源要PPI,车行车源砍OTD价。保险至少比三家。过户、上牌、买permit一条龙办完。\n最容易踩的坑:落地第一周在机场附近华人车行"当天提车",这种急单最容易买贵买亏。记住,车市永远有车,慢即是快。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['新生','攻略','买车流程'], 'active', '2026-06-10 09:00:00-07', '2026-06-10 09:00:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000029', 'd0000000-0000-0000-0006-000000000017', 'a1000000-0000-0000-0000-000000000037', E'太真实了,我当年就是落地第三天买的车,多花了至少一千五,后来才知道那台车在网上挂了两个月没人要。转给今年来的学弟学妹。', '2026-06-10 15:20:00-07') ON CONFLICT (id) DO NOTHING;

-- 18 discussion 法拉盛Frank 宿舍没车位
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000018', 'a1000000-0000-0000-0000-000000000035', 'discussion', '儿子九月住校但宿舍不给车位,车怎么安置?', E'儿子九月去上州读大学,学校规定大一新生宿舍区不提供停车permit。但他暑假在法拉盛已经买好车了,舍不得卖。现在纠结:1)学校周边租私人车位,一个月一百多,一年下来不便宜;2)停我家门口街边,但NYC换边停车太折磨;3)干脆卖了,等他大二能申请permit再买。有类似经历的家长吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['新生','停车'], 'active', '2026-06-10 21:15:00-04', '2026-06-10 21:15:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000030', 'd0000000-0000-0000-0006-000000000018', 'a0000000-0000-0000-0000-000000000004', E'法拉盛邻居来说句实话:街趴一年,换边停车+扫街日+冬天铲雪,你会替儿子折腾到崩溃,还容易吃罚单刮蹭。学校周边私人车位月租一百多其实是最省心的,很多是当地居民家的车道,facebook本地group和学校论坛都有人挂。也可以看看学校有没有远端commuter lot,大一有时能申请,只是位置偏,配个车衣就行。', '2026-06-11 09:30:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000031', 'd0000000-0000-0000-0006-000000000018', 'a1000000-0000-0000-0000-000000000011', E'别卖!现在卖是折价卖,大二再买又是买贵。我表弟当年就是租的学校旁边教堂停车场,一学期两百块,教堂周日要用车位,他周日正好不出门。让儿子开学后去问问附近教堂和小商铺,很多愿意出租闲置车位,比挂牌的便宜。', '2026-06-11 12:45:00-04') ON CONFLICT (id) DO NOTHING;

-- 19 showoff 波特兰小鹿 Thule车顶箱
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000019', 'a1000000-0000-0000-0000-000000000008', 'showoff', '车顶箱装好,暑假露营装备终于有地方放了', E'蹲了半年,终于在二手平台收了个九成新的Thule车顶箱,原价一半拿下。今天和男朋友花了一小时装好,帐篷、睡袋、桌椅全塞进去,后备箱还给狗子留出一整层。下周Crater Lake走起!提醒想收二手车顶箱的朋友:检查锁芯和卡扣有没有裂,钥匙最好两把都在。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Thule_Dynamic_roof_box_%2811726732653%29.jpg/960px-Thule_Dynamic_roof_box_%2811726732653%29.jpg'], NULL, NULL, NULL, ARRAY['露营','好物'], 'active', '2026-06-11 16:40:00-07', '2026-06-11 16:40:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000032', 'd0000000-0000-0000-0006-000000000019', 'a1000000-0000-0000-0000-000000000026', E'二手车顶箱是真划算,这东西几乎不会坏。记得重的东西放车里,车顶箱只放轻抛货,横杆和箱子都有限重的。Crater Lake这个季节绝美,羡慕了。', '2026-06-11 20:10:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000033', 'd0000000-0000-0000-0006-000000000019', 'a1000000-0000-0000-0000-000000000007', E'装了车顶箱记得地库限高!我同事上个月顶着箱子进公司地库,箱子直接报废。西雅图往南的路上有几个加油站雨棚也偏矮,留意一下。', '2026-06-12 08:25:00-07') ON CONFLICT (id) DO NOTHING;

-- 20 discussion 圣地亚哥Wendy 空调不冷
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000020', 'a1000000-0000-0000-0000-000000000029', 'discussion', '空调不够冷,是该加氟还是修压缩机?', E'2016年的车,最近发现空调只有"微凉",中午基本压不住车内温度。朋友说去加个氟就行三五十刀,又有人说老车可能是压缩机快不行了,修要上千。怎么判断到底是哪种情况?会不会加了氟过俩月又漏光,白花钱?圣地亚哥有靠谱的空调维修推荐也求一个。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['空调','维修'], 'active', '2026-06-11 13:22:00-07', '2026-06-11 13:22:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000034', 'd0000000-0000-0000-0006-000000000020', 'a0000000-0000-0000-0000-000000000007', E'先搞清楚一件事:制冷剂是循环使用的,正常不该"消耗",不冷缺氟基本等于有泄漏。正确流程是让店里接压力表看高低压读数,缺就打荧光剂+抽真空保压找漏点,常见漏点是冷凝器被石子打漏、管路O圈老化,修漏几十到几百不等;压缩机坏的表现通常是离合器不吸合或有金属异响,和缺氟症状不一样,师傅一听一测就能分辨。直接"加氟不查漏"的店等于让你按月充值,换一家。', '2026-06-11 16:45:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000035', 'd0000000-0000-0000-0006-000000000020', 'a1000000-0000-0000-0000-000000000002', E'补充一个便宜的可能性:先看看空调滤芯是不是堵了,我之前"不冷"折腾半天,最后换了个十五刀的滤芯风量恢复就凉快了。滤芯自己就能换,手套箱后面,油管视频照着做五分钟。', '2026-06-12 10:20:00-07') ON CONFLICT (id) DO NOTHING;

-- 21 discussion 新泽西Leo 里程回调
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000021', 'a1000000-0000-0000-0000-000000000012', 'discussion', '看中一台车怀疑里程被调过,怎么核实?', E'新泽西看了台2018年的SUV,表显才4.8万迈,但方向盘磨得发亮,主驾座椅侧翼都塌了,刹车踏板橡胶磨平。价格比同款低几百。车贩子说是"高速通勤车所以内饰旧"。这个解释成立吗?有什么办法核实真实里程?如果真调了表,这车碰都不能碰吧?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['里程表','避坑'], 'active', '2026-06-12 10:45:00-04', '2026-06-12 10:45:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000036', 'd0000000-0000-0000-0006-000000000021', 'a0000000-0000-0000-0000-000000000007', E'方向盘+座椅+踏板三处磨损和4.8万迈对不上,这车大概率12万迈往上。核实方法:1)Carfax/AutoCheck上每次过户、年检、保养都有里程记录,看曲线是否单调递增、最后一次记录离现在多远;2)让技师用诊断电脑读模块里程,很多车变速箱或ECU模块里存的里程和仪表是独立的,调表的人往往只改仪表;3)看保养贴纸,门框或挡风玻璃角上常有上次换油的里程手写记录,卖家经常忘撕。三招下去基本无所遁形。', '2026-06-12 14:10:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000037', 'd0000000-0000-0000-0006-000000000021', 'a0000000-0000-0000-0000-000000000008', E'"高速通勤所以内饰旧"逻辑刚好反了——高速里程对内饰磨损反而小,市区短途上下车频繁才磨内饰。这种一戳就破的话术说明卖家在赌你不懂。确认调表就别碰,调表是联邦重罪,这种卖家车上还有多少雷你不知道。', '2026-06-12 17:35:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000038', 'd0000000-0000-0000-0006-000000000021', 'a1000000-0000-0000-0000-000000000010', E'我去年遇到过一台一模一样的,Carfax上前年年检还是11万迈,现在表显5万,证据截图直接举报了。楼主真查实的话别私了,往下看有人科普过举报渠道,不举报下一个买家就中招了。', '2026-06-13 09:00:00-04') ON CONFLICT (id) DO NOTHING;

-- 22 review 西雅图雨神 2018 Civic
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000022', 'a1000000-0000-0000-0000-000000000007', 'review', '2018思域五年学生用车总结,准备传给学弟', E'研究生第一年一万二买的2018 Civic LX,1.5万迈/年开到现在,毕业工作换车在即,写个总结。\n可靠性:五年唯一一次趴窝是电瓶寿终正寝,其他全是常规保养。1.5T发动机网上说的机油增多问题,西雅图气候下我没遇到,每5000迈换油,液位一直正常。\n费用:平均每年保养+维修不到400刀,保险学生折扣后月付110,油耗市区32mpg高速40mpg,养车成本对学生非常友好。\n槽点:隔音一般,雨天胎噪明显;CVT急加速嗡嗡叫,习惯就好;原厂大灯偏暗,换了LED灯泡改善很多。\n残值:同款同里程现在还能卖1万左右,五年折旧两千多,等于每年用车成本主要就是保险和油。学弟已经预定接手,知根知底的车不用互相猜。结论:预算一万出头的学生,Civic/Corolla闭眼买,买菜上课通勤神器。', ARRAY[]::text[], 'Honda', 'Civic', 2018, ARRAY['用车报告','学生用车'], 'active', '2026-06-12 20:30:00-07', '2026-06-12 20:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000039', 'd0000000-0000-0000-0006-000000000022', 'a0000000-0000-0000-0000-000000000002', E'五年折旧两千多真的离谱(褒义),日系保值魔法。学弟这波接手也是聪明,毕业季学长学姐的车是最好的车源,历史全透明。', '2026-06-13 11:20:00-07') ON CONFLICT (id) DO NOTHING;

-- 23 discussion 亚特兰大Momo 安全座椅
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000023', 'a1000000-0000-0000-0000-000000000016', 'discussion', '儿童安全座椅暴晒后金属扣烫手,有解吗?', E'亚特兰大最近天天35度,车停外面,宝宝的安全座椅卡扣和搭扣晒得烫手,有一次差点烫到娃的腿,吓死我了。大家都怎么处理?网上看到有座椅遮阳罩,好用吗?还是说只能每次上车前用湿巾擦降温?另外座椅面料一直这么晒会不会老化影响安全性?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['安全座椅','夏季用车'], 'active', '2026-06-13 09:15:00-04', '2026-06-13 09:15:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000040', 'd0000000-0000-0000-0006-000000000023', 'a1000000-0000-0000-0000-000000000002', E'两娃妈妈经验:1)下车时拿条浅色薄毯把整个座椅盖住,金属件不直晒就不会烫,成本为零;2)专用遮阳罩也就十几刀,弹力罩一套一拉很方便,比毯子不容易滑;3)上车前先摸一遍卡扣再放娃,养成肌肉记忆。面料长期暴晒确实会加速老化,座椅本身也有有效期(一般6-10年,看底座钢印),遮起来还能延缓褪色。', '2026-06-13 12:30:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000041', 'd0000000-0000-0000-0006-000000000023', 'a1000000-0000-0000-0000-000000000036', E'我们是把座椅装在中间位置,避开两侧车窗直射,再加前挡遮阳挡,金属扣温度就可控多了。真晒烫了用湿巾捂十秒比擦有效。', '2026-06-13 16:45:00-04') ON CONFLICT (id) DO NOTHING;

-- 24 chatter 达拉斯Lily 空调油耗
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000024', 'a0000000-0000-0000-0000-000000000005', 'chatter', '德州的夏天,油耗表比气温表先崩', E'实测:同一条通勤路线,四月油耗27mpg,这周24mpg,唯一变量就是空调从来没停过。算了下一个月多烧四十多刀油。但是你要我关空调?不可能,38度的达拉斯,空调就是命。大家夏天油耗都掉了多少?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['油耗','日常'], 'active', '2026-06-13 17:48:00-05', '2026-06-13 17:48:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000042', 'd0000000-0000-0000-0006-000000000024', 'a1000000-0000-0000-0000-000000000020', E'休斯顿+1,我的更惨,带涡轮小排量,夏天空调一开动力油耗双输。四十刀买命,值。', '2026-06-13 21:15:00-05') ON CONFLICT (id) DO NOTHING;

-- 25 discussion 奥斯汀Ethan 拖车钩
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000025', 'a1000000-0000-0000-0000-000000000021', 'discussion', '想装拖车钩拉小拖车,原厂件还是第三方?', E'买了个小型露营拖车(干重900磅),我的SUV标称拖曳能力3500磅但没预装拖车钩。4S店报价原厂hitch加安装要八百多,第三方品牌(Curt/Draw-Tite这类)件加安装四百出头。差价不小,想问:第三方hitch可靠性有差距吗?自己装难度大不大?另外拉这个重量需要装刹车控制器和变速箱油冷吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['拖车','改装'], 'active', '2026-06-14 11:30:00-05', '2026-06-14 11:30:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000043', 'd0000000-0000-0000-0006-000000000025', 'a0000000-0000-0000-0000-000000000007', E'Curt、Draw-Tite、Reese这些大厂第三方hitch都是按车型开模、带SAE等级认证的,结构可靠性和原厂没有实质差距,我店里装得最多的就是Curt。自己装看车型,大部分是车架现成螺栓孔对上就行,有电动工具+千斤顶的人两三小时能搞定,难点通常在排气热盾和防锈螺栓。900磅干重、算上装载撑死1500磅,不带电刹的拖车多数州在这个重量以下不强制刹车控制器,但建议确认德州具体门槛;变速箱油冷在3500磅上限的一半以下、非山区使用可以不加,夏天拉的话勤看水温,高速别用OD强拉长坡就好。布线买带T-connector的接插套件,不用剪原车线。', '2026-06-14 15:05:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000044', 'd0000000-0000-0000-0006-000000000025', 'a1000000-0000-0000-0000-000000000019', E'我拉船好几年了,第三方hitch放心用。给你个省钱路径:件自己网上买(经常打折),找U-Haul或本地hitch专门店安装,工费比4S便宜一半还专业。另外别忘了买球头时对准拖车舌头的尺寸,2英寸和2-5/16英寸别搞混。', '2026-06-14 19:40:00-05') ON CONFLICT (id) DO NOTHING;

-- 26 discussion 贝尔维尤Mia 电车夏天续航
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000026', 'a1000000-0000-0000-0000-000000000039', 'discussion', '电车夏天狂开空调,续航到底掉多少?', E'考虑入手二手电车代步,家里人最大的顾虑是"夏天开空调续航腰斩"。想听真实车主数据:35度左右的天气,空调22度自动,市区+高速混合,实际续航比表显打几折?是不是比冬天开暖气好一些?另外听说停车时用手机App提前开空调降温更省电,是真的吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['电车','续航'], 'active', '2026-06-15 08:55:00-07', '2026-06-15 08:55:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000045', 'd0000000-0000-0000-0006-000000000026', 'a0000000-0000-0000-0000-000000000003', E'Model 3车主四年数据:夏天空调对续航的影响远小于冬天暖气,35度天开空调大概多耗5-10%,冬天零度开暖气能到20-30%。原因是压缩机制冷比电阻/热泵制热省电,而且电池本身喜欢温暖(不喜欢酷热暴晒,但比严寒好)。插枪状态下提前用App预冷是真省——降温的电走充电桩不走电池,上车就是凉的,等于白嫖。你在西雅图的话,夏天这点折损基本无感。', '2026-06-15 11:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000046', 'd0000000-0000-0000-0006-000000000026', 'a1000000-0000-0000-0000-000000000005', E'Ioniq 5车主补个数:上周37度跑101,空调21度,表显续航兑现率大概88%。高速风阻的影响其实比空调大,你开75还是65对续航的影响比开不开空调明显。', '2026-06-15 14:20:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000047', 'd0000000-0000-0000-0006-000000000026', 'a0000000-0000-0000-0000-000000000007', E'从修车角度补充买二手电车的重点:夏天真正要关心的不是空调耗电,是暴晒地区的车电池衰减更快。亚利桑那、内华达来的二手电车,电池健康报告一定要看,同年份可能比西雅图本地车多衰减几个点。', '2026-06-16 09:10:00-07') ON CONFLICT (id) DO NOTHING;

-- 27 review(攻略) Tony 泡水车六步鉴别
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000027', 'a0000000-0000-0000-0000-000000000007', 'review', 'Tony实操:六步鉴别泡水车,一步五分钟', E'最近德州佛州接连大雨,后台好几个人问泡水车。写个店里实际用的六步法,按顺序来,每步几分钟:\n第一步 闻:关窗晒半小时后开门,霉味藏不住;香水味浓得呛人的,更要警惕,那是用来盖味的。\n第二步 掀:掀开主副驾地毯一角,看底板有没有泥沙水渍锈斑。原厂底板胶面干净均匀,泡过水的会有泥线。\n第三步 拉:安全带全部拉到底,根部有水渍霉点的基本实锤,这个位置商家最容易漏处理。\n第四步 照:手电照大灯尾灯内部有没有水雾痕迹、水位线;照座椅滑轨、座椅下方弹簧和电机接头,有浮锈的注意。\n第五步 抠:抠开门槛饰板和后备箱备胎槽,备胎槽是最低点,积过水必留痕。\n第六步 读:电脑读全车模块,泡水车常见一堆模块通讯故障历史码;再看保险丝盒里保险丝是不是异常地全换成新的。\n六步下来两样以上可疑,直接放弃,别赌。泡水车电路问题是慢性病,买回来一年内各种小毛病能烦死你,而且残值归零。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['泡水车','干货','验车'], 'active', '2026-06-15 19:10:00-07', '2026-06-15 19:10:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000048', 'd0000000-0000-0000-0006-000000000027', 'a1000000-0000-0000-0000-000000000020', E'收藏了!正好对应我前几天的提问,休斯顿的朋友们都该存一份。安全带拉到底这招真是简单有效,上周看车试了,一拉出来根部一圈黄渍,扭头就走。', '2026-06-16 10:25:00-05') ON CONFLICT (id) DO NOTHING;

-- 28 discussion 埃尔蒙特小马 一万五预算
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000028', 'a1000000-0000-0000-0000-000000000037', 'discussion', '表妹秋季来读书,一万五总预算怎么分配?', E'表妹八月底落地LA读研,家里给了一万五刀说车相关全包。求教怎么分配合理?我初步想的是:车1.2万,税+过户+上牌1000,保险第一年2000,再留点保养——好像已经超了。是不是该把车价压到一万以内?还是保险可以更便宜?她刚拿驾照没记录,报价会不会很吓人?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['新生','预算'], 'active', '2026-06-16 12:05:00-07', '2026-06-16 12:05:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000049', 'd0000000-0000-0000-0006-000000000028', 'a0000000-0000-0000-0000-000000000008', E'公式给你:总预算的75%买车,25%留给税费保险和第一次保养,这是新手最稳的分法。一万五就是:车价1.1万左右(OTD含税),保险2500-3000(新驾照+留学生在LA就是这么贵,别幻想),剩下500应急。新驾照第一年保险砍不动太多,能做的是:选保险友好的车型(自然吸气日系买菜车)、提高deductible、比五家以上报价、问清有没有留学生渠道折扣。千万别把一万五全花在车价上,我见过太多人提车第二周被保险报价打懵。', '2026-06-16 15:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000050', 'd0000000-0000-0000-0006-000000000028', 'a0000000-0000-0000-0000-000000000001', E'同意楼上比例。补充车型方向:1.1万在LA能买到2015-2017卡罗拉/Civic或者2014-2016凯美瑞,里程8-12万的,足够读书代步。别碰同价位的德系豪华老车,买得起修不起,保险还贵。', '2026-06-16 18:45:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000051', 'd0000000-0000-0000-0006-000000000028', 'a0000000-0000-0000-0000-000000000002', E'过来人真实账单参考:我当年1.05万买车,加税和上牌大概1200,保险第一年2800(21岁新驾照),第一年杂七杂八修车保养600。所以一万五这个预算刚刚好,按上面比例分不会翻车。', '2026-06-17 09:20:00-07') ON CONFLICT (id) DO NOTHING;

-- 29 showoff 圣塔克拉拉Ray 公司充电桩
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000029', 'a1000000-0000-0000-0000-000000000038', 'showoff', '公司楼下装了一排新充电桩,通勤成本归零', E'公司停车场上周装好一排L2桩,员工免费,今天终于抢到位子。早上插上,下班满电,算了下以后通勤电费直接归零,一年省下差不多六百刀。就是抢桩全靠早到,内部群已经开始研究"充满自觉挪车"公约了。建议各位打工人都去推动一下公司装桩,行政说有政府补贴,公司出的钱比想象少。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cologne_Germany_Electric-Car-Charging-Point-at-TUV-Rheinland-01.jpg/960px-Cologne_Germany_Electric-Car-Charging-Point-at-TUV-Rheinland-01.jpg'], NULL, NULL, NULL, ARRAY['电车','充电'], 'active', '2026-06-16 12:40:00-07', '2026-06-16 12:40:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000052', 'd0000000-0000-0000-0006-000000000029', 'a1000000-0000-0000-0000-000000000005', E'羡慕,我司的桩少车多,内部还搞了个排队小程序,充到80%自动提醒挪车。"公司免费充电"现在真是买电车的隐藏理由之一。', '2026-06-16 17:55:00-07') ON CONFLICT (id) DO NOTHING;

-- 30 discussion 圣何塞Jason Carfax
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000030', 'a1000000-0000-0000-0000-000000000006', 'discussion', 'Carfax全绿无事故,就可以放心买了吗?', E'看中一台车,车行拿着Carfax跟我说"你看,无事故、单一车主、保养记录齐全,这车闭眼买"。报告确实很漂亮。但我总觉得哪里不对——如果Carfax全绿就等于好车,那PPI的意义是什么?想问问Carfax到底有哪些查不到的东西?什么情况下干净报告反而更要小心?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['车史报告','避坑'], 'active', '2026-06-17 09:25:00-07', '2026-06-17 09:25:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000053', 'd0000000-0000-0000-0006-000000000030', 'a0000000-0000-0000-0000-000000000007', E'Carfax只记录"被上报过"的事:走了保险的事故、进过合作系统的维修。查不到的包括:私了的事故(现金修车不留记录)、小作坊维修、没报保险的水淹雹损、以及刚发生还没同步的事故(有滞后)。我店里见过Carfax全绿但全车二次喷漆、纵梁拉过的车,前车主撞了没走保险找路边店修的。所以正确用法:Carfax用来"排除"有明确劣迹的车,PPI和漆膜仪用来"确认"没有隐藏劣迹,两者是串联不是二选一。', '2026-06-17 13:40:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000054', 'd0000000-0000-0000-0006-000000000030', 'a0000000-0000-0000-0000-000000000008', E'车行把Carfax当销售武器用力过猛时,你反而该加倍做功课。另外看报告注意两个细节:里程记录曲线有没有断档或倒退;registration州有没有频繁变动。这两个比"事故"栏更能暴露问题。', '2026-06-17 16:20:00-07') ON CONFLICT (id) DO NOTHING;

-- 31 discussion 拉斯维加斯发哥 电瓶
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000031', 'a1000000-0000-0000-0000-000000000028', 'discussion', '维加斯电瓶两年就挂,是我倒霉还是天气问题?', E'在拉斯维加斯住了五年,换了三个电瓶,最短的一个才撑了两年零一个月,刚好过保。朋友在西雅图一个电瓶用六七年。是维加斯天气对电瓶真有这么大伤害,还是我买的牌子不行?有什么延长寿命的办法吗?比如车库停车、买贵的AGM电瓶之类,值得吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['电瓶','夏季用车'], 'active', '2026-06-17 16:50:00-07', '2026-06-17 16:50:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000055', 'd0000000-0000-0000-0006-000000000031', 'a1000000-0000-0000-0000-000000000025', E'凤凰城同病相怜,不是你倒霉,是物理规律:高温加速电瓶内部极板腐蚀和水分蒸发,沙漠地区电瓶平均寿命就是2-3年,北方能到5-6年。我的经验:买电瓶看制造日期(贴纸上有),别买库存超过半年的;车库停车确实有用,发动机舱温度能低不少。两年多换一个在维加斯算正常发挥。', '2026-06-17 20:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000056', 'd0000000-0000-0000-0006-000000000031', 'a0000000-0000-0000-0000-000000000007', E'补充:AGM在高温区值得买,耐热耐震比普通铅酸好,寿命一般多一到两年,差价几十刀摊下来划算。另外每年入夏前免费测一次电瓶(各大配件店都免费测),CCA掉到标称70%以下就主动换,别等大热天打不着火趴在停车场。高温区电瓶的死法通常是"突然死",没什么预兆,主动管理最省心。', '2026-06-18 09:15:00-07') ON CONFLICT (id) DO NOTHING;

-- 32 review 湾区Model3车主 夏季续航实测
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000032', 'a0000000-0000-0000-0000-000000000003', 'review', 'Model 3四年夏季续航实测:湾区vs中谷暴晒', E'一年一度续航汇报。车是2021 Model 3长续航,现在10.2万迈,电池衰减表显约9%。这个月做了两组对比测试:\n湾区通勤(San Jose往返SF,气温21-26度):百迈电耗241Wh/mi,表显续航兑现率约95%,四年老车这个成绩我很满意。\n中谷暴晒行程(去Fresno看朋友,气温39度,车在露天停了六小时):停车六小时哨兵+高温,掉了7迈"停车电";回程空调21度自动,电耗267Wh/mi,兑现率约88%。\n结论和建议:1)夏天真正的续航杀手不是开空调,是暴晒停车+高速风阻;2)长途去热地方,预算续航按表显85%规划就很稳;3)提前预冷再出发,体感和电耗都更好;4)高温快充会有功率保护,尽量利用行程中电池已热但没暴晒的时机充电。四年10万迈衰减9%,当年"电池八年就废"的说法可以歇了。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Electric_car_charging_station_in_Begumpet%2C_Hyderabad.jpg/960px-Electric_car_charging_station_in_Begumpet%2C_Hyderabad.jpg'], 'Tesla', 'Model 3', 2021, ARRAY['电车','续航','用车报告'], 'active', '2026-06-18 21:20:00-07', '2026-06-18 21:20:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000057', 'd0000000-0000-0000-0006-000000000032', 'a1000000-0000-0000-0000-000000000031', E'刚提二手Model 3的新人,这种长期数据太有价值了。请问哨兵模式夏天你一直开着吗?一天掉的电多不多?', '2026-06-19 10:05:00-07') ON CONFLICT (id) DO NOTHING;

-- 33 discussion 尔湾Cindy 私人过户
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000033', 'a1000000-0000-0000-0000-000000000004', 'discussion', '加州私人买车,过户流程和注意事项求梳理', E'第一次不走车行、直接从私人卖家手里买车,车看好了价也谈好了。加州的过户流程能帮我梳理一下吗?title上要签哪里?smog check谁负责?交钱用什么方式安全?听说还要在10天内报DMV?怕漏了哪步之后麻烦。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['过户','买车流程'], 'active', '2026-06-18 10:35:00-07', '2026-06-18 10:35:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000058', 'd0000000-0000-0000-0006-000000000033', 'a0000000-0000-0000-0000-000000000001', E'加州流程:1)卖家责任:提供有效smog证明(多数情况法律规定是卖家出,4年内新车和部分情况豁免)、title正面签字转让、填里程数;2)你拿到签好的title(pink slip)、写好bill of sale(网上有模板,双方留份)、10天内向DMV提交transfer并交use tax(按成交价);卖家那边5天内交Notice of Transfer(NRL)免责。3)付款:银行cashier''s check当面交接最稳,或者约在银行网点转账,大额现金别用。4)title上有lien(车贷没还清)的,必须搞清楚lien release流程再给钱。提交transfer现在DMV网上就能办,别拖过10天,滞纳金不便宜。', '2026-06-18 14:10:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000059', 'd0000000-0000-0000-0006-000000000033', 'a0000000-0000-0000-0000-000000000008', E'补两个细节:交接当场核对title上的VIN和车架上的VIN一致、卖家证件和title名字一致,这两步很多人不好意思做,但这是防"卖别人车"骗局的关键。保险在提车前就生效,别裸奔开回家。', '2026-06-18 17:30:00-07') ON CONFLICT (id) DO NOTHING;

-- 34 discussion 纽约Vincent add-ons
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000034', 'a1000000-0000-0000-0000-000000000009', 'discussion', '车行账单冒出一堆add-on,当场怎么拒?', E'昨天在长岛一家车行谈一台二手RAV4,车价谈得挺好,结果坐下签字时账单上多了:VIN etching $299、nitrogen轮胎充氮 $199、paint protection $495、GPS防盗 $399,说是"都已经装到车上了,拿不掉"。我当场没签跑了。这些东西是真拿不掉吗?下次遇到怎么怼回去?已经装了的真要照价买单?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['砍价','避坑'], 'active', '2026-06-19 18:42:00-04', '2026-06-19 18:42:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000060', 'd0000000-0000-0000-0006-000000000034', 'a0000000-0000-0000-0000-000000000008', E'你做得对,起身走人就是最强话术。这四样的真实成本:VIN etching成本几刀、充氮基本是空气加个绿帽、paint protection就是打个蜡、GPS防盗你月月还要交订阅。"已经装了拿不掉"的标准回应:"装不装是你们的商业决定,不是我的债务。要么按我们谈好的OTD出合同,要么我去下一家。"车行让利空间完全够吞掉这些,他们只是赌你嫌麻烦。最好的防御是谈价阶段就只谈OTD(out-the-door)总价并要求itemized清单,书面确认后再进门签字。', '2026-06-19 21:50:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000061', 'd0000000-0000-0000-0006-000000000034', 'a1000000-0000-0000-0000-000000000033', E'我上个月在南加遇到一样的套路,四件套一模一样连价格都差不多,看来是全国统一话术。我的处理:掏出手机把隔壁车行同款车的挂价给他看,说"你这加完比他贵一千二",经理五分钟后回来说add-on"这次可以waive"。所谓拿不掉,五分钟就拿掉了。', '2026-06-20 10:15:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000062', 'd0000000-0000-0000-0006-000000000034', 'a0000000-0000-0000-0000-000000000007', E'技术打假:充氮对家用车毫无实际意义,空气本来78%就是氮气;VIN etching自己买个蚀刻套装十几刀DIY;真想防盗,方向盘锁加Apple Tag比他家GPS实在。这些add-on没有一样值标价的零头。', '2026-06-20 14:35:00-04') ON CONFLICT (id) DO NOTHING;

-- 35 chatter 天普市阿婷 雪照降温
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000035', 'a1000000-0000-0000-0000-000000000034', 'chatter', '38度高温,靠二月的雪景照片物理降温', E'今天天普市38度,车里烫得像烤箱。整理相册翻到二月去东部出差拍的街景,大雪里一排车盖着厚厚的雪,当时冻得骂骂咧咧,现在看居然觉得凉快……大家还有什么夏日降温偏方,精神上的也行。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/2013_Wien_0035_%288395491298%29.jpg/960px-2013_Wien_0035_%288395491298%29.jpg'], NULL, NULL, NULL, ARRAY['日常','夏季用车'], 'active', '2026-06-19 14:10:00-07', '2026-06-19 14:10:00-07') ON CONFLICT (id) DO NOTHING;

-- 36 discussion 华府Daniel 车内异味
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000036', 'a1000000-0000-0000-0000-000000000015', 'discussion', '刚买的二手车一晒就有异味,怎么根治?', E'上个月买的二手车,平时味道还好,最近天热暴晒之后车里一股说不清的味道,有点像塑料加一点酸味,开空调也压不住。已经做过一次内饰清洗没什么用。是内饰材料晒出来的还是空调系统的问题?活性炭包、臭氧消毒这些管用吗?DC夏天又闷又热,总不能一直开窗。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['异味','夏季用车'], 'active', '2026-06-20 08:20:00-04', '2026-06-20 08:20:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000063', 'd0000000-0000-0000-0006-000000000036', 'a0000000-0000-0000-0000-000000000007', E'"晒后才出来的酸味"两大来源:一是蒸发箱和风道里的霉菌,高温高湿激活,特征是开空调头几分钟最明显——处理办法是换空调滤芯+风道蒸发箱清洗(泡沫清洗剂从进风口打入),再养成到目的地前一两分钟关AC只开风把蒸发箱吹干的习惯;二是前车主用劣质塑料件/香水垫晒出来的挥发味,检查一下座椅下面、后备箱有没有前车主留下的香片、清新剂。臭氧消毒对霉菌味有效但治标,源头不清等于白做。活性炭包聊胜于无。', '2026-06-20 12:45:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000064', 'd0000000-0000-0000-0006-000000000036', 'a1000000-0000-0000-0000-000000000016', E'亚特兰大同款气候,我的车之前也是这样,最后发现是地毯下面一块受潮的隔音棉,前车主洒过东西。掀开地毯摸一摸,潮的话把那块晾干或换掉,味道立刻好转。', '2026-06-20 16:30:00-04') ON CONFLICT (id) DO NOTHING;

-- 37 showoff 罗兰岗车神 帮朋友提车
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000037', 'a1000000-0000-0000-0000-000000000033', 'showoff', '本月第三次陪提车,朋友都叫我人形验车仪', E'今天又陪朋友去车行提车,一台白色CR-V,砍掉了全部add-on,OTD比挂价低了1800。在lot里转的时候销售都认识我了:"你又来了?"哈哈。陪看车三原则分享:白天看车不晚上看、雨天不看漆面、试驾必须上高速。朋友们提车快乐,我也攒了一堆奶茶。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Romford_Suzuki_car_dealership_-_geograph.org.uk_-_1992483.jpg/960px-Romford_Suzuki_car_dealership_-_geograph.org.uk_-_1992483.jpg'], NULL, NULL, NULL, ARRAY['提车','砍价'], 'active', '2026-06-20 15:55:00-07', '2026-06-20 15:55:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000065', 'd0000000-0000-0000-0006-000000000037', 'a1000000-0000-0000-0000-000000000037', E'求带!我表妹八月底到LA就要买车,奶茶管够。"雨天不看漆面"这条学到了,雨水一盖什么划痕色差都看不见。', '2026-06-20 19:40:00-07') ON CONFLICT (id) DO NOTHING;

-- 38 discussion 萨克拉门托Ken 黄石自驾
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000038', 'a1000000-0000-0000-0000-000000000030', 'discussion', '去黄石两周,开自己的车还是租车划算?', E'七月中计划全家黄石+大提顿两周,从萨克拉门托出发,往返3000迈左右。自己的车是台7万迈的RAV4,状态不错。纠结:开自己的车零租金但里程折旧+长途万一出状况;租车两周SUV报价1400多刀,但省心。大家类似长途怎么选的?有什么我没算到的成本?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['自驾','国家公园'], 'active', '2026-06-21 10:10:00-07', '2026-06-21 10:10:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000066', 'd0000000-0000-0000-0006-000000000038', 'a1000000-0000-0000-0000-000000000026', E'丹佛人年年跑国家公园,给你算笔账:3000迈对一台7万迈的RAV4来说折旧+磨损满打满算三四百刀(按IRS里程费率里的磨损部分毛估),比1400的租金便宜得多,而且RAV4七万迈正当壮年,谈不上冒险。租车真正的价值是"里程无限+坏了是他们的事",适合车况可疑或者德系出保车。你这情况我选开自己的,出发前做个检查就行。', '2026-06-21 13:35:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000067', 'd0000000-0000-0000-0006-000000000038', 'a0000000-0000-0000-0000-000000000008', E'补充两个隐藏成本给你对比:租车侧——机场取车的设施费税费能把1400变1700+,还有保险(自己车险能不能覆盖租车要打电话确认);自驾侧——回来最好做次换油(几十刀)。另外黄石七月住宿比租车难抢多了,先搞定住宿再纠结车,哈哈。', '2026-06-21 16:50:00-07') ON CONFLICT (id) DO NOTHING;

-- 39 review 塔科马老周 Outback 露营改装
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000039', 'a1000000-0000-0000-0000-000000000040', 'review', '2017 Outback露营化改装清单,花费不到一千', E'退休后一年露营二十几次,把我的2017 Outback改装清单分享给想入门的朋友,总花费九百出头,全部可逆不动车体:\n1)后排放平自制床板:胶合板+折叠腿+防潮垫,材料费120刀,睡两个成年人没问题;\n2)车窗磁吸纱窗四片,40刀,夏天睡车里不闷还防蚊;\n3)车顶筐(二手)+防水袋,180刀,放桌椅和脏东西;\n4)便携电源500Wh,300刀,手机相机CPAP都够用,白天开车时充回来;\n5)后备箱抽屉式收纳箱两个,60刀,厨房一箱工具一箱;\n6)全车脚垫换橡胶的,80刀,沙子泥巴一冲就净;\n7)遮阳挡+反光窗贴一套,50刀,白天车内不变蒸笼。\n经验:Outback离地高度+对称四驱应付国家公园土路绰绰有余,别一上来就砸钱升底盘AT胎,90%的营地根本用不上。先按我这个清单玩一季,知道自己缺什么再升级。', ARRAY[]::text[], 'Subaru', 'Outback', 2017, ARRAY['露营','改装','攻略'], 'active', '2026-06-21 20:05:00-07', '2026-06-21 20:05:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000068', 'd0000000-0000-0000-0006-000000000039', 'a1000000-0000-0000-0000-000000000008', E'床板方案求细节!腿是什么高度,放平之后和后备箱地台齐吗?我在给我的Crosstrek抄作业,就是空间比您的小一圈。', '2026-06-22 09:30:00-07') ON CONFLICT (id) DO NOTHING;

-- 40 discussion 芝加哥风哥 水温
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000040', 'a1000000-0000-0000-0000-000000000022', 'discussion', '夏天跑高速水温比平时高一格,要紧吗?', E'老车一台,13万迈。最近芝加哥热浪,开空调跑高速水温表比平时高一小格,没到红线,回市区就正常。堵车开空调时风扇声音也比以前大。是正常现象还是冷却系统在报警前兆?需要现在处理还是观察?怕的是哪天直接开锅趴路上。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['冷却系统','维修'], 'active', '2026-06-22 13:35:00-05', '2026-06-22 13:35:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000069', 'd0000000-0000-0000-0006-000000000040', 'a0000000-0000-0000-0000-000000000007', E'"比平时高但没到红线+回市区正常"说明冷却系统余量在变小,还没坏但值得查。13万迈的车按顺序排查:1)冷却液液位和浓度,缺了先补,两年以上没换的直接换;2)冷凝器和水箱之间夹的柳絮泥灰,夏天开空调水温高很多是这个——拆开冲洗一次立竿见影,芝加哥杨絮季刚过,重点怀疑;3)节温器和水泵是13万迈的常见老化件;4)风扇声音大可能是它在拼命补救,也可能轴承老化。花几十刀先做1和2,大概率就解决了。别拖,开锅一次缸垫就可能受伤,那就是四位数的账单了。', '2026-06-22 17:20:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000070', 'd0000000-0000-0000-0006-000000000040', 'a1000000-0000-0000-0000-000000000019', E'德州人经验:后备箱常备一加仑蒸馏水+一瓶预混冷却液,老车夏天这是保命装备。真在高速上水温逼近红线,打开暖风最大档能帮发动机散热,难受但有用,撑到下一个出口。', '2026-06-23 08:40:00-05') ON CONFLICT (id) DO NOTHING;

-- 41 discussion 丹佛高原红 车顶帐篷承重
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000041', 'a1000000-0000-0000-0000-000000000026', 'discussion', '车顶帐篷承重怎么算?动态静态载荷搞不懂', E'想给SUV上个车顶帐篷,帐篷本身130磅,我和媳妇加起来300磅。查了下我的原厂横杆标称载重165磅,那是不是根本不能装?但网上一堆同款车装帐篷的。看到有说"动态载荷"和"静态载荷"是两回事,行驶时算动态、睡觉时算静态?到底怎么算才安全,要不要换第三方横杆?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['露营','车顶帐篷'], 'active', '2026-06-23 09:40:00-06', '2026-06-23 09:40:00-06') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000071', 'd0000000-0000-0000-0006-000000000041', 'a1000000-0000-0000-0000-000000000040', E'你理解的方向是对的:标称165磅是"动态载荷",指行驶中横杆能承受的重量(要应对颠簸、刹车、风压),你的帐篷130磅在范围内,合规;睡觉时车不动,是"静态载荷",载荷通过横杆传到车顶框架再到车身,一般是动态标称的好几倍,130+300=430磅静态对多数SUV车顶结构没问题——帐篷厂商都有静态承重标注,通常600磅起。要注意的反而是:1)横杆必须是固定到车顶纵轨或原厂预留点的,那种纯夹门框的通用横杆别上帐篷;2)装了帐篷重心变高+风阻大,高速别超70,侧风天开慢点。', '2026-06-23 13:15:00-06') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000072', 'd0000000-0000-0000-0006-000000000041', 'a0000000-0000-0000-0000-000000000007', E'楼上讲得专业,我只补一句:装之前把横杆扭矩按说明书上紧,跑500迈后复紧一次,以后每次长途前检查。我见过的车顶帐篷事故不是承重超了,全是螺栓松了。', '2026-06-23 18:40:00-06') ON CONFLICT (id) DO NOTHING;

-- 42 showoff 长岛Sophia 小区充电桩
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000042', 'a1000000-0000-0000-0000-000000000036', 'showoff', '推了半年,小区终于装上充电桩了!', E'从去年十二月开始给物业写邮件、在业委会提案、拉了二十几户联名,今天小区的四个共享充电桩终于通电了!刷卡就能用,费率比外面商业桩便宜三分之一。之前每周要专门跑两趟超市充电,现在楼下解决。想推动自己小区装桩的朋友可以私信我要提案模板,补贴政策用好了物业其实没花多少钱。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Hohenems-Electric_vehicle_charging_station-parking_sign-01ASD.jpg/960px-Hohenems-Electric_vehicle_charging_station-parking_sign-01ASD.jpg'], NULL, NULL, NULL, ARRAY['电车','充电'], 'active', '2026-06-23 18:20:00-04', '2026-06-23 18:20:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000073', 'd0000000-0000-0000-0006-000000000042', 'a1000000-0000-0000-0000-000000000035', E'太强了,这是真·为民办实事。求模板!法拉盛这边老小区车位本来就紧张,物业一听装桩就摇头,得拿数据和补贴政策去说服。', '2026-06-23 21:45:00-04') ON CONFLICT (id) DO NOTHING;

-- 43 discussion 布鲁克林老陈 月供vs总价
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000043', 'a1000000-0000-0000-0000-000000000010', 'discussion', '销售一直问"你想月供多少",这是什么套路?', E'陪儿子看车,发现销售从头到尾不谈车价,张口就是"你预算月供多少?300还是400?"我说谈总价,他绕两句又回到月供。老一辈买车都是谈总价的,现在这是流行月供了吗?感觉里面有猫腻但说不清具体在哪。懂行的给讲讲,顺便教教怎么把话题拉回总价。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['砍价','避坑'], 'active', '2026-06-24 11:15:00-04', '2026-06-24 11:15:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000074', 'd0000000-0000-0000-0006-000000000043', 'a0000000-0000-0000-0000-000000000008', E'您的直觉完全正确,这叫payment packing,是经典套路:锚定月供后,他有无数种办法让"月供400"成立——拉长贷款到84个月、抬高利率吃返点、塞进保修和add-on,你盯着月供看,总成本悄悄多出几千。破法很简单,一句话:"我只谈out-the-door总价,贷款我自己找银行,月供不用你操心。"他再绕就重复这句。谈定OTD总价、白纸黑字itemized之后,再比较dealer金融和自己credit union的利率,谁低用谁。记住顺序:先价格,后金融,永远不要反过来。', '2026-06-24 14:30:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000075', 'd0000000-0000-0000-0006-000000000043', 'a1000000-0000-0000-0000-000000000009', E'补个真实例子:同事被月供话术带着走,"才多35一个月",结果72期贷款多付了2500。所有"每月才多X块"的话术,当场乘以贷款期数再做决定,数字会说话。', '2026-06-24 18:05:00-04') ON CONFLICT (id) DO NOTHING;

-- 44 review(攻略) 避坑酱 OTD邮件谈价
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000044', 'a0000000-0000-0000-0000-000000000008', 'review', '不进店谈价:OTD邮件砍价法+可抄模板', E'很多人怕进车行被销售围攻,其实现在最有效的砍价根本不用进店,全程邮件。方法和模板:\n第一步:锁定目标车型后,给方圆50迈内所有有现车的车行internet sales部门发同一封邮件:\n"你好,我在贵店网站看到stock#XXXX这台车。我本周内可以成交,请直接回复out-the-door总价明细(车价+税+title+doc fee+所有费用)。我在向多家车行询价,OTD最低者得。请勿电话联系,邮件回复即可。"\n第二步:收到报价后,拿最低价去问第二低的:"X店OTD报了$XXXXX,你们能到$XXXXX(再低300-500)我今天就来。"循环两轮即可,别贪。\n第三步:确定成交后,要求把OTD明细写进邮件确认,进店只做三件事:验车、核对合同和邮件一致、签字。合同多出任何一行费用,指着邮件让他删。\n要点:邮件里"本周成交"和"多家比价"缺一不可,这是让他们直接报底价的两个开关;月底、季度底发信效果加成;全程不接电话,电话里他们又会开始表演。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['砍价','攻略'], 'active', '2026-06-24 09:30:00-07', '2026-06-24 09:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000076', 'd0000000-0000-0000-0006-000000000044', 'a1000000-0000-0000-0000-000000000004', E'亲测有效!上个月就是照这个流程,发了七家,五家回了OTD,最后成交价比挂牌低2100,进店到开走一个半小时。唯一提醒:有的车行会打电话轰炸,邮件里写了勿电也打,直接不接就行。', '2026-06-24 16:45:00-07') ON CONFLICT (id) DO NOTHING;

-- 45 discussion 密歇根Anna 跨州搬家
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000045', 'a1000000-0000-0000-0000-000000000023', 'discussion', '从加州搬来密歇根,牌照保险多久内要换?', E'刚随老公工作调动从圣地亚哥搬到安娜堡,车是开过来的,还挂着加州牌。想问:1)密歇根要求多久内换本州driver license和牌照?2)听说密歇根是no-fault保险州,保费结构和加州完全不一样?我的加州保单还有半年才到期,能撑到到期再换吗?3)换牌要不要验车?车是2019年的。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['搬家','过户'], 'active', '2026-06-25 19:45:00-04', '2026-06-25 19:45:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000077', 'd0000000-0000-0000-0006-000000000045', 'a1000000-0000-0000-0000-000000000024', E'邻州人回答:密歇根成为居民后就应尽快换驾照和注册(官方口径是建立居住地后即办,别拖超过30天,查得不严但保险出险时会被抓把柄)。重点是第2条:不能撑到保单到期!你人和车常驻密歇根,继续用加州保单属于garaging address不实,出事故保险公司有权拒赔。密歇根是no-fault州,要买PIP,保费普遍比加州贵,提前有个心理准备。先打给现在的保险公司问能不能转州,不能就重新shop。换牌不需要安全验车,密歇根没有年检,Secretary of State办公室预约办理,带title、保险证明和ID。', '2026-06-26 09:20:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000078', 'd0000000-0000-0000-0006-000000000045', 'a0000000-0000-0000-0000-000000000008', E'楼上说的garaging address问题是重点中的重点,每年都有人栽在"保单还没到期先用着"上。补充:密歇根PIP现在有不同额度档位可选,和你的医保搭配选,别默认无限额度档,差价很大。安娜堡冬天路盐狠,加州车底盘干净,入冬前做个底盘防锈是值得的。', '2026-06-26 14:10:00-04') ON CONFLICT (id) DO NOTHING;

-- 46 discussion 凤凰城Jerry 车衣
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000046', 'a1000000-0000-0000-0000-000000000025', 'discussion', '凤凰城露天停车,车衣到底值不值得天天套?', E'家里没车库,车常年露天,凤凰城的太阳懂的都懂。买了个车衣,套上确实车内温度低很多,漆面也保护了。但每天早晚套/收实在麻烦,一次五分钟,大风天还容易刮跑。而且听说车衣沙尘天反而磨漆?现在纠结要不要坚持。各位沙漠地区的车友都怎么做的,有没有更省事的方案?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['防晒','夏季用车'], 'active', '2026-06-26 07:55:00-07', '2026-06-26 07:55:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000079', 'd0000000-0000-0000-0006-000000000046', 'a0000000-0000-0000-0000-000000000001', E'车衣的悖论就是:最需要它的地方(沙尘大太阳)也是它最伤漆的地方——车身有沙,套上等于拿砂纸盖被子,风一吹来回蹭。所以要么车很干净时套、要么别套。我的建议排序:1)想办法搞个carport遮阳棚,凤凰城很多家庭装,几百到一千多,一劳永逸;2)退而求其次,只在长时间停放(出差、回国)时用车衣,并且套之前掸掉浮尘;3)日常靠遮阳挡+贴膜+定期打蜡镀膜保漆。每天套收五分钟,坚持不了三个月的,人性使然。', '2026-06-26 11:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000080', 'd0000000-0000-0000-0006-000000000046', 'a1000000-0000-0000-0000-000000000028', E'维加斯同款烦恼,我最后的方案是租了个带顶棚的车位,一个月多35刀,比车衣省事一百倍。漆面每季度打一次蜡。车衣现在只有飞长途时用。', '2026-06-26 15:50:00-07') ON CONFLICT (id) DO NOTHING;

-- 47 showoff 萨克拉门托Ken Bolt提车
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000047', 'a1000000-0000-0000-0000-000000000030', 'showoff', '一万四拿下二手Bolt,通勤神器不过如此', E'黄石行程定了租车之后,顺手把家里第二台车的坑填了:一万四千刀收了台2022 Bolt EUV,两万八千迈,电池是召回后免费换过的新包,等于捡了个大便宜。老婆通勤单程18迈,一周充一次都富余。今天在超市快充顺便买菜,半小时回来电量够用一周。油车电车双持的组合我们家算是定型了:长途油车,通勤电车,各干各的活。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Electric_car_charging_station_in_Begumpet%2C_Hyderabad.jpg/960px-Electric_car_charging_station_in_Begumpet%2C_Hyderabad.jpg'], NULL, NULL, NULL, ARRAY['提车','电车'], 'active', '2026-06-27 12:30:00-07', '2026-06-27 12:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000081', 'd0000000-0000-0000-0006-000000000047', 'a1000000-0000-0000-0000-000000000001', E'换过新电池包的Bolt是二手电车里的隐藏彩蛋,懂行的都在抢。一万四这价格很漂亮,恭喜!"长途油车+通勤电车"确实是现阶段家庭最优解。', '2026-06-27 16:20:00-07') ON CONFLICT (id) DO NOTHING;

-- 48 discussion 尔湾老王 7/4错峰
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000048', 'a0000000-0000-0000-0000-000000000001', 'discussion', '独立日想去圣地亚哥,哪天走哪天回不堵?', E'今年七月四号是周六,打算带家人去圣地亚哥玩三天。尔湾出发走5号,往年这个周末堵到怀疑人生。经验丰富的朋友说说:去程周四晚走还是周五一早?回程周日下午是不是重灾区,周一早上回是不是好很多?或者干脆错开,周六早上出发?求各位历年实战数据。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['独立日','自驾'], 'active', '2026-06-28 16:05:00-07', '2026-06-28 16:05:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000082', 'd0000000-0000-0000-0006-000000000048', 'a1000000-0000-0000-0000-000000000002', E'年年跑这条线的经验:节前周四晚七点后出发是最优解,周五全天都是重灾区,周五早上"早点走"的人太多,七点已经开始堵了。回程你猜对了,周日下午2-8点的5号北向是史诗级停车场,周一早上回几乎畅通,代价是请半天假,值。周六早上出发其实也不差,大部队周五已经走完了。', '2026-06-28 19:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000083', 'd0000000-0000-0000-0006-000000000048', 'a1000000-0000-0000-0000-000000000029', E'圣地亚哥本地人补充:市区看烟花的话,4号晚上港口周边停车是地狱难度,建议住得离景点近一点走路去,或者搭trolley。别信"提前一小时到就有车位",提前三小时都悬。', '2026-06-29 09:45:00-07') ON CONFLICT (id) DO NOTHING;

-- 49 discussion 达拉斯德州哥 0% APR
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000049', 'a1000000-0000-0000-0000-000000000019', 'discussion', '独立日广告满天飞,0% APR是真优惠还是钩子?', E'一到七月四号,达拉斯遍地"0% APR 72个月""省$5000"的横幅。认真问下懂行的:0%利率是真的吗?什么人能拿到?是不是拿了0%就不能再砍车价?还有那种"July 4th Sale价"比平时真的低吗,感觉水分很大。这周末想去看车,先做做功课免得被节日气氛冲昏头。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['独立日','砍价'], 'active', '2026-07-01 10:20:00-05', '2026-07-01 10:20:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000084', 'd0000000-0000-0000-0006-000000000049', 'a0000000-0000-0000-0000-000000000008', E'0% APR是真的,但有三个隐藏条件:1)只给顶级信用分(一般720+甚至740+),广告小字写着"well-qualified buyers",大部分人到店会被告知"你的分数只能拿5.9%";2)通常和现金返利二选一,0%利息省的钱不一定比拿返利+外部低息贷款多,要自己算;3)常限定特定库存车型。至于"节日价",套路是节前两周先悄悄回调挂牌价,节日再"大促"回去。防身办法:现在就把目标车型的挂牌价截图存档,周末对比,真降了才是真优惠。节日促销唯一真实的红利是月初+假日冲量,销售确实更愿意谈。', '2026-07-01 14:35:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000085', 'd0000000-0000-0000-0006-000000000049', 'a0000000-0000-0000-0000-000000000001', E'补充一个实战细节:0%和车价是两条战线,先用邮件把OTD价谈死,进店再谈金融方案,顺序反了就会被"给你申请到0%了所以车价不能动"拿捏。二手车基本没有0%,那是新车清库存的工具。', '2026-07-01 17:50:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000086', 'd0000000-0000-0000-0006-000000000049', 'a1000000-0000-0000-0000-000000000009', E'去年独立日我就是被"省$4500"横幅吸进去的,进店发现那是顶配车型叠加所有不可能同享的返利算出来的数字。最后按自己邮件询价的OTD成交,和节日毫无关系,哈哈。', '2026-07-02 09:10:00-05') ON CONFLICT (id) DO NOTHING;

-- 50 discussion 迈阿密Sunny 飓风停车
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000050', 'a1000000-0000-0000-0000-000000000018', 'discussion', '飓风预警时,车到底停哪里最安全?', E'气象台说今年是活跃季,想提前做好预案。住的公寓只有露天停车场,离海两迈。如果飓风真来了:1)停车楼高层是不是最优解?会不会被大风吹坏玻璃?2)听说机场和商场的停车楼风暴期间会开放?3)树底下、灯杆边肯定不能停,还有什么位置要避开?4)保险方面comprehensive覆盖水淹和风灾吧?坐标迈阿密,求本地前辈经验。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['飓风季','停车'], 'active', '2026-07-01 15:35:00-04', '2026-07-01 15:35:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000087', 'd0000000-0000-0000-0006-000000000050', 'a1000000-0000-0000-0000-000000000017', E'停车楼二层到中层是黄金位置:躲开地面洪水,又不在顶层吃最大风+吹来的杂物。靠建筑内侧停,离外沿和坡道口远一点,玻璃朝里。部分城市风暴前会宣布开放市政停车楼免费避险,关注county的应急推特/短信;商场停车楼要看物业,别赌,提前一天占位。避开:任何树、电线杆、广告牌、工地围挡下风处,还有看起来地势低的"免费好位置"——它免费是有原因的。', '2026-07-01 19:20:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000088', 'd0000000-0000-0000-0006-000000000050', 'a1000000-0000-0000-0000-000000000020', E'保险确认:水淹、风灾、被吹落物砸中都走comprehensive,和collision无关,deductible看你保单。休斯顿哈维过来人提醒:风暴前给车四面+VIN+里程表拍照留档,理赔时省无数扯皮。只有liability的现在就去加comp,风暴进入预警区后保险公司会冻结新增保项(binding restriction),到时想加都加不了。', '2026-07-02 10:40:00-04') ON CONFLICT (id) DO NOTHING;

-- 51 review(攻略) 避坑酱 独立日促销套路
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000051', 'a0000000-0000-0000-0000-000000000008', 'review', '独立日车行促销五大套路,今年照旧上演', E'一年一度,横幅又挂起来了。把车行独立日的五大保留节目盘一遍,对号入座:\n套路一:虚构原价。节前两周挂牌价悄悄上调,节日"直降$3000"回到原点。防法:提前把目标车价格截图,浏览器价格追踪插件用起来。\n套路二:堆叠返利。广告上"最高省$5500"是把军人返利+毕业生返利+置换返利+品牌忠诚返利全加一起,你能同时满足的概率约等于零。\n套路三:0% APR钓鱼。真存在,但要顶级信用+特定车型,到店后"很遗憾您只能……"话术无缝衔接高息方案。\n套路四:doc fee和add-on回血。车价给你降,签字时文件费、防盗刻字、脚垫包全找补回来。只认OTD总价,一项项对。\n套路五:"就今天,过了节恢复原价。"假的。7月5号车还在,价还能谈,月底可能更便宜。\n给认真买车的人一句实话:独立日唯一真实的优势是季度中冲量+客流大销售愿意快速成交,把功课做足的人任何一天都是好日子,没做功课的人促销日最容易被宰。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Romford_Suzuki_car_dealership_-_geograph.org.uk_-_1992483.jpg/960px-Romford_Suzuki_car_dealership_-_geograph.org.uk_-_1992483.jpg'], NULL, NULL, NULL, ARRAY['独立日','避坑','攻略'], 'active', '2026-07-02 08:45:00-07', '2026-07-02 08:45:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000089', 'd0000000-0000-0000-0006-000000000051', 'a1000000-0000-0000-0000-000000000010', E'套路一亲眼见证:关注了一个月的车,6月20号挂价涨了800,今天"独立日特惠降1000"。要不是有截图,还真以为捡了便宜。', '2026-07-02 13:20:00-04') ON CONFLICT (id) DO NOTHING;

-- 52 showoff 华府Daniel 充电遛娃
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000052', 'a1000000-0000-0000-0000-000000000015', 'showoff', '带娃充电两不误,这个桩位选得完美', E'发现一个宝藏充电点:桩就在公园停车场,插上枪带娃去玩滑梯,四十分钟回来电量80%,娃的电量归零,完美闭环。自从摸清了家附近几个"可以顺便干事"的桩位,充电焦虑就没有了——超市桩买菜、公园桩遛娃、图书馆桩陪写作业。电车生活的正确打开方式是把充电嵌进生活,而不是专门跑一趟。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Dornbirn-OMV-Electric_vehicle_charging_station-01ASD.jpg/960px-Dornbirn-OMV-Electric_vehicle_charging_station-01ASD.jpg'], NULL, NULL, NULL, ARRAY['电车','充电','带娃'], 'active', '2026-07-02 19:30:00-04', '2026-07-02 19:30:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000090', 'd0000000-0000-0000-0006-000000000052', 'a1000000-0000-0000-0000-000000000009', E'"娃的电量归零"哈哈哈笑死,这才是真·能量守恒。求DC周边宝藏桩位清单,我也开始规划"充电+办事"路线了。', '2026-07-03 08:50:00-04') ON CONFLICT (id) DO NOTHING;

-- 53 discussion 圣地亚哥Wendy 露营沙子
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000053', 'a1000000-0000-0000-0000-000000000029', 'discussion', '海滩露营回来,车里的沙子怎么才能清干净?', E'上周末去海滩露营,回来车里全是沙子,地毯缝、座椅轨道、门槛、后备箱,无处不在。家用吸尘器吸了一小时还是感觉硌脚。有什么高效办法?投币洗车场那种大功率吸尘器好用吗?还有座椅轨道里的沙粒会不会磨坏滑轨,需要专门处理吗?以后怎么防,总不能不去海滩吧。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['清洁','露营'], 'active', '2026-07-03 11:40:00-07', '2026-07-03 11:40:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000091', 'd0000000-0000-0000-0006-000000000053', 'a1000000-0000-0000-0000-000000000008', E'露营老油条流程:1)先把脚垫全拿出来摔打+水冲,车内沙量少一半;2)投币洗车场吸尘器吸力是家用的好几倍,值得专门跑一趟,重点吸轨道和缝隙;3)顽固沙粒用硬毛刷边刷边吸,地毯纤维里的沙要"刷出来"才吸得到;4)座椅轨道确实要清,沙粒会让滑动发涩,吸完拿WD-40或白锂喷一点在轨道上滑动几次。防的方面:全车换TPE橡胶脚垫、后备箱铺一块野餐垫装脏东西、车门口放条毛巾进车前擦脚拍沙,能防住80%。', '2026-07-03 15:20:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000092', 'd0000000-0000-0000-0006-000000000053', 'a0000000-0000-0000-0000-000000000001', E'加一招:吸之前撒一点小苏打在地毯上等十分钟再吸,顺便除潮味。另外沙滩回来底盘和轮拱记得冲一下,海边的沙带盐分,粘在底盘上不是好事。', '2026-07-03 18:45:00-07') ON CONFLICT (id) DO NOTHING;

-- 54 chatter 圣盖博阿强 洗车排队
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000054', 'a1000000-0000-0000-0000-000000000003', 'chatter', '洗车场排队四十分钟,全城都在为7/4洗车', E'下午去圣盖博常去的洗车场,好家伙,队排到街上,等了四十多分钟。老板笑得合不拢嘴,说独立日前这几天是一年最忙的时候之一,人人都要开着干净车出门度假。早知道我上周就洗了。友情提示:想节前洗车的,赶早场,或者干脆等收假回来再洗——反正跑一趟长途回来又是一层虫子。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['日常','独立日'], 'active', '2026-07-03 16:20:00-07', '2026-07-03 16:20:00-07') ON CONFLICT (id) DO NOTHING;

-- 55 chatter 奥斯汀Ethan 暴雪回忆
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000055', 'a1000000-0000-0000-0000-000000000021', 'chatter', '41度的独立日,想起2021年2月的德州', E'今天奥斯汀41度,烤箱模式。翻手机居然翻到2021年2月德州大暴雪的照片,那年整个州停电,车全埋在雪里,加油站排队,我裹着毯子在车里给手机充电。五年过去,同一个州,零下十几到零上四十几,德州人的车什么世面没见过。祝各位独立日快乐,空调和烤肉都别停。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Dallas_snow_2021.jpg/960px-Dallas_snow_2021.jpg'], NULL, NULL, NULL, ARRAY['日常','独立日'], 'active', '2026-07-04 14:10:00-05', '2026-07-04 14:10:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000093', 'd0000000-0000-0000-0006-000000000055', 'a1000000-0000-0000-0000-000000000020', E'那年我在休斯顿水管都冻爆了,车倒是成了全家唯一的取暖点。从那以后我车里常年放应急毯和充电宝,夏天也不拿下来。德州人的后备箱就是一个小型救灾中心,哈哈。', '2026-07-04 18:35:00-05') ON CONFLICT (id) DO NOTHING;

-- 56 discussion 西雅图阿明 充电桩被占
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000056', 'a0000000-0000-0000-0000-000000000006', 'discussion', '充电位被油车占了,大家一般怎么处理?', E'今天在商场充电站,四个桩位两个被油车当普通车位停了,剩下俩在排队。等了半天忍不住想贴条又怕惹事。想问问大家:1)遇到ICE占位(油车占充电位)有什么文明有效的处理方式?2)商场物业管吗,打电话有用吗?3)华州这种情况能叫拖车吗?另外也提醒电车车主,充满了尽快挪车,占着桩不充电和油车占位一样招人烦。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Dornbirn-OMV-Electric_vehicle_charging_station-01ASD.jpg/960px-Dornbirn-OMV-Electric_vehicle_charging_station-01ASD.jpg'], NULL, NULL, NULL, ARRAY['电车','充电'], 'active', '2026-07-05 13:25:00-07', '2026-07-05 13:25:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000094', 'd0000000-0000-0000-0006-000000000056', 'a0000000-0000-0000-0000-000000000003', E'处理优先级:1)先找物业/商场客服,标了EV Only的私有停车场,物业有权贴警告或叫拖车,打个电话比自己贴条安全有效;2)华州法律对公共道路上的充电位占用有罚则,私有停车场主要靠物业执行;3)自己千万别堵别人车或留攻击性字条,遇到过极端案例升级成剐蹭纠纷,不值。长期方案是用App提前看桩位实时状态,被占率高的点位少去。你最后一句说得对,充电礼仪是双向的,80%后挪车该成为共识。', '2026-07-05 16:40:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000095', 'd0000000-0000-0000-0006-000000000056', 'a1000000-0000-0000-0000-000000000039', E'贝尔维尤这边有几个商场把充电位挪到了保安亭视线内,占位现象立刻少了。可以给常去的商场客服提这个建议,比贴条管用。另外错峰充电真的香,工作日晚八点后基本没人抢。', '2026-07-05 20:15:00-07') ON CONFLICT (id) DO NOTHING;

-- 57 review 湾区凯文 Ioniq 5一年
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000057', 'a1000000-0000-0000-0000-000000000001', 'review', 'Ioniq 5一年两万迈:充电体验才是它的杀手锏', E'2022款Ioniq 5 SEL,去年七月二手价三万一入手,一年两万迈总结:\n充电(核心优势):800V架构快充是真的快,状态好的350kW桩上10-80%实测十八九分钟,长途饭点充电,吃完就走,和油车加油的时间差已经不大。家充L2一晚满电,电费谷时费率每迈成本约3美分。\n续航:EPA标256,夏天实测高速打88折左右,湾区通勤场景完全无感。\n空间:轴距大后排是真宽敞,爸妈来访连声说比朋友的3系后排舒服。\n槽点:1)没有后雨刮,下雨天后窗视野感人(新款加回去了);2)车机偶尔卡顿,重启解决;3)胎噪偏大,换了静音胎改善明显;4)12V小电瓶亏电问题遇到过一次,更新软件后没再犯。\n一年维护成本:轮胎换位+空调滤芯+雨刮,合计不到200刀。电池健康SOH显示98%。\n结论:三万出头的二手Ioniq 5是目前性价比很高的家用电车,买它主要就是买那个充电速度。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Hohenems-Electric_vehicle_charging_station-parking_sign-01ASD.jpg/960px-Hohenems-Electric_vehicle_charging_station-parking_sign-01ASD.jpg'], 'Hyundai', 'Ioniq 5', 2022, ARRAY['电车','用车报告'], 'active', '2026-07-05 20:40:00-07', '2026-07-05 20:40:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000096', 'd0000000-0000-0000-0006-000000000057', 'a1000000-0000-0000-0000-000000000005', E'刚接手同事Ioniq 5的路过,数据完全对得上,尤其"吃饭充电吃完就走"这条。12V亏电那个我也被提醒过,提车第一件事就是把软件更到最新。', '2026-07-06 09:25:00-07') ON CONFLICT (id) DO NOTHING;

-- 58 discussion 波士顿学姐 parking permit
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000058', 'a1000000-0000-0000-0000-000000000013', 'discussion', '学校parking permit一年900刀,买还是打游击?', E'实习回来准备秋季学期的事,学校campus permit一年900刀,而且还不保证有位(faculty lot优先)。同学里分两派:一派乖乖买permit,一派在周边小区打游击+吃罚单,声称罚单一年也就两三百比permit便宜。我有点心动但怕拖车。波士顿地区的过来人给个建议?还有permit是不是可以两人share,学校查得严吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['停车','学生用车'], 'active', '2026-07-06 09:10:00-04', '2026-07-06 09:10:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000097', 'd0000000-0000-0000-0006-000000000058', 'a1000000-0000-0000-0000-000000000011', E'打游击派的隐藏成本给你补全:波士顿周边小区大多是resident permit only,罚单45-90刀一张不说,真正的杀手是拖车——一次拖车+存车费200起步,再算上你上课迟到去赎车的时间成本,一年两次就追平permit了。而且扫街日(street cleaning)季节挪车能把人逼疯。除非你课很少一周去两天,否则打游击是伪省钱。', '2026-07-06 12:30:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000098', 'd0000000-0000-0000-0006-000000000058', 'a0000000-0000-0000-0000-000000000002', E'第三条路参考:很多学校有便宜一半的远端lot+shuttle,或者只买"off-peak permit"下午到校的档;再或者查查地铁沿线的park&ride,停车费+地铁票可能比campus permit便宜,还不用抢位。share permit这事,车牌是登记死的,查到按honor code处理,别拿学籍开玩笑。', '2026-07-06 16:45:00-04') ON CONFLICT (id) DO NOTHING;

-- 59 showoff 亚特兰大Momo Leaf
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000059', 'a1000000-0000-0000-0000-000000000016', 'showoff', '八千五收的Leaf,接送娃买菜它就是完美的', E'家里添了台二手Leaf当妈妈车,八千五百刀,四万迈,电池健康10格满10格(SV Plus大电池版不敢想,我们这个够用)。用途就是每天接送娃+超市+周末兴趣班,单日撑死40迈,一周充两次。今天第一次用商场的免费桩,买菜一小时白嫖20多迈续航。这个价位的电车真的被低估了,同价油车我得担心变速箱,这个连机油都不用换。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Cologne_Germany_Electric-Car-Charging-Point-at-TUV-Rheinland-02.jpg/960px-Cologne_Germany_Electric-Car-Charging-Point-at-TUV-Rheinland-02.jpg'], NULL, NULL, NULL, ARRAY['电车','提车','家庭用车'], 'active', '2026-07-06 18:30:00-04', '2026-07-06 18:30:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000099', 'd0000000-0000-0000-0006-000000000059', 'a1000000-0000-0000-0000-000000000018', E'Leaf当短途家庭车确实是性价比之王,亚特兰大夏天记得尽量别在暴晒时快充,Leaf没有主动液冷,连着快充电池温度会上得快。家充慢充完全没这个问题。', '2026-07-07 08:20:00-04') ON CONFLICT (id) DO NOTHING;

-- 60 discussion 哥伦布小舟 odometer举报
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000060', 'a1000000-0000-0000-0000-000000000024', 'discussion', '确认遇到调表车了,应该去哪里举报?', E'之前发帖问PPI的后续:那台Accord我没买,但后来另一台车让技师查出模块里程和表显差了六万迈,实锤调表。车贩子还在平台上挂着卖,标"低里程一手车"。这种情况我该向谁举报?州DMV?警察?还是联邦哪个部门?举报需要什么证据,技师的检测记录够吗?不想别人再被坑。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['里程表','举报','避坑'], 'active', '2026-07-07 12:15:00-04', '2026-07-07 12:15:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000100', 'd0000000-0000-0000-0006-000000000060', 'a0000000-0000-0000-0000-000000000008', E'先赞一个负责任。渠道从上到下:1)NHTSA——调表(odometer fraud)是联邦罪,NHTSA有专门的odometer fraud举报线,官网可查投诉入口;2)州检察长办公室(Attorney General)消费者保护部门,俄亥俄AG网上就能提交;3)州DMV/BMV的dealer licensing部门,如果对方是持牌车商,这条最能打疼他;4)挂车的平台也举报一份,平台会下架。证据:技师书面检测记录(模块里程截图)、车辆VIN、广告页面截图(里程宣称)、你和卖家的沟通记录。不需要你证明到刑事标准,监管部门会自己查。', '2026-07-07 15:40:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000101', 'd0000000-0000-0000-0006-000000000060', 'a0000000-0000-0000-0000-000000000007', E'技师这边配合:让他把诊断电脑读数导出带时间戳的报告,注明设备型号和读取模块,这种报告监管收的。顺说行规:正规技师查出调表都愿意出这个报告,不愿意出的技师你也可以换一家。干这行最恨调表的就是我们,背锅的总是后面接手维修的。', '2026-07-08 09:05:00-04') ON CONFLICT (id) DO NOTHING;

-- 61 review 纽约Vincent 2019 RAV4
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000061', 'a1000000-0000-0000-0000-000000000009', 'review', '2019 RAV4两年车主报告:无聊,但无聊得值', E'两年前三万迈二手价2.3万接手的2019 RAV4 XLE,现在6.1万迈,交作业:\n可靠性:两年零故障,字面意义的零。保养全按手册,机油轮胎刹车片,没有一次计划外进厂。\n油耗:市区27高速33mpg,纽约走走停停也不难看。\n空间:后备箱吞下过一张宜家双人床垫(压着),搬家神器。\n驾驶感受:这是它唯一"扣分"的地方——毫无驾驶乐趣,油门慵懒,过弯侧倾,方向盘没什么沟通感。但说实话,在纽约堵车,乐趣是留给别人的,我只要它别坏。\n二手行情:现在同款同里程还能卖1.9万+,两年折旧不到四千,除以730天,每天折旧五块多,比地铁月票贵不了多少。\n给纠结的人一句话:如果你要一台买了就不用再想"车"这件事的车,RAV4/CR-V这个级别就是答案。无聊是它的功能,不是缺陷。', ARRAY[]::text[], 'Toyota', 'RAV4', 2019, ARRAY['用车报告','家庭用车'], 'active', '2026-07-07 21:05:00-04', '2026-07-07 21:05:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000102', 'd0000000-0000-0000-0006-000000000061', 'a1000000-0000-0000-0000-000000000012', E'"无聊是它的功能"这句话可以裱起来。我在新泽西开同款,补充一个小毛病供参考:我的车机偶尔CarPlay断连,换根原装线好了。其他完全同感,两年就换了个雨刮。', '2026-07-08 09:40:00-04') ON CONFLICT (id) DO NOTHING;

-- 62 discussion 圣塔克拉拉Ray 电池健康
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000062', 'a1000000-0000-0000-0000-000000000038', 'discussion', '买二手电车,电池健康度到底怎么查才靠谱?', E'开油车多年,想换台二手电车,预算三万。最大的疑问是电池:卖家口头说"电池很好"没有意义吧?想知道:1)各品牌有没有官方渠道查SOH(电池健康度)?2)第三方检测报告(如某些App读OBD的)可信吗?3)快充记录多的车电池是不是伤得多,这个能查到吗?4)什么样的衰减数值算正常,什么样的该跑?附图是今天在公司桩拍的,看着别人充电我心痒好久了。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cologne_Germany_Electric-Car-Charging-Point-at-TUV-Rheinland-01.jpg/960px-Cologne_Germany_Electric-Car-Charging-Point-at-TUV-Rheinland-01.jpg'], NULL, NULL, NULL, ARRAY['电车','验车','电池'], 'active', '2026-07-08 10:30:00-07', '2026-07-08 10:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000103', 'd0000000-0000-0000-0006-000000000062', 'a0000000-0000-0000-0000-000000000003', E'特斯拉的话:车机里能做电池健康测试(需要几小时),或者服务中心出报告;粗略办法是充到100%看表显续航和新车EPA对比。第三方OBD工具读BMS数据是靠谱的,数据是车自己报的,App只是翻译,Recurrent这类服务出的报告车行也认。衰减参考线:前两三万迈掉得快(5-8%)后面变缓是正常曲线;同年份车衰减超过15%、或者卖家拒绝让你充满看续航的,过。', '2026-07-08 13:50:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000104', 'd0000000-0000-0000-0006-000000000062', 'a0000000-0000-0000-0000-000000000007', E'补充非特斯拉品牌:现代起亚在4S能读SOH,很多车主实测显示掉得很慢;日产Leaf仪表有电池格数直显(12格),掉到10格以下价格要重谈;大众ID系列用OBDeleven之类能读。快充占比历史大多数车查不到精确记录,但可以看CCS/超充口磨损程度侧面判断。最重要的一条:电车八年/十万迈电池质保多数可跟车转移,买前确认这台车的质保剩余,比纠结一两个点的SOH更实际。', '2026-07-08 17:15:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000105', 'd0000000-0000-0000-0006-000000000062', 'a1000000-0000-0000-0000-000000000001', E'过来人建议:约看车时把"充满电+试驾时看能耗表"写进沟通里,当场从80%充到100%的半小时正好试驾+检查内饰,一举两得。我买Ioniq 5时就这么干的,卖家爽快答应的基本车没问题,支支吾吾的直接下一台。', '2026-07-09 08:30:00-07') ON CONFLICT (id) DO NOTHING;

-- 63 chatter 密歇根Anna 囤雪胎
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000063', 'a1000000-0000-0000-0000-000000000023', 'chatter', '七月买雪胎是不是最划算?已开始物色', E'搬来密歇根后被邻居科普:雪胎要七八月买,反季节最便宜,等十一月第一场雪再买,价格贵两成还可能断码。刚看了一圈,去年同款雪胎现在确实便宜不少。加州来的我看着snow tire价格表,再看看窗外35度的太阳,有种荒诞的仪式感,哈哈。附一张去年冬天的照片提醒自己为什么要买。密歇根的前辈们,雪胎推荐也欢迎砸过来。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Cars_driving_through_blowing_snow_on_NY_211_outside_Montgomery.jpg/960px-Cars_driving_through_blowing_snow_on_NY_211_outside_Montgomery.jpg'], NULL, NULL, NULL, ARRAY['轮胎','日常'], 'active', '2026-07-08 17:45:00-04', '2026-07-08 17:45:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000106', 'd0000000-0000-0000-0006-000000000063', 'a1000000-0000-0000-0000-000000000022', E'邻居说得对,反季买是老司机操作,再配一套便宜钢圈把雪胎装好,换季自己十分钟换四个轮,不用排队等tire shop。芝加哥人都这么玩,Blizzak和X-Ice闭眼二选一。', '2026-07-08 21:10:00-04') ON CONFLICT (id) DO NOTHING;

-- 64 discussion 休斯顿Nina 涉水
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000064', 'a1000000-0000-0000-0000-000000000020', 'discussion', '暴雨积水多深就绝对不能开过去?', E'休斯顿一下暴雨到处积水,每次看到前车过我也硬着头皮跟,其实心里没底。想要个明确标准:1)多深的水轿车绝对不能过?SUV能放宽多少?2)看不出深度时有什么判断技巧?3)万一开到一半熄火,正确操作是什么,是不是绝对不能二次打火?4)水刚没过排气管有没有事?求科学答案,不要"感觉能过就过"。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['暴雨','安全'], 'active', '2026-07-09 08:50:00-05', '2026-07-09 08:50:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000107', 'd0000000-0000-0000-0006-000000000064', 'a0000000-0000-0000-0000-000000000007', E'给你硬标准:轿车安全线是水深不超过轮胎一半(约6-8英寸),SUV放宽到轮胎2/3,超过就绕行,没有例外。真正的红线是进气口高度不是排气管——排气有压力,水一般倒灌不进去,但进气吸一口水就是发动机顶缸,大修四位数起步。判断技巧:看路缘石(标准高度约6英寸,淹没即接近轿车极限)、看前车水位到哪、水流湍急的直接放弃(6英寸流动的水就能让车失去抓地)。熄火后:绝对不能二次打火,保险条款里"涉水后二次点火导致的损坏"很多不赔;挂N推到高处或直接弃车走人。最后:官方口径永远是Turn Around Don''t Drown,前车过了不代表你能过,它可能进气口比你高十公分。', '2026-07-09 11:30:00-05') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000108', 'd0000000-0000-0000-0006-000000000064', 'a1000000-0000-0000-0000-000000000021', E'德州人补一条本地知识:underpass(下穿通道)是暴雨吞车重灾区,看着只是水洼,中间能有六七英尺深,每年新闻都有。暴雨天宁可绕三迈,不走任何下穿路段。手机装个本地flood warning的App,休斯顿有实时积水地图。', '2026-07-09 14:45:00-05') ON CONFLICT (id) DO NOTHING;

-- 65 review(攻略) Tony 二手电车验车
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000065', 'a0000000-0000-0000-0000-000000000007', 'review', 'Tony谈二手电车验车:和油车完全不同的七个点', E'最近店里电车检测单子明显变多,很多人拿着油车的PPI清单去看电车,方向就错了。二手电车要看的七个点:\n1)电池SOH报告:品牌官方或BMS直读,同车龄衰减超15%要重新议价;质保剩余年限/里程比SOH数字更值钱。\n2)充电口:CCS/NACS口有没有烧蚀发黑、插拔松旷,家充枪实插一次看握手速度,充电口问题修起来不便宜。\n3)高压线束和电池包底部:举升看电池包壳体有没有磕碰凹陷、托底痕迹,包体受过冲击的车再便宜都别要。\n4)轮胎:电车扭矩大车重大,吃胎快且常用专用静音胎,四条胎剩余寿命直接折现砍价,一套贵的能上一千五。\n5)12V小电瓶:电车趴窝一半是它干的,看生产日期,超三年让卖家换。\n6)刹车盘:电车动能回收多、机械刹车用得少,反而容易锈蚀出沟,试驾时重刹两脚听有没有异响。\n7)软件和账户:车机账号能不能顺利解绑过户、有没有付费功能(自动驾驶包、加热座椅订阅)跟车,当场确认,口头承诺无效。\n最后提醒:电车没有变速箱和发动机的历史包袱,机械检测反而简单,重心全在电池、高压系统和软件,找会电车的技师做检测,别找只会听发动机的老师傅,包括我这样的老家伙都是重新学的。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Cologne_Germany_Electric-Car-Charging-Point-at-TUV-Rheinland-02.jpg/960px-Cologne_Germany_Electric-Car-Charging-Point-at-TUV-Rheinland-02.jpg'], NULL, NULL, NULL, ARRAY['电车','验车','干货'], 'active', '2026-07-09 18:15:00-07', '2026-07-09 18:15:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000109', 'd0000000-0000-0000-0006-000000000065', 'a1000000-0000-0000-0000-000000000039', E'第7条太重要了!朋友买二手特斯拉,前车主FSD没解绑拖了两周,车机各种受限。Tony老师这种"老师傅重新学电车"的态度真圈粉,现在好多店还是拿油车那套糊弄。', '2026-07-10 09:20:00-07') ON CONFLICT (id) DO NOTHING;

-- 66 discussion 波特兰小鹿 车顶箱油耗
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000066', 'a1000000-0000-0000-0000-000000000008', 'discussion', '装了车顶箱油耗掉了多少?你们平时拆不拆?', E'上个月装的车顶箱用得很爽,但这箱油明显不耐烧了,粗算高速油耗从36掉到30左右,将近两成?正常吗?另外风噪在70迈以上呜呜的。问题来了:不露营的时候你们会把箱子拆下来吗?拆装一次挺费劲,但天天背着个箱子烧油又肉疼。有没有什么折中方案?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['露营','油耗'], 'active', '2026-07-10 12:20:00-07', '2026-07-10 12:20:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000110', 'd0000000-0000-0000-0006-000000000066', 'a1000000-0000-0000-0000-000000000040', E'高速掉15-25%完全正常,车顶箱破坏的是整车风阻设计,速度越高惩罚越重(风阻和速度平方成正比),70迈降到62-65,油耗和风噪都会明显好转。我的做法:箱子只在出行季挂着(6-9月),十月拆下来挂车库墙上,买两个壁挂架三十刀。频繁拆装的话选快拆夹的箱子,熟练后一个人十五分钟。空箱背着跑长途通勤是最亏的,油钱一年下来够住两晚营地。', '2026-07-10 15:40:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000111', 'd0000000-0000-0000-0006-000000000066', 'a1000000-0000-0000-0000-000000000026', E'补个数据点:我SUV+大号箱,75迈跑州际掉22%,65迈只掉12%,亲测降速比什么都管用。风噪的话检查箱子是不是装在横杆最前位置,适当后移+确认开口朝后,呜呜声能小不少。', '2026-07-10 19:05:00-07') ON CONFLICT (id) DO NOTHING;

-- 67 showoff 贝尔维尤Mia Model Y
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000067', 'a1000000-0000-0000-0000-000000000039', 'showoff', '纠结半年,二手Model Y今天开回家了', E'从三月纠结到七月,看了二十多台车,今天终于把一台2023 Model Y长续航开回家:三万二,两万六千迈,SOH 96%,前任车主保养记录全套。提车路上顺路首充,插上枪那一刻半年的纠结都值了。特别感谢这个社区,电池怎么查、OTD怎么谈、验车看什么,全是在这里学的,砍下来的钱够我充十年电。晚上已经预约了贴膜,西雅图的太阳虽然温柔,该做的还是做上。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Car2Go_Charging_Station_Stuttgart_2013_01.jpg/960px-Car2Go_Charging_Station_Stuttgart_2013_01.jpg'], NULL, NULL, NULL, ARRAY['提车','电车'], 'active', '2026-07-10 19:35:00-07', '2026-07-10 19:35:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000112', 'd0000000-0000-0000-0006-000000000067', 'a0000000-0000-0000-0000-000000000006', E'恭喜恭喜!看了二十多台才出手,这份耐心就值回票价。西雅图开电车是真舒服,夏天不热冬天不算冷,续航全年在线。周末华州电车群跑山活动欢迎来玩。', '2026-07-10 22:10:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000113', 'd0000000-0000-0000-0006-000000000067', 'a1000000-0000-0000-0000-000000000007', E'"砍下来的钱够充十年电"哈哈这个总结到位。贝尔维尤这边超充和目的地桩密度都高,你会发现家充都不一定天天需要。恭喜提车!', '2026-07-11 08:45:00-07') ON CONFLICT (id) DO NOTHING;

-- 68 discussion 奥兰多阿福 dealer fee
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000068', 'a1000000-0000-0000-0000-000000000017', 'discussion', '佛州买车"dealer fee"$999,这钱能砍吗?', E'帮亲戚在奥兰多谈一台二手车,价格谈好了,合同一打出来多了一行"Dealer Fee/Doc Fee $999",销售说"佛州每家都收,法律允许的,系统里去不掉"。查了下佛州确实不像有些州给doc fee设上限。问:1)这个费真的"每家都收"吗?2)系统去不掉是真的假的?3)砍不掉的话有什么迂回办法?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['砍价','避坑'], 'active', '2026-07-11 10:05:00-04', '2026-07-11 10:05:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000114', 'd0000000-0000-0000-0006-000000000068', 'a0000000-0000-0000-0000-000000000008', E'佛州doc fee没有上限,700-1200都常见,所以"每家都收"基本是真的;"系统去不掉"也半真——那行字他们确实不删,但这不重要。正确姿势:别纠结那一行删不删,直接谈含所有费用的OTD总价。"我出的价是落地$XXXXX,你们doc fee爱写多少写多少,总数对就行。"等于让他们从车价里把$999吐回来。这也是为什么邮件询价永远要OTD报价,单谈车价的人到签字才发现"惊喜"。另外佛州法律要求dealer fee必须在广告价中披露或注明,广告价不含fee的车行,本身就可以压价压狠一点。', '2026-07-11 13:30:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000115', 'd0000000-0000-0000-0006-000000000068', 'a1000000-0000-0000-0000-000000000018', E'迈阿密买过两台车,doc fee一分没少交但两台都是用OTD总价谈的,等于变相抵掉了。还有个小技巧:佛州私人交易没有doc fee,预算敏感的话私人车源+PPI是绕开这笔钱的正路。', '2026-07-11 16:50:00-04') ON CONFLICT (id) DO NOTHING;

-- 69 review 盐湖城Ivy 2023 Camry Hybrid
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000069', 'a1000000-0000-0000-0000-000000000027', 'review', '2023凯美瑞混动夏季实测:空调随便开,油耗纹丝不动', E'年初接手的2023 Camry Hybrid LE,专门等夏天跑完这轮数据再来交作业。\n夏季油耗实测(盐湖城,气温32-38度,空调22度auto常开):市区通勤48-51mpg,高速75迈巡航44mpg,混合场景整箱油平均47mpg。对比我之前的2.5纯油凯美瑞,同样路线夏天只有26-28mpg,油费直接砍半。混动的空调是电动压缩机,红灯怠速时发动机熄着空调照吹,这点夏天体验极好。\n上周去了趟Moab,往返600迈,全程大太阳,表显油耗45.8,一箱油跑完还剩四分之一。爬坡时发动机介入声音是有的,但动力够用。\n其他:后排出风口给力,后备箱没有因为电池缩水多少,放两个28寸箱+露营装备没问题。槽点:LE的织物座椅夏天比皮的凉快是真的,但沾灰难打理;原厂胎偏舒适,山路极限低。\n结论:一年一万五迈以上、所在地夏天热的,混动差价一年半就赚回来,无脑推荐。', ARRAY[]::text[], 'Toyota', 'Camry Hybrid', 2023, ARRAY['混动','油耗','用车报告'], 'active', '2026-07-11 21:30:00-06', '2026-07-11 21:30:00-06') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000116', 'd0000000-0000-0000-0006-000000000069', 'a1000000-0000-0000-0000-000000000026', E'"红灯怠速空调照吹发动机不转"这个点被严重低估,丹佛夏天堵车时旁边油车都在怠速烧油,混动车主内心毫无波动。数据很扎实,收藏给准备换车的爸妈看。', '2026-07-12 10:15:00-06') ON CONFLICT (id) DO NOTHING;

-- 70 discussion 西雅图雨神 无AC老车
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000070', 'a1000000-0000-0000-0000-000000000007', 'discussion', '西雅图热浪来了,空调坏了的老车还有救吗?', E'我那台老车空调压缩机去年就罢工了,西雅图嘛,一年热不了几天,一直懒得修。结果这周热浪35度,车里直接蒸桑拿,开窗也没用。修压缩机报价1100,车本身就值四千,修不修很纠结。问:1)这个比例还值得修吗?2)不修的话有什么土办法度过每年这两周?3)听说加个USB小风扇+冰垫是智商税?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['空调','老车'], 'active', '2026-07-12 11:15:00-07', '2026-07-12 11:15:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000117', 'd0000000-0000-0000-0006-000000000070', 'a0000000-0000-0000-0000-000000000006', E'同为西雅图人,先泼个现实的水:咱们这的"一年热两周"正在变成"一年热六周",去年热浪比今年还长。四千的车花1100修空调,如果你打算再开两年以上,摊下来每个夏天几百块买个不受罪,我觉得值;打算一年内换车就别修了,卖车时空调坏也就折价三五百。土办法我练过一套:早晚开窗对流、遮阳挡+侧窗留缝停车、上车前先开两分钟门扇风、买个12V夹式风扇对着吹(不是智商税,有风比没风强太多),冰垫两小时就成温水垫,不推荐。', '2026-07-12 14:30:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000118', 'd0000000-0000-0000-0006-000000000070', 'a1000000-0000-0000-0000-000000000040', E'第三个选项:找独立修理厂问问装二手/再制造压缩机,塔科马这边报价能比新件低三四百,老车这么修最划算。另外先让师傅确认是不是真的压缩机本体,有时候只是离合器或继电器,一两百就搞定,别按最贵的方案默认。', '2026-07-12 17:55:00-07') ON CONFLICT (id) DO NOTHING;

-- 71 showoff 新泽西Leo ID.4
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000071', 'a1000000-0000-0000-0000-000000000012', 'showoff', 'ID.4一周年:公司充电+错峰家充,油费再见', E'ID.4提车整一年,里程刚好一万五,发个纪念帖。这一年油站只去过两次——买玻璃水,哈哈。工作日公司桩免费充,周末在家用夜间谷电,算下来每迈成本不到3美分,一年"油费"不到500刀,之前的油车一年要2400。新泽西冬夏都试过了,夏天续航几乎满血,冬天打七五折但通勤无感。一年零维修,就换了个雨刮。下一步准备把家里第二台油车也换了,LD半年前还是电车怀疑论者,现在天天抢我车开。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Electric_car_charging_station%2C_Batman_%28Turkey%29.jpg/960px-Electric_car_charging_station%2C_Batman_%28Turkey%29.jpg'], NULL, NULL, NULL, ARRAY['电车','用车报告'], 'active', '2026-07-12 16:40:00-04', '2026-07-12 16:40:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000119', 'd0000000-0000-0000-0006-000000000071', 'a1000000-0000-0000-0000-000000000035', E'"LD从怀疑论者到抢车开"是每个电车家庭的必经之路哈哈。请教下新泽西夜间谷电是找电力公司申请的专门费率吗?法拉盛这边我还在研究怎么搞。', '2026-07-12 20:25:00-04') ON CONFLICT (id) DO NOTHING;

-- 72 discussion 凤凰城Jerry 大峡谷
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000072', 'a1000000-0000-0000-0000-000000000025', 'discussion', '八月大峡谷+羚羊谷,自己的轿车能行吗?', E'亲戚八月来玩,计划凤凰城出发:Sedona—大峡谷南缘—Page(羚羊谷+马蹄湾)四天。我的车是台通勤轿车,离地不高。问过的人说法不一:有人说全程铺装路轿车随便跑,有人说去某些点位要走土路必须SUV。实际情况到底怎样?还是说这种行程干脆租台SUV更省心?八月那边天气有什么坑?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['自驾','国家公园'], 'active', '2026-07-13 09:20:00-07', '2026-07-13 09:20:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000120', 'd0000000-0000-0000-0006-000000000072', 'a1000000-0000-0000-0000-000000000030', E'这条线我带爸妈跑过:你列的主线景点(Sedona镇区、大峡谷南缘各观景台、羚羊谷集合点、马蹄湾停车场)全部是铺装路,轿车毫无压力。需要高底盘的是支线玩法,比如Sedona的一些4x4 trail和白口袋(White Pocket)那种,不去就不用SUV。羚羊谷本身必须参加导览团,是他们的改装卡车带你进去,你的车只要能开到游客中心就行。', '2026-07-13 12:45:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000121', 'd0000000-0000-0000-0006-000000000072', 'a0000000-0000-0000-0000-000000000008', E'八月的坑主要是天不是路:一是monsoon季午后雷暴,羚羊谷遇到上游下雨会临时关闭(有山洪风险),行程留出机动半天;二是Page那段加油站间隔远,油别低于半箱;三是热,给车里备两加仑水,人和水箱都用得上。你那台通勤轿车出发前按论坛里Tony的13项清单过一遍,比租SUV实在。', '2026-07-13 16:10:00-07') ON CONFLICT (id) DO NOTHING;

-- 73 chatter 费城大熊 一月暴风雪照
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000073', 'a1000000-0000-0000-0000-000000000014', 'chatter', '手机相册的"那年今日"给我推了一月的雪', E'今天费城36度,手机相册突然推送"回忆":一月底那场暴风雪,整条街的车埋在雪里,路灯下白茫茫一片,我铲车位铲了一小时,腰疼了三天。当时发誓要搬去佛罗里达,现在36度我又开始想念那天的雪了。人类就是这么没出息,哈哈。冬天骂夏天,夏天想冬天,车倒是四季都在陪着挨骂。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Snowy_Street_at_Night.jpg/960px-Snowy_Street_at_Night.jpg'], NULL, NULL, NULL, ARRAY['日常'], 'active', '2026-07-13 20:10:00-04', '2026-07-13 20:10:00-04') ON CONFLICT (id) DO NOTHING;

-- 74 discussion 天普市阿婷 远程看车
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000074', 'a1000000-0000-0000-0000-000000000034', 'discussion', '人还没落地,九月才到,现在远程订车靠谱吗?', E'表弟九月初落地读书,家里想让我帮忙提前把车定了,他一落地就有车开。但我在天普市,他学校在圣何塞,我也没法替他跑去看车。现在这种远程操作有几种:1)网上车商(线上下单送车上门那种)可以退;2)让湾区的朋友代看+代提;3)等他落地再买。远程买最怕图片和实车两回事。有远程买过车的分享下经验吗?', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['新生','买车流程'], 'active', '2026-07-14 13:45:00-07', '2026-07-14 13:45:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000122', 'd0000000-0000-0000-0006-000000000074', 'a0000000-0000-0000-0000-000000000008', E'三个方案我排个序:最稳是2(可信朋友代看+付费PPI,朋友把关人品、技师把关车况,提前搞定,落地即开);其次是3(慢几周但零风险,落地头两周租车过渡,顺便让本人试驾选自己喜欢的);最后才是1——线上车商的七天退车政策听着美,但注册、保险、退车物流都是麻烦,而且线上价普遍比本地私人车源贵10%上下,适合没有任何本地资源的人。另外九月初是留学生买车最挤的时候,如果走方案3,让表弟落地前把驾照翻译件、保险报价这些准备好,能省一半时间。', '2026-07-14 17:20:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000123', 'd0000000-0000-0000-0006-000000000074', 'a1000000-0000-0000-0000-000000000033', E'我就是常年帮朋友代看车的那个"湾区朋友",哈哈。给代看人减负的技巧:先远程视频看车过一遍(让卖家实时拍冷启动、仪表、四角漆面),筛掉明显不行的,朋友只跑最后一两台,再加一次PPI收尾。别让朋友海选,会绝交的。', '2026-07-14 20:45:00-07') ON CONFLICT (id) DO NOTHING;

-- 75 review 拉斯维加斯发哥 2016 RX350
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000075', 'a1000000-0000-0000-0000-000000000028', 'review', '2016 RX350十万英里报告:沙漠十年,雷都没打过', E'我的2016 RX350这周表跳过十万英里,在维加斯这种地狱气候服役十年,写个长期报告:\n维修史(十年全部):电瓶换了四个(沙漠常规操作)、轮胎第三套、刹车片前二后一、一次水泵渗漏在9.2万迈(出保,件+工时780刀)、天窗排水管清过两次。就这些,发动机变速箱一根毛都没动过。\n费用:年均保养+维修不到600刀,对一台豪华SUV来说我没什么可抱怨的。\n高温表现:V6自吸在45度天气毫无压力,空调十年制冷依旧强劲(每两年换一次空调滤芯+一次系统检查)。内饰是浅色真皮,防晒工作做足(贴膜+遮阳挡+车库),现在没有裂纹,中控没有异响。\n油耗:混合21mpg,不算好看,V6的代价,但换来的是十年安静顺滑。\n残值:同款现在还能卖1.6万上下,十年保住四成多残值。\n总结:如果你要一台"十年不想操心"的豪华SUV,RX就是标准答案,前提是接受它的无聊和油耗。下一台车我可能试试电车,但这台会留给刚拿驾照的儿子——放心的车才敢给孩子开。', ARRAY[]::text[], 'Lexus', 'RX350', 2016, ARRAY['用车报告','高里程'], 'active', '2026-07-14 22:05:00-07', '2026-07-14 22:05:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000124', 'd0000000-0000-0000-0006-000000000075', 'a0000000-0000-0000-0000-000000000001', E'"放心的车才敢给孩子开"说到点子上了,尔湾这边多少家长专门收二手RX/汉兰达给新手孩子。十年四个电瓶也是维加斯特色了,哈哈。', '2026-07-15 09:30:00-07') ON CONFLICT (id) DO NOTHING;

-- 76 discussion 法拉盛小李 雨刮跳动
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000076', 'a0000000-0000-0000-0000-000000000004', 'discussion', '雨刮一到夏天就跳着刮还吱吱叫,换新的也没用', E'纽约七月雷阵雨多,发现我的雨刮一刮就"哒哒哒"跳着走,还带吱吱声,刮完一道道水痕。上个月刚换的新雨刮片!为什么还这样?是玻璃的问题吗?看网上说什么油膜、雨刮臂角度,有点懵。求个排查顺序,雷雨天看不清路真的危险。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['雨刮','保养'], 'active', '2026-07-15 08:35:00-04', '2026-07-15 08:35:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000125', 'd0000000-0000-0000-0006-000000000076', 'a0000000-0000-0000-0000-000000000007', E'新片还跳,按这个顺序查:1)油膜(最常见)——夏天柏油挥发+洗车蜡水+树胶在玻璃上积一层疏水油膜,雨刮压不服帖就跳。处理:油膜去除剂或者用不含护发素成分的洗洁精+专用玻璃研磨垫擦一遍,水泼上去均匀铺开不结珠就干净了;2)雨刮臂角度——被掰过或老化的臂会让胶条不垂直贴玻璃,目测胶条静止时应垂直于玻璃面,歪了用小扳手微调臂的扭转;3)臂弹簧疲劳——压力不够,按下去很轻的话换雨刮臂,件不贵;4)劣质片——某些便宜片胶条硬,夏天高温更明显,换名牌片试试。90%的"哒哒哒"是第1条,先花十五分钟除油膜。', '2026-07-15 11:50:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000126', 'd0000000-0000-0000-0006-000000000076', 'a1000000-0000-0000-0000-000000000006', E'亲测除油膜有效,我之前跳了半年,magic eraser加玻璃水擦了两遍就服帖了。除完之后别马上打玻璃镀水剂,有些镀水剂和某些胶条八字不合,又开始叫。', '2026-07-15 15:25:00-04') ON CONFLICT (id) DO NOTHING;

-- 77 chatter 塔科马老周 雷尼尔雪山照
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000077', 'a1000000-0000-0000-0000-000000000040', 'chatter', '整理行车照片,翻到去年雪季的停车场', E'退休人闲着整理硬盘,翻到去年12月去山里那趟,停车场一片白,车顶积雪半尺厚,拍完这张回程还差点被封路。看看现在,同一台车这个月已经跑了两趟露营,晒得后备箱垫子都发烫。一台车陪你经历四季,想想还挺浪漫。老伙计们,你们车里存着哪张舍不得删的照片?', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Snow_Lot_%282133967516%29.jpg/960px-Snow_Lot_%282133967516%29.jpg'], NULL, NULL, NULL, ARRAY['日常','自驾'], 'active', '2026-07-15 19:50:00-07', '2026-07-15 19:50:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000127', 'd0000000-0000-0000-0006-000000000077', 'a1000000-0000-0000-0000-000000000007', E'周叔这张有味道。我存着的是提车那天在车行门口的照片,车还没上牌,人傻笑得像中奖。四季陪伴这话说得好,车是家庭相册里出镜率最高的"家人"。', '2026-07-16 08:40:00-07') ON CONFLICT (id) DO NOTHING;

-- 78 showoff 丹佛高原红 车顶箱出发
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000078', 'a1000000-0000-0000-0000-000000000026', 'showoff', '装车完毕,明早出发落基山,四天三夜', E'请了两天假拼周末,明早五点出发去Rocky Mountain NP。昨晚把车顶箱装好塞满:帐篷睡袋防潮垫全上顶,车里留给冰箱和人。螺栓按论坛老哥教的复紧了一遍,胎压检查完毕,箱子限重没超。丹佛的朋友说Trail Ridge Road这周全线通了,山顶还有残雪,山下35度山上10度,一天体验三个季节。就喜欢科罗拉多这点。回来汇报油耗给上次提问的姐妹参考。', ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Thule_Dynamic_roof_box_%2811726732653%29.jpg/960px-Thule_Dynamic_roof_box_%2811726732653%29.jpg'], NULL, NULL, NULL, ARRAY['露营','自驾'], 'active', '2026-07-16 07:40:00-06', '2026-07-16 07:40:00-06') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000128', 'd0000000-0000-0000-0006-000000000078', 'a1000000-0000-0000-0000-000000000008', E'等你的油耗数据!Trail Ridge山顶记得穿羽绒服,我六月去的时候山下短袖山上冻成狗。一路平安,大片拍起来。', '2026-07-16 12:15:00-06') ON CONFLICT (id) DO NOTHING;

-- 79 discussion 留学生Kevin 回国存车
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000079', 'a0000000-0000-0000-0000-000000000002', 'discussion', '暑假回国六周,车怎么停放才不伤车?', E'月底回国到九月初,六个星期。车停公寓露天车位。问题:1)电瓶会不会亏死?要不要断开负极,还是买个太阳能维持器?2)胎压要多打一点防止亏气停出平点吗?3)油箱是加满还是留空好?4)保险这六周能不能降级省点钱?5)LA的太阳,车衣这次是不是该套上了?求一套完整的长期停放操作。', ARRAY[]::text[], NULL, NULL, NULL, ARRAY['长期停放','留学生'], 'active', '2026-07-16 14:20:00-07', '2026-07-16 14:20:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000129', 'd0000000-0000-0000-0006-000000000079', 'a0000000-0000-0000-0000-000000000001', E'六周操作清单:1)电瓶——六周大概率能撑住但不保证(新电瓶没事,三年以上的悬)。露天位太阳能维持器最合适,放前挡下面接点烟器(要确认你的车熄火后点烟器仍供电,不通的话走OBD口的维持器);断负极也行,但会丢电台座椅记忆,而且有些公寓不让开引擎盖折腾。2)胎压按正常上限打就行,六周不至于停出平点,那是几个月起步的事。3)油箱加满,减少箱内空气冷凝水汽。4)保险别停!停保有lapse记录,复保变贵,得不偿失;可以打电话问能不能临时调低里程档。5)车衣套之前洗干净车,参考论坛里车衣讨论。6)走之前洗车+清空车内所有食物零食,不然回来车里可能开蚂蚁派对。', '2026-07-16 17:45:00-07') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000130', 'd0000000-0000-0000-0006-000000000079', 'a1000000-0000-0000-0000-000000000002', E'补一条留学生实用招:找个暑假不回国的同学,给点油钱让他两周开一次,每次十五分钟跑个高速,电瓶轮胎刹车全都活动到,比任何设备都好使,他还能顺便帮你收快递看车况。我们同学圈每年暑假都互相这么托管。', '2026-07-16 21:10:00-07') ON CONFLICT (id) DO NOTHING;

-- 80 review 法拉盛Frank 2020 BMW 330i
INSERT INTO public.community_posts (id, user_id, type, title, content, images, make, model, year, tags, status, created_at, updated_at)
VALUES ('d0000000-0000-0000-0006-000000000080', 'a1000000-0000-0000-0000-000000000035', 'review', '出保二手330i一年账单公开:乐趣有价,且不便宜', E'去年这时候2.6万买的2020 330i xDrive,4.2万迈,刚出保。当时论坛里一半人劝退"出保宝马就是碎钞机",一半人说"B48很皮实"。一年后账单公开,给后来人参考:\n常规保养:机油两次(自带机油找独立店工时)、微滤芯、刹车油,合计约450刀。\n计划外维修:水泵接头渗漏(件+工时420)、一个轮速传感器(180)、前控制臂胶套异响换了副厂强化件(340)。合计约940刀。\n轮胎:防爆胎单价是我之前凯美瑞的1.8倍,换了两条,600刀。\n总计一年养车约2000刀,不含保险油费。\n结论:1)"碎钞机"言过其实,但"日系两倍多的养护成本"是真的;2)独立德系专修店是关键,同样的活4S报价基本翻倍;3)B48发动机本身确实皮实,坏的都是周边件;4)驾驶乐趣是真的,后驱基因+那套转向,每次进山都觉得这2000刀花得值。预算敏感、把车当工具的朋友,还是去隔壁看RAV4报告;明知山有虎的,记得留出每年1500-2500的预算再上车。', ARRAY[]::text[], 'BMW', '330i', 2020, ARRAY['用车报告','德系'], 'active', '2026-07-17 09:30:00-04', '2026-07-17 09:30:00-04') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES ('e0000000-0000-0000-0006-000000000131', 'd0000000-0000-0000-0006-000000000080', 'a1000000-0000-0000-0000-000000000009', E'这种真实账单帖最有价值,比"德系劝退/德系真香"的站队帖强一百倍。"坏的都是周边件"太精辟,我朋友的B58也是,发动机没事,水管接头塑料件一个个轮流退休。求分享法拉盛附近靠谱的德系独立店。', '2026-07-17 13:45:00-04') ON CONFLICT (id) DO NOTHING;

-- ---------- 99. 程序化点赞 + 计数校正 ----------
-- 给 2026 种子帖(d0000000-…)按帖子热度差异化随机点赞:
-- 每帖点赞率 3%~15%(由帖子 id 哈希决定,可重复运行结果一致)
DO $$
DECLARE
  has_created_at boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'post_likes' AND column_name = 'created_at'
  ) INTO has_created_at;

  IF has_created_at THEN
    INSERT INTO public.post_likes (post_id, user_id, created_at)
    SELECT p.id, u.id, p.created_at + random() * (now() - p.created_at)
    FROM public.community_posts p
    CROSS JOIN public.profiles u
    WHERE p.id::text LIKE 'd0000000-%'
      AND (u.id::text LIKE 'a0000000-%' OR u.id::text LIKE 'a1000000-%')
      AND random() < 0.03 + 0.12 * ((abs(hashtext(p.id::text)) % 100) / 100.0)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.post_likes (post_id, user_id)
    SELECT p.id, u.id
    FROM public.community_posts p
    CROSS JOIN public.profiles u
    WHERE p.id::text LIKE 'd0000000-%'
      AND (u.id::text LIKE 'a0000000-%' OR u.id::text LIKE 'a1000000-%')
      AND random() < 0.03 + 0.12 * ((abs(hashtext(p.id::text)) % 100) / 100.0)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 按真实行数校正种子帖计数(无论是否已装计数触发器都安全)
UPDATE public.community_posts cp SET
  likes_count = COALESCE(l.n, 0),
  comments_count = COALESCE(c.n, 0)
FROM public.community_posts p
LEFT JOIN (SELECT post_id, count(*) n FROM public.post_likes GROUP BY post_id) l ON l.post_id = p.id
LEFT JOIN (SELECT post_id, count(*) n FROM public.post_comments GROUP BY post_id) c ON c.post_id = p.id
WHERE cp.id = p.id
  AND (cp.id::text LIKE 'd0000000-%' OR cp.id::text LIKE 'b0000000-%');
