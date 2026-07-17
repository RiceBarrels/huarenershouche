-- ============================================================
-- 社区种子数据:8 个真实感用户 + 14 篇帖子(含常见问题解答)
-- + 评论 + 点赞。在 Supabase Dashboard → SQL Editor 里整段运行。
-- 可重复运行(ON CONFLICT DO NOTHING / 计数最后重算)。
-- 假用户密码统一为 SeedUser123!(如需登录测试)
-- ============================================================

-- ---------- 1. 假用户(auth.users + profiles) ----------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
VALUES
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000001','authenticated','authenticated','seed.laowang@clcauto.com',crypt('SeedUser123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"username":"尔湾老王"}',now()-interval '180 days',now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000002','authenticated','authenticated','seed.kevin@clcauto.com',crypt('SeedUser123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"username":"留学生Kevin"}',now()-interval '150 days',now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000003','authenticated','authenticated','seed.tesla@clcauto.com',crypt('SeedUser123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"username":"湾区Model3车主"}',now()-interval '200 days',now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000004','authenticated','authenticated','seed.xiaoli@clcauto.com',crypt('SeedUser123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"username":"法拉盛小李"}',now()-interval '120 days',now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000005','authenticated','authenticated','seed.lily@clcauto.com',crypt('SeedUser123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"username":"达拉斯Lily"}',now()-interval '90 days',now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000006','authenticated','authenticated','seed.aming@clcauto.com',crypt('SeedUser123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"username":"西雅图阿明"}',now()-interval '250 days',now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000007','authenticated','authenticated','seed.mechanic@clcauto.com',crypt('SeedUser123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"username":"修车匠Tony"}',now()-interval '300 days',now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000008','authenticated','authenticated','seed.guide@clcauto.com',crypt('SeedUser123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{"username":"二手车避坑酱"}',now()-interval '160 days',now(),'','','','')
ON CONFLICT (id) DO NOTHING;

-- 若项目有 handle_new_user 触发器,profiles 可能已自动生成;统一 upsert 覆盖资料
-- 注册时间与 auth.users 对齐(否则用户主页"加入时间"全显示今天)
INSERT INTO public.profiles (id, username, avatar_url, location, account_type, created_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001','尔湾老王','https://api.dicebear.com/9.x/notionists/svg?seed=laowang','Irvine, CA','private',now()-interval '180 days'),
  ('a0000000-0000-0000-0000-000000000002','留学生Kevin','https://api.dicebear.com/9.x/notionists/svg?seed=kevin','Los Angeles, CA','private',now()-interval '150 days'),
  ('a0000000-0000-0000-0000-000000000003','湾区Model3车主','https://api.dicebear.com/9.x/notionists/svg?seed=tesla','San Jose, CA','private',now()-interval '200 days'),
  ('a0000000-0000-0000-0000-000000000004','法拉盛小李','https://api.dicebear.com/9.x/notionists/svg?seed=xiaoli','Flushing, NY','private',now()-interval '120 days'),
  ('a0000000-0000-0000-0000-000000000005','达拉斯Lily','https://api.dicebear.com/9.x/notionists/svg?seed=lily','Dallas, TX','private',now()-interval '90 days'),
  ('a0000000-0000-0000-0000-000000000006','西雅图阿明','https://api.dicebear.com/9.x/notionists/svg?seed=aming','Seattle, WA','private',now()-interval '250 days'),
  ('a0000000-0000-0000-0000-000000000007','修车匠Tony','https://api.dicebear.com/9.x/notionists/svg?seed=tony','Rowland Heights, CA','dealer',now()-interval '300 days'),
  ('a0000000-0000-0000-0000-000000000008','二手车避坑酱','https://api.dicebear.com/9.x/notionists/svg?seed=guide','Bellevue, WA','private',now()-interval '160 days')
ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username,
      avatar_url = EXCLUDED.avatar_url,
      location = EXCLUDED.location,
      created_at = EXCLUDED.created_at;

-- ---------- 2. 帖子(晒车/车评/讨论,含常见问题) ----------
INSERT INTO public.community_posts
  (id, user_id, type, title, content, images, make, model, year, tags, status, created_at)
VALUES
-- 晒车
('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','showoff',
 '提车一年,Model 3 长续航真实使用报告',
 E'去年在湾区提的白色 Model 3 长续航,跑了 1.8 万迈来汇报一下。\n\n通勤 101 来回 60 迈,家充夜间电价一个月电费不到 $40,比之前开凯美瑞省了一大截油钱。Autopilot 在堵车时是真香。\n\n缺点也说实话:过减速带偏硬,后排头部空间一般,冬天去太浩湖续航打七折。总体还是推荐的,尤其家里能装充电桩的。',
 ARRAY['https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&q=80'],
 'Tesla','Model 3',2023,ARRAY['特斯拉','电车','提车作业'],'active',now()-interval '2 days'),

('b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','showoff',
 '二手 4Runner 提车!全家露营神器',
 E'看了三个月终于收了台 2019 4Runner SR5,8.2 万迈,私人一手车主,保养记录全。\n\n周末直接拉全家去了 Joshua Tree,空间和通过性没得说。V6 油耗是感人,市区 16mpg,但这车 25 万迈随便跑,值。',
 ARRAY['https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80'],
 'Toyota','4Runner',2019,ARRAY['丰田','SUV','露营'],'active',now()-interval '5 days'),

('b0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000005','showoff',
 '人生第一台车:二手思域 Sport 落地记',
 E'刚工作一年,预算有限,最后 $17,500 收了台 2021 Civic Sport,3.4 万迈无事故。\n\n在这个平台看的 Carfax,一手车主 lease 到期回收的,车况基本全新。德州没有 smog 检查,过户当天搞定。开了两周,油耗 34mpg,大满足!',
 ARRAY['https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800&q=80'],
 'Honda','Civic',2021,ARRAY['本田','首车','提车作业'],'active',now()-interval '8 days'),

-- 车评
('b0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000006','review',
 '开了 12 万迈的凯美瑞混动,聊聊它到底值不值',
 E'2018 Camry Hybrid LE,当年 2.6 万新车买的,现在 12 万迈,说说长期体验。\n\n优点:市区 50mpg 是真的;除了机油机滤和轮胎,12 万迈没修过任何东西;电池衰减感知不到。\n\n缺点:隔音一般,高速风噪明显;LE 配置寒酸,座椅是布的。\n\n结论:如果你要一台"加油就走完全不操心"的车,二手混动凯美瑞闭眼买。5-7 万迈的车源大概 1.8-2.2 万,比新车划算多了。',
 ARRAY['https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&q=80'],
 'Toyota','Camry',2018,ARRAY['丰田','混动','长测'],'active',now()-interval '12 days'),

('b0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000007','review',
 '修车师傅视角:最不建议新手碰的 5 类二手车',
 E'干了十几年修车,见过太多人买完车哭着来店里。以下几类新手慎入:\n\n1. 10 年以上的德系豪华车(BMW/奔驰/奥迪)——买得起修不起,一个气囊悬挂 $2000 起\n2. 改装过的性能车——前车主怎么开的你想象不到\n3. 泡水车——低价 Salvage/Flood title 别碰,电路问题修不完\n4. 里程异常低的老车——橡胶件全老化,该换的一样不少\n5. 无保养记录的 CVT 变速箱车——换一个变速箱 $4000+\n\n新手就买丰田本田 5 年内、有记录、无事故的,多花两千省两万。',
 ARRAY[]::text[],
 NULL,NULL,NULL,ARRAY['避坑','新手必读','修车'],'active',now()-interval '15 days'),

-- 讨论:常见问题 + 解答
('b0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000002','discussion',
 '留学生没有 SSN 可以买车上保险吗?',
 E'刚来 LA 读研,想买台代步车,但还没有 SSN。想问问大家:\n\n1. 没 SSN 能过户上牌吗?\n2. 保险公司会不会拒保或者贵很多?\n3. 全款买是不是简单些?',
 ARRAY[]::text[],
 NULL,NULL,NULL,ARRAY['留学生','保险','新手'],'active',now()-interval '3 days'),

('b0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000008','discussion',
 '私人卖家买车全流程 + 防骗清单(加州版,建议收藏)',
 E'总有人私信问,整理一份加州私人交易流程:\n\n【交易前】\n1. 用 VIN 查召回和 Carfax,核对 title 上的 VIN 和车架号一致\n2. 确认 title 是 clean(不是 salvage/rebuilt),卖家名字和证件一致\n3. 白天看车,冷车启动,一定要试驾上高速\n4. 花 $100-150 找第三方技师做 PPI(pre-purchase inspection),这是最值的钱\n\n【交易时】\n5. 银行本票(cashier''s check)或当面转账,别带大量现金\n6. 双方填 title 背面 + Bill of Sale,里程数如实填\n7. 卖家需提供有效 smog 证明(90 天内)\n\n【交易后】\n8. 10 天内去 DMV 过户(Transfer of Title),交 use tax\n9. 先上好保险再开走\n\n【红旗警告】急着卖/只收现金/不让 PPI/title 不在手上说"回头补"——直接走人。',
 ARRAY[]::text[],
 NULL,NULL,NULL,ARRAY['防骗','过户','DMV','新手必读'],'active',now()-interval '6 days'),

('b0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000004','discussion',
 'Carfax 报告到底怎么看?哪些是红线?',
 E'看车源都带 Carfax,但报告好几页,想问下重点看什么?Minor accident 算严重吗?',
 ARRAY[]::text[],
 NULL,NULL,NULL,ARRAY['Carfax','车史报告','新手'],'active',now()-interval '9 days'),

('b0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000002','discussion',
 '预算 $15k 第一台车,求推荐(通勤为主)',
 E'坐标尔湾,每天通勤 30 迈,预算 1.5 万全款,求靠谱推荐。主要诉求:省油、维修便宜、保值。看了卡罗拉、思域、马自达3,纠结中……',
 ARRAY[]::text[],
 NULL,NULL,NULL,ARRAY['选车','预算','通勤'],'active',now()-interval '4 days'),

('b0000000-0000-0000-0000-00000000000a','a0000000-0000-0000-0000-000000000005','discussion',
 '新移民没信用记录,车贷利率 14% 正常吗??',
 E'dealer 给我报的利率 14.9%,60 期,吓死我了。没有信用记录是不是只能认宰?有什么办法降下来?',
 ARRAY[]::text[],
 NULL,NULL,NULL,ARRAY['车贷','信用','新移民'],'active',now()-interval '7 days'),

('b0000000-0000-0000-0000-00000000000b','a0000000-0000-0000-0000-000000000006','discussion',
 '西雅图冬天需要换雪胎吗?全季胎够不够',
 E'今年第一次在西雅图过冬,平时市区通勤,偶尔去 Snoqualmie 滑雪。全季胎够用吗,还是得买套雪胎?',
 ARRAY[]::text[],
 NULL,NULL,NULL,ARRAY['雪胎','冬季用车','西雅图'],'active',now()-interval '20 days'),

('b0000000-0000-0000-0000-00000000000c','a0000000-0000-0000-0000-000000000008','discussion',
 '卖车攻略:私人出售比 trade-in 多卖 $2000+ 的正确姿势',
 E'刚把开了 4 年的 RAV4 私人卖掉,比 CarMax 报价多卖 $2,300,分享流程:\n\n1. 定价:参考 KBB private party 价 + 本站同款车源价,挂价留 5% 砍价空间\n2. 拍照:白天找空旷背景,外观 8 张 + 内饰 4 张 + 仪表盘里程照,有瑕疵直接拍出来(省得白跑)\n3. 挂之前花 $30 洗个车打个蜡,第一印象值几百刀\n4. 见面选银行停车场(有监控),试驾要看对方驾照\n5. 收款只收 cashier''s check 或 Zelle 当面到账\n6. 填好 title、Bill of Sale,加州记得网上提交 NRL(Notice of Release of Liability),不然对方吃罚单算你头上\n\n有问题评论区问。',
 ARRAY[]::text[],
 NULL,NULL,NULL,ARRAY['卖车','攻略','过户'],'active',now()-interval '11 days'),

('b0000000-0000-0000-0000-00000000000d','a0000000-0000-0000-0000-000000000004','discussion',
 '有 minor accident 记录的车能买吗?便宜 $3000 心动了',
 E'看中一台 2020 CR-V,比市场价便宜三千,Carfax 显示一次 minor accident,修过前保险杠。这种能入吗?',
 ARRAY[]::text[],
 NULL,NULL,NULL,ARRAY['事故车','CR-V','纠结'],'active',now()-interval '1 days'),

('b0000000-0000-0000-0000-00000000000e','a0000000-0000-0000-0000-000000000001','discussion',
 '车险太贵了,大家都买的什么险?怎么省钱',
 E'续保又涨价了,full coverage 一年 $2400。想问问大家:\n\n1. 责任险额度买多少合适?state minimum 够吗?\n2. deductible 选 $500 还是 $1000?\n3. 有什么靠谱的省钱办法?',
 ARRAY[]::text[],
 NULL,NULL,NULL,ARRAY['保险','省钱'],'active',now()-interval '14 days')
ON CONFLICT (id) DO NOTHING;

-- ---------- 3. 评论(重点:解答常见问题) ----------
INSERT INTO public.post_comments (id, post_id, user_id, content, created_at)
VALUES
-- SSN 问题的解答
('c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000008',
 E'都可以解决,别慌:\n1. 加州 DMV 过户上牌不需要 SSN,护照 + I-20/签证 + 加州地址证明即可,还没驾照的先考 CA 驾照\n2. 保险:State Farm、Geico、Progressive 都接受无 SSN 投保,拿国内驾照 + 加州驾照报价,新手价确实贵(年轻+无记录),多比几家,学生可以问 good student discount\n3. 全款最省事,私人卖家基本也只接受全款',now()-interval '2 days 20 hours'),
('c0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000003',
 '补充一句:先考出加州驾照再买车,不然保险按无本地驾照算,贵不少。DMV 笔试有中文的。',now()-interval '2 days 18 hours'),
('c0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000002',
 '感谢!已经约了 DMV 笔试,考完来蹲车源。',now()-interval '2 days 10 hours'),

-- Carfax 怎么看的解答
('c0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000007',
 E'修车的来答,按优先级看:\n1. Title 状态:出现 salvage / rebuilt / flood / lemon 直接 pass\n2. 事故记录:minor 且只伤保险杠覆盖件问题不大;出现 structural/airbag deployed 就别碰\n3. 车主数:1-2 手最好,3 手以上注意\n4. 保养记录:定期换油记录连续的加分,长期空窗的小心\n5. 里程曲线:有没有回调痕迹(前后年份里程倒退)\n6. 使用性质:personal 优于 rental/fleet\n记住 Carfax 不是全知的,没上报的事故查不到,所以 PPI 永远要做。',now()-interval '8 days 20 hours'),
('c0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000004',
 '太细了,收藏了。原来 rental 车也要注意,涨知识。',now()-interval '8 days 12 hours'),

-- 15k 选车的解答
('c0000000-0000-0000-0000-000000000006','b0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000006',
 '这价位闭眼卡罗拉,2019-2021 的 3-5 万迈车源正好在这个区间,省油保值坏不了。思域开着更有意思但同年份贵 $1500 左右。马三内饰最好但后排小、保值率略差。通勤为主选卡罗拉不会错。',now()-interval '3 days 20 hours'),
('c0000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000007',
 '同意楼上,再提醒下这个预算别去碰同价位的老 BMW,修一次的钱够卡罗拉保养十年。',now()-interval '3 days 18 hours'),
('c0000000-0000-0000-0000-000000000008','b0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000005',
 '我上个月刚买了思域,可以看我发的帖子。试驾完再决定,两台开起来差别挺大的。',now()-interval '3 days 15 hours'),

-- 车贷利率的解答
('c0000000-0000-0000-0000-000000000009','b0000000-0000-0000-0000-00000000000a','a0000000-0000-0000-0000-000000000008',
 E'14.9% 太高了,别签。没信用记录的思路:\n1. 先去华人较多的 credit union(比如 East West Bank 或本地 CU)问,通常比 dealer 利率低 3-5 个点\n2. 提高首付到 50%+,利率能再谈\n3. 有条件的找有信用的亲友 co-sign,直接降到正常水平\n4. 或者先办张 secured credit card 养 6 个月信用再买\n5. 实在急用车:买便宜车全款过渡一年,建立信用后再换\ndealer 的 finance 是利润中心,永远先拿到外部 pre-approval 再去谈。',now()-interval '6 days 20 hours'),
('c0000000-0000-0000-0000-00000000000a','b0000000-0000-0000-0000-00000000000a','a0000000-0000-0000-0000-000000000001',
 '血泪教训 +1,我第一年被宰过 12%,第二年 refinance 到 6.5%,记得利率降了可以 refinance。',now()-interval '6 days 15 hours'),

-- 雪胎的解答
('c0000000-0000-0000-0000-00000000000b','b0000000-0000-0000-0000-00000000000b','a0000000-0000-0000-0000-000000000007',
 '西雅图市区全季够用(下雪天少),但你要常去 Snoqualmie Pass 就不一样了,山口经常查 traction requirement,全季+四驱勉强,两驱建议备一套雪胎或者至少买链子放车上。Costco 换胎季节性优惠可以蹲。',now()-interval '19 days 20 hours'),
('c0000000-0000-0000-0000-00000000000c','b0000000-0000-0000-0000-00000000000b','a0000000-0000-0000-0000-000000000006',
 '谢谢!那我先买套链子,常去再上雪胎。',now()-interval '19 days 10 hours'),

-- 事故车的解答
('c0000000-0000-0000-0000-00000000000d','b0000000-0000-0000-0000-00000000000d','a0000000-0000-0000-0000-000000000007',
 '前杠覆盖件的小事故不影响结构,修复得当完全可以买,便宜 $3000 反而是机会。重点:让卖家提供维修单,PPI 时让技师重点看纵梁和水箱框架有没有动过、前杠缝隙是否均匀。真是小磕碰的话这价格挺香。',now()-interval '20 hours'),
('c0000000-0000-0000-0000-00000000000e','b0000000-0000-0000-0000-00000000000d','a0000000-0000-0000-0000-000000000008',
 '同意,但注意转手时它同样会因为这条记录卖便宜,等于折价是"传递"的,别指望按无事故价卖出去。自用无所谓。',now()-interval '18 hours'),

-- 保险的解答
('c0000000-0000-0000-0000-00000000000f','b0000000-0000-0000-0000-00000000000e','a0000000-0000-0000-0000-000000000008',
 E'经验分享:\n1. 责任险千万别买 state minimum(加州 15/30/5 赔不了什么),至少 100/300/100,贵不了多少但真出事能保住你\n2. 车龄 8 年以上或车值 <$4000 可以考虑掉 collision 只留 liability + comprehensive\n3. deductible 选 $1000 比 $500 一年能省 10-15%,前提是你有应急存款\n4. 省钱三板斧:每年续保前重新 shop 报价、多车/房屋 bundle、保持记录干净\n5. 里程少的试试按里程计费的保险(Metromile 类)',now()-interval '13 days 20 hours'),
('c0000000-0000-0000-0000-000000000010','b0000000-0000-0000-0000-00000000000e','a0000000-0000-0000-0000-000000000003',
 '续保前 shop 一圈是真的,我今年从 $2200 砍到 $1650,什么都没变就是换了家。',now()-interval '13 days 12 hours'),

-- 晒车/车评互动水贴
('c0000000-0000-0000-0000-000000000011','b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',
 '恭喜!请问家充安装花了多少?公寓党羡慕哭了',now()-interval '1 days 20 hours'),
('c0000000-0000-0000-0000-000000000012','b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003',
 '电工上门 + permit 一共 $1200 左右,walls charger 自己买的。公寓可以蹲公司充电桩,也够用。',now()-interval '1 days 18 hours'),
('c0000000-0000-0000-0000-000000000013','b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000005',
 '4Runner yyds,这车十年后还能卖你一半价钱',now()-interval '4 days 20 hours'),
('c0000000-0000-0000-0000-000000000014','b0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000002',
 '正在纠结混动凯美瑞,这篇太及时了。请问电池保修是多久?',now()-interval '11 days 20 hours'),
('c0000000-0000-0000-0000-000000000015','b0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000006',
 '加州混动电池保修 10 年/15 万迈,其他州 8 年/10 万迈,买二手基本还在保。',now()-interval '11 days 18 hours'),
('c0000000-0000-0000-0000-000000000016','b0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000001',
 '第一条扎心了,刚把开了三年的 X5 卖了,修车钱都够再买台卡罗拉',now()-interval '14 days 20 hours'),
('c0000000-0000-0000-0000-000000000017','b0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000002',
 '收藏了!请问 PPI 一般去哪找技师?', now()-interval '5 days 20 hours'),
('c0000000-0000-0000-0000-000000000018','b0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000007',
 'Yelp 搜 pre-purchase inspection 评分高的独立修车行,或者华人修车店直接打电话约,LA 一带一般 $100-150,可以开去也可以技师上门。',now()-interval '5 days 18 hours'),
('c0000000-0000-0000-0000-000000000019','b0000000-0000-0000-0000-00000000000c','a0000000-0000-0000-0000-000000000004',
 'NRL 这条太重要了,朋友卖车没提交,半年后收到对方的过路费账单,处理了好久。',now()-interval '10 days 20 hours'),
('c0000000-0000-0000-0000-00000000001a','b0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000002',
 '同预算党,恭喜提车!Sport 的轮毂真好看',now()-interval '7 days 20 hours')
ON CONFLICT (id) DO NOTHING;

-- ---------- 4. 点赞 ----------
INSERT INTO public.post_likes (post_id, user_id)
SELECT p.post_id::uuid, u.user_id::uuid FROM (VALUES
  ('b0000000-0000-0000-0000-000000000001'), ('b0000000-0000-0000-0000-000000000002'),
  ('b0000000-0000-0000-0000-000000000004'), ('b0000000-0000-0000-0000-000000000005'),
  ('b0000000-0000-0000-0000-000000000007'), ('b0000000-0000-0000-0000-00000000000c')
) AS p(post_id)
CROSS JOIN (VALUES
  ('a0000000-0000-0000-0000-000000000001'), ('a0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000003'), ('a0000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000005'), ('a0000000-0000-0000-0000-000000000006')
) AS u(user_id)
ON CONFLICT DO NOTHING;

-- 其余帖子少量点赞,数字更自然
INSERT INTO public.post_likes (post_id, user_id)
VALUES
  ('b0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000007'),
  ('b0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000004'),
  ('b0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000005'),
  ('b0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000002'),
  ('b0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000006'),
  ('b0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000005'),
  ('b0000000-0000-0000-0000-00000000000a','a0000000-0000-0000-0000-000000000002'),
  ('b0000000-0000-0000-0000-00000000000a','a0000000-0000-0000-0000-000000000004'),
  ('b0000000-0000-0000-0000-00000000000b','a0000000-0000-0000-0000-000000000008'),
  ('b0000000-0000-0000-0000-00000000000d','a0000000-0000-0000-0000-000000000002'),
  ('b0000000-0000-0000-0000-00000000000d','a0000000-0000-0000-0000-000000000005'),
  ('b0000000-0000-0000-0000-00000000000e','a0000000-0000-0000-0000-000000000004'),
  ('b0000000-0000-0000-0000-00000000000e','a0000000-0000-0000-0000-000000000006'),
  ('b0000000-0000-0000-0000-00000000000e','a0000000-0000-0000-0000-000000000007')
ON CONFLICT DO NOTHING;

-- ---------- 4.5 点赞/更新时间也做旧 ----------
-- 点赞时间:散布在"帖子发布之后 ~ 现在"之间(表若无 created_at 列则自动跳过)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'post_likes' AND column_name = 'created_at'
  ) THEN
    UPDATE public.post_likes pl
    SET created_at = cp.created_at + random() * (now() - cp.created_at)
    FROM public.community_posts cp
    WHERE pl.post_id = cp.id
      AND pl.post_id::text LIKE 'b0000000-%'
      AND pl.user_id::text LIKE 'a0000000-%';
  END IF;
END $$;

-- 帖子 updated_at 与发布时间一致(避免显示"刚刚编辑过")
UPDATE public.community_posts
SET updated_at = created_at
WHERE id::text LIKE 'b0000000-%';

-- ---------- 5. 重算计数(按真实行数,可重复运行) ----------
UPDATE public.community_posts cp SET
  likes_count = COALESCE(l.n, 0),
  comments_count = COALESCE(c.n, 0)
FROM (SELECT id FROM public.community_posts WHERE id::text LIKE 'b0000000-%') seed
LEFT JOIN (SELECT post_id, count(*) n FROM public.post_likes GROUP BY post_id) l ON l.post_id = seed.id
LEFT JOIN (SELECT post_id, count(*) n FROM public.post_comments GROUP BY post_id) c ON c.post_id = seed.id
WHERE cp.id = seed.id;

-- 完成。刷新 /community 查看效果。
