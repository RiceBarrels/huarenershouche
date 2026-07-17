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
