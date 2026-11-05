-- Run after schema.sql and owner provisioning, on the dedicated project.
-- Set these three UUIDs to an actual owner account, a non-owner test account,
-- and a fixture finance_entries row owned by the owner. BEGIN/ROLLBACK protects data.
-- Do not treat a static SQL review as a passed live permissions test.
begin;
select set_config('space.test_owner','REPLACE_OWNER_UUID',true);
select set_config('space.test_other','REPLACE_OTHER_UUID',true);
select set_config('space.test_row','REPLACE_FIXTURE_ROW_UUID',true);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('space.test_other'),true);
do $$ begin
  if public.space_is_owner() then raise exception 'Non-owner accepted'; end if;
  if exists(select 1 from public.finance_entries) then raise exception 'Non-owner read data'; end if;
  begin
    insert into public.finance_entries(user_id,date,type,amount,currency,category)
    values (current_setting('space.test_other')::uuid,current_date,'expense',1,'EUR','access test');
    raise exception 'Non-owner wrote data';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('space.test_owner'),true);
do $$ begin
  if not public.space_is_owner() then raise exception 'Owner denied'; end if;
  if not exists(select 1 from public.finance_entries where id=current_setting('space.test_row')::uuid)
    then raise exception 'Owner cannot read fixture'; end if;
  begin
    update public.finance_entries set user_id=current_setting('space.test_other')::uuid where id=current_setting('space.test_row')::uuid;
    raise exception 'Owner reassignment allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from public.finance_entries;
    raise exception 'Anonymous read allowed';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
