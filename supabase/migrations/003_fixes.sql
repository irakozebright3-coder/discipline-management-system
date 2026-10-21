-- 003: Violation track column + automatic profile creation on signup.
alter table public.violations add column if not exists track public.discipline_track not null default 'HIGH_SCHOOL';

-- Every new auth user gets a profile row automatically (referenced by organization_members).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
