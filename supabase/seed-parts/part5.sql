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
