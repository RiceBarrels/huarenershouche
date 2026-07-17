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
