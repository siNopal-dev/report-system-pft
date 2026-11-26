begin;
create table public.ppc_users (
 id uuid primary key default gen_random_uuid(),
 username text not null unique check (username = lower(username) and username ~ '^[a-z0-9_.-]{3,40}$'),
 password_hash text not null check (password_hash ~ '^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$'),
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.ppc_sessions (
 token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
 user_id uuid not null references public.ppc_users(id) on delete cascade,
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
create index ppc_sessions_user_idx on public.ppc_sessions(user_id);
create index ppc_sessions_expiry_idx on public.ppc_sessions(expires_at);
create table public.ppc_login_attempts (
 bucket_key text primary key check (bucket_key ~ '^[a-f0-9]{64}$'),
 attempts integer not null,
 window_start timestamptz not null
);
create index ppc_login_attempts_window_idx on public.ppc_login_attempts(window_start);
alter table public.ppc_users enable row level security;
alter table public.ppc_sessions enable row level security;
alter table public.ppc_login_attempts enable row level security;
revoke all on public.ppc_users,public.ppc_sessions,public.ppc_login_attempts from public,anon,authenticated;
grant select,insert,update,delete on public.ppc_users,public.ppc_sessions,public.ppc_login_attempts to service_role;
create function public.ppc_take_login_attempt(bucket_key text) returns boolean
language plpgsql security invoker set search_path = ''
as $function$
declare used integer;
begin
 delete from public.ppc_login_attempts where window_start < now() - interval '1 day';
 delete from public.ppc_sessions where expires_at < now();
 insert into public.ppc_login_attempts as a(bucket_key,attempts,window_start)
 values (ppc_take_login_attempt.bucket_key,1,now())
 on conflict on constraint ppc_login_attempts_pkey do update
 set attempts=case when a.window_start < now()-interval '15 minutes' then 1 else a.attempts+1 end,
 window_start=case when a.window_start < now()-interval '15 minutes' then now() else a.window_start end
 returning attempts into used;
 return used <= 10;
end;
$function$;
revoke all on function public.ppc_take_login_attempt(text) from public,anon,authenticated;
grant execute on function public.ppc_take_login_attempt(text) to service_role;
alter table public.ppc_documents alter column owner_id drop not null;
alter table public.ppc_documents add column app_user_id uuid references public.ppc_users(id);
alter table public.ppc_documents add constraint ppc_documents_has_owner check (owner_id is not null or app_user_id is not null);
create unique index ppc_documents_app_user_recipe_idx on public.ppc_documents(app_user_id,template_key,recipe_number);
create index ppc_documents_app_user_created_idx on public.ppc_documents(app_user_id,created_at desc);
grant select,insert on public.ppc_documents to service_role;
commit;
