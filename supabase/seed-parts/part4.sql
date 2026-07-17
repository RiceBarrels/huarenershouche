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
