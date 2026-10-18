-- =========================================
-- 1. ТАБЛИЦІ
-- =========================================

-- Профілі користувачів (пов'язані з вбудованими акаунтами Supabase)
create table public.profiles (
                                 id uuid primary key references auth.users (id) on delete cascade,
                                 username text not null,
                                 role text not null default 'student' check (role in ('student', 'teacher')),
                                 created_at timestamptz not null default now()
);

-- Сети карток
create table public.sets (
                             id uuid primary key default gen_random_uuid(),
                             owner_id uuid not null references public.profiles (id) on delete cascade,
                             title text not null,
                             description text,
                             term_lang text not null default 'en',
                             definition_lang text not null default 'uk',
                             is_public boolean not null default false,
                             created_at timestamptz not null default now()
);

-- Картки
create table public.cards (
                              id uuid primary key default gen_random_uuid(),
                              set_id uuid not null references public.sets (id) on delete cascade,
                              term text not null,
                              definition text not null,
                              position integer not null default 0,
                              created_at timestamptz not null default now()
);

-- Класи викладачів
create table public.classes (
                                id uuid primary key default gen_random_uuid(),
                                teacher_id uuid not null references public.profiles (id) on delete cascade,
                                name text not null,
                                join_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
                                created_at timestamptz not null default now()
);

-- Учні в класах
create table public.class_members (
                                      class_id uuid not null references public.classes (id) on delete cascade,
                                      user_id uuid not null references public.profiles (id) on delete cascade,
                                      joined_at timestamptz not null default now(),
                                      primary key (class_id, user_id)
);

-- Сети, призначені класам
create table public.class_sets (
                                   class_id uuid not null references public.classes (id) on delete cascade,
                                   set_id uuid not null references public.sets (id) on delete cascade,
                                   students_can_edit boolean not null default false,
                                   assigned_at timestamptz not null default now(),
                                   primary key (class_id, set_id)
);

-- Індекси для швидкого пошуку
create index on public.sets (owner_id);
create index on public.cards (set_id);
create index on public.classes (teacher_id);
create index on public.class_members (user_id);
create index on public.class_sets (set_id);

-- =========================================
-- 2. АВТОМАТИЧНЕ СТВОРЕННЯ ПРОФІЛЮ ПРИ РЕЄСТРАЦІЇ
-- =========================================

create function public.handle_new_user()
    returns trigger
    language plpgsql
security definer set search_path = ''
as $$
begin
insert into public.profiles (id, username, role)
values (
           new.id,
           coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
           coalesce(new.raw_user_meta_data ->> 'role', 'student')
       );
return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- =========================================
-- 3. ДОПОМІЖНІ ФУНКЦІЇ ДЛЯ ПЕРЕВІРКИ ПРАВ
-- =========================================

create function public.is_class_teacher(cid uuid)
    returns boolean
    language sql stable security definer set search_path = ''
as $$
select exists (
    select 1 from public.classes
    where id = cid and teacher_id = auth.uid()
);
$$;

create function public.is_class_member(cid uuid)
    returns boolean
    language sql stable security definer set search_path = ''
as $$
select exists (
    select 1 from public.class_members
    where class_id = cid and user_id = auth.uid()
);
$$;

-- Чи може поточний користувач бачити сет
create function public.can_view_set(sid uuid)
    returns boolean
    language sql stable security definer set search_path = ''
as $$
select exists (
    select 1 from public.sets s
    where s.id = sid and (s.owner_id = auth.uid() or s.is_public)
)
           or exists (
        select 1 from public.class_sets cs
        where cs.set_id = sid
          and (public.is_class_teacher(cs.class_id) or public.is_class_member(cs.class_id))
    );
$$;

-- Чи може поточний користувач редагувати картки сету
create function public.can_edit_set(sid uuid)
    returns boolean
    language sql stable security definer set search_path = ''
as $$
select exists (
    select 1 from public.sets s
    where s.id = sid and s.owner_id = auth.uid()
)
           or exists (
        select 1 from public.class_sets cs
        where cs.set_id = sid
          and (
            public.is_class_teacher(cs.class_id)
                or (cs.students_can_edit and public.is_class_member(cs.class_id))
            )
    );
$$;

-- Вступ до класу за кодом
create function public.join_class(code text)
    returns uuid
    language plpgsql security definer set search_path = ''
as $$
declare
cid uuid;
begin
  if auth.uid() is null then
    raise exception 'Потрібно увійти в акаунт';
end if;

select id into cid from public.classes where join_code = upper(trim(code));

if cid is null then
    raise exception 'Клас з таким кодом не знайдено';
end if;

insert into public.class_members (class_id, user_id)
values (cid, auth.uid())
    on conflict do nothing;

return cid;
end;
$$;

-- =========================================
-- 4. ЗАХИСТ ДАНИХ (ROW LEVEL SECURITY)
-- =========================================

alter table public.profiles enable row level security;
alter table public.sets enable row level security;
alter table public.cards enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.class_sets enable row level security;

-- profiles
create policy "Профілі бачать усі авторизовані" on public.profiles
  for select to authenticated using (true);
create policy "Користувач редагує свій профіль" on public.profiles
  for update to authenticated
                 using (id = auth.uid()) with check (id = auth.uid());

-- sets
create policy "Перегляд доступних сетів" on public.sets
  for select to authenticated using (public.can_view_set(id));
create policy "Створення власних сетів" on public.sets
  for insert to authenticated with check (owner_id = auth.uid());
create policy "Власник редагує сет" on public.sets
  for update to authenticated
                        using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Власник видаляє сет" on public.sets
  for delete to authenticated using (owner_id = auth.uid());

-- cards
create policy "Перегляд карток доступних сетів" on public.cards
  for select to authenticated using (public.can_view_set(set_id));
create policy "Додавання карток" on public.cards
  for insert to authenticated with check (public.can_edit_set(set_id));
create policy "Редагування карток" on public.cards
  for update to authenticated
                        using (public.can_edit_set(set_id)) with check (public.can_edit_set(set_id));
create policy "Видалення карток" on public.cards
  for delete to authenticated using (public.can_edit_set(set_id));

-- classes
create policy "Перегляд своїх класів" on public.classes
  for select to authenticated
                                     using (teacher_id = auth.uid() or public.is_class_member(id));
create policy "Викладач створює клас" on public.classes
  for insert to authenticated
  with check (
    teacher_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher')
  );
create policy "Викладач редагує клас" on public.classes
  for update to authenticated
                        using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "Викладач видаляє клас" on public.classes
  for delete to authenticated using (teacher_id = auth.uid());

-- class_members (вступ лише через функцію join_class)
create policy "Перегляд учасників класу" on public.class_members
  for select to authenticated
                                     using (
                                     user_id = auth.uid()
                                     or public.is_class_teacher(class_id)
                                     or public.is_class_member(class_id)
                                     );
create policy "Вихід з класу або видалення учня викладачем" on public.class_members
  for delete to authenticated
  using (user_id = auth.uid() or public.is_class_teacher(class_id));

-- class_sets
create policy "Перегляд сетів класу" on public.class_sets
  for select to authenticated
                                     using (public.is_class_teacher(class_id) or public.is_class_member(class_id));
create policy "Викладач призначає свій сет класу" on public.class_sets
  for insert to authenticated
  with check (
    public.is_class_teacher(class_id)
    and exists (
      select 1 from public.sets s
      where s.id = class_sets.set_id and s.owner_id = auth.uid()
    )
  );
create policy "Викладач змінює налаштування сету в класі" on public.class_sets
  for update to authenticated
                        using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));
create policy "Викладач прибирає сет з класу" on public.class_sets
  for delete to authenticated using (public.is_class_teacher(class_id));

-- =========================================
-- 5. ДОСТУП ДЛЯ АВТОРИЗОВАНИХ КОРИСТУВАЧІВ
-- =========================================

grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.join_class(text) to authenticated;