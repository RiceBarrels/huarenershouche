-- 账号删除(App Store Guideline 5.1.1(v) 合规)
-- 在 Supabase SQL Editor 手动执行
--
-- 用户在「账号设置 → 删除账号」中调用 rpc('delete_account'),
-- 永久删除本人全部数据 + 登录凭证(auth.users),不可恢复。
-- 认领过的系统车行账号通过 profiles.claimed_by 的 on delete set null 自动解除认领。

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- 系统转载账号不允许自助删除(由 admin 管理)
  if exists (select 1 from public.profiles where id = uid and is_system) then
    raise exception 'system accounts cannot be deleted';
  end if;

  -- 私信:本人参与的全部会话(买家/卖家两侧)及其中消息
  delete from public.messages
    where sender_id = uid
       or conversation_id in (
            select id from public.conversations where buyer_id = uid or seller_id = uid
          );
  delete from public.conversations where buyer_id = uid or seller_id = uid;

  -- 车源及其关联(他人对我车源的评论/收藏/举报一并清理;社区帖仅解除车源引用)
  delete from public.comments  where user_id = uid or car_id in (select id from public.cars where seller_id = uid);
  delete from public.favorites where user_id = uid or car_id in (select id from public.cars where seller_id = uid);
  delete from public.reports   where user_id = uid or car_id in (select id from public.cars where seller_id = uid);
  update public.community_posts set car_id = null
    where car_id in (select id from public.cars where seller_id = uid);
  delete from public.cars where seller_id = uid;

  -- 社区:点赞、评论(含他人对我评论的整条回复链)、帖子
  delete from public.post_comment_likes where user_id = uid;
  delete from public.post_likes
    where user_id = uid
       or post_id in (select id from public.community_posts where user_id = uid);
  with recursive doomed as (
    select id from public.post_comments
      where user_id = uid
         or post_id in (select id from public.community_posts where user_id = uid)
    union
    select c.id from public.post_comments c join doomed d on c.parent_id = d.id
  )
  delete from public.post_comments where id in (select id from doomed);
  delete from public.community_posts where user_id = uid;

  -- 问答:先清点赞与被采纳引用,再删回答、问题
  delete from public.qa_answer_likes
    where user_id = uid
       or answer_id in (
            select id from public.qa_answers
             where user_id = uid
                or question_id in (select id from public.qa_questions where user_id = uid)
          );
  update public.qa_questions
     set accepted_answer_id = null, is_resolved = false
   where accepted_answer_id in (select id from public.qa_answers where user_id = uid);
  delete from public.qa_answers
    where user_id = uid
       or question_id in (select id from public.qa_questions where user_id = uid);
  delete from public.qa_questions where user_id = uid;

  -- 其他用户数据
  delete from public.dealer_reviews   where user_id = uid or dealer_id = uid;
  delete from public.dealer_stores    where owner_id = uid;
  delete from public.platform_reviews where user_id = uid;
  delete from public.support_tickets  where user_id = uid;
  delete from public.admin_actions    where admin_id = uid;
  delete from public.push_tokens      where user_id = uid;

  -- 存储文件(头像/车源图/门店照片,路径均以 uid/ 开头)
  delete from storage.objects
    where bucket_id in ('avatars', 'car-images', 'store-photos')
      and (storage.foldername(name))[1] = uid::text;

  -- 最后删除资料与登录凭证
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
