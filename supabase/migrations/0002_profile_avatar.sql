-- Emoji avatar per person (shown instead of the initial). Safe to re-run.
alter table public.profiles add column if not exists avatar text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_avatar_len'
  ) then
    alter table public.profiles
      add constraint profiles_avatar_len check (avatar is null or char_length(avatar) <= 16);
  end if;
end $$;
