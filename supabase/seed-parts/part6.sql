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
