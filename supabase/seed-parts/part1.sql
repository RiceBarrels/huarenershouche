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
