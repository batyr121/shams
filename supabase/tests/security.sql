-- Integration smoke test for an isolated Supabase test project after migration.
-- Execute as postgres via SQL Editor. All test data rolls back.
-- This has NOT been executed without a connected project.
begin;
do $$
declare admin_id uuid=extensions.gen_random_uuid();c uuid;codes text[];n bigint;failed boolean=false;
begin
  insert into auth.users(id,email) values(admin_id,'grand-ball-test@example.invalid');
  insert into public.admin_profiles(user_id,role) values(admin_id,'admin');
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  if not public.is_admin() then raise exception 'Admin verification failed';end if;
  insert into public.couple_applications(first_name,second_name,group_name,contact,consent,status,number) values('Test First','Test Second','TEST','private@example.invalid',true,'approved',nextval('public.couple_number')) returning id into c;
  update public.event_settings set voting_status='open',results_published=false,reveal_at=null where id=1;
  codes=public.generate_tickets(3);
  if array_length(codes,1)<>3 then raise exception 'Wrong ticket count';end if;
  if exists(select 1 from public.voting_tickets where token_hash=codes[1]) then raise exception 'Plaintext ticket stored';end if;
  perform set_config('request.jwt.claim.sub','',true);
  perform public.cast_vote(codes[1],c);
  begin perform public.cast_vote(codes[1],c);exception when others then failed=true;end;
  if not failed then raise exception 'Duplicate ticket was accepted';end if;
  select count(*) into n from public.votes where couple_id=c;
  if n<>1 then raise exception 'Wrong vote count';end if;
  failed=false;
  begin perform public.public_results();exception when others then failed=true;end;
  if not failed then raise exception 'Unpublished results were exposed';end if;
  failed=false;
  begin perform public.generate_tickets(1);exception when insufficient_privilege then failed=true;end;
  if not failed then raise exception 'Anonymous ticket generation succeeded';end if;
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform public.revoke_ticket((select id from public.voting_tickets where token_hash=encode(extensions.digest(codes[2],'sha256'),'hex')));
  failed=false;
  begin perform public.cast_vote(codes[2],c);exception when others then failed=true;end;
  if not failed then raise exception 'Revoked ticket was accepted';end if;
  perform public.set_event_state('{"voting_status":"closed"}');
  failed=false;
  begin perform public.cast_vote(codes[3],c);exception when others then failed=true;end;
  if not failed then raise exception 'Closed voting accepted a vote';end if;
  perform public.announce_winners();
  if not exists(select 1 from public.public_winners() where id=c) then raise exception 'Validated winner was not returned';end if;
  raise notice 'Voting RPC security smoke checks passed. Also test concurrent requests and role-level SELECT policies through the public API.';
end$$;
rollback;
